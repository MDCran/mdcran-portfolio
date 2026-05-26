"use client";

import React from "react";
import { MapPin } from "lucide-react";
import { assetUrl } from "@/lib/utils";

export default function MapWidget() {
  return (
    <div
      data-highlight-id="location-map"
      className="relative overflow-hidden rounded-sm border group transition-all duration-300"
      style={{
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: '#0a0a0a',
        minHeight: '160px',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
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
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.9), rgba(10,10,10,0.3) 50%, transparent)' }}
      />

      {/* Content */}
      <div className="relative z-10 p-4 flex flex-col h-full justify-end" style={{ minHeight: "160px" }}>
        {/* Pin dot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-[#ef4242] shadow-[0_0_15px_rgba(239,66,66,0.8)] animate-[hero-map-pin_2s_ease-in-out_infinite]" />
            <div className="absolute inset-0 rounded-full bg-[#ef4242] opacity-40 scale-150 animate-ping" />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-auto">
          <MapPin size={13} className="text-[#ef4242] shrink-0" />
          <div>
            <div className="text-xs font-medium" style={{ color: '#fff' }}>Orlando, FL</div>
            <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>OPEN FOR WORK</div>
          </div>
        </div>
      </div>
    </div>
  );
}
