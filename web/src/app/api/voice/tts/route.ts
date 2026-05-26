import { NextRequest } from "next/server";

const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // ElevenLabs "Rachel" — overridable via env
const DEFAULT_MODEL = "eleven_turbo_v2_5"; // low-latency conversational model

function voiceId(): string {
  return process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
}

/* GET — lets the client know whether voice is available without exposing keys. */
export async function GET() {
  return Response.json({ enabled: !!process.env.ELEVENLABS_API_KEY });
}

/* POST — synthesize speech for a short assistant reply and stream the audio back. */
export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Voice not configured" }), { status: 503 });
  }

  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (!text) {
    return new Response(JSON.stringify({ error: "No text" }), { status: 400 });
  }
  // Cap length to keep latency + cost sane.
  const clipped = text.length > 1200 ? text.slice(0, 1200) : text;

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId()}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: clipped,
        model_id: process.env.ELEVENLABS_MODEL || DEFAULT_MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true },
      }),
    }
  );

  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => "Unknown error");
    console.error("ElevenLabs TTS error:", res.status, errText);
    return new Response(JSON.stringify({ error: "TTS failed" }), { status: 502 });
  }

  return new Response(res.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
