import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getR2Stats } from "@/lib/r2";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await getR2Stats());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
