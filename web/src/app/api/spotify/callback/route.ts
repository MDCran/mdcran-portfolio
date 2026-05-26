import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { setSpotifyRefreshToken } from "@/lib/spotify";

// Spotify redirects here after authorization.
// This exchanges the code for tokens and persists the refresh token to the DB
// (so reconnecting never requires editing env vars / redeploying).

export async function GET(req: NextRequest) {
  // Only the admin can complete a reconnect (the auth route is admin-gated too).
  if (!(await isAdminAuthenticated())) {
    return new NextResponse(
      `<html><body style="background:#0a0a0a;color:#ef4242;font-family:monospace;padding:40px"><h2>Unauthorized</h2><p>Sign in to the admin center first.</p></body></html>`,
      { status: 401, headers: { "Content-Type": "text/html" } }
    );
  }
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
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://mdcran.com").replace(/\/$/, "");
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI ?? `${siteUrl}/api/spotify/callback`;

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

  // Persist the new refresh token to the DB — used DB-first by the Spotify routes.
  let saved = false;
  try { await setSpotifyRefreshToken(data.refresh_token); saved = true; } catch { /* */ }

  const siteHome = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://mdcran.com").replace(/\/$/, "");
  return new NextResponse(
    `<html><body style="background:#0a0a0a;color:#f2f2f2;font-family:'Courier New',monospace;padding:40px;max-width:700px">
      <div style="border-left:3px solid #ef4242;padding-left:20px;margin-bottom:30px">
        <h1 style="color:#fff;letter-spacing:0.1em">SPOTIFY ${saved ? "RECONNECTED" : "CONNECTED"}</h1>
        <p style="color:#ef4242;font-size:12px;letter-spacing:0.2em;text-transform:uppercase">MDCran Setup</p>
      </div>
      ${saved
        ? `<p style="color:#4ade80;font-size:14px">Your Spotify connection has been refreshed and saved. Now Playing should work again within a few seconds — no env changes or redeploy needed.</p>
           <p style="color:#666;font-size:12px;margin-top:20px"><a href="${siteHome}" style="color:#ef4242">← Back to MDCran.com</a></p>`
        : `<p style="color:#f59e0b;font-size:13px">Couldn't write to the database. As a fallback, set this in your env and redeploy:</p>
           <pre style="background:#111;border:1px solid #333;padding:16px;border-radius:4px;color:#4ade80;word-break:break-all;font-size:13px">SPOTIFY_REFRESH_TOKEN=${data.refresh_token}</pre>`}
    </body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
