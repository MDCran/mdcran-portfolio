import { getDb } from "./mongodb";

const DISCORD_API = "https://discord.com/api/v10";
const COLL = "discordConfig";

// ─── Config ──────────────────────────────────────────────────

export interface DiscordChannelMap {
  forms: string | null;
  bookings: string | null;
  newsletter: string | null;
  identities: string | null;
  analytics: string | null;
  deviceLinks: string | null;
  returningVisitors: string | null;
}

export interface DiscordConfig {
  enabled: boolean;
  guildId: string;
  channels: DiscordChannelMap;
  updatedAt: string;
}

export const DISCORD_CONFIG_DEFAULTS: DiscordConfig = {
  enabled: false,
  guildId: "",
  channels: { forms: null, bookings: null, newsletter: null, identities: null, analytics: null, deviceLinks: null, returningVisitors: null },
  updatedAt: new Date(0).toISOString(),
};

export async function getDiscordConfig(): Promise<DiscordConfig> {
  const db = await getDb();
  const doc = await db.collection(COLL).findOne({}, { projection: { _id: 0 } });
  if (!doc) return { ...DISCORD_CONFIG_DEFAULTS };
  return {
    enabled: Boolean(doc.enabled),
    guildId: String(doc.guildId ?? ""),
    channels: {
      forms: doc.channels?.forms || null,
      bookings: doc.channels?.bookings || null,
      newsletter: doc.channels?.newsletter || null,
      identities: doc.channels?.identities || null,
      analytics: doc.channels?.analytics || null,
      deviceLinks: doc.channels?.deviceLinks || null,
      returningVisitors: doc.channels?.returningVisitors || null,
    },
    updatedAt: String(doc.updatedAt ?? DISCORD_CONFIG_DEFAULTS.updatedAt),
  };
}

export async function saveDiscordConfig(
  patch: Partial<Omit<DiscordConfig, "channels">> & { channels?: Partial<DiscordChannelMap> }
): Promise<DiscordConfig> {
  const db = await getDb();
  const current = await getDiscordConfig();
  const updated: DiscordConfig = {
    ...current,
    ...patch,
    channels: { ...current.channels, ...(patch.channels ?? {}) },
    updatedAt: new Date().toISOString(),
  };
  await db.collection(COLL).updateOne({}, { $set: updated }, { upsert: true });
  return updated;
}

// ─── Low-level sender ─────────────────────────────────────────

interface EmbedField { name: string; value: string; inline?: boolean; }
interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields?: EmbedField[];
  footer?: { text: string };
  timestamp?: string;
}

async function sendEmbed(channelId: string, embed: DiscordEmbed): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.warn("[Discord] DISCORD_BOT_TOKEN not set — skipping notification.");
    return;
  }
  try {
    const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${token}`,
      },
      body: JSON.stringify({
        embeds: [{ ...embed, timestamp: embed.timestamp ?? new Date().toISOString() }],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[Discord] channel=${channelId} status=${res.status} body=${body.slice(0, 200)}`);
    }
  } catch (err) {
    console.error("[Discord] Network error:", err);
  }
}

function val(v: string | null | undefined, fallback = "—"): string {
  const s = String(v ?? "").trim();
  return s || fallback;
}

// ─── Test Embed ───────────────────────────────────────────────

export async function sendTestEmbed(channelKey: keyof DiscordChannelMap): Promise<{ ok: boolean; error?: string }> {
  const cfg = await getDiscordConfig();
  if (!cfg.enabled) return { ok: false, error: "Discord integration is disabled." };
  const channelId = cfg.channels[channelKey];
  if (!channelId) return { ok: false, error: `No channel configured for "${channelKey}".` };
  try {
    await sendEmbed(channelId, {
      title: "🧪 Discord Test",
      description: `This is a test notification for the **${channelKey}** channel.\nIf you see this, your bot token and channel ID are correctly configured.`,
      color: 0x5865F2,
      footer: { text: "mdcran.com · Admin Test" },
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// ─── Event A: Contact Form ─────────────────────────────────────

export interface ContactFormPayload {
  name: string;
  email?: string | null;
  phone?: string | null;
  subject?: string | null;
  message: string;
  ip?: string | null;
  country?: string | null;
  browser?: string | null;
  os?: string | null;
  sessionId?: string | null;
  utmSource?: string | null;
  referrer?: string | null;
  fingerprint?: string | null;
}

export async function notifyContactForm(data: ContactFormPayload): Promise<void> {
  const cfg = await getDiscordConfig();
  if (!cfg.enabled || !cfg.channels.forms) return;

  const fields: EmbedField[] = [
    { name: "Full Name", value: val(data.name), inline: true },
    { name: "Email", value: val(data.email), inline: true },
    { name: "Phone", value: val(data.phone), inline: true },
    { name: "Subject", value: val(data.subject), inline: false },
    { name: "Message", value: data.message.slice(0, 1024), inline: false },
    { name: "IP Address", value: val(data.ip), inline: true },
    { name: "Country", value: val(data.country), inline: true },
    { name: "Browser / OS", value: `${val(data.browser)} / ${val(data.os)}`, inline: true },
  ];
  if (data.utmSource) fields.push({ name: "UTM Source", value: data.utmSource, inline: true });
  if (data.referrer) fields.push({ name: "HTTP Referrer", value: data.referrer.slice(0, 256), inline: true });
  if (data.fingerprint) fields.push({ name: "Fingerprint", value: `\`${data.fingerprint.slice(0, 16)}…\``, inline: true });
  if (data.sessionId) fields.push({ name: "Session ID", value: `\`${data.sessionId}\``, inline: false });

  await sendEmbed(cfg.channels.forms, {
    title: "📬 New Contact Form Submission",
    color: 0x5865F2,
    fields,
    footer: { text: "mdcran.com · Contact Form" },
  });
}

// ─── Event B: Booking ──────────────────────────────────────────

export interface BookingPayload {
  id: string;
  typeName: string;
  durationMinutes: number;
  location: string;
  start: string;
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message?: string | null;
  timezone?: string;
  identity?: { id: string; name: string; deviceCount: number } | null;
}

export async function notifyBooking(data: BookingPayload): Promise<void> {
  const cfg = await getDiscordConfig();
  if (!cfg.enabled || !cfg.channels.bookings) return;

  const when = new Intl.DateTimeFormat("en-US", {
    timeZone: data.timezone ?? "America/New_York",
    weekday: "long", month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  }).format(new Date(data.start));

  const fields: EmbedField[] = [
    { name: "Meeting Type", value: val(data.typeName), inline: true },
    { name: "Duration", value: `${data.durationMinutes} min`, inline: true },
    { name: "Location / Link", value: val(data.location), inline: true },
    { name: "When", value: when, inline: false },
    { name: "Name", value: val(data.name), inline: true },
    { name: "Email", value: val(data.email), inline: true },
  ];
  if (data.phone) fields.push({ name: "Phone", value: data.phone, inline: true });
  if (data.subject) fields.push({ name: "Purpose", value: data.subject, inline: false });
  if (data.message) fields.push({ name: "Notes", value: data.message.slice(0, 512), inline: false });
  if (data.identity) {
    fields.push({
      name: "Known Identity",
      value: `**${data.identity.name}** — ${data.identity.deviceCount} device${data.identity.deviceCount !== 1 ? "s" : ""}`,
      inline: false,
    });
  }
  fields.push({ name: "Booking ID", value: `\`${data.id}\``, inline: false });

  await sendEmbed(cfg.channels.bookings, {
    title: "📅 New Meeting Booked",
    color: 0x57F287,
    fields,
    footer: { text: "mdcran.com · Booking System" },
    timestamp: new Date(data.start).toISOString(),
  });
}

// ─── Event C: Newsletter Sub / Unsub ──────────────────────────

export interface NewsletterPayload {
  action: "SUBSCRIBED" | "UNSUBSCRIBED";
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  sessionHistory?: string | null;
}

export async function notifyNewsletter(data: NewsletterPayload): Promise<void> {
  const cfg = await getDiscordConfig();
  if (!cfg.enabled || !cfg.channels.newsletter) return;

  const isSubscribed = data.action === "SUBSCRIBED";
  const contactChannel = data.email
    ? `Email: ${data.email}`
    : data.phone
    ? `Phone: ${data.phone}`
    : "—";

  const fields: EmbedField[] = [
    { name: "Action", value: data.action, inline: true },
    { name: "Contact Channel", value: contactChannel, inline: true },
  ];
  if (data.name) fields.push({ name: "Name", value: data.name, inline: true });
  if (data.source) fields.push({ name: "Source", value: data.source, inline: true });
  if (data.sessionHistory) {
    fields.push({ name: "Session History", value: data.sessionHistory, inline: false });
  }

  await sendEmbed(cfg.channels.newsletter, {
    title: isSubscribed ? "✅ Newsletter Subscribed" : "❌ Newsletter Unsubscribed",
    color: isSubscribed ? 0x57F287 : 0xED4245,
    fields,
    footer: { text: "mdcran.com · Newsletter" },
  });
}

// ─── Event D: Identity Lifecycle ──────────────────────────────

export type IdentityOrigin = "admin" | "user" | "ai";

export interface IdentityEventPayload {
  id: string;
  name: string;
  deviceCount: number;
  origin: IdentityOrigin;
  createdAt: string;
  isNew: boolean;
  aiContext?: string | null;
}

const ORIGIN_DESC: Record<IdentityOrigin, string> = {
  admin: "🛠️ Created manually by the Admin in the CRM dashboard",
  user: "👤 Entered by the visitor via the accessibility / profile input",
  ai: "🤖 Extracted programmatically by the AI Chatbot during conversation",
};

export async function notifyIdentityEvent(data: IdentityEventPayload): Promise<void> {
  const cfg = await getDiscordConfig();
  if (!cfg.enabled || !cfg.channels.identities) return;

  const fields: EmbedField[] = [
    { name: "Name", value: val(data.name), inline: true },
    { name: "Identity ID", value: `\`${data.id.slice(0, 8)}…\``, inline: true },
    { name: "Devices", value: String(data.deviceCount), inline: true },
    { name: "Origin", value: ORIGIN_DESC[data.origin], inline: false },
    {
      name: "Created At",
      value: new Date(data.createdAt).toLocaleString("en-US", { timeZone: "America/New_York" }),
      inline: false,
    },
  ];
  if (data.aiContext) {
    fields.push({ name: "AI Conversation Context", value: data.aiContext.slice(0, 512), inline: false });
  }

  await sendEmbed(cfg.channels.identities, {
    title: data.isNew ? "👤 New Identity Created" : "✏️ Identity Updated",
    color: 0xFEE75C,
    fields,
    footer: { text: "mdcran.com · Identity System" },
  });
}

// ─── Event F: Cross-Device Link ───────────────────────────────

export type DeviceLinkMethod = "handshake" | "probabilistic" | "manual";

export interface DeviceLinkPayload {
  method: DeviceLinkMethod;
  sourceSerial: string;
  targetSerial: string;
  identityId?: string | null;
  name?: string | null;
  score?: number | null;          // probabilistic confidence (0-100)
  criteria?: string[] | null;     // matched signals
}

const LINK_METHOD_DESC: Record<DeviceLinkMethod, string> = {
  handshake: "📲 Deterministic QR \"Scan to Mobile\" bridge (100% certain)",
  probabilistic: "🧮 Probabilistic fingerprint match (suspected)",
  manual: "🛠️ Linked manually by the Admin",
};

export async function notifyDeviceLink(data: DeviceLinkPayload): Promise<void> {
  const cfg = await getDiscordConfig();
  if (!cfg.enabled) return;
  // Prefer a dedicated channel, fall back to the identities channel.
  const channelId = cfg.channels.deviceLinks || cfg.channels.identities;
  if (!channelId) return;

  const fields: EmbedField[] = [
    { name: "Method", value: LINK_METHOD_DESC[data.method], inline: false },
    { name: "Device A", value: `\`${data.sourceSerial.slice(0, 12)}…\``, inline: true },
    { name: "Device B", value: `\`${data.targetSerial.slice(0, 12)}…\``, inline: true },
  ];
  if (data.name) fields.push({ name: "Identity", value: val(data.name), inline: true });
  if (data.identityId) fields.push({ name: "Identity ID", value: `\`${data.identityId.slice(0, 8)}…\``, inline: true });
  if (typeof data.score === "number") fields.push({ name: "Confidence", value: `${data.score}/100`, inline: true });
  if (data.criteria && data.criteria.length) {
    fields.push({ name: "Signals", value: data.criteria.slice(0, 8).map((c) => `• ${c}`).join("\n").slice(0, 1024), inline: false });
  }

  await sendEmbed(channelId, {
    title: data.method === "handshake" ? "🔗 Devices Bridged (QR)" : "🔗 Cross-Device Link",
    color: data.method === "handshake" ? 0x57F287 : 0xEB459E,
    fields,
    footer: { text: "mdcran.com · Cross-Device Engine" },
  });
}

// ─── Event G: Returning Named Visitor ─────────────────────────

export interface ReturningVisitorPayload {
  id: string;
  name: string;
  deviceCount: number;
  awayMs: number;          // time since this device was last seen before now
  ip?: string | null;
  browser?: string | null;
  os?: string | null;
  device?: string | null;
  country?: string | null;
  currentPath?: string | null;
  source?: string | null;  // resolved traffic source label, if known
}

function humanizeAway(ms: number): string {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"}`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"}`;
}

export async function notifyReturningVisitor(data: ReturningVisitorPayload): Promise<void> {
  const cfg = await getDiscordConfig();
  if (!cfg.enabled) return;
  const channelId = cfg.channels.returningVisitors || cfg.channels.identities;
  if (!channelId) return;

  const fields: EmbedField[] = [
    { name: "Name", value: val(data.name), inline: true },
    { name: "Identity ID", value: `\`${data.id.slice(0, 8)}…\``, inline: true },
    { name: "Away For", value: humanizeAway(data.awayMs), inline: true },
    { name: "Device", value: `${val(data.browser)} / ${val(data.os)}${data.device ? ` (${data.device})` : ""}`, inline: true },
    { name: "IP", value: val(data.ip), inline: true },
    { name: "Devices", value: String(data.deviceCount), inline: true },
  ];
  if (data.country) fields.push({ name: "Country", value: data.country, inline: true });
  if (data.source) fields.push({ name: "Source", value: data.source, inline: true });
  if (data.currentPath) fields.push({ name: "Landed On", value: data.currentPath, inline: false });

  await sendEmbed(channelId, {
    title: "🔁 Returning Visitor",
    description: `**${val(data.name)}** is back on the site.`,
    color: 0x9B59B6,
    fields,
    footer: { text: "mdcran.com · Returning Visitor" },
  });
}

// ─── Event E: Weekly Analytics Digest ─────────────────────────

export async function sendWeeklyDigest(): Promise<{ sent: boolean; error?: string }> {
  const cfg = await getDiscordConfig();
  if (!cfg.enabled || !cfg.channels.analytics) {
    return { sent: false, error: "Discord not enabled or analytics channel not configured." };
  }

  const db = await getDb();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const weekAgo = new Date(Date.now() - 7 * DAY_MS);
  const weekAgoIso = weekAgo.toISOString();
  const now = new Date();

  const [
    newSessions,
    totalSessions,
    uniqueAgg,
    countriesAgg,
    newContacts,
    newBookings,
    topPagesAgg,
    recruiterAgg,
  ] = await Promise.all([
    db.collection("aSessions").countDocuments({ firstSeen: { $gte: weekAgo } }),
    db.collection("aSessions").countDocuments({}),
    db.collection("aSessions")
      .aggregate([
        { $match: { firstSeen: { $gte: weekAgo } } },
        { $group: { _id: "$visitorId" } },
        { $count: "n" },
      ])
      .toArray(),
    db.collection("aSessions")
      .aggregate([
        { $match: { firstSeen: { $gte: weekAgo } } },
        { $group: { _id: "$countryName", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .toArray(),
    db.collection("contacts").countDocuments({ createdAt: { $gte: weekAgoIso } }),
    db.collection("bookings").countDocuments({ createdAt: { $gte: weekAgoIso } }),
    db.collection("aPageviews")
      .aggregate([
        { $match: { startedAt: { $gte: weekAgo } } },
        { $group: { _id: "$path", views: { $sum: 1 } } },
        { $sort: { views: -1 } },
        { $limit: 5 },
      ])
      .toArray(),
    db.collection("aEvents")
      .aggregate([
        { $match: { ts: { $gte: weekAgo }, name: { $nin: ["page_load", "page_read"] } } },
        { $group: { _id: "$name", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ])
      .toArray(),
  ]);

  const uniqueVisitors = (uniqueAgg[0] as { n?: number } | undefined)?.n ?? 0;
  const weekStart = weekAgo.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const weekEnd = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  type AggRow = Record<string, unknown>;

  const countryLines = countriesAgg.length
    ? countriesAgg.map((c: AggRow) => `**${String(c._id ?? "Unknown")}** — ${Number(c.count ?? 0)} sessions`).join("\n")
    : "No sessions this week.";

  const pageLines = topPagesAgg.length
    ? topPagesAgg.map((p: AggRow) => `\`${String(p._id ?? "").slice(0, 40)}\` — ${Number(p.views ?? 0)} views`).join("\n")
    : "No pageviews this week.";

  const recruiterLines = recruiterAgg.length
    ? recruiterAgg.map((e: AggRow) => `**${String(e._id ?? "Unknown")}** — ${Number(e.count ?? 0)}`).join("\n")
    : "No tracked events this week.";

  await sendEmbed(cfg.channels.analytics, {
    title: "📊 Weekly Analytics Digest",
    description: `**${weekStart} – ${weekEnd}**`,
    color: 0x0099FF,
    fields: [
      { name: "🌐 New Sessions (7d)", value: String(newSessions), inline: true },
      { name: "👥 Unique Visitors (7d)", value: String(uniqueVisitors), inline: true },
      { name: "📈 Total Sessions (All Time)", value: String(totalSessions), inline: true },
      { name: "📩 New Contacts", value: String(newContacts), inline: true },
      { name: "📅 New Bookings", value: String(newBookings), inline: true },
      { name: "​", value: "​", inline: true },
      { name: "🌍 Sessions by Country", value: countryLines, inline: false },
      { name: "📄 Top Pages", value: pageLines, inline: false },
      { name: "🎯 Engagement Events", value: recruiterLines, inline: false },
    ],
    footer: { text: "mdcran.com · Automated Weekly Digest" },
    timestamp: now.toISOString(),
  });

  return { sent: true };
}
