import { randomUUID } from "node:crypto";
import type { ClientSession } from "mongodb";
import { getDb, getMongoClient } from "@/lib/mongodb";
import { AdminDataError, contentCollection, recordFilter, recordKey, validateRecord, type ContentCollection } from "@/lib/content-validation";
import { invalidatePublicContent } from "@/lib/invalidate-public-content";

export type ContentMutation = { collection: string; id: string; action: "save" | "draft" | "publish" | "delete" | "restore"; expectedVersion: number; record?: unknown; revisionId?: string };

export async function contentDetail(collectionName: string, id: string) {
  const collection = contentCollection(collectionName);
  const db = await getDb();
  const key = `${collection}:${id}`;
  const [record, head, draft, history] = await Promise.all([
    db.collection(collection).findOne(recordFilter(collection, id), { projection: { _id: 0 } }),
    db.collection("contentHeads").findOne({ key }),
    db.collection("contentDrafts").findOne({ key }, { projection: { _id: 0 } }),
    db.collection("contentRevisions").find({ key }, { projection: { _id: 0, revisionId: 1, version: 1, action: 1, at: 1, "record.id": 1, "record.title": 1, "record.name": 1, "record.fullName": 1 } }).sort({ version: -1 }).limit(50).toArray(),
  ]);
  return { record, version: Number(head?.version ?? record?._version ?? 0), draft, history };
}

async function mutate(input: ContentMutation, session: ClientSession) {
  const collection = contentCollection(input.collection);
  if (typeof input.id !== "string" || !input.id.trim() || input.id.length > 200 || !Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 0) throw new AdminDataError("id and expectedVersion are required");
  if (input.action === "restore" && (typeof input.revisionId !== "string" || input.revisionId.length > 100)) throw new AdminDataError("A revision identifier is required");
  if (!["save", "draft", "publish", "delete", "restore"].includes(input.action)) throw new AdminDataError("Unknown action");
  const db = await getDb();
  const key = `${collection}:${input.id}`;
  const filter = recordFilter(collection, input.id);
  const current = await db.collection(collection).findOne(filter, { session, projection: { _id: 0 } });
  const head = await db.collection("contentHeads").findOne({ key }, { session });
  const version = Number(head?.version ?? current?._version ?? 0);
  if (version !== input.expectedVersion) throw new AdminDataError("This record changed. Reload it before saving.", 409);
  let source = input.record;
  if (input.action === "publish") source = (await db.collection("contentDrafts").findOne({ key }, { session }))?.record;
  if (input.action === "restore") {
    const revision = await db.collection("contentRevisions").findOne({ key, revisionId: input.revisionId }, { session });
    source = revision?.record ?? revision?.previous;
  }
  const record = input.action === "delete" ? null : validateRecord(collection, source);
  if (record && recordKey(collection, record) !== input.id) throw new AdminDataError("Record identifier cannot change");
  if (collection === "campaigns") {
    if (await db.collection("campaignJobs").findOne({ campaignId: input.id, leaseUntil: { $gt: new Date() } }, { session })) throw new AdminDataError("Campaign delivery is in progress", 409);
    if (record && current) {
      if (Array.isArray(current.deliveredContactIds) && current.deliveredContactIds.length && ["type", "message", "htmlBody", "subject"].some((field) => current[field] !== record[field])) throw new AdminDataError("Duplicate a started campaign before changing its message", 409);
      record.deliveredContactIds = current.deliveredContactIds ?? [];
      record.deliveryLog = current.deliveryLog ?? [];
    }
  }
  if (record?.slug && input.action !== "draft") {
    const duplicate = await db.collection(collection).findOne({ slug: record.slug, id: { $ne: input.id } }, { session });
    if (duplicate) throw new AdminDataError("This slug is already in use", 409);
    const claimKey = `${collection}:${record.slug}`;
    const claim = await db.collection("contentSlugClaims").findOne({ key: claimKey }, { session });
    if (claim && claim.recordId !== input.id) throw new AdminDataError("This slug is already reserved", 409);
    await db.collection("contentSlugClaims").updateOne({ key: claimKey }, { $set: { recordId: input.id } }, { upsert: true, session });
  }
  if (input.action !== "draft" && current?.slug && current.slug !== record?.slug) await db.collection("contentSlugClaims").deleteOne({ key: `${collection}:${current.slug}`, recordId: input.id }, { session });
  if (collection === "articles" && record?.featured === true && input.action !== "draft") {
    await db.collection<{ _id: string; recordId: string }>("contentSelectionLocks").updateOne({ _id: "featured-article" }, { $set: { recordId: input.id } }, { upsert: true, session });
    const featured = await db.collection("articles").find({ featured: true, id: { $ne: input.id } }, { session, projection: { _id: 0 } }).toArray();
    for (const article of featured) await mutate({ collection: "articles", id: article.id, action: "save", expectedVersion: Number(article._version ?? 0), record: { ...article, featured: false } }, session);
  }
  const nextVersion = version + 1;
  const at = new Date().toISOString();
  if (head) await db.collection("contentHeads").updateOne({ _id: head._id }, { $set: { version: nextVersion, at } }, { session });
  else await db.collection("contentHeads").insertOne({ key, version: nextVersion, at }, { session });
  // Capture the pre-upgrade original once, allowing the first edit to be undone.
  if (!head && current) await db.collection("contentRevisions").insertOne({ key, revisionId: randomUUID(), version, action: "original", at, record: current }, { session });
  if (input.action === "draft") {
    await db.collection("contentDrafts").updateOne({ key }, { $set: { record, version: nextVersion, at } }, { upsert: true, session });
    if (current) await db.collection(collection).updateOne(filter, { $set: { _version: nextVersion } }, { session });
  } else {
    if (record) await db.collection(collection).replaceOne(filter, { ...record, _version: nextVersion }, { upsert: true, session });
    else await db.collection(collection).deleteOne(filter, { session });
    await db.collection("contentDrafts").deleteOne({ key }, { session });
  }
  await db.collection("contentRevisions").insertOne({ key, collection, recordId: input.id, revisionId: randomUUID(), version: nextVersion, action: input.action, at, record, previous: current }, { session });
  return { record: record ? { ...record, _version: nextVersion } : null, version: nextVersion };
}

export async function mutateContent(input: ContentMutation) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new AdminDataError("Expected a content mutation object");
  const db = await getDb();
  await db.collection("contentHeads").createIndex({ key: 1 }, { unique: true });
  await db.collection("contentSlugClaims").createIndex({ key: 1 }, { unique: true });
  await db.collection("contentRevisions").createIndex({ key: 1, version: -1 });
  const session = (await getMongoClient()).startSession();
  try {
    const result = await session.withTransaction(() => mutate(input, session));
    if (input.action !== "draft") invalidatePublicContent();
    return result;
  }
  finally { await session.endSession(); }
}

/** Compatibility writes never infer deletion from an omitted item. Explicit deletion uses mutateContent. */
export async function saveContentBatch(collection: ContentCollection, values: unknown): Promise<void> {
  await synchronizeContent([{ collection, records: values }]);
}

export type ContentGroup = { collection: ContentCollection; records: unknown; deleted?: Array<{ id: string; expectedVersion: number }> };
export async function synchronizeContent(groups: ContentGroup[]) {
  if (!Array.isArray(groups) || groups.length > 20) throw new AdminDataError("Invalid content groups");
  if (groups.some((group) => !group || typeof group !== "object" || Array.isArray(group))) throw new AdminDataError("Invalid content group");
  const prepared = groups.map(({ collection: name, records: values, deleted = [] }) => {
  const collection = contentCollection(name);
  if (!Array.isArray(values) || values.length > 5000) throw new AdminDataError("Expected at most 5,000 records");
  const records = values.map((value) => ({ original: value as Record<string, unknown>, clean: validateRecord(collection, value) }));
  const ids = records.map(({ clean }) => recordKey(collection, clean));
  if (new Set(ids).size !== ids.length) throw new AdminDataError("Duplicate record identifiers");
  if (!Array.isArray(deleted) || deleted.some(({ id }) => ids.includes(id))) throw new AdminDataError("A record cannot be saved and deleted together");
  return { collection, records, deleted };
  });
  const db = await getDb();
  await db.collection("contentHeads").createIndex({ key: 1 }, { unique: true });
  await db.collection("contentSlugClaims").createIndex({ key: 1 }, { unique: true });
  const session = (await getMongoClient()).startSession();
  let committed: { groups: Array<{ collection: ContentCollection; records: Record<string, unknown>[] }> } = { groups: [] };
  try {
    await session.withTransaction(async () => {
      for (const { collection, records, deleted } of prepared) {
      for (const { original, clean } of records) {
        const id = recordKey(collection, clean);
        const current = await db.collection(collection).findOne(recordFilter(collection, id), { session, projection: { _id: 0 } });
        const comparable = current ? { ...current } : null;
        if (comparable) delete comparable._version;
        if (comparable && JSON.stringify(comparable) === JSON.stringify(clean)) {
          if (Number(current?._version ?? 0) !== Number(original._version ?? 0)) throw new AdminDataError("This record changed. Reload it before saving.", 409);
          continue;
        }
        await mutate({ collection, id, action: "save", expectedVersion: Number(original._version ?? 0), record: clean }, session);
      }
      for (const item of deleted) await mutate({ collection, ...item, action: "delete" }, session);
      }
      // Return only records this editor submitted, from the same transaction snapshot.
      // Adopting unrelated rows or newer post-commit versions would turn a later save
      // into an unintended deletion or overwrite of edits from another window.
      const groups = [];
      for (const { collection, records } of prepared) {
        const saved: Record<string, unknown>[] = [];
        for (const { clean } of records) {
          const record = await db.collection(collection).findOne(recordFilter(collection, recordKey(collection, clean)), { session, projection: { _id: 0 } });
          if (record) saved.push(record);
        }
        groups.push({ collection, records: saved });
      }
      committed = { groups };
    });
  } finally { await session.endSession(); }
  invalidatePublicContent();
  return committed;
}

export function adminError(error: unknown) {
  if (error && typeof error === "object" && "code" in error && error.code === 11000) return Response.json({ error: "A conflicting record was saved. Reload before retrying." }, { status: 409 });
  const runId = error && typeof error === "object" && "runId" in error && typeof error.runId === "string" ? error.runId : undefined;
  return Response.json({ error: error instanceof AdminDataError ? error.message : "The operation could not be completed. Review its status before retrying.", ...(runId ? { runId } : {}) }, { status: error instanceof AdminDataError ? error.status : 500 });
}
