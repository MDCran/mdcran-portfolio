import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getDb } from "@/lib/mongodb";

// Twilio (optional)
let twilioClient: {
  messages: { create: (opts: { body: string; from: string; to: string }) => Promise<void> };
} | null = null;

async function getTwilio() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return null;
  if (twilioClient) return twilioClient;
  const { default: twilio } = await import("twilio");
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) as unknown as NonNullable<typeof twilioClient>;
  return twilioClient;
}

function createTransporter() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { email, phone, name, consent } = body;
  const isDirectSmsShare = Boolean(phone && body.customMessage && !email);

  if (!isDirectSmsShare && !consent) {
    return NextResponse.json({ error: "Consent required" }, { status: 400 });
  }

  if (!email && !phone) {
    return NextResponse.json({ error: "Email or phone required" }, { status: 400 });
  }

  if (!isDirectSmsShare) {
    try {
      const db = await getDb();
      const now = new Date().toISOString();
      const identifier = crypto.randomUUID();
      const existing = (await db.collection("contacts").findOne({
        $or: [{ email: email || null }, { phone: phone || null }].filter(
          (entry) => entry.email || entry.phone
        ),
      })) as { id?: string; createdAt?: string } | null;

      await db.collection("contacts").updateOne(
        { id: existing?.id ?? identifier },
        {
          $set: {
            name: name || "Subscriber",
            email: email || undefined,
            phone: phone || undefined,
            subject: "Subscription",
            message: body.customMessage || "Subscribed to updates.",
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
    }
  }

  const errors: string[] = [];
  const successes: string[] = [];

  // ── Email ─────────────────────────────────────────────────
  if (email) {
    const transporter = createTransporter();
    if (transporter) {
      try {
        const unsubLink = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://mdcran.com"}/unsubscribe?email=${encodeURIComponent(email)}`;
        await transporter.sendMail({
          from: `"MDCran" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
          to: email,
          subject: "You're on the list — MDCran",
          html: `
            <div style="background:#0a0a0a;color:#f2f2f2;font-family:'Courier New',monospace;padding:40px;max-width:600px;margin:0 auto">
              <div style="border-left:3px solid #ef4242;padding-left:20px;margin-bottom:30px">
                <h1 style="font-size:28px;margin:0;letter-spacing:0.1em;color:#fff">MDCRAN</h1>
                <p style="color:#ef4242;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin:5px 0 0">Independent Contractor</p>
              </div>
              <p style="font-size:14px;color:#f2f2f2;line-height:1.6">
                Hey${name ? ` ${name}` : ""}! You're now subscribed to updates from MDCran.
              </p>
              <p style="font-size:13px;color:#888;line-height:1.6;margin-top:16px">
                You'll receive news about new projects, events, and releases. No spam, ever.
              </p>
              <div style="margin-top:32px;padding-top:20px;border-top:1px solid #222;font-size:11px;color:#444">
                Don't want these emails? <a href="${unsubLink}" style="color:#ef4242">Unsubscribe</a>
              </div>
            </div>
          `,
        });

        // Also send a notification to the site owner
        await transporter.sendMail({
          from: `"MDCran Site" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
          to: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "",
          subject: `New subscriber: ${email}`,
          text: `New subscriber:\n\nName: ${name ?? "N/A"}\nEmail: ${email}\nPhone: ${phone ?? "N/A"}\n`,
        });

        successes.push("email");
      } catch (err) {
        console.error("Email error:", err);
        errors.push("email");
      }
    } else {
      errors.push("email_not_configured");
    }
  }

  // ── SMS ───────────────────────────────────────────────────
  if (phone) {
    const twilio = await getTwilio();
    if (twilio) {
      try {
        await twilio.messages.create({
          body: isDirectSmsShare
            ? body.customMessage
            : `Hey${name ? ` ${name}` : ""}! You're now subscribed to MDCran updates. Text STOP to opt out or visit: ${process.env.NEXT_PUBLIC_SITE_URL ?? "https://mdcran.com"}/unsubscribe`,
          from: process.env.TWILIO_PHONE_NUMBER ?? "",
          to: phone,
        });
        successes.push("sms");
      } catch (err) {
        console.error("SMS error:", err);
        errors.push("sms");
      }
    } else {
      errors.push("sms_not_configured");
    }
  }

  return NextResponse.json({
    success: successes.length > 0,
    successes,
    errors,
    message:
      successes.length > 0
        ? isDirectSmsShare
          ? `Sent via ${successes.join(" & ")}`
          : `Subscribed via ${successes.join(" & ")}`
        : "Could not process subscription",
  });
}
