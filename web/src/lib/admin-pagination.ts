import { ObjectId, type Document, type Filter } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { AdminDataError } from "@/lib/content-validation";

export async function paginateCollection(collection: string, params: URLSearchParams, searchFields: string[] = ["title", "name"], baseFilter: Filter<Document> = {}) {
  const limit = Math.min(100, Math.max(1, Math.floor(Number(params.get("limit"))) || 30));
  const cursor = params.get("cursor");
  if (cursor && !ObjectId.isValid(cursor)) throw new AdminDataError("Invalid cursor");
  const query = (params.get("q") ?? "").trim().slice(0, 120);
  const filter: Filter<Document> = { ...baseFilter, ...(cursor ? { _id: { $gt: new ObjectId(cursor) } } : {}) };
  if (query) filter.$or = searchFields.map((field) => ({ [field]: { $regex: query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }));
  const rows = await (await getDb()).collection(collection).find(filter).sort({ _id: 1 }).limit(limit + 1).toArray();
  const hasMore = rows.length > limit;
  const selected = rows.slice(0, limit);
  return { records: selected.map((row) => { const record: Document = { ...row }; delete record._id; return record; }), nextCursor: hasMore ? String(selected[selected.length - 1]._id) : null };
}
