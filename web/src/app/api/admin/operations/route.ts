import { NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { adminError } from "@/lib/admin-content";
import { AdminDataError } from "@/lib/content-validation";
import { runRegisteredJob, type JobName } from "@/lib/operations";
export async function GET() {
  if (!(await isAdminAuthenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const runs = await db.collection("operationRuns").find({}, { projection: { _id: 0 } }).sort({ startedAt: -1 }).limit(100).toArray();
  const uncertainDeliveries = await db.collection("campaignDeliveries").countDocuments({ status: { $in: ["uncertain", "sending"] } });
  const deliveries = await db.collection("campaignDeliveries").find({ status: "uncertain" }, { projection: { _id: 0, owner: 0 } }).limit(100).toArray();
  return Response.json({ runs, deliveries, summary: { failed: runs.filter((run) => run.status === "failed").length, running: runs.filter((run) => run.status === "running").length, uncertainDeliveries } });
}
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (body.action === "resolve-delivery") {
      if (typeof body.campaignId !== "string" || typeof body.contactId !== "string" || !["sent", "not-sent"].includes(body.outcome)) throw new AdminDataError("Campaign, contact and confirmed outcome are required");
      const db = await getDb();
      const result = await db.collection("campaignDeliveries").updateOne({ campaignId: body.campaignId, contactId: body.contactId, status: "uncertain" }, { $set: { status: body.outcome === "sent" ? "sent" : "pending", resolvedAt: new Date(), resolution: body.outcome, resolvedBy: "admin" } });
      if (!result.modifiedCount) throw new AdminDataError("This delivery is no longer awaiting review", 409);
      if (body.outcome === "sent") await db.collection("campaigns").updateOne({ id: body.campaignId }, { $addToSet: { deliveredContactIds: body.contactId } });
      return Response.json({ ok: true, message: "Outcome recorded. Resume the campaign explicitly when ready." });
    }
    if (body.action !== "retry" || typeof body.runId !== "string") throw new AdminDataError("A failed run is required");
    const run = await (await getDb()).collection("operationRuns").findOne({ runId: body.runId, status: "failed" });
    if (!run || !["campaigns", "cleanup", "project-metrics"].includes(run.job)) throw new AdminDataError("This operation cannot be retried", 409);
    return Response.json({ ok: true, result: await runRegisteredJob(run.job as JobName) });
  } catch (error) { return adminError(error); }
}
