import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getBookingConfig, saveBookingConfig, getBookings, DEFAULT_BOOKING_CONFIG } from "@/lib/booking";
import type { BookingConfig } from "@/lib/types";

export const dynamic = "force-dynamic";

/* GET — admin: full config + recent bookings. */
export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [config, bookings] = await Promise.all([getBookingConfig(), getBookings()]);
  return NextResponse.json({ config, bookings });
}

/* PUT — admin: save config. */
export async function PUT(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Partial<BookingConfig> | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const hours = Array.isArray(body.hours) && body.hours.length === 7 ? body.hours : DEFAULT_BOOKING_CONFIG.hours;
  const config: BookingConfig = {
    enabled: Boolean(body.enabled),
    icalUrl: typeof body.icalUrl === "string" ? body.icalUrl.trim().slice(0, 1000) : "",
    timezone: typeof body.timezone === "string" && body.timezone ? body.timezone : DEFAULT_BOOKING_CONFIG.timezone,
    hours,
    blockHolidays: Boolean(body.blockHolidays),
    minNoticeDays: clamp(body.minNoticeDays, 0, 60, DEFAULT_BOOKING_CONFIG.minNoticeDays),
    maxAdvanceDays: clamp(body.maxAdvanceDays, 1, 365, DEFAULT_BOOKING_CONFIG.maxAdvanceDays),
    maxPerDay: clamp(body.maxPerDay, 1, 50, DEFAULT_BOOKING_CONFIG.maxPerDay),
    bufferMinutes: clamp(body.bufferMinutes, 0, 480, DEFAULT_BOOKING_CONFIG.bufferMinutes),
    slotIntervalMinutes: clamp(body.slotIntervalMinutes, 5, 240, DEFAULT_BOOKING_CONFIG.slotIntervalMinutes),
    blackouts: Array.isArray(body.blackouts) ? body.blackouts.slice(0, 100) : [],
    meetingTypes: Array.isArray(body.meetingTypes) ? body.meetingTypes.slice(0, 50) : [],
  };
  await saveBookingConfig(config);
  return NextResponse.json({ ok: true, config });
}

function clamp(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}
