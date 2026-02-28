import type { Project } from "./types";

export function pickRandomRelatedProjects(
  projects: Project[],
  currentProjectId: string,
  predicate: (project: Project) => boolean,
  count = 4
): Project[] {
  const pool = projects.filter((project) => project.id !== currentProjectId && predicate(project));

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, count);
}
