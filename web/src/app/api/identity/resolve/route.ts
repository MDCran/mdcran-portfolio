import { NextRequest } from "next/server";
import { findIdentityBySerial, suggestionsForIp, touchDevice, getDeniedIdentityIds, ensureAnonymousIdentity, claimDevice } from "@/lib/identity";
import { clientIp, limitVoiceLike } from "@/lib/api-rate-limit";
import { upsertDeviceRegistry, evaluateDeviceLinks } from "@/lib/cross-device";
import { autoResolveCandidate, getLayeredSuggestions, AUTO_NAME_CERTAINTY } from "@/lib/cross-device-link";
import { parseUserAgent } from "@/lib/ua";
import { geolocateIp } from "@/lib/geoip";
import { notifyReturningVisitor } from "@/lib/discord";
import type { SessionLinkCandidate } from "@/lib/types";

export const dynamic = "force-dynamic";

/** A named identity counts as "returning" (vs. still browsing) after this gap
 *  since its device was last seen — gates the Discord alert to once per visit. */
const RETURN_GAP_MS = 30 * 60 * 1000;

interface ResolveBody {
  serial?: string;
  gpu?: string;
  screen?: string;
  timezone?: string;
  language?: string;
  colorScheme?: "dark" | "light";
  userAgent?: string;
  currentPath?: string;
  sourceLabel?: string; // resolved traffic-source label (for the anon auto-name)
}

/** Auto-label for an anonymous identity, e.g. "Anonymous · LinkedIn · Orlando". */
function anonLabel(sourceLabel?: string | null, city?: string | null): string {
  const parts = ["Anonymous"];
  if (sourceLabel && sourceLabel.trim() && sourceLabel.toLowerCase() !== "direct") parts.push(sourceLabel.trim());
  if (city && city.trim()) parts.push(city.trim());
  return parts.join(" · ").slice(0, 60);
}

/* POST — resolve who a device belongs to. EVERY visitor is tied to an identity: a
   recognized NAMED identity returns state 'confirmed'; otherwise we ensure a
   persistent ANONYMOUS identity exists (so messages/sessions/bookings/etc. tie to
   it) but report state 'anonymous'/'suggested' and never expose the auto-label as a
   real name to the AI. Also feeds the cross-device registry + probabilistic scorer. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as ResolveBody | null;
  const serial = typeof body?.serial === "string" ? body.serial.slice(0, 64) : "";
  if (!serial) return Response.json({ state: "anonymous", recognized: false, suggestions: [] });

  if (!(await limitVoiceLike(req, "identity-resolve", 150))) {
    return Response.json({ state: "anonymous", recognized: false, suggestions: [] }, { status: 429 });
  }

  const ip = clientIp(req);
  const ua = (typeof body?.userAgent === "string" ? body.userAgent : "") || req.headers.get("user-agent") || "";
  const landingPath = typeof body?.currentPath === "string" ? body.currentPath.split(/[?#]/)[0].slice(0, 256) : null;
  const { browser, os, device } = parseUserAgent(ua);

  // Ensure telemetry fields are plain strings — reject objects that could carry MongoDB operators.
  const gpu         = typeof body?.gpu         === "string" ? body.gpu.slice(0, 256)        : undefined;
  const screen      = typeof body?.screen      === "string" ? body.screen.slice(0, 64)      : undefined;
  const timezone    = typeof body?.timezone    === "string" ? body.timezone.slice(0, 64)    : undefined;
  const language    = typeof body?.language    === "string" ? body.language.slice(0, 32)    : undefined;
  const sourceLabel = typeof body?.sourceLabel === "string" ? body.sourceLabel.slice(0, 100): undefined;
  const colorScheme = body?.colorScheme === "dark" || body?.colorScheme === "light" ? body.colorScheme : undefined;

  const deviceInput = { serial, ip, browser, os, device, gpu, screen, timezone, language, userAgent: ua };

  const [found, deniedIds] = await Promise.all([findIdentityBySerial(serial), getDeniedIdentityIds(serial)]);
  let identity = found;

  // Keep the device telemetry registry current (powers cross-device scoring).
  await upsertDeviceRegistry({
    serial, ip, userAgent: ua,
    gpu: gpu ?? null, screen: screen ?? null, timezone: timezone ?? null,
    language: language ?? null, colorScheme: colorScheme ?? null,
    identityId: identity?.id ?? undefined,
  }).catch(() => {});

  // Recognized NAMED identity → confirmed.
  if (identity && !identity.anonymous) {
    // Detect a genuine RETURN (not just another page load in an active session):
    // fire a Discord alert only when this device hasn't been seen for a while.
    // Read lastSeen BEFORE touchDevice overwrites it.
    const dev = identity.devices.find((d) => d.serial === serial);
    const awayMs = dev?.lastSeen ? Date.now() - new Date(dev.lastSeen).getTime() : 0;
    await touchDevice(serial, { ip });
    if (awayMs >= RETURN_GAP_MS) {
      void notifyReturningVisitor({
        id: identity.id,
        name: identity.name,
        deviceCount: identity.devices.length,
        awayMs,
        ip,
        browser, os, device,
        currentPath: landingPath,
        source: sourceLabel ?? null,
      });
    }
    const suggestions = await suggestionsForIp(ip, serial);
    return Response.json({
      state: "confirmed",
      recognized: true,
      identityId: identity.id,
      name: identity.name,
      suggestions: suggestions.filter((s) => !deniedIds.includes(s.id)),
      deniedIds,
    });
  }

  // Anonymous (or brand-new) device → ensure a persistent anonymous identity so
  // everything still ties to one, but DON'T treat the auto-label as a real name.
  if (identity) {
    await touchDevice(serial, { ip });
  } else {
    const geo = ip && ip !== "unknown" ? await geolocateIp(ip).catch(() => null) : null;
    identity = await ensureAnonymousIdentity({ serial, device: deviceInput, label: anonLabel(sourceLabel, geo?.city) }).catch(() => null);
  }

  // Name suggestions across 3 tiers: current IP → past shared network (30d) →
  // probabilistic pairing. This is what keeps a phone guessing the name even
  // after it leaves the WiFi it was first seen on (now on cellular, different IP).
  const layered = await getLayeredSuggestions(serial, ip, deniedIds, identity?.id).catch(() => []);

  // Probabilistic cross-device evaluation. High-confidence pairs auto-link right
  // here (no admin/AI action needed); only the uncertain ones are handed to the
  // AI to gently probe.
  let linkCandidate: SessionLinkCandidate | undefined;
  try {
    const cand = await evaluateDeviceLinks(serial, { landingPath });
    if (cand) {
      const auto = await autoResolveCandidate(cand).catch(() => null);
      if (auto !== "confirmed") {
        const otherSerial = cand.sourceSerial === serial ? cand.targetSerial : cand.sourceSerial;
        linkCandidate = {
          otherSerial,
          otherName: null, // never disclose another visitor's name to an unverified device
          score: cand.confidenceScore,
          sharedPath: cand.sharedPath ?? null,
          criteria: cand.criteria,
        };
      }
    }
  } catch { /* non-fatal */ }

  // HIGH CONFIDENCE → set the name automatically (a clearly-dominant top match,
  // e.g. the only named identity on this exact network). Persisted, but fully
  // reversible: "Not me / change this" in accessibility records a denial so it
  // won't be re-applied. Lower-confidence matches are only SUGGESTED.
  const top = layered[0];
  const runner = layered[1];
  if (top && top.certainty >= AUTO_NAME_CERTAINTY && (!runner || runner.certainty < 0.65)) {
    const claimed = await claimDevice({ serial, identityId: top.id, device: { ...deviceInput, linkMethod: "ip", linkConfidence: top.certainty } }).catch(() => null);
    if (claimed) {
      return Response.json({
        state: "confirmed",
        recognized: true,
        autoNamed: true,        // a best guess the visitor can correct, not a self-confirmed name
        identityId: claimed.id,
        name: claimed.name,
        suggestions: layered,
        deniedIds,
      });
    }
  }

  return Response.json({
    state: layered.length > 0 ? "suggested" : "anonymous",
    recognized: false,
    identityId: identity?.id, // the anonymous identity (for tying), NOT a confirmed name
    suggestions: layered,
    deniedIds,
    linkCandidate,
  });
}
