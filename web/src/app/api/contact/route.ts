import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/mongodb";
import {
  isValidEmail,
  isValidPhoneNumber,
  normalizeEmail,
  normalizePhone,
} from "@/lib/contact-validation";
import { notifyContactForm } from "@/lib/discord";
import { apiRateLimit, clientIp } from "@/lib/api-rate-limit";
import { findIdentityBySerial } from "@/lib/identity";
import { parseUserAgent } from "@/lib/ua";
import { sanitizeName, sanitizeText } from "@/lib/sanitize";

export async function POST(req: NextRequest) {
  const allowed = await apiRateLimit("contact", clientIp(req), 5, 60 * 60 * 1000);
  if (!allowed) return NextResponse.json({ error: "Too many requests — please try again later." }, { status: 429 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { email, phone, consent, sessionId, utmSource, referrer, referrerDomain, country, fingerprint } = body as Record<string, unknown>;
  const serial = typeof body.serial === "string" ? body.serial.slice(0, 64) : "";
  const normalizedName    = sanitizeName(body.name, 100);
  const normalizedSubject = sanitizeText(body.subject, 300);
  const normalizedMessage = sanitizeText(body.message, 5000);
  const normalizedEmail = normalizeEmail(typeof email === "string" ? email : "");
  const normalizedPhone = normalizePhone(typeof phone === "string" ? phone : "");

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

  try {
    const db = await getDb();
    const now = new Date().toISOString();

    const ip = clientIp(req);
    const idn = serial ? await findIdentityBySerial(serial).catch(() => null) : null;
    const identityId = idn?.id ?? null;

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
      serial: serial || undefined,
      ip: ip ?? null,
      identityId,
      country: typeof country === "string" ? country.slice(0, 64) : undefined,
      utmSource: typeof utmSource === "string" ? utmSource.slice(0, 200) : undefined,
      referrerDomain: typeof referrerDomain === "string" ? referrerDomain.slice(0, 200) : undefined,
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

  // Fire-and-forget Discord notification with full session context.
  const ip = clientIp(req);
  const ua = req.headers.get("user-agent") ?? "";
  const { browser, os } = parseUserAgent(ua);
  void notifyContactForm({
    name: normalizedName,
    email: normalizedEmail || null,
    phone: normalizedPhone || null,
    subject: normalizedSubject || null,
    message: normalizedMessage,
    ip,
    country: req.headers.get("cf-ipcountry") ?? null,
    browser,
    os,
    sessionId: typeof sessionId === "string" ? sessionId : null,
    utmSource: typeof utmSource === "string" ? utmSource : null,
    referrer: typeof referrer === "string" ? referrer : null,
    fingerprint: typeof fingerprint === "string" ? fingerprint : null,
  });

  return NextResponse.json({ success: true });
}
