import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { apiRateLimit, clientIp } from "@/lib/api-rate-limit";
import { TOUR_TEXTS } from "@/lib/tour-texts";

const VOICE_ID = "EgUcxulGJojl01KsxgA1";
const MODEL = "eleven_multilingual_v2";
const TOUR_SETTINGS = { stability: 0.72, similarity_boost: 0.90, style: 0.20, use_speaker_boost: true };

/**
 * GET /api/voice/tour-pregen?lang=es
 *
 * Generates ALL tour narration segments in sequence (not parallel) so they share
 * the same ElevenLabs session and sound tonally consistent throughout.
 * Each segment is cached in MongoDB — subsequent calls (or other users) return
 * instantly from cache without consuming any ElevenLabs tokens.
 *
 * Returns: { status: "complete" | "partial", generated: N, cached: N, total: N }
 */
export async function GET(req: NextRequest) {
  const langParam = req.nextUrl.searchParams.get("lang")?.trim().toLowerCase() ?? "en";

  // Rate-limit uncached generation passes: 5/hour per IP to prevent abuse.
  const ip = clientIp(req);

  const apiKey = process.env.ELEVENLABS_API_KEY;

  let db;
  try { db = await getDb(); } catch { /* proceed without DB */ }

  const texts = TOUR_TEXTS;
  let cachedCount = 0;
  let generatedCount = 0;
  const errors: number[] = [];

  // Process segments SEQUENTIALLY so they share the same ElevenLabs tonal session.
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];

    // Check MongoDB cache first.
    if (db) {
      try {
        const existing = await db.collection("tourAudioCache").findOne({ text });
        if (existing?.audio) { cachedCount++; continue; }
      } catch { /* cache miss, proceed to generate */ }
    }

    // Need to generate — check rate limit only when a new generation is needed.
    if (generatedCount === 0) {
      const allowed = await apiRateLimit("voice-tour-pregen", ip, 5, 60 * 60 * 1000);
      if (!allowed) {
        return NextResponse.json({ error: "rate limited", cached: cachedCount, total: texts.length }, { status: 429 });
      }
    }

    if (!apiKey) {
      return NextResponse.json({ error: "tts unavailable", cached: cachedCount, total: texts.length }, { status: 503 });
    }

    try {
      const body: Record<string, unknown> = { text, model_id: MODEL, voice_settings: TOUR_SETTINGS };
      if (langParam && langParam !== "en") body.language_code = langParam;

      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) { errors.push(i); continue; }

      const buf = Buffer.from(await res.arrayBuffer());
      const b64 = buf.toString("base64");

      if (db) {
        try {
          await db.collection("tourAudioCache").insertOne({ text, audio: b64, lang: langParam, createdAt: new Date() });
        } catch { /* cache write non-critical */ }
      }

      generatedCount++;
    } catch {
      errors.push(i);
    }
  }

  const status = errors.length === 0 ? "complete" : "partial";
  return NextResponse.json({
    status,
    generated: generatedCount,
    cached: cachedCount,
    total: texts.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
