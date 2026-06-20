/* ─────────────────────────────────────────────────────────────────────────────
   Cross-Device Identity Resolution Engine — probabilistic fallback layer.

   This module owns:
     • the `devices` registry — a per-fingerprint telemetry record that exists
       even for ANONYMOUS devices (so two unlinked devices can be scored).
     • the multi-point scoring matrix  C = Wnetwork + Wtime + Wbehavior + Whardware.
     • the `deviceLinkCandidates` buffer — a SUSPECTED/CONFIRMED/REJECTED safety
       layer that is NEVER auto-merged into the clean `identities` collection.

   It deliberately does NOT write to `identities` (no import of identity.ts) to
   avoid a module cycle: identity.ts → cross-device.ts (one-way, via
   syncDeviceIdentity). Confirmation of a candidate returns data; the caller
   (admin route) performs the actual identity merge via lib/identity.ts.
   ──────────────────────────────────────────────────────────────────────────── */

import { getDb } from "./mongodb";
import { randomUUID } from "crypto";
import { hashIp, geolocateIp, subnetOf } from "./geoip";
import { parseUserAgent } from "./ua";
import type {
  DeviceRecord,
  DeviceLinkCandidate,
  DeviceLinkBreakdown,
  DeviceLinkState,
} from "./types";

const DEVICES = "devices";
const CANDIDATES = "deviceLinkCandidates";

/** Temporal-proximity window: the spec's strict 3-minute bridge. */
const TEMPORAL_WINDOW_MS = 3 * 60 * 1000;
/** Only consider other devices active within this lookback as candidates. */
const CANDIDATE_LOOKBACK_MS = 30 * 60 * 1000;
/** A score at/above this writes a SUSPECTED candidate row. */
export const MIN_CANDIDATE_SCORE = 50;
/** Behavioral: "deep-link viewed for > 60s" awards full behavior points. */
const DWELL_THRESHOLD_MS = 60 * 1000;
const MAX_RECENT_PATHS = 12;

function nowIso() { return new Date().toISOString(); }
function pairKeyOf(a: string, b: string): string { return [a, b].sort().join("|"); }

// ── Index bootstrap (idempotent, best-effort) ────────────────────────────────
let indexesEnsured = false;
async function ensureIndexes(db: Awaited<ReturnType<typeof getDb>>): Promise<void> {
  if (indexesEnsured) return;
  indexesEnsured = true;
  try {
    await db.collection(DEVICES).createIndex({ serial: 1 }, { unique: true });
    await db.collection(DEVICES).createIndex({ lastSeen: -1 });
    await db.collection(DEVICES).createIndex({ subnet24: 1 });
    await db.collection(DEVICES).createIndex({ "networks.subnet24": 1 });
    await db.collection(DEVICES).createIndex({ asn: 1 });
    await db.collection(DEVICES).createIndex({ identityId: 1 });
    await db.collection(CANDIDATES).createIndex({ pairKey: 1 }, { unique: true });
    await db.collection(CANDIDATES).createIndex({ state: 1, confidenceScore: -1 });
    await db.collection(CANDIDATES).createIndex({ id: 1 });
  } catch {
    indexesEnsured = false; // allow a later retry
  }
}

// ── Device registry ──────────────────────────────────────────────────────────

export interface DeviceSignalInput {
  serial: string;
  ip?: string | null;
  userAgent?: string | null;
  gpu?: string | null;
  screen?: string | null;
  timezone?: string | null;
  language?: string | null;
  colorScheme?: "dark" | "light" | null;
  deviceType?: DeviceRecord["deviceType"];
  identityId?: string | null;
  /** Append a deep-link dwell sample (from a pageend). */
  path?: { path: string; dwellMs: number } | null;
}

/** Upsert the per-device telemetry record. Safe to call on every page load /
 *  resolve / analytics ingest — fields only move forward. */
export async function upsertDeviceRegistry(input: DeviceSignalInput): Promise<DeviceRecord | null> {
  const serial = (input.serial || "").slice(0, 64);
  if (!serial) return null;
  const db = await getDb();
  await ensureIndexes(db);

  const t = nowIso();
  const ip = input.ip && input.ip !== "unknown" ? input.ip : null;
  const subnet = ip ? subnetOf(ip) : null;
  const ipHash = ip ? hashIp(ip) : null;
  const ua = input.userAgent || "";
  const parsed = ua ? parseUserAgent(ua) : null;
  const deviceType = input.deviceType || parsed?.device || "unknown";

  const set: Record<string, unknown> = { serial, lastSeen: t, updatedAt: t };
  if (ip) { set.ip = ip; set.ipHash = ipHash; set.subnet24 = subnet; }
  if (input.gpu) set.gpu = input.gpu;
  if (input.screen) set.screen = input.screen;
  if (input.timezone) set.timezone = input.timezone;
  if (input.language) set.language = input.language;
  if (input.colorScheme) set.colorScheme = input.colorScheme;
  if (ua) set.userAgent = ua;
  if (parsed) { set.browser = parsed.browser; set.os = parsed.os; }
  if (deviceType) set.deviceType = deviceType;
  if (input.identityId !== undefined) set.identityId = input.identityId;

  const update: Record<string, unknown> = {
    $set: set,
    $setOnInsert: { createdAt: t, firstSeen: t, identityId: input.identityId ?? null },
  };
  // $setOnInsert and $set must not target the same path.
  if (input.identityId !== undefined) {
    delete (update.$setOnInsert as Record<string, unknown>).identityId;
  }

  if (input.path && input.path.path) {
    update.$push = {
      recentPaths: {
        $each: [{ path: input.path.path.slice(0, 256), dwellMs: Math.max(0, input.path.dwellMs | 0), ts: t }],
        $slice: -MAX_RECENT_PATHS,
      },
    };
  }

  await db.collection(DEVICES).updateOne({ serial }, update, { upsert: true });

  // Record the network this device loaded the site on, so it can keep suggesting
  // a name from a WiFi it was on days ago even while now on a different network.
  if (subnet) void recordDeviceNetwork(serial, subnet, ip);

  // ASN enrichment is a slow network call — fire-and-forget, only when missing.
  if (ip && subnet) void enrichAsn(serial, ip);

  return getDeviceRecord(serial);
}

const MAX_NETWORKS = 12;

/** Append/refresh a network (subnet) in a device's history (deduped by subnet). */
async function recordDeviceNetwork(serial: string, subnet: string, ip: string | null): Promise<void> {
  try {
    const db = await getDb();
    const t = nowIso();
    const bumped = await db.collection(DEVICES).updateOne(
      { serial, "networks.subnet24": subnet },
      { $set: { "networks.$.lastSeen": t, ...(ip ? { "networks.$.ip": ip } : {}) } },
    );
    if (bumped.matchedCount === 0) {
      const pushUpdate: Record<string, unknown> = {
        $push: { networks: { $each: [{ subnet24: subnet, ip: ip ?? null, asn: null, firstSeen: t, lastSeen: t }], $slice: -MAX_NETWORKS } },
      };
      await db.collection(DEVICES).updateOne({ serial }, pushUpdate);
    }
  } catch { /* non-fatal */ }
}

async function enrichAsn(serial: string, ip: string): Promise<void> {
  try {
    const db = await getDb();
    const existing = await db.collection(DEVICES).findOne({ serial }, { projection: { asn: 1 } });
    if (existing?.asn) return;
    const geo = await geolocateIp(ip);
    if (!geo) return;
    const patch: Record<string, unknown> = {};
    if (geo.asn) { patch.asn = geo.asn; patch.asnName = geo.asnName ?? null; }
    if (geo.country) patch.country = geo.country;
    if (Object.keys(patch).length) await db.collection(DEVICES).updateOne({ serial }, { $set: patch });
  } catch { /* non-fatal */ }
}

export async function getDeviceRecord(serial: string): Promise<DeviceRecord | null> {
  if (!serial) return null;
  const db = await getDb();
  const doc = await db.collection(DEVICES).findOne({ serial }, { projection: { _id: 0 } });
  return (doc as unknown as DeviceRecord) ?? null;
}

/** Keep the registry's identityId in sync when lib/identity.ts links/unlinks a
 *  serial. Called from claimDevice / disownDevice (one-way dependency). */
export async function syncDeviceIdentity(serial: string, identityId: string | null): Promise<void> {
  if (!serial) return;
  try {
    const db = await getDb();
    const t = nowIso();
    await db.collection(DEVICES).updateOne(
      { serial },
      { $set: { serial, identityId, updatedAt: t }, $setOnInsert: { createdAt: t, firstSeen: t, lastSeen: t, deviceType: "unknown" } },
      { upsert: true },
    );
  } catch { /* non-fatal */ }
}

// ── The scoring matrix ───────────────────────────────────────────────────────
//   C = Wnetwork(40) + Wtime(30) + Wbehavior(20) + Whardware(10)

export function calculateDeviceLinkConfidence(
  a: DeviceRecord,
  b: DeviceRecord,
  opts?: { landingPath?: string | null; nowMs?: number },
): { score: number; breakdown: DeviceLinkBreakdown; criteria: string[]; sharedPath: string | null } {
  const criteria: string[] = [];
  const breakdown: DeviceLinkBreakdown = { network: 0, time: 0, behavior: 0, hardware: 0 };
  const now = opts?.nowMs ?? Date.now();

  // ── Network Coincidence (max 40) ──
  if (a.ip && b.ip && a.ip === b.ip) {
    breakdown.network = 40;
    criteria.push(`Same public IP address (${a.ip})`);
  } else if (a.subnet24 && b.subnet24 && a.subnet24 === b.subnet24) {
    breakdown.network = 30;
    criteria.push(`Same /24 subnet (${a.subnet24}.x)`);
  } else if (a.asn && b.asn && a.asn === b.asn) {
    breakdown.network = 18;
    criteria.push(`Same network / ASN (${a.asnName || a.asn})`);
  }

  // ── Temporal Proximity (max 30) — linear decay across the 3-minute window ──
  const aSeen = Date.parse(a.lastSeen || a.firstSeen || "") || now;
  const bSeen = Date.parse(b.lastSeen || b.firstSeen || "") || 0;
  if (bSeen) {
    const gap = Math.abs(aSeen - bSeen);
    if (gap <= TEMPORAL_WINDOW_MS) {
      breakdown.time = Math.max(0, Math.round(30 * (1 - gap / TEMPORAL_WINDOW_MS)));
      if (breakdown.time > 0) criteria.push(`Active within ${Math.round(gap / 1000)}s of each other`);
    }
  }

  // ── Behavioral Trajectory Sync (max 20) ──
  const landing =
    opts?.landingPath ||
    (a.recentPaths && a.recentPaths.length ? a.recentPaths[a.recentPaths.length - 1].path : null);
  let sharedPath: string | null = null;
  if (landing && landing !== "/" && b.recentPaths && b.recentPaths.length) {
    const deep = b.recentPaths.find((p) => p.path === landing && p.dwellMs >= DWELL_THRESHOLD_MS);
    if (deep) {
      breakdown.behavior = 20;
      sharedPath = landing;
      criteria.push(`Both visited ${landing} (other device dwelled ${Math.round(deep.dwellMs / 1000)}s)`);
    } else if (b.recentPaths.some((p) => p.path === landing)) {
      breakdown.behavior = 10;
      sharedPath = landing;
      criteria.push(`Both visited ${landing}`);
    }
  }

  // ── Hardware / User-Agent Parity (max 10) ──
  let hw = 0;
  if (a.language && b.language && a.language === b.language) { hw += 4; criteria.push(`Same language (${a.language})`); }
  if (a.timezone && b.timezone && a.timezone === b.timezone) { hw += 4; criteria.push(`Same timezone (${a.timezone})`); }
  if (a.colorScheme && b.colorScheme && a.colorScheme === b.colorScheme) { hw += 2; criteria.push(`Same color scheme (${a.colorScheme})`); }
  breakdown.hardware = Math.min(10, hw);

  const score = breakdown.network + breakdown.time + breakdown.behavior + breakdown.hardware;
  return { score, breakdown, criteria, sharedPath };
}

// ── Candidate evaluation ─────────────────────────────────────────────────────

/**
 * Score the given device against recently-active other devices that share a
 * network signal. Any pair with C >= 50 is written to the candidate buffer
 * (never to identities). Returns the strongest fresh SUSPECTED candidate so the
 * caller (resolve route) can hand it to the AI for graceful probing.
 */
export async function evaluateDeviceLinks(
  serial: string,
  opts?: { landingPath?: string | null },
): Promise<DeviceLinkCandidate | null> {
  const a = await getDeviceRecord(serial);
  if (!a || a.deviceType === "bot") return null;

  const db = await getDb();
  const now = Date.now();
  const since = new Date(now - CANDIDATE_LOOKBACK_MS).toISOString();

  const net: Record<string, unknown>[] = [];
  if (a.ip) net.push({ ip: a.ip });
  if (a.subnet24) net.push({ subnet24: a.subnet24 });
  if (a.asn) net.push({ asn: a.asn });
  if (!net.length) return null;

  const pool = (await db
    .collection(DEVICES)
    .find({ serial: { $ne: serial }, lastSeen: { $gte: since }, deviceType: { $ne: "bot" }, $or: net }, { projection: { _id: 0 } })
    .limit(50)
    .toArray()) as unknown as DeviceRecord[];

  let best: DeviceLinkCandidate | null = null;

  for (const b of pool) {
    // Never pair two devices already on the same identity.
    if (a.identityId && b.identityId && a.identityId === b.identityId) continue;

    const { score, breakdown, criteria, sharedPath } = calculateDeviceLinkConfidence(a, b, {
      landingPath: opts?.landingPath,
      nowMs: now,
    });
    if (score < MIN_CANDIDATE_SCORE) continue;

    const pairKey = pairKeyOf(serial, b.serial);
    const existing = (await db.collection(CANDIDATES).findOne({ pairKey })) as unknown as DeviceLinkCandidate | null;

    if (existing?.state === "CONFIRMED") continue; // already linked
    if (existing?.state === "REJECTED") {
      // Decay: a rejected pair must clear a raised bar to re-surface.
      const penalty = 15 * (existing.rejectionCount || 1);
      if (score - penalty < MIN_CANDIDATE_SCORE) continue;
    }

    const t = nowIso();
    const cand: DeviceLinkCandidate = {
      id: existing?.id || randomUUID(),
      pairKey,
      sourceSerial: serial,
      targetSerial: b.serial,
      sourceIdentityId: a.identityId ?? null,
      targetIdentityId: b.identityId ?? null,
      sourceName: null,
      targetName: null,
      confidenceScore: score,
      breakdown,
      criteria,
      sharedPath: sharedPath ?? null,
      state: "SUSPECTED",
      rejectionCount: existing?.rejectionCount || 0,
      createdAt: existing?.createdAt || t,
      updatedAt: t,
    };

    await db.collection(CANDIDATES).updateOne(
      { pairKey },
      // Clear any stale lifecycle timestamps when a pair re-surfaces as SUSPECTED.
      { $set: { ...cand } as Record<string, unknown>, $unset: { rejectedAt: "", confirmedAt: "" } },
      { upsert: true },
    );

    if (!best || score > best.confidenceScore) best = cand;
  }

  return best;
}

/** Strongest fresh SUSPECTED candidate touching this serial (for AI probing). */
export async function getTopCandidateForSerial(serial: string): Promise<DeviceLinkCandidate | null> {
  if (!serial) return null;
  const db = await getDb();
  const since = new Date(Date.now() - CANDIDATE_LOOKBACK_MS).toISOString();
  const doc = await db.collection(CANDIDATES).findOne(
    { state: "SUSPECTED", updatedAt: { $gte: since }, $or: [{ sourceSerial: serial }, { targetSerial: serial }] },
    { projection: { _id: 0 }, sort: { confidenceScore: -1 } },
  );
  return (doc as unknown as DeviceLinkCandidate) ?? null;
}

// ── Candidate lifecycle (admin / AI driven) ──────────────────────────────────

export async function listCandidates(state?: DeviceLinkState): Promise<DeviceLinkCandidate[]> {
  const db = await getDb();
  const q = state ? { state } : {};
  const docs = await db
    .collection(CANDIDATES)
    .find(q, { projection: { _id: 0 } })
    .sort({ confidenceScore: -1, updatedAt: -1 })
    .limit(200)
    .toArray();
  return docs as unknown as DeviceLinkCandidate[];
}

export async function getCandidate(id: string): Promise<DeviceLinkCandidate | null> {
  const db = await getDb();
  const doc = await db.collection(CANDIDATES).findOne({ id }, { projection: { _id: 0 } });
  return (doc as unknown as DeviceLinkCandidate) ?? null;
}

/** Atomically flip a SUSPECTED candidate to CONFIRMED. Returns true only if THIS
 *  call performed the transition — so concurrent auto-resolves/sweeps don't both
 *  link + notify the same pair. Does NOT touch identities (caller does the merge). */
export async function confirmCandidate(id: string, resolvedBy: "auto" | "admin" | "ai" = "admin"): Promise<boolean> {
  const db = await getDb();
  const t = nowIso();
  const res = await db.collection(CANDIDATES).updateOne(
    { id, state: "SUSPECTED" },
    { $set: { state: "CONFIRMED", confirmedAt: t, updatedAt: t, resolvedBy } },
  );
  return res.modifiedCount === 1;
}

export async function rejectCandidate(id: string, resolvedBy: "auto" | "admin" | "ai" = "admin"): Promise<void> {
  const db = await getDb();
  const t = nowIso();
  await db.collection(CANDIDATES).updateOne(
    { id },
    { $set: { state: "REJECTED", rejectedAt: t, updatedAt: t, resolvedBy }, $inc: { rejectionCount: 1 } },
  );
}

/** AI/user-driven reject from chat: kill SUSPECTED candidate(s) for this device
 *  (optionally a specific pair). Returns the number of candidates rejected. */
export async function rejectCandidateForSerial(serial: string, otherSerial?: string): Promise<number> {
  if (!serial) return 0;
  const db = await getDb();
  const t = nowIso();
  const q: Record<string, unknown> = otherSerial
    ? { pairKey: pairKeyOf(serial, otherSerial) }
    : { state: "SUSPECTED", $or: [{ sourceSerial: serial }, { targetSerial: serial }] };
  const res = await db.collection(CANDIDATES).updateMany(
    q,
    { $set: { state: "REJECTED", rejectedAt: t, updatedAt: t }, $inc: { rejectionCount: 1 } },
  );
  return res.modifiedCount;
}

/** Subnets this device has loaded the site on within `sinceMs` (incl. current). */
export async function getDeviceNetworkSubnets(serial: string, sinceMs: number): Promise<string[]> {
  const rec = await getDeviceRecord(serial);
  if (!rec) return [];
  const cut = Date.now() - sinceMs;
  const set = new Set<string>();
  if (rec.subnet24) set.add(rec.subnet24);
  for (const n of rec.networks ?? []) {
    if (n.subnet24 && Date.parse(n.lastSeen) >= cut) set.add(n.subnet24);
  }
  return Array.from(set);
}

/** Identity ids of OTHER devices that have been on any of `subnets` within the
 *  window — the past-shared-network signal for off-network name suggestions. */
export async function findDeviceIdentityIdsBySubnets(serial: string, subnets: string[], sinceMs: number): Promise<string[]> {
  if (!subnets.length) return [];
  const db = await getDb();
  const cutIso = new Date(Date.now() - sinceMs).toISOString();
  const rows = await db.collection(DEVICES).find(
    {
      serial: { $ne: serial },
      identityId: { $ne: null },
      lastSeen: { $gte: cutIso },
      $or: [{ subnet24: { $in: subnets } }, { "networks.subnet24": { $in: subnets } }],
    },
    { projection: { _id: 0, identityId: 1 } },
  ).limit(50).toArray();
  return Array.from(new Set(rows.map((r) => r.identityId as string).filter(Boolean)));
}

/** Identity ids paired with this serial via a non-rejected probabilistic
 *  candidate, with the pair's confidence — the weakest suggestion tier. */
export async function findCandidateIdentityIdsForSerial(serial: string): Promise<{ identityId: string; score: number }[]> {
  const db = await getDb();
  const cands = (await db.collection(CANDIDATES).find(
    { state: { $ne: "REJECTED" }, $or: [{ sourceSerial: serial }, { targetSerial: serial }] },
    { projection: { _id: 0 } },
  ).sort({ confidenceScore: -1 }).limit(10).toArray()) as unknown as DeviceLinkCandidate[];
  if (!cands.length) return [];
  const otherSerials = cands.map((c) => (c.sourceSerial === serial ? c.targetSerial : c.sourceSerial));
  const devRows = await db.collection(DEVICES).find(
    { serial: { $in: otherSerials }, identityId: { $ne: null } },
    { projection: { _id: 0, serial: 1, identityId: 1 } },
  ).toArray();
  const idBySerial = new Map(devRows.map((r) => [r.serial as string, r.identityId as string]));
  const out: { identityId: string; score: number }[] = [];
  const seen = new Set<string>();
  for (const c of cands) {
    const other = c.sourceSerial === serial ? c.targetSerial : c.sourceSerial;
    const id = idBySerial.get(other);
    if (id && !seen.has(id)) { seen.add(id); out.push({ identityId: id, score: c.confidenceScore }); }
  }
  return out;
}

/** Device-graph data for the admin CRM: telemetry for a set of serials plus any
 *  candidate edges touching them. */
export async function getDeviceGraph(
  serials: string[],
): Promise<{ devices: DeviceRecord[]; candidates: DeviceLinkCandidate[] }> {
  const clean = serials.filter(Boolean);
  if (!clean.length) return { devices: [], candidates: [] };
  const db = await getDb();
  const devices = (await db
    .collection(DEVICES)
    .find({ serial: { $in: clean } }, { projection: { _id: 0 } })
    .toArray()) as unknown as DeviceRecord[];
  const candidates = (await db
    .collection(CANDIDATES)
    .find({ $or: [{ sourceSerial: { $in: clean } }, { targetSerial: { $in: clean } }] }, { projection: { _id: 0 } })
    .sort({ confidenceScore: -1 })
    .toArray()) as unknown as DeviceLinkCandidate[];
  return { devices, candidates };
}

/** Housekeeping for the cron: expire stale handshakes is elsewhere; here we drop
 *  long-dead anonymous device records and old rejected candidates. */
export async function pruneCrossDevice(maxAgeDays = 90): Promise<{ devices: number; candidates: number }> {
  const db = await getDb();
  const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000).toISOString();
  const d = await db.collection(DEVICES).deleteMany({ lastSeen: { $lt: cutoff }, identityId: null });
  const c = await db.collection(CANDIDATES).deleteMany({ state: "REJECTED", updatedAt: { $lt: cutoff } });
  return { devices: d.deletedCount ?? 0, candidates: c.deletedCount ?? 0 };
}
