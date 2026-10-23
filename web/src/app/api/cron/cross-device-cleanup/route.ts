import { runRegisteredJob } from "@/lib/operations";
import { NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET/POST /api/cron/cross-device-cleanup
 *
 * Triggered by Vercel Cron (see vercel.json).
 * Housekeeping for the cross-device engine: expires pending handshakes,
 * prunes stale device records / link candidates, and trims old AI
 * conversations and messages.
 * Protected by CRON_SECRET header to prevent public triggering.
 */
async function handleCleanup(req: NextRequest) {
  // Fail closed: allow ONLY a valid CRON_SECRET bearer (Vercel Cron) or an
  // authenticated admin session. If neither holds, reject — never run the
  // destructive prune unauthenticated, even when CRON_SECRET is unset.
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  const cronOk = !!secret && auth === `Bearer ${secret}`;
  const adminOk = await isAdminAuthenticated().catch(() => false);
  if (!cronOk && !adminOk) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json(await runRegisteredJob("cleanup"));
}

export { handleCleanup as GET, handleCleanup as POST };
