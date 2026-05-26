import { NextRequest } from "next/server";
import { disownDevice } from "@/lib/identity";

export const dynamic = "force-dynamic";

/* POST — "Not me": detach this device from an identity. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { serial?: string; identityId?: string } | null;
  const serial = typeof body?.serial === "string" ? body.serial : "";
  if (!serial) return Response.json({ error: "Missing serial" }, { status: 400 });
  await disownDevice(serial, body?.identityId);
  return Response.json({ ok: true });
}
