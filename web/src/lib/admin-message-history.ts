import { ObjectId, type Document } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { AdminDataError } from "@/lib/content-validation";

export async function getIdentityMessagePage(identityId: string, serials: string[], cursor?: string | null) {
  const identityFilter = { $or: [{ identityId }, ...(serials.length ? [{ serial: { $in: serials } }] : [])] };
  const clauses: Document[] = [identityFilter];
  if (cursor) {
    try {
      if (cursor.length > 500) throw new Error();
      const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
      if (!ObjectId.isValid(value.id) || typeof value.createdAt !== "string" || !Number.isFinite(Date.parse(value.createdAt))) throw new Error();
      clauses.push({ $or: [{ createdAt: { $lt: value.createdAt } }, { createdAt: value.createdAt, _id: { $lt: new ObjectId(value.id) } }] });
    } catch { throw new AdminDataError("Invalid message cursor"); }
  }
  const db = await getDb();
  await db.collection("aiMessages").createIndex({ identityId: 1, createdAt: -1, _id: -1 });
  await db.collection("aiMessages").createIndex({ serial: 1, createdAt: -1, _id: -1 });
  const rows = await db.collection("aiMessages").find({ $and: clauses }).sort({ createdAt: -1, _id: -1 }).limit(51).toArray();
  const selected = rows.slice(0, 50);
  const last = selected[selected.length - 1];
  const nextCursor = rows.length > 50 && last ? Buffer.from(JSON.stringify({ createdAt: last.createdAt, id: String(last._id) })).toString("base64url") : null;
  return { messages: selected.reverse().map((row) => { const record: Document = { ...row }; delete record._id; return record; }), nextCursor };
}
