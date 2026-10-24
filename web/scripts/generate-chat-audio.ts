/** Generate once, then commit the MP3s. Chat playback never calls ElevenLabs.
 * npx tsx scripts/generate-chat-audio.ts
 * Existing files are kept; change a recording's version to replace its copy.
 */
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CHAT_RECORDINGS, CHAT_RECORDING_VOICE } from "../src/lib/chat-recordings";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  for (const envFile of [".env.local", "../.env.local"]) {
    const filename = path.resolve(root, envFile);
    if (existsSync(filename)) process.loadEnvFile(filename);
  }
  const apiKey = process.env.ELEVENLABS_API_KEY;
  for (const [name, recording] of Object.entries(CHAT_RECORDINGS)) {
    const filename = path.join(root, "public", recording.href);
    if (existsSync(filename)) { console.log(`${name}: keeping saved recording`); continue; }
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY is required to generate a missing recording.");
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${CHAT_RECORDING_VOICE.id}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text: recording.text, model_id: CHAT_RECORDING_VOICE.model, voice_settings: CHAT_RECORDING_VOICE.settings }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!response.ok) throw new Error(`ElevenLabs could not generate ${name} (HTTP ${response.status}). No retry was made.`);
    const audio = Buffer.from(await response.arrayBuffer());
    if (audio.length < 1024 || !response.headers.get("content-type")?.startsWith("audio/")) {
      throw new Error(`ElevenLabs returned invalid audio for ${name}.`);
    }
    await mkdir(path.dirname(filename), { recursive: true });
    await writeFile(filename, audio, { flag: "wx" });
    console.log(`${name}: saved ${audio.length} bytes to ${recording.href}`);
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
