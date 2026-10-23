import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { recordOperation } from "@/lib/operations";
import {
  refreshProjectVideoViewsWithReport,
} from "@/lib/db";

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const target = body?.target;

  if (target === "project-views") {
    const report = await recordOperation("project-metrics", () => refreshProjectVideoViewsWithReport());
    return NextResponse.json(report);
  }

  return NextResponse.json({ error: "Invalid target" }, { status: 400 });
}
