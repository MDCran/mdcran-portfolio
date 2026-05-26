"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MIN_YEAR = 2024; // earliest year selectable

interface ContribDay {
  date: string;
  contributionCount: number;
  weekday: number;
}
interface ContribResponse {
  year: number;
  total: number;
  weeks: ContribDay[][];
}

const fetcher = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(r)));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const GAP = 3;        // px gap between squares
const LABEL_W = 30;   // px width of the day-of-week label column

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function formatLongDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${MONTHS_FULL[parseInt(m[2], 10) - 1] ?? m[2]} ${parseInt(m[3], 10)}, ${m[1]}`;
}
function cellColor(count: number, max: number): string {
  if (count <= 0) return "rgba(255,255,255,0.05)";
  const ratio = max > 0 ? count / max : 0;
  return `rgba(239,66,66,${Math.min(1, 0.28 + ratio * 0.72).toFixed(3)})`;
}

export default function GitHubContributions() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [tip, setTip] = useState<{ text: string; sub: string; x: number; y: number } | null>(null);
  const [cell, setCell] = useState(14);
  const wrapRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useSWR<ContribResponse>(
    `/api/github/contributions?year=${year}`,
    fetcher,
    { refreshInterval: year === currentYear ? 60_000 : 0, revalidateOnFocus: true, keepPreviousData: true }
  );

  const today = todayISO();

  // Build the FULL year grid (Jan 1 → Dec 31), padding leading/trailing days and
  // rendering days that haven't happened yet as empty cells — like GitHub.
  const { weeks, max, total, monthLabels } = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const wk of data?.weeks ?? []) for (const d of wk) byDate.set(d.date, d.contributionCount);
    let m = 0;
    for (const v of byDate.values()) if (v > m) m = v;

    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year, 11, 31));
    const gridStart = new Date(start);
    gridStart.setUTCDate(start.getUTCDate() - start.getUTCDay()); // back to Sunday

    const wks: (ContribDay | null)[][] = [];
    const labels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    const cur = new Date(gridStart);
    let col = 0;
    while (cur <= end) {
      const week: (ContribDay | null)[] = [];
      let weekMonth = -1;
      for (let d = 0; d < 7; d++) {
        const date = new Date(cur);
        date.setUTCDate(cur.getUTCDate() + d);
        if (date < start || date > end) { week.push(null); continue; }
        const iso = date.toISOString().slice(0, 10);
        week.push({ date: iso, contributionCount: byDate.get(iso) ?? 0, weekday: d });
        if (weekMonth === -1) weekMonth = date.getUTCMonth();
      }
      if (weekMonth !== -1 && weekMonth !== lastMonth) { labels.push({ col, label: MONTHS[weekMonth] }); lastMonth = weekMonth; }
      wks.push(week);
      cur.setUTCDate(cur.getUTCDate() + 7);
      col++;
    }
    return { weeks: wks, max: m, total: data?.total ?? 0, monthLabels: labels };
  }, [data, year]);

  // Size cells to fill the available width.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const cols = weeks.length || 53;
    const resize = () => {
      const avail = el.clientWidth - LABEL_W;
      // Fill the full component width: divide available space across all columns.
      const c = Math.max(8, Math.floor((avail - (cols - 1) * GAP) / cols));
      setCell(c);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [weeks.length]);

  const pitch = cell + GAP;
  const gridW = weeks.length * cell + Math.max(0, weeks.length - 1) * GAP;

  function showTip(e: React.MouseEvent, d: ContribDay) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTip({
      text: `${d.contributionCount} contribution${d.contributionCount === 1 ? "" : "s"}`,
      sub: formatLongDate(d.date),
      x: r.left + r.width / 2,
      y: r.top,
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="mt-6 rounded-sm border border-white/7 bg-white/2 p-5 md:p-6"
    >
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ef4242] opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#ef4242]" />
          </span>
          <div>
            <div className="font-nord text-sm text-white">
              {data ? total.toLocaleString("en-US") : "—"}{" "}
              <span className="text-white/40 text-xs font-jb">contributions in {year}</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">GitHub Activity · Live</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-0.5 rounded-sm border border-white/8 p-0.5">
            <button
              onClick={() => setYear((y) => Math.max(MIN_YEAR, y - 1))}
              disabled={year <= MIN_YEAR}
              aria-label="Previous year"
              className="flex h-6 w-6 items-center justify-center rounded-sm text-white/55 hover:text-white hover:bg-white/8 cursor-pointer transition-colors disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2 text-[12px] font-jb tabular-nums text-white min-w-[3rem] text-center">{year}</span>
            <button
              onClick={() => setYear((y) => Math.min(currentYear, y + 1))}
              disabled={year >= currentYear}
              aria-label="Next year"
              className="flex h-6 w-6 items-center justify-center rounded-sm text-white/55 hover:text-white hover:bg-white/8 cursor-pointer transition-colors disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              <ChevronRight size={14} />
            </button>
          </div>
          <a
            href="https://github.com/mdcran"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] font-jb tracking-wider text-white/45 border border-white/8 hover:text-white hover:border-white/20 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" /></svg>
            View on GitHub
          </a>
        </div>
      </div>

      {error ? (
        <p className="text-xs text-white/30 py-6 text-center">Couldn&apos;t load GitHub activity right now.</p>
      ) : (
        <div ref={wrapRef} className="w-full overflow-x-auto pb-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
          {/* Month labels */}
          <div className="relative" style={{ height: 14, marginLeft: LABEL_W, width: gridW }}>
            {monthLabels.map(({ col, label }) => (
              <span key={`${label}-${col}`} className="absolute text-[10px] text-white/35 font-jb" style={{ left: col * pitch }}>{label}</span>
            ))}
          </div>

          <div className="flex" style={{ gap: GAP }}>
            {/* Day-of-week labels */}
            <div className="flex flex-col" style={{ gap: GAP, width: LABEL_W - 6 }}>
              {DOW.map((d, i) => (
                <div key={d} className="text-[9px] text-white/30 font-jb flex items-center justify-end pr-1" style={{ height: cell }}>
                  {i === 1 || i === 3 || i === 5 ? d : ""}
                </div>
              ))}
            </div>

            {/* Week columns */}
            {isLoading && !data ? (
              <div className="flex items-center text-xs text-white/25" style={{ height: 7 * pitch }}>Loading activity…</div>
            ) : (
              weeks.map((week, ci) => (
                <div key={ci} className="flex flex-col" style={{ gap: GAP }}>
                  {week.map((d, r) =>
                    d ? (
                      <div
                        key={r}
                        onMouseEnter={(e) => showTip(e, d)}
                        onMouseMove={(e) => showTip(e, d)}
                        onMouseLeave={() => setTip(null)}
                        className="rounded-[2px] cursor-pointer transition-transform hover:scale-125"
                        style={{
                          width: cell, height: cell,
                          backgroundColor: cellColor(d.contributionCount, max),
                          border: d.date === today ? "1.5px solid #ffffff" : "1px solid rgba(255,255,255,0.04)",
                          boxShadow: d.date === today ? "0 0 8px rgba(255,255,255,0.5)" : undefined,
                        }}
                      />
                    ) : (
                      <div key={r} style={{ width: cell, height: cell }} />
                    )
                  )}
                </div>
              ))
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1.5 mt-4 justify-end" style={{ width: gridW + LABEL_W }}>
            <span className="text-[9px] text-white/30 font-jb mr-1">Less</span>
            {[0, 0.28, 0.5, 0.72, 1].map((a, i) => (
              <div key={i} className="rounded-[2px]" style={{ width: cell, height: cell, backgroundColor: a === 0 ? "rgba(255,255,255,0.05)" : `rgba(239,66,66,${a})` }} />
            ))}
            <span className="text-[9px] text-white/30 font-jb ml-1">More</span>
          </div>
        </div>
      )}

      {/* Floating tooltip */}
      {tip && (
        <div className="pointer-events-none fixed z-[70] -translate-x-1/2 -translate-y-full" style={{ left: tip.x, top: tip.y - 8 }}>
          <div className="rounded-sm px-2.5 py-1.5 text-center whitespace-nowrap" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.12)" }}>
            <div className="text-[11px] text-white font-jb">{tip.text}</div>
            <div className="text-[10px] text-white/45">{tip.sub}</div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
