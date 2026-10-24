import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { deleteRateLimitRecord, getRateLimitRecords, applyRateLimitAdminAction } from "@/lib/rate-limit";
import { adminError } from "@/lib/admin-content";
import { adminObject, adminString, readAdminObject } from "@/lib/admin-api-validation";
import { AdminDataError } from "@/lib/content-validation";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json(await getRateLimitRecords()); }
  catch (error) { return adminError(error); }
}
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await readAdminObject(req);
    if (body.action !== "reset" && body.action !== "clear-pii") throw new AdminDataError("Invalid action", 400);
    const id = adminString(body.id ?? adminObject(body.record).id, "id");
    await applyRateLimitAdminAction(id, body.action);
    return NextResponse.json({ ok: true });
  } catch (error) { return adminError(error); }
}
export async function DELETE(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await deleteRateLimitRecord(adminString((await readAdminObject(req)).id, "id"));
    return NextResponse.json({ ok: true });
  } catch (error) { return adminError(error); }
}
