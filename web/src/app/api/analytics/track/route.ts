import { NextRequest, NextResponse } from "next/server";
import { recordAnalytics, type TrackPayload } from "@/lib/analytics";

export const dynamic = "force-dynamic";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as TrackPayload;
    const { commands } = await recordAnalytics(payload, getClientIp(req), req.headers.get("user-agent"));
    return NextResponse.json({ ok: true, commands });
  } catch {
    // Tracking must never surface errors to the client.
    return NextResponse.json({ ok: true, commands: [] });
  }
}
