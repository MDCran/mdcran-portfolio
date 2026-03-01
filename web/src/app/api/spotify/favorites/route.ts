import { NextResponse } from "next/server";

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN;
const TRACKS_ENDPOINT = "https://api.spotify.com/v1/tracks";
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";

type FavoriteSeed = {
  title: string;
  items: Array<{
    url: string;
    fallbackTitle: string;
    fallbackArtist: string;
    accentColor: string;
  }>;
};

const FAVORITE_SECTIONS: FavoriteSeed[] = [
  {
    title: "My All Time 5",
    items: [
      {
        url: "https://open.spotify.com/track/1Cwsd5xI8CajJz795oy4XF?si=3e3ede20e712424f",
        fallbackTitle: "You Get What You Give",
        fallbackArtist: "New Radicals",
        accentColor: "#f2c230",
      },
      {
        url: "https://open.spotify.com/track/5LxvwujISqiB8vpRYv887S?si=54ed6f2c48994aaa",
        fallbackTitle: "I Want You Back",
        fallbackArtist: "The Jackson 5",
        accentColor: "#f39b2f",
      },
      {
        url: "https://open.spotify.com/track/0Gl5s8IhMmQE5YQwM8Qx1J?si=72bf1d20c7fe4494",
        fallbackTitle: "Never Enough",
        fallbackArtist: "Loren Allred",
        accentColor: "#3568d4",
      },
      {
        url: "https://open.spotify.com/track/3IkWmgGsXbsafrunwPojXO?si=e5ccacc9e57e4b29",
        fallbackTitle: "From Now On",
        fallbackArtist: "Hugh Jackman, The Greatest Showman Ensemble",
        accentColor: "#2859c7",
      },
      {
        url: "https://open.spotify.com/track/2Fs18NaCDuluPG1DHGw1XG?si=efc136b9bdc949c6",
        fallbackTitle: "Life is a Highway",
        fallbackArtist: "Rascal Flatts",
        accentColor: "#2db7d6",
      },
    ],
  },
  {
    title: "My Current Top 5",
    items: [
      {
        url: "https://open.spotify.com/track/05od2qm2MTSKCHxy1GBp5W?si=e6e23b2736d442a7",
        fallbackTitle: "12 to 12",
        fallbackArtist: "sombr",
        accentColor: "#d94149",
      },
      {
        url: "https://open.spotify.com/track/3354J49VpkbZJho7Ztdzpw?si=eb88d1e69c4646a3",
        fallbackTitle: "Jumper - 1998 Edit",
        fallbackArtist: "Third Eye Blind",
        accentColor: "#d11212",
      },
      {
        url: "https://open.spotify.com/track/7gA5OQWsvAY7HhazroFuwI?si=14e2d06d34544563",
        fallbackTitle: "Save Me, San Francisco",
        fallbackArtist: "Train",
        accentColor: "#9db8be",
      },
      {
        url: "https://open.spotify.com/track/1qedGorESZYaq4FhCXZ91M?si=e4de9c83f6824fc7",
        fallbackTitle: "Normal",
        fallbackArtist: "The Wrecks",
        accentColor: "#d56a34",
      },
      {
        url: "https://open.spotify.com/track/6ECp64rv50XVz93WvxXMGF?si=48c18b0ff53f40cc",
        fallbackTitle: "This Love",
        fallbackArtist: "Maroon 5",
        accentColor: "#cf5348",
      },
    ],
  },
  {
    title: "Oldies of Goldies Top 5",
    items: [
      {
        url: "https://open.spotify.com/track/1t0oCQTyPoC1ZexQSnJ5Zj?si=923da39092de4903",
        fallbackTitle: "Somebody's Out There",
        fallbackArtist: "Triumph",
        accentColor: "#d72432",
      },
      {
        url: "https://open.spotify.com/track/7MdenVOyOCRoxbgPpjEiAL?si=e790681e49714d18",
        fallbackTitle: "They Don't Care About Us",
        fallbackArtist: "Michael Jackson",
        accentColor: "#d8d8d8",
      },
      {
        url: "https://open.spotify.com/track/77NNZQSqzLNqh2A9JhLRkg?si=969527ec771d46ab",
        fallbackTitle: "Don't Stop Believin'",
        fallbackArtist: "Journey",
        accentColor: "#4a5fd3",
      },
      {
        url: "https://open.spotify.com/track/0PsbWiVtix5FoTZ1s00mEl?si=dfc5836ae39141bb",
        fallbackTitle: "Come Sail Away",
        fallbackArtist: "Styx",
        accentColor: "#8aa43d",
      },
      {
        url: "https://open.spotify.com/track/7apWQJSE3gJB55Dp8bXTW9?si=10adbcfb9a674b01",
        fallbackTitle: "Fooling Yourself",
        fallbackArtist: "Styx",
        accentColor: "#8aa43d",
      },
    ],
  },
];

function extractTrackId(url: string) {
  const match = url.match(/track\/([A-Za-z0-9]+)/);
  return match?.[1] ?? "";
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
  const seedsWithIds = FAVORITE_SECTIONS.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      id: extractTrackId(item.url),
    })),
  }));

  const allIds = seedsWithIds.flatMap((section) => section.items.map((item) => item.id)).filter(Boolean);
  const token = await getAccessToken();
  const trackMap = new Map<
    string,
    {
      title: string;
      artist: string;
      albumArt?: string;
      url?: string;
    }
  >();

  if (token && allIds.length > 0) {
    const res = await fetch(`${TRACKS_ENDPOINT}?ids=${allIds.join(",")}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      const tracks = Array.isArray(data?.tracks) ? data.tracks : [];
      for (const track of tracks) {
        if (!track?.id) continue;
        trackMap.set(track.id, {
          title: track.name,
          artist: Array.isArray(track.artists) ? track.artists.map((artist: { name: string }) => artist.name).join(", ") : "",
          albumArt: track.album?.images?.[0]?.url,
          url: track.external_urls?.spotify,
        });
      }
    }
  }

  return NextResponse.json({
    sections: seedsWithIds.map((section) => ({
      title: section.title,
      items: section.items.map((item) => {
        const live = trackMap.get(item.id);
        return {
          id: item.id,
          title: live?.title || item.fallbackTitle,
          artist: live?.artist || item.fallbackArtist,
          albumArt: live?.albumArt,
          url: live?.url || item.url,
          accentColor: item.accentColor,
        };
      }),
    })),
  });
}
