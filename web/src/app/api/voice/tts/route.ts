import { NextRequest } from "next/server";
import { limitVoiceLike } from "@/lib/api-rate-limit";

// Pinned so the text-chat read-aloud and the AI voice chat sound EXACTLY like the
// guided tour (same enthusiastic Michael voice + model). Not env-overridable on
// purpose — an env mismatch was making live replies use a different voice than the
// prerecorded tour clips.
const VOICE_ID = "EgUcxulGJojl01KsxgA1"; // Michael (matches public/tour-audio)
const MODEL = "eleven_turbo_v2_5";

function voiceId(): string {
  return VOICE_ID;
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

  // Cost guard: cap TTS synthesis per IP/session.
  if (!(await limitVoiceLike(req, "voice-tts", 500))) {
    return new Response(JSON.stringify({ error: "Voice rate limit reached" }), { status: 429 });
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
        model_id: MODEL,
        // Lower stability + higher style = more expressive, enthusiastic delivery (not monotone).
        voice_settings: { stability: 0.32, similarity_boost: 0.85, style: 0.65, use_speaker_boost: true },
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
