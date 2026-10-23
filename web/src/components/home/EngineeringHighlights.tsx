import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ENGINEERING_SUMMARY, engineeringProjects } from "@/lib/engineering";
import type { Project } from "@/lib/types";
import { portfolioRoles, roleLabels } from "@/lib/public-portfolio";

export default function EngineeringHighlights({ projects = [] }: { projects?: Project[] }) {
  const selected = ["coretex", "health-tracker", "webdesign-portfolio"].map((slug) => projects.find((p) => p.slug === slug)).filter((p): p is Project => !!p);
  return <section aria-labelledby="engineering-title" className="border-b border-white/10 py-12 sm:py-16">
    <div className="content-container">
      <p className="mb-3 text-sm font-semibold text-[var(--cranberry)]">For recruiters · about one minute</p>
      <h2 id="engineering-title" className="text-2xl font-semibold sm:text-3xl">Three projects. Reviewable engineering evidence.</h2>
      <p className="mt-4 max-w-3xl text-base text-white/80">{ENGINEERING_SUMMARY}</p>
      <nav aria-label="Portfolio by role" className="my-6 flex flex-wrap gap-3">{portfolioRoles.filter((r) => r !== "all").map((role) => <Link key={role} href={`/engineering?role=${role}#projects`} className="rounded-sm border border-white/20 px-4 py-2 text-sm">{roleLabels[role]} view</Link>)}</nav>
      <div className="grid gap-4 md:grid-cols-3">{selected.map((project) => {
        const detail = engineeringProjects[project.slug];
        const source = detail.sourceUrl ?? project.githubUrl ?? project.repositories?.[0]?.url;
        return <article key={project.slug} className="rounded-sm border border-white/20 bg-white/3 p-6">
          <p className="text-xs text-white/70">{detail.category}</p>
          <h3 className="mt-3 text-xl font-semibold">{project.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-white/80">{detail.summary}</p>
          <p className="mt-4 text-sm leading-relaxed text-white/70">{detail.skills.slice(0, 4).join(" · ")}</p>
          <div className="mt-5 flex flex-wrap gap-4 text-sm"><Link href={`/engineering#project-${project.slug}`} className="inline-flex items-center gap-2 text-[var(--cranberry)] underline underline-offset-4">Contribution & case study <ArrowRight size={14} aria-hidden="true" /></Link>{source && <a href={source} className="underline underline-offset-4">Public source</a>}</div>
        </article>;
      })}</div>
      {!selected.length && <p className="mt-4 text-white/75">Published project records are currently unavailable. Browse the engineering overview and resume below.</p>}
      <div className="mt-6 flex flex-wrap gap-5 text-sm"><Link href="/engineering" className="underline underline-offset-4">All engineering work</Link><Link href="/resume/print" className="underline underline-offset-4">Printable resume</Link><Link href="/articles" className="underline underline-offset-4">Articles</Link><Link href="/contact" className="underline underline-offset-4">Discuss a role</Link></div>
    </div>
  </section>;
}
