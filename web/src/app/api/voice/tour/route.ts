import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { apiRateLimit, clientIp } from "@/lib/api-rate-limit";

const VOICE_ID = "EgUcxulGJojl01KsxgA1";
const MODEL = "eleven_multilingual_v2";
const TOUR_SETTINGS = { stability: 0.72, similarity_boost: 0.90, style: 0.20, use_speaker_boost: true };

export async function GET(req: NextRequest) {
  const text = req.nextUrl.searchParams.get("text")?.trim();
  if (!text || text.length > 1000) {
    return NextResponse.json({ error: "text required (max 1000 chars)" }, { status: 400 });
  }

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
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ text, model_id: MODEL, voice_settings: TOUR_SETTINGS }),
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
