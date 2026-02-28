import { NextResponse } from "next/server";

// Visit this route in your browser to start the Spotify OAuth flow.
// You will be redirected to Spotify to authorize, then sent back to
// /api/spotify/callback where your refresh token will be displayed.

export async function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "SPOTIFY_CLIENT_ID not set" }, { status: 500 });
  }

  const redirectUri = "https://mdcran.com/api/spotify/callback";
  const scopes = ["user-read-currently-playing", "user-read-recently-played"].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: scopes,
  });

  return NextResponse.redirect(`https://accounts.spotify.com/authorize?${params}`);
}
