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
  const projects = await getProjects({ includeHidden: true });
  const project = projects.find((p) => p.slug === slug && p.category === "coding-projects");
  if (!project) {
    return buildSeoMetadata({
      title: "Project Not Found",
      description: "The requested project could not be found.",
      path: `/code/${slug}`,
      noIndex: true,
    });
  }
  return buildSeoMetadata({
    title: project.title,
    description: project.description ?? "Explore this project by MDCran.",
    path: `/code/${project.slug}`,
    image: imageAssetSrc(project.coverImage),
  });
}

export default async function CodeProjectPage({ params }: Props) {
  const { slug } = await params;
  const [projects, clients] = await Promise.all([getProjects({ includeHidden: true }), getClients()]);
  const foundProject = projects.find((p) => p.slug === slug && p.category === "coding-projects");
  if (!foundProject) notFound();
  const project = await hydrateProjectVideos(foundProject);

  const projectClients = (project.clientIds ?? [])
    .map((id) => clients.find((c) => c.id === id))
    .filter(Boolean) as typeof clients;

  const related = pickRandomRelatedProjects(
    projects,
    project.id,
    (candidate) => candidate.category === "coding-projects"
  );

  return (
    <ProjectDetail
      project={project}
      clients={projectClients}
      relatedProjects={related}
      backHref="/code"
      backLabel="Code"
    />
  );
}
