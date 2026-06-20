import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getIdentities, renameIdentity, deleteIdentity, removeDeviceFromIdentity, mergeIdentities, createIdentity, moveDeviceToIdentity } from "@/lib/identity";
import { notifyIdentityEvent } from "@/lib/discord";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ identities: await getIdentities() });
}

export async function PUT(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null) as { id?: string; name?: string } | null;
  if (!body?.id || typeof body.name !== "string") return NextResponse.json({ error: "Invalid" }, { status: 400 });
  await renameIdentity(body.id, body.name);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null) as { id?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  await deleteIdentity(body.id);
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null) as { action?: string; id?: string; serial?: string; targetId?: string; toId?: string; sourceIds?: string[]; name?: string } | null;
  if (body?.action === "create" && typeof body.name === "string" && body.name.trim()) {
    const identity = await createIdentity(body.name);
    void notifyIdentityEvent({
      id: identity.id,
      name: identity.name,
      deviceCount: identity.devices.length,
      origin: "admin",
      createdAt: identity.createdAt,
      isNew: true,
    });
    return NextResponse.json({ ok: true, identity });
  }
  if (body?.action === "remove-device" && body.id && body.serial) {
    await removeDeviceFromIdentity(body.id, body.serial);
    return NextResponse.json({ ok: true });
  }
  if (body?.action === "move-device" && body.serial && body.toId) {
    const moved = await moveDeviceToIdentity(body.serial, body.toId);
    if (!moved) return NextResponse.json({ error: "Target identity not found" }, { status: 404 });
    return NextResponse.json({ ok: true, identity: moved });
  }
  if (body?.action === "merge" && body.targetId && Array.isArray(body.sourceIds)) {
    const merged = await mergeIdentities(body.targetId, body.sourceIds);
    return NextResponse.json({ ok: true, merged });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
