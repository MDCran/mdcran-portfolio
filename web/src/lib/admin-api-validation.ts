import { randomUUID } from "node:crypto";
import { AdminDataError } from "./content-validation";
import type { StatusService, StatusIncident, VisitorAdjustment, BookingConfig, UtmLink } from "./types";

export async function readAdminObject(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try { body = await request.json(); }
  catch { throw new AdminDataError("A valid JSON object is required", 400); }
  return adminObject(body);
}
export function adminObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new AdminDataError("A JSON object is required", 400);
  return value as Record<string, unknown>;
}
export function adminString(value: unknown, field: string, max = 200): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new AdminDataError(`Invalid ${field}`, 400);
  return value.trim();
}
function optionalString(value: unknown, field: string, max = 200): string | undefined {
  return value === undefined || value === null || value === "" ? undefined : adminString(value, field, max);
}
function date(value: unknown, field: string): string {
  const text = adminString(value, field, 50);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(text) || !Number.isFinite(Date.parse(text))) throw new AdminDataError(`Invalid ${field}`, 400);
  return new Date(text).toISOString();
}
export function adminHttpUrl(value: unknown, field: string): string {
  const text = adminString(value, field, 2048);
  let url: URL;
  try { url = new URL(text); } catch { throw new AdminDataError(`Invalid ${field}`, 400); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new AdminDataError(`Invalid ${field}`, 400);
  return url.toString();
}
export function statusService(body: Record<string, unknown>, previous?: StatusService): StatusService {
  const merged = { ...previous, ...body };
  const sortOrder = merged.sortOrder ?? 99;
  const pingUrl = optionalString(merged.pingUrl, "pingUrl", 2048);
  if (typeof sortOrder !== "number" || !Number.isSafeInteger(sortOrder)) throw new AdminDataError("sortOrder must be a whole number", 400);
  if (merged.defunct !== undefined && typeof merged.defunct !== "boolean") throw new AdminDataError("defunct must be a boolean", 400);
  return {
    id: previous?.id ?? (body.id === undefined ? `svc-${randomUUID()}` : adminString(body.id, "id")),
    name: adminString(merged.name, "name"), group: optionalString(merged.group, "group"), sortOrder,
    ...(pingUrl ? { pingUrl: adminHttpUrl(pingUrl, "pingUrl") } : {}),
    ...(merged.defunct !== undefined ? { defunct: merged.defunct as boolean } : {}),
    createdAt: previous?.createdAt ?? new Date().toISOString(),
  };
}
export function statusIncident(body: Record<string, unknown>, previous?: StatusIncident): StatusIncident {
  const merged = { ...previous, ...body };
  const severity = merged.severity ?? "minor";
  const status = merged.status ?? "investigating";
  if (typeof severity !== "string" || !["minor", "major", "critical"].includes(severity)) throw new AdminDataError("Invalid incident severity", 400);
  if (typeof status !== "string" || !["investigating", "identified", "monitoring", "resolved"].includes(status)) throw new AdminDataError("Invalid incident status", 400);
  if (typeof merged.message !== "string" || merged.message.length > 10_000) throw new AdminDataError("Invalid incident message", 400);
  const now = new Date().toISOString();
  const startedAt = date(merged.startedAt ?? now, "startedAt");
  const resolvedAt = status === "resolved" ? date(merged.resolvedAt ?? now, "resolvedAt") : undefined;
  if (resolvedAt && resolvedAt < startedAt) throw new AdminDataError("resolvedAt cannot precede startedAt", 400);
  return {
    id: previous?.id ?? (body.id === undefined ? `inc-${randomUUID()}` : adminString(body.id, "id")),
    serviceId: adminString(merged.serviceId, "serviceId"), title: adminString(merged.title, "title", 500),
    message: merged.message.trim(), severity: severity as StatusIncident["severity"], status: status as StatusIncident["status"],
    startedAt, ...(resolvedAt ? { resolvedAt } : {}), createdAt: previous?.createdAt ?? now, updatedAt: now,
  };
}
export function visitorAdjustment(body: Record<string, unknown>): VisitorAdjustment {
  const country = adminString(body.country, "country", 2).toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) throw new AdminDataError("Country must be a two-letter code", 400);
  if (typeof body.addedCount !== "number" || !Number.isSafeInteger(body.addedCount) || body.addedCount < 1) throw new AdminDataError("Count must be a positive whole number", 400);
  return { id: `adj-${randomUUID()}`, country, countryName: adminString(body.countryName, "countryName"), addedCount: body.addedCount, createdAt: new Date().toISOString() };
}

export function bookingConfig(body: Record<string, unknown>): BookingConfig {
  function boolean(value: unknown, field: string) {
    if (typeof value !== "boolean") throw new AdminDataError(`Invalid ${field}`, 400);
    return value;
  }
  function integer(value: unknown, field: string, min: number, max: number) {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) throw new AdminDataError(`${field} must be between ${min} and ${max}`, 400);
    return value;
  }
  function time(value: unknown) {
    if (typeof value !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new AdminDataError("Hours must use HH:MM", 400);
    return value;
  }
  function calendarDate(value: unknown) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new AdminDataError("Invalid blackout date", 400);
    return value;
  }
  const timezone = adminString(body.timezone, "timezone", 100);
  try { new Intl.DateTimeFormat("en", { timeZone: timezone }).format(); }
  catch { throw new AdminDataError("Invalid timezone", 400); }
  if (!Array.isArray(body.hours) || body.hours.length !== 7) throw new AdminDataError("Seven days of hours are required", 400);
  const hours = body.hours.map(item => {
    const day = adminObject(item);
    const enabled = boolean(day.enabled, "day enabled");
    const start = time(day.start), end = time(day.end);
    if (enabled && end <= start) throw new AdminDataError("Enabled hours must end after they start", 400);
    return { enabled, start, end };
  });
  if (!Array.isArray(body.blackouts) || body.blackouts.length > 100) throw new AdminDataError("Invalid blackouts", 400);
  const blackouts = body.blackouts.map(item => {
    const blackout = adminObject(item);
    const start = calendarDate(blackout.start), end = calendarDate(blackout.end);
    if (end < start) throw new AdminDataError("Blackout end must not precede start", 400);
    return { start, end, label: optionalString(blackout.label, "blackout label") };
  });
  if (!Array.isArray(body.meetingTypes) || body.meetingTypes.length > 50) throw new AdminDataError("Invalid meeting types", 400);
  const ids = new Set<string>();
  const meetingTypes = body.meetingTypes.map(item => {
    const meeting = adminObject(item);
    const id = adminString(meeting.id, "meeting id");
    if (ids.has(id)) throw new AdminDataError("Duplicate meeting type", 400);
    ids.add(id);
    if (!Array.isArray(meeting.durations) || meeting.durations.length === 0 || meeting.durations.length > 50) throw new AdminDataError("At least one meeting duration is required", 400);
    return { id, name: adminString(meeting.name, "meeting name"), location: adminString(meeting.location, "meeting location", 500),
      description: optionalString(meeting.description, "meeting description", 2000), enabled: boolean(meeting.enabled, "meeting enabled"),
      durations: [...new Set(meeting.durations.map(value => integer(value, "duration", 5, 1440)))] };
  });
  const minNoticeDays = integer(body.minNoticeDays, "minNoticeDays", 0, 60);
  const maxAdvanceDays = integer(body.maxAdvanceDays, "maxAdvanceDays", 1, 365);
  if (maxAdvanceDays < minNoticeDays) throw new AdminDataError("Advance window must include the minimum notice", 400);
  return { enabled: boolean(body.enabled, "enabled"), blockHolidays: boolean(body.blockHolidays, "blockHolidays"),
    icalUrl: body.icalUrl === "" ? "" : adminHttpUrl(body.icalUrl, "icalUrl"), timezone, hours, blackouts, meetingTypes,
    minNoticeDays, maxAdvanceDays, maxPerDay: integer(body.maxPerDay, "maxPerDay", 1, 50), bufferMinutes: integer(body.bufferMinutes, "bufferMinutes", 0, 480),
    slotIntervalMinutes: integer(body.slotIntervalMinutes, "slotIntervalMinutes", 5, 240) };
}

export function utmLink(body: Record<string, unknown>): UtmLink {
  const baseUrl = adminHttpUrl(body.baseUrl, "baseUrl");
  const source = adminString(body.source, "source"), medium = adminString(body.medium, "medium"), campaign = adminString(body.campaign, "campaign");
  const term = optionalString(body.term, "term"), content = optionalString(body.content, "content");
  const url = new URL(baseUrl);
  for (const [name, value] of Object.entries({ source, medium, campaign, term, content })) {
    if (value) url.searchParams.set(`utm_${name}`, value);
    else url.searchParams.delete(`utm_${name}`);
  }
  const now = new Date().toISOString();
  return { id: body.id === undefined ? randomUUID() : adminString(body.id, "id"), label: adminString(body.label, "label"),
    baseUrl, source, medium, campaign, term, content, url: url.toString(), createdAt: body.createdAt === undefined ? now : date(body.createdAt, "createdAt"), updatedAt: now };
}
