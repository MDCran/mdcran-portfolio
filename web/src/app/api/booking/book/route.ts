import { NextRequest } from "next/server";
import {
  getBookingConfig, getBookingsInRange, fetchBusyIntervals, isSlotAvailable, createBooking,
} from "@/lib/booking";
import { isValidEmail, isValidPhoneNumber, normalizeEmail, normalizePhone } from "@/lib/contact-validation";
import { sendEmail } from "@/lib/mailer";
import { notifyBooking } from "@/lib/discord";
import { findIdentityBySerial } from "@/lib/identity";
import { clientIp } from "@/lib/api-rate-limit";

export const dynamic = "force-dynamic";

/* POST /api/booking/book — validates the slot is still open, then records the booking. */
export async function POST(req: NextRequest) {
  const config = await getBookingConfig();
  if (!config.enabled) return Response.json({ error: "Booking is not available right now." }, { status: 503 });

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request." }, { status: 400 });

  const { typeId, duration, start, name, email, phone, subject, message, consent, serial } = body as Record<string, unknown>;
  if (!consent) return Response.json({ error: "Consent is required." }, { status: 400 });

  const meetingType = config.meetingTypes.find((t) => t.id === typeId && t.enabled);
  if (!meetingType) return Response.json({ error: "Unknown meeting type." }, { status: 400 });
  const durationMinutes = typeof duration === "number" ? duration : parseInt(String(duration), 10);
  if (!meetingType.durations.includes(durationMinutes)) return Response.json({ error: "Invalid duration." }, { status: 400 });

  const startIso = typeof start === "string" ? start : "";
  const startMs = Date.parse(startIso);
  if (!startIso || Number.isNaN(startMs)) return Response.json({ error: "Invalid time." }, { status: 400 });

  const cleanName = String(name ?? "").trim();
  const cleanEmail = normalizeEmail(typeof email === "string" ? email : "");
  const cleanPhone = normalizePhone(typeof phone === "string" ? phone : "");
  const cleanMessage = String(message ?? "").trim().slice(0, 2000);
  const cleanSubject = String(subject ?? "").trim().slice(0, 200);
  if (!cleanName) return Response.json({ error: "Name is required." }, { status: 400 });
  if (!cleanEmail || !isValidEmail(cleanEmail)) return Response.json({ error: "A valid email is required." }, { status: 400 });
  if (cleanPhone && !isValidPhoneNumber(cleanPhone)) return Response.json({ error: "Enter a valid phone number." }, { status: 400 });

  // Re-validate availability at booking time (prevents double-booking / stale slots).
  const from = new Date(Date.now() - 60 * 60 * 1000);
  const to = new Date(Date.now() + (config.maxAdvanceDays + 1) * 24 * 60 * 60 * 1000);
  const [busy, bookings] = await Promise.all([
    fetchBusyIntervals(config.icalUrl),
    getBookingsInRange(from, to),
  ]);
  const ok = isSlotAvailable(config, meetingType, durationMinutes, startIso, busy, bookings.map((b) => ({ start: b.start, end: b.end })));
  if (!ok) return Response.json({ error: "That time is no longer available — please pick another." }, { status: 409 });

  // Resolve identity once (reused for persistence + Discord notify).
  const cleanSerial = typeof serial === "string" ? serial.slice(0, 64) : "";
  const identity = cleanSerial ? await findIdentityBySerial(cleanSerial) : null;

  const endIso = new Date(startMs + durationMinutes * 60 * 1000).toISOString();
  const record = await createBooking({
    typeId: meetingType.id,
    typeName: meetingType.name,
    durationMinutes,
    location: meetingType.location,
    start: startIso,
    end: endIso,
    name: cleanName,
    email: cleanEmail,
    phone: cleanPhone || undefined,
    subject: cleanSubject || undefined,
    message: cleanMessage || undefined,
    serial: cleanSerial || undefined,
    ip: clientIp(req),
    identityId: identity?.id ?? null,
  });

  // Fire-and-forget Discord notification.
  void (async () => {
    void notifyBooking({
      id: record.id,
      typeName: record.typeName,
      durationMinutes: record.durationMinutes,
      location: record.location,
      start: record.start,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone || null,
      subject: cleanSubject || null,
      message: cleanMessage || null,
      timezone: config.timezone,
      identity: identity ? { id: identity.id, name: identity.name, deviceCount: identity.devices.length } : null,
    });
  })();

  // Fire-and-forget emails: confirmation to attendee + notification to the owner.
  const whenLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: config.timezone, weekday: "long", month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  }).format(new Date(startMs));
  const ownerTo = process.env.BOOKING_NOTIFY_EMAIL || "contact@mdcran.com";
  void Promise.allSettled([
    sendEmail({
      to: cleanEmail,
      subject: `Confirmed: ${meetingType.name} with MDCran`,
      replyTo: ownerTo,
      html: `<div style="font-family:system-ui,sans-serif;max-width:480px">
        <h2 style="margin:0 0 12px">You're booked!</h2>
        <p style="margin:0 0 6px">Hi ${escapeHtml(cleanName)}, your <strong>${escapeHtml(meetingType.name)}</strong> is confirmed.</p>
        <p style="margin:0 0 4px"><strong>When:</strong> ${whenLabel}</p>
        <p style="margin:0 0 4px"><strong>Duration:</strong> ${durationMinutes} minutes</p>
        <p style="margin:0 0 4px"><strong>Location:</strong> ${escapeHtml(meetingType.location)}</p>
        ${cleanMessage ? `<p style="margin:12px 0 4px"><strong>Your note:</strong> ${escapeHtml(cleanMessage)}</p>` : ""}
        <p style="margin:16px 0 0;color:#888;font-size:13px">If you need to reschedule, just reply to this email.</p>
      </div>`,
      text: `You're booked! ${meetingType.name} — ${whenLabel} (${durationMinutes} min) · ${meetingType.location}`,
    }),
    sendEmail({
      to: ownerTo,
      subject: `New booking: ${meetingType.name} — ${cleanName}`,
      replyTo: cleanEmail,
      html: `<div style="font-family:system-ui,sans-serif;max-width:480px">
        <h2 style="margin:0 0 12px">New meeting booked</h2>
        <p style="margin:0 0 4px"><strong>${escapeHtml(meetingType.name)}</strong> (${durationMinutes} min, ${escapeHtml(meetingType.location)})</p>
        <p style="margin:0 0 4px"><strong>When:</strong> ${whenLabel}</p>
        <p style="margin:0 0 4px"><strong>Name:</strong> ${escapeHtml(cleanName)}</p>
        <p style="margin:0 0 4px"><strong>Email:</strong> ${escapeHtml(cleanEmail)}</p>
        ${cleanPhone ? `<p style="margin:0 0 4px"><strong>Phone:</strong> ${escapeHtml(cleanPhone)}</p>` : ""}
        ${cleanMessage ? `<p style="margin:12px 0 4px"><strong>Note:</strong> ${escapeHtml(cleanMessage)}</p>` : ""}
      </div>`,
      text: `New booking: ${meetingType.name} — ${cleanName} (${cleanEmail}) on ${whenLabel}`,
    }),
  ]);

  return Response.json({ success: true, booking: { id: record.id, start: record.start, end: record.end, typeName: record.typeName, location: record.location } });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
