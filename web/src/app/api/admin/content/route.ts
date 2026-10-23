import { NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { adminError, contentDetail, mutateContent, synchronizeContent, type ContentMutation } from "@/lib/admin-content";
import { contentCollection } from "@/lib/content-validation";
import { paginateCollection } from "@/lib/admin-pagination";
export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const collection = contentCollection(req.nextUrl.searchParams.get("collection"));
    const id = req.nextUrl.searchParams.get("id");
    if (id) return Response.json(await contentDetail(collection, id));
    if (req.nextUrl.searchParams.get("drafts") === "true") {
      const result = await paginateCollection("contentDrafts", req.nextUrl.searchParams, ["record.title", "record.name"], { key: { $regex: `^${collection}:` } });
      return Response.json({ ...result, records: result.records.map((draft) => ({ ...(draft.record as object), _version: draft.version, _draft: true })) });
    }
    return Response.json(await paginateCollection(collection, req.nextUrl.searchParams));
  }
  catch (error) { return adminError(error); }
}
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { return Response.json(await mutateContent(await req.json() as ContentMutation)); }
  catch (error) { return adminError(error); }
}
export async function PUT(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { return Response.json(await synchronizeContent((await req.json()).groups)); }
  catch (error) { return adminError(error); }
}
