import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAdminToken } from "@/lib/auth";

const isDev = process.env.NODE_ENV === "development";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // HTTP → HTTPS redirect (production only)
  if (!isDev) {
    const proto = req.headers.get("x-forwarded-proto");
    if (proto === "http") {
      const url = req.nextUrl.clone();
      url.protocol = "https";
      return NextResponse.redirect(url, 301);
    }
  }

  // Trailing slash redirect (301) — skip for root and API/Next.js internals
  if (pathname !== "/" && pathname.endsWith("/") && !pathname.startsWith("/api/") && !pathname.startsWith("/_next/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.replace(/\/+$/, "");
    return NextResponse.redirect(url, 301);
  }

  // Admin area auth check — everything under /admin/ except the login page itself
  if (pathname.startsWith("/admin/")) {
    const token = req.cookies.get("mdcran_admin_token")?.value;
    if (!token || !verifyAdminToken(token)) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  const res = NextResponse.next();

  // SEO & security headers
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (!isDev) {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  return res;
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon\\.ico|icon\\.png|cdn/).*)",
  ],
};
