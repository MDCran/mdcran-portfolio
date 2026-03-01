import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN;

const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const PLAYER_ENDPOINT = "https://api.spotify.com/v1/me/player";
const CURRENT_PLAYING_ENDPOINT =
  "https://api.spotify.com/v1/me/player/currently-playing";
const RECENTLY_PLAYED_ENDPOINT =
  "https://api.spotify.com/v1/me/player/recently-played?limit=1";

function buildTrackPayload(
  item: {
    name: string;
    artists: Array<{ name: string }>;
    album: { name: string; images: Array<{ url: string }> };
    external_urls: { spotify?: string };
    duration_ms?: number;
  },
  options?: {
    isPlaying?: boolean;
    progressMs?: number;
    playedAt?: string;
  }
) {
  return {
    isPlaying: Boolean(options?.isPlaying),
    title: item.name,
    artist: item.artists.map((a) => a.name).join(", "),
    albumName: item.album.name,
    albumArt: item.album.images[0]?.url,
    songUrl: item.external_urls.spotify,
    progressMs: options?.progressMs,
    durationMs: item.duration_ms,
    playedAt: options?.playedAt,
  };
}

async function saveLastSpotifyTrack(
  payload: ReturnType<typeof buildTrackPayload>
) {
  try {
    const db = await getDb();
    await db.collection("settings").updateOne(
      { key: "spotify_last_track" },
      {
        $set: {
          key: "spotify_last_track",
          value: JSON.stringify({
            ...payload,
            isPlaying: false,
            playedAt: payload.playedAt ?? new Date().toISOString(),
          }),
        },
      },
      { upsert: true }
    );
  } catch {
    // Ignore persistence failures so the widget can still function.
  }
}

async function getSavedLastSpotifyTrack() {
  try {
    const db = await getDb();
    const doc = await db
      .collection("settings")
      .findOne<{ key: string; value?: string }>({ key: "spotify_last_track" });

    if (!doc?.value) return null;

    const parsed = JSON.parse(doc.value) as ReturnType<typeof buildTrackPayload>;
    if (!parsed?.title) return null;

    return {
      ...parsed,
      isPlaying: false,
    };
  } catch {
    return null;
  }
}

async function getAccessToken() {
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) return null;
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: REFRESH_TOKEN,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token as string;
}

export async function GET() {
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    return NextResponse.json(
      { isPlaying: false, error: "Spotify not configured" },
      { status: 200 }
    );
  }

  try {
    const token = await getAccessToken();
    if (!token) return NextResponse.json({ isPlaying: false });

    // First try the full player state. This still returns the active track when paused.
    const player = await fetch(PLAYER_ENDPOINT, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (player.status === 200) {
      const data = await player.json();
      if (data?.item) {
        const payload = buildTrackPayload(data.item, {
          isPlaying: data.is_playing,
          progressMs: data.progress_ms,
        });
        await saveLastSpotifyTrack(payload);
        return NextResponse.json(payload);
      }
    }

    // Fallback to currently playing.
    const res = await fetch(CURRENT_PLAYING_ENDPOINT, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 200) {
      const data = await res.json();
      if (data?.item) {
        const payload = buildTrackPayload(data.item, {
          isPlaying: data.is_playing,
          progressMs: data.progress_ms,
        });
        await saveLastSpotifyTrack(payload);
        return NextResponse.json(payload);
      }
    }

    const savedTrack = await getSavedLastSpotifyTrack();
    if (savedTrack) {
      return NextResponse.json(savedTrack);
    }

    // Fallback to recently played
    const recent = await fetch(RECENTLY_PLAYED_ENDPOINT, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (recent.ok) {
      const data = await recent.json();
      const recentItem = data?.items?.[0];
      const track = recentItem?.track;
      if (track) {
        const payload = buildTrackPayload(track, {
          isPlaying: false,
          playedAt: recentItem?.played_at,
        });
        await saveLastSpotifyTrack(payload);
        return NextResponse.json(payload);
      }
    }

    return NextResponse.json({ isPlaying: false });
  } catch {
    return NextResponse.json({ isPlaying: false, error: "Spotify API error" });
  }
}
