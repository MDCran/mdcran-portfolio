import { NextRequest } from "next/server";
import { limitVoiceLike } from "@/lib/api-rate-limit";

export const maxDuration = 30;

/* POST — transcribe a short recorded audio clip via ElevenLabs Speech-to-Text. */
export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Voice not configured" }), { status: 503 });
  }
  if (!(await limitVoiceLike(req, "voice-stt", 300))) {
    return new Response(JSON.stringify({ error: "Voice rate limit reached" }), { status: 429 });
  }

  let inForm: FormData;
  try {
    inForm = await req.formData();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid form data" }), { status: 400 });
  }

  const file = inForm.get("file");
  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: "Audio file required" }), { status: 400 });
  }
  if (!file.size || file.size > 8 * 1024 * 1024) {
    return Response.json({ error: "Record a shorter audio clip and try again" }, { status: file.size ? 413 : 400 });
  }

  const upstream = new FormData();
  upstream.set("file", file, file.name || "recording.webm");
  upstream.set("model_id", process.env.ELEVENLABS_STT_MODEL || "scribe_v1");

  try {
    const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: upstream,
      signal: AbortSignal.any([req.signal, AbortSignal.timeout(25_000)]),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      console.error("ElevenLabs STT error:", res.status, errText);
      return new Response(JSON.stringify({ error: "Transcription failed" }), { status: 502 });
    }

    const data = await res.json().catch(() => null);
    if (typeof data?.text !== "string") return Response.json({ error: "Transcription unavailable" }, { status: 502 });
    return Response.json({ text: data.text.trim() });
  } catch {
    return Response.json({ error: req.signal.aborted ? "Transcription cancelled" : "Transcription temporarily unavailable" }, { status: req.signal.aborted ? 499 : 503 });
  }
}
