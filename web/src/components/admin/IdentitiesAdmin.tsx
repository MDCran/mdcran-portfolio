"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Trash2, Link2, GitMerge, Check, X, Pencil, Loader2, Fingerprint, UserPlus,
  Monitor, Smartphone, Tablet, ExternalLink, UserCheck, UserX,
} from "lucide-react";
import type { Identity } from "@/lib/types";
import IdentityPicker from "@/components/admin/IdentityPicker";
import { useConfirm } from "@/components/admin/ConfirmModal";

const SITE = "https://mdcran.com";

function DeviceIcon({ type }: { type?: string }) {
  if (type === "mobile") return <Smartphone size={12} className="text-white/35" />;
  if (type === "tablet") return <Tablet size={12} className="text-white/35" />;
  return <Monitor size={12} className="text-white/35" />;
}

export default function IdentitiesAdmin({ onOpenIdentity }: { onOpenIdentity?: (id: string) => void }) {
  const { confirm, modal } = useConfirm();
  const [identities, setIdentities] = useState<Identity[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [linkPath, setLinkPath] = useState("/");
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState("");
  const [search, setSearch] = useState("");

  const load = () => fetch("/api/admin/identities").then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.identities) setIdentities(d.identities); }).catch(() => {});
  useEffect(() => { load(); }, []);

  const rename = async (id: string) => {
    setBusy(true);
    await fetch("/api/admin/identities", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, name: editName }) });
    setEditing(null); await load(); setBusy(false);
  };
  const del = async (id: string, name: string) => {
    if (!(await confirm({ title: `Delete "${name}"?`, body: "This permanently removes the identity record.", confirmLabel: "Delete", danger: true }))) return;
    setBusy(true);
    await fetch("/api/admin/identities", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await load(); setBusy(false);
  };
  const merge = async () => {
    const ids = Array.from(selected);
    if (ids.length < 2) return;
    const targetId = ids[0];
    const targetName = identities?.find((i) => i.id === targetId)?.name ?? "the first one";
    if (!(await confirm({ title: `Merge ${ids.length} identities?`, body: `They all combine into "${targetName}"; the others are deleted and their devices + activity move over.`, confirmLabel: "Merge", danger: true }))) return;
    setBusy(true);
    await fetch("/api/admin/identities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "merge", targetId, sourceIds: ids.slice(1) }) });
    setSelected(new Set()); await load(); setBusy(false);
  };
  const mergeInto = async (sourceId: string, targetId: string) => {
    const src = identities?.find((i) => i.id === sourceId);
    const tgt = identities?.find((i) => i.id === targetId);
    if (!(await confirm({ title: `Merge "${src?.name}" into "${tgt?.name}"?`, body: `All of its devices and activity move over, and "${src?.name}" is deleted.`, confirmLabel: "Merge", danger: true }))) return;
    setBusy(true);
    await fetch("/api/admin/identities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "merge", targetId, sourceIds: [sourceId] }) });
    setSelected(new Set()); await load(); setBusy(false);
  };
  const copyLink = (id: string) => {
    const url = `${SITE}${linkPath.startsWith("/") ? linkPath : `/${linkPath}`}?identity=${id}`;
    navigator.clipboard.writeText(url).then(() => { setCopied(id); setTimeout(() => setCopied(null), 1500); }).catch(() => {});
  };
  const create = async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    const r = await fetch("/api/admin/identities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", name }) })
      .then((x) => (x.ok ? x.json() : null)).catch(() => null);
    setNewName("");
    await load();
    setBusy(false);
    if (r?.identity?.id) copyLink(r.identity.id);
  };
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  if (!identities) return <p className="text-xs text-white/30">Loading identities…</p>;

  const q = search.trim().toLowerCase();
  const shown = q ? identities.filter((i) => i.name.toLowerCase().includes(q) || i.devices.some((d) => (d.ip ?? "").includes(q) || d.serial.includes(q))) : identities;
  const identified = shown.filter((i) => !i.anonymous);
  const anonymous = shown.filter((i) => i.anonymous);

  const card = (idn: Identity) => {
    const latest = idn.devices.slice().sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())[0];
    return (
      <div key={idn.id} className={`rounded-sm border p-3.5 ${selected.has(idn.id) ? "border-[var(--cranberry)]/45 bg-[var(--cranberry)]/5" : "border-white/8 bg-white/2"}`}>
        <div className="flex items-center gap-2.5">
          <input type="checkbox" checked={selected.has(idn.id)} onChange={() => toggle(idn.id)} className="accent-[var(--cranberry)]" title="Select for merge" />
          {editing === idn.id ? (
            <>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") rename(idn.id); if (e.key === "Escape") setEditing(null); }} className="h-8 flex-1 rounded-sm border border-white/15 bg-white/4 px-2 text-sm text-white outline-none" autoFocus />
              <button onClick={() => rename(idn.id)} className="text-emerald-400 hover:text-emerald-300 cursor-pointer"><Check size={15} /></button>
              <button onClick={() => setEditing(null)} className="text-white/40 hover:text-white cursor-pointer"><X size={15} /></button>
            </>
          ) : (
            <>
              {onOpenIdentity ? (
                <button onClick={() => onOpenIdentity(idn.id)} className="text-sm text-white font-medium hover:text-[var(--cranberry)] truncate cursor-pointer" title="Open full profile">
                  {idn.name}
                </button>
              ) : (
                <Link href={`/admin/identities/${idn.id}`} className="text-sm text-white font-medium hover:text-[var(--cranberry)] truncate" title="Open full profile">
                  {idn.name}
                </Link>
              )}
              <span className="flex-1" />
              <span className="text-[10px] text-white/30">{idn.devices.length} device{idn.devices.length === 1 ? "" : "s"}</span>
              {identities.length > 1 && (
                <IdentityPicker identities={identities} excludeId={idn.id} onPick={(targetId) => mergeInto(idn.id, targetId)} label="Merge into" icon={<GitMerge size={11} />} accent />
              )}
              <button onClick={() => { setEditing(idn.id); setEditName(idn.name); }} title="Rename" className="text-white/40 hover:text-white cursor-pointer"><Pencil size={13} /></button>
              <button onClick={() => copyLink(idn.id)} title="Copy tracking link" className="text-white/40 hover:text-[var(--cranberry)] cursor-pointer">{copied === idn.id ? <Check size={14} className="text-emerald-400" /> : <Link2 size={14} />}</button>
              <button onClick={() => del(idn.id, idn.name)} title="Delete identity" className="text-white/40 hover:text-[#ef4242] cursor-pointer"><Trash2 size={14} /></button>
            </>
          )}
        </div>
        {/* Compact summary + link to the full profile page (everything lives there) */}
        <div className="mt-2 flex items-center gap-2 text-[11px] text-white/40">
          {latest && <DeviceIcon type={latest.device} />}
          {latest ? (
            <span className="truncate">{latest.browser} · {latest.os}{latest.ip ? ` · ${latest.ip}` : ""} · last seen {new Date(latest.lastSeen).toLocaleDateString()}</span>
          ) : (
            <span className="text-white/30">No devices yet (created link awaiting first visit).</span>
          )}
          {onOpenIdentity ? (
            <button onClick={() => onOpenIdentity(idn.id)} className="ml-auto inline-flex items-center gap-1 text-[var(--cranberry)]/80 hover:text-[var(--cranberry)] cursor-pointer">
              Open profile <ExternalLink size={11} />
            </button>
          ) : (
            <Link href={`/admin/identities/${idn.id}`} className="ml-auto inline-flex items-center gap-1 text-[var(--cranberry)]/80 hover:text-[var(--cranberry)]">
              Open profile <ExternalLink size={11} />
            </Link>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="font-nord text-base text-white flex items-center gap-2"><Fingerprint size={16} className="text-[var(--cranberry)]" /> Identities</p>
          <p className="text-xs text-white/35 mt-0.5">Every visitor is an identity (anonymous until named). Click a name to open its full profile. Tick 2+ then “Merge”, or use a card’s “Merge into” to combine two.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name / IP / serial" className="h-8 w-44 rounded-sm border border-white/10 bg-white/4 px-2 text-xs text-white outline-none focus:border-white/30" />
          <input value={linkPath} onChange={(e) => setLinkPath(e.target.value)} placeholder="/ (link target)" className="h-8 w-24 rounded-sm border border-white/10 bg-white/4 px-2 text-xs text-white outline-none focus:border-white/30" />
          {selected.size >= 2 && (
            <button onClick={merge} disabled={busy} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-sm border border-[var(--cranberry)]/40 text-[var(--cranberry)] text-[11px] hover:bg-[var(--cranberry)]/10 cursor-pointer">
              <GitMerge size={13} /> Merge {selected.size}
            </button>
          )}
        </div>
      </div>

      {/* Create a named identity, then copy its tracking link to hand out. */}
      <div className="flex items-center gap-2 rounded-sm border border-white/8 bg-white/2 p-2.5">
        <UserPlus size={15} className="text-[var(--cranberry)] ml-0.5" />
        <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") create(); }} placeholder='New identity name (e.g. "Michael")' className="h-8 flex-1 rounded-sm border border-white/10 bg-white/4 px-2 text-sm text-white outline-none focus:border-white/30" />
        <button onClick={create} disabled={busy || !newName.trim()} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-sm bg-[var(--cranberry)] text-white text-[11px] font-medium disabled:opacity-40 hover:opacity-90 cursor-pointer">
          <UserPlus size={13} /> Create & copy link
        </button>
      </div>

      {shown.length === 0 && <p className="text-xs text-white/30">No identities{q ? " match your search" : " yet"}.</p>}

      {/* Identified people */}
      {identified.length > 0 && (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] text-white/45"><UserCheck size={12} className="text-emerald-400/70" /> Identified ({identified.length})</p>
          <div className="space-y-2">{identified.map(card)}</div>
        </div>
      )}

      {/* Anonymous identities */}
      {anonymous.length > 0 && (
        <div className="space-y-2 pt-1">
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] text-white/45"><UserX size={12} className="text-white/40" /> Anonymous ({anonymous.length})</p>
          <div className="space-y-2">{anonymous.map(card)}</div>
        </div>
      )}

      {busy && <div className="flex items-center gap-2 text-xs text-white/40"><Loader2 size={12} className="animate-spin" /> Working…</div>}
      {modal}
    </div>
  );
}
