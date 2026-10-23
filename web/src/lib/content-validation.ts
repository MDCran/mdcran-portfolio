export const CONTENT_COLLECTIONS = ["projects", "articles", "clients", "experiences", "educations", "skills", "certifications", "awards", "clubs", "contacts", "campaigns", "rizz", "skillCategories", "resumeProfile", "siteContent", "chatConfig"] as const;
export type ContentCollection = typeof CONTENT_COLLECTIONS[number];
export class AdminDataError extends Error {
  constructor(message: string, public status = 422) { super(message); this.name = "AdminDataError"; }
}
export function contentCollection(value: unknown): ContentCollection {
  if (typeof value !== "string" || !CONTENT_COLLECTIONS.includes(value as ContentCollection)) throw new AdminDataError("Unsupported collection");
  return value as ContentCollection;
}
export function recordKey(collection: ContentCollection, record: Record<string, unknown>): string {
  const value = collection === "resumeProfile" ? "profile" : collection === "chatConfig" ? "config" : collection === "skills" ? record.name : record.id;
  if (typeof value !== "string" || !value.trim() || value.length > 200) throw new AdminDataError("A stable record identifier is required");
  return value;
}
export function recordFilter(collection: ContentCollection, id: string) {
  return ["resumeProfile", "chatConfig"].includes(collection) ? {} : collection === "skills" ? { name: id } : { id };
}
function inspect(value: unknown, depth = 0): void {
  if (depth > 20) throw new AdminDataError("Record nesting is too deep");
  if (typeof value === "string" && value.length > 250_000) throw new AdminDataError("Text field exceeds 250,000 characters");
  if (Array.isArray(value)) {
    if (value.length > 5000) throw new AdminDataError("Too many entries");
    value.forEach((item) => inspect(item, depth + 1));
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (key.startsWith("$") || key.includes(".") || ["__proto__", "constructor", "prototype"].includes(key)) throw new AdminDataError("Invalid field name");
      if (typeof child === "string" && /(?:url|href|src)$/i.test(key) && child && !/^(https?:\/\/|\/[^/]|mailto:|tel:|#)/i.test(child)) throw new AdminDataError(`Invalid URL in ${key}`);
      inspect(child, depth + 1);
    }
  }
}
const required: Partial<Record<ContentCollection, string[]>> = {
  projects: ["title", "slug", "category"], articles: ["title", "slug"], clients: ["name"],
  experiences: ["companyName", "role"], educations: ["institution"], skills: ["name", "category"],
  certifications: ["name", "issuer"], awards: ["name"], clubs: ["name"], skillCategories: ["label"], resumeProfile: ["fullName"],
};
export function validateRecord(collection: ContentCollection, value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new AdminDataError("Expected a record object");
  if (JSON.stringify(value).length > 2_000_000) throw new AdminDataError("Record is too large");
  inspect(value);
  const record = { ...value } as Record<string, unknown>;
  if (record._version !== undefined && (!Number.isSafeInteger(record._version) || Number(record._version) < 0)) throw new AdminDataError("Invalid record version");
  delete record._id;
  delete record._version;
  recordKey(collection, record);
  for (const field of required[collection] ?? []) if (typeof record[field] !== "string" || !(record[field] as string).trim()) throw new AdminDataError(`${field} is required`);
  for (const field of ["tags", "images", "clientIds", "sections", "socialLinks", "roles", "highlights", "contactIds"]) if (record[field] !== undefined && !Array.isArray(record[field])) throw new AdminDataError(`${field} must be an array`);
  for (const field of ["visible", "featured", "current", "subscribed"]) if (record[field] !== undefined && typeof record[field] !== "boolean") throw new AdminDataError(`${field} must be a boolean`);
  if (record._position !== undefined && (!Number.isSafeInteger(record._position) || Number(record._position) < 0)) throw new AdminDataError("Invalid ordering position");
  if (collection === "projects") {
    if (!["arts-and-entertainment", "motion-and-graphics", "coding-projects", "press", "publications", "software"].includes(String(record.category))) throw new AdminDataError("Invalid project category");
    if (!record.pricing || typeof record.pricing !== "object" || !["free", "for_sale", "unavailable"].includes(String((record.pricing as Record<string, unknown>).status))) throw new AdminDataError("Project pricing status is required");
  }
  if (collection === "articles") {
    if (!Array.isArray(record.tags) || !Array.isArray(record.sections)) throw new AdminDataError("Articles require tags and sections arrays");
  }
  if (collection === "chatConfig") {
    if (!Number.isFinite(record.rateLimit) || Number(record.rateLimit) < 1 || Number(record.rateLimit) > 10000 || !Number.isFinite(record.rateWindowHours) || Number(record.rateWindowHours) <= 0 || Number(record.rateWindowHours) > 8760) throw new AdminDataError("Invalid chat rate limits");
    if (record.extraContext !== undefined && typeof record.extraContext !== "string") throw new AdminDataError("extraContext must be text");
  }
  if (collection === "campaigns") {
    if (!["email", "sms"].includes(String(record.type)) || !["draft", "scheduled", "sent"].includes(String(record.status))) throw new AdminDataError("Invalid campaign channel or status");
    if (record.status === "scheduled" && (typeof record.scheduledFor !== "string" || !Number.isFinite(Date.parse(record.scheduledFor)))) throw new AdminDataError("Scheduled campaigns require a valid date");
  }
  if (record.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(record.slug))) throw new AdminDataError("Slug must contain lowercase words separated by hyphens");
  return record;
}
