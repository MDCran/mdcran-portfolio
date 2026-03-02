"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Eye, Play } from "lucide-react";
import ProjectCard from "@/components/shared/ProjectCard";
import { projectUrl } from "@/lib/utils";
import type { Project, Video } from "@/lib/types";

type PortfolioTab = "projects" | "videos";

type ClientVideoEntry = Video & {
  projectId: string;
  projectTitle: string;
  projectPath: string;
};

function formatViewCount(value?: number) {
  if (!value || value <= 0) return "0 views";
  return `${value.toLocaleString()} view${value === 1 ? "" : "s"}`;
}

function getVideoTitleMarqueeDuration(title: string) {
  return `${Math.max(6, Math.min(14, Math.ceil(title.length / 4)))}s`;
}

export default function ClientProjectsSection({
  projects,
}: {
  projects: Project[];
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<PortfolioTab>("projects");
  const tabButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabDragPointerIdRef = useRef<number | null>(null);
  const tabDragStartRef = useRef<{ x: number; y: number } | null>(null);
  const tabDragActiveRef = useRef(false);
  const [tabHighlight, setTabHighlight] = useState({ left: 0, width: 0, ready: false });

  useEffect(() => {
    const tabs: PortfolioTab[] = ["projects", "videos"];

    const syncHighlight = () => {
      const activeButton = tabButtonRefs.current[tabs.indexOf(tab)];
      if (!activeButton) return;

      setTabHighlight({
        left: activeButton.offsetLeft,
        width: activeButton.offsetWidth,
        ready: true,
      });
    };

    const frame = window.requestAnimationFrame(syncHighlight);
    window.addEventListener("resize", syncHighlight);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", syncHighlight);
    };
  }, [tab]);

  const allVideos = useMemo(() => {
    const seen = new Set<string>();
    const collected: ClientVideoEntry[] = [];

    for (const project of projects) {
      for (const video of project.videos ?? []) {
        const dedupeKey = video.youtubeId || `${project.id}-${video.title}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        collected.push({
          ...video,
          projectId: project.id,
          projectTitle: project.title,
          projectPath: projectUrl(project.category, project.slug, project.subcategory),
        });
      }
    }

    return collected;
  }, [projects]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredProjects = useMemo(() => {
    const matched = normalizedQuery
      ? projects.filter((project) => {
          const haystack = [project.title, project.description, ...(project.tags ?? [])]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(normalizedQuery);
        })
      : projects;

    return [...matched].sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return a.title.localeCompare(b.title);
    });
  }, [normalizedQuery, projects]);

  const filteredVideos = useMemo(() => {
    const matched = normalizedQuery
      ? allVideos.filter((video) => {
          const haystack = [video.title, video.channelName, video.projectTitle]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(normalizedQuery);
        })
      : allVideos;

    return [...matched].sort((a, b) => (a.title || a.youtubeId).localeCompare(b.title || b.youtubeId));
  }, [allVideos, normalizedQuery]);

  const findTabButtonFromPoint = (clientX: number, clientY: number) => {
    const element = document.elementFromPoint(clientX, clientY);
    return (element as HTMLElement | null)?.closest<HTMLButtonElement>("[data-portfolio-tab]") ?? null;
  };

  const updateTabFromPointerTarget = (target: EventTarget | null) => {
    const button = (target as HTMLElement | null)?.closest<HTMLButtonElement>("[data-portfolio-tab]");
    const nextTab = button?.dataset.portfolioTab as PortfolioTab | undefined;
    if (nextTab) {
      setTab(nextTab);
    }
  };

  const updateTabFromPointerPosition = (clientX: number, clientY: number) => {
    const element = document.elementFromPoint(clientX, clientY);
    updateTabFromPointerTarget(element);
  };

  return (
    <div className="mb-16">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-px w-8 bg-[#ef4242]" />
          <span className="text-[#ef4242] text-[11px] tracking-[0.25em] uppercase">Portfolio</span>
          <div
            className="relative flex items-center gap-1 rounded-sm border border-white/10 bg-white/4 p-1"
            onPointerDown={(event) => {
              tabDragPointerIdRef.current = event.pointerId;
              tabDragStartRef.current = { x: event.clientX, y: event.clientY };
              tabDragActiveRef.current = false;
            }}
            onPointerMove={(event) => {
              if (tabDragPointerIdRef.current !== event.pointerId) return;
              const start = tabDragStartRef.current;
              if (!start) return;
              const deltaX = Math.abs(event.clientX - start.x);
              const deltaY = Math.abs(event.clientY - start.y);
              if (!tabDragActiveRef.current && deltaX < 6 && deltaY < 6) {
                return;
              }
              tabDragActiveRef.current = true;
              updateTabFromPointerPosition(event.clientX, event.clientY);
            }}
            onPointerUp={(event) => {
              if (tabDragPointerIdRef.current !== event.pointerId) return;
              if (tabDragActiveRef.current) {
                const button = findTabButtonFromPoint(event.clientX, event.clientY);
                if (button) {
                  updateTabFromPointerTarget(button);
                }
              }
              tabDragPointerIdRef.current = null;
              tabDragStartRef.current = null;
              tabDragActiveRef.current = false;
            }}
            onPointerCancel={() => {
              tabDragPointerIdRef.current = null;
              tabDragStartRef.current = null;
              tabDragActiveRef.current = false;
            }}
          >
            <div
              className={`pointer-events-none absolute inset-y-1 rounded-sm bg-[#ef4242] shadow-[0_0_12px_rgba(239,66,66,0.3)] transition-all duration-300 ease-out ${
                tabHighlight.ready ? "opacity-100" : "opacity-0"
              }`}
              style={{
                left: `${tabHighlight.left}px`,
                width: `${tabHighlight.width}px`,
              }}
            />
            {([
              ["projects", `Projects (${filteredProjects.length})`],
              ["videos", `Videos (${filteredVideos.length})`],
            ] as [PortfolioTab, string][]).map(([nextTab, label]) => (
              <button
                key={nextTab}
                data-portfolio-tab={nextTab}
                ref={(node) => {
                  const tabs: PortfolioTab[] = ["projects", "videos"];
                  tabButtonRefs.current[tabs.indexOf(nextTab)] = node;
                }}
                type="button"
                onClick={() => setTab(nextTab)}
                className={`relative z-10 rounded-sm px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] transition-colors ${
                  tab === nextTab
                    ? "text-white"
                    : "text-white/35 hover:text-white/70"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="w-full sm:w-72">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              tab === "projects"
                ? "Search this client's projects..."
                : "Search this client's videos..."
            }
            className="h-10 w-full rounded-sm border border-white/10 bg-white/4 px-3 text-xs text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#ef4242]"
          />
        </div>
      </div>

      {tab === "projects" ? (
        filteredProjects.length === 0 ? (
          <div className="py-16 text-center text-sm text-white/30">
            No projects found.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project, index) => (
              <ProjectCard key={project.id} project={project} index={index} />
            ))}
          </div>
        )
      ) : filteredVideos.length === 0 ? (
        <div className="py-16 text-center text-sm text-white/30">
          No videos found.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredVideos.map((video) => (
            <div
              key={`${video.projectId}-${video.youtubeId}`}
              className="group overflow-hidden rounded-sm border border-white/8 bg-white/[0.02] transition-colors hover:border-white/20 hover:bg-white/[0.04]"
            >
              <div className="relative aspect-video overflow-hidden bg-black/30">
                <iframe
                  src={`https://www.youtube.com/embed/${video.youtubeId}?rel=0`}
                  title={video.title}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
                <div className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-sm border border-white/10 bg-black/60 px-2.5 py-1 text-[10px] text-white/75 backdrop-blur-sm">
                  <Eye size={11} className="shrink-0" />
                  <span>{formatViewCount(video.viewCount)}</span>
                </div>
              </div>
              <div className="space-y-2 p-4">
                <Link
                  href={video.projectPath}
                  className="block truncate text-[10px] uppercase tracking-[0.22em] text-[#ef4242] transition-colors hover:text-white"
                >
                  {video.projectTitle}
                </Link>
                <div className="flex items-center gap-2 text-xs text-white/65 transition-colors group-hover:text-white/85">
                  <Play size={11} className="shrink-0 text-[#ef4242]" />
                  <div className="min-w-0 flex-1 overflow-hidden">
                    {(video.title || video.youtubeId).length > 34 ? (
                      <div
                        className="block min-w-max whitespace-nowrap will-change-transform animate-[client-video-title-marquee_var(--client-video-title-duration)_ease-in-out_infinite_alternate]"
                        style={
                          {
                            "--client-video-title-width": "15rem",
                            "--client-video-title-duration": getVideoTitleMarqueeDuration(
                              video.title || video.youtubeId
                            ),
                          } as CSSProperties
                        }
                      >
                        {video.title || video.youtubeId}
                      </div>
                    ) : (
                      <div className="truncate">{video.title || video.youtubeId}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
