import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { deleteR2Asset, listR2Assets, publicUrlForKey, renameR2Asset, uploadR2Asset } from "@/lib/r2";
import { updateR2AssetReferences } from "@/lib/db";

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const prefix = req.nextUrl.searchParams.get("prefix") ?? undefined;
    const search = req.nextUrl.searchParams.get("search") ?? undefined;
    return NextResponse.json(await listR2Assets({ prefix, search }));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list R2 assets." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const prefix = formData.get("prefix");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    const uploaded = await uploadR2Asset(file, {
      prefix: typeof prefix === "string" ? prefix : "",
    });

    return NextResponse.json(uploaded);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload file." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { key?: string };
    if (!body.key?.trim()) {
      return NextResponse.json({ error: "Key is required." }, { status: 400 });
    }

    await deleteR2Asset(body.key);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete file." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { oldKey?: string; newKey?: string };
    if (!body.oldKey?.trim() || !body.newKey?.trim()) {
      return NextResponse.json({ error: "oldKey and newKey are required." }, { status: 400 });
    }

    const oldKey = body.oldKey.trim();
    const newKey = body.newKey.trim();

    if (oldKey === newKey) {
      return NextResponse.json({ error: "oldKey and newKey must be different." }, { status: 400 });
    }

    await renameR2Asset(oldKey, newKey);
    const updatedRefs = await updateR2AssetReferences(publicUrlForKey(oldKey), publicUrlForKey(newKey));
    return NextResponse.json({ ok: true, updatedRefs });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to rename file." },
      { status: 500 }
    );
  }
}
