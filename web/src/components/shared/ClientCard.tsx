"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Youtube, Twitch, Instagram, Twitter, Github, Globe, Facebook, Music2, ExternalLink, ArrowRight, Link2 } from "lucide-react";
import { cn, imageAssetSrc, shouldBypassImageOptimization } from "@/lib/utils";
import type { Client, Platform } from "@/lib/types";

const platformConfig: Record<Platform, { icon: React.ElementType; color: string; label: string }> = {
  youtube: { icon: Youtube, color: "#ff0000", label: "YouTube" },
  twitch: { icon: Twitch, color: "#9146ff", label: "Twitch" },
  tiktok: { icon: Music2, color: "#69c9d0", label: "TikTok" },
  instagram: { icon: Instagram, color: "#e1306c", label: "Instagram" },
  facebook: { icon: Facebook, color: "#1877f2", label: "Facebook" },
  x: { icon: Twitter, color: "#1da1f2", label: "X" },
  github: { icon: Github, color: "#ffffff", label: "GitHub" },
  website: { icon: Globe, color: "#ffffff", label: "Website" },
  spotify: { icon: Music2, color: "#1db954", label: "Spotify" },
  discord: { icon: Globe, color: "#5865f2", label: "Discord" },
  other: { icon: Link2, color: "#ffffff", label: "Link" },
};

interface ClientCardProps {
  client: Client;
  index?: number;
  metrics?: Record<string, number>;
  className?: string;
  projectCount?: number;
}

export default function ClientCard({ client, index = 0, className, projectCount }: ClientCardProps) {
  const clientHref = client.isEmployer ? `/employers/${client.id}` : `/clients/${client.id}`;

  return (
    <motion.div
      id={`client-${client.id}`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0, margin: "0px 0px 100px 0px" }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className={cn("group relative", className)}
    >
      <div className="relative rounded-sm border border-white/7 bg-white/2 backdrop-blur-sm overflow-hidden transition-all duration-300 group-hover:border-[rgba(239,66,66,0.25)] group-hover:bg-white/4 group-hover:shadow-[0_12px_32px_rgba(0,0,0,0.3)] h-full flex flex-col">
        {/* Top accent on hover */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-[#ef4242] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="px-5 pt-5 flex flex-col flex-1">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            {client.avatarUrl ? (
              <Link
                href={clientHref}
                title={client.name}
                className="relative w-12 h-12 rounded-sm overflow-hidden shrink-0 border border-white/10 transition-transform duration-200 hover:scale-110 hover:border-[rgba(239,66,66,0.3)]"
              >
                <Image src={imageAssetSrc(client.avatarUrl) ?? client.avatarUrl} alt={client.name} fill className="object-cover" unoptimized={shouldBypassImageOptimization(client.avatarUrl)} />
              </Link>
            ) : (
              <Link
                href={clientHref}
                title={client.name}
                className="w-12 h-12 rounded-sm bg-[rgba(239,66,66,0.08)] border border-[rgba(239,66,66,0.2)] flex items-center justify-center shrink-0 transition-transform duration-200 hover:scale-110 hover:border-[rgba(239,66,66,0.4)]"
              >
                <span className="font-nord text-[#ef4242] text-sm">
                  {client.name.slice(0, 2).toUpperCase()}
                </span>
              </Link>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Link
                  href={clientHref}
                  className="block font-nord text-sm tracking-wide text-white truncate group-hover:text-[#ef4242] transition-colors duration-200"
                >
                  {client.name}
                </Link>
                {client.isEmployer && (
                  <span className="shrink-0 text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm border border-sky-400/30 bg-sky-400/8 text-sky-400">
                    Employer
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/40 truncate mt-0.5">{client.roles[0]}</p>
            </div>
            <Link
              href={clientHref}
              className="shrink-0 text-white/15 group-hover:text-[#ef4242] transition-colors duration-200"
            >
              <ExternalLink size={12} />
            </Link>
          </div>

          {/* Bio */}
          {client.bio && (
            <p className="text-[11px] text-white/35 leading-relaxed mb-4 line-clamp-2">{client.bio}</p>
          )}

          {/* Social links */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {client.socialLinks.map((link) => {
              const config = platformConfig[link.platform];
              const Icon = config.icon;
              return (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2 py-1 rounded-sm bg-white/4 border border-white/8 hover:border-white/20 hover:bg-white/8 transition-all duration-200 group/link"
                  title={`${link.platform === "other" ? link.title ?? config.label : config.label}: ${link.handle ?? link.url}`}
                >
                  <Icon size={11} style={{ color: config.color }} className="shrink-0" />
                  <span className="text-[10px] text-white/40 group-hover/link:text-white/70 transition-colors">
                    {link.platform === "other"
                      ? link.title ?? config.label
                      : link.handle ?? config.label}
                  </span>
                </a>
              );
            })}
          </div>

          {typeof projectCount === "number" && (
            <div className="flex items-center justify-between text-[10px] text-white/25 mb-4">
              <span>{projectCount} project{projectCount !== 1 ? "s" : ""}</span>
            </div>
          )}

          {/* View profile link */}
          <div className="py-4 border-t border-white/6 mt-auto">
            <Link
              href={clientHref}
              className="inline-flex items-center justify-center gap-2 h-9 w-full min-w-0 px-4 border border-white/12 hover:border-[rgba(239,66,66,0.3)] text-[11px] text-white/40 hover:text-[#ef4242] tracking-wider uppercase transition-all duration-200 rounded-sm group/link"
            >
              View Profile
              <ArrowRight size={11} className="shrink-0 group-hover/link:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
