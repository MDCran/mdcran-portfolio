import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createHash, randomUUID } from "crypto";
import { getDb } from "@/lib/mongodb";

let twilioClient: {
  messages: { create: (opts: { body: string; from: string; to: string }) => Promise<void> };
} | null = null;

async function getTwilio() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return null;
  if (twilioClient) return twilioClient;
  const { default: twilio } = await import("twilio");
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  ) as unknown as NonNullable<typeof twilioClient>;
  return twilioClient;
}

function createTransporter() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { name, email, phone, subject, message, consent, submissionId } = body;

  if (!consent) {
    return NextResponse.json({ error: "Consent required" }, { status: 400 });
  }
  if (!name || !message) {
    return NextResponse.json({ error: "Name and message required" }, { status: 400 });
  }
  if (!email && !phone) {
    return NextResponse.json({ error: "Email or phone required" }, { status: 400 });
  }

  try {
    const db = await getDb();
    const now = new Date().toISOString();
    const normalizedName = String(name).trim();
    const normalizedEmail = email ? String(email).trim().toLowerCase() : "";
    const normalizedPhone = phone ? String(phone).trim() : "";
    const normalizedSubject = subject ? String(subject).trim() : "";
    const normalizedMessage = String(message).trim();
    const submissionKey =
      typeof submissionId === "string" && submissionId.trim()
        ? submissionId.trim()
        : createHash("sha256")
            .update(
              JSON.stringify({
                source: "contact-form",
                name: normalizedName,
                email: normalizedEmail,
                phone: normalizedPhone,
                subject: normalizedSubject,
                message: normalizedMessage,
              })
            )
            .digest("hex");

    await db.collection("contacts").createIndex(
      { submissionKey: 1 },
      {
        unique: true,
        partialFilterExpression: { submissionKey: { $exists: true } },
      }
    );

    const payload = {
      name: normalizedName,
      email: normalizedEmail || undefined,
      phone: normalizedPhone || undefined,
      subject: normalizedSubject || undefined,
      message: normalizedMessage,
      source: "contact-form",
      subscribed: Boolean(consent),
      submissionKey,
      updatedAt: now,
    };

    try {
      await db.collection("contacts").updateOne(
        { submissionKey },
        {
          $setOnInsert: {
            id: randomUUID(),
            createdAt: now,
          },
          $set: payload,
        },
        { upsert: true }
      );
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: number }).code === 11000
      ) {
        await db.collection("contacts").updateOne(
          { submissionKey },
          { $set: payload }
        );
      } else {
        throw error;
      }
    }
  } catch (err) {
    console.error("Contact save error:", err);
  }

  const errors: string[] = [];

  // ── Send email notification to site owner ─────────────────
  if (process.env.SMTP_HOST) {
    const transporter = createTransporter();
    if (transporter) {
      try {
        const ownerEmail = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "";
        await transporter.sendMail({
          from: `"MDCran Site" <${ownerEmail}>`,
          to: ownerEmail,
          replyTo: email ?? undefined,
          subject: `Contact: ${subject ?? "New message"} — from ${name}`,
          html: `
            <div style="background:#0a0a0a;color:#f2f2f2;font-family:'Courier New',monospace;padding:40px;max-width:600px;margin:0 auto">
              <div style="border-left:3px solid #ef4242;padding-left:20px;margin-bottom:30px">
                <h1 style="font-size:22px;margin:0;letter-spacing:0.1em;color:#fff">New Contact Message</h1>
                <p style="color:#ef4242;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin:5px 0 0">MDCran</p>
              </div>
              <table style="border-collapse:collapse;width:100%;margin-bottom:24px">
                <tr><td style="color:#888;font-size:12px;padding:6px 0;width:100px">Name</td><td style="color:#fff;font-size:13px">${name}</td></tr>
                ${email ? `<tr><td style="color:#888;font-size:12px;padding:6px 0">Email</td><td style="color:#fff;font-size:13px"><a href="mailto:${email}" style="color:#ef4242">${email}</a></td></tr>` : ""}
                ${phone ? `<tr><td style="color:#888;font-size:12px;padding:6px 0">Phone</td><td style="color:#fff;font-size:13px">${phone}</td></tr>` : ""}
                ${subject ? `<tr><td style="color:#888;font-size:12px;padding:6px 0">Subject</td><td style="color:#fff;font-size:13px">${subject}</td></tr>` : ""}
              </table>
              <div style="background:#111;border:1px solid #222;padding:20px;border-radius:4px;font-size:13px;line-height:1.7;color:#ccc;white-space:pre-wrap">${message}</div>
            </div>
          `,
        });

        // Auto-reply to sender
        if (email) {
          await transporter.sendMail({
            from: `"MDCran" <${ownerEmail}>`,
            to: email,
            subject: "Got your message — MDCran",
            html: `
              <div style="background:#0a0a0a;color:#f2f2f2;font-family:'Courier New',monospace;padding:40px;max-width:600px;margin:0 auto">
                <div style="border-left:3px solid #ef4242;padding-left:20px;margin-bottom:30px">
                  <h1 style="font-size:22px;margin:0;letter-spacing:0.1em;color:#fff">Message Received</h1>
                  <p style="color:#ef4242;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin:5px 0 0">MDCran</p>
                </div>
                <p style="font-size:14px;color:#f2f2f2;line-height:1.6">Hey ${name}, thanks for reaching out! I'll get back to you as soon as possible.</p>
                <p style="font-size:13px;color:#666;line-height:1.6;margin-top:16px">You can also reply directly to this email.</p>
              </div>
            `,
          });
        }
      } catch (err) {
        console.error("Contact email error:", err);
        errors.push("email");
      }
    }
  }

  // ── SMS notification to owner ──────────────────────────────
  if (phone && process.env.TWILIO_ACCOUNT_SID) {
    const twilio = await getTwilio();
    if (twilio) {
      try {
        await twilio.messages.create({
          body: `New contact from ${name}${phone ? ` (${phone})` : ""}: ${(message as string).slice(0, 120)}`,
          from: process.env.TWILIO_PHONE_NUMBER ?? "",
          to: phone,
        });
      } catch (err) {
        console.error("Contact SMS error:", err);
        errors.push("sms");
      }
    }
  }

  return NextResponse.json({ success: true, errors });
}
