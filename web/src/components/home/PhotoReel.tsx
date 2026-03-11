"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import Lightbox from "@/components/shared/Lightbox";
import { imageAssetSrc, imageAssetAlt } from "@/lib/utils";
import { useTheme } from "@/lib/ThemeContext";
import type { SiteContentAbout } from "@/lib/types";

const defaultPhotos = [
  { src: "/cdn/WEB_ASSETS/ME/age_3.jpg", alt: "Michael Cran" },
  { src: "/cdn/WEB_ASSETS/ME/age_4.jpg", alt: "Michael Cran" },
];

const gradients = [
  "from-black/80 via-black/20 to-transparent",
  "from-transparent via-black/10 to-black/80",
  "from-black/60 via-transparent to-black/60",
  "from-transparent to-black/80",
];

export default function PhotoReel({ content }: { content?: SiteContentAbout }) {
  const ref = useRef<HTMLElement>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const { themeInfo } = useTheme();
  const isLight = themeInfo.id === "light";
  const photos = content?.images?.length ? content.images : defaultPhotos;
  const lightboxPhotos = photos
    .map((photo) => {
      const src = imageAssetSrc(photo);
      if (!src) return null;

      return {
        src,
        alt: imageAssetAlt(photo, content?.title ?? "Michael Cran"),
      };
    })
    .filter((photo): photo is { src: string; alt: string } => !!photo);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const x1 = useTransform(scrollYProgress, [0, 1], [-12, 12]);
  const x2 = useTransform(scrollYProgress, [0, 1], [12, -12]);

  return (
    <>
      <section ref={ref} className="py-28 border-t overflow-hidden" style={{ borderColor: 'color-mix(in srgb, var(--theme-text, #fff) 6%, transparent)' }}>
        <div className="content-container">
          <div className="flex items-center gap-3 mb-12">
            <div className="h-px w-8 bg-[#ef4242]" />
            <span className="text-[#ef4242] text-[11px] tracking-[0.25em] uppercase">
              {content?.eyebrow ?? "The Person Behind the Work"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div className="max-w-xl">
              <h2 className="font-nord text-3xl md:text-4xl text-white tracking-wider mb-5">
                {content?.title ?? "Michael Cran"}
              </h2>
              <p className="text-sm text-white/50 leading-relaxed mb-5">
                {content?.description ??
                  "I am a graduate of the University of Central Florida, where I earned a Bachelor of Science in Computer Science. I am a developer focused on building one-of-a-kind digital experiences that put a smile on people's faces."}
              </p>
              <p className="text-sm text-white/35 leading-relaxed mb-8">
                {content?.supportingText ?? "Based in Orlando, FL - OPEN FOR WORK"}
              </p>
              <div className="flex flex-wrap gap-3">
                {(content?.tags?.length ? content.tags : ["Builder", "Designer", "Developer", "Creator"]).map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1.5 rounded-sm border border-[rgba(239,66,66,0.25)] bg-[rgba(239,66,66,0.06)] text-[#ef4242] text-[11px] tracking-wider uppercase"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:hidden">
              {lightboxPhotos.map((photo, i) => (
                <div
                  key={`${photo.src}-mobile`}
                  role="button"
                  tabIndex={0}
                  aria-label={`View photo: ${photo.alt}`}
                  onClick={() => setExpanded(i)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(i); } }}
                  className={`relative aspect-[3/4] overflow-hidden rounded-sm border border-white/12 cursor-pointer ${isLight ? '' : 'bg-white/5'}`}
                >
                  <Image src={photo.src} alt={photo.alt} fill className="object-cover object-top" sizes="50vw" />
                  {!isLight && <div className={`absolute inset-0 bg-gradient-to-b ${gradients[i % gradients.length]} z-10`} />}
                </div>
              ))}
            </div>

            <div className="relative hidden md:block h-[420px] lg:h-[460px] overflow-hidden">
              {lightboxPhotos.map((photo, i) => (
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
                  role="button"
                  tabIndex={0}
                  aria-label={`View photo: ${photo.alt}`}
                  onClick={() => setExpanded(i)}
                  onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(i); } }}
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
                  className={`overflow-hidden rounded-sm border border-white/12 cursor-pointer ${isLight ? '' : 'shadow-[0_20px_60px_rgba(0,0,0,0.5)]'}`}
                >
                  <div className={`relative w-full h-full ${isLight ? '' : 'bg-white/5'}`}>
                    {!isLight && <div className={`absolute inset-0 bg-gradient-to-b ${gradients[i % gradients.length]} z-10`} />}
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

              {!isLight && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "radial-gradient(ellipse at center, rgba(239,66,66,0.08) 0%, transparent 70%)",
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      <Lightbox
        images={lightboxPhotos.map((photo) => photo.src)}
        captions={lightboxPhotos.map((photo) => photo.alt)}
        currentIndex={expanded}
        onClose={() => setExpanded(null)}
        onNavigate={setExpanded}
      />
    </>
  );
}
