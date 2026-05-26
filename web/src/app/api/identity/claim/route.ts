import { NextRequest } from "next/server";
import { claimDevice } from "@/lib/identity";
import { clientIp } from "@/lib/api-rate-limit";
import { parseUserAgent } from "@/lib/ua";

export const dynamic = "force-dynamic";

/* POST — attach this device to an existing identity (identityId, e.g. picking a suggestion
   or visiting an ?identity= link) or create a new one (name). */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as
    | { serial?: string; identityId?: string; name?: string; gpu?: string; screen?: string; timezone?: string; language?: string; userAgent?: string }
    | null;
  const serial = typeof body?.serial === "string" ? body.serial : "";
  if (!serial) return Response.json({ error: "Missing serial" }, { status: 400 });
  if (!body?.identityId && !body?.name?.trim()) return Response.json({ error: "Need a name or identity" }, { status: 400 });

  const ip = clientIp(req);
  const ua = body.userAgent || req.headers.get("user-agent") || "";
  const { browser, os, device } = parseUserAgent(ua);

  const identity = await claimDevice({
    serial,
    identityId: body.identityId,
    name: body.name,
    device: {
      serial, ip, browser, os, device,
      gpu: body.gpu, screen: body.screen, timezone: body.timezone, language: body.language, userAgent: ua,
    },
  });
  if (!identity) return Response.json({ error: "Unknown identity" }, { status: 404 });
  return Response.json({ identityId: identity.id, name: identity.name });
}
