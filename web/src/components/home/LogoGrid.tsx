"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { logoKitUrl, type LogoItem } from "@/lib/tech-stack";

function LogoTile({ name, domain, usage }: LogoItem) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="group relative aspect-square">
      <div className="h-full w-full flex items-center justify-center overflow-hidden rounded-sm border border-white/7 bg-white/2 p-3 transition-colors hover:border-[color-mix(in_srgb,var(--theme-primary,#ef4242)_40%,transparent)]">
        {failed ? (
          <span className="text-[9px] font-jb text-white/40 text-center leading-tight">{name}</span>
        ) : (
          <img
            src={logoKitUrl(domain)}
            alt={name}
            loading="lazy"
            className="max-h-full max-w-full rounded-sm object-contain"
            onError={() => setFailed(true)}
          />
        )}
      </div>

      <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 scale-95 whitespace-nowrap opacity-0 transition-all duration-150 group-hover:scale-100 group-hover:opacity-100">
        <div className="rounded-sm border border-white/12 bg-[#1a1a1a] px-2.5 py-1.5 text-center">
          <div className="text-[11px] text-white font-jb">{name}</div>
          <div className="text-[10px] text-white/45">{usage}</div>
        </div>
      </div>
    </div>
  );
}

export default function LogoGrid({
  eyebrow,
  title,
  items,
}: {
  eyebrow: string;
  title: string;
  items: LogoItem[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="mt-6 rounded-sm border border-white/7 bg-white/2 p-5 md:p-6"
    >
      <div className="mb-5">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">{eyebrow}</div>
        <div className="font-nord text-sm text-white mt-1">{title}</div>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
        {items.map((item) => (
          <LogoTile key={item.domain + item.name} {...item} />
        ))}
      </div>
    </motion.div>
  );
}
