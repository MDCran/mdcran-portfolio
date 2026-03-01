"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

const photos = [
  { src: "/cdn/WEB_ASSETS/ME/age_3.jpg", alt: "Michael Cran" },
  { src: "/cdn/WEB_ASSETS/ME/age_4.jpg", alt: "Michael Cran" },
];

const gradients = [
  "from-black/80 via-black/20 to-transparent",
  "from-transparent via-black/10 to-black/80",
  "from-black/60 via-transparent to-black/60",
  "from-transparent to-black/80",
];

const YEARS_CREATING = new Date().getFullYear() - 2018;

export default function PhotoReel() {
  const ref = useRef<HTMLElement>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const x1 = useTransform(scrollYProgress, [0, 1], [-12, 12]);
  const x2 = useTransform(scrollYProgress, [0, 1], [12, -12]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(null);
      if (e.key === "ArrowRight") setExpanded((p) => p !== null ? (p + 1) % photos.length : null);
      if (e.key === "ArrowLeft") setExpanded((p) => p !== null ? (p - 1 + photos.length) % photos.length : null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (expanded !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [expanded]);

  return (
    <>
      <section ref={ref} className="py-28 border-t border-white/6 overflow-hidden">
        <div className="content-container">
          {/* Header */}
          <div className="flex items-center gap-3 mb-12">
            <div className="h-px w-8 bg-[#ef4242]" />
            <span className="text-[#ef4242] text-[11px] tracking-[0.25em] uppercase">
              The Person Behind the Work
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-14 items-center">
            {/* Text */}
            <div className="max-w-xl">
              <h2 className="font-nord text-3xl md:text-4xl text-white tracking-wider mb-5">
                Michael Cran
              </h2>
              <p className="text-sm text-white/50 leading-relaxed mb-5">
                UCF Computer Science student, developer, building one-of-a-kind digital
                experiences that put a smile on people&apos;s faces! Over the past {YEARS_CREATING}+ years,
                I&apos;ve worked as a content manager, developer, map designer, and builder for
                some of the internet&apos;s most inspiring creators and teams. What started as a
                casual gaming session at a soccer field turned into a career building
                production-level software, platforms, and custom systems that support real
                users and large online communities.
              </p>
              <p className="text-sm text-white/35 leading-relaxed mb-8">
                Based in Orlando, FL — working with clients worldwide.
              </p>
              <div className="flex flex-wrap gap-3">
                {["Builder", "Designer", "Developer", "Creator"].map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1.5 rounded-sm border border-[rgba(239,66,66,0.25)] bg-[rgba(239,66,66,0.06)] text-[#ef4242] text-[11px] tracking-wider uppercase"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Mobile grid */}
            <div className="grid grid-cols-2 gap-3 md:hidden">
              {photos.map((photo, i) => (
                <div
                  key={`${photo.src}-mobile`}
                  onClick={() => setExpanded(i)}
                  className="relative aspect-[3/4] overflow-hidden rounded-sm border border-white/12 bg-white/5 cursor-pointer"
                >
                  <Image src={photo.src} alt={photo.alt} fill className="object-cover object-top" sizes="50vw" />
                  <div className={`absolute inset-0 bg-gradient-to-b ${gradients[i]} z-10`} />
                  <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
                    <div className="w-8 h-8 rounded-full bg-black/60 border border-white/20 flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop collage */}
            <div className="relative hidden md:block h-[420px] lg:h-[460px] overflow-hidden">
              {photos.map((photo, i) => (
                <motion.div
                  key={photo.src}
                  initial={{ opacity: 0, y: 32, rotate: (i % 2 === 0 ? -2 : 2) * 0.5 }}
                  animate={{ opacity: 1, y: 0, rotate: i % 2 === 0 ? -2 : 2 }}
                  transition={{
                    duration: 0.8,
                    delay: i * 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  whileHover={{
                    scale: 1.06,
                    rotate: 0,
                    zIndex: 20,
                    transition: { duration: 0.25 },
                  }}
                  onClick={() => setExpanded(i)}
                  style={{
                    x: i % 2 === 0 ? x1 : x2,
                    position: "absolute",
                    width: `${44 + (i % 2) * 8}%`,
                    aspectRatio: "3/4",
                    top: i < 2 ? `${6 + i * 10}%` : `${44 + (i - 2) * 8}%`,
                    left: i % 2 === 0 ? `${2 + i * 6}%` : undefined,
                    right: i % 2 !== 0 ? `${2 + (i - 1) * 5}%` : undefined,
                    zIndex: i + 1,
                  }}
                  className="overflow-hidden rounded-sm border border-white/12 cursor-pointer shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
                >
                  <div className="relative w-full h-full bg-white/5">
                    <div className={`absolute inset-0 bg-gradient-to-b ${gradients[i]} z-10`} />
                    <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
                      <div className="w-10 h-10 rounded-full bg-black/70 border border-white/20 flex items-center justify-center backdrop-blur-sm">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                      </div>
                    </div>
                    <Image
                      src={photo.src}
                      alt={photo.alt}
                      fill
                      className="object-cover object-top"
                      sizes="40vw"
                    />
                  </div>
                </motion.div>
              ))}

              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse at center, rgba(239,66,66,0.08) 0%, transparent 70%)",
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {expanded !== null && (
          <motion.div
            key="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            onClick={() => setExpanded(null)}
          >
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />

            {/* Prev button */}
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded((p) => p !== null ? (p - 1 + photos.length) % photos.length : null); }}
              className="absolute left-4 z-20 w-10 h-10 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors backdrop-blur-sm"
            >
              <ChevronLeft size={18} />
            </button>

            <motion.div
              key={`lightbox-img-${expanded}`}
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.88, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 max-w-[90vw] max-h-[85vh] rounded-sm overflow-hidden border border-white/15 shadow-[0_40px_120px_rgba(0,0,0,0.8)]"
              onClick={(e) => e.stopPropagation()}
              style={{ aspectRatio: "3/4", height: "80vh" }}
            >
              <Image
                src={photos[expanded].src}
                alt={photos[expanded].alt}
                fill
                className="object-cover object-top"
                sizes="90vw"
              />
              <button
                onClick={() => setExpanded(null)}
                className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/90 transition-colors backdrop-blur-sm"
              >
                <X size={14} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 z-20 px-4 py-3 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-xs text-white/60 tracking-wider">{photos[expanded].alt}</p>
              </div>
            </motion.div>

            {/* Next button */}
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded((p) => p !== null ? (p + 1) % photos.length : null); }}
              className="absolute right-4 z-20 w-10 h-10 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors backdrop-blur-sm"
            >
              <ChevronRight size={18} />
            </button>

            {/* Navigation dots */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-2">
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setExpanded(i); }}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    i === expanded ? "bg-[#ef4242] w-4" : "bg-white/30 hover:bg-white/60 w-1.5"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
