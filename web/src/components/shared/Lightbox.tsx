"use client";

import React, { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface LightboxProps {
  images: string[];
  currentIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
  captions?: string[];
}

export default function Lightbox({
  images,
  currentIndex,
  onClose,
  onNavigate,
  captions,
}: LightboxProps) {
  const lightboxMaxHeight = "calc(100dvh - var(--navbar-height, 72px) - 3rem)";

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

          {/* Prev button */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-4 md:left-8 z-20 w-11 h-11 rounded-full bg-black/80 border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/90 transition-colors backdrop-blur-sm"
              aria-label="Previous image"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          {/* Image */}
          <motion.div
            key={`lb-${currentIndex}`}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 max-w-[90vw] max-h-[88vh] rounded-sm overflow-hidden border border-white/15 shadow-[0_40px_120px_rgba(0,0,0,0.9)]"
            onClick={(e) => e.stopPropagation()}
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
          </motion.div>

          {/* Next button */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-4 md:right-8 z-20 w-11 h-11 rounded-full bg-black/80 border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/90 transition-colors backdrop-blur-sm"
              aria-label="Next image"
            >
              <ChevronRight size={20} />
            </button>
          )}

          {/* Dots */}
          {images.length > 1 && images.length <= 12 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); onNavigate(i); }}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    i === currentIndex ? "bg-[#ef4242] w-4" : "bg-white/30 hover:bg-white/60 w-1.5"
                  }`}
                  aria-label={`Go to image ${i + 1}`}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
