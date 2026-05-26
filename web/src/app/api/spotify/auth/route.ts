import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";

// Admin-only: start the Spotify OAuth flow to (re)connect the account.
// Redirects to Spotify to authorize, then back to /api/spotify/callback where
// the new refresh token is saved to the DB.

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "SPOTIFY_CLIENT_ID not set" }, { status: 500 });
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://mdcran.com").replace(/\/$/, "");
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI ?? `${siteUrl}/api/spotify/callback`;
  const scopes = ["user-read-currently-playing", "user-read-recently-played"].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: scopes,
  });

  return NextResponse.redirect(`https://accounts.spotify.com/authorize?${params}`);
}
