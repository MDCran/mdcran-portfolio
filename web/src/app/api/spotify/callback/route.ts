import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isAdminAuthenticated } from "@/lib/auth";
import { setSpotifyRefreshToken } from "@/lib/spotify";

function result(req: NextRequest, status: string) {
  const url = new URL("/admin/dashboard", req.url);
  url.searchParams.set("spotify", status);
  const response = NextResponse.redirect(url);
  response.cookies.set("spotify_oauth_state", "", { maxAge: 0, path: "/api/spotify" });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const state = req.nextUrl.searchParams.get("state");
  const expected = (await cookies()).get("spotify_oauth_state")?.value;
  if (!state || !expected || state !== expected) return result(req, "invalid-state");
  if (req.nextUrl.searchParams.has("error")) return result(req, "cancelled");
  const code = req.nextUrl.searchParams.get("code");
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!code || !clientId || !clientSecret) return result(req, "failed");
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://mdcran.com").replace(/\/$/, "");
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI ?? `${siteUrl}/api/spotify/callback`;
  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
    });
    const data = await response.json();
    if (!response.ok || typeof data.refresh_token !== "string" || !data.refresh_token.trim()) return result(req, "failed");
    await setSpotifyRefreshToken(data.refresh_token);
    return result(req, "connected");
  } catch {
    // Credentials and provider responses must never be rendered in the browser.
    return result(req, "failed");
  }
}
