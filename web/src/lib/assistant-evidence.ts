/** Deterministic retrieval over the public CMS catalog. No private repository lookup. */
const synonyms = [
  ["ai", "artificial intelligence", "llm", "agents", "agent", "machine learning"],
  ["full stack", "fullstack", "full-stack", "frontend", "backend", "next.js", "react"],
  ["mobile", "ios", "android", "react native"],
  ["cloud", "infrastructure", "hosting", "aws", "docker", "devops"],
  ["recruiter", "hiring", "career", "experience", "resume", "qualifications"],
  ["architecture", "design", "implementation", "system"],
];
const stop = new Set("the and for with what which show tell about your have does this that from me his michael".split(" "));
export function retrievalTerms(query: string): string[] {
  const normalized = query.toLowerCase();
  const base = normalized.split(/[^a-z0-9.+-]+/).filter(t => t.length > 1 && !stop.has(t));
  for (const group of synonyms) if (group.some(term => new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9])`).test(normalized))) base.push(...group);
  return [...new Set(base)];
}
export function rankPublicRecords<T>(items: T[], describe: (item: T) => string, query: string, limit: number): T[] {
  const terms = retrievalTerms(query);
  return items.map((item, index) => {
    const text = describe(item).toLowerCase();
    const score = terms.reduce((sum, term) => sum + (text.includes(term) ? (query.toLowerCase().includes(term) ? 3 : 1) : 0), 0);
    return { item, index, score };
  }).sort((a, b) => b.score - a.score || a.index - b.index).slice(0, limit).map(r => r.item);
}
export interface EvidenceSource { id: string; title: string; href: string; kind: "project" | "article" | "resume" | "source"; excerpt: string }
export function safePublicPath(value: unknown): value is string {
  return typeof value === "string" && !value.startsWith("//") && /^\/(?:[a-zA-Z0-9/_-]*)(?:#[a-zA-Z0-9_-]+)?$/.test(value) && !/^\/(?:api|admin|dashboard|login|private|auth|secret|identity|account|visitor)(?:\/|#|$)/i.test(value);
}
export function validatedCitations(text: string, catalog: readonly EvidenceSource[]): EvidenceSource[] {
  const urls = [...text.matchAll(/\[[^\]]+\]\(([^\s)]+)\)/g)].map(m => m[1]);
  return catalog.filter(source => urls.some(url => url === source.href || (safePublicPath(source.href) && url.split("#")[0] === source.href))).filter((s, i, all) => all.findIndex(x => x.href === s.href) === i).slice(0, 6);
}
