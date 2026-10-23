import type { Article, Client, Project } from "./types";
import { validPublishDate } from "./project-date";
import { projectUrl } from "./utils";
import { contentEditorHref } from "./content-editor-link";

export type HealthCategory = "copy" | "media" | "dates" | "routing" | "source" | "seo" | "links";
export interface ContentHealthIssue {
  id: string; severity: "error" | "warning" | "info"; category: HealthCategory;
  collection: "projects" | "articles" | "clients"; recordId: string; title: string;
  field: string; message: string; editorHref: string; publicHref?: string;
}
export interface ContentHealthReport {
  checkedAt: string; issues: ContentHealthIssue[]; truncated: boolean;
  counts: { projects: number; articles: number; clients: number; issues: number };
}
export interface ContentHealthData { projects: Project[]; articles: Article[]; clients: Client[] }
export interface PublicLinkCheck { url: string; state: "ok" | "redirect" | "broken" | "unavailable"; status?: number; note?: string }

const protectedSlug = "lucky-block-creator-website";
const isPublic = (p: { visible?: boolean; slug: string }) => p.visible !== false && p.slug !== protectedSlug;
const savedText = (value: unknown): string => typeof value === "string" ? value : "";
const staticPaths = new Set(["/", "/work", "/engineering", "/code", "/coding-projects", "/resume", "/resume/print", "/articles", "/contact", "/githubprofile", "/arts-and-entertainment", "/arts-and-entertainment/minecraft-maps", "/arts-and-entertainment/events", "/motion-and-graphics", "/motion-and-graphics/graphic-design", "/motion-and-graphics/thumbnail-design", "/motion-and-graphics/web-dev-design", "/motion-and-graphics/web-design", "/motion-and-graphics/video-editing", "/publications", "/coretv", "/terminal", "/status", "/visitor", "/visitor-map", "/subscribe", "/unsubscribe", "/privacy", "/terms", "/legal", "/rizz", "/bar", "/rival-card", "/pocket-sunshine", "/2d-pong"]);

function internalReference(value: string) {
  if (!value.startsWith("/") && !/^https?:\/\/(?:www\.)?mdcran\.com(?:\/|$)/i.test(value)) return null;
  try {
    const url = new URL(value, "https://www.mdcran.com");
    if (!["mdcran.com", "www.mdcran.com"].includes(url.hostname)) return null;
    if (/^\/(?:cdn|fonts|icons|api|admin)(?:\/|$)/.test(url.pathname) || /\.(?:png|jpe?g|gif|svg|webp|avif|pdf|mp4|webm|ico|woff2?)$/i.test(url.pathname)) return null;
    return { path: url.pathname.replace(/\/$/, "") || "/", hash: url.hash };
  } catch { return null; }
}
function inspectRecord(record: unknown) {
  const altGaps: string[] = [];
  const links: { field: string; value: string }[] = [];
  function walk(value: unknown, path: string, depth: number) {
    if (depth > 12) return;
    if (typeof value === "string") {
      if (/(?:coverImage|images\.\d+|beforeImage|afterImage)$/.test(path) && value.trim()) altGaps.push(path);
      if (/(?:url|href|src)$/i.test(path) && value.trim()) links.push({ field: path, value });
      for (const match of value.matchAll(/\[[^\]]*\]\(<?([^\s)>]+)>?\)/g)) links.push({ field: path, value: match[1] });
    } else if (Array.isArray(value)) value.slice(0, 1000).forEach((item, i) => walk(item, `${path}.${i}`, depth + 1));
    else if (value && typeof value === "object") {
      const object = value as Record<string, unknown>;
      if (typeof object.src === "string" && typeof object.alt !== "string" && (/\.(?:png|jpe?g|gif|svg|webp|avif)(?:[?#]|$)/i.test(object.src) || /image/i.test(String(object.type ?? path)))) altGaps.push(`${path}.alt`);
      for (const [key, child] of Object.entries(object)) walk(child, path ? `${path}.${key}` : key, depth + 1);
    }
  }
  walk(record, "", 0);
  return { altGaps: [...new Set(altGaps)], links };
}

export function inspectContentHealth(data: ContentHealthData, checkedAt = new Date().toISOString()): ContentHealthReport {
  const issues: ContentHealthIssue[] = [];
  const publicProjects = data.projects.filter(isPublic);
  const paths = new Set(staticPaths);
  publicProjects.forEach((p) => {
    paths.add(projectUrl(savedText(p.category), savedText(p.slug), savedText(p.subcategory)).split("#")[0]);
    paths.add(`/coding-projects/${p.slug}`); paths.add(`/code/${p.slug}`);
    if (p.subcategory === "web-dev-design") paths.add(`/motion-and-graphics/web-design/${p.slug}`);
  });
  data.articles.filter(isPublic).forEach((a) => paths.add(`/articles/${a.slug}`));
  data.clients.forEach((c) => { paths.add(`/clients/${c.id}`); if (c.isEmployer) paths.add(`/employers/${c.id}`); });
  const projectAnchors = new Set([...publicProjects.map((p) => `#project-${p.slug}`), "#project-core-ai-contracts"]);
  for (const collection of ["projects", "articles", "clients"] as const) {
    const records = data[collection];
    const slugs = new Map<string, number>();
    if (collection !== "clients") for (const record of records as (Project | Article)[]) slugs.set(savedText(record.slug).trim().toLowerCase(), (slugs.get(savedText(record.slug).trim().toLowerCase()) ?? 0) + 1);
    for (const record of records) {
      const named = record as Project & Article & Client;
      const title = savedText(named.title) || savedText(named.name) || record.id;
      const visible = collection === "clients" || isPublic(named);
      const publicHref = visible ? collection === "projects" ? projectUrl(savedText(named.category), savedText(named.slug), savedText(named.subcategory)) : collection === "articles" ? `/articles/${named.slug}` : `/${named.isEmployer ? "employers" : "clients"}/${record.id}` : undefined;
      function add(category: HealthCategory, severity: ContentHealthIssue["severity"], field: string, message: string) {
        issues.push({ id: `${collection}:${record.id}:${field}:${category}:${issues.length}`, category, severity, collection, recordId: record.id, title, field, message, editorHref: contentEditorHref(collection, record.id), publicHref });
      }
      if (!(savedText(named.title) || savedText(named.name)).trim()) add("seo", "error", collection === "clients" ? "name" : "title", "A readable public title/name is missing.");
      const copy = savedText(collection === "projects" ? named.description : collection === "articles" ? named.excerpt : named.bio);
      if (!copy?.trim()) add("copy", "warning", collection === "projects" ? "description" : collection === "articles" ? "excerpt" : "bio", "No summary is saved. Add a concise, factual description for visitors and previews.");
      else if (collection !== "clients" && copy.trim().length < 50) add("seo", "info", collection === "articles" ? "excerpt" : "description", "The summary is shorter than 50 characters. Review whether it explains the work clearly; this is an editorial suggestion, not a ranking score.");
      if (title.length > 70) add("seo", "info", "title", "The title exceeds 70 characters and may be truncated in search previews. Review its opening words.");
      if (collection !== "clients") {
        if (!named.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(named.slug)) add("routing", "error", "slug", "The slug is missing or is not a lowercase hyphenated route identifier.");
        if ((slugs.get(savedText(named.slug).trim().toLowerCase()) ?? 0) > 1) add("routing", "error", "slug", "This slug is used by more than one record in this collection. Choose a unique slug before publishing.");
        if (!named.publishDate) add("dates", "info", "publishDate", "No publication date is saved. Add an authoritative date only if known.");
        else if (!validPublishDate(savedText(named.publishDate))) add("dates", "error", "publishDate", "This date cannot be parsed as a real supported publication date.");
        if (named.updatedDate && !validPublishDate(savedText(named.updatedDate))) add("dates", "warning", "updatedDate", "The updated date is invalid.");
        if (!named.coverImage && !(named.images?.length)) add("media", "info", "coverImage", "No cover/gallery image is saved; the page or social preview may use a fallback.");
        const { altGaps } = inspectRecord(record);
        if (altGaps.length) add("media", "warning", altGaps.slice(0, 8).join(", "), `${altGaps.length} image field(s) lack explicit alt metadata. Renderers may use title/caption fallbacks; review descriptive text or intentional decorative treatment.`);
      }
      if (collection === "projects" && named.slug === protectedSlug && named.visible !== false) add("source", "info", "visible", "This protected project is excluded from public queries by slug. Set visible=false as an additional explicit content safeguard.");
      if (collection === "projects" && ["core-ai", "webdesign-portfolio"].includes(named.slug)) {
        const expected = named.slug === "core-ai" ? "https://github.com/mdcran/core-ai" : "https://github.com/mdcran/mdcran-portfolio";
        const source = savedText(named.githubUrl || named.repositories?.[0]?.url);
        if (source && source.replace(/\/$/, "").toLowerCase() !== expected) add("source", "warning", "githubUrl / repositories", named.slug === "core-ai" ? "The stored source differs from the approved public Core AI contracts repository. The CoreTV platform implementation remains private; public engineering views override this link." : "The stored source differs from MDCran/mdcran-portfolio. Public engineering views override it; update the record to keep every consumer consistent.");
      }
      for (const reference of inspectRecord(record).links) {
        const internal = internalReference(reference.value);
        if (internal && (!paths.has(internal.path) || internal.path === "/engineering" && internal.hash.startsWith("#project-") && !projectAnchors.has(internal.hash))) add("links", "warning", reference.field, "This internal reference does not match a known public page or published project anchor. Check for a renamed, removed, or hidden destination.");
      }
    }
  }
  const priority = { error: 0, warning: 1, info: 2 };
  issues.sort((a, b) => priority[a.severity] - priority[b.severity]);
  return { checkedAt, issues: issues.slice(0, 500), truncated: issues.length > 500, counts: { projects: data.projects.length, articles: data.articles.length, clients: data.clients.length, issues: issues.length } };
}

const liveHosts = new Set(["mdcran.com", "www.mdcran.com", "cdn.mdcran.com", "github.com", "raw.githubusercontent.com", "coretv.co", "www.coretv.co", "thecoreboys.com", "www.thecoreboys.com", "healthtracker.mdcran.com", "icesales.com", "www.icesales.com", "www.ucf.edu"]);
export function allowedHealthCheckUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !liveHosts.has(url.hostname) || url.username || url.password || url.port || url.search || /^\/(?:api|admin)(?:\/|$)/i.test(decodeURIComponent(url.pathname))) return null;
    url.hash = "";
    return url.href;
  } catch { return null; }
}
export function publicHealthCheckUrls(data: ContentHealthData): string[] {
  return [...new Set([...data.projects.filter(isPublic), ...data.articles.filter(isPublic)].flatMap((record) => inspectRecord(record).links.map((link) => allowedHealthCheckUrl(link.value))).filter((url): url is string => !!url))].slice(0, 12);
}
export async function loadContentHealthData(): Promise<ContentHealthData> {
  const { getProjects, getArticles, getClients } = await import("./db");
  const [projects, articles, clients] = await Promise.all([getProjects({ includeHidden: true, refreshVideoViews: false }), getArticles({ includeHidden: true }), getClients()]);
  return { projects, articles, clients };
}
