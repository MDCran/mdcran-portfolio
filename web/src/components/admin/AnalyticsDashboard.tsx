"use client";

import React, { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { flagEmoji } from "@/lib/flag";

const fetcher = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(r)));

interface Overview {
  totalVisits: number;
  uniqueVisitors: number;
  avgVisitsPerVisitor: number;
  avgScrollDepth: number;
  totalPageviews: number;
  windows: { label: string; visits: number }[];
  topCountries: { name: string; count: number; code?: string }[];
  topBrowsers: { name: string; count: number }[];
  topOS: { name: string; count: number }[];
  topPages: { path: string; views: number; avgTimeSec: number; avgScroll: number }[];
  topProjects: { path: string; views: number; avgTimeSec: number }[];
  topArticles: { path: string; views: number; avgTimeSec: number }[];
  scrollDistribution: { path: string; buckets: number[] }[];
  recruiterEvents: { name: string; total: number; uniqueSessions: number }[];
  loadTimes: { path: string; avgMs: number; samples: number }[];
  activeNow: number;
  sessionsToday: number;
  recentSessions: {
    sessionId: string; ip: string | null; countryName: string | null; browser: string; os: string; device: string;
    returning: boolean; pageviews: number; events: number; firstSeen: string; lastSeen: string; lastPath: string | null;
    readPaths: string[];
  }[];
}

const card = "rounded-sm border border-white/7 bg-white/2 p-5";
const RECRUITER_LABELS: Record<string, string> = {
  resume_view: "Resume Views",
  resume_download: "Resume Downloads",
  contact_open: "Contact Opens",
  github_click: "GitHub Clicks",
  linkedin_click: "LinkedIn Clicks",
  mailto_click: "Email Clicks",
  social_click: "Social Clicks",
};

function fmt(n: number) { return n.toLocaleString("en-US"); }
function timeAgo(iso: string) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function dur(sec: number) {
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

function BarList({ items, max }: { items: { name: string; count: number; code?: string }[]; max?: number }) {
  const top = max ?? Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="space-y-1.5">
      {items.length === 0 && <p className="text-xs text-white/25">No data yet.</p>}
      {items.map((it) => (
        <div key={it.name} className="relative">
          <div className="absolute inset-y-0 left-0 rounded-sm bg-[#ef4242]/12" style={{ width: `${(it.count / top) * 100}%` }} />
          <div className="relative flex items-center justify-between px-2 py-1 text-xs">
            <span className="text-white/70 truncate flex items-center gap-1.5">
              {it.code && <span className="text-sm leading-none">{flagEmoji(it.code)}</span>}
              {it.name}
            </span>
            <span className="text-white/40 tabular-nums">{fmt(it.count)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Heatmap overlay ── */
function Heatmap() {
  const { data: pagesData } = useSWR<{ pages: string[] }>("/api/admin/analytics/heatmap", fetcher);
  const [path, setPath] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "click" | "rage" | "move">("all");
  const { data, isLoading } = useSWR<{ path: string; points: { type: string; x: number; y: number }[] }>(
    path ? `/api/admin/analytics/heatmap?path=${encodeURIComponent(path)}` : null,
    fetcher
  );
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [frameHeight, setFrameHeight] = useState(1200);

  const pages = pagesData?.pages ?? [];
  useEffect(() => { if (!path && pages.length) setPath(pages[0]); }, [pages, path]);

  const syncHeight = () => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc) setFrameHeight(Math.max(600, doc.documentElement.scrollHeight));
    } catch { /* cross-origin shouldn't happen (same site) */ }
  };

  const points = (data?.points ?? []).filter((p) => filter === "all" || p.type === filter);
  const counts = (data?.points ?? []).reduce<Record<string, number>>((a, p) => ({ ...a, [p.type]: (a[p.type] ?? 0) + 1 }), {});

  return (
    <div className={card}>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div>
          <p className="font-nord text-sm text-white">Heatmaps</p>
          <p className="text-[11px] text-white/35">Where visitors click, move, and rage-click. 30-day rolling window, positions stored as page-percentages so the overlay scales to any viewport.</p>
        </div>
        <div className="flex items-center gap-1">
          {(["all", "click", "rage", "move"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-2.5 py-1 rounded-sm text-[11px] capitalize ${filter === f ? "bg-[#ef4242]/12 text-[#ef4242] border border-[#ef4242]/35" : "text-white/40 border border-white/8 hover:text-white/70"}`}>
              {f}{f !== "all" && counts[f] ? ` (${counts[f]})` : ""}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-[200px_1fr] gap-4">
        <div className="space-y-1 max-h-[520px] overflow-y-auto pr-1">
          {pages.length === 0 && <p className="text-xs text-white/25">No heatmap data yet.</p>}
          {pages.map((p) => (
            <button key={p} onClick={() => setPath(p)} className={`w-full text-left px-2.5 py-1.5 rounded-sm text-xs truncate transition-colors ${p === path ? "bg-[#ef4242]/10 text-[#ef4242]" : "text-white/50 hover:bg-white/4 hover:text-white/80"}`} title={p}>
              {p}
            </button>
          ))}
        </div>
        <div className="relative rounded-sm border border-white/8 bg-black/40 overflow-hidden" style={{ maxHeight: 560, overflowY: "auto" }}>
          {!path ? (
            <div className="flex items-center justify-center h-64 text-xs text-white/25">Select a page</div>
          ) : (
            <div className="relative" style={{ height: frameHeight }}>
              <iframe
                ref={iframeRef}
                src={`${path}?noTrack=1`}
                title="Heatmap preview"
                onLoad={syncHeight}
                className="absolute inset-0 w-full"
                style={{ height: frameHeight, border: 0, pointerEvents: "none" }}
              />
              <div className="absolute inset-0" style={{ mixBlendMode: "screen" }}>
                {!isLoading && points.map((pt, i) => (
                  <span
                    key={i}
                    className="absolute rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${pt.x}%`,
                      top: `${pt.y}%`,
                      width: pt.type === "rage" ? 26 : pt.type === "move" ? 12 : 18,
                      height: pt.type === "rage" ? 26 : pt.type === "move" ? 12 : 18,
                      background:
                        pt.type === "rage"
                          ? "radial-gradient(circle, rgba(255,70,70,0.95), rgba(255,70,70,0) 70%)"
                          : pt.type === "move"
                          ? "radial-gradient(circle, rgba(255,255,255,0.18), rgba(255,255,255,0) 70%)"
                          : "radial-gradient(circle, rgba(239,66,66,0.6), rgba(239,66,66,0) 70%)",
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const { data, error } = useSWR<Overview>("/api/admin/analytics/overview", fetcher, {
    refreshInterval: 15_000,
    revalidateOnFocus: true,
    keepPreviousData: true,
  });
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const toggleSession = (id: string) =>
    setExpandedSessions((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  if (error) return <p className="text-xs text-white/30">Couldn&apos;t load analytics.</p>;
  if (!data) return <p className="text-white/30 text-xs">Loading analytics…</p>;

  const overviewCards = [
    { label: "Total Visits", value: fmt(data.totalVisits) },
    { label: "Unique Visitors", value: fmt(data.uniqueVisitors) },
    { label: "Avg Visits / Visitor", value: data.avgVisitsPerVisitor.toFixed(1) },
    { label: "Avg Scroll Depth", value: `${data.avgScrollDepth}%` },
    { label: "Total Pageviews", value: fmt(data.totalPageviews) },
    { label: "Active Now", value: fmt(data.activeNow), live: true },
    { label: "Sessions Today", value: fmt(data.sessionsToday) },
  ];

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        {overviewCards.map((c) => (
          <div key={c.label} className={`${card} relative`}>
            {c.live && (
              <span className="absolute right-3 top-3 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
            )}
            <p className="text-[10px] tracking-[0.18em] uppercase text-white/35 mb-2">{c.label}</p>
            <p className="font-nord text-2xl text-white">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Visit windows */}
      <div className={card}>
        <p className="text-[10px] tracking-[0.18em] uppercase text-white/35 mb-3">Visits</p>
        <div className="grid grid-cols-4 gap-3">
          {data.windows.map((w) => (
            <div key={w.label} className="text-center">
              <p className="font-nord text-xl text-white">{fmt(w.visits)}</p>
              <p className="text-[10px] uppercase tracking-wider text-white/30 mt-1">{w.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recruiter intent */}
      <div className={card}>
        <p className="font-nord text-sm text-white mb-1">Recruiter Intent</p>
        <p className="text-[11px] text-white/35 mb-4">Resume downloads, email/GitHub/LinkedIn/social clicks, contact opens, resume views. Counts total + unique sessions.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.keys(RECRUITER_LABELS).map((key) => {
            const ev = data.recruiterEvents.find((e) => e.name === key);
            return (
              <div key={key} className="rounded-sm border border-white/6 bg-white/[0.02] p-3">
                <p className="font-nord text-xl text-white">{fmt(ev?.total ?? 0)}</p>
                <p className="text-[10px] uppercase tracking-wider text-white/40 mt-1">{RECRUITER_LABELS[key]}</p>
                <p className="text-[10px] text-white/25 mt-0.5">{fmt(ev?.uniqueSessions ?? 0)} unique</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Countries / Browsers / OS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={card}><p className="text-[10px] tracking-[0.18em] uppercase text-white/35 mb-3">Top Countries</p><BarList items={data.topCountries} /></div>
        <div className={card}><p className="text-[10px] tracking-[0.18em] uppercase text-white/35 mb-3">Top Browsers</p><BarList items={data.topBrowsers} /></div>
        <div className={card}><p className="text-[10px] tracking-[0.18em] uppercase text-white/35 mb-3">Top Operating Systems</p><BarList items={data.topOS} /></div>
      </div>

      {/* Top pages */}
      <div className={card}>
        <p className="font-nord text-sm text-white mb-3">Top Pages</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-white/30 text-[10px] uppercase tracking-wider"><th className="text-left font-normal py-1.5">Page</th><th className="text-right font-normal">Views</th><th className="text-right font-normal">Avg Time</th><th className="text-right font-normal">Avg Scroll</th></tr></thead>
            <tbody>
              {data.topPages.slice(0, 25).map((p) => (
                <tr key={p.path} className="border-t border-white/5">
                  <td className="py-1.5 text-white/70 truncate max-w-[280px]">{p.path}</td>
                  <td className="text-right text-white/50 tabular-nums">{fmt(p.views)}</td>
                  <td className="text-right text-white/50 tabular-nums">{dur(p.avgTimeSec)}</td>
                  <td className="text-right text-white/50 tabular-nums">{p.avgScroll}%</td>
                </tr>
              ))}
              {data.topPages.length === 0 && <tr><td colSpan={4} className="text-white/25 py-3">No pageviews yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top projects + articles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {([["Top Projects", data.topProjects], ["Top Articles", data.topArticles]] as const).map(([title, list]) => (
          <div key={title} className={card}>
            <p className="font-nord text-sm text-white mb-3">{title}</p>
            <div className="space-y-1.5">
              {list.length === 0 && <p className="text-xs text-white/25">No data yet.</p>}
              {list.map((p, i) => (
                <div key={p.path} className="flex items-center justify-between text-xs">
                  <span className="text-white/60 truncate"><span className="text-white/25 mr-2">{i + 1}.</span>{p.path}</span>
                  <span className="text-white/40 tabular-nums shrink-0 ml-2">{fmt(p.views)} · {dur(p.avgTimeSec)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Scroll depth distribution */}
      <div className={card}>
        <p className="font-nord text-sm text-white mb-3">Scroll Depth Distribution</p>
        <div className="space-y-2">
          {data.scrollDistribution.length === 0 && <p className="text-xs text-white/25">No data yet.</p>}
          {data.scrollDistribution.map((s) => {
            const total = s.buckets.reduce((a, b) => a + b, 0) || 1;
            const colors = ["bg-white/15", "bg-[#ef4242]/30", "bg-[#ef4242]/55", "bg-[#ef4242]/85"];
            return (
              <div key={s.path}>
                <div className="flex items-center justify-between text-[11px] mb-0.5"><span className="text-white/55 truncate max-w-[320px]">{s.path}</span><span className="text-white/25">{total} views</span></div>
                <div className="flex h-3 rounded-sm overflow-hidden">
                  {s.buckets.map((b, i) => (
                    <div key={i} className={colors[i]} style={{ width: `${(b / total) * 100}%` }} title={`${["0-25%", "25-50%", "50-75%", "75-100%"][i]}: ${b}`} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 mt-3 text-[9px] text-white/30">
          {["0-25%", "25-50%", "50-75%", "75-100%"].map((l, i) => (
            <span key={l} className="flex items-center gap-1"><span className={`inline-block w-2.5 h-2.5 rounded-sm ${["bg-white/15", "bg-[#ef4242]/30", "bg-[#ef4242]/55", "bg-[#ef4242]/85"][i]}`} />{l}</span>
          ))}
        </div>
      </div>

      {/* Load times per page */}
      <div className={card}>
        <p className="font-nord text-sm text-white mb-3">Average Load Time by Page</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-white/30 text-[10px] uppercase tracking-wider"><th className="text-left font-normal py-1.5">Page</th><th className="text-right font-normal">Avg Load</th><th className="text-right font-normal">Samples</th></tr></thead>
            <tbody>
              {data.loadTimes.map((l) => (
                <tr key={l.path} className="border-t border-white/5">
                  <td className="py-1.5 text-white/70 truncate max-w-[320px]">{l.path}</td>
                  <td className="text-right tabular-nums" style={{ color: l.avgMs > 2500 ? "#ef4242" : l.avgMs > 1200 ? "#f59e0b" : "#22c55e" }}>{(l.avgMs / 1000).toFixed(2)}s</td>
                  <td className="text-right text-white/40 tabular-nums">{l.samples}</td>
                </tr>
              ))}
              {data.loadTimes.length === 0 && <tr><td colSpan={3} className="text-white/25 py-3">No load-time data yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Heatmaps */}
      <Heatmap />

      {/* Sessions log */}
      <div className={card}>
        <p className="font-nord text-sm text-white mb-3">Sessions <span className="text-white/30 text-xs font-jb">(live — active highlighted · click a row to see pages read)</span></p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-white/30 text-[10px] uppercase tracking-wider"><th className="text-left font-normal py-1.5">Visitor</th><th className="text-left font-normal">IP</th><th className="text-left font-normal">Country</th><th className="text-left font-normal">Browser / OS</th><th className="text-right font-normal">Pages</th><th className="text-right font-normal">Read</th><th className="text-left font-normal pl-3">Last Page</th><th className="text-right font-normal">Last Seen</th></tr></thead>
            <tbody>
              {data.recentSessions.map((s) => {
                const active = Date.now() - new Date(s.lastSeen).getTime() < 90_000;
                const expanded = expandedSessions.has(s.sessionId);
                return (
                  <React.Fragment key={s.sessionId}>
                  <tr className="border-t border-white/5 cursor-pointer hover:bg-white/3" onClick={() => toggleSession(s.sessionId)}>
                    <td className="py-1.5">
                      <span className="inline-flex items-center gap-1.5">
                        {active && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                        <span className={s.returning ? "text-[#ef4242]" : "text-white/55"}>{s.returning ? "Returning" : "New"}</span>
                      </span>
                    </td>
                    <td className="text-white/40 font-mono text-[10px]">{s.ip ?? "—"}</td>
                    <td className="text-white/50">{s.countryName ?? "—"}</td>
                    <td className="text-white/50">{s.browser} · {s.os}</td>
                    <td className="text-right text-white/50 tabular-nums">{s.pageviews}</td>
                    <td className="text-right tabular-nums">
                      <span className={s.readPaths.length ? "text-emerald-400" : "text-white/30"}>{s.readPaths.length}</span>
                    </td>
                    <td className="text-white/40 pl-3 truncate max-w-[180px]">{s.lastPath ?? "—"}</td>
                    <td className="text-right text-white/40">{timeAgo(s.lastSeen)}</td>
                  </tr>
                  {expanded && (
                    <tr className="border-t border-white/5 bg-white/2">
                      <td colSpan={8} className="px-3 py-2">
                        {s.readPaths.length ? (
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 mb-1.5">Pages read (scrolled to completion){s.ip ? ` · ${s.ip}` : ""}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {s.readPaths.map((p) => (
                                <span key={p} className="inline-flex items-center gap-1 rounded-sm border border-emerald-400/20 bg-emerald-400/8 px-2 py-0.5 text-[11px] text-emerald-300/90">
                                  <span className="h-1 w-1 rounded-full bg-emerald-400" /> {p}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-[11px] text-white/30">No fully-read pages yet in this session.</p>
                        )}
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                );
              })}
              {data.recentSessions.length === 0 && <tr><td colSpan={8} className="text-white/25 py-3">No sessions yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
