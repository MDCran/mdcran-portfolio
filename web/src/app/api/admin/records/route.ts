import { NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { adminError } from "@/lib/admin-content";
import { AdminDataError } from "@/lib/content-validation";
import { paginateCollection } from "@/lib/admin-pagination";
const collections: Record<string, string[]> = {
  contacts: ["name", "email", "subject", "message"], campaigns: ["subject", "message"],
  identities: ["name", "id", "devices.ip", "devices.serial"], rizz: ["name", "message"], aiConversations: ["sessionId", "identityId"],
  aiMessages: ["content", "conversationId"],
};
export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const name = req.nextUrl.searchParams.get("collection") ?? "";
    if (!Object.hasOwn(collections, name)) throw new AdminDataError("Unsupported collection");
    const conversationId = req.nextUrl.searchParams.get("conversationId");
    return Response.json(await paginateCollection(name, req.nextUrl.searchParams, collections[name], name === "aiMessages" && conversationId ? { conversationId } : {}));
  } catch (error) { return adminError(error); }
}
