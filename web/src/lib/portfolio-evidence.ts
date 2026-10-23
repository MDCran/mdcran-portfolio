import { engineeringProjects } from "./engineering";
export const projectAreas = [
  "all",
  "ai",
  "full-stack",
  "cloud",
  "mobile",
] as const;
export type ProjectArea = (typeof projectAreas)[number];
export function matchesArea(text: string, area: string) {
  const patterns: Record<string, RegExp> = {
    ai: /\bai\b|agent|llm|input isolation/i,
    "full-stack": /full.stack|next\.js|react|api|backend/i,
    cloud: /cloud|docker|infrastructure|aws|linux|delivery/i,
    mobile: /mobile|react native/i,
  };
  return area === "all" || Boolean(patterns[area]?.test(text));
}
export function evidenceForSkill(
  skill: string,
  publicSlugs: readonly string[] = [],
) {
  return Object.entries(engineeringProjects)
    .filter(
      ([slug, p]) =>
        publicSlugs.includes(slug) &&
        p.skills.some((s) => s.toLowerCase() === skill.toLowerCase()),
    )
    .map(([slug, p]) => ({
      slug,
      category: p.category,
      href: `/engineering#project-${slug}`,
    }));
}
export function matchJobDescription(
  text: string,
  publicSlugs: readonly string[] = [],
) {
  const skills = [
    ...new Set(
      Object.entries(engineeringProjects)
        .filter(([slug]) => publicSlugs.includes(slug))
        .flatMap(([, p]) => p.skills),
    ),
  ];
  const lower = text.toLowerCase();
  return skills
    .filter((skill) =>
      new RegExp(
        `(^|[^a-z0-9])${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9])`,
        "i",
      ).test(lower),
    )
    .map((skill) => ({
      skill,
      evidence: evidenceForSkill(skill, publicSlugs),
    }));
}
