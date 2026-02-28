import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { isAdminAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  try {
    const db = await getDb();
    if (!id) {
      // Admin only: return all download counts
      if (!(await isAdminAuthenticated())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const docs = await db.collection("downloads").find({}).toArray();
      const all: Record<string, number> = {};
      for (const d of docs) all[d.id] = d.count;
      return NextResponse.json(all);
    }
    const doc = await db.collection("downloads").findOne({ id });
    return NextResponse.json({ id, count: doc?.count ?? 0 });
  } catch {
    return NextResponse.json({ id: id ?? "", count: 0 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { id } = body;
  try {
    const db = await getDb();
    const result = await db.collection("downloads").findOneAndUpdate(
      { id },
      { $inc: { count: 1 }, $setOnInsert: { id } },
      { upsert: true, returnDocument: "after" }
    );
    return NextResponse.json({ id, count: result?.count ?? 1 });
  } catch {
    return NextResponse.json({ id, count: 0 });
  }
}
