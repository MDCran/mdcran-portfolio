import { NextResponse } from "next/server";
import { getStatusServices } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";

interface PingResult {
  id: string;
  reachable: boolean;
  latencyMs: number | null;
  error?: string;
}

async function pingUrl(url: string, timeoutMs = 8000): Promise<{ reachable: boolean; latencyMs: number | null; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const start = Date.now();
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      cache: "no-store",
      redirect: "follow",
    });
    const latencyMs = Date.now() - start;
    clearTimeout(timer);
    // Consider 2xx and 3xx as reachable
    return { reachable: res.status < 400, latencyMs };
  } catch (err) {
    clearTimeout(timer);
    const message = err instanceof Error ? err.message : "Unknown error";
    return { reachable: false, latencyMs: null, error: message };
  }
}

/** POST /api/admin/status/ping — pings all services with a pingUrl and returns results */
export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const services = await getStatusServices();
  const pingable = services.filter((s) => s.pingUrl && !s.defunct);

  const results: PingResult[] = await Promise.all(
    pingable.map(async (s) => {
      const result = await pingUrl(s.pingUrl!);
      return { id: s.id, ...result };
    })
  );

  return NextResponse.json({ results });
}
