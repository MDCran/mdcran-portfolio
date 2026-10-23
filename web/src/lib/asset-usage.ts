import { getDb } from "@/lib/mongodb";
import { publicUrlForKey } from "@/lib/r2";
import { AdminDataError } from "@/lib/content-validation";
const SOURCES = ["projects", "articles", "clients", "experiences", "educations", "certifications", "awards", "clubs", "resumeProfile", "siteContent", "contentDrafts"];

export function assetReferencePaths(value: unknown, candidates: string[], path = ""): string[] {
  if (typeof value === "string") {
    let decoded = value;
    try { decoded = decodeURI(value); } catch { /* Keep malformed source text searchable. */ }
    return candidates.some((candidate) => decoded.includes(candidate) || value.includes(encodeURI(candidate))) ? [path] : [];
  }
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => assetReferencePaths(child, candidates, path ? `${path}.${key}` : key));
}

export async function getAssetUsage(key: string) {
  const normalized = key.trim().replace(/^\/+/, "");
  if (!normalized || normalized.includes("..") || normalized.length > 1024) throw new AdminDataError("Invalid asset key");
  const candidates = [publicUrlForKey(normalized), `/cdn/${normalized}`, `/${normalized}`];
  const db = await getDb();
  const references: Array<{ collection: string; id: string; title: string; fields: string[] }> = [];
  // Scan cursor-by-cursor so usage checks are complete without loading every record into memory.
  for (const collection of SOURCES) {
    for await (const record of db.collection(collection).find({}, { projection: { _id: 0 } })) {
      const fields = assetReferencePaths(record, candidates);
      if (fields.length) references.push({ collection, id: String(record.id ?? record.key ?? "profile"), title: String(record.title ?? record.name ?? record.fullName ?? record.key ?? collection), fields });
    }
  }
  return { key: normalized, references, canDelete: references.length === 0 };
}
