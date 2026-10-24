// Public project evidence, shared by the homepage and engineering overview.
export const ENGINEERING_SUMMARY =
  "Software and AI engineer building full-stack applications, APIs, AI integrations, and business automation. B.S. in Computer Science from the University of Central Florida; founder and lead engineer at CoreTV.";

export const engineeringFocus = [
  {
    id: "ai",
    title: "AI & agent systems",
    description: "Agent orchestration, LLM integration, and reusable input-isolation and usage-authorization contracts.",
    skills: ["Python", "TypeScript", "LLM integration", "AI automation", "pgvector"],
    evidence: "Explore Coretex's agent workspace and Core AI's public TypeScript contracts.",
  },
  {
    id: "full-stack",
    title: "Full-stack & backend",
    description: "Interfaces, REST APIs, relational data, and integrations that connect a product's user experience to its backend.",
    skills: ["React", "Next.js", "Java / Spring Boot", "FastAPI", "PostgreSQL"],
    evidence: "Review Health Tracker's frontend/backend structure and this portfolio's API routes.",
  },
  {
    id: "cloud",
    title: "Cloud & infrastructure",
    description: "Cloud services, containerized development, Linux systems, and automated delivery for applications and operational workflows.",
    skills: ["AWS", "Docker", "Linux", "GitHub Actions", "Cloudflare"],
    evidence: "See the container setup in Health Tracker, Coretex's development stack, and the portfolio's delivery workflows.",
  },
] as const;

export interface EngineeringProjectDetail {
  category: string;
  status: string;
  summary: string;
  contribution: string;
  decisions: string[];
  skills: string[];
  sourceUrl?: string;
  sourceLabel?: string;
  evidence?: string;
  evidenceLabel?: string;
}

// These descriptions add implementation context to the public project records.
// Each entry is matched by its stable CMS slug; full project notes and media are
// rendered from that same record on the engineering page.
export const engineeringProjects: Record<string, EngineeringProjectDetail> = {
  coretex: {
    category: "AI agents · Desktop & backend",
    status: "Pre-1.0 · Source available",
    summary: "A local-first workspace bringing AI agents, projects, communication, personal analytics, and developer operations into a Windows desktop application.",
    contribution: "Built and maintain the desktop and web workspace, its shared React application layer, and the TypeScript Brain service that connects agent work with integrations and local operations.",
    decisions: [
      "Share the application layer across Electron and Next.js clients so core workflows stay consistent.",
      "Use PostgreSQL and Prisma in the Brain service, with Docker-backed local development.",
      "Keep credentials and local application data outside the public repository.",
      "Bring agent orchestration, project planning, communications, and personal tracking into one local-first workspace.",
    ],
    skills: ["TypeScript", "React", "Electron", "Next.js", "PostgreSQL", "Prisma", "Docker", "AI agents"],
    evidence: "https://github.com/MDCran/coretex#architecture",
    evidenceLabel: "Architecture & run instructions",
  },
  "core-ai": {
    category: "Business technology · Full-stack platform",
    status: "Live at CoreTV.co",
    summary: "The public CORE Business Technology platform brings web services, growth, AI, automation, and workplace technology into one responsive experience.",
    contribution: "The platform connects service discovery to package pricing, custom estimates, booking, contact, and client access. Its public delivery model documents six reviewable stages: Audit, Proposal, Design, Build, Launch, and Growth.",
    decisions: [
      "Present services and pricing alongside clear scope, exclusions, and review points.",
      "Make the path from learning about a service to requesting an estimate or booking easy to follow.",
      "Keep the public case study inspectable while private providers, policies, prompts, and customer data remain private.",
      "Link the product to a separate, provider-neutral Core AI contracts package for input isolation and usage authorization.",
    ],
    skills: ["Next.js", "React", "TypeScript", "Responsive design", "AI integration", "Automation", "SEO"],
    sourceLabel: "Core AI contracts",
    evidence: "https://coretv.co/work/core-public-platform",
    evidenceLabel: "Public platform case note",
  },
  "core-website": {
    category: "Web application · Interactive experiences",
    status: "Live at TheCoreBoys.com · Source available",
    summary: "A public landing page for a six-person creator group, combining a Three.js hero, animated manifesto, member roster, and live Twitch status.",
    contribution: "Built the Next.js 15 and React 19 experience, organizing the page into seven sections and connecting the roster to a shared Twitch live-status response.",
    decisions: [
      "Compose the experience from focused sections for the hero, manifesto, roster, live status, house reveal, crew, and footer.",
      "Fetch all six member streams in one cached Twitch Helix request and refresh the client view periodically.",
      "Use Zod to validate environment and API inputs, and combine Three.js, GSAP, Framer Motion, and Lenis for the visual experience.",
    ],
    skills: ["Next.js 15", "React 19", "TypeScript", "Three.js", "GSAP", "Twitch API", "Zod"],
  },
  "webdesign-portfolio": {
    sourceUrl: "https://github.com/MDCran/mdcran-portfolio",
    category: "Full-stack · AI & service integrations",
    status: "Live at mdcran.com",
    summary: "The application behind this site: a responsive portfolio with managed content, API integrations, streaming AI chat, voice features, and analytics.",
    contribution: "Designed, built, and maintain the Next.js application and its content, portfolio, analytics, and integration routes. The project record also documents the visitor experience through screenshots and a terminal-mode demo.",
    decisions: [
      "Use server-rendered pages alongside interactive React components for browsing and live experiences.",
      "Store editable portfolio content in MongoDB and expose public data through focused API routes.",
      "Integrate streaming chat and speech services through server-side routes so provider credentials stay on the server.",
      "Treat accessibility, screen-reader support, theme controls, and responsive layouts as part of the site experience.",
    ],
    skills: ["Next.js", "React", "TypeScript", "MongoDB", "REST APIs", "AI integrations", "Accessibility"],
    evidence: "https://github.com/MDCran/mdcran-portfolio/tree/main/web/src/app/api",
    evidenceLabel: "API routes & integrations",
  },
  "health-tracker": {
    category: "Full-stack · APIs & data",
    status: "Live at healthtracker.mdcran.com · Source available",
    summary: "A personal health platform for workouts, nutrition, sleep, vitals, habits, therapeutics, appointments, and body metrics, with AI food analysis and exportable reports.",
    contribution: "Built the Next.js frontend and Spring Boot backend around a unified dashboard. The application supports Google Drive backups, AI-assisted health insights, PDF reports, CSV exports with date ranges, and containerized deployment.",
    decisions: [
      "Separate the Next.js frontend from the Spring Boot API and persist relational data in PostgreSQL with Flyway migrations.",
      "Use Docker to package the services and document the local setup for reviewers.",
      "Support both structured export (CSV) and readable health summaries (PDF) across customizable date ranges.",
      "Keep health data flows understandable across tracking, AI insight, backup, and export features.",
    ],
    skills: ["Java", "Spring Boot", "Next.js", "PostgreSQL", "Flyway", "Docker", "Google Drive API", "AI"],
    evidence: "https://github.com/MDCran/health-tracker/tree/main/backend/src/main/java/dev/zeroday/health",
    evidenceLabel: "Backend controllers & services",
  },
  "webdesign-ice": {
    category: "Enterprise web · Infrastructure",
    status: "Live at ICESales.com",
    summary: "A website for International Computer Exchange, an IBM Business Partner focused on enterprise infrastructure and disaster recovery.",
    contribution: "Designed and developed a public-facing business site that explains the company’s enterprise technology focus and gives prospective customers a clear route to learn about its services.",
    decisions: [
      "Center the message on infrastructure and disaster recovery for an enterprise audience.",
      "Use the public site to make the service offering and company expertise easy to review.",
      "Keep the case focused on the shipped website; client infrastructure work remains outside the public project record.",
    ],
    skills: ["Web design", "Frontend development", "Enterprise technology", "Disaster recovery"],
  },
  "army-reserve-mercury": {
    category: "Government · Operations platform",
    status: "U.S. Army Reserve & NSIN collaboration",
    summary: "A secure, mobile-accessible forms and operations platform that replaces manual administrative paperwork and supports readiness workflows for Army Reserve units.",
    contribution: "Contributed to the web and mobile application and led a UI/UX overhaul across the React and React Native repositories. The project record describes work with military stakeholders in a multi-team engineering environment.",
    decisions: [
      "Modernize administrative workflows with forms and digital communications accessible across devices.",
      "Adopt a reusable, shadcn-inspired component system for React Native interfaces.",
      "Use Reanimated, Moti, Lottie, and React Native Gesture Handler for interface motion and interaction.",
      "Maintain Army Reserve branding and theme colors across web and mobile experiences.",
    ],
    skills: ["React", "React Native", "TypeScript", "Design systems", "Mobile UI", "Operations workflows"],
    sourceLabel: "Army Reserve Mercury organization",
    evidence: "https://www.ucf.edu/news/ucf-students-support-u-s-military-with-new-technology/",
    evidenceLabel: "UCF project coverage",
  },
};

export const coreAiContracts = {
  id: "core-ai-contracts",
  title: "Core AI safety contracts",
  coverImage: {
    src: "/project-covers/core-ai-contracts.png",
    alt: "Core AI safety contracts — input isolation and usage authorization, with a code shield on a dark red background",
  },
  category: "AI integration · Safety contracts",
  status: "Public TypeScript package",
  summary: "A small provider-neutral package for conversation safety and metered-usage authorization, used at the boundary between applications and private AI services.",
  contribution: "Built and maintain reusable input-isolation and authorization contracts for chat, voice, and embedding requests.",
  decisions: [
    "Isolate user-supplied text before it enters a prompt data field.",
    "Require a typed usage-authorization decision before metered operations.",
    "Keep provider SDKs, production policy, prompts, and customer data outside this package.",
  ],
  skills: ["TypeScript", "ES modules", "Input isolation", "Usage authorization"],
  repo: "https://github.com/MDCran/core-ai",
  evidence: "https://github.com/MDCran/core-ai/tree/main/src",
  evidenceLabel: "Read the public contracts",
} as const;

export const engineeringProjectOrder = [
  "coretex",
  "core-ai",
  "health-tracker",
  "webdesign-portfolio",
  "army-reserve-mercury",
  "core-website",
  "webdesign-ice",
] as const;
