"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import type { SiteContent } from "@/lib/types";
import { answerKeys, getRizzConfig, questionLabels, rizzThemes, type RizzTheme } from "@/lib/rizz";

const input = "w-full rounded-xl border border-white/15 bg-black/30 px-3 py-3 text-base text-white";
const button = "min-h-11 rounded-xl border border-white/20 px-4 py-2 text-sm text-white disabled:opacity-50";

export default function RizzSettings({ content, onChange }: { content: SiteContent; onChange: Dispatch<SetStateAction<SiteContent>> }) {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [failed, setFailed] = useState(false);
  const config = getRizzConfig(content);
  function update(patch: Partial<SiteContent>) { setStatus(""); onChange(previous => ({ ...previous, ...patch })); }
  async function save() {
    setSaving(true); setStatus(""); setFailed(false);
    try {
      const response = await fetch("/api/admin/site-content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(content) });
      if (!response.ok) throw new Error("Couldn't save. Your changes are still here; please try again.");
      setStatus("Saved. Theme, answers, and page switches are up to date.");
    } catch (error) { setFailed(true); setStatus(error instanceof Error ? error.message : "Couldn't save. Please try again."); }
    finally { setSaving(false); }
  }
  return <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-6">
    <div className="mb-6"><h2 className="text-xl text-white">Make it their kind of cute</h2><p className="mt-2 text-sm text-white/60">Style the rizz page, tailor the questions, and manage your secret pages. Save below to apply changes.</p></div>
    <fieldset disabled={saving} className="space-y-6">
      <label className="flex min-h-12 items-center gap-3 text-sm text-white"><input type="checkbox" className="h-5 w-5 accent-rose-400" checked={content.rizzEnabled ?? false} onChange={event => update({ rizzEnabled: event.target.checked })} />Enable /rizz<span className="text-xs text-white/50">Off returns 404</span></label>
      <label className="block text-sm text-white/80">Made for<input className={`${input} mt-2`} maxLength={100} value={content.rizzTargetName ?? ""} placeholder="Their name (optional)" onChange={event => update({ rizzTargetName: event.target.value })} /></label>
      <fieldset><legend className="mb-3 text-sm text-white/80">Rizz page theme</legend><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{(Object.keys(rizzThemes) as RizzTheme[]).map(key => {
        const theme = rizzThemes[key];
        return <button type="button" key={key} aria-pressed={config.theme === key} onClick={() => update({ rizzTheme: key })} className="min-h-28 rounded-xl border p-4 text-left transition-colors" style={{ borderColor: config.theme === key ? theme.accent : "#ffffff20", background: config.theme === key ? `${theme.accent}15` : "transparent" }}><span className="mb-2 block text-2xl" style={{ color: theme.accent }}>{theme.icon}</span><strong className="block text-sm font-medium text-white">{theme.name}{config.theme === key ? " ✓" : ""}</strong><span className="mt-1 block text-xs leading-relaxed text-white/60">{theme.move}</span></button>;
      })}</div><p className="mt-3 text-xs leading-relaxed text-white/60">Pokémon changes /rizz itself: a collectible card, rival banter, and card-night choices. Monster Hunter brings co-op hunting energy. Every theme includes both game options.</p></fieldset>
      <label className="block text-sm text-white/80">Where they like to hang out<select className={`${input} mt-2`} value={config.setting} onChange={event => update({ rizzSetting: event.target.value as SiteContent["rizzSetting"] })}><option value="any">A little of everything</option><option value="indoors">Indoors — games, movies, cozy plans</option><option value="outdoors">Outdoors — walks, picnics, stargazing</option></select><span className="mt-2 block text-xs text-white/50">Filters the suggested plans independently of the visual theme.</span></label>
      <fieldset><legend className="mb-2 text-sm text-white/80">Allow typing into questions</legend><p className="mb-3 text-xs text-white/50">Guests can write their own answer or add a note to a selection. Turn off any question for tap-only answers.</p><div className="grid gap-2 sm:grid-cols-2">{answerKeys.map(key => <label key={key} className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 p-3 text-sm text-white/80"><input type="checkbox" className="h-5 w-5 accent-rose-400" checked={config.allowCustomAnswers[key]} onChange={event => update({ rizzAllowCustomAnswers: { ...config.allowCustomAnswers, [key]: event.target.checked } })} />{questionLabels[key]}</label>)}</div></fieldset>
      <div className="space-y-3 border-t border-white/10 pt-6"><h3 className="text-base text-white">Approved secret pages</h3><p className="text-xs text-white/60">Independent switches. Both start off, and disabled pages return 404. They are not added to public navigation.</p>
        {([{ key: "rivalCard", path: "/rival-card", name: "Rival Card", description: "A rare little card for your favorite Pokémon rival. Flip it to reveal a rematch invitation." }, { key: "pocketSunshine", path: "/pocket-sunshine", name: "Pocket Sunshine", description: "A tiny jar of kind words and random little adventures, tailored to indoor or outdoor preferences." }] as const).map(page => <div key={page.key} className="rounded-xl border border-white/10 p-4"><label className="flex min-h-11 items-center gap-3 text-sm text-white"><input type="checkbox" className="h-5 w-5 accent-rose-400" checked={content.secretPages?.[page.key] ?? false} onChange={event => update({ secretPages: { ...content.secretPages, [page.key]: event.target.checked } })} /><strong>{page.name}</strong><span className="ml-auto text-xs text-white/50">{content.secretPages?.[page.key] ? "On" : "Off"}</span></label><p className="my-2 text-xs leading-relaxed text-white/60">{page.description}</p><a className="inline-flex min-h-11 items-center text-xs text-rose-300 underline" href={page.path} target="_blank" rel="noreferrer">Open {page.path} ↗</a></div>)}
        <label className="block text-sm text-white/80">Your Pocket Sunshine notes <span className="text-xs text-white/50">(optional; one per line)</span><textarea className={`${input} mt-2`} rows={4} maxLength={6000} value={(content.secretPages?.sunshineNotes ?? []).join("\n")} onChange={event => update({ secretPages: { ...content.secretPages, sunshineNotes: event.target.value.split("\n") } })} placeholder={"You make ordinary days better.\nNext snack run is on me."} /><span className="mt-2 block text-xs text-white/50">Leave blank for the built-in sweet notes. Up to 20 notes, 300 characters each.</span></label>
      </div>
      <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={save} className={`${button} bg-rose-400/15`}>{saving ? "Saving…" : "Save rizz & secret pages"}</button><a className={`${button} inline-flex items-center`} href="/rizz" target="_blank" rel="noreferrer">Open /rizz ↗</a></div>
    </fieldset>
    {status && <p role={failed ? "alert" : "status"} className={`mt-4 text-sm ${failed ? "text-red-300" : "text-emerald-300"}`}>{status}</p>}
  </section>;
}
