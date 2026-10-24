import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Github } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHeader from "@/components/shared/PageHeader";
import EngineeringExplorer from "@/components/work/EngineeringExplorer";
import EngineeringProjectCard, { EngineeringArticleCard } from "@/components/work/EngineeringProjectCard";
import { engineeringDetail } from "@/lib/engineering-projects";
import { engineeringWorkItems } from "@/lib/engineering-work";
import { getProjects, getArticles } from "@/lib/public-content-cache";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata = buildSeoMetadata({
  title: "Michael Cran | Software, AI & Full-Stack Engineering",
  description: "Software, AI integrations, full-stack applications, cloud projects, and technical articles by Michael Cran. Browse project notes, demos, and public source code.",
  path: "/engineering",
  keywords: ["Michael Cran", "software engineer", "AI engineer", "full-stack engineer", "backend engineer", "Python", "TypeScript", "React", "Java", "PostgreSQL", "AWS"],
});

export default async function EngineeringPage() {
  const [allProjects, articles] = await Promise.all([getProjects(), getArticles()]);
  const work = engineeringWorkItems(allProjects, articles);

  return (
    <>
      <Navbar />
      <PageHeader
        eyebrow="Software, AI & cloud"
        title="Engineering"
        description="Applications, AI integrations, and technical writing. Explore the projects, implementation notes, and public source."
        breadcrumbs={[{ label: "Engineering" }]}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <a href="https://github.com/MDCran" target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-sm border border-white/12 px-4 text-[11px] uppercase tracking-wider text-white/70 transition-colors hover:border-[var(--cranberry)] hover:text-white"><Github size={14} aria-hidden="true" />GitHub</a>
            <Link href="/resume" className="inline-flex h-10 items-center gap-2 rounded-sm bg-[var(--cranberry)] px-4 text-[11px] uppercase tracking-wider text-white transition-colors hover:bg-[var(--cranberry)]/85">Resume <ArrowRight size={13} aria-hidden="true" /></Link>
          </div>
        }
      />
      <main id="projects">
        <Suspense fallback={<div className="content-container py-16 text-sm text-white/40">Loading projects…</div>}>
          <EngineeringExplorer entries={work.map(({ kind, slug, title, text, roles }) => ({
            kind, slug, title, text, roles,
          }))}>
            {work.map((item) => (
              item.kind === "project"
                ? <EngineeringProjectCard key={`project-${item.slug}`} project={item.project} detailOverride={engineeringDetail(item.slug)} />
                : <EngineeringArticleCard key={`article-${item.slug}`} article={item.article} />
            ))}
          </EngineeringExplorer>
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
