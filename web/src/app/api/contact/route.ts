import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/mongodb";
import { enforcePublicFormRateLimit } from "@/lib/rate-limit";
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

  const { name, email, phone, subject, message, consent } = body;
  const normalizedName = String(name ?? "").trim();
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);
  const normalizedSubject = String(subject ?? "").trim();
  const normalizedMessage = String(message ?? "").trim();

  if (!consent) {
    return NextResponse.json({ error: "Consent required" }, { status: 400 });
  }
  if (!normalizedName || !normalizedMessage) {
    return NextResponse.json({ error: "Name and message required" }, { status: 400 });
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

  const rateLimit = await enforcePublicFormRateLimit(req, "contact-form");
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: rateLimit.error }, { status: rateLimit.status });
  }

  try {
    const db = await getDb();
    const now = new Date().toISOString();

    const existingContact =
      normalizedEmail && normalizedPhone
        ? await db.collection("contacts").findOne({
            $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
          })
        : normalizedEmail
          ? await db.collection("contacts").findOne({ email: normalizedEmail })
          : await db.collection("contacts").findOne({ phone: normalizedPhone });

    const payload = {
      name: normalizedName,
      email: normalizedEmail || undefined,
      phone: normalizedPhone || undefined,
      subject: normalizedSubject || undefined,
      message: normalizedMessage,
      source: "contact-form",
      messageRead: false,
      messageReadAt: undefined,
      subscribed: true,
      updatedAt: now,
    };

    if (existingContact && typeof existingContact === "object" && "id" in existingContact) {
      await db.collection("contacts").updateOne(
        { id: String(existingContact.id) },
        { $set: payload }
      );
    } else {
      await db.collection("contacts").insertOne({
        id: randomUUID(),
        createdAt: now,
        ...payload,
      });
    }
  } catch (err) {
    console.error("Contact save error:", err);
    return NextResponse.json({ error: "Failed to save contact" }, { status: 500 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(rateLimit.cookieName, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return response;
}
