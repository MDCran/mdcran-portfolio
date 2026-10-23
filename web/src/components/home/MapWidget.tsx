"use client";

import { MapPin } from "lucide-react";

export default function MapWidget({ location }: { location?: string }) {
  const label = location?.trim();
  if (!label) return null;

  return (
    <div data-highlight-id="location-map" className="flex min-h-40 flex-col overflow-hidden rounded-sm border border-white/10 bg-black">
      <iframe
        title={`Map of ${label}`}
        src={`https://maps.google.com/maps?q=${encodeURIComponent(label)}&z=11&output=embed`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="min-h-40 w-full flex-1 border-0"
      />
      <div className="flex items-start gap-2 border-t border-white/10 p-3">
        <MapPin size={16} className="mt-0.5 shrink-0 text-[var(--cranberry)]" aria-hidden="true" />
        <div>
          <p className="text-xs font-medium text-white">{label}</p>
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-white/80 underline underline-offset-4">View area on map <span className="sr-only">(opens in a new tab)</span></a>
        </div>
      </div>
    </div>
  );
}
