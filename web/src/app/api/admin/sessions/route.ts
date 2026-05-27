import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getLiveSessions, issueSessionCommand, setIpBlacklist, getAnalyticsStorage, clearAnalyticsLogs, type SessionCommand } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    // ?storage=1 → on-disk size + counts of the log collections (for the admin UI).
    if (req.nextUrl.searchParams.get("storage")) {
      return NextResponse.json(await getAnalyticsStorage());
    }
    return NextResponse.json(await getLiveSessions());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  try {
    if (body.action === "blacklist") {
      if (!body.ip) return NextResponse.json({ error: "ip required" }, { status: 400 });
      await setIpBlacklist(body.ip, body.blocked !== false);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "command") {
      const command = body.command as SessionCommand;
      if (!command?.action) return NextResponse.json({ error: "command required" }, { status: 400 });
      await issueSessionCommand({ sessionId: body.sessionId, visitorId: body.visitorId }, command);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "clear-logs") {
      const { deleted } = await clearAnalyticsLogs();
      return NextResponse.json({ ok: true, deleted });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
