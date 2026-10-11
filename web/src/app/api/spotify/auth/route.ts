import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";

// Admin-only: start the Spotify OAuth flow to (re)connect the account.
// Redirects to Spotify to authorize, then back to /api/spotify/callback where
// the new refresh token is saved to the DB.

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId || !process.env.SPOTIFY_CLIENT_SECRET) {
    return NextResponse.json({ error: "Spotify app credentials are not configured" }, { status: 503 });
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://mdcran.com").replace(/\/$/, "");
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI ?? `${siteUrl}/api/spotify/callback`;
  const scopes = ["user-read-currently-playing", "user-read-recently-played", "user-read-playback-state"].join(" ");
  const state = randomBytes(32).toString("hex");
  (await cookies()).set("spotify_oauth_state", state, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    maxAge: 600, path: "/api/spotify",
  });

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: scopes,
    state,
    show_dialog: "true",
  });

  const response = NextResponse.redirect(`https://accounts.spotify.com/authorize?${params}`);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
