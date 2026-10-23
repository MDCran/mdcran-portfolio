import { NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { runRegisteredJob } from "@/lib/operations";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const authorizedWorker = [process.env.CAMPAIGN_CRON_SECRET, process.env.CRON_SECRET].some(secret => secret && req.headers.get("authorization") === `Bearer ${secret}`);
  if (!authorizedWorker && !(await isAdminAuthenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { return Response.json(await runRegisteredJob("campaigns")); }
  catch { return Response.json({ error: "Campaign job failed; inspect Operations." }, { status: 500 }); }
}
export const POST = GET;
