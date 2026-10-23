import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/mongodb";

export type JobName = "campaigns" | "cleanup" | "project-metrics";
export async function recordOperation<T>(job: JobName | "backup-restore", task: () => Promise<T>): Promise<T> {
  const db = await getDb();
  const runId = randomUUID();
  const startedAt = new Date();
  await db.collection("operationRuns").createIndex({ startedAt: 1 }, { expireAfterSeconds: 90 * 86400 });
  await db.collection("operationRuns").insertOne({ runId, job, status: "running", startedAt });
  try {
    const result = await task();
    await db.collection("operationRuns").updateOne({ runId }, { $set: { status: "succeeded", finishedAt: new Date(), durationMs: Date.now() - startedAt.getTime(), result } });
    return result;
  } catch (error) {
    // Store an actionable category, never raw request bodies, credentials, or provider payloads.
    await db.collection("operationRuns").updateOne({ runId }, { $set: { status: "failed", finishedAt: new Date(), durationMs: Date.now() - startedAt.getTime(), error: error instanceof Error ? error.name : "OperationError" } });
    if (error && typeof error === "object") Object.assign(error, { runId });
    throw error;
  }
}

export async function runRegisteredJob(job: JobName) {
  return recordOperation(job, async () => {
    if (job === "campaigns") return (await import("@/lib/campaign-jobs")).processCampaignJobs();
    if (job === "project-metrics") return (await import("@/lib/db")).refreshProjectVideoViewsWithReport();
    if (job === "cleanup") {
      const [{ expireHandshakes }, { pruneCrossDevice }, { sweepCandidates }, { pruneAiConversations }] = await Promise.all([
        import("@/lib/handshake"), import("@/lib/cross-device"), import("@/lib/cross-device-link"), import("@/lib/ai-conversations"),
      ]);
      const sweep = await sweepCandidates();
      const [handshakes, devices, conversations] = await Promise.all([expireHandshakes(), pruneCrossDevice(90), pruneAiConversations(90)]);
      return { sweep, handshakes, devices, conversations };
    }
    throw new Error("Unsupported job");
  });
}
