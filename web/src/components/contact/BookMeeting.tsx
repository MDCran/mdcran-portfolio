"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, Loader2, Clock, MapPin, CalendarDays, ChevronRight, ChevronLeft } from "lucide-react";
import { isValidEmail, isValidPhoneNumber, formatPhoneInput } from "@/lib/contact-validation";
import { computeFingerprint } from "@/lib/device-fingerprint";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface PublicMeetingType { id: string; name: string; description: string; location: string; durations: number[] }
interface PublicConfig { enabled: boolean; timezone: string; minNoticeDays: number; maxAdvanceDays: number; meetingTypes: PublicMeetingType[] }
interface DaySlots { date: string; label: string; slots: { start: string; label: string }[] }

const fieldCls = "w-full h-11 bg-white/4 border border-white/8 focus:border-[#ef4242] rounded-sm px-4 text-sm text-white placeholder:text-white/25 outline-none transition-colors";

function durationLabel(min: number) {
  if (min % 60 === 0) return `${min / 60} hr`;
  if (min > 60) return `${Math.floor(min / 60)} hr ${min % 60} min`;
  return `${min} min`;
}

export default function BookMeeting() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const [type, setType] = useState<PublicMeetingType | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [days, setDays] = useState<DaySlots[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<{ start: string; label: string } | null>(null);
  const [tz, setTz] = useState("America/New_York");

  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "", consent: false });
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; phone?: string }>({});
  const [viewMonth, setViewMonth] = useState<{ y: number; m: number } | null>(null); // calendar month being shown
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<{ start: string; typeName: string; location: string } | null>(null);

  useEffect(() => {
    fetch("/api/booking/config").then((r) => (r.ok ? r.json() : null)).then((d: PublicConfig | null) => {
      setConfig(d);
      if (d?.timezone) setTz(d.timezone);
    }).catch(() => setConfig(null)).finally(() => setLoadingConfig(false));
  }, []);

  // When a type+duration is chosen, fetch availability.
  useEffect(() => {
    if (!type || duration == null) { setDays(null); return; }
    setLoadingSlots(true);
    setDays(null); setActiveDay(null); setSlot(null);
    fetch(`/api/booking/availability?typeId=${encodeURIComponent(type.id)}&duration=${duration}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.timezone) setTz(d.timezone);
        const ds: DaySlots[] = Array.isArray(d?.days) ? d.days : [];
        setDays(ds);
        setActiveDay(null);
        if (ds.length) {
          const [yy, mm] = ds[0].date.split("-").map(Number);
          setViewMonth({ y: yy, m: mm });
        }
      })
      .catch(() => setDays([]))
      .finally(() => setLoadingSlots(false));
  }, [type, duration]);

  const chooseType = (t: PublicMeetingType) => {
    setType(t);
    setDuration(t.durations.length === 1 ? t.durations[0] : null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || duration == null || !slot) return;
    if (!form.name.trim()) { setStatus("error"); setError("Please enter your name."); return; }
    if (!isValidEmail(form.email.trim())) { setStatus("error"); setError("Please enter a valid email."); return; }
    if (form.phone.trim() && !isValidPhoneNumber(form.phone.trim())) { setStatus("error"); setError("Please enter a valid phone number."); return; }
    if (!form.consent) { setStatus("error"); setError("Please agree to the terms."); return; }

    setStatus("sending"); setError("");
    try {
      const fp = await computeFingerprint().catch(() => null);
      const res = await fetch("/api/booking/book", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typeId: type.id, duration, start: slot.start, ...form, serial: fp?.serial }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setConfirmed({ start: slot.start, typeName: type.name, location: type.location });
        setStatus("success");
      } else {
        setStatus("error");
        setError(data?.error || "Couldn't book that time. Please try another.");
        if (res.status === 409) { setSlot(null); /* refresh availability */ setDuration((d) => d); }
      }
    } catch {
      setStatus("error"); setError("Something went wrong. Please try again.");
    }
  };

  // NOTE: all hooks must run before any early return (Rules of Hooks).
  const availableDates = useMemo(() => new Set((days ?? []).map((d) => d.date)), [days]);
  // First/last available months bound the calendar's prev/next navigation.
  const monthBounds = useMemo(() => {
    if (!days || days.length === 0) return null;
    const first = days[0].date, last = days[days.length - 1].date;
    return { first: { y: +first.slice(0, 4), m: +first.slice(5, 7) }, last: { y: +last.slice(0, 4), m: +last.slice(5, 7) } };
  }, [days]);
  const monthKey = (y: number, m: number) => y * 12 + (m - 1);

  if (loadingConfig) return <div className="flex items-center gap-2 text-sm text-white/40 py-10"><Loader2 size={16} className="animate-spin" /> Loading availability…</div>;

  if (!config?.enabled || config.meetingTypes.length === 0) {
    return (
      <div className="rounded-sm border border-white/8 bg-white/2 p-8 text-center">
        <CalendarDays size={28} className="mx-auto text-white/30 mb-3" />
        <p className="text-sm text-white/60">Online booking isn&apos;t available right now.</p>
        <p className="text-xs text-white/35 mt-1">Use the Contact tab to reach out and we&apos;ll find a time.</p>
      </div>
    );
  }

  // Success screen
  if (status === "success" && confirmed) {
    const when = new Date(confirmed.start).toLocaleString("en-US", { timeZone: tz, weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex items-start gap-3 p-6 rounded-sm border border-green-500/25 bg-green-500/8">
        <CheckCircle size={20} className="text-green-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-green-300 font-medium">You&apos;re booked!</p>
          <p className="text-xs text-white/60 mt-1.5">{confirmed.typeName} · {when} ({tz.replace("_", " ")})</p>
          <p className="text-xs text-white/40 mt-0.5">Location: {confirmed.location}. A confirmation will follow by email.</p>
        </div>
      </motion.div>
    );
  }

  const activeDayObj = days?.find((d) => d.date === activeDay);

  return (
    <div className="space-y-8">
      {/* Step 1 — meeting type */}
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/40 mb-3">1 · Choose a meeting</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {config.meetingTypes.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => chooseType(t)}
              className={`text-left rounded-sm border p-4 transition-all ${type?.id === t.id ? "border-[#ef4242]/50 bg-[#ef4242]/8" : "border-white/8 bg-white/2 hover:border-white/20"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-white font-medium">{t.name}</span>
                <ChevronRight size={14} className={type?.id === t.id ? "text-[#ef4242]" : "text-white/25"} />
              </div>
              {t.description && <p className="text-xs text-white/45 mt-1 leading-relaxed line-clamp-2">{t.description}</p>}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-white/40">
                <span className="inline-flex items-center gap-1"><MapPin size={11} /> {t.location}</span>
                <span className="inline-flex items-center gap-1"><Clock size={11} /> {t.durations.map(durationLabel).join(" / ")}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2 — duration (only if multiple) */}
      {type && type.durations.length > 1 && (
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/40 mb-3">2 · Duration</p>
          <div className="flex flex-wrap gap-2">
            {type.durations.map((d) => (
              <button key={d} type="button" onClick={() => setDuration(d)}
                className={`px-4 py-2 rounded-sm border text-xs transition-colors ${duration === d ? "border-[#ef4242]/50 bg-[#ef4242]/10 text-[#ef4242]" : "border-white/10 text-white/55 hover:text-white"}`}>
                {durationLabel(d)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3 — date + time */}
      {type && duration != null && (
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/40 mb-3">{type.durations.length > 1 ? "3" : "2"} · Pick a time <span className="text-white/25 normal-case tracking-normal">({tz.replace("_", " ")})</span></p>
          {loadingSlots ? (
            <div className="flex items-center gap-2 text-sm text-white/40 py-6"><Loader2 size={16} className="animate-spin" /> Finding open times…</div>
          ) : !days || days.length === 0 ? (
            <p className="text-sm text-white/40 py-4">No open times in the next {config.maxAdvanceDays} days. Try the Contact tab instead.</p>
          ) : viewMonth && monthBounds ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Calendar */}
              <div className="rounded-sm border border-white/8 bg-white/2 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    disabled={monthKey(viewMonth.y, viewMonth.m) <= monthKey(monthBounds.first.y, monthBounds.first.m)}
                    onClick={() => setViewMonth((v) => { if (!v) return v; const d = new Date(v.y, v.m - 2, 1); return { y: d.getFullYear(), m: d.getMonth() + 1 }; })}
                    className="flex h-7 w-7 items-center justify-center rounded-sm text-white/55 hover:bg-white/10 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed"
                    aria-label="Previous month"
                  ><ChevronLeft size={15} /></button>
                  <span className="text-sm text-white">{MONTHS[viewMonth.m - 1]} {viewMonth.y}</span>
                  <button
                    type="button"
                    disabled={monthKey(viewMonth.y, viewMonth.m) >= monthKey(monthBounds.last.y, monthBounds.last.m)}
                    onClick={() => setViewMonth((v) => { if (!v) return v; const d = new Date(v.y, v.m, 1); return { y: d.getFullYear(), m: d.getMonth() + 1 }; })}
                    className="flex h-7 w-7 items-center justify-center rounded-sm text-white/55 hover:bg-white/10 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed"
                    aria-label="Next month"
                  ><ChevronRight size={15} /></button>
                </div>
                <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-white/30">
                  {DOW.map((d) => <div key={d} className="py-1">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {(() => {
                    const firstDow = new Date(viewMonth.y, viewMonth.m - 1, 1).getDay();
                    const daysInMonth = new Date(viewMonth.y, viewMonth.m, 0).getDate();
                    const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
                    return cells.map((day, i) => {
                      if (day === null) return <div key={`b${i}`} />;
                      const dateStr = `${viewMonth.y}-${String(viewMonth.m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const avail = availableDates.has(dateStr);
                      const isSel = activeDay === dateStr;
                      return (
                        <button
                          key={day}
                          type="button"
                          disabled={!avail}
                          onClick={() => { setActiveDay(dateStr); setSlot(null); }}
                          className={`flex h-9 items-center justify-center rounded-sm text-xs transition-colors ${
                            isSel ? "bg-[#ef4242] text-white font-semibold"
                              : avail ? "text-white hover:bg-white/10" : "text-white/20 cursor-not-allowed"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Time slots for the chosen day */}
              <div className="rounded-sm border border-white/8 bg-white/2 p-4">
                {!activeDayObj ? (
                  <p className="text-sm text-white/35 py-6 text-center">Pick a highlighted day to see open times.</p>
                ) : (
                  <>
                    <p className="text-xs text-white/45 mb-3">{activeDayObj.label}</p>
                    <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                      {activeDayObj.slots.map((s) => (
                        <button key={s.start} type="button" onClick={() => setSlot(s)}
                          className={`py-2 rounded-sm border text-xs transition-colors ${slot?.start === s.start ? "border-[#ef4242] bg-[#ef4242] text-white" : "border-white/10 text-white/70 hover:border-white/30"}`}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Step 4 — details */}
      <AnimatePresence>
        {slot && (
          <motion.form
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            onSubmit={submit} className="space-y-4 border-t border-white/8 pt-6"
          >
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Your details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-white/40 tracking-wider uppercase mb-2">Name <span className="text-[#ef4242]">*</span></label>
                <input className={fieldCls} placeholder="Your name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-[11px] text-white/40 tracking-wider uppercase mb-2">Email <span className="text-[#ef4242]">*</span></label>
                <input
                  className={fieldErrors.email ? `${fieldCls} !border-[#ef4242]/60` : fieldCls}
                  type="email"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={(e) => { setForm((f) => ({ ...f, email: e.target.value })); if (fieldErrors.email) setFieldErrors((fe) => ({ ...fe, email: undefined })); }}
                  onBlur={() => { const v = form.email.trim(); if (v && !isValidEmail(v)) setFieldErrors((fe) => ({ ...fe, email: "Enter a valid email." })); else setFieldErrors((fe) => ({ ...fe, email: undefined })); }}
                  required
                />
                {fieldErrors.email && <p className="mt-1.5 text-[11px] text-[#ef8a8a]">{fieldErrors.email}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-white/40 tracking-wider uppercase mb-2">Phone</label>
                <input
                  className={fieldErrors.phone ? `${fieldCls} !border-[#ef4242]/60` : fieldCls}
                  type="tel"
                  placeholder="(555) 000-0000"
                  value={form.phone}
                  onChange={(e) => { setForm((f) => ({ ...f, phone: formatPhoneInput(e.target.value) })); if (fieldErrors.phone) setFieldErrors((fe) => ({ ...fe, phone: undefined })); }}
                  onBlur={() => { const v = form.phone.trim(); if (v && !isValidPhoneNumber(v)) setFieldErrors((fe) => ({ ...fe, phone: "Enter a valid phone number." })); else setFieldErrors((fe) => ({ ...fe, phone: undefined })); }}
                />
                {fieldErrors.phone && <p className="mt-1.5 text-[11px] text-[#ef8a8a]">{fieldErrors.phone}</p>}
              </div>
              <div>
                <label className="block text-[11px] text-white/40 tracking-wider uppercase mb-2">Subject</label>
                <input className={fieldCls} placeholder="What is this about?" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-white/40 tracking-wider uppercase mb-2">Message</label>
              <textarea className={`${fieldCls} h-auto py-3 resize-none`} rows={4} placeholder="Anything you'd like me to know before the meeting?" value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
            </div>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative shrink-0 mt-0.5">
                <input type="checkbox" required checked={form.consent} onChange={(e) => setForm((f) => ({ ...f, consent: e.target.checked }))} className="sr-only" />
                <div className={`w-4 h-4 rounded-sm border transition-all flex items-center justify-center ${form.consent ? "bg-[#ef4242] border-[#ef4242]" : "bg-white/4 border-white/15 group-hover:border-white/30"}`}>
                  {form.consent && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </div>
              </div>
              <span className="text-xs text-white/40 leading-relaxed">
                I agree that MDCran may contact me about this meeting and accept the{" "}
                <Link href="/terms" className="text-white/70 underline underline-offset-2 hover:text-[#ef4242]">Terms</Link> and{" "}
                <Link href="/privacy" className="text-white/70 underline underline-offset-2 hover:text-[#ef4242]">Privacy Policy</Link>. <span className="text-[#ef4242]">*</span>
              </span>
            </label>

            {status === "error" && (
              <div className="flex items-center gap-2 text-xs text-[#ef8a8a]"><AlertCircle size={13} /> {error}</div>
            )}

            {slot && type && (
              <p className="text-xs text-white/45">
                Booking <span className="text-white/75">{type.name}</span> · {new Date(slot.start).toLocaleString("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} ({tz.replace("_", " ")})
              </p>
            )}
            <button type="submit" disabled={status === "sending"}
              className="w-full h-12 flex items-center justify-center gap-2 bg-[#ef4242] text-white text-sm tracking-wider uppercase rounded-sm hover:bg-[#dd3030] transition-all shadow-[0_0_20px_rgba(239,66,66,0.3)] hover:shadow-[0_0_30px_rgba(239,66,66,0.5)] disabled:opacity-40 disabled:cursor-not-allowed">
              {status === "sending" ? <><Loader2 size={16} className="animate-spin" /> Booking…</> : <><CalendarDays size={15} /> Book</>}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
