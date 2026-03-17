"use client";

import React, { useMemo, useState } from "react";
import useSWR from "swr";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHeader from "@/components/shared/PageHeader";
import ClientPageTitle from "@/components/shared/ClientPageTitle";
import FilterBar, { GRID_COLS_CLASS } from "@/components/shared/FilterBar";
import ProjectCard from "@/components/shared/ProjectCard";
import { useGridCols } from "@/lib/useGridCols";
import type { Project, ProjectStatus, SiteContent } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function VideoEditingPage() {
  const { data: apiProjects = [], isLoading } = useSWR<Project[]>("/api/data/projects", fetcher, {
    fallbackData: [],
    revalidateOnFocus: false,
  });
  const { data: siteContent } = useSWR<SiteContent>("/api/data/site-content", fetcher, {
    revalidateOnFocus: false,
  });
  const header = siteContent?.pageHeaders?.videoEditing;
  const allProjects = apiProjects.filter((project) => project.subcategory === "video-editing");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [cols, setCols] = useGridCols("grid_cols_video-editing");

  const filtered = useMemo(() => {
    return allProjects
      .filter((project) => {
        const matchesQuery =
          !query ||
          project.title.toLowerCase().includes(query.toLowerCase()) ||
          project.description?.toLowerCase().includes(query.toLowerCase()) ||
          project.tags?.some((tag) => tag.toLowerCase().includes(query.toLowerCase()));
        const matchesStatus =
          statusFilter === "all" || project.pricing.status === statusFilter;
        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        if (!a.publishDate && !b.publishDate) return 0;
        if (!a.publishDate) return 1;
        if (!b.publishDate) return -1;
        return b.publishDate.localeCompare(a.publishDate);
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
      <ClientPageTitle title={header?.title ?? "Video Editing"} />
      <Navbar />
      <PageHeader
        eyebrow={header?.eyebrow ?? "Motion & Graphics"}
        title={header?.title ?? "Video Editing"}
        description={header?.description ?? "Fast, on-demand video editing for YouTube and social media."}
        breadcrumbs={[
          { label: "Motion & Graphics", href: "/motion-and-graphics" },
          { label: "Video Editing" },
        ]}
      />
      <main className="content-container py-14 sm:py-16">
        <FilterBar
          onSearch={setQuery}
          onStatusFilter={setStatusFilter}
          counts={counts}
          cols={cols}
          onColsChange={setCols}
        />
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-white/30 text-sm animate-pulse">Loading projects...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
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
