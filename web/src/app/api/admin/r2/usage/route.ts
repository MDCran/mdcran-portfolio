import { NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getAssetUsage } from "@/lib/asset-usage";
import { adminError } from "@/lib/admin-content";
export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { return Response.json(await getAssetUsage(req.nextUrl.searchParams.get("key") ?? "")); }
  catch (error) { return adminError(error); }
}
