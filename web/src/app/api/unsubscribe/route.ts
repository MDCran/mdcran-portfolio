import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

function normalizeIdentifier(value: string) {
  const trimmed = value.trim();
  const normalizedEmail = trimmed.toLowerCase();
  const emailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

  return {
    raw: trimmed,
    email: emailLike ? normalizedEmail : "",
    phone: emailLike ? "" : trimmed,
  };
}

async function unsubscribeByIdentifier(identifier: string) {
  const { email, phone } = normalizeIdentifier(identifier);
  if (!email && !phone) {
    return { success: false, message: "Enter an email or phone number." };
  }

  const db = await getDb();
  const existing = await db.collection("contacts").findOne(
    email ? { email } : { phone },
    { projection: { _id: 0, id: 1, subscribed: 1 } }
  );

  if (!existing || typeof existing !== "object" || !("id" in existing)) {
    return { success: false, message: "No subscribed record was found for that contact." };
  }

  if (!("subscribed" in existing) || !existing.subscribed) {
    return { success: false, message: "That contact is not currently subscribed." };
  }

  await db.collection("contacts").updateOne(
    { id: String(existing.id) },
    {
      $set: {
        subscribed: false,
        updatedAt: new Date().toISOString(),
      },
    }
  );

  return { success: true, message: "You've been successfully unsubscribed." };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const identifier = typeof body?.identifier === "string" ? body.identifier : "";
  const result = await unsubscribeByIdentifier(identifier);

  if (!result.success) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}

export async function GET(req: NextRequest) {
  const identifier =
    req.nextUrl.searchParams.get("identifier") ||
    req.nextUrl.searchParams.get("email") ||
    req.nextUrl.searchParams.get("phone") ||
    "";

  const result = await unsubscribeByIdentifier(identifier);

  if (!result.success) {
    return NextResponse.redirect(
      new URL(`/unsubscribe?status=error&message=${encodeURIComponent(result.message)}`, req.url)
    );
  }

  return NextResponse.redirect(
    new URL(`/unsubscribe?status=success&message=${encodeURIComponent(result.message)}`, req.url)
  );
}
