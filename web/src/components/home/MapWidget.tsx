"use client";

import { MapPin } from "lucide-react";

export default function MapWidget({ location }: { location?: string }) {
  const label = location?.trim();
  if (!label) return null;

  return (
    <div data-highlight-id="location-map" className="flex min-h-40 flex-col justify-between rounded-sm border border-white/10 bg-gradient-to-br from-[var(--cranberry)]/10 to-black p-4">
      <MapPin size={24} className="text-[var(--cranberry)]" aria-hidden="true" />
      <div>
        <p className="text-xs text-white/60">Based in</p>
        <p className="mt-1 text-sm font-medium text-white">{label}</p>
        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs text-white/80 underline underline-offset-4">View area on map <span className="sr-only">(opens in a new tab)</span></a>
      </div>
    </div>
  );
}
