/* ─────────────────────────────────────────────────────────────────────────────
   Deterministic Bridge — the "Scan to Mobile" QR handshake (100% certain).

   Desktop asks the AI to "check this on my phone" → createHandshake() mints a
   short-lived token embedded into a QR as ?handshake_id=<uuid>. The phone lands,
   reads the param, and claimHandshake() attaches the mobile device's serial to
   the SAME identity as the desktop — a guaranteed cross-device link.
   ──────────────────────────────────────────────────────────────────────────── */

import { getDb } from "./mongodb";
import { randomUUID } from "crypto";
import { claimDevice, findIdentityBySerial } from "./identity";
import { parseUserAgent } from "./ua";
import type { HandshakeBridge } from "./types";

const COLL = "handshakeBridges";
const TTL_MS = 15 * 60 * 1000; // QR is valid for 15 minutes
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function nowIso() { return new Date().toISOString(); }

let indexesEnsured = false;
async function ensureIndexes(db: Awaited<ReturnType<typeof getDb>>): Promise<void> {
  if (indexesEnsured) return;
  indexesEnsured = true;
  try {
    await db.collection(COLL).createIndex({ id: 1 }, { unique: true });
    await db.collection(COLL).createIndex({ expiresAt: 1 });
  } catch {
    indexesEnsured = false;
  }
}

export async function createHandshake(input: {
  sourceSerial: string;
  sourceIdentityId?: string | null;
  sourceName?: string | null;
}): Promise<{ handshakeId: string; expiresAt: string } | null> {
  const sourceSerial = (input.sourceSerial || "").slice(0, 64);
  if (!sourceSerial) return null;
  const db = await getDb();
  await ensureIndexes(db);

  const t = Date.now();
  const id = randomUUID();
  const bridge: HandshakeBridge = {
    id,
    sourceSerial,
    sourceIdentityId: input.sourceIdentityId ?? null,
    sourceName: input.sourceName ? input.sourceName.slice(0, 60) : null,
    status: "PENDING",
    createdAt: new Date(t).toISOString(),
    expiresAt: new Date(t + TTL_MS).toISOString(),
  };
  await db.collection(COLL).insertOne(bridge as unknown as Record<string, unknown>);
  return { handshakeId: id, expiresAt: bridge.expiresAt };
}

export interface ClaimHandshakeResult {
  ok: boolean;
  identityId?: string;
  name?: string;
  reason?: string;
  sourceSerial?: string;
}

export async function claimHandshake(input: {
  handshakeId: string;
  serial: string;
  ip?: string | null;
  userAgent?: string | null;
  gpu?: string | null;
  screen?: string | null;
  timezone?: string | null;
  language?: string | null;
}): Promise<ClaimHandshakeResult> {
  const handshakeId = (input.handshakeId || "").slice(0, 64);
  const serial = (input.serial || "").slice(0, 64);
  if (!handshakeId || !serial) return { ok: false, reason: "missing" };
  if (!UUID_RE.test(handshakeId)) return { ok: false, reason: "bad_id" };

  const db = await getDb();
  await ensureIndexes(db);
  const bridge = (await db.collection(COLL).findOne({ id: handshakeId })) as unknown as HandshakeBridge | null;
  if (!bridge) return { ok: false, reason: "not_found" };
  if (bridge.status !== "PENDING") return { ok: false, reason: "used" };
  if (Date.parse(bridge.expiresAt) < Date.now()) {
    await db.collection(COLL).updateOne({ id: handshakeId }, { $set: { status: "EXPIRED" } });
    return { ok: false, reason: "expired" };
  }
  if (bridge.sourceSerial === serial) return { ok: false, reason: "same_device" };

  const ua = input.userAgent || "";
  const { browser, os, device } = parseUserAgent(ua);
  const deviceInput = {
    serial,
    ip: input.ip ?? null,
    browser,
    os,
    device,
    gpu: input.gpu ?? undefined,
    screen: input.screen ?? undefined,
    timezone: input.timezone ?? undefined,
    language: input.language ?? undefined,
    userAgent: ua,
    linkMethod: "handshake" as const,
    linkConfidence: 1,
  };

  // Resolve the source device's identity fresh (it may have been claimed after
  // the QR was generated). If the source is still anonymous, create an identity
  // and attach BOTH serials so the device graph is correct immediately.
  const sourceIdentity = await findIdentityBySerial(bridge.sourceSerial);
  let identity = null;
  if (sourceIdentity) {
    identity = await claimDevice({ serial, identityId: sourceIdentity.id, device: deviceInput });
  } else {
    identity = await claimDevice({
      serial: bridge.sourceSerial,
      name: bridge.sourceName || undefined,
      device: { serial: bridge.sourceSerial, linkMethod: "handshake", linkConfidence: 1 },
    });
    if (identity) {
      identity = await claimDevice({ serial, identityId: identity.id, device: deviceInput });
    }
  }

  // The link must have actually landed before we burn the one-time token. If it
  // didn't (e.g. an identity re-read returned null under concurrent cleanup),
  // leave the handshake PENDING so the phone can retry within the TTL instead of
  // reporting a false success on the "100% certain" bridge.
  if (!identity?.id || !identity.devices?.some((d) => d.serial === serial)) {
    return { ok: false, reason: "link_failed", sourceSerial: bridge.sourceSerial };
  }

  await db.collection(COLL).updateOne(
    { id: handshakeId },
    { $set: { status: "CLAIMED", claimedAt: nowIso(), claimedSerial: serial, claimedIp: input.ip ?? null } },
  );

  return { ok: true, identityId: identity.id, name: identity.name, sourceSerial: bridge.sourceSerial };
}

/** Cron housekeeping: mark expired pending handshakes + drop very old rows. */
export async function expireHandshakes(): Promise<number> {
  const db = await getDb();
  const now = nowIso();
  await db.collection(COLL).updateMany({ status: "PENDING", expiresAt: { $lt: now } }, { $set: { status: "EXPIRED" } });
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const res = await db.collection(COLL).deleteMany({ status: { $ne: "PENDING" }, createdAt: { $lt: dayAgo } });
  return res.deletedCount ?? 0;
}
