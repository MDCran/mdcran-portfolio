"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import type {
  StatusServiceWithHealth,
  StatusIncident,
  ServiceStatus,
  IncidentSeverity,
} from "@/lib/types";

// ─── Props ──────────────────────────────────────────────────────────────────

interface StatusPageProps {
  services: StatusServiceWithHealth[];
  activeIncidents: StatusIncident[];
  history: StatusIncident[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<ServiceStatus, string> = {
  operational: "#22c55e",
  partial_outage: "#eab308",
  major_outage: "#ef4444",
};

const STATUS_LABELS: Record<ServiceStatus, string> = {
  operational: "Operational",
  partial_outage: "Partial Outage",
  major_outage: "Major Outage",
};

const SEVERITY_COLORS: Record<IncidentSeverity, string> = {
  minor: "#eab308",
  major: "#f97316",
  critical: "#ef4444",
};

const SEVERITY_BG: Record<IncidentSeverity, string> = {
  minor: "rgba(234, 179, 8, 0.12)",
  major: "rgba(249, 115, 22, 0.12)",
  critical: "rgba(239, 68, 68, 0.12)",
};

const SEVERITY_BORDER: Record<IncidentSeverity, string> = {
  minor: "rgba(234, 179, 8, 0.3)",
  major: "rgba(249, 115, 22, 0.3)",
  critical: "rgba(239, 68, 68, 0.3)",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function worstSeverity(incidents: StatusIncident[]): IncidentSeverity {
  if (incidents.some((i) => i.severity === "critical")) return "critical";
  if (incidents.some((i) => i.severity === "major")) return "major";
  return "minor";
}

function formatDuration(startIso: string, endIso: string): string {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (ms < 0) return "0m";
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

// ─── Animation Variants ─────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function StatusPage({
  services,
  activeIncidents,
  history,
}: StatusPageProps) {
  const [latencies, setLatencies] = useState<Record<string, number | null>>({});
  const [hoveredDay, setHoveredDay] = useState<{
    serviceId: string;
    index: number;
  } | null>(null);

  // ── Client-side ping ──────────────────────────────────────────────────────

  const pingService = useCallback(async (id: string, url: string) => {
    try {
      const start = performance.now();
      await fetch(url, { method: "HEAD", mode: "no-cors", cache: "no-store" });
      const latency = Math.round(performance.now() - start);
      setLatencies((prev) => ({ ...prev, [id]: latency }));
    } catch {
      setLatencies((prev) => ({ ...prev, [id]: null }));
    }
  }, []);

  useEffect(() => {
    services.forEach((svc) => {
      if (svc.pingUrl) {
        pingService(svc.id, svc.pingUrl);
      }
    });
  }, [services, pingService]);

  // ── Derived state ─────────────────────────────────────────────────────────

  const hasActiveIncidents = activeIncidents.length > 0;
  const overallOperational = !hasActiveIncidents;
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  return (
    <section className="py-14 sm:py-16">
      <div className="content-container">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* ── Active Incident Banner ──────────────────────────── */}

          {hasActiveIncidents && (
            <motion.div variants={itemVariants}>
              {activeIncidents.map((incident) => {
                const color = SEVERITY_COLORS[incident.severity];
                const bg = SEVERITY_BG[incident.severity];
                const border = SEVERITY_BORDER[incident.severity];
                return (
                  <div
                    key={incident.id}
                    className="mb-3 rounded-lg p-5"
                    style={{
                      background: bg,
                      border: `1px solid ${border}`,
                    }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: color,
                          boxShadow: `0 0 8px ${color}`,
                          animation: "pulse 2s ease-in-out infinite",
                        }}
                      />
                      <h3
                        className="font-nord text-base tracking-wide"
                        style={{ color }}
                      >
                        {incident.title}
                      </h3>
                      <span
                        className="ml-auto text-[10px] font-medium uppercase tracking-widest rounded px-2 py-0.5"
                        style={{
                          color,
                          background: `${color}20`,
                          border: `1px solid ${color}40`,
                        }}
                      >
                        {incident.severity}
                      </span>
                    </div>
                    <p className="text-sm text-white/60 leading-relaxed">
                      {incident.message}
                    </p>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* ── Overall Status Banner ──────────────────────────── */}

          <motion.div
            variants={itemVariants}
            className="rounded-lg p-6"
            style={{
              background: overallOperational
                ? "rgba(34, 197, 94, 0.08)"
                : "rgba(239, 68, 68, 0.08)",
              border: `1px solid ${
                overallOperational
                  ? "rgba(34, 197, 94, 0.25)"
                  : "rgba(239, 68, 68, 0.25)"
              }`,
            }}
          >
            <div className="flex items-center gap-3">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{
                  backgroundColor: overallOperational ? "#22c55e" : "#ef4444",
                  boxShadow: `0 0 12px ${
                    overallOperational ? "#22c55e" : "#ef4444"
                  }`,
                }}
              />
              <h2
                className="font-nord text-xl tracking-wide"
                style={{
                  color: overallOperational ? "#22c55e" : "#ef4444",
                }}
              >
                {overallOperational
                  ? "All Systems Operational"
                  : "Some Systems Experiencing Issues"}
              </h2>
            </div>
          </motion.div>

          {/* ── Service List ───────────────────────────────────── */}

          <motion.div variants={itemVariants} className="space-y-4">
            {services.map((service) => {
              const statusColor = STATUS_COLORS[service.currentStatus];
              const statusLabel = STATUS_LABELS[service.currentStatus];
              const latency = latencies[service.id];

              // Pad dailyStatus to exactly 90 entries from the right (most recent)
              const days = service.dailyStatus.slice(-90);
              while (days.length < 90) {
                days.unshift({
                  date: "",
                  status: "operational" as ServiceStatus,
                  incidents: 0,
                });
              }

              return (
                <motion.div
                  key={service.id}
                  variants={itemVariants}
                  className="rounded-lg p-5"
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.07)",
                  }}
                >
                  {/* Service header row */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-white/90">
                      {service.name}
                    </span>
                    <div className="relative group" style={{ overflow: "visible" }}>
                      <span
                        className="inline-flex items-center gap-2 text-xs font-medium rounded-full px-3 py-1 cursor-default"
                        style={{
                          color: statusColor,
                          background: `${statusColor}15`,
                          border: `1px solid ${statusColor}30`,
                        }}
                      >
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: statusColor }}
                        />
                        {statusLabel}
                      </span>
                      {/* Latency tooltip */}
                      {service.pingUrl && (
                        <div className="absolute right-0 bottom-full mb-2 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <div
                            className="rounded px-3 py-1.5 text-[11px] text-white/80 whitespace-nowrap"
                            style={{
                              background: "#1a1a1a",
                              border: "1px solid rgba(255,255,255,0.1)",
                            }}
                          >
                            {latency === undefined
                              ? "Pinging..."
                              : latency !== null
                                ? `Latency: ${latency}ms`
                                : "Ping failed"}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Daily status blocks — full width */}
                  <div className="flex items-center gap-[2px] w-full">
                    {days.map((day, idx) => {
                      const blockColor = STATUS_COLORS[day.status];
                      const isHovered =
                        hoveredDay?.serviceId === service.id &&
                        hoveredDay?.index === idx;
                      return (
                        <div
                          key={idx}
                          className="relative flex-1 min-w-0"
                          onMouseEnter={() =>
                            setHoveredDay({ serviceId: service.id, index: idx })
                          }
                          onMouseLeave={() => setHoveredDay(null)}
                        >
                          <div
                            className="rounded-[2px] transition-all duration-150 w-full"
                            style={{
                              height: 28,
                              backgroundColor: blockColor,
                              opacity: isHovered ? 1 : 0.7,
                              transform: isHovered
                                ? "scaleY(1.15)"
                                : "scaleY(1)",
                            }}
                          />
                          {/* Day tooltip */}
                          {isHovered && day.date && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 pointer-events-none">
                              <div
                                className="rounded px-2.5 py-1 text-[10px] text-white/80 whitespace-nowrap"
                                style={{
                                  background: "#1a1a1a",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                }}
                              >
                                {formatDate(day.date)}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Uptime percentage */}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-white/30">90 days ago</span>
                    <span className="text-[11px] text-white/50">
                      {service.uptimePercent90d.toFixed(2)}% uptime
                    </span>
                    <span className="text-[11px] text-white/30">Today</span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* ── Incident History ───────────────────────────────── */}

          {sortedHistory.length > 0 && (
            <motion.div variants={itemVariants}>
              <h2 className="font-nord text-xl tracking-wide text-white/90 mb-6">
                Incident History
              </h2>

              <div className="relative pl-6">
                {/* Timeline line */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-px"
                  style={{
                    background:
                      "linear-gradient(to bottom, rgba(255,255,255,0.15), rgba(255,255,255,0.03))",
                  }}
                />

                <div className="space-y-6">
                  {sortedHistory.map((incident) => {
                    const color = SEVERITY_COLORS[incident.severity];
                    return (
                      <motion.div
                        key={incident.id}
                        variants={itemVariants}
                        className="relative"
                      >
                        {/* Timeline dot */}
                        <div
                          className="absolute -left-6 top-1.5 h-2.5 w-2.5 rounded-full -translate-x-1/2"
                          style={{
                            backgroundColor: color,
                            boxShadow: `0 0 6px ${color}60`,
                          }}
                        />

                        <div
                          className="rounded-lg p-4"
                          style={{
                            background: "rgba(255, 255, 255, 0.02)",
                            border: "1px solid rgba(255, 255, 255, 0.07)",
                          }}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h4 className="font-nord text-sm tracking-wide text-white/90">
                              {incident.title}
                            </h4>
                            <span
                              className="shrink-0 text-[10px] font-medium uppercase tracking-widest rounded px-2 py-0.5"
                              style={{
                                color,
                                background: `${color}15`,
                                border: `1px solid ${color}30`,
                              }}
                            >
                              {incident.severity}
                            </span>
                          </div>

                          <p className="text-sm text-white/50 leading-relaxed mb-3">
                            {incident.message}
                          </p>

                          <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/30">
                            <span>
                              Started:{" "}
                              <span className="text-white/50">
                                {formatDateTime(incident.startedAt)}
                              </span>
                            </span>
                            {incident.resolvedAt && (
                              <>
                                <span>
                                  Resolved:{" "}
                                  <span className="text-white/50">
                                    {formatDateTime(incident.resolvedAt)}
                                  </span>
                                </span>
                                <span>
                                  Duration:{" "}
                                  <span className="text-white/50">
                                    {formatDuration(incident.startedAt, incident.resolvedAt)}
                                  </span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
