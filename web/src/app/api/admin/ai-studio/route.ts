import { NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { configuredAssistantModels, assistantTokenCap } from "@/lib/assistant-operations";
import { assistantEvaluations } from "@/lib/assistant-evals";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!(await isAdminAuthenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const [health, feedback, budget] = await Promise.all([
    db.collection("assistant_health").find({}, { projection: { _id: 0 } }).sort({ at: -1 }).limit(50).toArray(),
    db.collection("assistant_feedback").find({}, { projection: { _id: 0 } }).sort({ at: -1 }).limit(30).toArray(),
    db.collection<{ _id: string; reservedTokens: number; requests: number }>("assistant_budget").findOne({ _id: new Date().toISOString().slice(0, 10) }),
  ]);
  await db.collection("assistant_health").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  return Response.json({ models: configuredAssistantModels(), evaluations: assistantEvaluations, health, feedback, budget: { cap: assistantTokenCap(), reservedTokens: budget?.reservedTokens || 0, requests: budget?.requests || 0 }, voice: { voiceId: "EgUcxulGJojl01KsxgA1", model: "eleven_multilingual_v2" } });
}
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.prompt !== "string" || typeof body.answer !== "string" || !["good", "bad"].includes(body.rating)) return Response.json({ error: "Invalid feedback" }, { status: 400 });
  const db = await getDb();
  await db.collection("assistant_feedback").insertOne({ id: crypto.randomUUID(), at: new Date(), prompt: body.prompt.slice(0, 6000), answer: body.answer.slice(0, 12000), rating: body.rating, note: typeof body.note === "string" ? body.note.slice(0, 2000) : "", model: typeof body.model === "string" ? body.model.slice(0, 100) : "" });
  return Response.json({ ok: true });
}
