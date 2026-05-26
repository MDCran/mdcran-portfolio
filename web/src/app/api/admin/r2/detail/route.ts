import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { headR2Asset, getR2Meta, saveR2Meta, presignR2Get, replaceR2Asset, classifyKind, publicUrlForKey, type R2AssetMeta } from "@/lib/r2";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* GET ?key=... — head metadata + stored meta + serving URL (presigned if private). */
export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });
  try {
    const [head, meta] = await Promise.all([headR2Asset(key), getR2Meta(key)]);
    const url = meta.visibility === "private" ? await presignR2Get(key) : publicUrlForKey(key);
    return NextResponse.json({ ...head, meta, kind: classifyKind(key), url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}

/* PATCH — save alt / status / visibility. */
export async function PATCH(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await req.json()) as { key?: string } & Partial<R2AssetMeta>;
    if (!body.key) return NextResponse.json({ error: "key required" }, { status: 400 });
    const { key, ...patch } = body;
    const meta = await saveR2Meta(key, patch);
    return NextResponse.json({ ok: true, meta });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}

/* POST — replace the file at an existing key (multipart). */
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const form = await req.formData();
    const key = form.get("key");
    const file = form.get("file");
    if (typeof key !== "string" || !key) return NextResponse.json({ error: "key required" }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });
    const result = await replaceR2Asset(key, file);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
