"use client";
import { useState } from "react";
const architectures: Record<string, { label: string; detail: string }[]> = {
  coretex: [
    {
      label: "Electron / Next.js",
      detail: "Desktop and web clients share the React application layer.",
    },
    {
      label: "TypeScript Brain",
      detail:
        "The Brain service connects agent work, integrations, and local operations.",
    },
    {
      label: "PostgreSQL / Prisma",
      detail:
        "The service persists data with PostgreSQL and Prisma; Docker supports local development.",
    },
  ],
  "health-tracker": [
    {
      label: "Next.js",
      detail: "The frontend presents a unified tracking dashboard and reports.",
    },
    {
      label: "Spring Boot API",
      detail:
        "The Java backend handles tracking, export, and integration services.",
    },
    {
      label: "PostgreSQL / Flyway",
      detail:
        "Relational data uses PostgreSQL with versioned Flyway migrations.",
    },
  ],
  "webdesign-portfolio": [
    {
      label: "Next.js / React",
      detail: "Server-rendered public pages and interactive browser features.",
    },
    {
      label: "API routes",
      detail:
        "Server-side routes connect managed content, streaming chat, and speech services.",
    },
    {
      label: "MongoDB / providers",
      detail:
        "MongoDB holds editable content; provider credentials stay server-side.",
    },
  ],
};
export default function ArchitectureDiagram({ slug }: { slug: string }) {
  const [selected, setSelected] = useState(0);
  const nodes = architectures[slug];
  if (!nodes) return null;
  return (
    <div className="mt-5 rounded-sm border border-white/15 p-4">
      <h4 className="text-sm font-semibold text-white">
        Architecture at a glance
      </h4>
      <p className="mt-1 text-xs text-white/50">
        Simplified from the public implementation notes. Select a component.
      </p>
      <div className="my-4 flex flex-wrap items-center gap-2">
        {nodes.map((n, i) => (
          <span key={n.label} className="contents">
            {i > 0 && (
              <span aria-hidden="true" className="text-white/40">
                →
              </span>
            )}
            <button
              aria-pressed={i === selected}
              onClick={() => setSelected(i)}
              className={`rounded-sm border px-3 py-2 text-xs ${i === selected ? "border-[var(--cranberry)] text-white" : "border-white/20 text-white/60"}`}
            >
              {n.label}
            </button>
          </span>
        ))}
      </div>
      <p className="text-sm text-white/70" aria-live="polite">
        {nodes[selected].detail}
      </p>
    </div>
  );
}
