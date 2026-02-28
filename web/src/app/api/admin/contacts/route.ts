import { NextRequest, NextResponse } from "next/server";
import { getContactSubmissions, saveContactSubmissions } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getContactSubmissions();
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await req.json();
  await saveContactSubmissions(data);
  return NextResponse.json({ ok: true });
}
