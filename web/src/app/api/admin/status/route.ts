import { NextRequest, NextResponse } from "next/server";
import { getStatusServices, getStatusIncidents } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";
import { adminError } from "@/lib/admin-content";
import { readAdminObject } from "@/lib/admin-api-validation";
import { writeStatus, removeStatus } from "@/lib/admin-status";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const [services, incidents] = await Promise.all([getStatusServices(), getStatusIncidents()]);
    return NextResponse.json({ services, incidents });
  } catch (error) { return adminError(error); }
}
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json(await writeStatus(await readAdminObject(req), true)); }
  catch (error) { return adminError(error); }
}
export async function PUT(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json(await writeStatus(await readAdminObject(req), false)); }
  catch (error) { return adminError(error); }
}
export async function DELETE(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await removeStatus(req.nextUrl.searchParams.get("type"), req.nextUrl.searchParams.get("id"));
    return NextResponse.json({ success: true });
  } catch (error) { return adminError(error); }
}
