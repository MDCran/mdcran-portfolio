"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Link2,
  Loader2,
  Check,
  X,
  User,
  MapPin,
  Zap,
} from "lucide-react";
import type { DeviceLinkCandidate, CrossDeviceAutoConfig } from "@/lib/types";

type State = "SUSPECTED" | "CONFIRMED" | "REJECTED";

const STATES: State[] = ["SUSPECTED", "CONFIRMED", "REJECTED"];

const BREAKDOWN: { key: keyof DeviceLinkCandidate["breakdown"]; label: string; max: number }[] = [
  { key: "network", label: "Network", max: 40 },
  { key: "time", label: "Time", max: 30 },
  { key: "behavior", label: "Behavior", max: 20 },
  { key: "hardware", label: "Hardware", max: 10 },
];

function serialShort(s: string) {
  return s.slice(0, 10) + "…";
}

function StateBadge({ state }: { state: State }) {
  if (state === "CONFIRMED")
    return (
      <span className="inline-flex items-center gap-1 text-emerald-400/80 text-[11px]">
        <Check size={11} /> Confirmed
      </span>
    );
  if (state === "REJECTED")
    return <span className="text-white/25 text-[11px]">Rejected</span>;
  return (
    <span className="inline-flex items-center h-5 px-1.5 rounded-full bg-[var(--cranberry)]/20 border border-[var(--cranberry)]/30 text-[10px] text-[var(--cranberry)] font-medium">
      Suspected
    </span>
  );
}

function Side({ serial, name }: { serial: string; name?: string | null }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5 text-white/70">
        <User size={12} className="text-white/30 shrink-0" />
        <span className="text-xs font-medium truncate">{name || "Anonymous"}</span>
      </div>
      <span className="mt-0.5 block font-mono text-[11px] text-white/40">
        {serialShort(serial)}
      </span>
    </div>
  );
}

function BreakdownBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] text-white/40">
        <span className="uppercase tracking-wider">{label}</span>
        <span className="tabular-nums text-white/50">
          {value}/{max}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full bg-[var(--cranberry)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function DeviceCandidates() {
  const [candidates, setCandidates] = useState<DeviceLinkCandidate[] | null>(null);
  const [filter, setFilter] = useState<State>("SUSPECTED");
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [cfg, setCfg] = useState<CrossDeviceAutoConfig | null>(null);
  const [savingCfg, setSavingCfg] = useState(false);

  const load = useCallback((state: State) => {
    setCandidates(null);
    fetch(`/api/admin/device-candidates?state=${state}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setCandidates(d?.candidates ?? []); if (d?.autoConfig) setCfg(d.autoConfig); })
      .catch(() => setCandidates([]));
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  const saveCfg = async (patch: Partial<CrossDeviceAutoConfig>) => {
    const next = { ...(cfg ?? { enabled: true, autoConfirmScore: 85, autoRejectStaleDays: 14 }), ...patch };
    setCfg(next);
    setSavingCfg(true);
    await fetch("/api/admin/device-candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set-config", ...next }),
    }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.autoConfig) setCfg(d.autoConfig); }).catch(() => {});
    setSavingCfg(false);
  };

  const act = async (id: string, action: "confirm" | "reject") => {
    setWorkingId(id);
    await fetch("/api/admin/device-candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id }),
    }).catch(() => {});
    setWorkingId(null);
    load(filter);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="font-nord text-base text-white flex items-center gap-2">
            <Link2 size={16} className="text-[var(--cranberry)]" />
            Cross-Device Candidates
          </p>
          <p className="text-xs text-white/35 mt-0.5">
            Probabilistically matched device pairs. With automation on, this runs
            itself — you only step in to override. Confirm links two devices into
            one identity; reject suppresses the pair.
          </p>
        </div>

        {/* State filter */}
        <div className="inline-flex rounded-sm border border-white/10 overflow-hidden">
          {STATES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`h-8 px-3 text-[11px] font-medium transition-colors ${
                filter === s
                  ? "bg-[var(--cranberry)] text-white"
                  : "text-white/45 hover:text-white hover:bg-white/5"
              }`}
            >
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Automation policy — the queue self-manages; this is the override. */}
      {cfg && (
        <div className="rounded-sm border border-white/8 bg-white/2 p-3.5 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={cfg.enabled} onChange={(e) => saveCfg({ enabled: e.target.checked })} className="accent-[var(--cranberry)]" />
            <Zap size={14} className="text-[var(--cranberry)]" />
            <span className="text-sm text-white">Auto-manage candidates</span>
            <span className="text-[11px] text-white/35">— high-confidence pairs auto-link, weak/stale ones auto-reject. You can still override any below.</span>
            {savingCfg && <Loader2 size={12} className="animate-spin text-white/30" />}
          </label>
          {cfg.enabled && (
            <div className="flex flex-wrap items-end gap-5 pl-6">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-white/40">Auto-confirm at ≥ {cfg.autoConfirmScore}/100</span>
                <input type="range" min={50} max={100} step={1} value={cfg.autoConfirmScore}
                  onChange={(e) => setCfg((c) => c ? { ...c, autoConfirmScore: Number(e.target.value) } : c)}
                  onPointerUp={(e) => saveCfg({ autoConfirmScore: Number((e.target as HTMLInputElement).value) })}
                  className="w-48 accent-[var(--cranberry)]" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-white/40">Auto-reject stale after</span>
                <div className="flex items-center gap-1.5">
                  <input type="number" min={0} max={365} value={cfg.autoRejectStaleDays}
                    onChange={(e) => setCfg((c) => c ? { ...c, autoRejectStaleDays: Number(e.target.value) } : c)}
                    onBlur={(e) => saveCfg({ autoRejectStaleDays: Number(e.target.value) })}
                    className="h-8 w-16 rounded-sm border border-white/10 bg-white/4 px-2 text-xs text-white outline-none focus:border-white/30" />
                  <span className="text-[11px] text-white/40">days {cfg.autoRejectStaleDays === 0 ? "(never)" : ""}</span>
                </div>
              </label>
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {candidates === null && (
        <p className="text-xs text-white/30 flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" /> Loading candidates…
        </p>
      )}

      {/* Empty */}
      {candidates !== null && candidates.length === 0 && (
        <p className="text-xs text-white/30">No candidates.</p>
      )}

      {/* Cards */}
      {candidates !== null && candidates.length > 0 && (
        <div className="space-y-3">
          {candidates.map((c) => {
            const busy = workingId === c.id;
            return (
              <div
                key={c.id}
                className="rounded-sm border border-white/8 bg-white/2 p-4"
              >
                {/* Top: the two sides + score */}
                <div className="flex items-center gap-3">
                  <Side serial={c.sourceSerial} name={c.sourceName} />
                  <Link2 size={14} className="text-white/25 shrink-0" />
                  <Side serial={c.targetSerial} name={c.targetName} />
                  <div className="shrink-0 text-right">
                    <span className="font-nord text-xl text-white tabular-nums">
                      {c.confidenceScore}
                      <span className="text-sm text-white/30">/100</span>
                    </span>
                    <div className="mt-0.5 flex items-center justify-end gap-1.5">
                      <StateBadge state={c.state} />
                      {c.resolvedBy === "auto" && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] uppercase tracking-wider text-white/35" title="Resolved automatically by the confidence policy">
                          <Zap size={8} /> auto
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4">
                  {BREAKDOWN.map((b) => (
                    <BreakdownBar
                      key={b.key}
                      label={b.label}
                      value={c.breakdown[b.key]}
                      max={b.max}
                    />
                  ))}
                </div>

                {/* Shared path */}
                {c.sharedPath && (
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-white/45">
                    <MapPin size={11} className="text-white/30" />
                    <span className="text-white/35">Shared path</span>
                    <code className="rounded bg-white/8 px-1 py-0.5 text-[10px] text-[var(--cranberry)]/90">
                      {c.sharedPath}
                    </code>
                  </div>
                )}

                {/* Criteria */}
                {c.criteria.length > 0 && (
                  <ul className="mt-3 space-y-0.5">
                    {c.criteria.map((cr, i) => (
                      <li
                        key={i}
                        className="text-[11px] text-white/40 flex items-start gap-1.5"
                      >
                        <span className="text-white/20 leading-relaxed">•</span>
                        <span className="leading-relaxed">{cr}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Actions */}
                {c.state === "SUSPECTED" && (
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => act(c.id, "confirm")}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-sm bg-[var(--cranberry)] text-xs text-white font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
                    >
                      {busy ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Check size={13} />
                      )}
                      Confirm link
                    </button>
                    <button
                      onClick={() => act(c.id, "reject")}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-sm border border-white/12 text-xs text-white/60 hover:text-white hover:border-white/25 disabled:opacity-40 transition-colors"
                    >
                      <X size={13} /> Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
