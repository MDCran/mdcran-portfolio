"use client";

import { useEffect, useState } from "react";
import { computeFingerprint, type Fingerprint } from "@/lib/device-fingerprint";
import { Loader2, Check, ChevronDown } from "lucide-react";

interface Suggestion { id: string; name: string }

export default function PersonalIdentity() {
  const [fp, setFp] = useState<Fingerprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState<string | null>(null);
  const [identityId, setIdentityId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [input, setInput] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);

  const resolve = async (fingerprint: Fingerprint) => {
    setLoading(true);
    try {
      const r = await fetch("/api/identity/resolve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serial: fingerprint.serial }) }).then((x) => x.json());
      if (r.recognized) { setName(r.name); setIdentityId(r.identityId); setEditing(false); }
      else { setName(null); setIdentityId(null); setEditing(true); }
      setSuggestions(Array.isArray(r.suggestions) ? r.suggestions : []);
    } catch { setEditing(true); } finally { setLoading(false); }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const f = await computeFingerprint();
      if (!active) return;
      setFp(f);
      await resolve(f);
    })();
    return () => { active = false; };
  }, []);

  // If this device was just bound via a ?identity=... tracking link, show the
  // name immediately (no refresh).
  useEffect(() => {
    const onClaimed = (e: Event) => {
      const d = (e as CustomEvent).detail as { name?: string; identityId?: string } | undefined;
      if (d?.name) { setName(d.name); setIdentityId(d.identityId ?? null); setEditing(false); setLoading(false); }
    };
    window.addEventListener("mdcran:identity-claimed", onClaimed);
    return () => window.removeEventListener("mdcran:identity-claimed", onClaimed);
  }, []);

  const claim = async (opts: { name?: string; identityId?: string }) => {
    if (!fp) return;
    setSaving(true);
    try {
      const r = await fetch("/api/identity/claim", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serial: fp.serial, ...opts, gpu: fp.gpu, screen: fp.screen, timezone: fp.timezone, language: fp.language, userAgent: fp.userAgent }),
      }).then((x) => x.json());
      if (r.name) { setName(r.name); setIdentityId(r.identityId); setEditing(false); setInput(""); }
    } finally { setSaving(false); setPickOpen(false); }
  };

  const notMe = async () => {
    if (!fp) return;
    try { await fetch("/api/identity/disown", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serial: fp.serial, identityId }) }); } catch { /* */ }
    setName(null); setIdentityId(null); setEditing(true);
    resolve(fp);
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-xs text-white/40"><Loader2 size={12} className="animate-spin" /> Identifying this device…</div>;
  }

  if (name && !editing) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-white/70">
          <Check size={13} className="text-emerald-400" />
          <span>You&apos;re recognized as <span className="text-white font-medium">{name}</span></span>
        </div>
        <button onClick={notMe} className="text-[11px] text-[var(--cranberry)] hover:underline cursor-pointer">Not me / change this</button>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {suggestions.length > 0 && (
        <div className="relative">
          <button onClick={() => setPickOpen((o) => !o)} className="w-full flex items-center justify-between gap-2 h-9 px-2.5 rounded-sm border border-white/10 bg-white/4 text-xs text-white/70 hover:border-white/25 cursor-pointer">
            <span>Are you one of these?</span>
            <ChevronDown size={14} className={`transition-transform ${pickOpen ? "rotate-180" : ""}`} />
          </button>
          {pickOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setPickOpen(false)} />
              <div className="absolute left-0 right-0 z-20 mt-1 max-h-44 overflow-y-auto rounded-sm border border-white/12 bg-[#0d0d0d] p-1 shadow-xl">
                {suggestions.map((s) => (
                  <button key={s.id} onClick={() => claim({ identityId: s.id })} className="w-full text-left px-2 py-1.5 rounded-sm text-xs text-white/70 hover:bg-white/5 hover:text-white cursor-pointer">
                    {s.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) claim({ name: input.trim() }); }}
          placeholder="Enter your name"
          className="flex-1 h-9 bg-white/4 border border-white/10 focus:border-[var(--cranberry)] rounded-sm px-2.5 text-xs text-white placeholder:text-white/30 outline-none"
        />
        <button
          onClick={() => input.trim() && claim({ name: input.trim() })}
          disabled={!input.trim() || saving}
          className="h-9 px-3 rounded-sm bg-[var(--cranberry)] text-[11px] uppercase tracking-wider disabled:opacity-40 cursor-pointer"
          style={{ color: "var(--on-accent, #fff)" }}
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : "Save"}
        </button>
      </div>
      <p className="text-[10px] text-white/25 leading-snug">Lets me greet you by name on future visits. Stored on this site only; nothing else about you is shown to others.</p>
    </div>
  );
}
