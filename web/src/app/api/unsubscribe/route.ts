import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

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

  const { email, phone } = body;
  if (!email && !phone) {
    return NextResponse.json({ error: "Email or phone required" }, { status: 400 });
  }

  const successes: string[] = [];

  // Confirm unsubscribe via email
  if (email) {
    const transporter = createTransporter();
    if (transporter) {
      try {
        await transporter.sendMail({
          from: `"MDCran" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
          to: email,
          subject: "You've been unsubscribed — MDCran",
          html: `
            <div style="background:#0a0a0a;color:#f2f2f2;font-family:'Courier New',monospace;padding:40px;max-width:600px;margin:0 auto">
              <h1 style="font-size:22px;letter-spacing:0.1em;color:#fff;margin-bottom:16px">Unsubscribed</h1>
              <p style="color:#888;font-size:13px;line-height:1.6">
                You've been successfully removed from the MDCran mailing list. You won't receive any more emails from us.
              </p>
              <p style="color:#555;font-size:12px;margin-top:24px">
                Changed your mind? Visit <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://mdcran.com"}" style="color:#ef4242">mdcran.com</a> to resubscribe.
              </p>
            </div>
          `,
        });

        // Notify owner
        await transporter.sendMail({
          from: `"MDCran Site" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
          to: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "",
          subject: `Unsubscribe request: ${email ?? phone}`,
          text: `Unsubscribe request:\nEmail: ${email ?? "N/A"}\nPhone: ${phone ?? "N/A"}\n`,
        });

        successes.push("email");
      } catch (err) {
        console.error("Unsubscribe email error:", err);
      }
    }
  }

  return NextResponse.json({
    success: true,
    message: "Successfully unsubscribed.",
  });
}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (email) {
    await POST(
      new NextRequest(req.url, {
        method: "POST",
        body: JSON.stringify({ email }),
        headers: { "Content-Type": "application/json" },
      })
    );
    return NextResponse.redirect(
      new URL(`/unsubscribed?email=${encodeURIComponent(email)}`, req.url)
    );
  }
  return NextResponse.json({ error: "No email provided" }, { status: 400 });
}
