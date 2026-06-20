import { getDb } from "./mongodb";
import { randomUUID } from "crypto";
import { syncDeviceIdentity } from "./cross-device";
import type { Identity, IdentityDevice } from "./types";

const COLL = "identities";

type DeviceInput = Partial<Omit<IdentityDevice, "serial" | "firstSeen" | "lastSeen">> & { serial: string };

function nowIso() { return new Date().toISOString(); }

function isDupKey(err: unknown): boolean {
  return !!err && typeof err === "object" && (err as { code?: number }).code === 11000;
}

// One serial belongs to exactly one identity — enforce it at the DB level so the
// check-then-insert in ensureAnonymousIdentity/claimDevice can't race two
// identities onto the same device. Partial filter so admin-created empty
// identities (no devices.serial) don't collide on a null key. Best-effort.
let identityIndexEnsured = false;
async function ensureIdentityIndexes(db: Awaited<ReturnType<typeof getDb>>): Promise<void> {
  if (identityIndexEnsured) return;
  identityIndexEnsured = true;
  try {
    await db.collection(COLL).createIndex(
      { "devices.serial": 1 },
      { unique: true, partialFilterExpression: { "devices.serial": { $exists: true } }, name: "uniq_device_serial" },
    );
  } catch {
    identityIndexEnsured = false; // allow a later retry (e.g. pre-existing dup serials)
  }
}

function toDevice(input: DeviceInput, existing?: IdentityDevice): IdentityDevice {
  const t = nowIso();
  return {
    serial: input.serial,
    ip: input.ip ?? existing?.ip ?? null,
    browser: input.browser ?? existing?.browser,
    os: input.os ?? existing?.os,
    device: input.device ?? existing?.device,
    gpu: input.gpu ?? existing?.gpu,
    screen: input.screen ?? existing?.screen,
    timezone: input.timezone ?? existing?.timezone,
    language: input.language ?? existing?.language,
    userAgent: input.userAgent ?? existing?.userAgent,
    linkMethod: input.linkMethod ?? existing?.linkMethod,
    linkConfidence: input.linkConfidence ?? existing?.linkConfidence,
    firstSeen: existing?.firstSeen ?? t,
    lastSeen: t,
  };
}

export async function getIdentities(): Promise<Identity[]> {
  const db = await getDb();
  const docs = await db.collection<Identity>(COLL).find({}, { projection: { _id: 0 } }).sort({ updatedAt: -1 }).toArray();
  return docs as unknown as Identity[];
}

export async function findIdentityBySerial(serial: string): Promise<Identity | null> {
  if (!serial) return null;
  const db = await getDb();
  const doc = await db.collection<Identity>(COLL).findOne({ "devices.serial": serial }, { projection: { _id: 0 } });
  return (doc as unknown as Identity) ?? null;
}

/** Other NAMED identities that have a device on the same IP (for "who are you?"
 *  suggestions). Auto-created anonymous identities are excluded so the AI never
 *  suggests an auto-label like "Anonymous · LinkedIn" as someone's name. */
export async function suggestionsForIp(ip: string | null, excludeSerial?: string): Promise<{ id: string; name: string }[]> {
  if (!ip || ip === "unknown") return [];
  const db = await getDb();
  const docs = await db.collection<Identity>(COLL).find({ "devices.ip": ip, anonymous: { $ne: true } }, { projection: { _id: 0, id: 1, name: 1, devices: 1 } }).limit(30).toArray();
  return (docs as unknown as Identity[])
    .filter((d) => !excludeSerial || !d.devices.some((dev) => dev.serial === excludeSerial))
    .map((d) => ({ id: d.id, name: d.name }));
}

/** Update lastSeen/ip for a device that already belongs to an identity. */
export async function touchDevice(serial: string, patch: Partial<DeviceInput>): Promise<void> {
  const db = await getDb();
  await db.collection<Identity>(COLL).updateOne(
    { "devices.serial": serial },
    { $set: { "devices.$.lastSeen": nowIso(), ...(patch.ip ? { "devices.$.ip": patch.ip } : {}), updatedAt: nowIso() } },
  );
}

/** Attach a device to an existing identity (by id) or create a new identity (by name). */
export async function claimDevice(opts: { serial: string; identityId?: string; name?: string; device: DeviceInput }): Promise<Identity | null> {
  const db = await getDb();

  // Upgrade-in-place: if we're NAMING a device (no explicit target id) that currently
  // belongs to an AUTO-CREATED ANONYMOUS identity, rename that identity instead of
  // pulling+recreating — this preserves the identity id so everything already tied to
  // it (messages, bookings, rizz, sessions, conversations) stays attached.
  if (!opts.identityId && opts.name?.trim()) {
    const currentOwner = await db.collection<Identity>(COLL).findOne({ "devices.serial": opts.serial });
    if (currentOwner && currentOwner.anonymous) {
      const existingDev = (currentOwner.devices ?? []).find((d) => d.serial === opts.serial);
      const device = toDevice(opts.device, existingDev);
      await db.collection<Identity>(COLL).updateOne(
        { id: currentOwner.id },
        { $set: { name: opts.name.trim().slice(0, 60), anonymous: false, updatedAt: nowIso(), "devices.$[d]": device }, },
        { arrayFilters: [{ "d.serial": opts.serial }] },
      );
      await syncDeviceIdentity(opts.serial, currentOwner.id);
      return findIdentityById(currentOwner.id);
    }
  }

  // Remove this serial from any OTHER identity first (a device belongs to one identity at a time).
  await db.collection<Identity>(COLL).updateMany(
    { "devices.serial": opts.serial },
    { $pull: { devices: { serial: opts.serial } }, $set: { updatedAt: nowIso() } },
  );

  if (opts.identityId) {
    const target = await db.collection<Identity>(COLL).findOne({ id: opts.identityId });
    if (!target) return null;
    const device = toDevice(opts.device);
    await db.collection<Identity>(COLL).updateOne({ id: opts.identityId }, { $push: { devices: device }, $set: { updatedAt: nowIso() } });
    // The $pull above may have emptied the device's previous (e.g. just-created
    // anonymous) identity — clean those up so they don't accumulate.
    await db.collection<Identity>(COLL).deleteMany({ devices: { $size: 0 }, createdByAdmin: { $ne: true } });
    await syncDeviceIdentity(opts.serial, opts.identityId);
    return findIdentityById(opts.identityId);
  }

  const name = (opts.name ?? "").trim().slice(0, 60) || "Guest";
  const id = randomUUID();
  const device = toDevice(opts.device);
  const identity: Identity = { id, name, devices: [device], createdAt: nowIso(), updatedAt: nowIso() };
  await ensureIdentityIndexes(db);
  try {
    await db.collection<Identity>(COLL).insertOne(identity);
  } catch (err) {
    if (!isDupKey(err)) throw err;
    // A concurrent create grabbed this serial — pull it off the winner and retry once.
    await db.collection<Identity>(COLL).updateMany({ "devices.serial": opts.serial }, { $pull: { devices: { serial: opts.serial } } });
    await db.collection<Identity>(COLL).insertOne(identity);
  }
  // Clean up any now-empty identities left after the pull.
  await db.collection<Identity>(COLL).deleteMany({ devices: { $size: 0 }, createdByAdmin: { $ne: true } });
  await syncDeviceIdentity(opts.serial, id);
  return identity;
}

export async function disownDevice(serial: string, identityId?: string): Promise<void> {
  const db = await getDb();
  const filter = identityId ? { id: identityId } : { "devices.serial": serial };
  await db.collection<Identity>(COLL).updateMany(filter, { $pull: { devices: { serial } }, $set: { updatedAt: nowIso() } });
  await db.collection<Identity>(COLL).deleteMany({ devices: { $size: 0 }, createdByAdmin: { $ne: true } });
  await syncDeviceIdentity(serial, null);
}

export async function findIdentityById(id: string): Promise<Identity | null> {
  const db = await getDb();
  const doc = await db.collection<Identity>(COLL).findOne({ id }, { projection: { _id: 0 } });
  return (doc as unknown as Identity) ?? null;
}

/* ── Admin ── */
/** Pre-create a named identity with no devices yet, so the admin can hand out a
 *  tracking link (?identity=<id>). Flagged so the empty-identity cleanup won't wipe it. */
export async function createIdentity(name: string): Promise<Identity> {
  const db = await getDb();
  const identity: Identity = {
    id: randomUUID(),
    name: (name ?? "").trim().slice(0, 60) || "Guest",
    devices: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
    createdByAdmin: true,
  };
  await db.collection<Identity>(COLL).insertOne(identity);
  return identity;
}

export async function renameIdentity(id: string, name: string): Promise<void> {
  const db = await getDb();
  await db.collection<Identity>(COLL).updateOne({ id }, { $set: { name: name.trim().slice(0, 60), updatedAt: nowIso() } });
}

export async function deleteIdentity(id: string): Promise<void> {
  const db = await getDb();
  await db.collection<Identity>(COLL).deleteOne({ id });
}

export async function removeDeviceFromIdentity(id: string, serial: string): Promise<void> {
  const db = await getDb();
  await db.collection<Identity>(COLL).updateOne({ id }, { $pull: { devices: { serial } }, $set: { updatedAt: nowIso() } });
  await db.collection<Identity>(COLL).deleteMany({ devices: { $size: 0 }, createdByAdmin: { $ne: true } });
  await syncDeviceIdentity(serial, null);
}

/** Merge source identities into a target (devices combined, dedup by serial). Sources are deleted. */
export async function mergeIdentities(targetId: string, sourceIds: string[]): Promise<Identity | null> {
  const db = await getDb();
  const target = await findIdentityById(targetId);
  if (!target) return null;
  const sources = (await db.collection<Identity>(COLL).find({ id: { $in: sourceIds.filter((s) => s !== targetId) } }).toArray()) as unknown as Identity[];
  const bySerial = new Map<string, IdentityDevice>();
  for (const d of target.devices) bySerial.set(d.serial, d);
  for (const s of sources) for (const d of s.devices) { if (!bySerial.has(d.serial)) bySerial.set(d.serial, d); }
  // Delete sources FIRST so their device serials are freed from the unique index
  // before the target claims them — otherwise the $set is rejected with a dup-key error.
  await db.collection<Identity>(COLL).deleteMany({ id: { $in: sources.map((s) => s.id) } });
  await db.collection<Identity>(COLL).updateOne({ id: targetId }, { $set: { devices: Array.from(bySerial.values()), updatedAt: nowIso() } });
  // Point every merged-in device's registry record at the surviving identity.
  await Promise.all(Array.from(bySerial.keys()).map((serial) => syncDeviceIdentity(serial, targetId)));
  return findIdentityById(targetId);
}

/** Record that a device explicitly denied being a specific identity. */
export async function addIdentityDenial(serial: string, identityId: string): Promise<void> {
  const db = await getDb();
  await db.collection("identityDenials").updateOne(
    { serial, identityId },
    { $set: { serial, identityId, deniedAt: nowIso() } },
    { upsert: true }
  );
}

/** Get all identity IDs denied by this device serial. */
export async function getDeniedIdentityIds(serial: string): Promise<string[]> {
  if (!serial) return [];
  const db = await getDb();
  const docs = await db.collection("identityDenials").find({ serial }, { projection: { identityId: 1 } }).toArray();
  return docs.map((d) => d.identityId as string);
}

/** Ensure EVERY visitor maps to an identity: if this serial isn't on one yet,
 *  auto-create a persistent ANONYMOUS identity (random UUID id, auto-label name)
 *  so messages/sessions/bookings/rizz/conversations all have an identity to tie to.
 *  The AI is NOT told the auto-label is a real name (see resolve route state logic). */
export async function ensureAnonymousIdentity(opts: { serial: string; device: DeviceInput; label?: string }): Promise<Identity | null> {
  const serial = (opts.serial || "").slice(0, 64);
  if (!serial) return null;
  const existing = await findIdentityBySerial(serial);
  if (existing) {
    await touchDevice(serial, { ip: opts.device.ip ?? undefined });
    return existing;
  }
  const db = await getDb();
  await ensureIdentityIndexes(db);
  const id = randomUUID();
  const device = toDevice({ ...opts.device, serial, linkMethod: opts.device.linkMethod ?? "serial" });
  const name = (opts.label?.trim() || "Anonymous").slice(0, 60);
  const identity: Identity = { id, name, devices: [device], anonymous: true, createdAt: nowIso(), updatedAt: nowIso() };
  try {
    await db.collection<Identity>(COLL).insertOne(identity);
  } catch (err) {
    // Lost a create race (unique devices.serial) — return the winner instead of duplicating.
    if (isDupKey(err)) {
      const won = await findIdentityBySerial(serial);
      if (won) return won;
    }
    throw err;
  }
  await syncDeviceIdentity(serial, id);
  return identity;
}

/** Admin: move a device (by serial) from its current identity onto another,
 *  preserving the device's captured metadata. Empty source identities are cleaned up. */
export async function moveDeviceToIdentity(serial: string, toIdentityId: string): Promise<Identity | null> {
  const db = await getDb();
  const target = await db.collection<Identity>(COLL).findOne({ id: toIdentityId });
  if (!target) return null;
  const current = await db.collection<Identity>(COLL).findOne({ "devices.serial": serial });
  const existingDev = (current?.devices as IdentityDevice[] | undefined)?.find((d) => d.serial === serial);
  const device: IdentityDevice = existingDev
    ? { ...existingDev, linkMethod: "manual", lastSeen: nowIso() }
    : toDevice({ serial, linkMethod: "manual" });
  await db.collection<Identity>(COLL).updateMany(
    { "devices.serial": serial },
    { $pull: { devices: { serial } }, $set: { updatedAt: nowIso() } },
  );
  await db.collection<Identity>(COLL).updateOne(
    { id: toIdentityId },
    { $push: { devices: device }, $set: { updatedAt: nowIso() } },
  );
  await db.collection<Identity>(COLL).deleteMany({ devices: { $size: 0 }, createdByAdmin: { $ne: true } });
  await syncDeviceIdentity(serial, toIdentityId);
  return findIdentityById(toIdentityId);
}
