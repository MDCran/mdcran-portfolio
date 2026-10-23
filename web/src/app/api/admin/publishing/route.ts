import { NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getProfilePublication } from "@/lib/profile-publication";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const snapshot = await getProfilePublication();
    const download = request.nextUrl.searchParams.get("download");
    const headers = { "Cache-Control": "private, no-store", "X-Publication-Hash": snapshot.hash };
    if (download === "readme") return new Response(snapshot.readme, { headers: { ...headers, "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": 'attachment; filename="README.md"' } });
    if (download === "snapshot") return new Response(JSON.stringify(snapshot, null, 2), { headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="profile-publication.json"' } });
    return Response.json(snapshot, { headers });
  } catch {
    return Response.json({ error: "The public profile snapshot could not be loaded. Retry after checking the content connection." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
