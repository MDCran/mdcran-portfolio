import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
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

export async function PUT(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  const type = body?.type === "article" ? "article" : body?.type === "project" ? "project" : null;
  const count = Number(body?.count);

  if (!id || !type || Number.isNaN(count) || count < 0) {
    return NextResponse.json({ error: "Invalid tap update payload" }, { status: 400 });
  }

  const db = await getDb();
  const nextRecord: TapRecord = {
    id,
    type,
    count: Math.floor(count),
  };

  await db.collection("taps").updateOne(
    { id },
    { $set: nextRecord },
    { upsert: true }
  );

  return NextResponse.json({ ok: true, tap: nextRecord });
}
