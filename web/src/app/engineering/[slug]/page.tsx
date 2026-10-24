import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProjectDetail from "@/components/shared/ProjectDetail";
import EngineeringProjectEvidence from "@/components/work/EngineeringProjectEvidence";
import { getProjects, getClients } from "@/lib/public-content-cache";
import { hydrateProjectVideos } from "@/lib/db";
import { publicEngineeringProjects, engineeringDetail } from "@/lib/engineering-projects";
import { buildSeoMetadata } from "@/lib/seo";
import { imageAssetSrc } from "@/lib/utils";

interface Props { params: Promise<{ slug: string }> }

async function findProject(slug: string) {
  if (!/^[a-z0-9-]+$/i.test(slug)) notFound();
  const projects = publicEngineeringProjects(await getProjects());
  const project = projects.find((candidate) => candidate.slug === slug);
  if (!project) notFound();
  return { project, projects };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { project } = await findProject((await params).slug);
  return buildSeoMetadata({ title: project.title, description: project.description ?? engineeringDetail(project.slug)?.summary ?? "Engineering project by Michael Cran.", path: `/engineering/${project.slug}`, image: imageAssetSrc(project.coverImage) });
}

export default async function EngineeringProjectPage({ params }: Props) {
  const [{ project: found, projects }, clients] = await Promise.all([findProject((await params).slug), getClients()]);
  const project = await hydrateProjectVideos(found);
  const detail = engineeringDetail(project.slug);
  return (
    <ProjectDetail
      project={{ ...project, githubUrl: detail?.sourceUrl ?? project.githubUrl }}
      clients={clients.filter((client) => project.clientIds?.includes(client.id))}
      relatedProjects={projects.filter((candidate) => candidate.id !== project.id).slice(0, 4)}
      backHref="/engineering"
      backLabel="Engineering"
    >
      <EngineeringProjectEvidence slug={project.slug} detail={detail} />
    </ProjectDetail>
  );
}
