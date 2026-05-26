"use client";

import { useEffect, useState } from "react";
import { Trash2, Link2, GitMerge, Check, X, Pencil, Loader2, Fingerprint } from "lucide-react";
import type { Identity } from "@/lib/types";

const SITE = "https://mdcran.com";

export default function IdentitiesAdmin() {
  const [identities, setIdentities] = useState<Identity[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [linkPath, setLinkPath] = useState("/");
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => fetch("/api/admin/identities").then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.identities) setIdentities(d.identities); }).catch(() => {});
  useEffect(() => { load(); }, []);

  const rename = async (id: string) => {
    setBusy(true);
    await fetch("/api/admin/identities", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, name: editName }) });
    setEditing(null); await load(); setBusy(false);
  };
  const del = async (id: string) => {
    if (!confirm("Delete this identity permanently?")) return;
    setBusy(true);
    await fetch("/api/admin/identities", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await load(); setBusy(false);
  };
  const removeDevice = async (id: string, serial: string) => {
    setBusy(true);
    await fetch("/api/admin/identities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "remove-device", id, serial }) });
    await load(); setBusy(false);
  };
  const merge = async () => {
    const ids = Array.from(selected);
    if (ids.length < 2) return;
    const targetId = ids[0];
    if (!confirm(`Merge ${ids.length} identities into "${identities?.find((i) => i.id === targetId)?.name}"?`)) return;
    setBusy(true);
    await fetch("/api/admin/identities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "merge", targetId, sourceIds: ids.slice(1) }) });
    setSelected(new Set()); await load(); setBusy(false);
  };
  const copyLink = (id: string) => {
    const url = `${SITE}${linkPath.startsWith("/") ? linkPath : `/${linkPath}`}?identity=${id}`;
    navigator.clipboard.writeText(url).then(() => { setCopied(id); setTimeout(() => setCopied(null), 1500); }).catch(() => {});
  };
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  if (!identities) return <p className="text-xs text-white/30">Loading identities…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="font-nord text-base text-white flex items-center gap-2"><Fingerprint size={16} className="text-[var(--cranberry)]" /> Identities</p>
          <p className="text-xs text-white/35 mt-0.5">Recognized visitors by device fingerprint. Select 2+ to merge.</p>
        </div>
        <div className="flex items-center gap-2">
          <input value={linkPath} onChange={(e) => setLinkPath(e.target.value)} placeholder="/ (link target path)" className="h-8 w-40 rounded-sm border border-white/10 bg-white/4 px-2 text-xs text-white outline-none focus:border-white/30" />
          {selected.size >= 2 && (
            <button onClick={merge} disabled={busy} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-sm border border-[var(--cranberry)]/40 text-[var(--cranberry)] text-[11px] hover:bg-[var(--cranberry)]/10">
              <GitMerge size={13} /> Merge {selected.size}
            </button>
          )}
        </div>
      </div>

      {identities.length === 0 && <p className="text-xs text-white/30">No identities yet.</p>}

      <div className="space-y-3">
        {identities.map((idn) => (
          <div key={idn.id} className={`rounded-sm border p-4 ${selected.has(idn.id) ? "border-[var(--cranberry)]/45 bg-[var(--cranberry)]/5" : "border-white/8 bg-white/2"}`}>
            <div className="flex items-center gap-2.5 mb-2.5">
              <input type="checkbox" checked={selected.has(idn.id)} onChange={() => toggle(idn.id)} className="accent-[var(--cranberry)]" />
              {editing === idn.id ? (
                <>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 flex-1 rounded-sm border border-white/15 bg-white/4 px-2 text-sm text-white outline-none" autoFocus />
                  <button onClick={() => rename(idn.id)} className="text-emerald-400 hover:text-emerald-300"><Check size={15} /></button>
                  <button onClick={() => setEditing(null)} className="text-white/40 hover:text-white"><X size={15} /></button>
                </>
              ) : (
                <>
                  <span className="text-sm text-white font-medium flex-1">{idn.name}</span>
                  <span className="text-[10px] text-white/30">{idn.devices.length} device{idn.devices.length === 1 ? "" : "s"}</span>
                  <button onClick={() => { setEditing(idn.id); setEditName(idn.name); }} title="Rename" className="text-white/40 hover:text-white"><Pencil size={13} /></button>
                  <button onClick={() => copyLink(idn.id)} title="Copy tracking link" className="text-white/40 hover:text-[var(--cranberry)]">{copied === idn.id ? <Check size={14} className="text-emerald-400" /> : <Link2 size={14} />}</button>
                  <button onClick={() => del(idn.id)} title="Delete identity" className="text-white/40 hover:text-[#ef4242]"><Trash2 size={14} /></button>
                </>
              )}
            </div>
            <div className="space-y-1.5">
              {idn.devices.map((d) => (
                <div key={d.serial} className="flex items-center gap-2 rounded-sm border border-white/6 bg-white/[0.02] px-2.5 py-1.5 text-[11px]">
                  <span className="font-mono text-white/40">{d.serial.slice(0, 10)}…</span>
                  <span className="text-white/45 font-mono">{d.ip ?? "—"}</span>
                  <span className="text-white/40">{d.browser} · {d.os} · {d.device}</span>
                  {d.gpu && <span className="text-white/30 truncate max-w-[180px]" title={d.gpu}>{d.gpu}</span>}
                  <span className="text-white/25 ml-auto">{new Date(d.lastSeen).toLocaleDateString()}</span>
                  {idn.devices.length > 1 && (
                    <button onClick={() => removeDevice(idn.id, d.serial)} title="Remove device" className="text-white/30 hover:text-[#ef4242]"><X size={12} /></button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {busy && <div className="flex items-center gap-2 text-xs text-white/40"><Loader2 size={12} className="animate-spin" /> Working…</div>}
    </div>
  );
}
