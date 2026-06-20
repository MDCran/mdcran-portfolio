import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/mongodb";
import type { RateLimitRecord } from "@/lib/types";

type RateLimitScope = "contact-form" | "subscribe-form";

const MAX_REQUESTS_PER_IP = 5;

function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

function detectBrowser(req: NextRequest): string {
  const ua = req.headers.get("user-agent") || "";

  if (/Edg\//i.test(ua)) return "Edge";
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return "Chrome";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return "Safari";
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return "Opera";

  return ua ? "Unknown Browser" : "Unknown";
}

function getLocationMeta(req: NextRequest) {
  return {
    city: req.headers.get("x-vercel-ip-city") || undefined,
    region: req.headers.get("x-vercel-ip-country-region") || undefined,
    country: req.headers.get("x-vercel-ip-country") || undefined,
  };
}

export async function getRateLimitRecords(): Promise<RateLimitRecord[]> {
  const db = await getDb();
  const records = (await db
    .collection("rate_limits")
    .find({}, { projection: { _id: 0 } })
    .toArray()) as unknown as RateLimitRecord[];

  return records.sort(
    (a, b) => new Date(b.lastAttemptAt).getTime() - new Date(a.lastAttemptAt).getTime()
  );
}

export async function getRateLimitRecordsForIps(ips: string[]): Promise<RateLimitRecord[]> {
  const db = await getDb();
  const records = (await db
    .collection("rate_limits")
    .find({ ip: { $in: ips.filter(Boolean) } }, { projection: { _id: 0 } })
    .toArray()) as unknown as RateLimitRecord[];

  return records;
}

export async function updateRateLimitRecord(record: RateLimitRecord): Promise<void> {
  const db = await getDb();
  await db.collection("rate_limits").updateOne(
    { id: record.id },
    { $set: record },
    { upsert: true }
  );
}

export async function deleteRateLimitRecord(id: string): Promise<void> {
  const db = await getDb();
  await db.collection("rate_limits").deleteOne({ id });
}

export async function enforcePublicFormRateLimit(
  req: NextRequest,
  scope: RateLimitScope
): Promise<
  | {
      allowed: true;
      cookieName: string;
      browserLocked: boolean;
    }
  | {
      allowed: false;
      status: 429;
      error: string;
      cookieName: string;
    }
> {
  const cookieName = `mdcran_${scope}_submitted`;

  if (req.cookies.get(cookieName)?.value === "1") {
    return {
      allowed: false,
      status: 429,
      error: "This browser has already submitted this form.",
      cookieName,
    };
  }

  const db = await getDb();
  const now = new Date().toISOString();
  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") || undefined;
  const browser = detectBrowser(req);
  const { city, region, country } = getLocationMeta(req);

  const existing = (await db.collection("rate_limits").findOne({
    scope,
    ip,
  })) as RateLimitRecord | null;

  if (existing && existing.count >= MAX_REQUESTS_PER_IP) {
    const blockedRecord: RateLimitRecord = {
      ...existing,
      browser,
      userAgent,
      city: existing.city ?? city,
      region: existing.region ?? region,
      country: existing.country ?? country,
      blockedCount: (existing.blockedCount ?? 0) + 1,
      lastAttemptAt: now,
      lastBlockedAt: now,
      browserLocked: true,
    };

    await updateRateLimitRecord(blockedRecord);

    return {
      allowed: false,
      status: 429,
      error: "This IP has reached the submission limit for this form.",
      cookieName,
    };
  }

  const nextRecord: RateLimitRecord = {
    id: existing?.id ?? randomUUID(),
    scope,
    ip,
    browser,
    userAgent,
    city: existing?.city ?? city,
    region: existing?.region ?? region,
    country: existing?.country ?? country,
    count: (existing?.count ?? 0) + 1,
    blockedCount: existing?.blockedCount ?? 0,
    limit: MAX_REQUESTS_PER_IP,
    browserLocked: true,
    firstSeenAt: existing?.firstSeenAt ?? now,
    lastAttemptAt: now,
    lastBlockedAt: existing?.lastBlockedAt,
    notes: existing?.notes,
  };

  await updateRateLimitRecord(nextRecord);

  return {
    allowed: true,
    cookieName,
    browserLocked: true,
  };
}
