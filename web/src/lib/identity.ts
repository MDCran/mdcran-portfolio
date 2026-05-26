import { getDb } from "./mongodb";
import { randomUUID } from "crypto";
import type { Identity, IdentityDevice } from "./types";

const COLL = "identities";

type DeviceInput = Partial<Omit<IdentityDevice, "serial" | "firstSeen" | "lastSeen">> & { serial: string };

function nowIso() { return new Date().toISOString(); }

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

/** Other identities that have a device on the same IP (for "who are you?" suggestions). */
export async function suggestionsForIp(ip: string | null, excludeSerial?: string): Promise<{ id: string; name: string }[]> {
  if (!ip || ip === "unknown") return [];
  const db = await getDb();
  const docs = await db.collection<Identity>(COLL).find({ "devices.ip": ip }, { projection: { _id: 0, id: 1, name: 1, devices: 1 } }).limit(30).toArray();
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
    return findIdentityById(opts.identityId);
  }

  const name = (opts.name ?? "").trim().slice(0, 60) || "Guest";
  const id = randomUUID();
  const device = toDevice(opts.device);
  const identity: Identity = { id, name, devices: [device], createdAt: nowIso(), updatedAt: nowIso() };
  await db.collection<Identity>(COLL).insertOne(identity);
  // Clean up any now-empty identities left after the pull.
  await db.collection<Identity>(COLL).deleteMany({ devices: { $size: 0 } });
  return identity;
}

export async function disownDevice(serial: string, identityId?: string): Promise<void> {
  const db = await getDb();
  const filter = identityId ? { id: identityId } : { "devices.serial": serial };
  await db.collection<Identity>(COLL).updateMany(filter, { $pull: { devices: { serial } }, $set: { updatedAt: nowIso() } });
  await db.collection<Identity>(COLL).deleteMany({ devices: { $size: 0 } });
}

export async function findIdentityById(id: string): Promise<Identity | null> {
  const db = await getDb();
  const doc = await db.collection<Identity>(COLL).findOne({ id }, { projection: { _id: 0 } });
  return (doc as unknown as Identity) ?? null;
}

/* ── Admin ── */
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
  await db.collection<Identity>(COLL).deleteMany({ devices: { $size: 0 } });
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
  await db.collection<Identity>(COLL).updateOne({ id: targetId }, { $set: { devices: Array.from(bySerial.values()), updatedAt: nowIso() } });
  await db.collection<Identity>(COLL).deleteMany({ id: { $in: sources.map((s) => s.id) } });
  return findIdentityById(targetId);
}
