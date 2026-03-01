"use client";

import React, { useEffect, useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface LightboxProps {
  images: string[];
  currentIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
  captions?: string[];
}

const AUTO_CYCLE_MS = 5000;

export default function Lightbox({
  images,
  currentIndex,
  onClose,
  onNavigate,
  captions,
}: LightboxProps) {
  const lightboxMaxHeight = "calc(100dvh - var(--navbar-height, 72px) - 3rem)";
  const [autoCycle, setAutoCycle] = useState(true);
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

  return (
    <AnimatePresence>
      {currentIndex !== null && (
        <motion.div
          key="lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-start justify-center px-4 pb-6"
          style={{ paddingTop: "calc(var(--navbar-height, 72px) + 1rem)" }}
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
            className="relative z-10 max-w-[90vw] max-h-[88vh] rounded-sm overflow-hidden border border-white/15 shadow-[0_40px_120px_rgba(0,0,0,0.9)]"
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
            style={{ maxWidth: "min(90vw, 1200px)", maxHeight: lightboxMaxHeight }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[currentIndex]}
              alt={captions?.[currentIndex] ?? `Image ${currentIndex + 1}`}
              className="block max-w-full max-h-[88vh] w-auto h-auto object-contain"
              style={{ maxWidth: "min(90vw, 1200px)", maxHeight: lightboxMaxHeight }}
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
                  className="h-full bg-[#ef4242]"
                />
              </div>
            )}
          </motion.div>

          {/* Bottom controls + carousel */}
          {images.length > 1 && (
            <div
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-full px-4"
              style={{ maxWidth: "min(90vw, 1200px)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto flex max-w-[72rem] flex-col gap-4">
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={prev}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white/70 transition-all duration-200 hover:border-white/30 hover:bg-black/80 hover:text-white"
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <button
                    onClick={() => setAutoCycle((value) => !value)}
                    className={`group relative inline-flex h-11 min-w-[170px] items-center justify-center overflow-hidden rounded-sm border px-5 text-[10px] uppercase tracking-[0.24em] transition-all duration-300 ${
                      autoCycle
                        ? "border-[#ef4242]/30 bg-[#ef4242]/10 text-white shadow-[0_0_18px_rgba(239,66,66,0.08)]"
                        : "border-white/12 bg-black/45 text-white/55"
                    }`}
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
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-[#ef4242]/12 to-transparent"
                    />
                    <span
                      className={`mr-2 h-2 w-2 rounded-full transition-all duration-300 ${
                        autoCycle
                          ? "bg-[#ef4242] shadow-[0_0_12px_rgba(239,66,66,0.45)]"
                          : "bg-white/25"
                      }`}
                    />
                    <span className="relative z-10">Auto-Cycle {autoCycle ? "On" : "Off"}</span>
                  </button>

                  <button
                    onClick={next}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white/70 transition-all duration-200 hover:border-white/30 hover:bg-black/80 hover:text-white"
                    aria-label="Next image"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>

                <div
                  ref={thumbnailStripRef}
                  className="rounded-sm border border-white/8 bg-black/35 px-3 py-3 backdrop-blur-md overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 cursor-grab active:cursor-grabbing"
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
                  <div className="mx-auto flex w-fit min-w-max gap-2">
                    {images.map((image, i) => (
                      <button
                        key={i}
                        ref={i === currentIndex ? activeThumbnailRef : null}
                        onClick={(e) => { e.stopPropagation(); onNavigate(i); }}
                        aria-label={`Go to image ${i + 1}`}
                        className={`group relative shrink-0 overflow-hidden rounded-sm border transition-all duration-200 ${
                          i === currentIndex
                            ? "border-[#ef4242] shadow-[0_0_0_1px_rgba(239,66,66,0.25)]"
                            : "border-white/10 hover:border-white/25"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image}
                          alt={captions?.[i] ?? `Thumbnail ${i + 1}`}
                          className="h-14 w-24 object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div
                          className={`absolute inset-0 transition-colors duration-200 ${
                            i === currentIndex
                              ? "bg-[#ef4242]/10"
                              : "bg-black/20 group-hover:bg-black/5"
                          }`}
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
}
