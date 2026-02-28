import { getDb } from "./mongodb";
import type {
  Project,
  Article,
  Client,
  Experience,
  Education,
  Skill,
  Certification,
  Award,
  ClubMembership,
  Category,
  Subcategory,
  Campaign,
  ContactSubmission,
  RizzSubmission,
  Platform,
  SocialLink,
} from "./types";

const CLIENT_SOCIAL_REFRESH_KEY = "client_social_metrics_refreshed_at";
const CLIENT_SOCIAL_REFRESH_MS = 60 * 60 * 1000;
const PROJECT_VIDEO_REFRESH_KEY = "project_video_views_refreshed_at";
const PROJECT_VIDEO_REFRESH_MS = 60 * 1000;

let clientSocialRefreshPromise: Promise<ClientSocialRefreshReport> | null = null;
let projectVideoRefreshPromise: Promise<ProjectVideoRefreshReport> | null = null;

async function readCollection<T>(collName: string): Promise<T[]> {
  const db = await getDb();
  return db.collection(collName).find({}, { projection: { _id: 0 } }).toArray() as Promise<T[]>;
}

export async function getProjects(): Promise<Project[]> {
  return readCollection<Project>("projects");
}

type ClientSocialRefreshReport = {
  lines: string[];
  totalFollowers: number;
  totalViews: number;
  refreshedAt: string;
};

type ProjectVideoRefreshReport = {
  lines: string[];
  totalProjectViews: number;
  refreshedAt: string;
};

function parseCompactCount(raw: string): number {
  const cleaned = raw.replace(/,/g, "").trim().toUpperCase();
  const match = cleaned.match(/^(\d+(?:\.\d+)?)([KMB])?$/);

  if (!match) {
    const numeric = Number(cleaned.replace(/[^\d.]/g, ""));
    return Number.isFinite(numeric) ? numeric : 0;
  }

  const value = Number(match[1]);
  const suffix = match[2];
  const multiplier =
    suffix === "K" ? 1_000 : suffix === "M" ? 1_000_000 : suffix === "B" ? 1_000_000_000 : 1;

  return Math.round(value * multiplier);
}

function normalizeHandle(value: string): string {
  return value.trim().replace(/^@/, "").toLowerCase();
}

function getExpectedHandle(link: SocialLink): string | undefined {
  if (link.handle?.trim()) {
    return normalizeHandle(link.handle);
  }

  try {
    const url = new URL(link.url);
    const segments = url.pathname.split("/").filter(Boolean);

    if (!segments.length) {
      return undefined;
    }

    if (link.platform === "youtube") {
      const [first, second] = segments;
      if (first?.startsWith("@")) return normalizeHandle(first);
      if ((first === "channel" || first === "user" || first === "c") && second) {
        return normalizeHandle(second);
      }
      return normalizeHandle(first);
    }

    return normalizeHandle(segments[0]);
  } catch {
    return undefined;
  }
}

async function fetchYouTubeSubscriberCount(link: SocialLink): Promise<number | undefined> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return undefined;
  }

  const handle = getExpectedHandle(link);
  let parsedChannelId: string | undefined;

  try {
    const url = new URL(link.url);
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments[0] === "channel" && segments[1]) {
      parsedChannelId = segments[1];
    }
  } catch {
    // Ignore malformed URLs and fall back to handle parsing.
  }

  try {
    const params = new URLSearchParams({
      part: "statistics",
      key: apiKey,
      maxResults: "1",
    });

    if (link.channelId || parsedChannelId) {
      params.set("id", link.channelId ?? parsedChannelId ?? "");
    } else if (handle) {
      params.set("forHandle", handle);
    } else {
      return undefined;
    }

    const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?${params.toString()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return undefined;
    }

    const data = (await response.json()) as {
      items?: Array<{
        statistics?: { subscriberCount?: string };
      }>;
    };

    const rawCount = data.items?.[0]?.statistics?.subscriberCount;
    if (!rawCount) {
      return undefined;
    }

    const count = Number(rawCount);
    return Number.isFinite(count) && count > 0 ? count : undefined;
  } catch {
    return undefined;
  }
}

function extractYouTubeSubscriberCount(html: string): number {
  const patterns = [
    /property="og:description" content="[^"]*?([0-9.,]+(?:\s?[KMB])?) subscribers/i,
    /name="description" content="[^"]*?([0-9.,]+(?:\s?[KMB])?) subscribers/i,
    /"subscriberCountText":\{"simpleText":"([^"]+) subscribers"/i,
    /"subscriberCountText":\{"accessibility":\{"accessibilityData":\{"label":"([^"]+) subscribers"\}\}\}/i,
    /"subscriberCountText".*?"simpleText":"([^"]+) subscribers"/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match?.[1]) {
      continue;
    }

    const count = parseCompactCount(match[1]);
    if (count > 0) {
      return count;
    }
  }

  return 0;
}

function extractInstagramFollowerCount(html: string): number {
  const patterns = [
    /property="og:description" content="([0-9.,]+(?:\s?[KMB])?) Followers,/i,
    /name="description" content="([0-9.,]+(?:\s?[KMB])?) Followers,/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;
    const count = parseCompactCount(match[1]);
    if (count > 0) return count;
  }

  return 0;
}

function extractXFollowerCount(html: string): number {
  const patterns = [
    /property="og:description" content="[^"]*?([0-9.,]+(?:\s?[KMB])?) Followers/i,
    /name="description" content="[^"]*?([0-9.,]+(?:\s?[KMB])?) Followers/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;
    const count = parseCompactCount(match[1]);
    if (count > 0) return count;
  }

  return 0;
}

function extractTikTokFollowerCount(html: string, expectedHandle?: string): number {
  const patterns = [
    /"userInfo":\{"user":\{[\s\S]{0,1600}?"uniqueId":"([^"]+)"[\s\S]{0,2600}?"stats":\{[\s\S]{0,500}?"followerCount":"?([0-9]+)"?/i,
    /"author":\{[\s\S]{0,1200}?"uniqueId":"([^"]+)"[\s\S]{0,2200}?"stats":\{[\s\S]{0,500}?"followerCount":"?([0-9]+)"?/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match?.[1] || !match?.[2]) continue;

    const foundHandle = normalizeHandle(match[1]);
    if (expectedHandle && foundHandle !== expectedHandle) {
      continue;
    }

    const count = Number(match[2]);
    if (Number.isFinite(count) && count > 0) {
      return count;
    }
  }

  return 0;
}

function extractSocialCount(html: string, platform: Platform): number {
  if (platform === "youtube") {
    return extractYouTubeSubscriberCount(html);
  }

  if (platform === "instagram") {
    return extractInstagramFollowerCount(html);
  }

  if (platform === "x") {
    return extractXFollowerCount(html);
  }

  const platformPatterns: Record<Exclude<Platform, "youtube" | "instagram" | "x">, RegExp[]> = {
    twitch: [
      /"followers":\{"total":([0-9]+)\}/i,
    ],
    tiktok: [],
    facebook: [
      /property="og:description" content="([0-9.,]+(?:\s?[KMB])?)\s+followers/i,
      /name="description" content="([0-9.,]+(?:\s?[KMB])?)\s+followers/i,
    ],
    github: [
      /"followers":([0-9]+)/i,
      /([0-9.,]+(?:\s?[KMB])?)\s+followers/i,
    ],
    website: [
      /content="([0-9.,]+(?:\s?[KMB])?)\s+(?:followers|subscribers)/i,
    ],
    spotify: [
      /([0-9.,]+(?:\s?[KMB])?)\s+followers/i,
    ],
    discord: [
      /([0-9.,]+(?:\s?[KMB])?)\s+(?:members|followers)/i,
    ],
  };

  for (const pattern of platformPatterns[platform]) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;
    const count = parseCompactCount(match[1]);
    if (count > 0) return count;
  }

  return 0;
}

async function fetchSocialStatsFromHtml(link: SocialLink): Promise<{ followers: number; views: number }> {
  if (link.platform === "youtube") {
    const youtubeCount = await fetchYouTubeSubscriberCount(link);
    if (youtubeCount !== undefined) {
      return { followers: youtubeCount, views: 0 };
    }
  }

  try {
    const response = await fetch(link.url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return { followers: 0, views: 0 };
    }

    const html = await response.text();
    const expectedHandle = getExpectedHandle(link);

    return {
      followers:
        link.platform === "tiktok"
          ? extractTikTokFollowerCount(html, expectedHandle)
          : extractSocialCount(html, link.platform),
      views: 0,
    };
  } catch {
    return { followers: 0, views: 0 };
  }
}

async function runClientSocialRefresh(force: boolean, includeLogs: boolean): Promise<ClientSocialRefreshReport> {
  const db = await getDb();
  const settings = db.collection("settings");
  const refreshedAt = new Date().toISOString();
  const lines = includeLogs ? ["[clients] Starting social scan"] : [];
  const refreshDoc = await settings.findOne<{ key: string; value?: string }>({
    key: CLIENT_SOCIAL_REFRESH_KEY,
  });
  const lastRefreshedAt = refreshDoc?.value ? new Date(refreshDoc.value).getTime() : 0;
  const clients = await getClients();

  if (!force && lastRefreshedAt && Date.now() - lastRefreshedAt < CLIENT_SOCIAL_REFRESH_MS) {
    const totalFollowers = clients.reduce((sum, client) => sum + (client.followerCount ?? 0), 0);
    const totalViews = clients.reduce((sum, client) => sum + (client.viewCount ?? 0), 0);

    if (includeLogs) {
      lines.push("[clients] Skipped refresh because the cache is still fresh.");
      lines.push(`[clients] Using stored totals: followers=${totalFollowers.toLocaleString()} views=${totalViews.toLocaleString()}`);
    }

    return { lines, totalFollowers, totalViews, refreshedAt };
  }

  const bulkUpdates: Array<{
    updateOne: {
      filter: { id: string };
      update: { $set: { followerCount: number; viewCount: number } };
    };
  }> = [];

  let totalFollowers = 0;
  let totalViews = 0;

  for (const client of clients) {
    const links = client.socialLinks ?? [];

    if (includeLogs) {
      lines.push("");
      lines.push(`[client] ${client.name} (${links.length} link${links.length === 1 ? "" : "s"})`);
    }

    let scrapedFollowers = 0;
    let scrapedViews = 0;

    for (const link of links) {
      const stats = await fetchSocialStatsFromHtml(link);
      scrapedFollowers += stats.followers;
      scrapedViews += stats.views;

      if (includeLogs) {
        lines.push(
          `  - ${link.platform}: followers=${stats.followers.toLocaleString()} views=${stats.views.toLocaleString()} ${link.url}`
        );
      }
    }

    const resolvedFollowers = Math.max(scrapedFollowers, client.followerCount ?? 0);
    const resolvedViews = Math.max(scrapedViews, client.viewCount ?? 0);
    totalFollowers += resolvedFollowers;
    totalViews += resolvedViews;

    if (resolvedFollowers !== (client.followerCount ?? 0) || resolvedViews !== (client.viewCount ?? 0)) {
      bulkUpdates.push({
        updateOne: {
          filter: { id: client.id },
          update: {
            $set: {
              followerCount: resolvedFollowers,
              viewCount: resolvedViews,
            },
          },
        },
      });
    }

    if (includeLogs) {
      const mode =
        scrapedFollowers > 0 || scrapedViews > 0
          ? resolvedFollowers !== scrapedFollowers || resolvedViews !== scrapedViews
            ? "scraped + manual floor"
            : "scraped"
          : "fallback";
      lines.push(
        `  = using ${mode}: followers=${resolvedFollowers.toLocaleString()} views=${resolvedViews.toLocaleString()}`
      );
    }
  }

  if (bulkUpdates.length > 0) {
    await db.collection("clients").bulkWrite(bulkUpdates);
  }

  await settings.updateOne(
    { key: CLIENT_SOCIAL_REFRESH_KEY },
    {
      $set: {
        key: CLIENT_SOCIAL_REFRESH_KEY,
        value: refreshedAt,
      },
    },
    { upsert: true }
  );

  if (includeLogs) {
    lines.push("");
    lines.push(`[clients] Total followers=${totalFollowers.toLocaleString()}`);
    lines.push(`[clients] Total views=${totalViews.toLocaleString()}`);
    lines.push(`[clients] Refreshed at ${refreshedAt}`);
  }

  return { lines, totalFollowers, totalViews, refreshedAt };
}

export async function refreshClientSocialMetricsIfStale(): Promise<void> {
  if (clientSocialRefreshPromise) {
    await clientSocialRefreshPromise;
    return;
  }

  clientSocialRefreshPromise = runClientSocialRefresh(false, false).finally(() => {
    clientSocialRefreshPromise = null;
  });

  await clientSocialRefreshPromise;
}

export async function refreshClientSocialMetricsWithReport(): Promise<ClientSocialRefreshReport> {
  if (clientSocialRefreshPromise) {
    return clientSocialRefreshPromise;
  }

  clientSocialRefreshPromise = runClientSocialRefresh(true, true).finally(() => {
    clientSocialRefreshPromise = null;
  });

  return clientSocialRefreshPromise;
}

function parseYouTubeViewCountFromHtml(html: string): number | undefined {
  const patterns = [
    /"viewCount":"(\d+)"/i,
    /"viewCount":\{"simpleText":"([\d,]+) views"\}/i,
    /"shortViewCountText":\{"simpleText":"([\d,]+) views"\}/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;
    const parsed = Number(match[1].replace(/[^\d]/g, ""));
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return undefined;
}

async function fetchYouTubeViewCountFromHtml(videoId: string): Promise<number | undefined> {
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return undefined;

    const html = await response.text();
    return parseYouTubeViewCountFromHtml(html);
  } catch {
    return undefined;
  }
}

async function runProjectVideoRefresh(force: boolean, includeLogs: boolean): Promise<ProjectVideoRefreshReport> {
  const db = await getDb();
  const settings = db.collection("settings");
  const refreshedAt = new Date().toISOString();
  const lines = includeLogs ? ["[projects] Starting project video scan"] : [];
  const refreshDoc = await settings.findOne<{ key: string; value?: string }>({
    key: PROJECT_VIDEO_REFRESH_KEY,
  });
  const lastRefreshedAt = refreshDoc?.value ? new Date(refreshDoc.value).getTime() : 0;
  const projects = await getProjects();

  if (!force && lastRefreshedAt && Date.now() - lastRefreshedAt < PROJECT_VIDEO_REFRESH_MS) {
    const totalProjectViews = projects.reduce(
      (sum, project) =>
        sum +
        (project.videos?.reduce((videoSum, video) => videoSum + (video.viewCount ?? 0), 0) ?? 0),
      0
    );

    if (includeLogs) {
      lines.push("[projects] Skipped refresh because the cache is still fresh.");
      lines.push(`[projects] Using stored total views=${totalProjectViews.toLocaleString()}`);
    }

    return { lines, totalProjectViews, refreshedAt };
  }

  const videoIds = Array.from(
    new Set(
      projects
        .flatMap((project) => project.videos ?? [])
        .map((video) => video.youtubeId)
        .filter(Boolean)
    )
  );

  if (videoIds.length === 0) {
    await settings.updateOne(
      { key: PROJECT_VIDEO_REFRESH_KEY },
      {
        $set: {
          key: PROJECT_VIDEO_REFRESH_KEY,
          value: refreshedAt,
        },
      },
      { upsert: true }
    );

    if (includeLogs) {
      lines.push("[projects] No videos found.");
    }

    return { lines, totalProjectViews: 0, refreshedAt };
  }

  const fetchedCounts = new Map<string, number>();
  await Promise.all(
    videoIds.map(async (videoId) => {
      const count = await fetchYouTubeViewCountFromHtml(videoId);
      if (count !== undefined) {
        fetchedCounts.set(videoId, count);
      }
    })
  );

  const updates = projects
    .map((project) => {
      if (!project.videos?.length) return null;

      let changed = false;
      const nextVideos = project.videos.map((video) => {
        const fetched = fetchedCounts.get(video.youtubeId);
        if (fetched === undefined || fetched === video.viewCount) {
          return video;
        }
        changed = true;
        return { ...video, viewCount: fetched };
      });

      if (includeLogs) {
        lines.push("");
        lines.push(`[project] ${project.title}`);
        for (const video of project.videos) {
          const fetched = fetchedCounts.get(video.youtubeId);
          const resolved = fetched ?? video.viewCount ?? 0;
          lines.push(
            `  - ${video.youtubeId}: views=${resolved.toLocaleString()}${fetched === undefined ? " (unchanged)" : ""}`
          );
        }
      }

      if (!changed) return null;

      return {
        updateOne: {
          filter: { id: project.id },
          update: { $set: { videos: nextVideos } },
        },
      };
    })
    .filter(Boolean);

  if (updates.length > 0) {
    await db.collection("projects").bulkWrite(
      updates as {
        updateOne: {
          filter: { id: string };
          update: { $set: { videos: NonNullable<Project["videos"]> } };
        };
      }[]
    );
  }

  await settings.updateOne(
    { key: PROJECT_VIDEO_REFRESH_KEY },
    {
      $set: {
        key: PROJECT_VIDEO_REFRESH_KEY,
        value: refreshedAt,
      },
    },
    { upsert: true }
  );

  const totalProjectViews = projects.reduce(
    (sum, project) =>
      sum +
      (project.videos?.reduce((videoSum, video) => {
        const fetched = fetchedCounts.get(video.youtubeId);
        return videoSum + (fetched ?? video.viewCount ?? 0);
      }, 0) ?? 0),
    0
  );

  if (includeLogs) {
    lines.push("");
    lines.push(`[projects] Total views=${totalProjectViews.toLocaleString()}`);
    lines.push(`[projects] Refreshed at ${refreshedAt}`);
  }

  return { lines, totalProjectViews, refreshedAt };
}

export async function refreshProjectVideoViewsIfStale(): Promise<void> {
  if (projectVideoRefreshPromise) {
    await projectVideoRefreshPromise;
    return;
  }

  projectVideoRefreshPromise = runProjectVideoRefresh(false, false).finally(() => {
    projectVideoRefreshPromise = null;
  });

  await projectVideoRefreshPromise;
}

export async function refreshProjectVideoViewsWithReport(): Promise<ProjectVideoRefreshReport> {
  if (projectVideoRefreshPromise) {
    return projectVideoRefreshPromise;
  }

  projectVideoRefreshPromise = runProjectVideoRefresh(true, true).finally(() => {
    projectVideoRefreshPromise = null;
  });

  return projectVideoRefreshPromise;
}

export async function getProjectsByCategory(category: Category): Promise<Project[]> {
  const projects = await getProjects();
  return projects.filter((project) => project.category === category);
}

export async function getProjectsBySubcategory(subcategory: Subcategory): Promise<Project[]> {
  const projects = await getProjects();
  return projects.filter(
    (project) =>
      project.subcategory === subcategory ||
      project.extraSubcategories?.includes(subcategory)
  );
}

export async function getProjectsByClientId(clientId: string): Promise<Project[]> {
  const projects = await getProjects();
  return projects.filter((project) => project.clientIds?.includes(clientId));
}

export async function getFeaturedProjects(): Promise<Project[]> {
  const projects = await getProjects();
  return projects.filter((project) => project.featured);
}

export async function getProjectBySlug(slug: string): Promise<Project | undefined> {
  const projects = await getProjects();
  return projects.find((project) => project.slug === slug);
}

type VideoStats = {
  viewCount?: number;
  publishDate?: string;
  thumbnailUrl?: string;
  channelName?: string;
  title?: string;
};

export async function hydrateProjectVideos(project: Project): Promise<Project> {
  const videos = project.videos;
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!videos?.length || !apiKey) {
    return project;
  }

  const ids = videos.map((video) => video.youtubeId).filter(Boolean);
  if (!ids.length) return project;

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids.join(",")}&key=${apiKey}`,
      { cache: "no-store" }
    );
    if (!res.ok) return project;

    const data = (await res.json()) as {
      items?: Array<{
        id: string;
        snippet?: {
          title?: string;
          channelTitle?: string;
          publishedAt?: string;
          thumbnails?: { high?: { url?: string }; medium?: { url?: string }; default?: { url?: string } };
        };
        statistics?: { viewCount?: string };
      }>;
    };

    const statsMap = new Map<string, VideoStats>();
    for (const item of data.items ?? []) {
      statsMap.set(item.id, {
        title: item.snippet?.title,
        channelName: item.snippet?.channelTitle,
        publishDate: item.snippet?.publishedAt?.slice(0, 10),
        viewCount: item.statistics?.viewCount ? Number(item.statistics.viewCount) : undefined,
        thumbnailUrl:
          item.snippet?.thumbnails?.high?.url ??
          item.snippet?.thumbnails?.medium?.url ??
          item.snippet?.thumbnails?.default?.url,
      });
    }

    return {
      ...project,
      videos: videos.map((video) => {
        const stats = statsMap.get(video.youtubeId);
        return stats ? { ...video, ...stats, title: video.title || stats.title || "" } : video;
      }),
    };
  } catch {
    return project;
  }
}

export async function getArticles(): Promise<Article[]> {
  return readCollection<Article>("articles");
}

export async function getSortedArticles(): Promise<Article[]> {
  const articles = await getArticles();
  return [...articles].sort(
    (a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
  );
}

export async function getArticleBySlug(slug: string): Promise<Article | undefined> {
  const articles = await getArticles();
  return articles.find((article) => article.slug === slug);
}

export async function getClients(): Promise<Client[]> {
  return readCollection<Client>("clients");
}

export async function getClientById(id: string): Promise<Client | undefined> {
  const clients = await getClients();
  return clients.find((client) => client.id === id);
}

export async function getExperiences(): Promise<Experience[]> {
  return readCollection<Experience>("experiences");
}

export async function getEducations(): Promise<Education[]> {
  return readCollection<Education>("educations");
}

export async function getSkills(): Promise<Skill[]> {
  return readCollection<Skill>("skills");
}

export async function getCertifications(): Promise<Certification[]> {
  return readCollection<Certification>("certifications");
}

export async function getAwards(): Promise<Award[]> {
  return readCollection<Award>("awards");
}

export async function getClubs(): Promise<ClubMembership[]> {
  return readCollection<ClubMembership>("clubs");
}

export async function getContactSubmissions(): Promise<ContactSubmission[]> {
  const contacts = await readCollection<ContactSubmission>("contacts");
  return contacts.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getCampaigns(): Promise<Campaign[]> {
  const campaigns = await readCollection<Campaign>("campaigns");
  return campaigns.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getRizzSubmissions(): Promise<RizzSubmission[]> {
  const submissions = await readCollection<RizzSubmission>("rizz");
  return submissions.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// ─── Admin password ────────────────────────────────────────────────────────────
// Checks MongoDB settings { key: "admin_password", value: "..." }
// Falls back to ADMIN_PASSWORD env var if no DB doc exists
export async function verifyAdminPassword(plain: string): Promise<boolean> {
  try {
    const db = await getDb();
    const doc = await db.collection("settings").findOne<{ key: string; value: string }>({ key: "admin_password" });
    if (doc) return doc.value === plain;
  } catch {
    // DB unavailable — fall through to env var
  }
  // Fallback: compare against env var directly
  const envPw = process.env.ADMIN_PASSWORD;
  if (envPw) return envPw === plain;
  return false;
}

// Save helpers (replace entire collection)
export async function saveProjects(data: Project[]): Promise<void> {
  const db = await getDb();
  await db.collection("projects").deleteMany({});
  if (data.length) {
    await db.collection("projects").insertMany(data as unknown as Record<string, unknown>[]);
  }
}

export async function saveArticles(data: Article[]): Promise<void> {
  const db = await getDb();
  const featuredIds = data.filter((article) => article.featured).map((article) => article.id);
  const keepFeaturedId = featuredIds[0];
  const normalized =
    featuredIds.length <= 1
      ? data
      : data.map((article) => ({
          ...article,
          featured: article.id === keepFeaturedId,
        }));
  await db.collection("articles").deleteMany({});
  if (normalized.length) {
    await db.collection("articles").insertMany(normalized as unknown as Record<string, unknown>[]);
  }
}

export async function saveClients(data: Client[]): Promise<void> {
  const db = await getDb();
  await db.collection("clients").deleteMany({});
  if (data.length) {
    await db.collection("clients").insertMany(data as unknown as Record<string, unknown>[]);
  }
}

export async function saveExperiences(data: Experience[]): Promise<void> {
  const db = await getDb();
  await db.collection("experiences").deleteMany({});
  if (data.length) {
    await db.collection("experiences").insertMany(data as unknown as Record<string, unknown>[]);
  }
}

export async function saveEducations(data: Education[]): Promise<void> {
  const db = await getDb();
  await db.collection("educations").deleteMany({});
  if (data.length) {
    await db.collection("educations").insertMany(data as unknown as Record<string, unknown>[]);
  }
}

export async function saveSkills(data: Skill[]): Promise<void> {
  const db = await getDb();
  await db.collection("skills").deleteMany({});
  if (data.length) {
    await db.collection("skills").insertMany(data as unknown as Record<string, unknown>[]);
  }
}

export async function saveCertifications(data: Certification[]): Promise<void> {
  const db = await getDb();
  await db.collection("certifications").deleteMany({});
  if (data.length) {
    await db.collection("certifications").insertMany(data as unknown as Record<string, unknown>[]);
  }
}

export async function saveAwards(data: Award[]): Promise<void> {
  const db = await getDb();
  await db.collection("awards").deleteMany({});
  if (data.length) {
    await db.collection("awards").insertMany(data as unknown as Record<string, unknown>[]);
  }
}

export async function saveClubs(data: ClubMembership[]): Promise<void> {
  const db = await getDb();
  await db.collection("clubs").deleteMany({});
  if (data.length) {
    await db.collection("clubs").insertMany(data as unknown as Record<string, unknown>[]);
  }
}

export async function saveContactSubmissions(data: ContactSubmission[]): Promise<void> {
  const db = await getDb();
  await db.collection("contacts").deleteMany({});
  if (data.length) {
    await db.collection("contacts").insertMany(data as unknown as Record<string, unknown>[]);
  }
}

export async function saveCampaigns(data: Campaign[]): Promise<void> {
  const db = await getDb();
  await db.collection("campaigns").deleteMany({});
  if (data.length) {
    await db.collection("campaigns").insertMany(data as unknown as Record<string, unknown>[]);
  }
}

export async function saveRizzSubmissions(data: RizzSubmission[]): Promise<void> {
  const db = await getDb();
  await db.collection("rizz").deleteMany({});
  if (data.length) {
    await db.collection("rizz").insertMany(data as unknown as Record<string, unknown>[]);
  }
}
