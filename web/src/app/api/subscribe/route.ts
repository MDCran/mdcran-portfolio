import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/mongodb";
import { enforcePublicFormRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { email, phone, name, consent } = body;

  if (!consent) {
    return NextResponse.json({ error: "Consent required" }, { status: 400 });
  }

  if (!email && !phone) {
    return NextResponse.json({ error: "Email or phone required" }, { status: 400 });
  }

  const rateLimit = await enforcePublicFormRateLimit(req, "subscribe-form");
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: rateLimit.error }, { status: rateLimit.status });
  }

  try {
    const db = await getDb();
    const now = new Date().toISOString();
    const normalizedEmail = email ? String(email).trim().toLowerCase() : "";
    const normalizedPhone = phone ? String(phone).trim() : "";
    const matchClauses: Array<{ email: string } | { phone: string }> = [];
    if (normalizedEmail) {
      matchClauses.push({ email: normalizedEmail });
    }
    if (normalizedPhone) {
      matchClauses.push({ phone: normalizedPhone });
    }

    const existing = (await db.collection("contacts").findOne(
      matchClauses.length === 1 ? matchClauses[0] : { $or: matchClauses }
    )) as { id?: string; createdAt?: string } | null;

    await db.collection("contacts").updateOne(
      { id: existing?.id ?? randomUUID() },
      {
        $set: {
          name: name || "Subscriber",
          email: normalizedEmail || undefined,
          phone: normalizedPhone || undefined,
          subject: "Subscription",
          message: "Subscribed to updates.",
          source: "subscribe-form",
          subscribed: true,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        },
      },
      { upsert: true }
    );
  } catch (err) {
    console.error("Subscribe save error:", err);
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
  }

  const response = NextResponse.json({
    success: true,
    message: "Saved subscription",
  });
  response.cookies.set(rateLimit.cookieName, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return response;
}
