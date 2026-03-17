"use client";

import React, { useEffect, useRef, useState } from "react";
import { Search, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/lib/types";

interface FilterBarProps {
  onSearch?: (q: string) => void;
  onStatusFilter?: (status: ProjectStatus | "all") => void;
  counts?: Record<string, number>;
  /** Current column count (2-6) */
  cols?: number;
  /** Called when user changes column count */
  onColsChange?: (cols: number) => void;
}

const statusOptions: { label: string; value: ProjectStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Free", value: "free" },
  { label: "For Sale", value: "for_sale" },
];

const COL_OPTIONS = [2, 3, 4, 5] as const;
const GRID_BUTTON_SIZE = 24;
const GRID_BUTTON_GAP = 4;

/** Maps a column count to a Tailwind grid class string (full strings so Tailwind detects them). */
export const GRID_COLS_CLASS: Record<number, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  5: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6",
};

export default function FilterBar({
  onSearch,
  onStatusFilter,
  counts,
  cols,
  onColsChange,
}: FilterBarProps) {
  const [active, setActive] = useState<ProjectStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [draggingStatus, setDraggingStatus] = useState(false);
  const [draggingGrid, setDraggingGrid] = useState(false);
  const activeGridIndex = cols !== undefined ? Math.max(COL_OPTIONS.indexOf(cols as (typeof COL_OPTIONS)[number]), 0) : 0;
  const statusButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [statusHighlight, setStatusHighlight] = useState({ left: 0, width: 0, ready: false });

  const handleStatus = (val: ProjectStatus | "all") => {
    setActive(val);
    onStatusFilter?.(val);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onSearch?.(e.target.value);
  };

  useEffect(() => {
    if (!draggingStatus) {
      return;
    }

    const stopDragging = () => setDraggingStatus(false);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);

    return () => {
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, [draggingStatus]);

  useEffect(() => {
    if (!draggingGrid) {
      return;
    }

    const stopDragging = () => setDraggingGrid(false);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);

    return () => {
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, [draggingGrid]);

  useEffect(() => {
    const updateStatusHighlight = () => {
      const activeIndex = statusOptions.findIndex((option) => option.value === active);
      const activeButton = statusButtonRefs.current[activeIndex];

      if (!activeButton) {
        return;
      }

      setStatusHighlight({
        left: activeButton.offsetLeft,
        width: activeButton.offsetWidth,
        ready: true,
      });
    };

    updateStatusHighlight();
    window.addEventListener("resize", updateStatusHighlight);

    return () => {
      window.removeEventListener("resize", updateStatusHighlight);
    };
  }, [active, counts]);

  const getColFromPointerTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
      return null;
    }

    const button = target.closest<HTMLButtonElement>("[data-grid-col]");
    const raw = button?.dataset.gridCol;
    if (!raw) {
      return null;
    }

    const nextCols = Number.parseInt(raw, 10);
    return Number.isNaN(nextCols) ? null : nextCols;
  };

  const updateDraggedCols = (target: EventTarget | null) => {
    const nextCols = getColFromPointerTarget(target);
    if (nextCols) {
      onColsChange?.(nextCols);
    }
  };

  const handleGridPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!onColsChange) {
      return;
    }

    updateDraggedCols(event.target);
    setDraggingGrid(true);
  };

  const handleGridPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingGrid || !onColsChange) {
      return;
    }

    const pointerTarget = document.elementFromPoint(event.clientX, event.clientY);
    updateDraggedCols(pointerTarget);
  };

  const getStatusFromPointerTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
      return null;
    }

    const button = target.closest<HTMLButtonElement>("[data-status-value]");
    const raw = button?.dataset.statusValue as ProjectStatus | "all" | undefined;
    return raw ?? null;
  };

  const updateDraggedStatus = (target: EventTarget | null) => {
    const nextStatus = getStatusFromPointerTarget(target);
    if (nextStatus) {
      handleStatus(nextStatus);
    }
  };

  const handleStatusPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    updateDraggedStatus(event.target);
    setDraggingStatus(true);
  };

  const handleStatusPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingStatus) {
      return;
    }

    const pointerTarget = document.elementFromPoint(event.clientX, event.clientY);
    updateDraggedStatus(pointerTarget);
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
      {/* Left: Status filters */}
      <div
        className="flex max-w-full items-center gap-1 p-1 rounded-sm border border-white/8 bg-white/2 select-none"
        onPointerDown={handleStatusPointerDown}
        onPointerMove={handleStatusPointerMove}
        onPointerUp={() => setDraggingStatus(false)}
        onPointerCancel={() => setDraggingStatus(false)}
        style={{ touchAction: "none" }}
      >
        <div className="relative flex items-center gap-1">
          <div
            className={cn(
              "absolute top-0 left-0 h-full rounded-sm bg-[var(--cranberry)] shadow-[0_0_14px_rgba(239,66,66,0.22)] transition-all duration-300 ease-out",
              statusHighlight.ready ? "opacity-100" : "opacity-0"
            )}
            style={{
              width: `${statusHighlight.width}px`,
              transform: `translateX(${statusHighlight.left}px)`,
            }}
          />
          {statusOptions.map((opt, index) => (
            <button
              key={opt.value}
              ref={(node) => {
                statusButtonRefs.current[index] = node;
              }}
              type="button"
              data-status-value={opt.value}
              onClick={() => handleStatus(opt.value)}
              className={cn(
                "relative z-10 px-3 py-1.5 text-[11px] tracking-wider uppercase rounded-sm transition-all duration-200",
                active === opt.value
                  ? ""
                  : "text-white/40 hover:text-white hover:bg-white/5"
              )}
              style={active === opt.value ? { color: 'var(--on-accent, #fff)' } : undefined}
            >
              {opt.label}
              {counts && counts[opt.value] !== undefined && (
                <span className={cn("ml-1.5 opacity-60", active === opt.value ? "opacity-80" : "")}>
                  {counts[opt.value]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Column selector + Search */}
      <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Grid column selector */}
        {cols !== undefined && onColsChange && (
          <div
            className="hidden lg:flex h-10 w-fit items-center gap-1 px-1.5 rounded-sm border border-white/8 bg-white/2 select-none"
            onPointerDown={handleGridPointerDown}
            onPointerMove={handleGridPointerMove}
            onPointerUp={() => setDraggingGrid(false)}
            onPointerCancel={() => setDraggingGrid(false)}
            style={{ touchAction: "none" }}
          >
            <LayoutGrid size={11} className="text-white/25 ml-1 mr-0.5" />
            <div className="relative flex items-center gap-1">
              <div
                className="absolute top-0 left-0 rounded-sm bg-[var(--cranberry)] shadow-[0_0_14px_rgba(239,66,66,0.22)] transition-transform duration-300 ease-out"
                style={{
                  width: `${GRID_BUTTON_SIZE}px`,
                  height: `${GRID_BUTTON_SIZE}px`,
                  transform: `translateX(${activeGridIndex * (GRID_BUTTON_SIZE + GRID_BUTTON_GAP)}px)`,
                }}
              />
              {COL_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  data-grid-col={n}
                  onClick={() => onColsChange(n)}
                  title={`${n} columns`}
                  className={cn(
                    "relative z-10 w-6 h-6 flex items-center justify-center text-[10px] rounded-sm transition-all duration-200",
                    cols === n
                      ? ""
                      : "text-white/35 hover:text-white"
                  )}
                  style={cols === n ? { color: 'var(--on-accent, #fff)' } : undefined}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative w-full sm:w-64 flex-shrink-0">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
          <input
            value={query}
            onChange={handleSearch}
            placeholder="Search..."
            className="w-full h-10 bg-white/4 border border-white/8 focus:border-[var(--cranberry)] rounded-sm pl-9 pr-3 text-xs text-white placeholder:text-white/25 outline-none transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
