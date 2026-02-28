"use client";

import { useMemo, useState } from "react";
import ProjectCard from "@/components/shared/ProjectCard";
import type { Project } from "@/lib/types";

export default function ClientProjectsSection({
  projects,
}: {
  projects: Project[];
}) {
  const [query, setQuery] = useState("");

  const filteredProjects = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return projects;

    return projects.filter((project) => {
      const haystack = [
        project.title,
        project.description,
        ...(project.tags ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [projects, query]);

  return (
    <div className="mb-16">
      <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-px w-8 bg-[#ef4242]" />
          <span className="text-[#ef4242] text-[11px] tracking-[0.25em] uppercase">Portfolio</span>
          <span className="text-white/20 text-[11px]">
            {filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="w-full sm:w-72">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search this client's projects..."
            className="h-10 w-full rounded-sm border border-white/10 bg-white/4 px-3 text-xs text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#ef4242]"
          />
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="text-center py-16 text-white/30 text-sm">
          No public projects found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
