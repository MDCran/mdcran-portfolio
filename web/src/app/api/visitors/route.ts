import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { geolocateIp, hashIp } from "@/lib/geoip";
import { getVisitorCountsByCountry, getTotalVisitorCount, logVisitorSession } from "@/lib/db";

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
    const ip = getClientIp(req);
    if (ip === "unknown") return NextResponse.json({ ok: true });

    const geo = await geolocateIp(ip);
    if (!geo) return NextResponse.json({ ok: true });

    await logVisitorSession({ ipHash: hashIp(ip), ...geo });
    return NextResponse.json({ ok: true });
  } catch {
    // Never surface errors on the tracking endpoint
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [countries, total] = await Promise.all([
      getVisitorCountsByCountry(),
      getTotalVisitorCount(),
    ]);
    return NextResponse.json({ countries, total });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch visitor stats" },
      { status: 500 }
    );
  }
}
