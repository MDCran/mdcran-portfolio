import { NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { findIdentityById } from "@/lib/identity";
import { getIdentityMessagePage } from "@/lib/admin-message-history";
import { adminError } from "@/lib/admin-content";
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const identity = await findIdentityById((await params).id);
    if (!identity) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(await getIdentityMessagePage(identity.id, identity.devices.map((device) => device.serial).filter(Boolean), req.nextUrl.searchParams.get("cursor")));
  } catch (error) { return adminError(error); }
}
