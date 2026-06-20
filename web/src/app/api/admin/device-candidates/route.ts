import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { listCandidates, rejectCandidate } from "@/lib/cross-device";
import { confirmCandidateAndLink } from "@/lib/cross-device-link";
import { getCrossDeviceAutoConfig, saveCrossDeviceAutoConfig } from "@/lib/db";
import type { DeviceLinkState } from "@/lib/types";

export const dynamic = "force-dynamic";

/* GET — list device-link candidates (default SUSPECTED) + the auto-resolution policy. */
export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const stateParam = req.nextUrl.searchParams.get("state");
  const state = (["SUSPECTED", "CONFIRMED", "REJECTED"] as const).includes(stateParam as DeviceLinkState)
    ? (stateParam as DeviceLinkState)
    : "SUSPECTED";
  const [candidates, autoConfig] = await Promise.all([listCandidates(state), getCrossDeviceAutoConfig()]);
  return NextResponse.json({ candidates, autoConfig });
}

/* POST — confirm (link), reject, or update the auto-resolution policy. All are
   manual OVERRIDES of the automation; the automation runs on its own otherwise. */
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as
    | { action?: string; id?: string; enabled?: boolean; autoConfirmScore?: number; autoRejectStaleDays?: number }
    | null;
  if (!body?.action) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  if (body.action === "set-config") {
    const autoConfig = await saveCrossDeviceAutoConfig({
      enabled: body.enabled,
      autoConfirmScore: body.autoConfirmScore,
      autoRejectStaleDays: body.autoRejectStaleDays,
    });
    return NextResponse.json({ ok: true, autoConfig });
  }

  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  if (body.action === "reject") {
    await rejectCandidate(body.id, "admin");
    return NextResponse.json({ ok: true, action: "rejected" });
  }

  if (body.action === "confirm") {
    const { identity, candidate } = await confirmCandidateAndLink(body.id, "admin");
    if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, action: "confirmed", identity: identity ? { id: identity.id, name: identity.name } : null });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
