import Link from "next/link";
import { ArrowRight, Github, Mail } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ENGINEERING_SUMMARY, engineeringFocus, engineeringProjects } from "@/lib/engineering";
import { buildSeoMetadata, CONTACT_EMAIL } from "@/lib/seo";

export const metadata = buildSeoMetadata({
  title: "Michael Cran | Software, AI & Full-Stack Engineering",
  description: "Michael Cran's engineering portfolio: AI agents, TypeScript safety contracts, Java APIs, React applications, and cloud infrastructure. Review public code and architecture.",
  path: "/engineering",
  keywords: ["Michael Cran", "software engineer", "AI engineer", "full-stack engineer", "backend engineer", "Python", "TypeScript", "React", "Java", "PostgreSQL", "AWS"],
});

export default function EngineeringPage() {
  return (
    <>
      <Navbar />
      <main className="content-container pb-20 pt-32 sm:pt-40">
        <section aria-labelledby="engineering-heading" className="max-w-3xl">
          <p className="mb-4 text-xs uppercase tracking-[0.2em] text-[var(--cranberry)]">Michael Cran · Open for engineering roles</p>
          <h1 id="engineering-heading" className="font-nord text-3xl leading-tight text-white sm:text-5xl">Software & AI engineering</h1>
          <p className="mt-6 text-base leading-relaxed text-white/75">{ENGINEERING_SUMMARY}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/resume" className="inline-flex items-center gap-2 rounded-sm bg-[var(--cranberry)] px-5 py-3 text-sm font-medium text-white">View resume <ArrowRight size={16} aria-hidden="true" /></Link>
            <a href="https://github.com/MDCran" className="inline-flex items-center gap-2 rounded-sm border border-white/20 px-5 py-3 text-sm text-white/85"><Github size={16} aria-hidden="true" />GitHub</a>
            <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-2 px-3 py-3 text-sm text-white/75"><Mail size={16} aria-hidden="true" />Discuss a role</a>
          </div>
        </section>

        <section aria-labelledby="focus-heading" className="mt-16">
          <h2 id="focus-heading" className="font-nord text-2xl text-white">Where I can contribute</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/65">My work spans applied AI, full-stack and backend development, and cloud operations. These are the core tools from my resume, with public projects below for a closer look.</p>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {engineeringFocus.map((focus) => (
              <article key={focus.id} id={focus.id} className="scroll-mt-28 rounded-sm border border-white/12 bg-white/3 p-6">
                <h3 className="text-lg font-semibold text-white">{focus.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/70">{focus.description}</p>
                <ul aria-label={`${focus.title} tools`} className="mt-5 flex flex-wrap gap-2">
                  {focus.skills.map((skill) => <li key={skill} className="rounded-sm border border-white/15 px-2 py-1 text-xs text-white/75">{skill}</li>)}
                </ul>
                <p className="mt-5 text-xs leading-relaxed text-white/60">{focus.evidence}</p>
                <a href="#projects" className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--cranberry)] hover:underline underline-offset-4">Review projects <ArrowRight size={14} aria-hidden="true" /></a>
              </article>
            ))}
          </div>
        </section>

        <section id="projects" aria-labelledby="projects-heading" className="mt-16 scroll-mt-28">
          <h2 id="projects-heading" className="font-nord text-2xl text-white">Selected engineering work</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/65">What I built, key architecture choices, and source you can inspect.</p>
          <div className="mt-7 grid gap-6 lg:grid-cols-2">
            {engineeringProjects.map((project) => (
              <article key={project.id} className="flex flex-col rounded-sm border border-white/12 bg-white/3 p-6 sm:p-8">
                <p className="text-[11px] uppercase tracking-wider text-[var(--cranberry)]">{project.category}</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">{project.title}</h3>
                <p className="mt-2 text-xs text-white/60">{project.status}</p>
                <p className="mt-5 text-sm leading-relaxed text-white/75">{project.summary}</p>
                <h4 className="mt-6 text-sm font-semibold text-white">My contribution</h4>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{project.contribution}</p>
                <h4 className="mt-5 text-sm font-semibold text-white">Architecture choices</h4>
                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-white/70">
                  {project.decisions.map((decision) => <li key={decision}>{decision}</li>)}
                </ul>
                <p className="mb-6 mt-5 text-xs leading-relaxed text-white/60">{project.skills.join(" · ")}</p>
                <div className="mt-auto flex flex-wrap gap-x-5 gap-y-3 border-t border-white/10 pt-5 text-sm">
                  <a href={project.repo} className="inline-flex items-center gap-2 text-[var(--cranberry)] hover:underline underline-offset-4"><Github size={15} aria-hidden="true" />Source</a>
                  <a href={project.evidence} className="text-white/80 hover:underline underline-offset-4">{project.evidenceLabel}</a>
                  <Link href={project.writeup} className="text-white/80 hover:underline underline-offset-4">Project write-up</Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="experience-heading" className="mt-16 rounded-sm border border-white/12 p-6 sm:p-8">
          <h2 id="experience-heading" className="font-nord text-2xl text-white">Experience beyond the repositories</h2>
          <ul className="mt-5 space-y-4 text-sm leading-relaxed text-white/75">
            <li><strong className="text-white">CoreTV:</strong> founder and lead engineer for business technology, AI reception, websites, and workflow automation.</li>
            <li><strong className="text-white">International Computer Exchange:</strong> software engineering internship supporting enterprise infrastructure and disaster recovery systems.</li>
            <li><strong className="text-white">Army Reserve — Mercury:</strong> secure serverless web and mobile application built in partnership with the U.S. Army Reserve.</li>
          </ul>
          <p className="mt-5 text-sm leading-relaxed text-white/60">Client implementations remain private. The public repositories above provide reviewable examples of my engineering work; my resume covers dates, responsibilities, and qualifications.</p>
          <Link href="/resume" className="mt-5 inline-flex items-center gap-2 text-sm text-[var(--cranberry)] hover:underline underline-offset-4">Full experience & qualifications <ArrowRight size={15} aria-hidden="true" /></Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
