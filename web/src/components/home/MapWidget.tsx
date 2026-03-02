"use client";

import React from "react";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { assetUrl } from "@/lib/utils";

export default function MapWidget() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-sm border border-white/8 bg-white/3 backdrop-blur-xl group hover:border-white/15 transition-all duration-300"
      style={{ minHeight: "160px" }}
    >
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-[#ef4242] via-[#ef4242]/50 to-transparent z-10" />

      {/* Static Orlando map image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={assetUrl("/cdn/WEB_ASSETS/MAP/orlando-map.png")}
        alt="Orlando, FL"
        className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity duration-300"
        style={{ filter: "saturate(0.5) brightness(0.6)" }}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/90 via-[#0a0a0a]/30 to-transparent" />

      {/* Content */}
      <div className="relative z-10 p-4 flex flex-col h-full justify-end" style={{ minHeight: "160px" }}>
        {/* Pin dot */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-[#ef4242] shadow-[0_0_15px_rgba(239,66,66,0.8)]" />
            <div className="absolute inset-0 rounded-full bg-[#ef4242] opacity-40 scale-150 animate-ping" />
          </div>
        </motion.div>

        <div className="flex items-center gap-2 mt-auto">
          <MapPin size={13} className="text-[#ef4242] shrink-0" />
          <div>
            <div className="text-xs text-white font-medium">Orlando, FL</div>
            <div className="text-[10px] text-white/40">OPEN FOR WORK</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
