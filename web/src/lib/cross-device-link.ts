/* ─────────────────────────────────────────────────────────────────────────────
   Cross-Device link orchestration + self-management policy.

   This module is the ONE place that turns a probabilistic candidate into an
   actual identity link. It imports BOTH the identity store and the cross-device
   engine (one-way: cross-device.ts imports neither of these, so no cycle).

   Policy (admin-configurable, see getCrossDeviceAutoConfig):
     • confidence >= autoConfirmScore  → auto-confirm + link, no admin action.
     • SUSPECTED older than autoRejectStaleDays (and below autoConfirmScore)
       → auto-reject, so the review queue self-cleans.
     • everything in between stays SUSPECTED for the AI to gently probe, or for
       the admin to confirm/reject manually (the override).
   ──────────────────────────────────────────────────────────────────────────── */

import { getCandidate, confirmCandidate, rejectCandidate, listCandidates, getDeviceRecord, getDeviceNetworkSubnets, findDeviceIdentityIdsBySubnets, findCandidateIdentityIdsForSerial } from "./cross-device";
import { findIdentityBySerial, findIdentityById, claimDevice, mergeIdentities, suggestionsForIp } from "./identity";
import { getCrossDeviceAutoConfig } from "./db";
import { notifyDeviceLink } from "./discord";
import type { DeviceLinkCandidate, DeviceRecord, LinkMethod, Identity } from "./types";

type ResolvedBy = "auto" | "admin" | "ai";

/** Past-shared-network suggestions look back this far (30 days). */
const HISTORY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
/** Top suggestion at/above this certainty (and clearly dominant) auto-sets the name. */
export const AUTO_NAME_CERTAINTY = 0.8;

export interface LayeredSuggestion { id: string; name: string; certainty: number }

/** Build name suggestions for a device across THREE tiers, so a phone still gets
 *  a name even when it's no longer on the network it was first seen on:
 *    (1) a NAMED identity currently on the same IP   — highest certainty
 *    (2) a NAMED identity this device shared a network with in the last 30 days
 *    (3) a NAMED identity paired via a probabilistic cross-device candidate
 *  Dedup by identity (max certainty), drop denied + the device's own identity. */
export async function getLayeredSuggestions(
  serial: string,
  currentIp: string | null,
  deniedIds: string[],
  ownIdentityId?: string | null,
): Promise<LayeredSuggestion[]> {
  const out = new Map<string, LayeredSuggestion>();
  const add = (id: string | null | undefined, name: string | null | undefined, certainty: number) => {
    if (!id || !name) return;
    if (deniedIds.includes(id) || id === ownIdentityId) return;
    const prev = out.get(id);
    if (!prev || certainty > prev.certainty) out.set(id, { id, name, certainty });
  };

  // Tier 1 — currently on the same IP (suggestionsForIp already excludes anonymous).
  try {
    const ip1 = await suggestionsForIp(currentIp, serial);
    ip1.forEach((s, i) => add(s.id, s.name, Math.max(0.65, 0.9 - i * 0.1)));
  } catch { /* */ }

  // Tier 2 — shared a network in the last 30 days (off-network recall).
  try {
    const subnets = await getDeviceNetworkSubnets(serial, HISTORY_WINDOW_MS);
    const ids = await findDeviceIdentityIdsBySubnets(serial, subnets, HISTORY_WINDOW_MS);
    for (const id of ids) {
      const idn = await findIdentityById(id);
      if (idn && !idn.anonymous) add(id, idn.name, 0.55);
    }
  } catch { /* */ }

  // Tier 3 — probabilistic device pairing (weakest).
  try {
    const pairs = await findCandidateIdentityIdsForSerial(serial);
    for (const { identityId, score } of pairs) {
      const idn = await findIdentityById(identityId);
      if (idn && !idn.anonymous) add(identityId, idn.name, Math.min(0.5, (score / 100) * 0.55));
    }
  } catch { /* */ }

  return Array.from(out.values()).sort((a, b) => b.certainty - a.certainty).slice(0, 5);
}

function devFromRecord(serial: string, rec: DeviceRecord | null, linkMethod: LinkMethod = "candidate") {
  return {
    serial,
    ip: rec?.ip ?? null,
    browser: rec?.browser,
    os: rec?.os,
    device: rec?.deviceType,
    gpu: rec?.gpu,
    screen: rec?.screen,
    timezone: rec?.timezone,
    language: rec?.language,
    userAgent: rec?.userAgent,
    linkMethod,
    linkConfidence: 0.7,
  };
}

/** Merge/claim the two devices of a candidate into a single identity. Resolves
 *  each side's CURRENT identity (the candidate buffer may be stale). Returns the
 *  surviving identity. Does NOT change the candidate's state — caller does that. */
export async function applyCandidateLink(cand: DeviceLinkCandidate): Promise<Identity | null> {
  const srcIdn = cand.sourceIdentityId
    ? await findIdentityById(cand.sourceIdentityId)
    : await findIdentityBySerial(cand.sourceSerial);
  const tgtIdn = cand.targetIdentityId
    ? await findIdentityById(cand.targetIdentityId)
    : await findIdentityBySerial(cand.targetSerial);

  if (srcIdn && tgtIdn && srcIdn.id !== tgtIdn.id) {
    return mergeIdentities(srcIdn.id, [tgtIdn.id]);
  }
  if (srcIdn && !tgtIdn) {
    return claimDevice({ serial: cand.targetSerial, identityId: srcIdn.id, device: devFromRecord(cand.targetSerial, await getDeviceRecord(cand.targetSerial)) });
  }
  if (!srcIdn && tgtIdn) {
    return claimDevice({ serial: cand.sourceSerial, identityId: tgtIdn.id, device: devFromRecord(cand.sourceSerial, await getDeviceRecord(cand.sourceSerial)) });
  }
  if (!srcIdn && !tgtIdn) {
    const created = await claimDevice({ serial: cand.sourceSerial, device: devFromRecord(cand.sourceSerial, await getDeviceRecord(cand.sourceSerial)) });
    if (!created) return null;
    return claimDevice({ serial: cand.targetSerial, identityId: created.id, device: devFromRecord(cand.targetSerial, await getDeviceRecord(cand.targetSerial)) });
  }
  return srcIdn; // already the same identity
}

/** Confirm a candidate by id AND link its devices. Used by the admin override,
 *  the auto-resolver, and the cron sweep. */
export async function confirmCandidateAndLink(id: string, resolvedBy: ResolvedBy): Promise<{ identity: Identity | null; candidate: DeviceLinkCandidate | null }> {
  const cand = await getCandidate(id);
  if (!cand) return { identity: null, candidate: null };
  // Claim the SUSPECTED→CONFIRMED transition FIRST. If we lost a race (another
  // resolve/sweep already confirmed it), short-circuit — don't merge or notify twice.
  const won = await confirmCandidate(id, resolvedBy);
  if (!won) return { identity: null, candidate: cand };
  const identity = await applyCandidateLink(cand);
  void notifyDeviceLink({
    method: resolvedBy === "admin" ? "manual" : "probabilistic",
    sourceSerial: cand.sourceSerial,
    targetSerial: cand.targetSerial,
    identityId: identity?.id ?? null,
    name: identity?.name ?? null,
    score: cand.confidenceScore,
    criteria: [resolvedBy === "auto" ? "Auto-confirmed (high confidence)" : "Confirmed", ...cand.criteria].slice(0, 8),
  });
  return { identity, candidate: cand };
}

/** Apply the auto-resolution policy to a freshly-scored SUSPECTED candidate.
 *  Returns "confirmed" if it auto-linked (so the caller can skip AI probing),
 *  "pending" if it stays for probing/admin, or null if automation is off. */
export async function autoResolveCandidate(cand: DeviceLinkCandidate | null): Promise<"confirmed" | "pending" | null> {
  if (!cand || cand.state !== "SUSPECTED") return null;
  const cfg = await getCrossDeviceAutoConfig().catch(() => null);
  if (!cfg || !cfg.enabled) return null;
  if (cand.confidenceScore >= cfg.autoConfirmScore) {
    await confirmCandidateAndLink(cand.id, "auto").catch(() => {});
    return "confirmed";
  }
  return "pending";
}

/** Cron sweep: confirm any lingering high-confidence pairs and auto-reject stale
 *  low-confidence ones, so the admin never has to babysit the queue. */
export async function sweepCandidates(): Promise<{ confirmed: number; rejected: number }> {
  const cfg = await getCrossDeviceAutoConfig().catch(() => null);
  if (!cfg || !cfg.enabled) return { confirmed: 0, rejected: 0 };
  const suspected = await listCandidates("SUSPECTED").catch(() => []);
  const staleCutoff = Date.now() - cfg.autoRejectStaleDays * 24 * 60 * 60 * 1000;
  let confirmed = 0;
  let rejected = 0;
  for (const cand of suspected) {
    if (cand.confidenceScore >= cfg.autoConfirmScore) {
      await confirmCandidateAndLink(cand.id, "auto").catch(() => {});
      confirmed++;
    } else if (cfg.autoRejectStaleDays > 0 && Date.parse(cand.createdAt) < staleCutoff) {
      await rejectCandidate(cand.id, "auto").catch(() => {});
      rejected++;
    }
  }
  return { confirmed, rejected };
}
