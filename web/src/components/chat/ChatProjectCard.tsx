"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/lib/types";
import { projectUrl, imageAssetSrc } from "@/lib/utils";

/* Module-level cache so multiple cards in a session share one fetch. */
let projectsCache: Promise<Project[]> | null = null;
function loadProjects(): Promise<Project[]> {
  if (!projectsCache) {
    projectsCache = fetch("/api/data/projects")
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []);
  }
  return projectsCache;
}

export default function ChatProjectCard({ projectId, onNavigate }: { projectId: string; onNavigate?: (href: string) => void }) {
  const [project, setProject] = useState<Project | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    loadProjects().then((list) => {
      if (!active) return;
      const match = list.find((p) => p.id === projectId || p.slug === projectId) ?? null;
      setProject(match);
    });
    return () => { active = false; };
  }, [projectId]);

  if (project === undefined) {
    return <div className="mt-2 h-20 w-full animate-pulse rounded-sm border border-white/8 bg-white/[0.03]" />;
  }
  if (!project) return null;

  const href = projectUrl(project.category, project.slug, project.subcategory);
  const cover = imageAssetSrc(project.coverImage);

  const go = (e: React.MouseEvent) => {
    if (onNavigate) { e.preventDefault(); onNavigate(href); }
  };

  return (
    <a
      href={href}
      onClick={go}
      className="group mt-2 block overflow-hidden rounded-sm border transition-all hover:shadow-[0_10px_30px_rgba(0,0,0,0.4)]"
      style={{ borderColor: "color-mix(in srgb, var(--theme-primary, #ef4242) 28%, transparent)", backgroundColor: "color-mix(in srgb, var(--theme-text, #fff) 3%, transparent)" }}
    >
      {cover && (
        <div className="relative h-28 w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt={project.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(8,8,8,0.85), transparent 70%)" }} />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-[13px] font-semibold leading-snug" style={{ color: "color-mix(in srgb, var(--theme-text, #fff) 92%, transparent)" }}>{project.title}</h4>
          <ArrowUpRight size={14} className="mt-0.5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" style={{ color: "var(--theme-primary, #ef4242)" }} />
        </div>
        {project.description && (
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed" style={{ color: "color-mix(in srgb, var(--theme-text, #fff) 55%, transparent)" }}>{project.description}</p>
        )}
      </div>
    </a>
  );
}
