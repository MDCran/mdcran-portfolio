import { NextRequest, NextResponse } from "next/server";
import { signAdminToken, COOKIE_NAME_EXPORT } from "@/lib/auth";
import { verifyAdminPassword, getAdminTotp, setAdminTotpSecret, enableAdminTotp } from "@/lib/db";
import { generateTotpSecret, verifyTotp, otpauthUri } from "@/lib/totp";
import QRCode from "qrcode";

function issue(): NextResponse {
  const token = signAdminToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME_EXPORT, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 86400,
    path: "/",
  });
  return res;
}

export async function POST(req: NextRequest) {
  const { password, code } = await req.json();
  if (!password) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  // Password gate first — only the password holder can ever reach TOTP setup or login.
  const valid = await verifyAdminPassword(password);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  let totp;
  try {
    totp = await getAdminTotp();
  } catch {
    return NextResponse.json({ error: "Auth store unavailable" }, { status: 503 });
  }

  try {
    if (!totp.enabled) {
      // ── First-time 2FA setup ──
      const secret = totp.secret ?? generateTotpSecret();
      if (!totp.secret) await setAdminTotpSecret(secret);
      if (!code) {
        // Hand back a QR + secret so the admin can add it to their authenticator, then submit a code.
        const qr = await QRCode.toDataURL(otpauthUri(secret), { margin: 1, width: 220 });
        return NextResponse.json({ setup: true, qr, secret });
      }
      if (!verifyTotp(secret, String(code))) {
        const qr = await QRCode.toDataURL(otpauthUri(secret), { margin: 1, width: 220 });
        return NextResponse.json({ setup: true, qr, secret, error: "Invalid code — try again" }, { status: 401 });
      }
      await enableAdminTotp(); // lock it in — can't be re-initialized from the UI afterward
      return issue();
    }

    // ── Normal login: password already verified, now require the 6-digit code ──
    if (!code) return NextResponse.json({ needCode: true }, { status: 401 });
    if (!verifyTotp(totp.secret ?? "", String(code))) {
      return NextResponse.json({ needCode: true, error: "Invalid authentication code" }, { status: 401 });
    }
    return issue();
  } catch {
    return NextResponse.json({ error: "Admin auth is not configured correctly" }, { status: 503 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_NAME_EXPORT);
  return res;
}
