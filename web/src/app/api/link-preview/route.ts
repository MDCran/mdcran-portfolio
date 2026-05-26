import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface Preview { url: string; title: string; description?: string; favicon: string; siteName?: string }

const cache = new Map<string, { at: number; data: Preview }>();
const TTL = 1000 * 60 * 60 * 6; // 6h

function isPrivateHost(host: string): boolean {
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".local")) return true;
  // Block obvious private / loopback / link-local ranges.
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  return false;
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .trim();
}

function metaContent(html: string, names: string[]): string | undefined {
  for (const name of names) {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["']`, "i");
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`, "i");
    const m = html.match(re) || html.match(re2);
    if (m?.[1]) return decode(m[1]);
  }
  return undefined;
}

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("url");
  if (!target) return Response.json({ error: "Missing url" }, { status: 400 });

  let url: URL;
  try { url = new URL(target); } catch { return Response.json({ error: "Bad url" }, { status: 400 }); }
  if (url.protocol !== "http:" && url.protocol !== "https:") return Response.json({ error: "Bad protocol" }, { status: 400 });
  if (isPrivateHost(url.hostname)) return Response.json({ error: "Blocked host" }, { status: 400 });

  const key = url.href;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return Response.json(hit.data);

  const host = url.hostname.replace(/^www\./, "");
  const favicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url.hostname)}&sz=64`;
  const fallback: Preview = { url: url.href, title: host, favicon, siteName: host };

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4500);
    const res = await fetch(url.href, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MDCranBot/1.0; +https://mdcran.com)", Accept: "text/html" },
      redirect: "follow",
    });
    clearTimeout(timer);
    const ct = res.headers.get("content-type") || "";
    if (!res.ok || !ct.includes("text/html")) {
      cache.set(key, { at: Date.now(), data: fallback });
      return Response.json(fallback);
    }
    // Read a capped slice — title/og tags live in <head>.
    const buf = await res.arrayBuffer();
    const html = new TextDecoder().decode(buf.slice(0, 120_000));

    const ogTitle = metaContent(html, ["og:title", "twitter:title"]);
    const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
    const data: Preview = {
      url: url.href,
      title: decode(ogTitle || titleTag || host).slice(0, 120) || host,
      description: metaContent(html, ["og:description", "twitter:description", "description"])?.slice(0, 200),
      siteName: metaContent(html, ["og:site_name"]) || host,
      favicon,
    };
    cache.set(key, { at: Date.now(), data });
    return Response.json(data);
  } catch {
    cache.set(key, { at: Date.now(), data: fallback });
    return Response.json(fallback);
  }
}
