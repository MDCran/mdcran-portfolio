import { loadEnvConfig } from "@next/env";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { S3Client, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";

loadEnvConfig(process.cwd());

const R2_BUCKET = process.env.R2_BUCKET;
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const CDN_SOURCE_DIR = path.resolve(process.cwd(), "public", "cdn");
const overwrite = process.argv.includes("--overwrite");

if (!R2_BUCKET) {
  throw new Error("Missing R2_BUCKET.");
}

if (!R2_ENDPOINT) {
  throw new Error("Missing R2_ENDPOINT.");
}

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  throw new Error("Missing R2_ACCESS_KEY_ID or R2_SECRET_ACCESS_KEY.");
}

const client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".pdf": "application/pdf",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
};

function contentTypeFor(filePath: string): string {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

async function collectFiles(dir: string, rootDir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectFiles(fullPath, rootDir);
      }
      if (!entry.isFile()) {
        return [];
      }
      return [path.relative(rootDir, fullPath).replace(/\\/g, "/")];
    })
  );

  return files.flat();
}

async function listExistingKeys(): Promise<Set<string>> {
  const keys = new Set<string>();
  let continuationToken: string | undefined;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        ContinuationToken: continuationToken,
      })
    );

    for (const item of response.Contents ?? []) {
      if (item.Key) {
        keys.add(item.Key);
      }
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
}

async function uploadFile(relativePath: string) {
  const fullPath = path.join(CDN_SOURCE_DIR, relativePath);
  const body = await readFile(fullPath);

  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: relativePath,
      Body: body,
      ContentType: contentTypeFor(fullPath),
    })
  );
}

async function main() {
  const localFiles = await collectFiles(CDN_SOURCE_DIR, CDN_SOURCE_DIR);
  const existingKeys = await listExistingKeys();

  let uploaded = 0;
  let skipped = 0;

  for (const relativePath of localFiles) {
    if (!overwrite && existingKeys.has(relativePath)) {
      skipped += 1;
      continue;
    }

    await uploadFile(relativePath);
    uploaded += 1;
    console.log(`[upload] ${relativePath}`);
  }

  console.log(`[done] Uploaded ${uploaded} file(s); skipped ${skipped} existing file(s).`);
}

main().catch((error) => {
  console.error("R2 sync failed.");
  console.error(error);
  process.exit(1);
});
