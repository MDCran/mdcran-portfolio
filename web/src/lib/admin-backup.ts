import { createHash, randomUUID } from "node:crypto";
import { getDb, getMongoClient } from "@/lib/mongodb";
import { AdminDataError, CONTENT_COLLECTIONS, recordKey, validateRecord, type ContentCollection } from "@/lib/content-validation";
import { recordOperation } from "@/lib/operations";
import { invalidatePublicContent } from "@/lib/invalidate-public-content";

export const BACKUP_COLLECTIONS = ["projects", "articles", "clients", "experiences", "educations", "skills", "skillCategories", "certifications", "awards", "clubs", "contacts", "campaigns", "rizz", "siteContent", "resumeProfile", "settings", "chatConfig", "statusServices", "statusIncidents", "visitorAdjustments"];
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object" && !(value instanceof Date)) return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonical(child)]));
  return value;
}
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");

export function validateBackup(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new AdminDataError("Expected a backup object");
  const source = input as Record<string, unknown>;
  const { __meta, ...raw } = source;
  if (__meta && typeof __meta === "object" && "formatVersion" in __meta && ![1, 2].includes(Number(__meta.formatVersion))) throw new AdminDataError("Unsupported backup format version");
  if (__meta && typeof __meta === "object" && "checksum" in __meta && __meta.checksum !== digest(raw)) throw new AdminDataError("Backup checksum does not match its content");
  const collections: Record<string, Record<string, unknown>[]> = {};
  for (const [name, rows] of Object.entries(source)) {
    if (name === "__meta") continue;
    if (!BACKUP_COLLECTIONS.includes(name)) throw new AdminDataError(`Unknown collection: ${name}`);
    if (!Array.isArray(rows) || rows.length > 50_000) throw new AdminDataError(`Invalid collection: ${name}`);
    const seen = new Set<string>();
    collections[name] = rows.map((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) throw new AdminDataError(`Invalid record in ${name}`);
      const data = { ...row } as Record<string, unknown>;
      delete data._id;
      if (CONTENT_COLLECTIONS.includes(name as ContentCollection)) {
        const validated = validateRecord(name as ContentCollection, data);
        const key = recordKey(name as ContentCollection, validated);
        if (seen.has(key)) throw new AdminDataError(`Duplicate identifier in ${name}: ${key}`);
        seen.add(key);
        return validated;
      }
      if (JSON.stringify(data).length > 2_000_000 || Object.keys(data).some((key) => key.startsWith("$") || key.includes("."))) throw new AdminDataError(`Invalid record in ${name}`);
      return data;
    });
  }
  if (!Object.keys(collections).length) throw new AdminDataError("Backup has no collections");
  return collections;
}

export async function exportBackup(snapshotId?: string) {
  const db = await getDb();
  const backup: Record<string, unknown[]> = {};
  if (snapshotId) {
    const snapshot = await db.collection("backupSnapshots").findOne({ snapshotId });
    if (!snapshot) throw new AdminDataError("Snapshot not found", 404);
    for (const name of snapshot.collections as string[]) backup[name] = (await db.collection("backupSnapshotRows").find({ snapshotId, collection: name }).toArray()).map((row) => row.record);
  } else {
    // Fail the export rather than returning empty data for an unreadable collection.
    const session = (await getMongoClient()).startSession();
    try {
      await session.withTransaction(async () => {
        for (const name of BACKUP_COLLECTIONS) backup[name] = await db.collection(name).find({}, { session, projection: { _id: 0 } }).toArray();
      }, { readConcern: { level: "snapshot" } });
    } finally { await session.endSession(); }
  }
  return { __meta: { formatVersion: 2, exportedAt: new Date().toISOString(), checksum: digest(backup), collections: Object.fromEntries(Object.entries(backup).map(([key, rows]) => [key, rows.length])) }, ...backup };
}

export async function prepareRestore(input: unknown) {
  const collections = validateBackup(input);
  const db = await getDb();
  const planId = randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 60_000);
  await db.collection("backupPlans").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await db.collection("backupStageRows").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  const names = Object.keys(collections);
  const plan = await Promise.all(names.map(async (name) => ({ collection: name, current: await db.collection(name).countDocuments(), incoming: collections[name].length })));
  for (const [collection, rows] of Object.entries(collections)) if (rows.length) await db.collection("backupStageRows").insertMany(rows.map((record, position) => ({ planId, collection, position, record, expiresAt })));
  const fingerprints: Record<string, string> = {};
  for (const name of names) fingerprints[name] = digest(await db.collection(name).find({}, { projection: { _id: 0 } }).sort({ _id: 1 }).toArray());
  await db.collection("backupPlans").insertOne({ planId, names, fingerprints, counts: Object.fromEntries(names.map((name) => [name, collections[name].length])), status: "ready", expiresAt });
  return { planId, expiresAt, collections: plan, warnings: plan.filter((item) => item.incoming === 0 && item.current > 0).map((item) => `${item.collection} will be emptied`), requiresConfirmation: true };
}

export async function executeRestore(planId: string) {
  return recordOperation("backup-restore", async () => {
    const db = await getDb();
    await db.collection("contentHeads").createIndex({ key: 1 }, { unique: true });
    const snapshotId = randomUUID();
    const session = (await getMongoClient()).startSession();
    try {
      await session.withTransaction(async () => {
        const plan = await db.collection("backupPlans").findOneAndUpdate({ planId, status: "ready", expiresAt: { $gt: new Date() } }, { $set: { status: "applying" } }, { session, returnDocument: "after" });
        if (!plan) throw new AdminDataError("Restore plan expired or already used. Run dry-run again.", 409);
        const names = plan.names as string[];
        for (const name of names) {
          const current = await db.collection(name).find({}, { session, projection: { _id: 0 } }).sort({ _id: 1 }).toArray();
          if (digest(current) !== plan.fingerprints[name]) throw new AdminDataError(`${name} changed after preview. Run dry-run again.`, 409);
          if (current.length) await db.collection("backupSnapshotRows").insertMany(current.map((record) => ({ snapshotId, collection: name, record })), { session });
          const staged = await db.collection("backupStageRows").find({ planId, collection: name }, { session }).sort({ position: 1 }).toArray();
          if (staged.length !== plan.counts[name]) throw new AdminDataError("Staged backup is incomplete", 409);
          const rows = staged.map((row) => row.record as Record<string, unknown>);
          if (CONTENT_COLLECTIONS.includes(name as ContentCollection)) {
            const versions = new Map<string, number>();
            // Advance tombstones too: a stale editor cannot resurrect a record removed by restore.
            for (const record of [...current, ...rows]) {
              const id = recordKey(name as ContentCollection, record);
              if (versions.has(id)) continue;
              const key = `${name}:${id}`;
              const head = await db.collection("contentHeads").findOne({ key }, { session });
              const version = Number(head?.version ?? record._version ?? 0) + 1;
              await db.collection("contentHeads").updateOne({ key }, { $set: { version, at: new Date().toISOString() } }, { upsert: true, session });
              versions.set(id, version);
            }
            for (const record of rows) record._version = versions.get(recordKey(name as ContentCollection, record));
          }
          await db.collection(name).deleteMany({}, { session });
          if (rows.length) await db.collection(name).insertMany(rows, { session });
          await db.collection("contentDrafts").deleteMany({ key: { $regex: `^${name}:` } }, { session });
          await db.collection("contentSlugClaims").deleteMany({ key: { $regex: `^${name}:` } }, { session });
        }
        await db.collection("backupSnapshots").insertOne({ snapshotId, collections: names, createdAt: new Date(), planId }, { session });
        await db.collection("backupPlans").updateOne({ planId }, { $set: { status: "applied", snapshotId, appliedAt: new Date() } }, { session });
      });
    } finally { await session.endSession(); }
    invalidatePublicContent();
    return { success: true, snapshotId, message: "Restore committed. The previous state is available as a recovery snapshot." };
  });
}
