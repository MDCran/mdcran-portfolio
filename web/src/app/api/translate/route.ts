import { NextRequest } from "next/server";
import { clientIp, apiRateLimit } from "@/lib/api-rate-limit";
import { getTranslationCache, saveTranslationCache } from "@/lib/db";

const MAX_TEXT_LENGTH = 5_000;
const VALID_LANG = /^[a-z]{2,3}$/;

// FNV-1a 32-bit — fast, no imports, sufficient for cache keys
function textHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  }
  return (h >>> 0).toString(36);
}

// L1: in-process memory cache (survives for the lifetime of this server process)
const memCache = new Map<string, string>();
const MAX_MEM = 10_000;

function memKey(hash: string, target: string) { return `${hash}:${target}`; }
function memGet(hash: string, target: string) { return memCache.get(memKey(hash, target)); }
function memSet(hash: string, target: string, v: string) {
  if (memCache.size >= MAX_MEM) { const k = memCache.keys().next().value; if (k) memCache.delete(k); }
  memCache.set(memKey(hash, target), v);
}

// MyMemory: free, no API key required.
// Including an email in `de` raises the daily limit from 1 000 → 10 000 words.
const MYMEMORY_EMAIL = process.env.MYMEMORY_EMAIL ?? "mdcranberry@gmail.com";

async function callMyMemory(text: string, source: string, target: string): Promise<string> {
  const url =
    `https://api.mymemory.translated.net/get` +
    `?q=${encodeURIComponent(text)}` +
    `&langpair=${source}|${target}` +
    `&de=${encodeURIComponent(MYMEMORY_EMAIL)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "MDCran-Portfolio/1.0 (translation-cache; https://mdcran.com)" },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);
  const data = await res.json() as {
    responseStatus?: number | string;
    responseData?: { translatedText?: string };
  };
  const status = Number(data.responseStatus);
  if (status !== 200) throw new Error(`MyMemory status ${data.responseStatus}`);
  const t = data.responseData?.translatedText;
  if (typeof t !== "string" || !t) throw new Error("MyMemory empty response");
  if (/^(QUERY LENGTH|MYMEMORY WARNING)/i.test(t)) throw new Error(`MyMemory: ${t}`);
  return t;
}

async function callLibreTranslate(text: string, source: string, target: string): Promise<string> {
  const base = (process.env.LIBRETRANSLATE_URL ?? "").replace(/\/$/, "");
  if (!base) throw new Error("LibreTranslate not configured");
  const body: Record<string, string> = { q: text, source, target, format: "text" };
  const key = process.env.LIBRETRANSLATE_API_KEY;
  if (key) body.api_key = key;
  const res = await fetch(`${base}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`LibreTranslate HTTP ${res.status}`);
  const data = await res.json() as { translatedText?: string };
  if (typeof data.translatedText !== "string") throw new Error("LibreTranslate bad response");
  return data.translatedText;
}

async function callExternal(text: string, source: string, target: string): Promise<string> {
  if (process.env.LIBRETRANSLATE_URL) return callLibreTranslate(text, source, target);
  return callMyMemory(text, source, target);
}

/** Translate a batch — L1 (memory) → L2 (MongoDB) → external API. */
async function translateBatch(texts: string[], source: string, target: string): Promise<string[]> {
  const hashes = texts.map(textHash);

  // L1: memory
  const results: (string | null)[] = hashes.map((h) => memGet(h, target) ?? null);

  // L2: MongoDB
  const dbMissIdx = results.flatMap((r, i) => (r === null ? [i] : []));
  if (dbMissIdx.length) {
    try {
      const hits = await getTranslationCache(dbMissIdx.map((i) => ({ hash: hashes[i], target })));
      for (const i of dbMissIdx) {
        const v = hits.get(memKey(hashes[i], target));
        if (v !== undefined) { results[i] = v; memSet(hashes[i], target, v); }
      }
    } catch (err) {
      console.warn("[translate] DB cache unavailable:", (err as Error).message);
    }
  }

  // L3: external API (concurrent — each text is its own request to MyMemory)
  const apiMissIdx = results.flatMap((r, i) => (r === null ? [i] : []));
  if (apiMissIdx.length) {
    console.log(`[translate] ${apiMissIdx.length} cache misses → calling external API`);
    const toSave: { hash: string; source: string; target: string; text: string; translatedText: string }[] = [];
    await Promise.all(
      apiMissIdx.map(async (i) => {
        const text = texts[i].trim();
        if (!text) { results[i] = texts[i]; return; }
        try {
          const out = await callExternal(text, source, target);
          results[i] = out;
          memSet(hashes[i], target, out);
          toSave.push({ hash: hashes[i], source, target, text, translatedText: out });
        } catch (err) {
          console.error(`[translate] external API error for "${text.slice(0, 40)}":`, (err as Error).message);
          results[i] = texts[i];
        }
      })
    );
    // Persist new translations (fire-and-forget)
    if (toSave.length) saveTranslationCache(toSave).catch(() => {});
  }

  return results.map((r, i) => r ?? texts[i]);
}

export async function POST(req: NextRequest): Promise<Response> {
  const ip = clientIp(req);
  const allowed = await apiRateLimit("translate:ip", ip, 200, 60 * 60 * 1_000);
  if (!allowed) return Response.json({ error: "Rate limited. Try again later." }, { status: 429 });

  let body: { text?: unknown; source?: unknown; target?: unknown };
  try { body = await req.json(); }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const source = typeof body.source === "string" ? body.source.trim().toLowerCase() : "en";
  const target = typeof body.target === "string" ? body.target.trim().toLowerCase() : "";

  if (!target || !VALID_LANG.test(target)) return Response.json({ error: "valid target language required" }, { status: 400 });
  if (!VALID_LANG.test(source)) return Response.json({ error: "invalid source language" }, { status: 400 });
  if (source === target) return Response.json({ translatedText: body.text });

  if (Array.isArray(body.text)) {
    const texts = body.text.filter((t): t is string => typeof t === "string");
    if (texts.some((t) => t.length > MAX_TEXT_LENGTH)) return Response.json({ error: "Text too long" }, { status: 400 });
    try {
      const out = await translateBatch(texts, source, target);
      return Response.json({ translatedText: out });
    } catch (err) {
      console.error("[translate] batch fatal:", err);
      return Response.json({ translatedText: texts });
    }
  }

  if (typeof body.text !== "string") return Response.json({ error: "text must be a string or array" }, { status: 400 });
  if (body.text.length > MAX_TEXT_LENGTH) return Response.json({ error: "Text too long" }, { status: 400 });

  try {
    const [out] = await translateBatch([body.text], source, target);
    return Response.json({ translatedText: out });
  } catch (err) {
    console.error("[translate] single fatal:", err);
    return Response.json({ translatedText: body.text });
  }
}
