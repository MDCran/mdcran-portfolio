import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getSpotifyAccessToken, spotifyConfigured } from "@/lib/spotify";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let status = "not-configured";
  try {
    if (spotifyConfigured()) {
      const token = await getSpotifyAccessToken();
      if (!token) status = "reconnect-required";
      else {
        const response = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=1", {
          headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(10000),
        });
        status = response.ok ? "connected" : response.status === 401 || response.status === 403 ? "reconnect-required" : "unavailable";
      }
    }
  } catch { status = "unavailable"; }
  return NextResponse.json({ status, checkedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
