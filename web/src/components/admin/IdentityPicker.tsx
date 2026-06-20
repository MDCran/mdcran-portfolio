"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { Identity } from "@/lib/types";

/** Searchable/filterable identity picker popover. Pick a target identity (used to
 *  move a device to another identity, or to merge one identity into another). */
export default function IdentityPicker({ identities, excludeId, onPick, label, icon, accent }: {
  identities: Identity[];
  excludeId: string;
  onPick: (id: string) => void;
  label: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const list = identities
    .filter((o) => o.id !== excludeId)
    .filter((o) => {
      const s = q.trim().toLowerCase();
      return !s || o.name.toLowerCase().includes(s) || o.devices.some((d) => d.serial.includes(s) || (d.ip ?? "").includes(s));
    })
    .slice(0, 50);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setQ(""); }}
        className={`inline-flex items-center gap-1 h-6 px-1.5 rounded-sm border text-[10px] cursor-pointer transition-colors ${accent ? "border-[var(--cranberry)]/40 text-[var(--cranberry)] hover:bg-[var(--cranberry)]/10" : "border-white/10 text-white/55 hover:text-white hover:border-white/25"}`}
      >
        {icon} {label}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-60 rounded-sm border border-white/12 bg-[#0c0c0e] shadow-xl">
          <div className="flex items-center gap-1.5 border-b border-white/8 px-2">
            <Search size={11} className="text-white/30 shrink-0" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name / IP / serial…"
              className="h-8 w-full bg-transparent text-[11px] text-white outline-none placeholder:text-white/30"
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {list.length === 0 ? (
              <p className="px-2.5 py-2 text-[11px] text-white/30">No matching identities.</p>
            ) : list.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => { onPick(o.id); setOpen(false); setQ(""); }}
                className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-[11px] text-white/70 hover:bg-white/5"
              >
                <span className="flex-1 truncate">{o.name}</span>
                {o.anonymous && <span className="rounded-sm bg-white/8 px-1 text-[8px] uppercase tracking-wider text-white/40">anon</span>}
                <span className="text-[9px] text-white/25">{o.devices.length}d</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
