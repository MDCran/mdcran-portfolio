import { NextRequest } from "next/server";
import { findIdentityBySerial, suggestionsForIp, touchDevice } from "@/lib/identity";
import { clientIp } from "@/lib/api-rate-limit";

export const dynamic = "force-dynamic";

/* POST — given a device serial, tell the client who this device belongs to (if known)
   and suggest names seen on the same IP (for shared households). No personal data beyond names. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { serial?: string } | null;
  const serial = typeof body?.serial === "string" ? body.serial : "";
  if (!serial) return Response.json({ recognized: false, suggestions: [] });

  const ip = clientIp(req);
  const identity = await findIdentityBySerial(serial);
  if (identity) {
    await touchDevice(serial, { ip });
    const suggestions = await suggestionsForIp(ip, serial);
    return Response.json({ recognized: true, identityId: identity.id, name: identity.name, suggestions });
  }
  const suggestions = await suggestionsForIp(ip, serial);
  return Response.json({ recognized: false, suggestions });
}
