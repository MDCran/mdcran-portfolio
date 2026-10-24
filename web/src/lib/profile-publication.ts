import { createHash } from "node:crypto";
import { cache } from "react";
import { ENGINEERING_SUMMARY, coreAiContracts, engineeringProjectOrder, engineeringProjects } from "./engineering";
import type { Project, ResumeProfile, SiteContentAiUsage, Skill, SkillCategoryMeta } from "./types";

export interface PublishedSkillGroup { id: string; title: string; tags: string[] }
export type PublishedProfile = Pick<ResumeProfile, "fullName" | "title" | "location" | "linkedinUrl" | "githubUrl">;
export interface PublishedProject {
  slug: string; title: string; summary: string; href: string;
  sourceUrl?: string; sourceLabel: string; liveUrl?: string; status?: string;
}
export interface ProfilePublication {
  schemaVersion: 1;
  generatedAt: string;
  hash: string;
  profile: PublishedProfile;
  summary: string;
  skillGroups: PublishedSkillGroup[];
  projects: PublishedProject[];
  reportedAiTokens: number;
  aiUsageUpdated: string;
  screenshotPath: string;
  readme: string;
  counts: { skills: number; skillCategories: number; projects: number };
}

export function publicUrl(value?: string): string | undefined {
  try {
    const url = new URL(value ?? "");
    const containsCredentials = [...url.searchParams.keys()].some((key) => /token|secret|signature|credential|authorization|api[_-]?key/i.test(key));
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password && !containsCredentials ? url.href : undefined;
  } catch { return undefined; }
}

export function publishedSkillGroups(skills: Skill[], categories: SkillCategoryMeta[]): PublishedSkillGroup[] {
  const categoryIds = [...new Set([...categories.map((c) => c.id), ...skills.map((s) => s.category)])];
  return categoryIds.map((id) => ({
    id,
    title: categories.find((c) => c.id === id)?.label || id || "Skills",
    tags: [...new Set(skills.filter((s) => s.category === id).map((s) => s.name.trim()).filter(Boolean))],
  })).filter((group) => group.tags.length > 0);
}

function markdown(value: string) {
  return value.replace(/[\r\n]+/g, " ").replace(/([\\`*_[\]<>|])/g, "\\$1").trim();
}
function link(label: string, url: string) {
  return `[${markdown(label)}](<${url.replaceAll("<", "%3C").replaceAll(">", "%3E")}>)`;
}

export function buildProfilePublication(input: {
  profile: ResumeProfile; skills: Skill[]; categories: SkillCategoryMeta[];
  projects: Project[]; aiUsage: SiteContentAiUsage;
}, generatedAt = new Date().toISOString()): ProfilePublication {
  const { aiUsage } = input;
  // Deliberate public projection: never spread a database document into an export.
  // Email/PDF links are available on the public resume but not needed by this feed.
  const profile: PublishedProfile = {
    fullName: input.profile.fullName, title: input.profile.title, location: input.profile.location,
    linkedinUrl: publicUrl(input.profile.linkedinUrl) ?? "", githubUrl: publicUrl(input.profile.githubUrl) ?? "",
  };
  const skillGroups = publishedSkillGroups(input.skills, input.categories);
  const publicProjects = input.projects.filter((p) => p.visible !== false && p.slug !== "lucky-block-creator-website" && [p.category, ...(p.extraCategories ?? [])].some((category) => ["coding-projects", "code"].includes(category.toLowerCase())));
  const order = [...engineeringProjectOrder] as string[];
  const projects: PublishedProject[] = [...publicProjects].sort((a, b) => {
    const ai = order.indexOf(a.slug), bi = order.indexOf(b.slug);
    return (ai < 0 ? order.length : ai) - (bi < 0 ? order.length : bi);
  }).map((project) => {
    const detail = engineeringProjects[project.slug];
    return {
      slug: project.slug,
      title: project.title,
      summary: detail?.summary || project.description || "Public project notes are available at the evidence link.",
      href: `https://www.mdcran.com/engineering/${encodeURIComponent(project.slug)}`,
      sourceUrl: publicUrl(project.slug === "core-ai" ? coreAiContracts.repo : detail?.sourceUrl ?? project.githubUrl ?? project.repositories?.[0]?.url),
      sourceLabel: project.slug === "core-ai" ? "Separate public AI contracts (platform implementation is private)" : detail?.sourceLabel || "Public source",
      liveUrl: publicUrl(project.liveUrl),
      status: detail?.status,
    };
  });
  if (!projects.some((p) => p.slug === coreAiContracts.id)) projects.push({
    slug: coreAiContracts.id, title: coreAiContracts.title, summary: coreAiContracts.summary,
    href: `https://www.mdcran.com/engineering/${coreAiContracts.id}`,
    sourceUrl: coreAiContracts.repo, sourceLabel: "Public contracts source", status: coreAiContracts.status,
  });
  const reportedAiTokens = aiUsage.totalTokens ?? aiUsage.claude.totalTokens + aiUsage.openai.totalTokens;
  const screenshotPath = "assets/githubprofile.png";
  const contactLinks = [
    link("Portfolio", "https://www.mdcran.com"), link("Resume", "https://www.mdcran.com/resume"),
    link("Printable resume", "https://www.mdcran.com/resume/print"), link("Contact", "https://www.mdcran.com/contact"),
    ...(publicUrl(profile.linkedinUrl) ? [link("LinkedIn", publicUrl(profile.linkedinUrl)!)] : []),
    ...(publicUrl(profile.githubUrl) ? [link("GitHub", publicUrl(profile.githubUrl)!)] : []),
  ];
  const projectTable = [
    "| Project & case study | What it demonstrates | Source | Live product |",
    "| --- | --- | --- | --- |",
    ...projects.map((project) => `| ${link(project.title, project.href)} | ${markdown(project.summary)} | ${project.sourceUrl ? link(project.slug === "core-ai" ? "Public contracts" : project.sourceLabel, project.sourceUrl) : "Not listed"} | ${project.liveUrl ? link("Open", project.liveUrl) : "—"} |`),
  ].join("\n");
  const readme = [
    "<!-- Generated from the shared public portfolio publication snapshot. -->",
    `# ${markdown(profile.fullName)}`,
    `![${markdown(profile.fullName)} — current portfolio profile](${screenshotPath})`,
    `**${markdown(profile.title)}**${profile.location ? ` · ${markdown(profile.location)}` : ""}`,
    ENGINEERING_SUMMARY,
    contactLinks.join(" · "),
    "## Public engineering work",
    projectTable,
    "CoreTV’s platform implementation is private; Core AI is a separate public contracts package. Case studies contain contributions, architecture, and published status. A dash means no live-product URL is listed.",
    "## Skills from my current resume",
    ...skillGroups.map((g) => `**${markdown(g.title)}**: ${g.tags.map(markdown).join(" · ")}`),
    "## Published AI usage",
    `${reportedAiTokens.toLocaleString("en-US")} AI tokens processed, as reported by the portfolio tracker${aiUsage.lastUpdated ? ` (tracker updated ${markdown(aiUsage.lastUpdated)})` : ""}. This is a reported usage total, not a claim about model training or business impact.`,
    "## Writing",
    link("Articles & project writing", "https://www.mdcran.com/articles"),
    "The profile image, resume, skills, and project links are generated from the same public portfolio data. Private client implementations and customer data are not published here.",
    "",
  ].join("\n\n");
  const counts = { skills: skillGroups.reduce((sum, g) => sum + g.tags.length, 0), skillCategories: skillGroups.length, projects: projects.length };
  const content = { schemaVersion: 1 as const, profile, summary: ENGINEERING_SUMMARY, skillGroups, projects, reportedAiTokens, aiUsageUpdated: aiUsage.lastUpdated, screenshotPath, readme, counts };
  const hash = createHash("sha256").update(JSON.stringify(content)).digest("hex");
  return { ...content, generatedAt, hash };
}

export const getProfilePublication = cache(async (): Promise<ProfilePublication> => {
  const { getResumeProfile, getSkills, getSkillCategories, getProjects, getSiteContent } = await import("./db");
  const [profile, skills, categories, projects, site] = await Promise.all([
    getResumeProfile(), getSkills(), getSkillCategories(), getProjects({ refreshVideoViews: false }), getSiteContent(),
  ]);
  return buildProfilePublication({ profile, skills, categories, projects, aiUsage: site.aiUsageTracker });
});
