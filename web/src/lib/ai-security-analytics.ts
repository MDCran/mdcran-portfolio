import { getDb } from "@/lib/mongodb";

const COLLECTION = "aiSecurityEvents";

export type PromptAttackCategory = "instruction-override" | "prompt-exposure" | "role-manipulation" | "message-forgery";

function categoryFor(value: string): PromptAttackCategory {
  if (/<\s*(?:system|developer|assistant)\b/i.test(value) || /(?:^|\n)\s*(?:system|developer|assistant)\s*:/i.test(value)) return "message-forgery";
  if (/\b(?:reveal|show|print|dump|extract|repeat|summari[sz]e|paraphrase|decode)\b.{0,80}\b(?:prompt|instructions?|system message|developer message|hidden rules?)/i.test(value)) return "prompt-exposure";
  if (/\b(?:jailbreak|dan mode|developer mode|prompt injection|roleplay as|you are now)\b/i.test(value)) return "role-manipulation";
  return "instruction-override";
}

/** Records only a coarse safety category and timestamp — never visitor content, IP, session, or device data. */
export async function recordBlockedPromptAttack(value: string): Promise<void> {
  try {
    const db = await getDb();
    const now = new Date();
    await db.collection(COLLECTION).insertOne({
      category: categoryFor(value),
      createdAt: now.toISOString(),
      day: now.toISOString().slice(0, 10),
    });
  } catch (error) {
    console.error("[ai-security] could not record blocked attempt", error);
  }
}

export async function getPromptAttackSummary(): Promise<{ total: number; last7Days: number; byCategory: Record<PromptAttackCategory, number> }> {
  const db = await getDb();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [total, last7Days, grouped] = await Promise.all([
    db.collection(COLLECTION).countDocuments(),
    db.collection(COLLECTION).countDocuments({ createdAt: { $gte: since } }),
    db.collection(COLLECTION).aggregate<{ _id: PromptAttackCategory; count: number }>([
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]).toArray(),
  ]);
  const byCategory: Record<PromptAttackCategory, number> = {
    "instruction-override": 0,
    "prompt-exposure": 0,
    "role-manipulation": 0,
    "message-forgery": 0,
  };
  for (const entry of grouped) if (entry._id in byCategory) byCategory[entry._id] = entry.count;
  return { total, last7Days, byCategory };
}
