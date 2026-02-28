import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import type { TapRecord } from "@/lib/types";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const taps = (await db
    .collection("taps")
    .find({}, { projection: { _id: 0 } })
    .toArray()) as unknown as TapRecord[];

  return NextResponse.json(taps);
}
