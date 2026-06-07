/**
 * Pre-generate the guided-tour narration as static MP3s so the tour costs ZERO
 * ElevenLabs tokens at runtime. Live TTS is then reserved for real Q&A only.
 *
 * Run once (and again whenever the tour script below changes):
 *   node scripts/generate-tour-audio.mjs
 *
 * Reads ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID / ELEVENLABS_MODEL from the
 * environment or from web/.env.local. Writes web/public/tour-audio/step-N.mp3.
 *
 * IMPORTANT: keep STEP_TEXTS in sync with STEPS in
 *   src/components/chat/AssistantTutorial.tsx
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Tour narration — index N maps to public/tour-audio/step-N.mp3
const STEP_TEXTS = [
  "Hey — I'm Michael, your AI assistant, here to walk you through my portfolio. Let me give you the quick tour.",
  "First up, this is where you can get to know me — a quick intro to who I am and what I do.",
  "These are some of my most renowned projects, the work I'm honestly proudest of.",
  "And here are the clients and creators I've gotten to work with over the years.",
  "Want the full story? My resume lives right up here — experience, skills, all of it.",
  "I can take you to any page on the site, just ask. Here's everything at a glance.",
  "And that's the quick tour! Ask me anything, and I'll show you around.",
];

// Pinned to match the live TTS route (src/app/api/voice/tts/route.ts) so the tour and
// the chat/voice replies are the SAME voice + model: Michael's real professional clone
// on eleven_multilingual_v2 (the highest-quality model the clone is fine-tuned for).
const VOICE_ID = "EgUcxulGJojl01KsxgA1"; // Michael Cran — professional clone
const MODEL = "eleven_multilingual_v2";

/** Minimal .env.local loader (no dependency) so the script "just works" locally. */
async function loadEnvLocal() {
  const envPath = join(ROOT, ".env.local");
  if (!existsSync(envPath)) return;
  const raw = await readFile(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

async function main() {
  await loadEnvLocal();
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error("✗ ELEVENLABS_API_KEY not set (env or web/.env.local). Aborting.");
    process.exit(1);
  }
  // Use the pinned VOICE_ID (a guaranteed-usable instant clone). We deliberately do NOT
  // read ELEVENLABS_VOICE_ID here — that's the LIVE route's primary, which may be a
  // professional clone that can't synthesize until re-fine-tuned. Override via
  // ELEVENLABS_TOUR_VOICE_ID only if you really mean to change the prerecorded clips.
  const voiceId = process.env.ELEVENLABS_TOUR_VOICE_ID || VOICE_ID;
  const model = process.env.ELEVENLABS_MODEL || MODEL;
  const outDir = join(ROOT, "public", "tour-audio");
  await mkdir(outDir, { recursive: true });

  for (let i = 0; i < STEP_TEXTS.length; i++) {
    const text = STEP_TEXTS[i];
    process.stdout.write(`→ step-${i}.mp3 … `);
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({
          text,
          model_id: model,
          // Match the live route's settings so the tour sounds the same.
          voice_settings: { stability: 0.35, similarity_boost: 0.9, style: 0.6, use_speaker_boost: true },
        }),
      }
    );
    if (!res.ok) {
      console.error(`FAILED (${res.status}): ${await res.text().catch(() => "")}`);
      process.exit(1);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(join(outDir, `step-${i}.mp3`), buf);
    console.log(`ok (${(buf.length / 1024).toFixed(0)} KB)`);
  }
  console.log(`\n✓ Wrote ${STEP_TEXTS.length} clips to public/tour-audio/. Tours are now token-free.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
