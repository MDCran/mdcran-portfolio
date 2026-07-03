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

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [counts, adjustments, multiplier] = await Promise.all([
    getVisitorCountsByCountry(),
    getVisitorAdjustments(),
    getVisitorMultiplier(),
  ]);
  return NextResponse.json({ counts, adjustments, multiplier });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  // Multiplier update
  if (body.type === "multiplier") {
    const m = Number(body.multiplier);
    if (!isFinite(m) || m < 1) return NextResponse.json({ error: "Invalid multiplier" }, { status: 400 });
    await setVisitorMultiplier(m);
    return NextResponse.json({ success: true, multiplier: m });
  }

  const { country, countryName, addedCount } = body;
  if (!country || !countryName || !addedCount || addedCount < 1) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const adj = {
    id: `adj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    country,
    countryName,
    addedCount: Number(addedCount),
    createdAt: new Date().toISOString(),
  };
  await addVisitorAdjustment(adj);
  return NextResponse.json({ success: true, adjustment: adj });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await deleteVisitorAdjustment(id);
  return NextResponse.json({ success: true });
}
