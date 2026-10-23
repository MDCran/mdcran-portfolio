import { coreAiContracts, engineeringProjects } from "./engineering";

export const portfolioRoles = ["all", "ai", "backend", "full-stack"] as const;
export type PortfolioRole = (typeof portfolioRoles)[number];
export const roleLabels: Record<PortfolioRole, string> = { all: "All engineering", ai: "AI engineer", backend: "Backend engineer", "full-stack": "Full-stack engineer" };
export const roleDescriptions: Record<PortfolioRole, string> = {
  all: "Browse the same public projects through the lens that matters to your team.",
  ai: "Agent orchestration, AI integrations, input isolation, and explicit usage authorization.",
  backend: "Service boundaries, relational data, API integrations, and operational tooling.",
  "full-stack": "End-to-end interfaces, content systems, APIs, and accessible product experiences.",
};
const roleProjects: Record<Exclude<PortfolioRole, "all">, readonly string[]> = {
  ai: ["coretex", "core-ai-contracts", "core-ai", "webdesign-portfolio", "health-tracker"],
  backend: ["health-tracker", "coretex", "webdesign-portfolio", "core-ai-contracts"],
  "full-stack": ["webdesign-portfolio", "health-tracker", "coretex", "core-ai", "core-website", "army-reserve-mercury"],
};
export function normalizeRole(value: string | null | undefined): PortfolioRole {
  return portfolioRoles.includes(value as PortfolioRole) ? value as PortfolioRole : "all";
}
export function matchesRole(slug: string, role: PortfolioRole) {
  return role === "all" || roleProjects[role].includes(slug);
}
export function comparisonEvidence(slug: string) {
  const detail = slug === coreAiContracts.id ? coreAiContracts : engineeringProjects[slug];
  return detail ? { skills: detail.skills, responsibility: detail.contribution, outcome: detail.status } : null;
}

// Editorial interpretation of the implementation notes, not measured business results.
export const flagshipReviews: Record<string, { problem: string; tradeoff: string; result: string; next: string }> = {
  coretex: {
    problem: "Agent work, project planning, and local operations need a shared workspace across desktop and web.",
    tradeoff: "A shared React layer reduces duplicated interface work. Electron and the Brain service still require separate process boundaries and deployment concerns.",
    result: "The public pre-1.0 repository documents the shared clients, Brain service, PostgreSQL/Prisma persistence, and local setup. No adoption or latency measurement is claimed here.",
    next: "A useful next evaluation would trace one agent task across client, Brain, and persistence, then measure failure recovery and end-to-end latency.",
  },
  "health-tracker": {
    problem: "Health tracking, reports, and backups need a consistent interface and a structured data model across multiple tracking categories.",
    tradeoff: "A separate Spring Boot API gives backend concerns a clear boundary, while adding a second runtime to configure and deploy alongside Next.js.",
    result: "The published implementation includes tracking, date-range CSV and PDF exports, Google Drive backups, and versioned PostgreSQL migrations. These are delivered capabilities, not clinical outcome claims.",
    next: "A useful next evaluation would verify export completeness across date boundaries and exercise backup restoration using test data.",
  },
  "webdesign-portfolio": {
    problem: "Recruiters need a fast path to evidence while a broader portfolio also serves creative clients and interactive visitors.",
    tradeoff: "Server-rendered content stays readable before interaction. Optional browser features add capability and JavaScript, so personal widgets are loaded only on request.",
    result: "This running site provides public project filtering, role views, expandable case studies, managed content, and server-backed integrations.",
    next: "Compare field measurements across mobile and desktop visits before setting a performance target; check task completion with keyboard and screen-reader users.",
  },
};

export const sampleTrackingRows = [
  { date: "2026-01-08", category: "Workout", entry: "Sample walk", amount: "25 minutes" },
  { date: "2026-01-10", category: "Sleep", entry: "Sample sleep log", amount: "8 hours" },
  { date: "2026-01-12", category: "Workout", entry: "Sample mobility session", amount: "15 minutes" },
];
export function trackingCsv(from: string, to: string) {
  const rows = sampleTrackingRows.filter((r) => (!from || r.date >= from) && (!to || r.date <= to));
  return { rows, csv: ["Date,Category,Entry,Amount", ...rows.map((r) => [r.date, r.category, r.entry, r.amount].map((v) => `"${v.replaceAll('"', '""')}"`).join(","))].join("\r\n") };
}
