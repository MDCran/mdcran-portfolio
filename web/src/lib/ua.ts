/** Lightweight server-side user-agent parsing (no external deps). */

export interface ParsedUA {
  browser: string;
  os: string;
  device: "desktop" | "mobile" | "tablet" | "bot";
}

export function parseUserAgent(ua: string | null | undefined): ParsedUA {
  const s = ua ?? "";

  if (/bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless/i.test(s)) {
    return { browser: "Bot", os: "Bot", device: "bot" };
  }

  // Browser (order matters — Edge/Opera/Brave masquerade as Chrome)
  let browser = "Other";
  if (/Edg(e|A|iOS)?\//.test(s)) browser = "Edge";
  else if (/OPR\/|Opera/.test(s)) browser = "Opera";
  else if (/SamsungBrowser/.test(s)) browser = "Samsung Internet";
  else if (/Firefox\/|FxiOS/.test(s)) browser = "Firefox";
  else if (/CriOS|Chrome\//.test(s) && !/Edg|OPR/.test(s)) browser = "Chrome";
  else if (/Safari\//.test(s) && /Version\//.test(s)) browser = "Safari";

  // OS
  let os = "Other";
  if (/Windows NT/.test(s)) os = "Windows";
  else if (/iPhone|iPad|iPod/.test(s)) os = "iOS";
  else if (/Mac OS X|Macintosh/.test(s)) os = "macOS";
  else if (/Android/.test(s)) os = "Android";
  else if (/CrOS/.test(s)) os = "ChromeOS";
  else if (/Linux/.test(s)) os = "Linux";

  // Device
  let device: ParsedUA["device"] = "desktop";
  if (/iPad|Tablet/.test(s)) device = "tablet";
  else if (/Mobi|iPhone|Android.*Mobile/.test(s)) device = "mobile";

  return { browser, os, device };
}
