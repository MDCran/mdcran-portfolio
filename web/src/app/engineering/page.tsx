import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Github } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHeader from "@/components/shared/PageHeader";
import ArticleCard from "@/components/shared/ArticleCard";
import EngineeringExplorer from "@/components/work/EngineeringExplorer";
import EngineeringProjectCard from "@/components/work/EngineeringProjectCard";
import { engineeringProjects } from "@/lib/engineering";
import { publicEngineeringProjects, engineeringDetail } from "@/lib/engineering-projects";
import { getProjects, getArticles } from "@/lib/public-content-cache";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata = buildSeoMetadata({
  title: "Michael Cran | Software, AI & Full-Stack Engineering",
  description: "Software, AI integrations, full-stack applications, and cloud projects by Michael Cran. Browse project notes, demos, and public source code.",
  path: "/engineering",
  keywords: ["Michael Cran", "software engineer", "AI engineer", "full-stack engineer", "backend engineer", "Python", "TypeScript", "React", "Java", "PostgreSQL", "AWS"],
});

export default async function EngineeringPage() {
  const [allProjects, articles] = await Promise.all([getProjects(), getArticles()]);
  const orderedProjects = publicEngineeringProjects(allProjects);
  const relatedArticles = articles.filter((article) =>
    (article.tags ?? []).some((tag) => /engineering|typescript|react|ai|software|cloud/i.test(tag)),
  ).slice(0, 3);

  return (
    <>
      <Navbar />
      <PageHeader
        eyebrow="Software, AI & cloud"
        title="Engineering"
        description="Applications, AI integrations, and the systems behind them. Browse the projects, explore the implementation, and view the public source."
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
          <EngineeringExplorer entries={orderedProjects.map((project) => ({
            slug: project.slug, title: project.title,
            text: [project.title, project.description, ...(project.tags ?? []), ...(engineeringProjects[project.slug]?.skills ?? []), engineeringProjects[project.slug]?.category].join(" "),
          }))}>
            {orderedProjects.map((project) => (
              <EngineeringProjectCard key={project.id} project={project} detailOverride={engineeringDetail(project.slug)} />
            ))}
          </EngineeringExplorer>
        </Suspense>
        {relatedArticles.length > 0 && (
          <section className="border-t border-white/6 py-16" aria-labelledby="engineering-writing">
            <div className="content-container">
              <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                <h2 id="engineering-writing" className="font-nord text-xl tracking-wide text-white">Related writing</h2>
                <Link href="/articles" className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wider text-white/50 hover:text-[var(--cranberry)]">All articles <ArrowRight size={13} aria-hidden="true" /></Link>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">{relatedArticles.map((article, index) => <ArticleCard key={article.id} article={article} index={index} />)}</div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
