import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { validateRecord } from "../src/lib/content-validation";

const uri = process.env.TEST_MONGODB_URI ?? "mongodb://127.0.0.1:27028/?directConnection=true&replicaSet=mdcranReview";
if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(uri)) throw new Error("Tests require an explicitly local isolated MongoDB");
const testDb = `mdcran_modernization_test_${randomUUID().replaceAll("-", "")}`;
process.env.MONGODB_URI = uri;
process.env.MONGODB_DB = testDb;

const modules = Promise.all([import("../src/lib/mongodb"), import("../src/lib/admin-content"), import("../src/lib/admin-backup"), import("../src/lib/campaign-jobs"), import("../src/lib/admin-pagination"), import("../src/lib/asset-usage")]);
after(async () => {
  const [{ getDb, getMongoClient }] = await modules;
  const db = await getDb();
  assert.equal(db.databaseName, testDb);
  await db.dropDatabase();
  await (await getMongoClient()).close();
});

test("reject invalid shapes, dangerous URLs, and duplicate batch identifiers", async () => {
  assert.throws(() => validateRecord("projects", { id: "p", title: "P", slug: "p", category: "software", githubUrl: "javascript:alert(1)" }));
  assert.throws(() => validateRecord("skills", { name: "TypeScript", category: [] }));
  const [, { saveContentBatch }] = await modules;
  await assert.rejects(saveContentBatch("clients", [{ id: "dup", name: "A" }, { id: "dup", name: "B" }]));
});

test("concurrent writes reject stale versions and retain an undo revision", async () => {
  const [, { mutateContent, contentDetail }] = await modules;
  await mutateContent({ collection: "clients", id: "concurrent", action: "save", expectedVersion: 0, record: { id: "concurrent", name: "Original" } });
  const results = await Promise.allSettled(["One", "Two"].map((name) => mutateContent({ collection: "clients", id: "concurrent", action: "save", expectedVersion: 1, record: { id: "concurrent", name } })));
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const detail = await contentDetail("clients", "concurrent");
  assert.equal(detail.version, 2);
  assert.equal(detail.history.length, 2);
});

test("batch conflicts roll back earlier writes and omissions never delete", async () => {
  const [, { saveContentBatch, contentDetail, synchronizeContent }] = await modules;
  await saveContentBatch("clients", [{ id: "batch-a", name: "A" }, { id: "batch-b", name: "B" }]);
  await assert.rejects(saveContentBatch("clients", [{ id: "batch-a", name: "Changed", _version: 1 }, { id: "batch-b", name: "Stale", _version: 0 }]));
  assert.equal((await contentDetail("clients", "batch-a")).record?.name, "A");
  await saveContentBatch("clients", []);
  assert.ok((await contentDetail("clients", "batch-b")).record);
  await synchronizeContent([{ collection: "clients", records: [], deleted: [{ id: "batch-b", expectedVersion: 1 }] }]);
  assert.equal((await contentDetail("clients", "batch-b")).record, null);
});

test("batch response never adopts unrelated records and unchanged stale versions still conflict", async () => {
  const [, { mutateContent, synchronizeContent }] = await modules;
  await mutateContent({ collection: "clients", id: "editor-owned", action: "save", expectedVersion: 0, record: { id: "editor-owned", name: "Owned" } });
  await mutateContent({ collection: "clients", id: "external-addition", action: "save", expectedVersion: 0, record: { id: "external-addition", name: "Other window" } });
  const result = await synchronizeContent([{ collection: "clients", records: [{ id: "editor-owned", name: "Owned", _version: 1 }] }]);
  assert.deepEqual(result.groups[0].records.map((record) => record.id), ["editor-owned"]);
  assert.equal(result.groups[0].records[0]._version, 1);
  await mutateContent({ collection: "clients", id: "editor-owned", action: "draft", expectedVersion: 1, record: { id: "editor-owned", name: "Other window draft" } });
  await assert.rejects(synchronizeContent([{ collection: "clients", records: [{ id: "editor-owned", name: "Owned", _version: 1 }] }]));
});

test("drafts stay out of public collection until explicit publish, revisions restore", async () => {
  const [{ getDb }, { mutateContent, contentDetail }] = await modules;
  await mutateContent({ collection: "articles", id: "draft-article", action: "draft", expectedVersion: 0, record: { id: "draft-article", title: "Draft", slug: "draft-article", tags: [], sections: [] } });
  assert.equal(await (await getDb()).collection("articles").findOne({ id: "draft-article" }), null);
  await mutateContent({ collection: "articles", id: "draft-article", action: "publish", expectedVersion: 1 });
  const detail = await contentDetail("articles", "draft-article");
  assert.equal(detail.record?.title, "Draft");
  await mutateContent({ collection: "articles", id: "draft-article", action: "save", expectedVersion: 2, record: { id: "draft-article", title: "Edited", slug: "draft-article", tags: [], sections: [] } });
  await mutateContent({ collection: "articles", id: "draft-article", action: "restore", expectedVersion: 3, revisionId: detail.history[0].revisionId });
  assert.equal((await contentDetail("articles", "draft-article")).record?.title, "Draft");
});

test("restore detects stale previews, commits atomically, and retains recovery export", async () => {
  const [{ getDb }, { mutateContent }, { prepareRestore, executeRestore, exportBackup, validateBackup }] = await modules;
  const plan = await prepareRestore({ clubs: [{ id: "restored", name: "Restored" }] });
  await mutateContent({ collection: "clubs", id: "new", action: "save", expectedVersion: 0, record: { id: "new", name: "New" } });
  await assert.rejects(executeRestore(plan.planId));
  assert.ok(await (await getDb()).collection("clubs").findOne({ id: "new" }));
  const fresh = await prepareRestore({ clubs: [] });
  const result = await executeRestore(fresh.planId);
  assert.equal(await (await getDb()).collection("clubs").countDocuments(), 0);
  const snapshot = await exportBackup(result.snapshotId) as unknown as { clubs: Array<{ id: string }> };
  assert.equal(snapshot.clubs[0].id, "new");
  assert.throws(() => validateBackup({ ...snapshot, clubs: [] }));
  await assert.rejects(mutateContent({ collection: "clubs", id: "new", action: "save", expectedVersion: 1, record: { id: "new", name: "Stale resurrection" } }));
  await assert.rejects(executeRestore(fresh.planId));
});

test("restore failure after earlier replacement rolls the entire transaction back", async () => {
  const [{ getDb }, { mutateContent }, { prepareRestore, executeRestore }] = await modules;
  const db = await getDb();
  await mutateContent({ collection: "awards", id: "keep-award", action: "save", expectedVersion: 0, record: { id: "keep-award", name: "Keep" } });
  const plan = await prepareRestore({ awards: [], clubs: [{ id: "incomplete", name: "Incomplete" }] });
  await db.collection("backupStageRows").deleteMany({ planId: plan.planId, collection: "clubs" });
  await assert.rejects(executeRestore(plan.planId));
  assert.equal((await db.collection("awards").findOne({ id: "keep-award" }))?.name, "Keep");
});

test("campaign leases prevent duplicate delivery and checkpoints survive partial failures", async () => {
  const [{ getDb }, , , { processCampaignJobs }] = await modules;
  const db = await getDb();
  await db.collection("contacts").insertMany(["ok", "uncertain", "unsubscribed"].map((id) => ({ id, name: id, email: `${id}@example.test`, subscribed: id !== "unsubscribed", message: "", createdAt: new Date().toISOString() })));
  await db.collection("campaigns").insertOne({ id: "job", type: "email", subject: "Test", message: "Test", status: "scheduled", recipientMode: "all", scheduledFor: new Date(0).toISOString(), createdAt: new Date().toISOString() });
  const attempted: string[] = [];
  const deliver = async (_campaign: unknown, contact: { id: string }) => { attempted.push(contact.id); if (contact.id === "uncertain") throw new Error("Mock uncertain provider result"); };
  await Promise.all([processCampaignJobs({ deliver }), processCampaignJobs({ deliver })]);
  assert.equal(attempted.filter((id) => id === "ok").length, 1);
  assert.equal(attempted.filter((id) => id === "uncertain").length, 1);
  assert.equal(attempted.includes("unsubscribed"), false);
  await processCampaignJobs({ campaignId: "job", deliver });
  assert.equal(attempted.length, 2);
  assert.equal((await db.collection("campaignDeliveries").findOne({ campaignId: "job", contactId: "uncertain" }))?.status, "uncertain");
});

test("pagination uses stable cursors and asset checks include nested draft references", async () => {
  const [{ getDb }, , , , { paginateCollection }, { getAssetUsage }] = await modules;
  const db = await getDb();
  await db.collection("contentDrafts").insertOne({ key: "projects:asset-draft", record: { images: [{ src: "/cdn/test/screenshot.png" }] } });
  const usage = await getAssetUsage("test/screenshot.png");
  assert.equal(usage.canDelete, false);
  assert.equal(usage.references[0].fields[0], "record.images.0.src");
  const first = await paginateCollection("clients", new URLSearchParams({ limit: "1" }));
  assert.equal(first.records.length, 1);
  assert.ok(first.nextCursor);
  const second = await paginateCollection("clients", new URLSearchParams({ limit: "1", cursor: first.nextCursor! }));
  assert.notEqual(second.records[0].id, first.records[0].id);
});

test("identity history returns newest bounded page then older rows without crossing identity boundaries", async () => {
  const [{ getDb }] = await modules;
  const { getIdentityMessagePage } = await import("../src/lib/admin-message-history");
  const db = await getDb();
  await db.collection("aiMessages").insertMany(Array.from({ length: 80 }, (_, index) => ({ id: `history-${index}`, identityId: "history-owner", role: "user", content: "Test", createdAt: new Date(1700000000000 + index * 1000).toISOString() })));
  await db.collection("aiMessages").insertOne({ id: "other-person", identityId: "other-person", content: "Must not appear", createdAt: new Date().toISOString() });
  const first = await getIdentityMessagePage("history-owner", []);
  assert.equal(first.messages.length, 50);
  assert.equal(first.messages[0].id, "history-30");
  const older = await getIdentityMessagePage("history-owner", [], first.nextCursor);
  assert.equal(older.messages.length, 30);
  assert.equal(older.nextCursor, null);
  assert.equal(older.messages.some((message) => message.id === "other-person"), false);
});
