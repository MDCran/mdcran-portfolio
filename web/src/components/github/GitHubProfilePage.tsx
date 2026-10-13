import Link from "next/link";
import ChromaKeyVideo from "@/components/home/ChromaKeyVideo";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Code2,
  Cpu,
  Cloud,
  MapPin,
  Sparkles,
} from "lucide-react";
import type { SiteContentAiUsage } from "@/lib/types";

type ProfileSection = {
  title: string;
  icon: LucideIcon;
  tags: string[];
};

const PROFILE_SECTIONS: ProfileSection[] = [
  {
    title: "Languages",
    icon: Code2,
    tags: ["TypeScript", "Python", "JavaScript", "Java"],
  },
  {
    title: "Frameworks & APIs",
    icon: Cpu,
    tags: ["React", "Next.js", "FastAPI", "REST APIs", "Spring Boot", "Node.js"],
  },
  {
    title: "AI & Data",
    icon: Sparkles,
    tags: ["LLM integrations", "AI automation", "PostgreSQL", "MongoDB", "pgvector"],
  },
  {
    title: "Cloud & Delivery",
    icon: Cloud,
    tags: ["AWS", "Docker", "Linux", "Cloudflare", "GitHub Actions", "Vercel"],
  },
];

function SkillTag({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-2 border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-white/72">
      <span className="h-1.5 w-1.5 rounded-full bg-[#ef4242]" />
      <span>{value}</span>
    </span>
  );
}

function SectionCard({ section }: { section: ProfileSection }) {
  const Icon = section.icon;

  return (
    <article className="relative overflow-hidden border border-white/8 bg-black/34 p-4 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(239,66,66,0.07),transparent_38%)]" />
      <div className="relative z-[1]">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center border border-[#ef4242]/20 bg-[#ef4242]/8 text-[#ef4242]">
            <Icon size={17} />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-[13px] uppercase tracking-[0.18em] text-[#ef4242] sm:text-[14px]">
              {section.title}
            </h2>
            <div className="mt-2 h-px w-16 bg-gradient-to-r from-[#ef4242] to-transparent" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {section.tags.map((tag) => (
            <SkillTag key={`${section.title}-${tag}`} value={tag} />
          ))}
        </div>
      </div>
    </article>
  );
}

function formatTokenCount(totalTokens: number): string {
  return totalTokens >= 1_000_000_000
    ? `${(totalTokens / 1_000_000_000).toFixed(1)}B`
    : totalTokens >= 1_000_000
      ? `${(totalTokens / 1_000_000).toFixed(1)}M`
      : totalTokens.toLocaleString("en-US");
}

export default function GitHubProfilePage({ aiUsage }: { aiUsage: SiteContentAiUsage }) {
  const totalTokens = aiUsage.totalTokens ?? aiUsage.claude.totalTokens + aiUsage.openai.totalTokens;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 pt-6 pb-10 sm:px-6 sm:pt-8 sm:pb-12 lg:pt-10 lg:pb-16">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/2 top-0 h-[34rem] w-[min(100%,72rem)] -translate-x-1/2"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(239,66,66,0.12) 0%, transparent 72%)",
          }}
        />
        <div
          className="absolute -left-24 top-1/3 h-72 w-72 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(239,66,66,0.05) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -right-24 bottom-1/4 h-80 w-80 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(239,66,66,0.04) 0%, transparent 72%)",
          }}
        />
      </div>

      <section className="relative z-[1] w-full max-w-[1200px]">
        <div className="relative overflow-hidden border border-white/8 bg-[#070707]/94 shadow-[0_28px_90px_rgba(0,0,0,0.55)] lg:h-[930px]">
          <div
            className="pointer-events-none absolute inset-0 opacity-65"
            style={{
              backgroundImage:
                "linear-gradient(rgba(239,66,66,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(239,66,66,0.07) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
              backgroundSize: "200px 200px",
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,66,66,0.10),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(239,66,66,0.08),transparent_30%)]" />
          <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ef4242] to-transparent opacity-70" />

          <div className="pointer-events-none absolute left-6 top-6 h-14 w-14 border-l-2 border-t-2 border-[#ef4242]/24" />
          <div className="pointer-events-none absolute right-6 top-6 h-14 w-14 border-r-2 border-t-2 border-[#ef4242]/22" />
          <div className="pointer-events-none absolute bottom-6 left-6 h-14 w-14 border-b-2 border-l-2 border-[#ef4242]/14" />
          <div className="pointer-events-none absolute bottom-6 right-6 h-14 w-14 border-b-2 border-r-2 border-[#ef4242]/12" />

          <div className="relative z-[1] flex h-full flex-col px-6 pt-7 pb-5 sm:px-8 sm:pt-8 sm:pb-6 lg:px-10 lg:pt-10 lg:pb-12">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_340px] lg:items-start">
              <div>
                <div className="mb-6 flex items-center gap-3">
                  <div className="h-px w-10 bg-gradient-to-r from-[#ef4242] to-transparent" />
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#ef4242] animate-pulse" />
                    <span className="text-[11px] uppercase tracking-[0.3em] text-[#ef4242]">
                      Software &amp; AI Engineer
                    </span>
                  </div>
                </div>

                <h1 className="font-nord text-[clamp(2.45rem,5vw,4rem)] leading-[0.98] tracking-[0.05em] text-white">
                  Hi, I&apos;m <span className="text-[#ef4242] text-glow">Michael Cran</span>
                </h1>

                <p className="mt-5 max-w-3xl text-sm leading-relaxed text-white/55 sm:text-base lg:text-lg">
                  I build full-stack and backend software that connects web products with AI, data, and cloud systems. My focus is reliable applications, APIs, and automation using TypeScript, Python, and modern cloud tools.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <div className="inline-flex items-center gap-2 rounded-sm border border-white/10 bg-white/[0.03] px-4 py-3 text-[13px] uppercase tracking-[0.14em] text-white/72 sm:text-[14px]">
                    <MapPin size={14} className="text-[#ef4242]" />
                    Based in Orlando, FL
                  </div>
                  <div className="inline-flex items-center rounded-sm border border-[#ef4242]/35 bg-[#ef4242]/8 px-4 py-3 text-[12px] uppercase tracking-[0.12em] text-[#ef4242] sm:text-[13px]">
                    Open to software, AI &amp; cloud roles
                  </div>
                </div>
              </div>

              <aside className="relative pt-6 pb-14 lg:pt-10 lg:pb-0">
                <article className="relative z-[1] flex min-h-[126px] items-center justify-center overflow-visible border border-white/8 bg-black/34 px-4 py-5 backdrop-blur-sm">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(239,66,66,0.08),transparent_40%)]" />

                  <div className="relative z-[1] text-center">
                    <h2 className="font-nord text-4xl leading-none tracking-[0.03em] text-white sm:text-5xl">
                      {formatTokenCount(totalTokens)}
                    </h2>
                    <p className="mt-3 text-[10px] uppercase tracking-[0.17em] text-white/45 sm:text-[11px]">
                      AI tokens processed · reported
                    </p>
                  </div>
                </article>

                <div className="pointer-events-none absolute left-1/2 top-full z-0 w-56 -translate-x-1/2 -translate-y-[4%] sm:w-64 md:w-78">
                  <div className="absolute inset-x-8 top-4 h-12 bg-[#ef4242]/22 blur-2xl" />
                  <div className="relative">
                    <ChromaKeyVideo src="/cropped.mp4" className="w-full opacity-95" />
                  </div>
                </div>
              </aside>
            </div>

            <div className="mt-6 grid auto-rows-fr gap-4 md:grid-cols-2">
              {PROFILE_SECTIONS.map((section) => (
                <SectionCard key={section.title} section={section} />
              ))}
            </div>

            <div className="mt-auto pt-4 pb-4 sm:pb-5 lg:pt-6 lg:pb-6">
              <div className="flex min-h-[78px] flex-wrap items-center justify-between gap-4 border border-white/6 bg-black/24 px-4 py-3 sm:px-5 sm:py-4 lg:px-6">
                <div className="max-w-[40rem] text-[11px] leading-relaxed uppercase tracking-[0.16em] text-white/50 sm:text-[12px]">
                  CoreTV founder &amp; lead engineer · ICE software intern
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                <Link href="/resume" className="inline-flex h-11 items-center border border-white/15 px-4 text-[11px] uppercase tracking-[0.16em] text-white/75 transition-colors hover:border-white/35 hover:text-white sm:h-12">
                  Resume
                </Link>
                <Link href="/engineering" className="group relative">
                  <div className="absolute -inset-1 bg-[#ef4242] opacity-30 blur-md transition-opacity duration-300 group-hover:opacity-55" />
                  <div className="relative flex h-11 items-center gap-2 bg-[#ef4242] px-6 text-[12px] uppercase tracking-[0.18em] text-white shadow-[0_0_28px_rgba(239,66,66,0.34)] transition-colors duration-200 hover:bg-[#dd3030] sm:h-12 sm:px-7">
                    Engineering Work
                    <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
                  </div>
                </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
