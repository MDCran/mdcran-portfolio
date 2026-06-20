"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface BeforeAfterSliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt?: string;
  afterAlt?: string;
  caption?: string;
}

export default function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeAlt = "Before",
  afterAlt = "After",
  caption,
}: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(50);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const isPortrait = aspectRatio !== null && aspectRatio < 1;
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const hasAnimated = useRef(false);
  const userInteracted = useRef(false);

  // Detect natural aspect ratio from the before image
  useEffect(() => {
    const img = new window.Image();
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setAspectRatio(img.naturalWidth / img.naturalHeight);
      }
    };
    img.src = beforeSrc;
  }, [beforeSrc]);

  const activeContainerRef = useRef<HTMLDivElement | null>(null);

  const updatePosition = useCallback((clientX: number) => {
    const el = activeContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(pct);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Find the closest slider container from the event target
      const sliderEl = (e.target as HTMLElement).closest("[data-slider-container]") as HTMLDivElement | null;
      if (sliderEl) activeContainerRef.current = sliderEl;
      dragging.current = true;
      userInteracted.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      updatePosition(e.clientX);
    },
    [updatePosition],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      updatePosition(e.clientX);
    },
    [updatePosition],
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  // Auto-slide animation on first scroll into view
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current && !userInteracted.current) {
          hasAnimated.current = true;
          const keyframes = [
            { target: 2, duration: 800 },
            { target: 98, duration: 1200 },
            { target: 50, duration: 800 },
          ];
          let step = 0;
          const runStep = () => {
            if (step >= keyframes.length || userInteracted.current) return;
            const { target, duration } = keyframes[step];
            const startPos = step === 0 ? 50 : keyframes[step - 1].target;
            const startTime = performance.now();
            const animate = (now: number) => {
              if (userInteracted.current) return;
              const elapsed = now - startTime;
              const t = Math.min(elapsed / duration, 1);
              const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
              setPosition(startPos + (target - startPos) * ease);
              if (t < 1) {
                requestAnimationFrame(animate);
              } else {
                step++;
                setTimeout(runStep, 100);
              }
            };
            requestAnimationFrame(animate);
          };
          setTimeout(runStep, 300);
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // AI concierge: let the assistant set the reveal position via __SLIDER:before-after|pct__
  // (the cursor dispatches mdcran:before-after on this element with detail.value = 0-100).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onSet = (e: Event) => {
      const v = (e as CustomEvent<{ value?: number }>).detail?.value;
      if (typeof v === "number") { userInteracted.current = true; setPosition(Math.max(0, Math.min(100, v))); }
    };
    el.addEventListener("mdcran:before-after", onSet as EventListener);
    return () => el.removeEventListener("mdcran:before-after", onSet as EventListener);
  }, []);

  // Close expanded on Escape
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [expanded]);

  const sliderContent = (isFullscreen: boolean) => (
    <div
      ref={isFullscreen ? undefined : containerRef}
      data-slider-container
      data-highlight-id={isFullscreen ? undefined : "before-after"}
      className={`relative w-full rounded-sm overflow-hidden border border-white/8 select-none touch-none cursor-col-resize ${isFullscreen ? "h-full" : ""}`}
      style={!isFullscreen && aspectRatio ? { aspectRatio: `${aspectRatio}` } : isFullscreen ? {} : { aspectRatio: "16/9" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* After image (full, underneath) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={afterSrc}
        alt={afterAlt}
        className="absolute inset-0 w-full h-full object-contain bg-black"
        draggable={false}
      />

      {/* Before image (clipped) */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={beforeSrc}
          alt={beforeAlt}
          className="absolute inset-0 w-full h-full object-contain bg-black"
          draggable={false}
        />
      </div>

      {/* Slider line */}
      <div
        className="absolute top-0 bottom-0 w-[2px] bg-white/90 pointer-events-none"
        style={{ left: `${position}%`, transform: "translateX(-50%)" }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 border-2 border-white shadow-[0_0_10px_rgba(0,0,0,0.5)] flex items-center justify-center pointer-events-none">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-black/70">
            <path d="M4.5 8L1.5 5.5V10.5L4.5 8Z" fill="currentColor" />
            <path d="M11.5 8L14.5 5.5V10.5L11.5 8Z" fill="currentColor" />
            <line x1="4.5" y1="4" x2="4.5" y2="12" stroke="currentColor" strokeWidth="1.5" />
            <line x1="11.5" y1="4" x2="11.5" y2="12" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <span className="absolute top-2.5 left-2.5 text-[9px] uppercase tracking-widest bg-black/60 text-white/80 px-2 py-0.5 rounded-sm pointer-events-none">
        Before
      </span>
      <span className="absolute top-2.5 right-2.5 text-[9px] uppercase tracking-widest bg-black/60 text-white/80 px-2 py-0.5 rounded-sm pointer-events-none">
        After
      </span>

      {/* Expand button (inline only) */}
      {!isFullscreen && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
          className="absolute bottom-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-colors cursor-pointer"
          title="Expand"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </button>
      )}
    </div>
  );

  return (
    <>
      <figure
        className={`my-4 ${isPortrait ? "inline-block align-top px-1" : "block"}`}
        style={isPortrait ? { width: "calc(50% - 4px)" } : undefined}
      >
        {sliderContent(false)}
        {caption && (
          <p className="text-[10px] text-white/30 text-center mt-2">{caption}</p>
        )}
      </figure>

      {/* Fullscreen expanded overlay */}
      {expanded && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center p-4 sm:p-8"
          onClick={() => setExpanded(false)}
        >
          <div
            className="relative w-full max-w-6xl max-h-[90vh]"
            style={aspectRatio ? { aspectRatio: `${aspectRatio}` } : { aspectRatio: "16/9" }}
            onClick={(e) => e.stopPropagation()}
          >
            {sliderContent(true)}
          </div>
          <button
            onClick={() => setExpanded(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          {caption && (
            <p className="text-[11px] text-white/40 mt-3 tracking-wider">{caption}</p>
          )}
        </div>
      )}
    </>
  );
}
