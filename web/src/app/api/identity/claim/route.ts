import { NextRequest } from "next/server";
import { claimDevice } from "@/lib/identity";
import { clientIp } from "@/lib/api-rate-limit";
import { parseUserAgent } from "@/lib/ua";
import { notifyIdentityEvent } from "@/lib/discord";
import { sanitizeName, sanitizeId, sanitizeText, isValidSerial, isInappropriate } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

/* POST — attach this device to an existing identity (identityId, e.g. picking a suggestion
   or visiting an ?identity= link) or create a new one (name).
   Optional: origin = "user" | "ai", aiContext = conversation excerpt when AI extracted the name. */
export async function POST(req: NextRequest) {
  // Accept as unknown — we validate every field manually to prevent NoSQL operator injection.
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;

  const serial = typeof body?.serial === "string" ? body.serial : "";
  if (!serial || !isValidSerial(serial)) return Response.json({ error: "Missing serial" }, { status: 400 });

  // sanitizeId rejects non-string and operator-like values (e.g. { $gt: "" })
  const identityId = sanitizeId(body?.identityId);
  const name = sanitizeName(body?.name);
  const aiContext = sanitizeText(body?.aiContext, 500);

  if (!identityId && !name) return Response.json({ error: "Need a name or identity" }, { status: 400 });

  if (name && isInappropriate(name)) {
    return Response.json({ error: "That name isn't allowed — please use your real name." }, { status: 400 });
  }

  const ip = clientIp(req);
  const rawUa = typeof body?.userAgent === "string" ? body.userAgent : "";
  const ua = rawUa || req.headers.get("user-agent") || "";
  const { browser, os, device } = parseUserAgent(ua);

  // Ensure device telemetry fields are plain strings — never pass raw body objects to MongoDB.
  const gpu      = typeof body?.gpu      === "string" ? body.gpu.slice(0, 256)  : undefined;
  const screen   = typeof body?.screen   === "string" ? body.screen.slice(0, 64)   : undefined;
  const timezone = typeof body?.timezone === "string" ? body.timezone.slice(0, 64) : undefined;
  const language = typeof body?.language === "string" ? body.language.slice(0, 32) : undefined;

  const identity = await claimDevice({
    serial,
    identityId,
    name: name || undefined,
    device: { serial, ip, browser, os, device, gpu, screen, timezone, language, userAgent: ua },
  });
  if (!identity) return Response.json({ error: "Unknown identity" }, { status: 404 });

  void notifyIdentityEvent({
    id: identity.id,
    name: identity.name,
    deviceCount: identity.devices.length,
    origin: body?.origin === "ai" ? "ai" : "user",
    createdAt: identity.createdAt,
    isNew: !identityId,
    aiContext: aiContext || null,
  });

  return Response.json({ identityId: identity.id, name: identity.name });
}
