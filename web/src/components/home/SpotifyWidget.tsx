"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Music2, ExternalLink, Pause, Play } from "lucide-react";
import useSWR from "swr";
import type { SpotifyTrack } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function SpotifyWidget() {
  const { data, isLoading } = useSWR<SpotifyTrack>("/api/spotify", fetcher, {
    refreshInterval: 30_000, // refresh every 30s
  });

  const progress =
    data?.progressMs && data?.durationMs
      ? (data.progressMs / data.durationMs) * 100
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-sm border border-white/8 bg-white/3 backdrop-blur-xl p-4 group hover:border-white/15 transition-all duration-300"
    >
      {/* Spotify green accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-[#1db954] via-[#1db954]/50 to-transparent" />

      <div className="flex items-center gap-2 mb-3">
        <Music2 size={12} className="text-[#1db954]" />
        <span className="text-[10px] tracking-widest uppercase text-white/30">
          {isLoading ? "Loading..." : data?.isPlaying ? "Now Playing" : "Last Played"}
        </span>
        {data?.isPlaying && (
          <span className="ml-auto flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-0.5 bg-[#1db954] rounded-full"
                animate={{ height: ["4px", "12px", "4px"] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-white/8 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-white/8 rounded animate-pulse w-3/4" />
            <div className="h-2 bg-white/6 rounded animate-pulse w-1/2" />
          </div>
        </div>
      ) : data?.title ? (
        <div className="flex items-center gap-3">
          {data.albumArt && (
            <div className="relative w-10 h-10 rounded-sm overflow-hidden shrink-0">
              <Image src={data.albumArt} alt={data.albumName ?? ""} fill className="object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs text-white font-medium truncate">{data.title}</div>
            <div className="text-[11px] text-white/40 truncate">{data.artist}</div>
          </div>
          {data.songUrl && (
            <a
              href={data.songUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-white/20 hover:text-[#1db954] transition-colors"
            >
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-white/25">
          <Pause size={12} />
          <span>Not playing</span>
        </div>
      )}

      {/* Progress bar */}
      {data?.isPlaying && progress > 0 && (
        <div className="mt-3 h-0.5 bg-white/8 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#1db954] rounded-full"
            initial={{ width: `${progress}%` }}
            animate={{ width: `${progress}%` }}
          />
        </div>
      )}
    </motion.div>
  );
}
