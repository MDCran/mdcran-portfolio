import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Trailing slash redirect (301) — skip for root and API/Next.js internals
  if (pathname !== "/" && pathname.endsWith("/") && !pathname.startsWith("/api/") && !pathname.startsWith("/_next/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.replace(/\/+$/, "");
    return NextResponse.redirect(url, 301);
  }

  // Admin dashboard auth check
  if (pathname.startsWith("/admin/dashboard")) {
    const token = req.cookies.get("mdcran_admin_token")?.value;
    if (!token || token.split(".").length !== 3) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  const res = NextResponse.next();

  // SEO & security headers
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");

  return res;
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon\\.ico|icon\\.png|cdn/).*)",
  ],
};
