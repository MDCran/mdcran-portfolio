"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Pencil, Check, X, Trash2, Link2, GitMerge, Fingerprint } from "lucide-react";
import type { Identity } from "@/lib/types";
import IdentityDetail from "@/components/admin/IdentityDetail";
import IdentityPicker from "@/components/admin/IdentityPicker";
import { useConfirm } from "@/components/admin/ConfirmModal";

const SITE = "https://mdcran.com";

export default function IdentityProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { confirm, modal } = useConfirm();
  const [identities, setIdentities] = useState<Identity[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/identities");
      if (res.status === 401) { router.replace("/admin"); return; }
      const d = await res.json().catch(() => null);
      if (d?.identities) setIdentities(d.identities);
    } finally {
      setLoading(false);
    }
  }, [router]);
  useEffect(() => { load(); }, [load]);

  const identity = identities?.find((i) => i.id === id) ?? null;

  const rename = async () => {
    if (!editName.trim()) return;
    setBusy(true);
    await fetch("/api/admin/identities", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, name: editName.trim() }) });
    setEditing(false); await load(); setBusy(false);
  };
  const del = async () => {
    if (!(await confirm({ title: "Delete this identity?", body: "This permanently removes the identity record. Its sessions/messages stay in their own logs but won’t be tied here anymore.", confirmLabel: "Delete", danger: true }))) return;
    setBusy(true);
    await fetch("/api/admin/identities", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    router.push("/admin/dashboard#identities");
  };
  const mergeInto = async (targetId: string) => {
    const tgt = identities?.find((i) => i.id === targetId);
    if (!(await confirm({ title: `Merge into "${tgt?.name}"?`, body: `All of this identity’s devices and activity move into "${tgt?.name}", and this identity is deleted.`, confirmLabel: "Merge", danger: true }))) return;
    setBusy(true);
    await fetch("/api/admin/identities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "merge", targetId, sourceIds: [id] }) });
    router.push(`/admin/identities/${targetId}`);
  };
  const copyLink = () => {
    navigator.clipboard.writeText(`${SITE}/?identity=${id}`).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      <div className="mx-auto max-w-3xl px-5 py-6">
        <Link href="/admin/dashboard#identities" className="inline-flex items-center gap-1.5 text-xs text-white/45 hover:text-white">
          <ArrowLeft size={13} /> Back to Identities
        </Link>

        {loading ? (
          <div className="mt-10 flex items-center gap-2 text-sm text-white/40"><Loader2 size={14} className="animate-spin" /> Loading identity…</div>
        ) : !identity ? (
          <div className="mt-10 text-sm text-white/40">Identity not found. <Link href="/admin/dashboard#identities" className="text-[var(--cranberry)] hover:underline">Back to the list</Link>.</div>
        ) : (
          <>
            {/* Header */}
            <div className="mt-4 rounded-sm border border-white/8 bg-white/2 p-4">
              <div className="flex items-center gap-2.5">
                <Fingerprint size={18} className="text-[var(--cranberry)] shrink-0" />
                {editing ? (
                  <>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") rename(); if (e.key === "Escape") setEditing(false); }} className="h-9 flex-1 rounded-sm border border-white/15 bg-white/4 px-2 text-base text-white outline-none" autoFocus />
                    <button onClick={rename} className="text-emerald-400 hover:text-emerald-300 cursor-pointer"><Check size={17} /></button>
                    <button onClick={() => setEditing(false)} className="text-white/40 hover:text-white cursor-pointer"><X size={17} /></button>
                  </>
                ) : (
                  <>
                    <h1 className="font-nord text-lg text-white flex items-center gap-2">
                      {identity.name}
                      {identity.anonymous && <span className="rounded-sm bg-white/8 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/40">anon</span>}
                    </h1>
                    <span className="flex-1" />
                    <span className="text-[11px] text-white/30">{identity.devices.length} device{identity.devices.length === 1 ? "" : "s"}</span>
                    {(identities?.length ?? 0) > 1 && (
                      <IdentityPicker identities={identities ?? []} excludeId={id} onPick={mergeInto} label="Merge into" icon={<GitMerge size={11} />} accent />
                    )}
                    <button onClick={() => { setEditing(true); setEditName(identity.name); }} title="Rename" className="text-white/40 hover:text-white cursor-pointer"><Pencil size={14} /></button>
                    <button onClick={copyLink} title="Copy tracking link" className="text-white/40 hover:text-[var(--cranberry)] cursor-pointer">{copied ? <Check size={15} className="text-emerald-400" /> : <Link2 size={15} />}</button>
                    <button onClick={del} title="Delete identity" className="text-white/40 hover:text-[#ef4242] cursor-pointer"><Trash2 size={15} /></button>
                  </>
                )}
              </div>
              {busy && <div className="mt-2 flex items-center gap-2 text-[11px] text-white/40"><Loader2 size={12} className="animate-spin" /> Working…</div>}
            </div>

            {/* Everything tied to this identity, with deep-links into each admin section */}
            <div className="mt-4 rounded-sm border border-white/8 bg-black/20 p-4">
              <IdentityDetail id={id} allIdentities={identities ?? []} confirm={confirm} onMutate={load} />
            </div>
          </>
        )}
      </div>
      {modal}
    </div>
  );
}
