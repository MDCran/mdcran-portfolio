"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, Loader2, Clock, MapPin, CalendarDays, ChevronRight } from "lucide-react";
import { isValidEmail, isValidPhoneNumber } from "@/lib/contact-validation";

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

  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "", consent: false });
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
        if (ds.length) setActiveDay(ds[0].date);
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
      const res = await fetch("/api/booking/book", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typeId: type.id, duration, start: slot.start, ...form }),
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
          ) : (
            <div className="space-y-4">
              {/* Day selector */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {days.map((d) => (
                  <button key={d.date} type="button" onClick={() => { setActiveDay(d.date); setSlot(null); }}
                    className={`shrink-0 px-3 py-2 rounded-sm border text-xs transition-colors ${activeDay === d.date ? "border-[#ef4242]/50 bg-[#ef4242]/10 text-white" : "border-white/10 text-white/50 hover:text-white"}`}>
                    {d.label}
                  </button>
                ))}
              </div>
              {/* Slots */}
              {activeDayObj && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {activeDayObj.slots.map((s) => (
                    <button key={s.start} type="button" onClick={() => setSlot(s)}
                      className={`py-2 rounded-sm border text-xs transition-colors ${slot?.start === s.start ? "border-[#ef4242] bg-[#ef4242] text-white" : "border-white/10 text-white/70 hover:border-white/30"}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
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
              <input className={fieldCls} placeholder="Name *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              <input className={fieldCls} type="email" placeholder="Email *" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
            </div>
            <input className={fieldCls} type="tel" placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            <textarea className={`${fieldCls} h-auto py-3 resize-none`} rows={4} placeholder="What would you like to talk about?" value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />

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

            <button type="submit" disabled={status === "sending"}
              className="w-full h-12 flex items-center justify-center gap-2 bg-[#ef4242] text-white text-sm tracking-wider uppercase rounded-sm hover:bg-[#dd3030] transition-all shadow-[0_0_20px_rgba(239,66,66,0.3)] hover:shadow-[0_0_30px_rgba(239,66,66,0.5)] disabled:opacity-40 disabled:cursor-not-allowed">
              {status === "sending" ? <><Loader2 size={16} className="animate-spin" /> Booking…</> : <><CalendarDays size={15} /> Confirm Booking</>}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
