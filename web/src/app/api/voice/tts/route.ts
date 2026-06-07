import { NextRequest } from "next/server";
import { limitVoiceLike } from "@/lib/api-rate-limit";

// Michael's actual voice — the ONLY voice the assistant uses. No fallback to any other
// voice: if this voice can't synthesize, we report "voice unavailable" rather than
// speaking in someone else's voice (per the owner's explicit requirement).
const VOICE_ID = "EgUcxulGJojl01KsxgA1"; // Michael Cran (professional clone)

// Model: this professional clone is fine-tuned for the v2 family (multilingual_v2,
// turbo_v2, flash_v2) — NOT for eleven_v3, and its turbo/flash v2.5 fine-tunes FAILED,
// so those models 400 with "voice_not_fine_tuned". eleven_multilingual_v2 is the
// highest-quality model the voice is trained on. Expressiveness comes from the voice
// settings (lower stability + higher style). (v3's inline audio tags need the v3 model,
// which this voice isn't fine-tuned for — so we don't use them.)
const MODEL = "eleven_multilingual_v2";
const VOICE_SETTINGS = { stability: 0.35, similarity_boost: 0.9, style: 0.6, use_speaker_boost: true };

function voiceId(): string {
  return process.env.ELEVENLABS_VOICE_ID?.trim() || VOICE_ID;
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

  // Synthesize with Michael's voice only. If it fails, we DON'T substitute another
  // voice — we report that voice is unavailable so the client can say so.
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
        voice_settings: VOICE_SETTINGS,
      }),
    }
  );

  if (res.ok && res.body) {
    return new Response(res.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  }

  const detail = await res.text().catch(() => "Unknown error");
  console.error("ElevenLabs TTS error:", res.status, detail);
  // 503 = the voice itself can't be synthesized right now (not configured / not
  // fine-tuned / rate limited). The client surfaces this as "voice unavailable".
  return new Response(
    JSON.stringify({ error: "Voice unavailable", status: res.status, detail: detail.slice(0, 200) }),
    { status: 503 },
  );
}
