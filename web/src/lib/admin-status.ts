import { getDb, getMongoClient } from "./mongodb";
import { AdminDataError } from "./content-validation";
import { adminString, statusService, statusIncident } from "./admin-api-validation";
import type { StatusService, StatusIncident } from "./types";

function collectionFor(type: unknown) {
  if (type === "service") return "statusServices";
  if (type === "incident") return "statusIncidents";
  throw new AdminDataError("Invalid type", 400);
}
export async function writeStatus(body: Record<string, unknown>, create: boolean) {
  const collection = collectionFor(body.type);
  const db = await getDb();
  await db.collection(collection).createIndex({ id: 1 }, { unique: true });
  const session = (await getMongoClient()).startSession();
  try {
    return await session.withTransaction(async () => {
      const id = body.id === undefined && create ? undefined : adminString(body.id, "id");
      const existing = id ? await db.collection(collection).findOne({ id }, { session }) : null;
      if (create && existing) throw new AdminDataError("This record already exists", 409);
      if (!create && !existing) throw new AdminDataError("Record not found", 404);
      const record = body.type === "service" ? statusService(body, existing as unknown as StatusService | undefined)
        : statusIncident(body, existing as unknown as StatusIncident | undefined);
      if ("serviceId" in record && !await db.collection("statusServices").findOne({ id: record.serviceId }, { session })) throw new AdminDataError("Service not found", 404);
      if (create) await db.collection(collection).insertOne({ ...record }, { session });
      else await db.collection(collection).replaceOne({ id }, record, { session });
      return body.type === "service" ? { success: true, service: record } : { success: true, incident: record };
    });
  } finally { await session.endSession(); }
}
export async function removeStatus(type: unknown, value: unknown) {
  const collection = collectionFor(type);
  const id = adminString(value, "id");
  const db = await getDb();
  const session = (await getMongoClient()).startSession();
  try {
    await session.withTransaction(async () => {
      const result = await db.collection(collection).deleteOne({ id }, { session });
      if (!result.deletedCount) throw new AdminDataError("Record not found", 404);
      if (type === "service") await db.collection("statusIncidents").deleteMany({ serviceId: id }, { session });
    });
  } finally { await session.endSession(); }
}
