import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type _Object,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { getDb } from "./mongodb";

const R2_BUCKET = process.env.R2_BUCKET;
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const CDN_BASE_URL = (process.env.NEXT_PUBLIC_CDN_BASE_URL ?? "https://cdn.mdcran.com").replace(/\/+$/, "");

let client: S3Client | null = null;

export type R2AssetFile = {
  key: string;
  name: string;
  size: number;
  lastModified?: string;
  publicUrl: string;
};

export type R2AssetFolder = {
  name: string;
  prefix: string;
};

function requireR2Config() {
  if (!R2_BUCKET) {
    throw new Error("Missing R2_BUCKET.");
  }

  if (!R2_ENDPOINT) {
    throw new Error("Missing R2_ENDPOINT.");
  }

  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error("Missing R2_ACCESS_KEY_ID or R2_SECRET_ACCESS_KEY.");
  }
}

function getClient() {
  requireR2Config();

  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
      },
      requestHandler: {
        requestTimeout: 120_000, // 2 minute timeout for large uploads
      } as Record<string, unknown>,
    });
  }

  return client;
}

function normalizePrefix(prefix?: string | null) {
  const cleaned = (prefix ?? "").trim().replace(/^\/+/, "").replace(/\\/g, "/");
  if (!cleaned) return "";
  return cleaned.endsWith("/") ? cleaned : `${cleaned}/`;
}

export function publicUrlForKey(key: string) {
  return `${CDN_BASE_URL}/${key.replace(/^\/+/, "")}`;
}

function toAssetFile(item: _Object): R2AssetFile | null {
  if (!item.Key) return null;

  return {
    key: item.Key,
    name: item.Key.split("/").pop() || item.Key,
    size: item.Size ?? 0,
    lastModified: item.LastModified?.toISOString(),
    publicUrl: publicUrlForKey(item.Key),
  };
}

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".m4v": "video/x-m4v",
  ".pdf": "application/pdf",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
};

function contentTypeFor(fileName: string, fallback?: string) {
  return fallback || MIME_TYPES[path.extname(fileName).toLowerCase()] || "application/octet-stream";
}

export async function listR2Assets(options?: { prefix?: string; search?: string }) {
  const normalizedPrefix = normalizePrefix(options?.prefix);
  const search = options?.search?.trim().toLowerCase() ?? "";
  const r2 = getClient();

  if (search) {
    const files: R2AssetFile[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await r2.send(
        new ListObjectsV2Command({
          Bucket: R2_BUCKET!,
          Prefix: normalizedPrefix || undefined,
          ContinuationToken: continuationToken,
        })
      );

      for (const item of response.Contents ?? []) {
        const file = toAssetFile(item);
        if (file && file.key.toLowerCase().includes(search)) {
          files.push(file);
        }
      }

      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);

    files.sort((a, b) => a.key.localeCompare(b.key));

    return {
      prefix: normalizedPrefix,
      folders: [] as R2AssetFolder[],
      files,
      mode: "search" as const,
    };
  }

  const response = await r2.send(
    new ListObjectsV2Command({
      Bucket: R2_BUCKET!,
      Prefix: normalizedPrefix || undefined,
      Delimiter: "/",
    })
  );

  const folders = (response.CommonPrefixes ?? [])
    .map((entry) => entry.Prefix)
    .filter((value): value is string => !!value)
    .map((prefix) => ({
      prefix,
      name: prefix.slice(normalizedPrefix.length).replace(/\/$/, ""),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const files = (response.Contents ?? [])
    .map((item) => toAssetFile(item))
    .filter((item): item is R2AssetFile => !!item)
    .filter((item) => item.key !== normalizedPrefix)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    prefix: normalizedPrefix,
    folders,
    files,
    mode: "browse" as const,
  };
}

export async function uploadR2Asset(file: File, options?: { prefix?: string; fileName?: string }) {
  const normalizedPrefix = normalizePrefix(options?.prefix);
  const rawName = (options?.fileName || file.name || "upload").trim().replace(/\\/g, "/");
  const fileName = rawName.split("/").pop() || "upload";
  const key = `${normalizedPrefix}${fileName}`;
  const body = Buffer.from(await file.arrayBuffer());
  const contentType = contentTypeFor(fileName, file.type || undefined);

  // Retry up to 3 times — R2 can be flaky on cold connections
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await getClient().send(
        new PutObjectCommand({
          Bucket: R2_BUCKET!,
          Key: key,
          Body: body,
          ContentType: contentType,
          ContentLength: body.length,
        })
      );
      return {
        key,
        publicUrl: publicUrlForKey(key),
      };
    } catch (err) {
      lastError = err;
      // Reset client on connection errors so next attempt gets a fresh connection
      client = null;
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

export async function deleteR2Asset(key: string) {
  const trimmed = key.trim().replace(/^\/+/, "");
  if (!trimmed) {
    throw new Error("Missing key.");
  }

  await getClient().send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET!,
      Key: trimmed,
    })
  );
}

export async function copyR2Asset(oldKey: string, newKey: string) {
  await getClient().send(
    new CopyObjectCommand({
      Bucket: R2_BUCKET!,
      CopySource: `${R2_BUCKET}/${oldKey.replace(/^\/+/, "")}`,
      Key: newKey.replace(/^\/+/, ""),
    })
  );
}

export async function renameR2Asset(oldKey: string, newKey: string) {
  await copyR2Asset(oldKey, newKey);
  await deleteR2Asset(oldKey);
}

/* ─── Asset kind classification ─────────────────────────── */
export type AssetKind = "image" | "video" | "document" | "other";
export function classifyKind(name: string): AssetKind {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "gif", "svg", "avif", "bmp", "ico"].includes(ext)) return "image";
  if (["mp4", "mov", "webm", "mkv", "avi", "m4v"].includes(ext)) return "video";
  if (["pdf", "doc", "docx", "txt", "md", "csv", "xls", "xlsx", "ppt", "pptx", "json"].includes(ext)) return "document";
  return "other";
}

/* ─── Object metadata (HeadObject) ──────────────────────── */
export async function headR2Asset(key: string) {
  const trimmed = key.trim().replace(/^\/+/, "");
  const res = await getClient().send(new HeadObjectCommand({ Bucket: R2_BUCKET!, Key: trimmed }));
  return {
    key: trimmed,
    contentType: res.ContentType ?? "application/octet-stream",
    size: res.ContentLength ?? 0,
    lastModified: res.LastModified?.toISOString(),
    etag: res.ETag?.replace(/"/g, ""),
  };
}

/* ─── Presigned GET URL (for "private" assets) ──────────── */
export async function presignR2Get(key: string, expiresIn = 3600): Promise<string> {
  const trimmed = key.trim().replace(/^\/+/, "");
  // Cast bridges any minor @aws-sdk version skew between client-s3 and the presigner.
  return getSignedUrl(
    getClient() as unknown as Parameters<typeof getSignedUrl>[0],
    new GetObjectCommand({ Bucket: R2_BUCKET!, Key: trimmed }) as unknown as Parameters<typeof getSignedUrl>[1],
    { expiresIn }
  );
}

/* ─── Replace an asset in place (same key) ──────────────── */
export async function replaceR2Asset(key: string, file: File) {
  const trimmed = key.trim().replace(/^\/+/, "");
  const body = Buffer.from(await file.arrayBuffer());
  const contentType = contentTypeFor(trimmed, file.type || undefined);
  await getClient().send(
    new PutObjectCommand({ Bucket: R2_BUCKET!, Key: trimmed, Body: body, ContentType: contentType, ContentLength: body.length })
  );
  return { key: trimmed, publicUrl: publicUrlForKey(trimmed), size: body.length, contentType };
}

/* ─── Bucket-wide stats ─────────────────────────────────── */
export async function getR2Stats() {
  const r2 = getClient();
  let total = 0, bytes = 0, images = 0, videos = 0, documents = 0, others = 0;
  let token: string | undefined;
  do {
    const res = await r2.send(new ListObjectsV2Command({ Bucket: R2_BUCKET!, ContinuationToken: token }));
    for (const item of res.Contents ?? []) {
      if (!item.Key || item.Key.endsWith("/.keep")) continue;
      total++;
      bytes += item.Size ?? 0;
      const kind = classifyKind(item.Key);
      if (kind === "image") images++;
      else if (kind === "video") videos++;
      else if (kind === "document") documents++;
      else others++;
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return { total, bytes, images, videos, documents, others };
}

/* ─── Mongo-backed asset metadata (alt, uuid, status, visibility) ─── */
export interface R2AssetMeta {
  key: string;
  uuid: string;
  alt?: string;
  status?: "live" | "draft" | "archived";
  visibility?: "public" | "private";
  updatedAt?: string;
}

export async function getR2Meta(key: string): Promise<R2AssetMeta> {
  const db = await getDb();
  const doc = await db.collection("r2Meta").findOne<R2AssetMeta>({ key }, { projection: { _id: 0 } });
  if (doc) return doc;
  // Create a stable uuid on first access.
  const created: R2AssetMeta = { key, uuid: randomUUID(), status: "live", visibility: "public" };
  await db.collection("r2Meta").updateOne({ key }, { $setOnInsert: created }, { upsert: true });
  return created;
}

export async function saveR2Meta(key: string, patch: Partial<R2AssetMeta>): Promise<R2AssetMeta> {
  const db = await getDb();
  const existing = await getR2Meta(key);
  const merged = { ...existing, ...patch, key, updatedAt: new Date().toISOString() };
  await db.collection("r2Meta").updateOne({ key }, { $set: merged }, { upsert: true });
  return merged;
}

/** Move metadata when a key is renamed. */
export async function moveR2Meta(oldKey: string, newKey: string): Promise<void> {
  const db = await getDb();
  const doc = await db.collection("r2Meta").findOne({ key: oldKey });
  if (doc) {
    await db.collection("r2Meta").updateOne({ key: newKey }, { $set: { ...doc, _id: undefined, key: newKey } }, { upsert: true });
    await db.collection("r2Meta").deleteOne({ key: oldKey });
  }
}

export async function createR2Folder(prefix: string, folderName: string) {
  const normalizedPrefix = normalizePrefix(prefix);
  const cleanName = folderName.trim().replace(/[^a-zA-Z0-9_\-. ]/g, "_").replace(/\s+/g, "_");
  if (!cleanName) throw new Error("Invalid folder name.");
  const key = `${normalizedPrefix}${cleanName}/.keep`;

  await getClient().send(
    new PutObjectCommand({
      Bucket: R2_BUCKET!,
      Key: key,
      Body: Buffer.alloc(0),
      ContentType: "application/octet-stream",
    })
  );

  return { key, prefix: `${normalizedPrefix}${cleanName}/` };
}
