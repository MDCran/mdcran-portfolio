import { NextRequest, NextResponse } from "next/server";
import { getProjects, saveProjects, invalidateProjectVideoCache } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await getProjects();
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await req.json();
  await saveProjects(data);
  // Clear video view cache so new videos get their counts on next page load
  await invalidateProjectVideoCache();
  return NextResponse.json({ ok: true });
}
