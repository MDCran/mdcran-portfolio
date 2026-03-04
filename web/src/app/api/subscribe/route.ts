import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/mongodb";
import {
  isValidEmail,
  isValidPhoneNumber,
  normalizeEmail,
  normalizePhone,
} from "@/lib/contact-validation";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { email, phone, name, consent, source } = body;
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);

  if (!consent) {
    return NextResponse.json({ error: "Consent required" }, { status: 400 });
  }

  if (!normalizedEmail && !normalizedPhone) {
    return NextResponse.json({ error: "Email or phone required" }, { status: 400 });
  }
  if (normalizedEmail && !isValidEmail(normalizedEmail)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }
  if (normalizedPhone && !isValidPhoneNumber(normalizedPhone)) {
    return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });
  }

  try {
    const db = await getDb();
    const now = new Date().toISOString();
    const normalizedSource =
      source === "home-page" || source === "subscribe-page"
        ? source
        : "subscribe-form";
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
          source: normalizedSource,
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

  return NextResponse.json({ success: true, message: "Saved subscription" });
}
