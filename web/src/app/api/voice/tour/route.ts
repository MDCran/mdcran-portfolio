import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { apiRateLimit, clientIp } from "@/lib/api-rate-limit";

const VOICE_ID = "EgUcxulGJojl01KsxgA1";
const MODEL = "eleven_multilingual_v2";
const TOUR_SETTINGS = { stability: 0.72, similarity_boost: 0.90, style: 0.20, use_speaker_boost: true };

export async function GET(req: NextRequest) {
  // Same-origin guard — this narrates fixed tour copy in Michael's real voice clone,
  // so block obvious cross-site/direct abuse (a mismatched Referer is a clear signal;
  // a missing one is left alone since some browsers strip it for legitimate users).
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      if (new URL(referer).host !== req.nextUrl.host) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
    } catch { /* malformed referer header — ignore */ }
  }

  const text = req.nextUrl.searchParams.get("text")?.trim();
  if (!text || text.length > 400) {
    return NextResponse.json({ error: "text required (max 400 chars)" }, { status: 400 });
  }
  // BCP-47 base language code (e.g. "es", "fr") — passed by the client after translating.
  const langParam = req.nextUrl.searchParams.get("lang")?.trim().toLowerCase() ?? "en";

  // Return from MongoDB cache if available (zero ElevenLabs cost on repeats).
  try {
    const db = await getDb();
    const cached = await db.collection("tourAudioCache").findOne({ text });
    if (cached?.audio) {
      const buf = Buffer.from(cached.audio as string, "base64");
      return new NextResponse(buf, {
        headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=604800" },
      });
    }
  } catch {
    /* proceed to generate if DB check fails */
  }

  // Rate-limit new (uncached) generations: 20/hour per IP.
  const ip = clientIp(req);
  const allowed = await apiRateLimit("voice-tour-gen", ip, 20, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "tts unavailable" }, { status: 503 });
  }

  try {
    const elevenlabsBody: Record<string, unknown> = { text, model_id: MODEL, voice_settings: TOUR_SETTINGS };
    if (langParam && langParam !== "en") elevenlabsBody.language_code = langParam;

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify(elevenlabsBody),
      },
    );
    if (!res.ok) {
      return NextResponse.json({ error: "tts failed" }, { status: 502 });
    }

    const buf = Buffer.from(await res.arrayBuffer());
    const b64 = buf.toString("base64");

    // Cache in MongoDB (fire-and-forget — never block the response).
    getDb()
      .then((db) => db.collection("tourAudioCache").insertOne({ text, audio: b64, createdAt: new Date() }))
      .catch(() => { /* non-critical */ });

    return new NextResponse(buf, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=604800" },
    });
  } catch {
    return NextResponse.json({ error: "tts failed" }, { status: 500 });
  }
}
