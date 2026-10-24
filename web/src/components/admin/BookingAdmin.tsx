"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Save, Loader2, CalendarClock, Check } from "lucide-react";
import { adminRequest } from "@/lib/admin-client";
import { bookingTimezoneValid } from "@/lib/admin-mutation";
import DatePicker from "@/components/shared/DatePicker";
import type { BookingConfig, BookingMeetingType, BookingRecord } from "@/lib/types";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const LOCATION_OPTIONS = ["Google Meet", "Zoom", "Phone Call", "In-Person"];
const input = "h-9 rounded-sm border border-white/10 bg-white/4 px-2.5 text-xs text-white outline-none focus:border-[var(--cranberry,#ef4242)]";
const label = "text-[10px] uppercase tracking-[0.15em] text-white/40";
const card = "rounded-sm border border-white/8 bg-white/2 p-5 space-y-4";

function uid() { try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; } }

export default function BookingAdmin() {
  const [config, setConfig] = useState<BookingConfig | null>(null);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // Raw text drafts for the durations inputs so commas can be typed freely.
  const [durationDrafts, setDurationDrafts] = useState<Record<string, string>>({});

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await adminRequest<{ config: BookingConfig; bookings: BookingRecord[] }>("/api/admin/booking", { signal });
      if (!data.config || !Array.isArray(data.bookings)) throw new Error("Booking settings returned an invalid response.");
      setConfig(data.config); setBookings(data.bookings); setError("");
    } catch (cause) { if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "Could not load booking settings."); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);

  const save = async () => {
    if (!config || saving) return;
    if (!bookingTimezoneValid(config.timezone)) { setError("Enter a valid timezone, such as America/New_York, before saving."); return; }
    setSaving(true); setSaved(false); setError("");
    try {
      const result = await adminRequest<{ config: BookingConfig }>("/api/admin/booking", { method: "PUT", body: JSON.stringify(config) });
      if (!result.config) throw new Error("Save response was incomplete. Reload to confirm the saved settings before retrying.");
      setConfig(current => current === config ? result.config : current);
      setSaved(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save. Your changes are still here."); }
    finally { setSaving(false); }
  };

  if (!config) return <div className="space-y-2 text-sm"><p role={error ? "alert" : "status"}>{error || "Loading booking settings…"}</p>{!loading && <button className="underline" onClick={() => { setLoading(true); void load(); }}>Retry</button>}</div>;
  const displayTimezone = bookingTimezoneValid(config.timezone) ? config.timezone : "UTC";

  const patch = (p: Partial<BookingConfig>) => { setSaved(false); setConfig((c) => (c ? { ...c, ...p } : c)); };
  const setHour = (i: number, p: Partial<BookingConfig["hours"][number]>) =>
    setConfig((c) => c ? { ...c, hours: c.hours.map((h, idx) => idx === i ? { ...h, ...p } : h) } : c);
  const setType = (id: string, p: Partial<BookingMeetingType>) =>
    setConfig((c) => c ? { ...c, meetingTypes: c.meetingTypes.map((t) => t.id === id ? { ...t, ...p } : t) } : c);

  const addType = () => patch({ meetingTypes: [...config.meetingTypes, { id: uid(), name: "", description: "", location: "Google Meet", durations: [30], enabled: true }] });
  const addBlackout = () => patch({ blackouts: [...config.blackouts, { start: "", end: "", label: "" }] });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-60">
          <p className="font-nord text-base text-white flex items-center gap-2"><CalendarClock size={16} className="text-[var(--cranberry,#ef4242)]" /> Meeting Booking</p>
          <p className="text-xs text-white/35 mt-0.5">Calendar-backed booking shown on the Contact page&apos;s &quot;Book a Meeting&quot; tab.</p>
        </div>
        <button onClick={save} disabled={saving} className="inline-flex shrink-0 items-center gap-2 h-9 whitespace-nowrap px-4 rounded-sm bg-[var(--cranberry,#ef4242)] text-white text-xs uppercase tracking-wider hover:bg-[#dd3030] disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
          {saved ? "Saved" : "Save"}
        </button>
      </div>

      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      {saved && <p role="status" className="text-sm text-emerald-300">Booking settings saved.</p>}
      <fieldset disabled={saving} className="space-y-5" onChange={() => setSaved(false)}>
      {/* General */}
      <div className={card}>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={config.enabled} onChange={(e) => patch({ enabled: e.target.checked })} className="accent-[var(--cranberry,#ef4242)]" />
          <span className="text-sm text-white">Enable booking</span>
          <span className="text-xs text-white/35">— shows the &quot;Book a Meeting&quot; tab publicly</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className={label}>iCal feed URL (private — never shown to visitors)</span>
            <input className={input} value={config.icalUrl} onChange={(e) => patch({ icalUrl: e.target.value })} placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" />
          </label>
          <label className="flex flex-col gap-1">
            <span className={label}>Timezone (IANA)</span>
            <input className={input} value={config.timezone} onChange={(e) => patch({ timezone: e.target.value })} placeholder="America/New_York" />
          </label>
        </div>
        <p className="text-[11px] text-white/30">Availability uses your calendar&apos;s free/busy: events marked busy block out those times. Use the private <code className="text-white/50">basic.ics</code> link so private events count.</p>
      </div>

      {/* Business hours */}
      <div className={card}>
        <p className="text-sm text-white">Business hours</p>
        <div className="space-y-1.5">
          {config.hours.map((h, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:flex items-center gap-3">
              <label className="col-span-3 flex sm:w-32 items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={h.enabled} onChange={(e) => setHour(i, { enabled: e.target.checked })} className="accent-[var(--cranberry,#ef4242)]" />
                <span className="text-xs text-white/70">{DAY_NAMES[i]}</span>
              </label>
              <input aria-label={`${DAY_NAMES[i]} opening time`} type="time" disabled={!h.enabled} value={h.start} onChange={(e) => setHour(i, { start: e.target.value })} className={`${input} min-w-0 w-full sm:w-28 disabled:opacity-40`} />
              <span className="text-white/30 text-xs">to</span>
              <input aria-label={`${DAY_NAMES[i]} closing time`} type="time" disabled={!h.enabled} value={h.end} onChange={(e) => setHour(i, { end: e.target.value })} className={`${input} min-w-0 w-full sm:w-28 disabled:opacity-40`} />
            </div>
          ))}
        </div>
        <label className="flex items-center gap-2 cursor-pointer pt-1">
          <input type="checkbox" checked={config.blockHolidays} onChange={(e) => patch({ blockHolidays: e.target.checked })} className="accent-[var(--cranberry,#ef4242)]" />
          <span className="text-xs text-white/70">Block US federal holidays</span>
        </label>
      </div>

      {/* Rules */}
      <div className={card}>
        <p className="text-sm text-white">Scheduling rules</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {([
            ["minNoticeDays", "Min notice (days out)"],
            ["maxAdvanceDays", "Max book-out (days)"],
            ["maxPerDay", "Max meetings / day"],
            ["bufferMinutes", "Buffer between (min)"],
            ["slotIntervalMinutes", "Slot interval (min)"],
          ] as [keyof BookingConfig, string][]).map(([key, lbl]) => (
            <label key={key} className="flex flex-col gap-1">
              <span className={label}>{lbl}</span>
              <input type="number" min={0} className={input} value={config[key] as number} onChange={(e) => patch({ [key]: Math.max(0, Number(e.target.value) || 0) } as Partial<BookingConfig>)} />
            </label>
          ))}
        </div>
      </div>

      {/* Blackouts */}
      <div className={card}>
        <div className="flex items-center justify-between">
          <p className="text-sm text-white">Blackout / vacation dates</p>
          <button onClick={addBlackout} className="inline-flex items-center gap-1.5 text-xs text-[var(--cranberry,#ef4242)] hover:text-white"><Plus size={13} /> Add range</button>
        </div>
        {config.blackouts.length === 0 && <p className="text-[11px] text-white/30">No blackout ranges.</p>}
        <div className="space-y-2">
          {config.blackouts.map((b, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <div className="w-44"><DatePicker value={b.start} onChange={(v) => patch({ blackouts: config.blackouts.map((x, idx) => idx === i ? { ...x, start: v } : x) })} placeholder="Start" /></div>
              <span className="text-white/30 text-xs">to</span>
              <div className="w-44"><DatePicker value={b.end} onChange={(v) => patch({ blackouts: config.blackouts.map((x, idx) => idx === i ? { ...x, end: v } : x) })} placeholder="End" /></div>
              <input className={`${input} flex-1 min-w-[120px]`} value={b.label ?? ""} onChange={(e) => patch({ blackouts: config.blackouts.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x) })} placeholder="Label (e.g. Vacation)" />
              <button onClick={() => patch({ blackouts: config.blackouts.filter((_, idx) => idx !== i) })} className="text-white/30 hover:text-[#ef4242]"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Meeting types */}
      <div className={card}>
        <div className="flex items-center justify-between">
          <p className="text-sm text-white">Meeting types</p>
          <button onClick={addType} className="inline-flex items-center gap-1.5 text-xs text-[var(--cranberry,#ef4242)] hover:text-white"><Plus size={13} /> Add type</button>
        </div>
        {config.meetingTypes.length === 0 && <p className="text-[11px] text-white/30">No meeting types yet — add one (e.g. Consultation).</p>}
        <div className="space-y-3">
          {config.meetingTypes.map((t) => (
            <div key={t.id} className="rounded-sm border border-white/8 bg-white/2 p-3 space-y-2.5">
              <div className="flex items-center gap-2">
                <input className={`${input} flex-1 min-w-0`} value={t.name} onChange={(e) => setType(t.id, { name: e.target.value })} placeholder="Name (e.g. Consultation)" />
                <label className="flex items-center gap-1.5 text-[11px] text-white/55 cursor-pointer whitespace-nowrap">
                  <input type="checkbox" checked={t.enabled} onChange={(e) => setType(t.id, { enabled: e.target.checked })} className="accent-[var(--cranberry,#ef4242)]" /> Enabled
                </label>
                <button onClick={() => patch({ meetingTypes: config.meetingTypes.filter((x) => x.id !== t.id) })} className="text-white/30 hover:text-[#ef4242]"><Trash2 size={14} /></button>
              </div>
              <input className={`${input} w-full`} value={t.description ?? ""} onChange={(e) => setType(t.id, { description: e.target.value })} placeholder="Short description" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className={label}>Location</span>
                  <input className={input} list="booking-locations" value={t.location} onChange={(e) => setType(t.id, { location: e.target.value })} placeholder="Google Meet" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={label}>Durations (minutes, comma-separated)</span>
                  <input
                    className={input}
                    value={durationDrafts[t.id] ?? t.durations.join(", ")}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setDurationDrafts((d) => ({ ...d, [t.id]: raw }));
                      setType(t.id, { durations: raw.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => Number.isFinite(n) && n > 0) });
                    }}
                    onBlur={() => setDurationDrafts((d) => { const n = { ...d }; delete n[t.id]; return n; })}
                    placeholder="30, 60"
                    inputMode="numeric"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
        <datalist id="booking-locations">{LOCATION_OPTIONS.map((l) => <option key={l} value={l} />)}</datalist>
      </div>

      {/* Bookings list */}
      <div className={card}>
        <p className="text-sm text-white mb-1">Booked meetings <span className="text-white/30 text-xs">({bookings.length})</span></p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-white/30 text-[10px] uppercase tracking-wider text-left"><th className="py-1.5 font-normal">When</th><th className="font-normal">Type</th><th className="font-normal">Name</th><th className="font-normal">Contact</th><th className="font-normal">Location</th></tr></thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-t border-white/5">
                  <td className="py-1.5 text-white/70">{new Date(b.start).toLocaleString("en-US", { timeZone: displayTimezone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} <span className="text-white/30">({b.durationMinutes}m)</span></td>
                  <td className="text-white/50">{b.typeName}</td>
                  <td className="text-white/50">{b.name}</td>
                  <td className="text-white/40">{b.email}{b.phone ? ` · ${b.phone}` : ""}</td>
                  <td className="text-white/40">{b.location}</td>
                </tr>
              ))}
              {bookings.length === 0 && <tr><td colSpan={5} className="py-3 text-white/25">No bookings yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      </fieldset>
    </div>
  );
}
