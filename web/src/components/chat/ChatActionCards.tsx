"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Check, Calendar, Send } from "lucide-react";
import { computeFingerprint } from "@/lib/device-fingerprint";
import { formatPhoneInput } from "@/lib/contact-validation";

/* Shared field/data shapes the AI fills in conversationally. */
export interface ContactData {
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
  consent?: boolean;
}
export interface BookingData extends ContactData {
  date?: string; // "YYYY-MM-DD" preferred day, if the user named one
  time?: string; // free-text preferred time, e.g. "3pm"
}

const cardStyle: React.CSSProperties = {
  border: "1px solid color-mix(in srgb, var(--theme-primary, #ef4242) 25%, transparent)",
  background: "color-mix(in srgb, var(--theme-primary, #ef4242) 5%, rgba(0,0,0,0.25))",
};
const inputCls =
  "w-full rounded-sm border border-white/12 bg-black/30 px-2.5 py-1.5 text-[12px] text-white/85 placeholder:text-white/30 outline-none focus:border-white/30 font-jb";
const labelCls = "text-[9px] uppercase tracking-[0.16em] text-white/40 mb-1 block";

function Field({ label, value, onChange, placeholder, type = "text", textarea }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {textarea ? (
        <textarea className={inputCls} rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input className={inputCls} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </label>
  );
}

function ConsentRow({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-start gap-2 text-left cursor-pointer">
      <span
        className="mt-[1px] flex h-4 w-4 flex-none items-center justify-center rounded-[3px] border"
        style={{ borderColor: checked ? "var(--theme-primary, #ef4242)" : "rgba(255,255,255,0.25)", background: checked ? "var(--theme-primary, #ef4242)" : "transparent" }}
      >
        {checked && <Check size={11} className="text-white" />}
      </span>
      <span className="text-[11px] leading-snug text-white/55">I consent to being contacted about my inquiry.</span>
    </button>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function phoneOk(p: string) {
  if (!p.trim()) return true;
  if (!/^\+?[\d\s().-]+$/.test(p)) return false;
  const digits = p.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 && !/^(\d)\1+$/.test(digits);
}

/* ───────────────────────── Contact card ───────────────────────── */
export function ChatContactCard({ data }: { data: ContactData }) {
  const [name, setName] = useState(data.name ?? "");
  const [email, setEmail] = useState(data.email ?? "");
  const [phone, setPhone] = useState(data.phone ?? "");
  const [subject, setSubject] = useState(data.subject ?? "");
  const [message, setMessage] = useState(data.message ?? "");
  const [consent, setConsent] = useState(Boolean(data.consent));
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    if (!name.trim() || !message.trim()) return setErr("Name and message are required.");
    if (!email.trim() && !phone.trim()) return setErr("Add an email or a phone number.");
    if (email.trim() && !EMAIL_RE.test(email.trim())) return setErr("That email doesn't look right.");
    if (!phoneOk(phone)) return setErr("That phone number doesn't look right.");
    if (!consent) return setErr("Please check the consent box first.");
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined,
          subject: subject.trim() || undefined, message: message.trim(), consent: true,
          submissionId: (crypto.randomUUID?.() ?? String(Date.now())),
        }),
      });
      const j = await res.json().catch(() => null);
      if (res.ok && j?.success) setStatus("done");
      else { setStatus("error"); setErr(j?.error || "Couldn't send that — try the contact page."); }
    } catch { setStatus("error"); setErr("Network error — please try again."); }
  };

  if (status === "done") {
    return (
      <div className="mt-2 rounded-sm px-3 py-2.5 text-[12px] text-white/80 font-jb" style={cardStyle}>
        <div className="flex items-center gap-2"><Check size={14} style={{ color: "var(--theme-primary, #ef4242)" }} /> Message sent — Michael will get back to you. Thanks!</div>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-sm p-3 space-y-2 font-jb" style={cardStyle}>
      <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--theme-primary, #ef4242)" }}>Send a message</div>
      <Field label="Name" value={name} onChange={setName} placeholder="Your name" />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Email" value={email} onChange={setEmail} placeholder="you@email.com" type="email" />
        <Field label="Phone (optional)" value={phone} onChange={(v) => setPhone(formatPhoneInput(v))} placeholder="(555) 123-4567" type="tel" />
      </div>
      <Field label="Subject (optional)" value={subject} onChange={setSubject} placeholder="What's this about?" />
      <Field label="Message" value={message} onChange={setMessage} placeholder="Your message" textarea />
      <ConsentRow checked={consent} onChange={setConsent} />
      {err && <p className="text-[11px] text-red-400">{err}</p>}
      <button
        type="button" onClick={submit} disabled={status === "sending"}
        className="w-full flex items-center justify-center gap-2 rounded-sm py-2 text-[12px] font-medium text-white transition-opacity disabled:opacity-60 cursor-pointer"
        style={{ background: "var(--theme-primary, #ef4242)" }}
      >
        {status === "sending" ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />}
        {status === "sending" ? "Sending…" : "Send message"}
      </button>
    </div>
  );
}

/* ───────────────────────── Booking card ───────────────────────── */
interface Slot { start: string; label: string }
interface Day { date: string; label: string; slots: Slot[] }
interface MeetingType { id: string; name: string; description: string; location: string; durations: number[] }

export function ChatBookingCard({ data }: { data: BookingData }) {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [type, setType] = useState<MeetingType | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [activeDate, setActiveDate] = useState<string>("");
  const [slot, setSlot] = useState<Slot | null>(null);

  const [name, setName] = useState(data.name ?? "");
  const [email, setEmail] = useState(data.email ?? "");
  const [phone, setPhone] = useState(data.phone ?? "");
  const [subject, setSubject] = useState(data.subject ?? "");
  const [message, setMessage] = useState(data.message ?? "");
  const [consent, setConsent] = useState(Boolean(data.consent));
  const [status, setStatus] = useState<"idle" | "booking" | "done" | "error">("idle");
  const [err, setErr] = useState("");
  const [confirmed, setConfirmed] = useState<{ label: string; location: string } | null>(null);

  // Load config → first enabled type + duration → availability.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const cfg = await fetch("/api/booking/config").then((r) => r.json());
        if (!active) return;
        if (!cfg?.enabled || !cfg.meetingTypes?.length) { setEnabled(false); setLoading(false); return; }
        const t: MeetingType = cfg.meetingTypes[0];
        const d: number = t.durations?.[0] ?? 30;
        setType(t); setDuration(d);
        const av = await fetch(`/api/booking/availability?typeId=${encodeURIComponent(t.id)}&duration=${d}`).then((r) => r.json());
        if (!active) return;
        const dayList: Day[] = av?.days ?? [];
        setDays(dayList);
        // Prefer the day the user asked for; else first day with slots.
        const preferred = data.date && dayList.find((x) => x.date === data.date && x.slots.length);
        const firstOpen = dayList.find((x) => x.slots.length);
        const chosen = preferred || firstOpen;
        if (chosen) {
          setActiveDate(chosen.date);
          // Try to match the requested time loosely (e.g. "3" or "3pm" → "3:00 PM").
          const want = (data.time ?? "").toLowerCase().replace(/[^\dapm]/g, "");
          const match = want ? chosen.slots.find((s) => s.label.toLowerCase().replace(/[^\dapm]/g, "").startsWith(want)) : null;
          if (match) setSlot(match);
        }
        setLoading(false);
      } catch { if (active) { setEnabled(false); setLoading(false); } }
    })();
    return () => { active = false; };
  }, [data.date, data.time]);

  const book = async () => {
    setErr("");
    if (!type || !duration || !slot) return setErr("Pick a time slot first.");
    if (!name.trim()) return setErr("Name is required.");
    if (!EMAIL_RE.test(email.trim())) return setErr("A valid email is required.");
    if (!phoneOk(phone)) return setErr("That phone number doesn't look right.");
    if (!consent) return setErr("Please check the consent box first.");
    setStatus("booking");
    try {
      const fp = await computeFingerprint().catch(() => null);
      const res = await fetch("/api/booking/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          typeId: type.id, duration, start: slot.start,
          name: name.trim(), email: email.trim(), phone: phone.trim() || undefined,
          subject: subject.trim() || undefined, message: message.trim() || undefined, consent: true,
          serial: fp?.serial,
        }),
      });
      const j = await res.json().catch(() => null);
      if (res.ok && j?.success) {
        const d = new Date(j.booking.start);
        setConfirmed({ label: d.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }), location: j.booking.location || "" });
        setStatus("done");
      } else { setStatus("error"); setErr(j?.error || "Couldn't book that — try the booking page."); }
    } catch { setStatus("error"); setErr("Network error — please try again."); }
  };

  if (loading) return <div className="mt-2 rounded-sm px-3 py-2.5 text-[12px] text-white/55 font-jb flex items-center gap-2" style={cardStyle}><Loader2 size={13} className="animate-spin" /> Checking availability…</div>;
  if (!enabled) return <div className="mt-2 rounded-sm px-3 py-2.5 text-[12px] text-white/65 font-jb" style={cardStyle}>Booking isn&apos;t available right now — use the contact form instead.</div>;
  if (status === "done" && confirmed) {
    return (
      <div className="mt-2 rounded-sm px-3 py-2.5 text-[12px] text-white/80 font-jb" style={cardStyle}>
        <div className="flex items-center gap-2"><Check size={14} style={{ color: "var(--theme-primary, #ef4242)" }} /> Booked for <strong className="text-white">{confirmed.label}</strong>. {confirmed.location ? `(${confirmed.location})` : ""} A confirmation is on its way.</div>
      </div>
    );
  }

  const activeDay = days.find((d) => d.date === activeDate);
  const openDays = days.filter((d) => d.slots.length).slice(0, 6);

  return (
    <div className="mt-2 rounded-sm p-3 space-y-2 font-jb" style={cardStyle}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--theme-primary, #ef4242)" }}>
        <Calendar size={12} /> Book a meeting{type ? ` · ${type.name}` : ""}
      </div>

      {/* Day picker */}
      <div className="flex flex-wrap gap-1">
        {openDays.map((d) => (
          <button key={d.date} type="button" onClick={() => { setActiveDate(d.date); setSlot(null); }}
            className="rounded-sm border px-2 py-1 text-[11px] cursor-pointer"
            style={{ borderColor: d.date === activeDate ? "var(--theme-primary, #ef4242)" : "rgba(255,255,255,0.12)", color: d.date === activeDate ? "#fff" : "rgba(255,255,255,0.6)" }}>
            {d.label}
          </button>
        ))}
      </div>

      {/* Slot picker */}
      <div className="flex flex-wrap gap-1">
        {(activeDay?.slots ?? []).slice(0, 10).map((s) => (
          <button key={s.start} type="button" onClick={() => setSlot(s)}
            className="rounded-sm border px-2 py-1 text-[11px] cursor-pointer"
            style={{ borderColor: slot?.start === s.start ? "var(--theme-primary, #ef4242)" : "rgba(255,255,255,0.12)", background: slot?.start === s.start ? "color-mix(in srgb, var(--theme-primary, #ef4242) 18%, transparent)" : "transparent", color: slot?.start === s.start ? "#fff" : "rgba(255,255,255,0.6)" }}>
            {s.label}
          </button>
        ))}
        {activeDay && activeDay.slots.length === 0 && <span className="text-[11px] text-white/40">No times that day.</span>}
      </div>

      <Field label="Name" value={name} onChange={setName} placeholder="Your name" />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Email" value={email} onChange={setEmail} placeholder="you@email.com" type="email" />
        <Field label="Phone (optional)" value={phone} onChange={(v) => setPhone(formatPhoneInput(v))} placeholder="(555) 123-4567" type="tel" />
      </div>
      <Field label="Subject (optional)" value={subject} onChange={setSubject} placeholder="What's this about?" />
      <Field label="Message (optional)" value={message} onChange={setMessage} placeholder="Anything to add?" textarea />
      <ConsentRow checked={consent} onChange={setConsent} />
      {err && <p className="text-[11px] text-red-400">{err}</p>}
      <button type="button" onClick={book} disabled={status === "booking"}
        className="w-full flex items-center justify-center gap-2 rounded-sm py-2 text-[12px] font-medium text-white transition-opacity disabled:opacity-60 cursor-pointer"
        style={{ background: "var(--theme-primary, #ef4242)" }}>
        {status === "booking" ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={13} />}
        {status === "booking" ? "Booking…" : slot ? "Confirm booking" : "Pick a time"}
      </button>
    </div>
  );
}
