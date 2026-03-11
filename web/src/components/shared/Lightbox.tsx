"use client";

import React, { useEffect, useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";

interface LightboxProps {
  images: string[];
  currentIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
  captions?: string[];
  fullScreen?: boolean;
}

const AUTO_CYCLE_MS = 5000;

export default function Lightbox({
  images,
  currentIndex,
  onClose,
  onNavigate,
  captions,
  fullScreen = false,
}: LightboxProps) {
  const lightboxMaxHeight = "calc(100dvh - var(--navbar-height, 72px) - 3rem)";
  const [autoCycle, setAutoCycle] = useState(true);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(false);
  const [isThumbnailTrayExpanded, setIsThumbnailTrayExpanded] = useState(true);
  const thumbnailStripRef = useRef<HTMLDivElement>(null);
  const activeThumbnailRef = useRef<HTMLButtonElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startScrollLeft: number;
    isDragging: boolean;
  } | null>(null);

  const prev = useCallback(() => {
    if (currentIndex === null) return;
    onNavigate((currentIndex - 1 + images.length) % images.length);
  }, [currentIndex, images.length, onNavigate]);

  const next = useCallback(() => {
    if (currentIndex === null) return;
    onNavigate((currentIndex + 1) % images.length);
  }, [currentIndex, images.length, onNavigate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, prev, next]);

  useEffect(() => {
    if (currentIndex !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [currentIndex]);

  useEffect(() => {
    if (currentIndex === null || images.length <= 1 || !autoCycle) return;

    const timer = window.setInterval(() => {
      next();
    }, AUTO_CYCLE_MS);

    return () => window.clearInterval(timer);
  }, [autoCycle, currentIndex, images.length, next]);

  useEffect(() => {
    if (currentIndex === null || !activeThumbnailRef.current) return;

    activeThumbnailRef.current.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [currentIndex]);

  useEffect(() => {
    const syncViewportMode = () => {
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      const landscapeMobile =
        window.matchMedia("(orientation: landscape)").matches && window.innerHeight <= 520;

      setIsMobileViewport(mobile);
      setIsLandscapeMobile(landscapeMobile);
      setIsThumbnailTrayExpanded(!landscapeMobile);
    };

    syncViewportMode();
    window.addEventListener("resize", syncViewportMode);

    return () => window.removeEventListener("resize", syncViewportMode);
  }, []);

  const hasCarousel = images.length > 1;
  const desktopCarouselClearance = hasCarousel ? "11rem" : "1.5rem";
  const viewportPaddingTop = isMobileViewport
    ? (fullScreen ? "0" : "calc(var(--navbar-height, 72px) + 0.75rem)")
    : (fullScreen ? "0" : "calc(var(--navbar-height, 72px) + 1rem)");
  const viewportPaddingBottom = isLandscapeMobile
    ? "2.5rem"
    : isMobileViewport
      ? "12rem"
      : fullScreen
        ? (hasCarousel ? "9rem" : "0")
        : desktopCarouselClearance;
  const resolvedImageMaxHeight = isLandscapeMobile
    ? "calc(100dvh - var(--navbar-height, 72px) - 3.25rem)"
    : isMobileViewport
      ? "calc(100dvh - var(--navbar-height, 72px) - 13rem)"
      : fullScreen
        ? (hasCarousel ? "calc(100dvh - 9.5rem)" : "100dvh")
        : hasCarousel
          ? "calc(100dvh - var(--navbar-height, 72px) - 12.5rem)"
          : lightboxMaxHeight;
  const resolvedImageMaxWidth =
    fullScreen || isMobileViewport || isLandscapeMobile ? "100vw" : "min(90vw, 1200px)";
  const isTrayCollapsed = isLandscapeMobile && !isThumbnailTrayExpanded;

  const lightboxContent = (
    <AnimatePresence>
      {currentIndex !== null && (
        <motion.div
          key="lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          data-force-dark
          className={`fixed inset-0 z-[9999] flex justify-center pb-6 ${
            fullScreen || isMobileViewport || isLandscapeMobile ? "items-center px-0" : "items-start px-4"
          }`}
          style={{ paddingTop: viewportPaddingTop, paddingBottom: viewportPaddingBottom }}
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/92 backdrop-blur-md" />

          {/* Image */}
          <motion.div
            key={`lb-${currentIndex}`}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={`relative z-10 flex w-full items-center justify-center overflow-hidden ${
              fullScreen || isMobileViewport || isLandscapeMobile
                ? "rounded-none border-0 shadow-none"
                : "rounded-sm border border-white/15 shadow-[0_40px_120px_rgba(0,0,0,0.9)]"
            }`}
            onClick={(e) => {
              e.stopPropagation();

              if (images.length <= 1) return;

              const target = e.target as HTMLElement;
              if (target.closest("button")) return;

              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              if (x < rect.width * 0.4) {
                prev();
                return;
              }
              if (x > rect.width * 0.6) {
                next();
              }
            }}
            drag={images.length > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={(_, info) => {
              if (images.length <= 1) return;
              if (info.offset.x >= 80) {
                prev();
                return;
              }
              if (info.offset.x <= -80) {
                next();
              }
            }}
            style={{ maxWidth: resolvedImageMaxWidth, maxHeight: resolvedImageMaxHeight }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[currentIndex]}
              alt={captions?.[currentIndex] ?? `Image ${currentIndex + 1}`}
              className={`block h-auto w-auto max-w-full object-contain ${
                isLandscapeMobile ? "min-w-full" : ""
              }`}
              style={{ maxWidth: resolvedImageMaxWidth, maxHeight: resolvedImageMaxHeight }}
            />

            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 to-transparent">
              <span className="text-[11px] text-white/50 tracking-widest">
                {currentIndex + 1} / {images.length}
              </span>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/90 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Caption */}
            {captions?.[currentIndex] && (
              <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-xs text-white/60 tracking-wide">{captions[currentIndex]}</p>
              </div>
            )}

            {images.length > 1 && autoCycle && (
              <div className="absolute bottom-0 left-0 right-0 z-10 h-1 bg-white/8">
                <motion.div
                  key={`progress-${currentIndex}`}
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: AUTO_CYCLE_MS / 1000, ease: "linear" }}
                  className="h-full"
                  style={{ backgroundColor: 'var(--theme-primary, #ef4242)' }}
                />
              </div>
            )}
          </motion.div>

          {/* Bottom controls + carousel */}
          {images.length > 1 && (
            <div
              className={`absolute left-1/2 z-10 w-full ${
                isLandscapeMobile ? "bottom-0 px-0" : "bottom-3 px-3 md:bottom-6 md:px-4"
              }`}
              style={{ maxWidth: resolvedImageMaxWidth, transform: "translateX(-50%)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`mx-auto flex max-w-[72rem] flex-col ${isLandscapeMobile ? "gap-2" : "gap-4"}`}>
                <div className={`flex items-center justify-center ${isLandscapeMobile ? "gap-2" : "gap-4"}`}>
                  <button
                    onClick={prev}
                    className={`flex items-center justify-center rounded-full border border-white/15 bg-black/55 text-white/70 transition-all duration-200 hover:border-white/30 hover:bg-black/80 hover:text-white ${
                      isLandscapeMobile ? "h-9 w-9" : "h-11 w-11"
                    }`}
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={isLandscapeMobile ? 16 : 20} />
                  </button>

                  <button
                    onClick={() => setAutoCycle((value) => !value)}
                    className={`group relative inline-flex items-center justify-center overflow-hidden rounded-sm border text-[10px] uppercase tracking-[0.24em] transition-all duration-300 ${
                      isLandscapeMobile ? "h-9 min-w-[150px] px-3" : "h-11 min-w-[170px] px-5"
                    } ${
                      autoCycle
                        ? "text-white"
                        : "border-white/12 bg-black/45 text-white/55"
                    }`}
                    style={autoCycle ? {
                      borderColor: 'color-mix(in srgb, var(--theme-primary, #ef4242) 30%, transparent)',
                      backgroundColor: 'color-mix(in srgb, var(--theme-primary, #ef4242) 10%, transparent)',
                      boxShadow: '0 0 18px color-mix(in srgb, var(--theme-primary, #ef4242) 8%, transparent)',
                    } : undefined}
                    aria-pressed={autoCycle}
                    aria-label={`Auto-cycle ${autoCycle ? "on" : "off"}`}
                  >
                    <motion.span
                      animate={
                        autoCycle
                          ? { opacity: [0.25, 0.5, 0.25], scaleX: [0.96, 1, 0.96] }
                          : { opacity: 0 }
                      }
                      transition={autoCycle ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
                      className="absolute inset-0"
                      style={{ background: 'linear-gradient(to right, transparent, color-mix(in srgb, var(--theme-primary, #ef4242) 12%, transparent), transparent)' }}
                    />
                    <span
                      className={`mr-2 h-2 w-2 rounded-full transition-all duration-300 ${
                        autoCycle ? "" : "bg-white/25"
                      }`}
                      style={autoCycle ? {
                        backgroundColor: 'var(--theme-primary, #ef4242)',
                        boxShadow: '0 0 12px color-mix(in srgb, var(--theme-primary, #ef4242) 45%, transparent)',
                      } : undefined}
                    />
                    <span className="relative z-10">Auto-Cycle {autoCycle ? "On" : "Off"}</span>
                  </button>

                  <button
                    onClick={next}
                    className={`flex items-center justify-center rounded-full border border-white/15 bg-black/55 text-white/70 transition-all duration-200 hover:border-white/30 hover:bg-black/80 hover:text-white ${
                      isLandscapeMobile ? "h-9 w-9" : "h-11 w-11"
                    }`}
                    aria-label="Next image"
                  >
                    <ChevronRight size={isLandscapeMobile ? 16 : 20} />
                  </button>
                </div>

                <div
                  ref={thumbnailStripRef}
                  className={`relative rounded-sm border border-white/8 bg-black/35 px-3 backdrop-blur-md overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 cursor-grab active:cursor-grabbing transition-all duration-300 ${
                    isTrayCollapsed ? "max-h-8 py-1" : "max-h-24 py-3"
                  }`}
                  onClick={() => {
                    if (isTrayCollapsed) {
                      setIsThumbnailTrayExpanded(true);
                    }
                  }}
                  onPointerDown={(e) => {
                    if (!thumbnailStripRef.current) return;
                    const target = e.target as HTMLElement;
                    if (target.closest("button")) return;
                    dragStateRef.current = {
                      pointerId: e.pointerId,
                      startX: e.clientX,
                      startScrollLeft: thumbnailStripRef.current.scrollLeft,
                      isDragging: false,
                    };
                  }}
                  onPointerMove={(e) => {
                    if (!thumbnailStripRef.current || !dragStateRef.current) return;
                    if (dragStateRef.current.pointerId !== e.pointerId) return;
                    const delta = e.clientX - dragStateRef.current.startX;
                    if (!dragStateRef.current.isDragging && Math.abs(delta) < 6) return;
                    if (!dragStateRef.current.isDragging) {
                      dragStateRef.current.isDragging = true;
                      thumbnailStripRef.current.setPointerCapture(e.pointerId);
                    }
                    thumbnailStripRef.current.scrollLeft = dragStateRef.current.startScrollLeft - delta;
                  }}
                  onPointerUp={(e) => {
                    if (!thumbnailStripRef.current || !dragStateRef.current) return;
                    if (dragStateRef.current.pointerId !== e.pointerId) return;
                    if (dragStateRef.current.isDragging && thumbnailStripRef.current.hasPointerCapture(e.pointerId)) {
                      thumbnailStripRef.current.releasePointerCapture(e.pointerId);
                    }
                    dragStateRef.current = null;
                  }}
                  onPointerCancel={(e) => {
                    if (!thumbnailStripRef.current || !dragStateRef.current) return;
                    if (dragStateRef.current.pointerId !== e.pointerId) return;
                    if (dragStateRef.current.isDragging && thumbnailStripRef.current.hasPointerCapture(e.pointerId)) {
                      thumbnailStripRef.current.releasePointerCapture(e.pointerId);
                    }
                    dragStateRef.current = null;
                  }}
                >
                  {isLandscapeMobile && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsThumbnailTrayExpanded((value) => !value);
                      }}
                      className="absolute right-2 top-1.5 z-10 inline-flex items-center gap-1 rounded-sm border border-white/10 bg-black/45 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-white/60 transition-colors hover:border-white/20 hover:text-white/80"
                      aria-expanded={isThumbnailTrayExpanded}
                      aria-label={isThumbnailTrayExpanded ? "Collapse gallery strip" : "Expand gallery strip"}
                    >
                      <ChevronsUpDown size={10} />
                      Gallery
                    </button>
                  )}
                  <div className="mx-auto flex w-fit min-w-max gap-2">
                    {images.map((image, i) => (
                      <button
                        key={i}
                        ref={i === currentIndex ? activeThumbnailRef : null}
                        onClick={(e) => { e.stopPropagation(); onNavigate(i); }}
                        aria-label={`Go to image ${i + 1}`}
                        className={`group relative shrink-0 overflow-hidden rounded-sm border transition-all duration-200 ${
                          i === currentIndex
                            ? ""
                            : "border-white/10 hover:border-white/25"
                        }`}
                        style={i === currentIndex ? {
                          borderColor: 'var(--theme-primary, #ef4242)',
                          boxShadow: '0 0 0 1px color-mix(in srgb, var(--theme-primary, #ef4242) 25%, transparent)',
                        } : undefined}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image}
                          alt={captions?.[i] ?? `Thumbnail ${i + 1}`}
                          className={`object-cover transition-transform duration-300 group-hover:scale-105 ${
                            isLandscapeMobile ? "h-14 w-20" : "h-14 w-24"
                          }`}
                        />
                        <div
                          className={`absolute inset-0 transition-colors duration-200 ${
                            i !== currentIndex
                              ? "bg-black/20 group-hover:bg-black/5"
                              : ""
                          }`}
                          style={i === currentIndex ? {
                            backgroundColor: 'color-mix(in srgb, var(--theme-primary, #ef4242) 10%, transparent)',
                          } : undefined}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") {
    return lightboxContent;
  }

  return createPortal(lightboxContent, document.body);
}
