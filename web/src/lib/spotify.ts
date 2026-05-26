import { getDb } from "@/lib/mongodb";

const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const REFRESH_TOKEN_KEY = "spotify_refresh_token";

/**
 * Source of truth for the Spotify refresh token: the DB (set by the admin
 * "Reconnect Spotify" flow) takes precedence over the build-time env var, so the
 * token can be rotated without a redeploy. Falls back to SPOTIFY_REFRESH_TOKEN.
 */
export async function getSpotifyRefreshToken(): Promise<string | null> {
  try {
    const db = await getDb();
    const doc = await db.collection("settings").findOne<{ key: string; value?: string }>({ key: REFRESH_TOKEN_KEY });
    if (doc?.value && typeof doc.value === "string" && doc.value.trim()) return doc.value.trim();
  } catch { /* DB unavailable — fall through to env */ }
  return process.env.SPOTIFY_REFRESH_TOKEN || null;
}

/** Persist a freshly minted refresh token (from the OAuth reconnect flow). */
export async function setSpotifyRefreshToken(token: string): Promise<void> {
  const db = await getDb();
  await db.collection("settings").updateOne(
    { key: REFRESH_TOKEN_KEY },
    { $set: { key: REFRESH_TOKEN_KEY, value: token, updatedAt: new Date().toISOString() } },
    { upsert: true },
  );
}

export function spotifyConfigured(): boolean {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

/** Exchange the (DB-first) refresh token for a short-lived access token. */
export async function getSpotifyAccessToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = await getSpotifyRefreshToken();
  if (!clientId || !clientSecret || !refreshToken) return null;

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  // Spotify may return a rotated refresh token — persist it so we don't go stale.
  if (typeof data.refresh_token === "string" && data.refresh_token.trim()) {
    try { await setSpotifyRefreshToken(data.refresh_token.trim()); } catch { /* */ }
  }
  return (data.access_token as string) || null;
}
