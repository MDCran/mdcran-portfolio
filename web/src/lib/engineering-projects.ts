import { coreAiContracts, engineeringProjectOrder, engineeringProjects, type EngineeringProjectDetail } from "./engineering";
import type { Project } from "./types";

export function isEngineeringProject(project: Project): boolean {
  return project.visible !== false && [project.category, ...(project.extraCategories ?? [])]
    .some((category) => ["coding-projects", "code", "software", "engineering"].includes(category.toLowerCase()));
}

export function publicEngineeringProjects(projects: Project[]): Project[] {
  const work = projects.filter(isEngineeringProject);
  const bySlug = new Map(work.map((project) => [project.slug, project]));
  const ordered = [
    ...engineeringProjectOrder.map((slug) => bySlug.get(slug)).filter((project): project is Project => !!project),
    ...work.filter((project) => !engineeringProjectOrder.some((slug) => slug === project.slug)),
  ];
  // These public contracts are maintained separately from the private Core AI platform.
  if (!projects.some((project) => project.slug === coreAiContracts.id)) ordered.push({
    id: coreAiContracts.id, slug: coreAiContracts.id, title: coreAiContracts.title,
    description: coreAiContracts.summary, category: "coding-projects",
    tags: [...coreAiContracts.skills], githubUrl: coreAiContracts.repo,
    pricing: { status: "unavailable" },
  });
  return ordered;
}

export function engineeringDetail(slug: string): EngineeringProjectDetail | undefined {
  return slug === coreAiContracts.id
    ? { ...coreAiContracts, skills: [...coreAiContracts.skills], decisions: [...coreAiContracts.decisions], sourceUrl: coreAiContracts.repo }
    : engineeringProjects[slug];
}
