import type { Award, Certification, Education, Experience, Project, ResumeProfile, SiteContent, Skill } from "./types";
import { formatResumeDate, resumeSections } from "./resume-data";
import { isCodeProject } from "./terminal-shell";
import { buildSearch } from "./terminal-search";
import { projectUrl } from "./utils";

export type TerminalMode = "shell" | "ai";
export type TerminalPet = "cat" | "bot" | "crab" | "off";
export type TerminalAnimation = "scan" | "type" | "off";
export type ResumeSection = "all" | "summary" | "experience" | "education" | "skills" | "certifications" | "awards";
export type ResumeSnapshot = {
  resumeProfile?: ResumeProfile; siteContent: SiteContent; experiences: Experience[];
  educations: Education[]; skills: Skill[]; certifications: Certification[]; awards: Award[]; projects: Project[];
};
export type WorkspaceLine = { text: string; heading?: boolean };
export const RESUME_SECTIONS = ["all", "summary", "experience", "education", "skills", "certifications", "awards"] as const;
export const TOUR_STEPS = [
  { title: "Start with a command", description: "Shell is where you explore with commands. Type at the bottom and press Enter, or try the example here.", command: "help", action: "Show commands", hint: "Tab completes a command. ↑ brings back your last command.", mode: "shell", target: "command" },
  { title: "Find something interesting", description: "Search across projects, articles, and clients. Click a result or type its number to open it.", command: "search React", action: "Try a search", hint: "Replace React with any topic, project, or creator you’re curious about.", mode: "shell", target: "command" },
  { title: "Explore the resume", description: "Read Michael’s profile right here. Resume and recruiter tools are always available as commands.", command: "resume summary", action: "Show the resume", hint: "Next try resume experience, resume download, or recruiter projects.", mode: "shell", target: "command" },
  { title: "Ask in your own words", description: "AI chat lets you ask questions and follow up naturally. Try the draft below, then press Enter when you’re ready.", command: "What are Michael’s strongest engineering projects?", action: "Draft a question", hint: "Your question is only sent when you press Enter. Switch back to Shell for commands.", mode: "ai", target: "modes" },
  { title: "Make yourself at home", description: "The orange button at the top left changes the window size. In the floating window, drag the bottom-right corner to resize.", command: "", action: "Try the orange button", hint: "Try togglemusic, togglekeystrokeclicks, pet crab, snake, or pacman anytime.", mode: "shell", target: "window" },
] as const satisfies ReadonlyArray<{title:string;description:string;command:string;action:string;hint:string;mode:TerminalMode;target:string}>;

export function terminalTourStep(action: string, current: number | null): number | null | undefined {
  if (["stop", "end"].includes(action)) return null;
  if (["", "start"].includes(action)) return 0;
  if (action === "next") return current === null ? 0 : current + 1 < TOUR_STEPS.length ? current + 1 : null;
  if (action === "back") return Math.max(0, (current ?? 0) - 1);
  if (/^\d+$/.test(action)) {
    const index = Number(action) - 1;
    if (index >= 0 && index < TOUR_STEPS.length) return index;
  }
  return undefined;
}

export function resumeLines(data: ResumeSnapshot, section: ResumeSection): WorkspaceLine[] {
  const lines: WorkspaceLine[] = [];
  const add = (text: string, heading = false) => lines.push({ text, heading });
  const include = (value: ResumeSection) => section === "all" || section === value;
  if (include("summary")) {
    add(data.resumeProfile?.fullName || "Michael Cran", true);
    if (data.resumeProfile?.title) add(data.resumeProfile.title);
    if (data.resumeProfile?.location) add(data.resumeProfile.location);
    if (data.siteContent.homeAbout?.description) add(data.siteContent.homeAbout.description);
  }
  const { jobs, renownedProjects, volunteerWork, derivedEducations } = resumeSections(data.experiences, data.educations);
  if (include("experience")) {
    for (const [label, entries] of [["Work experience", jobs], ["Featured work", renownedProjects], ["Volunteer experience", volunteerWork]] as const) {
      if (!entries.length) continue;
      add(label.toUpperCase(), true);
      for (const entry of entries) {
        add(`${entry.role} · ${entry.companyName}`, true);
        add([period(entry.startDate, entry.endDate, entry.current), entry.location].filter(Boolean).join(" · "));
        if (entry.description) add(entry.description);
        entry.highlights?.forEach(highlight => add(`• ${highlight}`));
      }
    }
  }
  if (include("education")) {
    add("EDUCATION", true);
    for (const entry of derivedEducations) {
      add(`${entry.degree}${entry.field ? ` · ${entry.field}` : ""}`, true);
      add([entry.institution, period(entry.startDate, entry.endDate, entry.current), entry.location].filter(Boolean).join(" · "));
      if (entry.description) add(entry.description);
      entry.highlights?.forEach(highlight => add(`• ${highlight}`));
    }
    if (!derivedEducations.length) add("No education entries have been published.");
  }
  if (include("skills")) {
    add("SKILLS", true);
    for (const category of new Set(data.skills.map(skill => skill.category || "Other"))) {
      add(`${category}: ${data.skills.filter(skill => (skill.category || "Other") === category).map(skill => skill.name).join(", ")}`);
    }
    if (!data.skills.length) add("No skills have been published.");
  }
  if (include("certifications")) {
    add("CERTIFICATIONS", true);
    data.certifications.forEach(entry => add([entry.name, entry.issuer, formatResumeDate(entry.date)].filter(Boolean).join(" · ")));
    if (!data.certifications.length) add("No certifications have been published.");
  }
  if (include("awards")) {
    add("AWARDS", true);
    data.awards.forEach(entry => add([entry.name, entry.issuer, formatResumeDate(entry.date)].filter(Boolean).join(" · ")));
    if (!data.awards.length) add("No awards have been published.");
  }
  return lines;
}

function period(start?: string, end?: string, current?: boolean) {
  return [formatResumeDate(start), current ? "Present" : formatResumeDate(end)].filter(Boolean).join(" – ");
}

export function resumeLinks(profile?: ResumeProfile) {
  const links = [{ label: "Full resume", href: "/resume" }, { label: "Print / save PDF", href: "/resume/print" }];
  if (profile?.pdfUrl && safeDocumentUrl(profile.pdfUrl)) links.push({ label: "Download resume PDF", href: profile.pdfUrl });
  return links;
}

export function safeDocumentUrl(value: string) {
  if (/^\/(?!\/)[\w/.-]+\.pdf$/i.test(value) && !value.split("/").includes("..")) return true;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
}

export function recruiterProjects(data: Pick<ResumeSnapshot, "projects">, query = "") {
  const projects = data.projects.filter(isCodeProject);
  if (!query.trim()) return [...projects].sort((a,b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
  const hits = buildSearch({ projects, articles: [], clients: [] }, query);
  return hits.flatMap(hit => hit.kind === "project" ? projects.filter(project => project.id === hit.id) : []);
}

export type TerminalAction = { type: "project"; id: string } | { type: "resume"; section: ResumeSection } | { type: "projects" } | { type: "highlight"; text: string } | { type: "focus"; zone:"preview"|"results"|"transcript" };
/** Resolve model actions against the loaded public catalog. No selectors, arbitrary
 * URLs, shell evaluation, external browsing, or form submissions are accepted. */
export function terminalActions(raw: unknown, projects: Project[]): TerminalAction[] {
  if (!Array.isArray(raw)) return [];
  const output: TerminalAction[] = [];
  for (const item of raw.slice(0, 4)) {
    if (!item || typeof item.value !== "string") continue;
    if (item.type === "project") {
      const project = projects.find(project => project.id === item.value || project.slug === item.value);
      if (project) output.push({ type: "project", id: project.id });
    } else if (item.type === "navigate") {
      const value = item.value.replace(/^https:\/\/(?:www\.)?mdcran\.com(?=\/)/, "");
      const project = projects.find(project => value === projectUrl(project.category, project.slug, project.subcategory) || value === `/engineering/${project.slug}` || value === `/engineering#project-${project.slug}`);
      if (project) output.push({ type: "project", id: project.id });
      else if (value === "/resume" || value === "/resume/print") output.push({ type: "resume", section: "all" });
      else if (["/engineering", "/code", "/coding-projects"].includes(value)) output.push({ type: "projects" });
    } else if (item.type === "highlight") {
      const section = RESUME_SECTIONS.find(section => item.value === section || item.value === `resume-${section}`);
      if (section) output.push({ type: "resume", section });
      else if (["project-gallery","project-overview","project-actions","project-details","project-preview"].includes(item.value)) output.push({type:"focus",zone:"preview"});
      else if (["projects","engineering-projects","search-results"].includes(item.value)) output.push({type:"focus",zone:"results"});
      else if (/^[\w -]{1,100}$/.test(item.value)) output.push({ type: "highlight", text: item.value.replace(/-/g," ") });
    }
  }
  return output.filter((action,index) => output.findIndex(other => JSON.stringify(other) === JSON.stringify(action)) === index);
}

export function highlightParts(text: string, query: string) {
  if (!query.trim()) return [{ text, match: false }];
  const needle = query.toLocaleLowerCase();
  const lower = text.toLocaleLowerCase();
  const parts: {text:string;match:boolean}[] = [];
  let cursor = 0;
  let next = lower.indexOf(needle);
  while (next !== -1) {
    if (next > cursor) parts.push({text:text.slice(cursor,next),match:false});
    parts.push({text:text.slice(next,next+needle.length),match:true});
    cursor = next + needle.length;
    next = lower.indexOf(needle,cursor);
  }
  if (cursor < text.length) parts.push({text:text.slice(cursor),match:false});
  return parts;
}

export function terminalWindowSize(width: number, height: number, viewportWidth: number, viewportHeight: number) {
  const maxW = Math.max(240, viewportWidth - 24), maxH = Math.max(240, viewportHeight - 24);
  return { width: Math.round(Math.min(maxW, Math.max(Math.min(560,maxW), width))), height: Math.round(Math.min(maxH, Math.max(Math.min(400,maxH), height))) };
}
