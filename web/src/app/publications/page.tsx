import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHeader from "@/components/shared/PageHeader";
import ProjectCard from "@/components/shared/ProjectCard";
import ClientPageTitle from "@/components/shared/ClientPageTitle";
import { getProjectsByCategory, getSiteContent } from "@/lib/db";
import { buildSeoMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const siteContent = await getSiteContent();
  const header = siteContent.pageHeaders.publications;

  return buildSeoMetadata({
    title: header.title || "Publications",
    description: header.description || "Storyline writing, world-building, and narrative design.",
    path: "/publications",
  });
}

export const dynamic = "force-dynamic";

export default async function PublicationsPage() {
  const [siteContent, projects] = await Promise.all([
    getSiteContent(),
    getProjectsByCategory("publications"),
  ]);
  const header = siteContent.pageHeaders.publications;

  return (
    <>
      <ClientPageTitle title={header.title} />
      <Navbar />
      <PageHeader
        eyebrow={header.eyebrow}
        title={header.title}
        description={header.description}
        breadcrumbs={[{ label: header.title }]}
      />
      <main className="content-container py-16 sm:py-20">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-white/30 text-sm">No publications yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project, i) => (
              <ProjectCard key={project.id} project={project} index={i} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
