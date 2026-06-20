import { NextRequest } from "next/server";
import { findIdentityBySerial, findIdentityById, touchDevice, claimDevice } from "@/lib/identity";
import { clientIp, apiRateLimit } from "@/lib/api-rate-limit";
import { parseUserAgent } from "@/lib/ua";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as
    | { token?: { id?: string; name?: string; source?: string; company?: string }; serial?: string }
    | null;

  const serial = typeof body?.serial === "string" ? body.serial.trim().slice(0, 64) : "";
  const token = body?.token;

  if (!serial && !token?.id) {
    return Response.json({ ok: false, error: "Missing serial or token" }, { status: 400 });
  }

  const ip = clientIp(req);

  // 20 syncs per IP per hour — prevents UUID enumeration attacks
  const allowed = await apiRateLimit("identity-sync:ip", ip, 20, 60 * 60 * 1000);
  if (!allowed) {
    return Response.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }
  const ua = req.headers.get("user-agent") || "";
  const { browser, os, device } = parseUserAgent(ua);

  // 1. Look up by device serial first (most reliable)
  if (serial) {
    const bySerial = await findIdentityBySerial(serial);
    if (bySerial) {
      await touchDevice(serial, { ip });
      return Response.json({
        ok: true,
        identity: { id: bySerial.id, name: bySerial.name },
      });
    }
  }

  // 2. Look up by stored identity id — only accept valid UUIDs to prevent enumeration
  const tokenId = token?.id?.trim();
  if (tokenId && UUID_RE.test(tokenId)) {
    const byId = await findIdentityById(tokenId);
    if (byId) {
      if (serial) {
        await claimDevice({
          serial,
          identityId: byId.id,
          device: { serial, ip, browser, os, device, userAgent: ua },
        });
      }
      return Response.json({
        ok: true,
        identity: { id: byId.id, name: byId.name },
      });
    }
  }

  // 3. Create a new identity from the token data (token.id may not be a UUID — that's ok)
  if (serial) {
    const name = (token?.name?.trim() || "Guest").slice(0, 60);
    const created = await claimDevice({
      serial,
      name,
      device: { serial, ip, browser, os, device, userAgent: ua },
    });
    return Response.json({
      ok: true,
      identity: created
        ? { id: created.id, name: created.name }
        : { id: serial, name },
    });
  }

  return Response.json({ ok: false, error: "Could not resolve identity" }, { status: 404 });
}
