import { NextRequest, NextResponse } from "next/server";

// Spotify redirects here after authorization.
// This exchanges the code for tokens and displays your refresh token.

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return new NextResponse(
      `<html><body style="background:#0a0a0a;color:#ef4242;font-family:monospace;padding:40px">
        <h2>Spotify Auth Error</h2><p>${error}</p>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  if (!code) {
    return new NextResponse(
      `<html><body style="background:#0a0a0a;color:#ef4242;font-family:monospace;padding:40px">
        <h2>No code received</h2>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const redirectUri = "http://localhost:3000/api/spotify/callback";

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  const data = await res.json();

  if (!res.ok || !data.refresh_token) {
    return new NextResponse(
      `<html><body style="background:#0a0a0a;color:#ef4242;font-family:monospace;padding:40px">
        <h2>Token exchange failed</h2>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  return new NextResponse(
    `<html><body style="background:#0a0a0a;color:#f2f2f2;font-family:'Courier New',monospace;padding:40px;max-width:700px">
      <div style="border-left:3px solid #ef4242;padding-left:20px;margin-bottom:30px">
        <h1 style="color:#fff;letter-spacing:0.1em">SPOTIFY CONNECTED</h1>
        <p style="color:#ef4242;font-size:12px;letter-spacing:0.2em;text-transform:uppercase">MDCran Setup</p>
      </div>
      <p style="color:#aaa;margin-bottom:8px;font-size:13px">Copy this value into your <code style="color:#ef4242">.env.local</code> file:</p>
      <pre style="background:#111;border:1px solid #333;padding:16px;border-radius:4px;color:#4ade80;word-break:break-all;font-size:13px">SPOTIFY_REFRESH_TOKEN=${data.refresh_token}</pre>
      <p style="color:#666;font-size:12px;margin-top:20px">After adding this to .env.local, restart your dev server. You can delete the <code>/api/spotify/auth</code> and <code>/api/spotify/callback</code> routes afterwards.</p>
      <p style="color:#666;font-size:12px;">Access token (temporary, not needed): <span style="color:#555">${data.access_token?.slice(0, 20)}...</span></p>
    </body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
