"use client";

import React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Globe } from "lucide-react";
import type { SiteContentSectionIntro } from "@/lib/types";

const GlobeViewer = dynamic(() => import("@/components/visitor/GlobeViewer"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
      <div className="flex flex-col items-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-[#ef4242]/50 animate-spin" />
        <span className="text-[10px] uppercase tracking-[0.15em] text-white/25 font-jb">
          Loading globe…
        </span>
      </div>
    </div>
  ),
});

interface CountryEntry {
  country: string;
  countryName: string;
  lat: number;
  lng: number;
  count: number;
}

interface VisitorMapProps {
  countries: CountryEntry[];
  content?: SiteContentSectionIntro;
}

export default function VisitorMap({ countries, content }: VisitorMapProps) {
  const totalCount = countries.reduce((sum, c) => sum + c.count, 0);
  const topCountries = countries.slice(0, 8);

  const eyebrow = content?.eyebrow ?? "Global Reach";
  const title = content?.title ?? "Visitor Map";
  const description = content?.description ?? "See where visitors are tuning in from around the world.";

  return (
    <section className="pt-10 pb-24">
      {/* Header */}
      <div className="content-container">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="text-[11px] tracking-[0.2em] uppercase text-[#ef4242] font-jb">
            {eyebrow.toUpperCase()}
          </span>
          <h2 className="font-nord text-3xl sm:text-4xl text-white mt-3 tracking-wider">
            {title}
          </h2>
          <p className="text-sm text-white/40 leading-relaxed mt-3 max-w-md">
            {description}
          </p>
        </motion.div>
      </div>

      {/* 2-column: Stats + Globe */}
      <div className="content-container">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2.5fr] gap-6 mt-8 items-start">
          {/* Left: Stats panel */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-sm border border-white/10 bg-[#0a0a0a]/80 p-6"
          >
            {/* Total */}
            <div className="text-[10px] tracking-[0.2em] uppercase text-white/25 font-jb">
              Total Visitors
            </div>
            <div className="text-4xl font-bold text-[#ef4242] font-jb mt-2 leading-none">
              {totalCount.toLocaleString("en-US")}
            </div>

            {/* Top Countries */}
            <div className="mt-6 border-t border-white/8 pt-5">
              <div className="text-[10px] tracking-[0.15em] uppercase text-white/25 font-jb mb-3">
                Top Countries
              </div>
              {topCountries.length === 0 && (
                <div className="text-[11px] text-white/25 font-jb">No data yet</div>
              )}
              <div className="space-y-2.5">
                {topCountries.map((entry, i) => (
                  <div key={entry.country} className="flex items-center gap-3 text-[12px] font-jb">
                    <span className="w-4 text-right text-white/20 tabular-nums">{i + 1}</span>
                    <span className="flex-1 text-white/55 truncate">{entry.countryName}</span>
                    <span className="text-[#ef4242] font-semibold tabular-nums">
                      {entry.count.toLocaleString("en-US")}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Explore link */}
            <Link
              href="/visitor-map"
              className="group mt-6 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] text-white/35 transition-colors hover:text-[#ef4242] font-jb"
            >
              <Globe size={12} className="opacity-50 group-hover:opacity-100 transition-opacity" />
              Explore Full Map
              <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>

          {/* Right: 3D Globe */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative aspect-[4/3] overflow-hidden rounded-sm border border-white/10 bg-black"
          >
            <GlobeViewer stats={countries} total={totalCount} hideStats />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
