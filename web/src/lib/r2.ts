import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type _Object,
} from "@aws-sdk/client-s3";
import path from "node:path";

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
    });
  }

  return client;
}

function normalizePrefix(prefix?: string | null) {
  const cleaned = (prefix ?? "").trim().replace(/^\/+/, "").replace(/\\/g, "/");
  if (!cleaned) return "";
  return cleaned.endsWith("/") ? cleaned : `${cleaned}/`;
}

function publicUrlForKey(key: string) {
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

  await getClient().send(
    new PutObjectCommand({
      Bucket: R2_BUCKET!,
      Key: key,
      Body: body,
      ContentType: contentTypeFor(fileName, file.type || undefined),
    })
  );

  return {
    key,
    publicUrl: publicUrlForKey(key),
  };
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
