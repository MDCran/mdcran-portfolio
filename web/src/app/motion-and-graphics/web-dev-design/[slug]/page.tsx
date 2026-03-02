import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProjectDetail from "@/components/shared/ProjectDetail";
import { getProjects, getClients, hydrateProjectVideos } from "@/lib/db";
import { pickRandomRelatedProjects } from "@/lib/project-detail";
import { buildSeoMetadata } from "@/lib/seo";
import { imageAssetSrc } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const projects = await getProjects();
  const project = projects.find((p) => p.slug === slug && p.subcategory === "web-dev-design");
  if (!project) {
    return buildSeoMetadata({
      title: "Project Not Found",
      description: "The requested web development project could not be found.",
      path: `/motion-and-graphics/web-dev-design/${slug}`,
      noIndex: true,
    });
  }
  return buildSeoMetadata({
    title: project.title,
    description: project.description ?? "Explore this web design project by MDCran.",
    path: `/motion-and-graphics/web-dev-design/${project.slug}`,
    image: imageAssetSrc(project.coverImage),
  });
}

export default async function WebDevDesignProjectPage({ params }: Props) {
  const { slug } = await params;
  const [projects, clients] = await Promise.all([getProjects(), getClients()]);
  const foundProject = projects.find((p) => p.slug === slug && p.subcategory === "web-dev-design");
  if (!foundProject) notFound();
  const project = await hydrateProjectVideos(foundProject);

  const projectClients = (project.clientIds ?? [])
    .map((id) => clients.find((c) => c.id === id))
    .filter(Boolean) as typeof clients;

  const related = pickRandomRelatedProjects(
    projects,
    project.id,
    (candidate) => candidate.subcategory === "web-dev-design"
  );

  return (
    <ProjectDetail
      project={project}
      clients={projectClients}
      relatedProjects={related}
      backHref="/motion-and-graphics/web-dev-design"
      backLabel="Web Dev & Design"
    />
  );
}
