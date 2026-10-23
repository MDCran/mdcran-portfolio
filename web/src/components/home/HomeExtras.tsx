"use client";
import { lazy, Suspense, useState } from "react";
const SpotifyWidget = lazy(() => import("./SpotifyWidget"));
const BibleWidget = lazy(() => import("./BibleWidget"));
const MapWidget = lazy(() => import("./MapWidget"));
const HomeAmbient = lazy(() => import("./HomeAmbient"));

export default function HomeExtras({ location }: { location?: string }) {
  const [open, setOpen] = useState(false);
  const [ambient, setAmbient] = useState(false);
  return <section className="content-container py-8 print:hidden" aria-label="Optional personal widgets">
    <div className="flex flex-wrap gap-3">
      <button aria-expanded={open} aria-controls="personal-widgets" onClick={() => setOpen(!open)} className="rounded-sm border border-white/25 px-4 py-3 text-sm">{open ? "Hide" : "Show"} music, personal note & map</button>
      <button aria-pressed={ambient} onClick={() => setAmbient(!ambient)} className="rounded-sm border border-white/25 px-4 py-3 text-sm">{ambient ? "Turn off" : "Turn on"} background effects</button>
    </div>
    <div id="personal-widgets">{open && <Suspense fallback={<p className="py-5 text-sm">Loading optional widgets…</p>}><div className="mt-5 grid gap-4 sm:grid-cols-3"><SpotifyWidget /><BibleWidget /><MapWidget location={location} /></div></Suspense>}</div>
    {ambient && <Suspense fallback={null}><HomeAmbient /></Suspense>}
  </section>;
}
