import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/mongodb";
import { apiRateLimit, clientIp } from "@/lib/api-rate-limit";
import { getSpotifyAccessToken, spotifyConfigured } from "@/lib/spotify";
import type { SpotifyHistoryTrack, SpotifyTrack } from "@/lib/types";

const PLAYER_ENDPOINT = "https://api.spotify.com/v1/me/player";
const CURRENT_PLAYING_ENDPOINT =
  "https://api.spotify.com/v1/me/player/currently-playing";
const RECENTLY_PLAYED_ENDPOINT =
  "https://api.spotify.com/v1/me/player/recently-played?limit=1";
const LAST_TRACK_KEY = "spotify_last_track";
const HISTORY_KEY = "spotify_track_history";
const HISTORY_LIMIT = 13;

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
      { key: LAST_TRACK_KEY },
      {
        $set: {
          key: LAST_TRACK_KEY,
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

async function saveSpotifyTrackHistory(
  payload: ReturnType<typeof buildTrackPayload>
) {
  if (!payload.songUrl || !payload.title || payload.isPlaying) return;

  try {
    const db = await getDb();
    const nowIso = payload.playedAt ?? new Date().toISOString();
    const nextEntry: SpotifyHistoryTrack = {
      ...payload,
      isPlaying: false,
      playedAt: nowIso,
    };

    const doc = await db
      .collection("settings")
      .findOne<{ key: string; value?: string }>({ key: HISTORY_KEY });

    const existing = doc?.value
      ? ((JSON.parse(doc.value) as SpotifyHistoryTrack[]).filter(Boolean))
      : [];

    const nextHistory =
      existing[0]?.songUrl === nextEntry.songUrl
        ? [nextEntry, ...existing.slice(1)]
        : [
            nextEntry,
            ...existing.filter((entry) => entry?.songUrl !== nextEntry.songUrl),
          ].slice(0, HISTORY_LIMIT);

    await db.collection("settings").updateOne(
      { key: HISTORY_KEY },
      {
        $set: {
          key: HISTORY_KEY,
          value: JSON.stringify(nextHistory.slice(0, HISTORY_LIMIT)),
        },
      },
      { upsert: true }
    );
  } catch {
    // Ignore persistence failures so the widget can still function.
  }
}

function isSameSpotifyTrack(
  a?: Pick<ReturnType<typeof buildTrackPayload>, "songUrl" | "title" | "artist"> | null,
  b?: Pick<ReturnType<typeof buildTrackPayload>, "songUrl" | "title" | "artist"> | null
) {
  if (!a?.songUrl || !b?.songUrl) return false;
  return a.songUrl === b.songUrl && a.title === b.title && a.artist === b.artist;
}

async function getSavedLastSpotifyTrack() {
  try {
    const db = await getDb();
    const doc = await db
      .collection("settings")
      .findOne<{ key: string; value?: string }>({ key: LAST_TRACK_KEY });

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

async function syncCurrentSpotifyTrack(
  payload: ReturnType<typeof buildTrackPayload>
) {
  const previousTrack = await getSavedLastSpotifyTrack();

  if (previousTrack && !isSameSpotifyTrack(previousTrack, payload)) {
    await saveSpotifyTrackHistory({
      ...previousTrack,
      isPlaying: false,
      playedAt: previousTrack.playedAt ?? new Date().toISOString(),
    });
  }

  await saveLastSpotifyTrack(payload);
}

async function getSpotifyTrackHistory() {
  try {
    const db = await getDb();
    const doc = await db
      .collection("settings")
      .findOne<{ key: string; value?: string }>({ key: HISTORY_KEY });

    if (!doc?.value) return [];

    const parsed = JSON.parse(doc.value) as SpotifyHistoryTrack[];
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((entry) => entry?.songUrl && entry?.title).slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

async function attachHistory(
  payload: ReturnType<typeof buildTrackPayload> | { isPlaying: false; error?: string }
) {
  const history = await getSpotifyTrackHistory();
  return {
    ...payload,
    history,
  } satisfies SpotifyTrack;
}

export async function GET(req: NextRequest) {
  // Cost/abuse guard so the Spotify API isn't hammered (the widget polls).
  if (!(await apiRateLimit("spotify:ip", clientIp(req), 240, 60 * 60 * 1000))) {
    return NextResponse.json({ isPlaying: false, error: "Rate limited" }, { status: 429 });
  }
  if (!spotifyConfigured()) {
    return NextResponse.json(
      await attachHistory({ isPlaying: false, error: "Spotify not configured" }),
      { status: 200 }
    );
  }

  try {
    // Token comes DB-first (admin reconnect) then env — see @/lib/spotify.
    const token = await getSpotifyAccessToken();
    if (!token) return NextResponse.json(await attachHistory({ isPlaying: false }));

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
        await syncCurrentSpotifyTrack(payload);
        return NextResponse.json(await attachHistory(payload));
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
        await syncCurrentSpotifyTrack(payload);
        return NextResponse.json(await attachHistory(payload));
      }
    }

    const savedTrack = await getSavedLastSpotifyTrack();
    if (savedTrack) {
      return NextResponse.json(await attachHistory(savedTrack));
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
        await syncCurrentSpotifyTrack(payload);
        await saveSpotifyTrackHistory(payload);
        return NextResponse.json(await attachHistory(payload));
      }
    }

    return NextResponse.json(await attachHistory({ isPlaying: false }));
  } catch {
    return NextResponse.json(
      await attachHistory({ isPlaying: false, error: "Spotify API error" })
    );
  }
}
