import { NextRequest, NextResponse } from "next/server";
import {
  getVisitorCountsByCountry,
  getVisitorAdjustments,
  addVisitorAdjustment,
  deleteVisitorAdjustment,
  getVisitorMultiplier,
  setVisitorMultiplier,
} from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";

import { adminError } from "@/lib/admin-content";
import { readAdminObject, visitorAdjustment, adminString } from "@/lib/admin-api-validation";
import { AdminDataError } from "@/lib/content-validation";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const [counts, adjustments, multiplier] = await Promise.all([getVisitorCountsByCountry(), getVisitorAdjustments(), getVisitorMultiplier()]);
    return NextResponse.json({ counts, adjustments, multiplier });
  } catch (error) { return adminError(error); }
}
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await readAdminObject(req);
    if (body.type === "multiplier") {
      const multiplier = body.multiplier;
      if (typeof multiplier !== "number" || !Number.isFinite(multiplier) || multiplier < 1 || multiplier > Number.MAX_SAFE_INTEGER) throw new AdminDataError("Invalid multiplier", 400);
      await setVisitorMultiplier(multiplier);
      return NextResponse.json({ success: true, multiplier });
    }
    if (body.type !== undefined) throw new AdminDataError("Invalid type", 400);
    const adjustment = visitorAdjustment(body);
    await addVisitorAdjustment(adjustment);
    return NextResponse.json({ success: true, adjustment });
  } catch (error) { return adminError(error); }
}
export async function DELETE(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await deleteVisitorAdjustment(adminString(req.nextUrl.searchParams.get("id"), "id"));
    return NextResponse.json({ success: true });
  } catch (error) { return adminError(error); }
}
