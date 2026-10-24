import type { Article, Client, Project } from "./types";
import { ROUTES } from "./terminal-shell";

export type SearchHit =
  | { kind: "project" | "article" | "client"; id: string; label: string }
  | { kind: "video"; url: string; label: string }
  | { kind: "route"; path: string[]; label: string };

export function normalizeSearch(text: string) {
  return text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function buildSearch(data: { projects: Project[]; articles: Article[]; clients: Client[] }, query: string): SearchHit[] {
  const needle = normalizeSearch(query);
  if (!needle) return [];
  const terms = needle.split(" ");
  const ranked: { hit: SearchHit; score: number }[] = [];
  const add = (hit: SearchHit, title: string, body: string) => {
    const name = normalizeSearch(title);
    const text = normalizeSearch(`${title} ${body}`);
    const words = text.match(/[\p{L}\p{N}+#._-]+/gu) ?? [];
    // Short technology names must not match inside unrelated words (AI/Tailwind).
    if (!terms.every(term => term.length <= 3 && /^[a-z0-9+#._-]+$/i.test(term)
      ? words.some(word => word === term || word === `${term}s` || word.startsWith(`${term}-`) || word.endsWith(`-${term}`))
      : text.includes(term))) return;
    ranked.push({ hit, score: name === needle ? 100 : name.startsWith(needle) ? 60 : name.includes(needle) ? 40 : terms.filter(term => name.includes(term)).length * 5 });
  };
  const routes = new Set<string>();
  for (const [label, path] of Object.entries(ROUTES)) {
    const key = path.join("/");
    if (normalizeSearch(label).includes(needle) && !routes.has(key)) {
      routes.add(key); add({ kind: "route", path, label }, label, key);
    }
  }
  for (const project of data.projects) {
    const relatedClients = data.clients.filter(client => project.clientIds?.includes(client.id)).map(client => client.name).join(" ");
    add({ kind: "project", id: project.id, label: `${project.title} (${project.slug})` }, project.title,
      [project.slug, project.description, project.longDescription, project.category, project.subcategory, project.tags?.join(" "), relatedClients,
        project.sections?.map(section => [section.content, section.caption].filter(Boolean).join(" ")).join(" ")].filter(Boolean).join(" "));
    for (const video of project.videos ?? []) if (video.youtubeId && video.title) {
      add({ kind: "video", url: `https://www.youtube.com/watch?v=${encodeURIComponent(video.youtubeId)}`, label: `${video.title} — ${project.title}` }, video.title, project.title);
    }
  }
  for (const article of data.articles) add({ kind: "article", id: article.id, label: `${article.title} (${article.slug})` }, article.title,
    [article.slug, article.excerpt, article.category, article.tags?.join(" "), article.sections?.map(section => section.content).join(" ")].filter(Boolean).join(" "));
  for (const client of data.clients) add({ kind: "client", id: client.id, label: `${client.name} (${client.id})` }, client.name,
    [client.id, client.bio, client.roles?.join(" ")].filter(Boolean).join(" "));
  return ranked.sort((a, b) => b.score - a.score || a.hit.label.localeCompare(b.hit.label)).map(result => result.hit);
}
