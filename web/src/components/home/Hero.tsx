"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { ArrowRight, ChevronDown, MapPin } from "lucide-react";
import Link from "next/link";
import SpotifyWidget from "./SpotifyWidget";
import BibleWidget from "./BibleWidget";
import MapWidget from "./MapWidget";

const services = [
  { label: "Minecraft Maps", href: "/arts-and-entertainment/minecraft-maps" },
  { label: "Events", href: "/arts-and-entertainment/events" },
  { label: "Thumbnail Design", href: "/motion-and-graphics/thumbnail-design" },
  { label: "Video Editing", href: "/motion-and-graphics/video-editing" },
  { label: "Web Dev & Design", href: "/motion-and-graphics/web-dev-design" },
];

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.92]);
  const springY = useSpring(y, { stiffness: 100, damping: 30 });

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* ─── Background effects ─────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[70vh]"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(239,66,66,0.12) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Floating orbs */}
      <motion.div
        className="absolute top-1/4 -left-32 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(239,66,66,0.06) 0%, transparent 70%)" }}
        animate={{ x: [0, 20, 0], y: [0, -30, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(239,66,66,0.04) 0%, transparent 70%)" }}
        animate={{ x: [0, -20, 0], y: [0, 20, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />

      {/* Corner brackets */}
      <div className="absolute top-16 left-6 w-16 h-16 border-l-2 border-t-2 border-[rgba(239,66,66,0.25)] pointer-events-none" />
      <div className="absolute top-16 right-6 w-16 h-16 border-r-2 border-t-2 border-[rgba(239,66,66,0.25)] pointer-events-none" />
      <div className="absolute bottom-16 left-6 w-16 h-16 border-l-2 border-b-2 border-[rgba(239,66,66,0.12)] pointer-events-none" />
      <div className="absolute bottom-16 right-6 w-16 h-16 border-r-2 border-b-2 border-[rgba(239,66,66,0.12)] pointer-events-none" />

      {/* Animated particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-px h-px rounded-full pointer-events-none"
          style={{
            background: i % 2 === 0 ? "#ef4242" : "rgba(255,255,255,0.6)",
            top: `${20 + i * 12}%`,
            left: `${10 + i * 15}%`,
          }}
          animate={{ opacity: [0, 1, 0], scale: [1, 2, 1], y: [0, -20, 0] }}
          transition={{ duration: 3 + i * 0.7, repeat: Infinity, delay: i * 0.8 }}
        />
      ))}

      {/* ─── Main content — fully centered ──────────────── */}
      <motion.div
        style={{ y: springY, opacity, scale }}
        className="relative z-10 w-full content-container pt-32 sm:pt-36 pb-20"
      >
        {/* ── Hero text block ── */}
        <div className="text-center mb-14">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-3 mb-8"
          >
            <motion.div
              className="h-px bg-gradient-to-r from-transparent to-[#ef4242]"
              initial={{ width: 0 }}
              animate={{ width: 40 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#ef4242] animate-pulse" />
              <span className="text-[#ef4242] text-[11px] tracking-[0.3em] uppercase">
                Software Engineer
              </span>
            </div>
            <motion.div
              className="h-px bg-gradient-to-l from-transparent to-[#ef4242]"
              initial={{ width: 0 }}
              animate={{ width: 40 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />
          </motion.div>

          {/* Name */}
          <div className="overflow-hidden mb-8">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 className="font-nord font-[800] text-[clamp(3rem,10vw,7rem)] tracking-[0.06em] leading-[0.9] relative inline-block">
                <span className="text-white">MD</span>
                <span className="text-[#ef4242]">CRAN</span>
                <span
                  className="absolute inset-0 font-nord font-[800] text-[#ef4242] opacity-20 blur-md select-none pointer-events-none"
                  aria-hidden="true"
                >
                  MDCRAN
                </span>
              </h1>
            </motion.div>
          </div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="text-white/45 text-sm md:text-base max-w-xl mx-auto mb-6 leading-relaxed"
          >
            Designing and building digital projects for creators, companies, and secure
            enterprise platforms.
            <span className="block text-white/25">Computer Science @ UCF.</span>
          </motion.p>

          {/* Location */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-2 text-[11px] text-white/25 mb-8"
          >
            <MapPin size={11} className="text-[#ef4242]" />
            <span>Orlando, FL — Available worldwide</span>
          </motion.div>

          {/* Service tags */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-wrap gap-2 mb-10 justify-center"
          >
            {services.map((service, i) => (
              <motion.div
                key={service.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + i * 0.04 }}
              >
                <Link
                  href={service.href}
                  className="inline-block px-4 py-2 text-[11px] tracking-wider text-white/40 border border-white/10 rounded-sm bg-white/3 hover:border-[rgba(239,66,66,0.35)] hover:text-white/75 hover:bg-[rgba(239,66,66,0.06)] transition-all duration-200 cursor-pointer backdrop-blur-sm"
                >
                  {service.label}
                </Link>
              </motion.div>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="flex items-center gap-4 flex-wrap justify-center"
          >
            <Link href="/work" className="group relative">
              <div className="absolute -inset-1 rounded-sm bg-[#ef4242] opacity-30 blur-md group-hover:opacity-60 transition-opacity duration-500 animate-glow-pulse" />
              <div className="relative flex items-center gap-2 h-12 px-7 bg-[#ef4242] text-white text-sm tracking-wider uppercase rounded-sm hover:bg-[#dd3030] transition-colors duration-200 shadow-[0_0_30px_rgba(239,66,66,0.4)]">
                View Work
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform duration-200" />
              </div>
            </Link>

            <Link
              href="/contact"
              className="group flex items-center gap-2 h-12 px-7 text-sm tracking-wider uppercase text-white/60 border border-white/12 rounded-sm hover:border-[rgba(239,66,66,0.4)] hover:text-white hover:bg-[rgba(239,66,66,0.05)] transition-all duration-200 backdrop-blur-sm"
            >
              Contact Me
            </Link>

            <Link
              href="/resume"
              className="flex items-center gap-2 h-12 px-5 text-sm tracking-wider uppercase text-white/30 hover:text-white/60 transition-colors duration-200"
            >
              Resume
            </Link>
          </motion.div>
        </div>

        {/* ── Widgets row ── */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <SpotifyWidget />
          <BibleWidget />
          <MapWidget />
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/20 z-10"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="text-[9px] tracking-[0.3em] uppercase">Scroll</span>
        <ChevronDown size={14} />
      </motion.div>
    </section>
  );
}
