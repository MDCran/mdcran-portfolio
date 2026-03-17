"use client";

import { useCallback, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import type { Experience } from "@/lib/types";

function parseDate(d: string): number {
  // Handles "MM-YYYY" and "YYYY-MM" and "YYYY-MM-DD"
  if (/^\d{2}-\d{4}$/.test(d)) {
    const [mm, yyyy] = d.split("-");
    return new Date(Number(yyyy), Number(mm) - 1).getTime();
  }
  return new Date(d).getTime();
}

function extractYear(d: string): string {
  if (/^\d{2}-\d{4}$/.test(d)) return d.split("-")[1];
  if (/^\d{4}/.test(d)) return d.slice(0, 4);
  return d;
}

interface TimelineProps {
  experiences: Experience[];
}

export default function Timeline({ experiences }: TimelineProps) {
  const jobs = experiences
    .filter((e) => e.type === "job" || e.type === "volunteer")
    .sort((a, b) => parseDate(a.startDate) - parseDate(b.startDate));

  const ref = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ dragging: false, startX: 0, scrollLeft: 0 });
  const inView = useInView(ref, { once: true, margin: "0px 0px -80px 0px" });

  // Scroll to the right (latest) on mount
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      requestAnimationFrame(() => {
        el.scrollLeft = el.scrollWidth;
      });
    }
  }, [jobs.length]);

  // Drag to scroll
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    dragState.current = { dragging: true, startX: e.clientX, scrollLeft: el.scrollLeft };
    el.style.cursor = "grabbing";
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.current.dragging) return;
    const el = scrollRef.current;
    if (!el) return;
    const dx = e.clientX - dragState.current.startX;
    el.scrollLeft = dragState.current.scrollLeft - dx;
  }, []);

  const handlePointerUp = useCallback(() => {
    dragState.current.dragging = false;
    const el = scrollRef.current;
    if (el) el.style.cursor = "grab";
  }, []);

  if (jobs.length === 0) return null;

  // Pipeline is vertically centered in the layout
  // Even-indexed cards go above, odd-indexed go below
  const LINE_Y = 140; // px from top of the timeline area where the line sits

  return (
    <section ref={ref} className="py-16 sm:py-20 overflow-hidden">
      <div className="content-container">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[11px] tracking-[0.25em] uppercase text-[#ef4242] mb-2">Career</p>
            <h2 className="font-nord text-2xl sm:text-3xl text-white tracking-wider">Experience</h2>
          </div>
          <Link
            href="/resume"
            className="text-[10px] tracking-widest uppercase text-white/30 hover:text-[#ef4242] transition-colors"
          >
            Full Resume →
          </Link>
        </div>

        {/* Timeline */}
        <div className="relative" style={{ height: `${LINE_Y * 2 + 10}px` }}>
          {/* The glowing red pipeline line */}
          <div className="absolute left-0 right-0 h-[2px]" style={{ top: `${LINE_Y}px` }}>
            <motion.div
              className="h-full w-full"
              style={{
                background: "linear-gradient(90deg, transparent 0%, #ef4242 4%, #ef4242 96%, transparent 100%)",
                boxShadow: "0 0 12px rgba(239, 66, 66, 0.4), 0 0 4px rgba(239, 66, 66, 0.6)",
              }}
              initial={{ scaleX: 0, transformOrigin: "left" }}
              animate={inView ? { scaleX: 1 } : {}}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>

          {/* Scrollable items — drag to scroll, defaults to rightmost */}
          <div
            ref={scrollRef}
            className="flex gap-0 overflow-x-auto h-full scrollbar-hide select-none"
            style={{ scrollbarWidth: "none", cursor: "grab" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {jobs.map((job, i) => {
              const isCurrent = job.current || !job.endDate;
              const startYear = extractYear(job.startDate);
              const endYear = isCurrent ? "Present" : extractYear(job.endDate!);
              const isAbove = i % 2 === 0;

              return (
                <motion.div
                  key={job.id}
                  className="relative flex-shrink-0 flex flex-col items-center"
                  style={{ minWidth: "170px", maxWidth: "200px", flex: "1 0 auto", height: "100%" }}
                  initial={{ opacity: 0, y: isAbove ? -16 : 16 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* Above the line: card or empty space */}
                  <div
                    className="flex flex-col justify-end w-full px-1.5"
                    style={{ height: `${LINE_Y - 8}px` }}
                  >
                    {isAbove && (
                      <>
                        <TimelineCard
                          role={job.role}
                          company={job.companyName}
                          startYear={startYear}
                          endYear={endYear}
                          isCurrent={isCurrent}
                          isVolunteer={job.type === "volunteer"}
                        />
                        {/* Connector line down to dot */}
                        <div className="flex justify-center">
                          <div className="w-px h-3 bg-[#ef4242]/25" />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Dot on the line */}
                  <div className="relative z-10 flex items-center justify-center" style={{ height: "16px" }}>
                    {isCurrent && (
                      <motion.div
                        className="absolute rounded-full"
                        style={{ width: "28px", height: "28px", background: "rgba(239, 66, 66, 0.2)" }}
                        animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.3, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      />
                    )}
                    <div
                      className="w-3 h-3 rounded-full border-2 relative z-10"
                      style={{
                        backgroundColor: isCurrent ? "#ef4242" : "#1a1a1a",
                        borderColor: "#ef4242",
                        boxShadow: isCurrent
                          ? "0 0 10px rgba(239, 66, 66, 0.6), 0 0 4px rgba(239, 66, 66, 0.8)"
                          : "0 0 6px rgba(239, 66, 66, 0.25)",
                      }}
                    />
                  </div>

                  {/* Below the line: card or empty space */}
                  <div
                    className="flex flex-col justify-start w-full px-1.5"
                    style={{ height: `${LINE_Y - 8}px` }}
                  >
                    {!isAbove && (
                      <>
                        {/* Connector line down from dot */}
                        <div className="flex justify-center">
                          <div className="w-px h-3 bg-[#ef4242]/25" />
                        </div>
                        <TimelineCard
                          role={job.role}
                          company={job.companyName}
                          startYear={startYear}
                          endYear={endYear}
                          isCurrent={isCurrent}
                          isVolunteer={job.type === "volunteer"}
                        />
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* End cap — "Could be working with you!" */}
            <motion.div
              className="relative flex-shrink-0 flex flex-col items-center"
              style={{ minWidth: "160px", height: "100%" }}
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.3 + jobs.length * 0.1 + 0.2 }}
            >
              <div className="flex flex-col justify-end w-full" style={{ height: `${LINE_Y - 8}px` }} />
              {/* Dashed dot */}
              <div className="relative z-10 flex items-center justify-center" style={{ height: "16px" }}>
                <motion.div
                  className="absolute rounded-full"
                  style={{ width: "32px", height: "32px", border: "1.5px dashed rgba(239, 66, 66, 0.35)" }}
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                />
                <div
                  className="w-2 h-2 rounded-full relative z-10"
                  style={{
                    backgroundColor: "transparent",
                    border: "1.5px dashed rgba(239, 66, 66, 0.5)",
                  }}
                />
              </div>
              <div className="flex flex-col justify-start w-full px-1.5" style={{ height: `${LINE_Y - 8}px` }}>
                <div className="flex justify-center">
                  <div className="w-px h-3 bg-[#ef4242]/15" />
                </div>
                <p className="text-[10px] text-[#ef4242]/50 tracking-wider text-center leading-snug mt-1 italic">
                  Your Company<br />Here
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

    </section>
  );
}

function TimelineCard({
  role,
  company,
  startYear,
  endYear,
  isCurrent,
  isVolunteer = false,
}: {
  role: string;
  company: string;
  startYear: string;
  endYear: string;
  isCurrent: boolean;
  isVolunteer?: boolean;
}) {
  return (
    <div className="rounded-sm border border-white/8 bg-white/[0.02] p-2.5 hover:border-[rgba(239,66,66,0.2)] hover:bg-white/[0.04] transition-all duration-200 group">
      {/* Year range */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[9px] tracking-wider tabular-nums text-white/35">{startYear}</span>
        <span className="text-[7px] text-white/15">—</span>
        {isCurrent ? (
          <motion.span
            className="text-[9px] tracking-wider font-medium text-[#ef4242]"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            Present
          </motion.span>
        ) : (
          <span className="text-[9px] tracking-wider tabular-nums text-white/35">{endYear}</span>
        )}
      </div>

      {/* Role */}
      <p className="text-[11px] text-white/80 font-medium leading-snug mb-0.5 group-hover:text-white transition-colors line-clamp-2">
        {role}
      </p>

      {/* Company */}
      <p className="text-[10px] text-white/30 leading-snug truncate group-hover:text-white/45 transition-colors">
        {company}
      </p>
      {/* Volunteer tag */}
      {isVolunteer && (
        <span className="inline-block text-[7px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm border border-emerald-400/30 bg-emerald-400/8 text-emerald-400 mt-1.5">
          Volunteer
        </span>
      )}
    </div>
  );
}
