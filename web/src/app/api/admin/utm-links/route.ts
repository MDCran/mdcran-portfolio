import { NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getUtmLinks, saveUtmLink, deleteUtmLink } from "@/lib/db";
import { adminError } from "@/lib/admin-content";
import { adminString, readAdminObject, utmLink } from "@/lib/admin-api-validation";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { return Response.json({ links: await getUtmLinks() }); }
  catch (error) { return adminError(error); }
}
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const link = utmLink(await readAdminObject(req));
    await saveUtmLink(link);
    return Response.json({ ok: true, link });
  } catch (error) { return adminError(error); }
}
export async function DELETE(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await deleteUtmLink(adminString((await readAdminObject(req)).id, "id"));
    return Response.json({ ok: true });
  } catch (error) { return adminError(error); }
}
