import { getDb } from "./mongodb";
import { configuredTokenCap } from "./assistant-budget-policy";
export function configuredAssistantModels() {
  return [
    ...(process.env.ANTHROPIC_API_KEY ? [{ provider: "anthropic", model: process.env.ANTHROPIC_MODEL || "claude-opus-4-7", purpose: "text" }, { provider: "anthropic", model: process.env.ANTHROPIC_VOICE_MODEL || "claude-haiku-4-5-20251001", purpose: "voice" }] : []),
    ...(process.env.OPENAI_API_KEY ? [{ provider: "openai", model: process.env.OPENAI_MODEL || "gpt-4o-mini", purpose: "fallback" }] : []),
    ...(process.env.OPENROUTER_API_KEY ? [{ provider: "openrouter", model: process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet", purpose: "fallback" }] : []),
  ];
}
export function assistantTokenCap() {
  return configuredTokenCap(process.env.AI_DAILY_TOKEN_CAP);
}
/** Conservative request reservations, not a dollar invoice. Atomic across instances.
 * Failed/cancelled reservations stay counted to prevent retry storms evading caps. */
export async function reserveAssistantBudget(inputBytes: number, outputTokens = 1024) {
  const db = await getDb(); const day = new Date().toISOString().slice(0, 10);
  const units = inputBytes + outputTokens; const cap = assistantTokenCap();
  const usage = db.collection<{ _id: string; reservedTokens: number; requests: number }>("assistant_budget");
  try { await usage.updateOne({ _id: day }, { $setOnInsert: { reservedTokens: 0, requests: 0 } }, { upsert: true }); } catch (e) { if (!(e && typeof e === "object" && "code" in e && e.code === 11000)) throw e; }
  const result = await usage.updateOne({ _id: day, reservedTokens: { $lte: cap - units } }, { $inc: { reservedTokens: units, requests: 1 } });
  return result.modifiedCount === 1;
}
export async function recordAssistantAttempt(data: { provider: string; model: string; channel: string; ok: boolean; elapsedMs: number; firstTokenMs?: number; inputTokens?: number; outputTokens?: number; error?: string }) {
  try { const db = await getDb(); await db.collection("assistant_health").insertOne({ ...data, at: new Date(), expiresAt: new Date(Date.now() + 30 * 86400000) }); } catch { /* telemetry must not break an answer */ }
}

export async function reserveVoiceCharacters(characters: number) {
  const configured = Number(process.env.AI_DAILY_VOICE_CHAR_CAP || 100000);
  const cap = Number.isFinite(configured) ? Math.max(1200, Math.min(10000000, Math.floor(configured))) : 100000;
  const db = await getDb(); const day = new Date().toISOString().slice(0, 10);
  const usage = db.collection<{ _id: string; characters: number }>("assistant_voice_budget");
  try { await usage.updateOne({ _id: day }, { $setOnInsert: { characters: 0 } }, { upsert: true }); } catch (e) { if (!(e && typeof e === "object" && "code" in e && e.code === 11000)) throw e; }
  return (await usage.updateOne({ _id: day, characters: { $lte: cap - characters } }, { $inc: { characters } })).modifiedCount === 1;
}
