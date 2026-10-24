import type { Article, Project } from "./types";
import { engineeringDetail, publicEngineeringProjects } from "./engineering-projects";
import { matchesArea } from "./portfolio-evidence";
import { matchesRole, type PortfolioRole } from "./public-portfolio";

export interface EngineeringWorkEntry {
  kind?: "project" | "article";
  slug: string;
  title?: string;
  text: string;
  roles?: Exclude<PortfolioRole, "all">[];
}

type EngineeringWorkItem = EngineeringWorkEntry & (
  { kind: "project"; project: Project } | { kind: "article"; article: Article }
);

export function engineeringWorkItems(projects: Project[], articles: Article[]): EngineeringWorkItem[] {
  const projectItems: EngineeringWorkItem[] = publicEngineeringProjects(projects).map((project) => {
    const detail = engineeringDetail(project.slug);
    return {
      kind: "project", project, slug: project.slug, title: project.title,
      text: [project.title, project.description, ...(project.tags ?? []), ...(detail?.skills ?? []), detail?.category].join(" "),
    };
  });
  const articleItems: EngineeringWorkItem[] = articles
    .filter((article) => article.visible !== false && (article.tags ?? []).some((tag) => /\b(engineering|typescript|react|ai|software|cloud)\b/i.test(tag)))
    .map((article) => {
      const text = [article.title, article.excerpt, ...(article.tags ?? [])].join(" ");
      const roles: Exclude<PortfolioRole, "all">[] = [];
      if (matchesArea(text, "ai")) roles.push("ai");
      if (/\bbackend\b|\bapis?\b|database|postgres|\bsql\b|\bservices?\b/i.test(text)) roles.push("backend");
      if (matchesArea(text, "full-stack")) roles.push("full-stack");
      return { kind: "article", article, slug: article.slug, title: article.title, text, roles };
    });
  return [...projectItems, ...articleItems];
}

export function matchesEngineeringWork(entry: EngineeringWorkEntry, role: PortfolioRole, area: string, query: string): boolean {
  const roleMatches = role === "all" || (entry.roles ? entry.roles.includes(role) : matchesRole(entry.slug, role));
  return roleMatches && matchesArea(entry.text, area) && entry.text.toLowerCase().includes(query.trim().toLowerCase());
}
