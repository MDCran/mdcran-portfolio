import { NextRequest } from "next/server";

// Pre-rendered farewell message — synthesized once and returned with a long
// cache header so browsers serve it locally on repeat plays (no token usage).
const FAREWELL_TEXT = "Looks like you may have stepped away. I'll be ending this chat shortly. Feel free to reach back out anytime!";

const VOICE_ID = "EgUcxulGJojl01KsxgA1";
const MODEL = "eleven_multilingual_v2";
const VOICE_SETTINGS = { stability: 0.45, similarity_boost: 0.9, style: 0.6, use_speaker_boost: true };

// In-process cache (lives as long as the serverless instance). A cold-start
// synthesizes once; subsequent requests in the same instance get the buffer
// instantly. The client also caches via Cache-Control: public, max-age.
let cachedBuffer: ArrayBuffer | null = null;

export async function GET(_req: NextRequest): Promise<Response> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Voice not configured" }), { status: 503 });
  }

  if (cachedBuffer) {
    return new Response(cachedBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=2592000, immutable",
      },
    });
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text: FAREWELL_TEXT, model_id: MODEL, voice_settings: VOICE_SETTINGS }),
    }
  );

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    console.error("ElevenLabs farewell TTS error:", res.status, detail);
    return new Response(JSON.stringify({ error: "Voice unavailable" }), { status: 503 });
  }

  cachedBuffer = await res.arrayBuffer();
  return new Response(cachedBuffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=2592000, immutable",
    },
  });
}
