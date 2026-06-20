import { NextRequest } from "next/server";
import { sendWeeklyDigest } from "@/lib/discord";
import { isAdminAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET/POST /api/cron/discord-digest
 *
 * Triggered by Vercel Cron (every Sunday at midnight UTC, see vercel.json).
 * Also callable manually from the Admin Discord settings panel.
 * Fail closed: requires a valid CRON_SECRET bearer (Vercel Cron) OR an
 * authenticated admin session. The admin path is what makes the manual
 * "Trigger Weekly Digest" button work in production where CRON_SECRET is set.
 */
async function handleDigest(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  const cronOk = !!secret && auth === `Bearer ${secret}`;
  const adminOk = await isAdminAuthenticated().catch(() => false);
  if (!cronOk && !adminOk) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendWeeklyDigest();
  return Response.json(result, { status: result.sent ? 200 : 400 });
}

export { handleDigest as GET, handleDigest as POST };
