import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProjectDetail from "@/components/shared/ProjectDetail";
import { getProjects, getClients, hydrateProjectVideos } from "@/lib/db";
import { pickRandomRelatedProjects } from "@/lib/project-detail";
import { buildSeoMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const projects = await getProjects();
  const project = projects.find((p) => p.slug === slug && p.subcategory === "events");
  if (!project) {
    return buildSeoMetadata({
      title: "Project Not Found",
      description: "The requested event project could not be found.",
      path: `/arts-and-entertainment/events/${slug}`,
      noIndex: true,
    });
  }
  return buildSeoMetadata({
    title: project.title,
    description: project.description ?? "Explore this event project by MDCran.",
    path: `/arts-and-entertainment/events/${project.slug}`,
    image: project.coverImage,
  });
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const [projects, clients] = await Promise.all([getProjects(), getClients()]);
  const foundProject = projects.find((p) => p.slug === slug && p.subcategory === "events");
  if (!foundProject) notFound();
  const project = await hydrateProjectVideos(foundProject);

  const projectClients = (project.clientIds ?? [])
    .map((id) => clients.find((c) => c.id === id))
    .filter(Boolean) as typeof clients;

  const related = pickRandomRelatedProjects(
    projects,
    project.id,
    (candidate) => candidate.subcategory === "events"
  );

  return (
    <ProjectDetail
      project={project}
      clients={projectClients}
      relatedProjects={related}
      backHref="/arts-and-entertainment/events"
      backLabel="Events"
    />
  );
}
