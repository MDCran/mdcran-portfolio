import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

function getRandomStartingTapCount() {
  return Math.floor(Math.random() * 301) + 100;
}

async function ensureStartingTapCount(id: string, type?: string) {
  const db = await getDb();
  const taps = db.collection("taps");
  const existing = await taps.findOne<{ id: string; count?: number; type?: string }>({ id });

  if (existing) {
    return { db, record: existing };
  }

  if (type !== "article" && type !== "project") {
    return { db, record: null };
  }

  const result = await taps.findOneAndUpdate(
    { id },
    {
      $setOnInsert: {
        id,
        type,
        count: getRandomStartingTapCount(),
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  return { db, record: result ?? null };
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const type = req.nextUrl.searchParams.get("type");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const { record } = await ensureStartingTapCount(id, type ?? undefined);
    return NextResponse.json({ id, count: record?.count ?? 0 });
  } catch {
    return NextResponse.json({ id, count: 0 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { id, type } = body;
  try {
    const { db } = await ensureStartingTapCount(id, type);
    const result = await db.collection("taps").findOneAndUpdate(
      { id },
      {
        $inc: { count: 1 },
        $set: {
          ...(type === "article" || type === "project" ? { type } : {}),
        },
        $setOnInsert: { id },
      },
      { upsert: true, returnDocument: "after" }
    );
    return NextResponse.json({ id, count: result?.count ?? 1 });
  } catch {
    return NextResponse.json({ id, count: 0 });
  }
}
