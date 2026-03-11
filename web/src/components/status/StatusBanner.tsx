"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import type { StatusIncident, IncidentSeverity } from "@/lib/types";

const SEVERITY_COLORS: Record<IncidentSeverity, string> = {
  minor: "#eab308",
  major: "#f97316",
  critical: "#ef4444",
};

const SEVERITY_BG: Record<IncidentSeverity, string> = {
  minor: "rgba(234, 179, 8, 0.10)",
  major: "rgba(249, 115, 22, 0.10)",
  critical: "rgba(239, 68, 68, 0.10)",
};

export default function StatusBanner() {
  const [incidents, setIncidents] = useState<StatusIncident[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/status", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && Array.isArray(data.activeIncidents) && data.activeIncidents.length > 0) {
          setIncidents(data.activeIncidents);
        }
      } catch {
        /* silent */
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (dismissed || incidents.length === 0) return null;

  // Use worst severity for banner color
  const worstSeverity: IncidentSeverity = incidents.some((i) => i.severity === "critical")
    ? "critical"
    : incidents.some((i) => i.severity === "major")
      ? "major"
      : "minor";

  const color = SEVERITY_COLORS[worstSeverity];
  const bg = SEVERITY_BG[worstSeverity];
  const label = incidents.length === 1
    ? incidents[0].title
    : `${incidents.length} active incidents`;
  const description = incidents.length === 1
    ? incidents[0].message
    : incidents.map((i) => i.title).join(" · ");

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-[60]"
        style={{ background: bg, borderBottom: `1px solid ${color}30` }}
      >
        <div className="content-container flex items-center gap-3 py-2.5 text-sm">
          <AlertTriangle size={14} style={{ color, flexShrink: 0 }} />
          <span style={{ color }} className="font-medium text-[12px] uppercase tracking-wider shrink-0">
            {worstSeverity === "critical" ? "Outage" : worstSeverity === "major" ? "Degraded" : "Notice"}
          </span>
          <span className="text-white/70 text-[13px] truncate flex-1">
            {label}{description && description !== label ? ` — ${description}` : ""}
          </span>
          <Link
            href="/status"
            className="shrink-0 text-[11px] uppercase tracking-wider px-3 py-1 rounded-sm border transition-colors"
            style={{ color, borderColor: `${color}40`, background: `${color}10` }}
          >
            Details
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="shrink-0 p-1 rounded-sm text-white/30 hover:text-white/60 transition-colors"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
