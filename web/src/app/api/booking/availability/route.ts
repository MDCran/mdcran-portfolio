import { NextRequest } from "next/server";
import {
  getBookingConfig, getBookingsInRange, fetchBusyIntervals, computeAvailability,
} from "@/lib/booking";

export const dynamic = "force-dynamic";

/* GET /api/booking/availability?typeId=&duration=  → bookable days + time slots. */
export async function GET(req: NextRequest) {
  const config = await getBookingConfig();
  if (!config.enabled) return Response.json({ enabled: false, days: [] });

  const typeId = req.nextUrl.searchParams.get("typeId") ?? "";
  const duration = parseInt(req.nextUrl.searchParams.get("duration") ?? "", 10);
  const meetingType = config.meetingTypes.find((t) => t.id === typeId && t.enabled);
  if (!meetingType) return Response.json({ enabled: true, days: [], error: "Unknown meeting type" }, { status: 400 });
  if (!meetingType.durations.includes(duration)) {
    return Response.json({ enabled: true, days: [], error: "Invalid duration" }, { status: 400 });
  }

  // Window: now → maxAdvanceDays out.
  const from = new Date();
  const to = new Date(Date.now() + (config.maxAdvanceDays + 1) * 24 * 60 * 60 * 1000);
  const [busy, bookings] = await Promise.all([
    fetchBusyIntervals(config.icalUrl),
    getBookingsInRange(from, to),
  ]);

  const days = computeAvailability(config, meetingType, duration, busy, bookings.map((b) => ({ start: b.start, end: b.end })));
  return Response.json({ enabled: true, timezone: config.timezone, days });
}
