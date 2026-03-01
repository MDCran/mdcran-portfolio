import { NextRequest, NextResponse } from "next/server";
import { signAdminToken, COOKIE_NAME_EXPORT } from "@/lib/auth";
import { verifyAdminPassword } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (!password) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  const valid = await verifyAdminPassword(password);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  let token: string;
  try {
    token = signAdminToken();
  } catch {
    return NextResponse.json({ error: "Admin auth is not configured correctly" }, { status: 503 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME_EXPORT, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 86400, // 24h
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_NAME_EXPORT);
  return res;
}
