import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Code2 } from "lucide-react";
import { engineeringProjects, type EngineeringProjectDetail } from "@/lib/engineering";
import type { Project } from "@/lib/types";
import { imageAssetAlt, imageAssetSrc, shouldBypassImageOptimization } from "@/lib/utils";

export default function EngineeringProjectCard({ project, detailOverride }: { project: Project; detailOverride?: EngineeringProjectDetail }) {
  const detail = detailOverride ?? engineeringProjects[project.slug];
  const cover = project.coverImage ?? project.images?.[0];
  const coverSrc = imageAssetSrc(cover);
  const sourceUrl = detail?.sourceUrl ?? project.githubUrl ?? project.repositories?.[0]?.url;
  const skills = Array.from(new Set([...(project.tags ?? []), ...(detail?.skills ?? [])]));
  const href = `/engineering/${project.slug}`;
  return (
    <article id={`project-${project.slug}`} className="group flex h-full min-w-0 flex-col overflow-hidden rounded-sm border border-white/7 bg-white/2 transition-colors hover:border-[var(--cranberry)]/25">
      <Link href={href} aria-label={`View ${project.title}`} className="relative block aspect-video shrink-0 overflow-hidden bg-white/5 focus-visible:outline-2 focus-visible:outline-[var(--cranberry)]">
        {coverSrc ? <Image src={coverSrc} alt={imageAssetAlt(cover, project.title)} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" unoptimized={shouldBypassImageOptimization(coverSrc)} /> : <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--cranberry-dim)] to-transparent"><Code2 size={40} className="text-[var(--cranberry)]/60" aria-hidden="true" /></div>}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-nord text-sm leading-snug tracking-wide text-white"><Link href={href} className="rounded-sm hover:text-[var(--cranberry)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--cranberry)]">{project.title}</Link></h3>
        <p className="mt-2 text-[10px] text-white/40">{project.slug === "core-ai" ? "Case study · Private platform · Public contracts" : project.slug === "army-reserve-mercury" ? "Case study · Organization linked" : sourceUrl ? "Public source" : "Case study"}{project.liveUrl ? " · Live product" : ""}</p>
        <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-white/50">{project.description || detail?.summary}</p>
        {skills.length > 0 && <ul aria-label={`${project.title} technologies and skills`} className="mt-4 mb-5 flex flex-wrap gap-1.5">
          {skills.slice(0, 4).map((skill) => <li key={skill} className="rounded-sm border border-white/8 bg-white/4 px-2 py-1 text-[10px] text-white/50">{skill}</li>)}
        </ul>}
        <Link href={href} aria-label={`View project details: ${project.title}`} className="mt-auto flex items-center justify-between gap-3 rounded-sm border-t border-white/8 pt-4 text-xs font-medium text-white/65 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--cranberry)]">
          View project details <ArrowUpRight size={14} className="shrink-0" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
