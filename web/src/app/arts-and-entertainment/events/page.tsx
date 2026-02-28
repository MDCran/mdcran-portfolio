"use client";

import React, { useMemo, useState } from "react";
import useSWR from "swr";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHeader from "@/components/shared/PageHeader";
import FilterBar, { GRID_COLS_CLASS } from "@/components/shared/FilterBar";
import ProjectCard from "@/components/shared/ProjectCard";
import { useGridCols } from "@/lib/useGridCols";
import type { Project, ProjectStatus } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function EventsPage() {
  const { data: apiProjects = [] } = useSWR<Project[]>("/api/data/projects", fetcher, {
    fallbackData: [],
    revalidateOnFocus: false,
  });
  const allProjects = apiProjects.filter((project) => project.subcategory === "events");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [cols, setCols] = useGridCols("grid_cols_events_v3", 3);

  const filtered = useMemo(() => {
    return allProjects.filter((project) => {
      const matchesQuery =
        !query ||
        project.title.toLowerCase().includes(query.toLowerCase()) ||
        project.tags?.some((tag) => tag.toLowerCase().includes(query.toLowerCase()));
      const matchesStatus = statusFilter === "all" || project.pricing.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [allProjects, query, statusFilter]);

  const counts = useMemo(
    () => ({
      all: allProjects.length,
      free: allProjects.filter((project) => project.pricing.status === "free").length,
      for_sale: allProjects.filter((project) => project.pricing.status === "for_sale").length,
      unavailable: allProjects.filter((project) => project.pricing.status === "unavailable").length,
    }),
    [allProjects]
  );

  return (
    <>
      <Navbar />
      <PageHeader
        eyebrow="Arts & Entertainment"
        title="Events"
        description="Large-scale community events - from annual Snow Brawls to custom competitive games."
        breadcrumbs={[
          { label: "Arts & Entertainment", href: "/arts-and-entertainment" },
          { label: "Events" },
        ]}
      />
      <main className="content-container py-14">
        <FilterBar
          onSearch={setQuery}
          onStatusFilter={setStatusFilter}
          counts={counts}
          cols={cols}
          onColsChange={setCols}
        />
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 rounded-sm bg-white/5 border border-white/8 flex items-center justify-center mb-4">
              <div className="w-4 h-4 bg-[rgba(239,66,66,0.4)] rounded-sm rotate-45" />
            </div>
            <p className="text-white/40 text-sm">No projects found.</p>
          </div>
        ) : (
          <div className={`grid ${GRID_COLS_CLASS[cols]} gap-4`}>
            {filtered.map((project, i) => (
              <ProjectCard key={project.id} project={project} index={i} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
