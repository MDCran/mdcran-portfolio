"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

interface SectionEntry {
  id: string;
  label: string;
  el: HTMLElement;
}

const LABEL_MAP: Record<string, string> = {
  hero: "Home",
  stats: "Stats",
  about: "About",
  timeline: "Career",
  services: "Services",
  featured: "Work",
  clients: "Clients",
  "visitor-map": "Visitors",
  cta: "Contact",
};

function humanize(id: string): string {
  if (LABEL_MAP[id]) return LABEL_MAP[id];
  return id
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const VISIBLE_COUNT = 7;

export default function SectionWheel() {
  const [sections, setSections] = useState<SectionEntry[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  const rafRef = useRef(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  // Scan for sections on route change
  useEffect(() => {
    const timer = setTimeout(() => {
      const main = document.querySelector("main");
      if (!main) { setSections([]); return; }

      const entries: SectionEntry[] = [];
      const seen = new Set<string>();

      // Only show on home page
      if (pathname !== "/") {
        setSections([]);
        return;
      }

      const candidates = main.querySelectorAll(":scope > [id], :scope > div > [id]");
      candidates.forEach((el) => {
        const id = el.id;
        if (!id || seen.has(id) || id.startsWith("_")) return;
        const rect = (el as HTMLElement).getBoundingClientRect();
        if (rect.height < 100) return;
        seen.add(id);
        entries.push({ id, label: humanize(id), el: el as HTMLElement });
      });

      setSections(entries);
    }, 500);

    return () => clearTimeout(timer);
  }, [pathname]);

  // Track active section via scroll
  useEffect(() => {
    if (sections.length === 0) return;

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const viewCenter = window.innerHeight * 0.4;
        let closest = 0;
        let closestDist = Infinity;
        sections.forEach((s, i) => {
          const rect = s.el.getBoundingClientRect();
          const dist = Math.abs(rect.top + rect.height / 2 - viewCenter);
          if (dist < closestDist) {
            closestDist = dist;
            closest = i;
          }
        });
        setActiveIdx(closest);
        setVisible(window.scrollY > 200);
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [sections]);

  // Wheel scroll on the widget to navigate sections
  useEffect(() => {
    const el = wheelRef.current;
    if (!el || sections.length === 0) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dir = e.deltaY > 0 ? 1 : -1;
      setActiveIdx((prev) => {
        const next = Math.max(0, Math.min(sections.length - 1, prev + dir));
        const entry = sections[next];
        if (entry) entry.el.scrollIntoView({ behavior: "smooth", block: "start" });
        return next;
      });
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [sections]);

  const scrollTo = useCallback((idx: number) => {
    const entry = sections[idx];
    if (!entry) return;
    entry.el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [sections]);

  if (sections.length < 2) return null;

  const half = Math.floor(VISIBLE_COUNT / 2);
  const start = Math.max(0, Math.min(activeIdx - half, sections.length - VISIBLE_COUNT));
  const windowSections = sections.slice(start, start + VISIBLE_COUNT);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={wheelRef}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.3 }}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col items-end"
        >
          <div
            className="flex flex-col items-end gap-0 py-2 pl-2 pr-1.5 rounded-l-sm border-y border-l backdrop-blur-md"
            style={{
              borderColor: "color-mix(in srgb, var(--theme-text, #fff) 8%, transparent)",
              backgroundColor: "color-mix(in srgb, var(--theme-bg, #0a0a0a) 82%, transparent)",
            }}
          >
            {windowSections.map((section, i) => {
              const globalIdx = start + i;
              const isActive = globalIdx === activeIdx;
              const distance = Math.abs(globalIdx - activeIdx);
              // Wheel effect: scale + opacity based on distance from active
              const scale = isActive ? 1 : distance === 1 ? 0.92 : distance === 2 ? 0.84 : 0.76;
              const opacity = isActive ? 1 : distance === 1 ? 0.55 : distance === 2 ? 0.3 : 0.15;

              return (
                <motion.button
                  key={section.id}
                  onClick={() => scrollTo(globalIdx)}
                  className="relative flex items-center gap-2 py-1.5 px-2 rounded-sm cursor-pointer text-right transition-colors duration-150"
                  animate={{ scale, opacity }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  style={{ transformOrigin: "right center" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--theme-text, #fff) 6%, transparent)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {/* Dot */}
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-200"
                    style={{
                      backgroundColor: isActive
                        ? "var(--cranberry, #ef4242)"
                        : "color-mix(in srgb, var(--theme-text, #fff) 30%, transparent)",
                      boxShadow: isActive ? "0 0 6px var(--cranberry, #ef4242)" : "none",
                    }}
                  />

                  {/* Label */}
                  <span
                    className="text-[9px] tracking-[0.15em] uppercase whitespace-nowrap transition-all duration-200"
                    style={{
                      color: isActive
                        ? "var(--cranberry, #ef4242)"
                        : "color-mix(in srgb, var(--theme-text, #fff) 40%, transparent)",
                      fontWeight: isActive ? 600 : 400,
                      textShadow: isActive
                        ? "0 0 12px color-mix(in srgb, var(--cranberry, #ef4242) 30%, transparent)"
                        : "none",
                    }}
                  >
                    {section.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
