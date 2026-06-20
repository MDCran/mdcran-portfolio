import { NextRequest } from "next/server";
import { disownDevice, addIdentityDenial } from "@/lib/identity";
import { clientIp, apiRateLimit } from "@/lib/api-rate-limit";

export const dynamic = "force-dynamic";

/* POST — "Not me": detach this device from an identity. Pass deny:true to also
   record a denial so an auto-named / suggested identity won't be re-applied. */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const allowed = await apiRateLimit("disown:ip", ip, 30, 60 * 60 * 1000);
  if (!allowed) return Response.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => null) as { serial?: string; identityId?: string; deny?: boolean } | null;
  const serial = typeof body?.serial === "string" ? body.serial.slice(0, 64) : "";
  if (!serial) return Response.json({ error: "Missing serial" }, { status: 400 });
  await disownDevice(serial, body?.identityId);
  if (body?.deny && body?.identityId) await addIdentityDenial(serial, body.identityId).catch(() => {});
  return Response.json({ ok: true });
}
