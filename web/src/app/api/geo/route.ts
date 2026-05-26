import { NextRequest, NextResponse } from "next/server";
import { geolocateIp } from "@/lib/geoip";

export const dynamic = "force-dynamic";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

/** Public: returns the caller's approximate country (for the locale lock in the a11y menu). */
export async function GET(req: NextRequest) {
  try {
    const geo = await geolocateIp(getClientIp(req)).catch(() => null);
    return NextResponse.json({ country: geo?.country ?? "US", countryName: geo?.countryName ?? "United States" });
  } catch {
    return NextResponse.json({ country: "US", countryName: "United States" });
  }
}
