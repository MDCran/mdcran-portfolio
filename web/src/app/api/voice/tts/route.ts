import { NextRequest } from "next/server";
import { limitVoiceLike } from "@/lib/api-rate-limit";

// Voice selection. PRIMARY is the high-quality professional clone "Michael v2"
// (EgUcxulGJojl01KsxgA1). FALLBACKS keep the assistant talking if the primary can't
// be used right now.
//
// IMPORTANT — about "Michael v2": it's a PROFESSIONAL voice clone, which must finish
// fine-tuning on the ElevenLabs account before the API will synthesize with it. While
// its fine-tuning is unavailable, every request returns 400 "voice_not_fine_tuned".
// We keep it as the primary on purpose (so it's used automatically the moment it's
// re-fine-tuned in the ElevenLabs dashboard) and transparently fall back to "Michael
// v1" (PqckR8cb9ShObzR6X8L0, an instant clone of the same voice that works on every
// model) so voice never goes silent.
const PRIMARY_VOICE_ID = "EgUcxulGJojl01KsxgA1"; // Michael (v2) — professional clone, high quality
const FALLBACK_VOICE_IDS = [
  "PqckR8cb9ShObzR6X8L0", // Michael (v1) — instant clone of the same voice (always usable)
  "JBFqnCBsd6RMkjVDRZzb", // George — premade, last-resort so it's never fully silent
];

// ElevenLabs v3 — their most expressive model (supports inline audio tags like
// [laughs], [whispers], [excited] that the chat model injects for delivery). v3 wants
// a NUMERIC stability (0 = creative/most expressive, 0.5 = natural, 1 = robust).
const MODEL = "eleven_v3";
const V3_VOICE_SETTINGS = { stability: 0.5, similarity_boost: 0.9, use_speaker_boost: true };

// A voice that returns a voice-level error (e.g. not fine-tuned) is parked here so we
// don't pay its failed round-trip on every utterance. It's automatically retried once
// the cooldown lapses, so a re-fine-tuned primary recovers on its own. Module-level =
// per-instance memory, which is all we need.
const VOICE_COOLDOWN_MS = 10 * 60 * 1000;
const brokenUntil = new Map<string, number>();

function voiceChain(): string[] {
  const primary = process.env.ELEVENLABS_VOICE_ID?.trim() || PRIMARY_VOICE_ID;
  const all = Array.from(new Set([primary, ...FALLBACK_VOICE_IDS]));
  const now = Date.now();
  const live = all.filter((id) => (brokenUntil.get(id) ?? 0) <= now);
  // If every voice is cooling down, ignore cooldowns rather than going silent.
  return live.length ? live : all;
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

  // Try each voice in turn. A voice-level failure (e.g. a clone that lost its
  // fine-tuning → 400 "voice_not_fine_tuned") should NOT make the assistant go
  // silent — fall through to the next voice instead of returning an error.
  let lastStatus = 502;
  let lastErr = "Unknown error";
  for (const id of voiceChain()) {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${id}?output_format=mp3_44100_128`,
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
          voice_settings: V3_VOICE_SETTINGS,
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

    lastStatus = res.status;
    lastErr = await res.text().catch(() => "Unknown error");
    console.error(`ElevenLabs TTS error (voice=${id}):`, res.status, lastErr);
    // 401/403/429 are account-wide (bad key / rate limit) — no point trying other voices.
    if (res.status === 401 || res.status === 403 || res.status === 429) break;
    // Voice-level failure (not fine-tuned, missing, etc.): park this voice so the next
    // utterance skips straight to a working fallback. Auto-recovers after the cooldown.
    if (res.status === 400 || res.status === 404) brokenUntil.set(id, Date.now() + VOICE_COOLDOWN_MS);
  }

  return new Response(JSON.stringify({ error: "TTS failed", status: lastStatus, detail: lastErr.slice(0, 200) }), { status: 502 });
}
