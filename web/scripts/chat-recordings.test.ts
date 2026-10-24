import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { NextRequest } from "next/server";
import { CHAT_RECORDINGS, getChatRecording } from "../src/lib/chat-recordings";
import { GET as farewell } from "../src/app/api/voice/farewell/route";
import { POST as tts } from "../src/app/api/voice/tts/route";

test("both welcome variants and farewell have real bundled MP3 recordings", () => {
  for (const recording of Object.values(CHAT_RECORDINGS)) {
    const filename = fileURLToPath(new URL(`../public${recording.href}`, import.meta.url));
    const audio = readFileSync(filename);
    assert.ok(audio.byteLength > 10_000, `${recording.href} is missing or truncated`);
    assert.ok(audio.subarray(0, 3).toString() === "ID3" || (audio[0] === 0xff && (audio[1] & 0xe0) === 0xe0), "expected an MP3 header");
    assert.equal(getChatRecording(recording.text)?.href, recording.href);
  }
});

test("typographic apostrophes and whitespace reuse the same recording", () => {
  const text = CHAT_RECORDINGS.greeting.text.replaceAll("’", "'").replaceAll(" ", "  ");
  assert.equal(getChatRecording(` ${text}\n`)?.href, CHAT_RECORDINGS.greeting.href);
});

test("ordinary and changed replies never play an unrelated fixed recording", () => {
  for (const text of ["", "Tell me about Michael's projects.", `${CHAT_RECORDINGS.greeting.text} More details.`, "Bienvenue dans mon portfolio."]) {
    assert.equal(getChatRecording(text), undefined);
  }
});

test("the old farewell endpoint serves the permanent recording without a provider call", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error("Playback must not contact ElevenLabs"); };
  try {
    for (let i = 0; i < 2; i++) {
      const response = await farewell(new NextRequest("https://mdcran.com/api/voice/farewell"));
      assert.equal(response.status, 307);
      assert.equal(response.headers.get("location"), `https://mdcran.com${CHAT_RECORDINGS.farewell.href}`);
    }
  } finally { globalThis.fetch = originalFetch; }
});

test("fixed TTS requests reuse recordings without an API key, database or paid fetch", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.ELEVENLABS_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;
  globalThis.fetch = () => { throw new Error("Fixed speech must never contact a provider"); };
  try {
    for (let i = 0; i < 2; i++) {
      for (const recording of Object.values(CHAT_RECORDINGS)) {
        const response = await tts(new NextRequest("https://mdcran.com/api/voice/tts", {
          method: "POST", body: JSON.stringify({ text: recording.text }),
          headers: { "Content-Type": "application/json" },
        }));
        assert.equal(response.status, 303);
        assert.equal(response.headers.get("location"), `https://mdcran.com${recording.href}`);
      }
    }
    const reply = await tts(new NextRequest("https://mdcran.com/api/voice/tts", {
      method: "POST", body: JSON.stringify({ text: "Here are three projects to explore." }),
    }));
    assert.equal(reply.status, 503, "ordinary replies still require live voice configuration");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = originalKey;
  }
});
