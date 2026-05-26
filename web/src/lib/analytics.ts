import { getDb } from "./mongodb";
import { geolocateIp, hashIp } from "./geoip";
import { parseUserAgent } from "./ua";

/* ─── Types ─────────────────────────────────────────────── */
type IncomingEvent =
  | { type: "pageview"; pageviewId: string; path: string; title?: string }
  | { type: "pageend"; pageviewId: string; path: string; durationMs: number; maxScrollPct: number }
  | { type: "event"; name: string; path: string; meta?: Record<string, unknown> }
  | { type: "heat"; path: string; points: { type: "click" | "rage" | "move" | "scroll"; x: number; y: number }[] }
  | { type: "heartbeat"; path: string };

export interface TrackPayload {
  visitorId: string;
  sessionId: string;
  returning?: boolean;
  events: IncomingEvent[];
}

const ACTIVE_WINDOW_MS = 90 * 1000; // a session is "active" if seen within 90s

export type SessionCommand = { action: "kill" | "refresh" | "redirect" | "block"; path?: string };

/* ─── Ingest ────────────────────────────────────────────── */
export async function recordAnalytics(payload: TrackPayload, ip: string, userAgent: string | null): Promise<{ commands: SessionCommand[] }> {
  if (!payload?.sessionId || !payload?.visitorId || !Array.isArray(payload.events)) return { commands: [] };
  const db = await getDb();
  const now = new Date();
  const ipHash = hashIp(ip);
  const { browser, os, device } = parseUserAgent(userAgent);

  // Blacklisted IPs get a hard block command and are not recorded further.
  if (ip && ip !== "unknown") {
    const blocked = await db.collection("ipBlacklist").findOne({ ip });
    if (blocked) return { commands: [{ action: "block" }] };
  }

  const sessions = db.collection("aSessions");
  let session = await sessions.findOne<{ sessionId: string; country?: string; countryName?: string }>({ sessionId: payload.sessionId });

  // Create the session (geolocate once) if new.
  if (!session) {
    const geo = ip && ip !== "unknown" ? await geolocateIp(ip).catch(() => null) : null;
    // Returning visitor = this visitorId has an older session.
    const priorVisitor = await sessions.findOne({ visitorId: payload.visitorId });
    await sessions.updateOne(
      { sessionId: payload.sessionId },
      {
        $setOnInsert: {
          sessionId: payload.sessionId,
          visitorId: payload.visitorId,
          ipHash,
          ip: ip && ip !== "unknown" ? ip : null,
          firstSeen: now,
          country: geo?.country ?? null,
          countryName: geo?.countryName ?? null,
          city: geo?.city ?? null,
          browser, os, device,
          returning: Boolean(priorVisitor) || Boolean(payload.returning),
          pageviews: 0,
          events: 0,
        },
        $set: { lastSeen: now, lastPath: null },
      },
      { upsert: true }
    );
    session = await sessions.findOne<{ sessionId: string; country?: string; countryName?: string }>({ sessionId: payload.sessionId });
  } else {
    await sessions.updateOne({ sessionId: payload.sessionId }, { $set: { lastSeen: now } });
  }

  const country = session?.country ?? null;
  const countryName = session?.countryName ?? null;

  const pageviews = db.collection("aPageviews");
  const events = db.collection("aEvents");
  const heat = db.collection("aHeat");
  const heatDocs: Record<string, unknown>[] = [];
  let pvInc = 0;
  let evInc = 0;

  for (const ev of payload.events) {
    try {
      if (ev.type === "pageview") {
        await pageviews.updateOne(
          { pageviewId: ev.pageviewId },
          {
            $setOnInsert: {
              pageviewId: ev.pageviewId,
              sessionId: payload.sessionId,
              visitorId: payload.visitorId,
              ipHash,
              path: ev.path,
              title: ev.title ?? null,
              startedAt: now,
              country, countryName, browser, os, device,
              durationMs: 0,
              maxScrollPct: 0,
            },
            $set: { lastAt: now },
          },
          { upsert: true }
        );
        pvInc++;
        await sessions.updateOne({ sessionId: payload.sessionId }, { $set: { lastPath: ev.path } });
      } else if (ev.type === "pageend") {
        await pageviews.updateOne(
          { pageviewId: ev.pageviewId },
          {
            $max: { durationMs: Math.max(0, Math.min(ev.durationMs, 6 * 60 * 60 * 1000)), maxScrollPct: Math.max(0, Math.min(ev.maxScrollPct, 100)) },
            $set: { lastAt: now },
          }
        );
      } else if (ev.type === "event") {
        await events.insertOne({
          sessionId: payload.sessionId,
          visitorId: payload.visitorId,
          ipHash,
          name: String(ev.name).slice(0, 80),
          path: ev.path,
          meta: ev.meta ?? {},
          country, countryName,
          ts: now,
        });
        evInc++;
      } else if (ev.type === "heat" && Array.isArray(ev.points)) {
        for (const p of ev.points.slice(0, 60)) {
          if (typeof p.x !== "number" || typeof p.y !== "number") continue;
          heatDocs.push({
            path: ev.path,
            type: p.type,
            x: Math.max(0, Math.min(100, p.x)),
            y: Math.max(0, Math.min(100, p.y)),
            ts: now,
          });
        }
      }
      // heartbeat: lastSeen already bumped above
    } catch {
      /* never throw on a tracking event */
    }
  }

  if (heatDocs.length) await heat.insertMany(heatDocs).catch(() => {});
  if (pvInc || evInc) {
    await sessions.updateOne(
      { sessionId: payload.sessionId },
      { $inc: { pageviews: pvInc, events: evInc } }
    );
  }

  // Deliver + clear any pending admin commands for this session (poll-based push).
  const withCmds = await sessions.findOneAndUpdate(
    { sessionId: payload.sessionId },
    { $set: { commands: [] } },
    { returnDocument: "before", projection: { commands: 1 } }
  );
  const commands = (withCmds?.commands as SessionCommand[] | undefined) ?? [];
  return { commands };
}

/* ─── Live sessions + admin control ─────────────────────── */
export interface LiveVisitor {
  visitorId: string;
  ip: string | null;
  countryName: string | null;
  countryCode: string | null;
  browser: string;
  os: string;
  device: string;
  visitCount: number;       // total sessions ever from this visitor
  returning: boolean;
  tabs: { sessionId: string; lastPath: string | null; lastSeen: string; active: boolean }[];
  activeTabs: number;
}

export async function getLiveSessions(): Promise<{ visitors: LiveVisitor[]; blacklist: string[] }> {
  const db = await getDb();
  const sessions = db.collection("aSessions");
  // Recent sessions (last 24h) grouped by visitor.
  const recent = await sessions.find({ lastSeen: { $gte: since(DAY) } }).sort({ lastSeen: -1 }).limit(400).toArray();
  const totalByVisitor = new Map<string, number>();
  for (const v of await sessions.aggregate([{ $group: { _id: "$visitorId", n: { $sum: 1 } } }]).toArray()) {
    totalByVisitor.set(v._id as string, v.n as number);
  }

  const byVisitor = new Map<string, LiveVisitor>();
  for (const s of recent) {
    const active = Date.now() - new Date(s.lastSeen).getTime() < ACTIVE_WINDOW_MS;
    let v = byVisitor.get(s.visitorId);
    if (!v) {
      v = {
        visitorId: s.visitorId,
        ip: s.ip ?? null,
        countryName: s.countryName ?? null,
        countryCode: s.country ?? null,
        browser: s.browser ?? "Other",
        os: s.os ?? "Other",
        device: s.device ?? "desktop",
        visitCount: totalByVisitor.get(s.visitorId) ?? 1,
        returning: Boolean(s.returning),
        tabs: [],
        activeTabs: 0,
      };
      byVisitor.set(s.visitorId, v);
    }
    v.tabs.push({
      sessionId: s.sessionId,
      lastPath: s.lastPath ?? null,
      lastSeen: (s.lastSeen instanceof Date ? s.lastSeen : new Date(s.lastSeen)).toISOString(),
      active,
    });
    if (active) v.activeTabs++;
    if (!v.ip && s.ip) v.ip = s.ip;
  }

  const visitors = Array.from(byVisitor.values()).sort((a, b) => b.activeTabs - a.activeTabs || new Date(b.tabs[0]?.lastSeen ?? 0).getTime() - new Date(a.tabs[0]?.lastSeen ?? 0).getTime());
  const blacklist = (await db.collection("ipBlacklist").find({}, { projection: { _id: 0, ip: 1 } }).toArray()).map((d) => d.ip as string);
  return { visitors, blacklist };
}

/** Queue a command for one session or all of a visitor's tabs. */
type SessionDoc = { sessionId?: string; visitorId?: string; ip?: string | null; commands?: SessionCommand[] };

export async function issueSessionCommand(target: { sessionId?: string; visitorId?: string }, command: SessionCommand): Promise<void> {
  const db = await getDb();
  const filter = target.sessionId ? { sessionId: target.sessionId } : target.visitorId ? { visitorId: target.visitorId } : null;
  if (!filter) return;
  await db.collection<SessionDoc>("aSessions").updateMany(filter, { $push: { commands: command } });
}

export async function setIpBlacklist(ip: string, blocked: boolean): Promise<void> {
  const db = await getDb();
  if (blocked) {
    await db.collection("ipBlacklist").updateOne({ ip }, { $set: { ip, createdAt: new Date() } }, { upsert: true });
    // Immediately push a block command to all of this IP's sessions.
    await db.collection<SessionDoc>("aSessions").updateMany({ ip }, { $push: { commands: { action: "block" } } });
  } else {
    await db.collection("ipBlacklist").deleteOne({ ip });
  }
}

/* ─── Aggregation for the admin dashboard ───────────────── */
function since(ms: number): Date {
  return new Date(Date.now() - ms);
}
const DAY = 24 * 60 * 60 * 1000;

export interface AnalyticsOverview {
  totalVisits: number;
  uniqueVisitors: number;
  avgVisitsPerVisitor: number;
  avgScrollDepth: number;
  totalPageviews: number;
  windows: { label: string; visits: number }[];
  topCountries: { name: string; count: number; code?: string }[];
  topBrowsers: { name: string; count: number }[];
  topOS: { name: string; count: number }[];
  topPages: { path: string; views: number; avgTimeSec: number; avgScroll: number }[];
  topProjects: { path: string; views: number; avgTimeSec: number }[];
  topArticles: { path: string; views: number; avgTimeSec: number }[];
  scrollDistribution: { path: string; buckets: number[] }[]; // [0-25,25-50,50-75,75-100]
  recruiterEvents: { name: string; total: number; uniqueSessions: number }[];
  loadTimes: { path: string; avgMs: number; samples: number }[];
  activeNow: number;
  sessionsToday: number;
  recentSessions: {
    sessionId: string; ip: string | null; countryName: string | null; browser: string; os: string; device: string;
    returning: boolean; pageviews: number; events: number; firstSeen: string; lastSeen: string; lastPath: string | null;
    readPaths: string[];
  }[];
}

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const db = await getDb();
  const sessions = db.collection("aSessions");
  const pageviews = db.collection("aPageviews");
  const events = db.collection("aEvents");

  const [
    totalVisits,
    uniqueVisitorAgg,
    v24, v7, v30,
    countriesAgg,
    browsersAgg,
    osAgg,
    pagesAgg,
    scrollAgg,
    eventsAgg,
    loadAgg,
    activeNow,
    sessionsToday,
    recentSessionsRaw,
    pvCount,
    scrollAvgAgg,
    readBySessionRaw,
  ] = await Promise.all([
    sessions.countDocuments({}),
    sessions.aggregate([{ $group: { _id: "$visitorId" } }, { $count: "n" }]).toArray(),
    sessions.countDocuments({ firstSeen: { $gte: since(DAY) } }),
    sessions.countDocuments({ firstSeen: { $gte: since(7 * DAY) } }),
    sessions.countDocuments({ firstSeen: { $gte: since(30 * DAY) } }),
    sessions.aggregate([{ $group: { _id: "$countryName", count: { $sum: 1 }, code: { $first: "$country" } } }, { $sort: { count: -1 } }, { $limit: 12 }]).toArray(),
    sessions.aggregate([{ $group: { _id: "$browser", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]).toArray(),
    sessions.aggregate([{ $group: { _id: "$os", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]).toArray(),
    pageviews.aggregate([
      { $group: { _id: "$path", views: { $sum: 1 }, avgMs: { $avg: "$durationMs" }, avgScroll: { $avg: "$maxScrollPct" } } },
      { $sort: { views: -1 } },
      { $limit: 100 },
    ]).toArray(),
    pageviews.aggregate([
      { $group: {
        _id: "$path",
        b0: { $sum: { $cond: [{ $lt: ["$maxScrollPct", 25] }, 1, 0] } },
        b1: { $sum: { $cond: [{ $and: [{ $gte: ["$maxScrollPct", 25] }, { $lt: ["$maxScrollPct", 50] }] }, 1, 0] } },
        b2: { $sum: { $cond: [{ $and: [{ $gte: ["$maxScrollPct", 50] }, { $lt: ["$maxScrollPct", 75] }] }, 1, 0] } },
        b3: { $sum: { $cond: [{ $gte: ["$maxScrollPct", 75] }, 1, 0] } },
        total: { $sum: 1 },
      } },
      { $sort: { total: -1 } },
      { $limit: 20 },
    ]).toArray(),
    events.aggregate([
      { $group: { _id: "$name", total: { $sum: 1 }, sessions: { $addToSet: "$sessionId" } } },
      { $sort: { total: -1 } },
    ]).toArray(),
    events.aggregate([
      { $match: { name: "page_load" } },
      { $group: { _id: "$path", avgMs: { $avg: "$meta.ms" }, n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 40 },
    ]).toArray(),
    sessions.countDocuments({ lastSeen: { $gte: since(ACTIVE_WINDOW_MS) } }),
    sessions.countDocuments({ firstSeen: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
    sessions.find({}).sort({ lastSeen: -1 }).limit(60).toArray(),
    pageviews.countDocuments({}),
    pageviews.aggregate([{ $group: { _id: null, avg: { $avg: "$maxScrollPct" } } }]).toArray(),
    events.aggregate([
      { $match: { name: "page_read" } },
      { $group: { _id: "$sessionId", paths: { $addToSet: "$path" } } },
    ]).toArray(),
  ]);

  const readBySession = new Map<string, string[]>();
  for (const r of readBySessionRaw) readBySession.set(r._id as string, (r.paths as string[]) ?? []);

  const uniqueVisitors = uniqueVisitorAgg[0]?.n ?? 0;
  const topPages = pagesAgg.map((p) => ({
    path: p._id as string,
    views: p.views as number,
    avgTimeSec: Math.round(((p.avgMs as number) ?? 0) / 1000),
    avgScroll: Math.round((p.avgScroll as number) ?? 0),
  }));
  const isProject = (path: string) =>
    /^\/(coding-projects|code|motion-and-graphics|arts-and-entertainment)\//.test(path);
  const isArticle = (path: string) => /^\/articles\//.test(path);

  return {
    totalVisits,
    uniqueVisitors,
    avgVisitsPerVisitor: uniqueVisitors ? Math.round((totalVisits / uniqueVisitors) * 10) / 10 : 0,
    avgScrollDepth: Math.round((scrollAvgAgg[0]?.avg as number) ?? 0),
    totalPageviews: pvCount,
    windows: [
      { label: "24h", visits: v24 },
      { label: "7 days", visits: v7 },
      { label: "30 days", visits: v30 },
      { label: "All time", visits: totalVisits },
    ],
    topCountries: countriesAgg.map((c) => ({ name: (c._id as string) ?? "Unknown", count: c.count as number, code: (c.code as string) ?? undefined })),
    topBrowsers: browsersAgg.map((c) => ({ name: (c._id as string) ?? "Other", count: c.count as number })),
    topOS: osAgg.map((c) => ({ name: (c._id as string) ?? "Other", count: c.count as number })),
    topPages,
    topProjects: topPages.filter((p) => isProject(p.path)).slice(0, 15),
    topArticles: topPages.filter((p) => isArticle(p.path)).slice(0, 15),
    scrollDistribution: scrollAgg.map((s) => ({ path: s._id as string, buckets: [s.b0 as number, s.b1 as number, s.b2 as number, s.b3 as number] })),
    recruiterEvents: eventsAgg.filter((e) => e._id !== "page_load").map((e) => ({ name: e._id as string, total: e.total as number, uniqueSessions: (e.sessions as unknown[]).length })),
    loadTimes: loadAgg.map((l) => ({ path: l._id as string, avgMs: Math.round((l.avgMs as number) ?? 0), samples: l.n as number })),
    activeNow,
    sessionsToday,
    recentSessions: recentSessionsRaw.map((s) => ({
      sessionId: s.sessionId,
      ip: s.ip ?? null,
      countryName: s.countryName ?? null,
      browser: s.browser ?? "Other",
      os: s.os ?? "Other",
      device: s.device ?? "desktop",
      returning: Boolean(s.returning),
      pageviews: s.pageviews ?? 0,
      events: s.events ?? 0,
      firstSeen: (s.firstSeen instanceof Date ? s.firstSeen : new Date(s.firstSeen)).toISOString(),
      lastSeen: (s.lastSeen instanceof Date ? s.lastSeen : new Date(s.lastSeen)).toISOString(),
      lastPath: s.lastPath ?? null,
      readPaths: readBySession.get(s.sessionId) ?? [],
    })),
  };
}

/* ─── Heatmap points for a page (30-day rolling) ────────── */
export async function getHeatmap(path: string): Promise<{ path: string; points: { type: string; x: number; y: number }[] }> {
  const db = await getDb();
  const docs = await db
    .collection("aHeat")
    .find({ path, ts: { $gte: since(30 * DAY) } }, { projection: { _id: 0, type: 1, x: 1, y: 1 } })
    .limit(8000)
    .toArray();
  return { path, points: docs.map((d) => ({ type: d.type, x: d.x, y: d.y })) };
}

/* List of pages that have heatmap data, for the admin page picker. */
export async function getHeatmapPages(): Promise<string[]> {
  const db = await getDb();
  const paths = await db.collection("aHeat").distinct("path", { ts: { $gte: since(30 * DAY) } });
  return (paths as string[]).sort();
}
