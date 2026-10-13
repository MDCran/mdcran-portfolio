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

export const engineeringProjects = [
  {
    id: "coretex",
    title: "Coretex",
    category: "AI agents · Desktop & backend",
    status: "Pre-1.0 · Source available",
    summary: "A local-first workspace bringing AI agents, projects, communication, personal analytics, and developer operations into a Windows desktop application.",
    contribution: "Built and maintain the desktop/web workspace, shared React application layer, and TypeScript Brain service.",
    decisions: [
      "Share the application layer across Electron and Next.js clients.",
      "Use PostgreSQL and Prisma in the Brain service, with Docker-backed local development.",
      "Keep credentials and local application data outside the public repository.",
    ],
    skills: ["TypeScript", "React", "Electron", "PostgreSQL", "Docker"],
    repo: "https://github.com/MDCran/coretex",
    writeup: "/code/coretex",
    evidence: "https://github.com/MDCran/coretex#architecture",
    evidenceLabel: "Architecture & run instructions",
  },
  {
    id: "core-ai",
    title: "Core AI",
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
    writeup: "/code/core-ai",
    evidence: "https://github.com/MDCran/core-ai/tree/main/src",
    evidenceLabel: "Read the public contracts",
  },
  {
    id: "health-tracker",
    title: "Health Tracker",
    category: "Full-stack · APIs & data",
    status: "Source & local setup available",
    summary: "A personal health tracking application with a Next.js interface and a Spring Boot backend for workouts, nutrition, and other tracking workflows.",
    contribution: "Built the full-stack application, connecting tracking interfaces to Java backend services and persistent storage.",
    decisions: [
      "Separate the Next.js frontend from the Spring Boot API.",
      "Use PostgreSQL for relational storage and LocalStack for local S3-compatible development.",
      "Document service ports, startup steps, and deployment configuration for reviewers.",
    ],
    skills: ["Java", "Spring Boot", "Next.js", "PostgreSQL", "Docker"],
    repo: "https://github.com/MDCran/health-tracker",
    writeup: "/code/health-tracker",
    evidence: "https://github.com/MDCran/health-tracker/tree/main/backend/src/main/java/dev/zeroday/health",
    evidenceLabel: "Backend controllers & services",
  },
  {
    id: "portfolio",
    title: "Portfolio application",
    category: "Full-stack · AI & service integrations",
    status: "Live at mdcran.com",
    summary: "The application behind this website: a responsive portfolio with managed content, API integrations, streaming AI chat, voice features, and analytics.",
    contribution: "Designed, built, and maintain the Next.js application and its content and integration routes.",
    decisions: [
      "Use server-rendered pages alongside interactive React components.",
      "Store editable portfolio content in MongoDB.",
      "Integrate streaming chat and speech services through server-side API routes, keeping credentials on the server.",
    ],
    skills: ["Next.js", "React", "TypeScript", "MongoDB", "REST APIs"],
    repo: "https://github.com/MDCran/mdcran-portfolio",
    writeup: "/code/webdesign-portfolio",
    evidence: "https://github.com/MDCran/mdcran-portfolio/tree/main/web/src/app/api",
    evidenceLabel: "API routes & integrations",
  },
] as const;
