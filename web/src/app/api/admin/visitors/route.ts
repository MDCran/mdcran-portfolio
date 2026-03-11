import { NextRequest, NextResponse } from "next/server";
import {
  getVisitorCountsByCountry,
  getVisitorAdjustments,
  addVisitorAdjustment,
  deleteVisitorAdjustment,
} from "@/lib/db";

function isAdmin(req: NextRequest): boolean {
  const token = req.cookies.get("mdcran_admin_token")?.value;
  return !!token && token.split(".").length === 3;
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [counts, adjustments] = await Promise.all([
    getVisitorCountsByCountry(),
    getVisitorAdjustments(),
  ]);
  return NextResponse.json({ counts, adjustments });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
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
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await deleteVisitorAdjustment(id);
  return NextResponse.json({ success: true });
}
