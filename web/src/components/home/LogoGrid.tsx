"use client";

import { PhoneCall, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { LOGOS_BY_DOMAIN, type LogoItem } from "@/lib/tech-stack";

function LogoTile({ name, domain, usage, icon, fallbackIcon }: LogoItem) {
  const resolvedIcon = icon ?? LOGOS_BY_DOMAIN[domain];
  const FallbackIcon = fallbackIcon === "phone" || domain === "retellai.com" ? PhoneCall : Sparkles;

  return (
    <div className="group relative aspect-square">
      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-sm border border-white/7 bg-white/2 p-4 transition-colors hover:border-[color-mix(in_srgb,var(--theme-primary,#ef4242)_40%,transparent)]">
        {resolvedIcon ? (
          <svg
            viewBox="0 0 24 24"
            role="img"
            aria-label={name}
            className="h-full w-full max-h-12 max-w-12 fill-current text-white"
          >
            <path d={resolvedIcon.path} />
          </svg>
        ) : (
          <FallbackIcon aria-label={name} className="h-11 w-11 text-white" strokeWidth={1.5} />
        )}
      </div>

      <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 scale-95 whitespace-nowrap opacity-0 transition-all duration-150 group-hover:scale-100 group-hover:opacity-100">
        <div className="rounded-sm border border-white/12 bg-[#1a1a1a] px-2.5 py-1.5 text-center">
          <div className="font-jb text-[11px] text-white">{name}</div>
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
        <div className="mt-1 font-nord text-sm text-white">{title}</div>
      </div>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
        {items.map((item) => (
          <LogoTile key={item.name} {...item} />
        ))}
      </div>
    </motion.div>
  );
}
