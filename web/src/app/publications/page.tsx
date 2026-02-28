import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHeader from "@/components/shared/PageHeader";
import ProjectCard from "@/components/shared/ProjectCard";
import { getProjectsByCategory } from "@/lib/db";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata = buildSeoMetadata({
  title: "Publications",
  description: "Storyline writing, world-building, and narrative design.",
  path: "/publications",
});

export const dynamic = "force-dynamic";

export default async function PublicationsPage() {
  const projects = await getProjectsByCategory("publications");

  return (
    <>
      <Navbar />
      <PageHeader
        eyebrow="Category"
        title="Publications"
        description="Creative storyline writing, world-building, and narrative design for games and digital media."
        breadcrumbs={[{ label: "Publications" }]}
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
