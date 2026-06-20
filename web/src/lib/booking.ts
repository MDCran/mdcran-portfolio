import { getDb } from "./mongodb";
import { randomUUID } from "crypto";
import type { BookingConfig, BookingRecord, BookingMeetingType } from "./types";

/* ─── Defaults ──────────────────────────────────────────── */
export const DEFAULT_BOOKING_CONFIG: BookingConfig = {
  enabled: false,
  icalUrl: "",
  timezone: "America/New_York",
  // Sun..Sat — 9–5 Mon–Fri, weekends off.
  hours: [
    { enabled: false, start: "09:00", end: "17:00" }, // Sun
    { enabled: true, start: "09:00", end: "17:00" },  // Mon
    { enabled: true, start: "09:00", end: "17:00" },  // Tue
    { enabled: true, start: "09:00", end: "17:00" },  // Wed
    { enabled: true, start: "09:00", end: "17:00" },  // Thu
    { enabled: true, start: "09:00", end: "17:00" },  // Fri
    { enabled: false, start: "09:00", end: "17:00" }, // Sat
  ],
  blockHolidays: true,
  minNoticeDays: 2,
  maxAdvanceDays: 30,
  maxPerDay: 4,
  bufferMinutes: 30,
  slotIntervalMinutes: 30,
  blackouts: [],
  meetingTypes: [],
};

/* ─── Config persistence ────────────────────────────────── */
export async function getBookingConfig(): Promise<BookingConfig> {
  const db = await getDb();
  const doc = await db.collection("bookingConfig").findOne({});
  if (!doc) return DEFAULT_BOOKING_CONFIG;
  const hours = Array.isArray(doc.hours) && doc.hours.length === 7 ? doc.hours : DEFAULT_BOOKING_CONFIG.hours;
  return {
    enabled: Boolean(doc.enabled),
    icalUrl: typeof doc.icalUrl === "string" ? doc.icalUrl : "",
    timezone: typeof doc.timezone === "string" && doc.timezone ? doc.timezone : DEFAULT_BOOKING_CONFIG.timezone,
    hours,
    blockHolidays: doc.blockHolidays !== false,
    minNoticeDays: numOr(doc.minNoticeDays, DEFAULT_BOOKING_CONFIG.minNoticeDays),
    maxAdvanceDays: numOr(doc.maxAdvanceDays, DEFAULT_BOOKING_CONFIG.maxAdvanceDays),
    maxPerDay: numOr(doc.maxPerDay, DEFAULT_BOOKING_CONFIG.maxPerDay),
    bufferMinutes: numOr(doc.bufferMinutes, DEFAULT_BOOKING_CONFIG.bufferMinutes),
    slotIntervalMinutes: numOr(doc.slotIntervalMinutes, DEFAULT_BOOKING_CONFIG.slotIntervalMinutes),
    blackouts: Array.isArray(doc.blackouts) ? doc.blackouts : [],
    meetingTypes: Array.isArray(doc.meetingTypes) ? doc.meetingTypes : [],
  };
}

function numOr(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export async function saveBookingConfig(config: BookingConfig): Promise<void> {
  const db = await getDb();
  await db.collection("bookingConfig").updateOne({}, { $set: config }, { upsert: true });
}

/** Public-safe slice of the config — never leaks the iCal URL. */
export function publicBookingConfig(config: BookingConfig) {
  return {
    enabled: config.enabled,
    timezone: config.timezone,
    minNoticeDays: config.minNoticeDays,
    maxAdvanceDays: config.maxAdvanceDays,
    meetingTypes: config.meetingTypes.filter((t) => t.enabled).map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description ?? "",
      location: t.location,
      durations: t.durations,
    })),
  };
}

/* ─── Bookings ──────────────────────────────────────────── */
export async function getBookings(limit = 200): Promise<BookingRecord[]> {
  const db = await getDb();
  const docs = await db.collection("bookings").find({}).sort({ start: -1 }).limit(limit).toArray();
  return docs.map((d) => ({
    id: d.id, typeId: d.typeId, typeName: d.typeName, durationMinutes: d.durationMinutes,
    location: d.location, start: d.start, end: d.end, name: d.name, email: d.email,
    phone: d.phone, message: d.message, createdAt: d.createdAt, status: d.status,
  })) as BookingRecord[];
}

/** Confirmed bookings overlapping [from,to). */
export async function getBookingsInRange(from: Date, to: Date): Promise<BookingRecord[]> {
  const db = await getDb();
  const docs = await db.collection("bookings").find({
    status: "confirmed",
    start: { $lt: to.toISOString() },
    end: { $gt: from.toISOString() },
  }).toArray();
  return docs as unknown as BookingRecord[];
}

export async function createBooking(
  rec: Omit<BookingRecord, "id" | "createdAt" | "status"> & {
    serial?: string;
    ip?: string | null;
    identityId?: string | null;
  },
): Promise<BookingRecord> {
  const db = await getDb();
  const record: BookingRecord = { ...rec, id: randomUUID(), createdAt: new Date().toISOString(), status: "confirmed" };
  await db.collection("bookings").insertOne(record);
  return record;
}

/** All bookings for an identity — joined across its serials + identityId. */
export async function getBookingsForIdentity(identityId: string, serials: string[]): Promise<BookingRecord[]> {
  const db = await getDb();
  const docs = await db
    .collection("bookings")
    .find({ $or: [{ identityId }, { serial: { $in: serials.filter(Boolean) } }] }, { projection: { _id: 0 } })
    .sort({ start: -1 })
    .toArray();
  return docs as unknown as BookingRecord[];
}

/* ─── Timezone helpers (no external deps) ───────────────── */
/** ms offset (localTZ - UTC) for a given instant in a tz. */
function tzOffsetMs(instant: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(instant).map((p) => [p.type, p.value]));
  const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUTC - instant.getTime();
}

/** Convert a wall-clock time in `tz` to the corresponding UTC instant. */
export function zonedWallToUtc(y: number, m: number, d: number, hh: number, mm: number, tz: string): Date {
  const guess = Date.UTC(y, m - 1, d, hh, mm, 0);
  const off1 = tzOffsetMs(new Date(guess), tz);
  let utc = guess - off1;
  const off2 = tzOffsetMs(new Date(utc), tz);
  if (off2 !== off1) utc = guess - off2;
  return new Date(utc);
}

/** Parts of an instant as seen in `tz`. */
export function zonedParts(instant: Date, tz: string): { y: number; m: number; d: number; hh: number; mm: number; weekday: number } {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false, weekday: "short",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
  const p = Object.fromEntries(dtf.formatToParts(instant).map((x) => [x.type, x.value]));
  const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { y: +p.year, m: +p.month, d: +p.day, hh: +p.hour, mm: +(p.minute === "24" ? 0 : p.minute), weekday: wdMap[p.weekday] ?? 0 };
}

/** Format an instant as a clock label (e.g. "9:30 AM") in `tz`. */
export function formatSlotLabel(instant: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(instant);
}

/* ─── US federal holidays (date strings YYYY-MM-DD in business tz year) ─── */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): string {
  // month 1-12, weekday 0=Sun
  const first = new Date(Date.UTC(year, month - 1, 1));
  const firstWd = first.getUTCDay();
  let day = 1 + ((7 + weekday - firstWd) % 7) + (n - 1) * 7;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function lastWeekdayOfMonth(year: number, month: number, weekday: number): string {
  const last = new Date(Date.UTC(year, month, 0));
  const lastDay = last.getUTCDate();
  const lastWd = last.getUTCDay();
  const day = lastDay - ((7 + lastWd - weekday) % 7);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
export function usFederalHolidays(year: number): Set<string> {
  const fixed = [
    `${year}-01-01`, // New Year's Day
    `${year}-06-19`, // Juneteenth
    `${year}-07-04`, // Independence Day
    `${year}-11-11`, // Veterans Day
    `${year}-12-25`, // Christmas
  ];
  const floating = [
    nthWeekdayOfMonth(year, 1, 1, 3),   // MLK Day — 3rd Mon Jan
    nthWeekdayOfMonth(year, 2, 1, 3),   // Presidents' Day — 3rd Mon Feb
    lastWeekdayOfMonth(year, 5, 1),     // Memorial Day — last Mon May
    nthWeekdayOfMonth(year, 9, 1, 1),   // Labor Day — 1st Mon Sep
    nthWeekdayOfMonth(year, 10, 1, 2),  // Columbus Day — 2nd Mon Oct
    nthWeekdayOfMonth(year, 11, 4, 4),  // Thanksgiving — 4th Thu Nov
  ];
  return new Set([...fixed, ...floating]);
}

/* ─── iCal (.ics) fetch + parse → busy intervals ────────── */
export interface BusyInterval { start: number; end: number } // epoch ms

let icalCache: { url: string; at: number; intervals: BusyInterval[] } | null = null;
const ICAL_TTL = 5 * 60 * 1000;

function unfoldIcs(text: string): string[] {
  // RFC5545 line folding: continuation lines start with space/tab.
  const raw = text.split(/\r?\n/);
  const lines: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function parseIcsDate(value: string, paramStr: string): number | null {
  // value like 20260115T140000Z, 20260115T140000 (with TZID param), or 20260115 (all-day)
  const tzidMatch = paramStr.match(/TZID=([^;:]+)/i);
  const isDateOnly = /VALUE=DATE(?!-)/i.test(paramStr) || /^\d{8}$/.test(value);
  if (isDateOnly && /^\d{8}$/.test(value)) {
    const y = +value.slice(0, 4), mo = +value.slice(4, 6), d = +value.slice(6, 8);
    return Date.UTC(y, mo - 1, d); // midnight UTC; good enough for all-day blocking
  }
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!m) return null;
  const [, y, mo, d, hh, mm, ss, z] = m;
  if (z) return Date.UTC(+y, +mo - 1, +d, +hh, +mm, +ss);
  if (tzidMatch) return zonedWallToUtc(+y, +mo, +d, +hh, +mm, tzidMatch[1]).getTime();
  // Floating time — treat as UTC (best effort).
  return Date.UTC(+y, +mo - 1, +d, +hh, +mm, +ss);
}

/** Fetch + parse the iCal feed into busy intervals (non-recurring + simple). Cached 5 min. */
export async function fetchBusyIntervals(icalUrl: string): Promise<BusyInterval[]> {
  if (!icalUrl) return [];
  if (icalCache && icalCache.url === icalUrl && Date.now() - icalCache.at < ICAL_TTL) return icalCache.intervals;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(icalUrl, { signal: ctrl.signal, headers: { "User-Agent": "mdcran-booking/1.0" }, cache: "no-store" });
    clearTimeout(timer);
    if (!res.ok) return icalCache?.url === icalUrl ? icalCache.intervals : [];
    const text = await res.text();
    const lines = unfoldIcs(text);
    const intervals: BusyInterval[] = [];
    let inEvent = false, dtStart: number | null = null, dtEnd: number | null = null, transparent = false;
    for (const line of lines) {
      const ci = line.indexOf(":");
      if (ci === -1) { if (line.startsWith("BEGIN:VEVENT")) { inEvent = true; dtStart = dtEnd = null; transparent = false; } continue; }
      const left = line.slice(0, ci);
      const value = line.slice(ci + 1).trim();
      const [key, ...paramParts] = left.split(";");
      const paramStr = paramParts.join(";");
      const upper = key.toUpperCase();
      if (upper === "BEGIN" && value === "VEVENT") { inEvent = true; dtStart = dtEnd = null; transparent = false; }
      else if (upper === "END" && value === "VEVENT") {
        if (inEvent && dtStart != null && !transparent) {
          const end = dtEnd != null ? dtEnd : dtStart + 30 * 60 * 1000;
          if (end > dtStart) intervals.push({ start: dtStart, end });
        }
        inEvent = false;
      } else if (inEvent && upper === "DTSTART") dtStart = parseIcsDate(value, paramStr);
      else if (inEvent && upper === "DTEND") dtEnd = parseIcsDate(value, paramStr);
      else if (inEvent && upper === "TRANSP") transparent = value.toUpperCase() === "TRANSPARENT";
    }
    icalCache = { url: icalUrl, at: Date.now(), intervals };
    return intervals;
  } catch {
    return icalCache?.url === icalUrl ? icalCache.intervals : [];
  }
}

/* ─── Availability ──────────────────────────────────────── */
export interface DaySlots { date: string; label: string; slots: { start: string; label: string }[] }

function isoDate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function withinBlackout(dateStr: string, blackouts: BookingConfig["blackouts"]): boolean {
  return blackouts.some((b) => b.start && b.end && dateStr >= b.start && dateStr <= b.end);
}

/**
 * Compute bookable days + time slots for a meeting type/duration over the allowed window.
 * All wall-clock logic happens in the business timezone; slots are returned as UTC ISO + tz label.
 */
export function computeAvailability(
  config: BookingConfig,
  meetingType: BookingMeetingType,
  durationMinutes: number,
  busy: BusyInterval[],
  bookings: { start: string; end: string }[],
): DaySlots[] {
  const tz = config.timezone;
  const now = new Date();
  const todayParts = zonedParts(now, tz);
  const days: DaySlots[] = [];

  // Booked intervals from our own DB (already busy) + buffer applied below.
  const bookingIntervals: BusyInterval[] = bookings.map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }));
  const bufferMs = config.bufferMinutes * 60 * 1000;
  const allBusy = [...busy, ...bookingIntervals];

  const startDayOffset = Math.max(0, config.minNoticeDays);
  for (let offset = startDayOffset; offset <= config.maxAdvanceDays; offset++) {
    // Determine the calendar date `offset` days from today (in tz).
    const base = zonedWallToUtc(todayParts.y, todayParts.m, todayParts.d, 12, 0, tz);
    const dayInstant = new Date(base.getTime() + offset * 24 * 60 * 60 * 1000);
    const dp = zonedParts(dayInstant, tz);
    const dateStr = isoDate(dp.y, dp.m, dp.d);
    const dow = dp.weekday;
    const hours = config.hours[dow];
    if (!hours?.enabled) continue;
    if (withinBlackout(dateStr, config.blackouts)) continue;
    if (config.blockHolidays && usFederalHolidays(dp.y).has(dateStr)) continue;

    // Count existing site bookings that day (in tz) → enforce maxPerDay.
    const bookingsThatDay = bookings.filter((b) => {
      const p = zonedParts(new Date(b.start), tz);
      return isoDate(p.y, p.m, p.d) === dateStr;
    }).length;
    if (bookingsThatDay >= config.maxPerDay) continue;

    const [sh, sm] = hours.start.split(":").map(Number);
    const [eh, em] = hours.end.split(":").map(Number);
    const windowStart = zonedWallToUtc(dp.y, dp.m, dp.d, sh, sm, tz).getTime();
    const windowEnd = zonedWallToUtc(dp.y, dp.m, dp.d, eh, em, tz).getTime();

    const slots: { start: string; label: string }[] = [];
    const step = Math.max(5, config.slotIntervalMinutes) * 60 * 1000;
    const durMs = durationMinutes * 60 * 1000;
    for (let t = windowStart; t + durMs <= windowEnd; t += step) {
      const slotStart = t, slotEnd = t + durMs;
      if (slotStart < now.getTime()) continue; // never offer a past time
      // Overlap test against busy + buffer.
      const blocked = allBusy.some((iv) => slotStart < iv.end + bufferMs && slotEnd + bufferMs > iv.start);
      if (blocked) continue;
      slots.push({ start: new Date(slotStart).toISOString(), label: formatSlotLabel(new Date(slotStart), tz) });
    }
    if (slots.length) {
      const label = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" }).format(dayInstant);
      days.push({ date: dateStr, label, slots });
    }
  }
  return days;
}

/** Validate that a specific start time is still bookable (server-side, at booking time). */
export function isSlotAvailable(
  config: BookingConfig,
  meetingType: BookingMeetingType,
  durationMinutes: number,
  startIso: string,
  busy: BusyInterval[],
  bookings: { start: string; end: string }[],
): boolean {
  const days = computeAvailability(config, meetingType, durationMinutes, busy, bookings);
  return days.some((d) => d.slots.some((s) => s.start === startIso));
}
