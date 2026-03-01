import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  deleteRateLimitRecord,
  getRateLimitRecords,
  updateRateLimitRecord,
} from "@/lib/rate-limit";
import type { RateLimitRecord } from "@/lib/types";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getRateLimitRecords();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const action = body?.action;

  if (action === "reset") {
    const record = body?.record as RateLimitRecord | undefined;
    if (!record?.id) {
      return NextResponse.json({ error: "Record required" }, { status: 400 });
    }

    await updateRateLimitRecord({
      ...record,
      count: 0,
      blockedCount: 0,
      lastBlockedAt: undefined,
      notes: "Reset by admin",
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "clear-pii") {
    const record = body?.record as RateLimitRecord | undefined;
    if (!record?.id) {
      return NextResponse.json({ error: "Record required" }, { status: 400 });
    }

    await updateRateLimitRecord({
      ...record,
      ip: undefined,
      browser: undefined,
      userAgent: undefined,
      city: undefined,
      region: undefined,
      country: undefined,
      notes: "PII cleared by admin",
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  await deleteRateLimitRecord(id);
  return NextResponse.json({ ok: true });
}
