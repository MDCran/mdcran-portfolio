import { NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { adminError, contentDetail } from "@/lib/admin-content";
export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const detail = await contentDetail(req.nextUrl.searchParams.get("collection") ?? "", req.nextUrl.searchParams.get("id") ?? "");
    return Response.json({ record: detail.draft?.record ?? detail.record, version: detail.version, isDraft: Boolean(detail.draft) }, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
  } catch (error) { return adminError(error); }
}
