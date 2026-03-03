import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith("/admin/dashboard") ||
    pathname.startsWith("/visitor")
  ) {
    const token = req.cookies.get("mdcran_admin_token")?.value;
    if (!token || token.split(".").length !== 3) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/dashboard/:path*", "/visitor/:path*", "/visitor"],
};
