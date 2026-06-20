import crypto from "node:crypto";

export type GeoResult = {
  country: string;
  countryName: string;
  city?: string;
  lat: number;
  lng: number;
  asn?: string | null;      // e.g. "AS15169"
  asnName?: string | null;  // e.g. "GOOGLE"
};

/** /24 subnet for IPv4 (first 3 octets) or /48 for IPv6 (first 3 hextets).
 *  Used as a coarse "same network" signal for cross-device stitching. */
export function subnetOf(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const cleaned = ip.replace(/^::ffff:/, "").trim();
  if (!cleaned || cleaned === "unknown") return null;
  if (cleaned.includes(".")) {
    const parts = cleaned.split(".");
    if (parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p))) {
      return parts.slice(0, 3).join(".");
    }
    return null;
  }
  if (cleaned.includes(":")) {
    const groups = cleaned.split(":").filter(Boolean);
    if (groups.length >= 3) return groups.slice(0, 3).join(":");
  }
  return null;
}

function isPrivateIp(ip: string): boolean {
  const cleaned = ip.replace(/^::ffff:/, "");
  return (
    cleaned === "127.0.0.1" ||
    cleaned === "::1" ||
    cleaned === "localhost" ||
    cleaned.startsWith("10.") ||
    cleaned.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(cleaned)
  );
}

export function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex");
}

const LOCAL_FALLBACK: GeoResult = {
  country: "US",
  countryName: "United States",
  lat: 37.09,
  lng: -95.71,
};

export async function geolocateIp(ip: string): Promise<GeoResult | null> {
  if (!ip || ip === "unknown") return null;
  if (isPrivateIp(ip)) return LOCAL_FALLBACK;

  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,city,lat,lon,as,asname`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      status: string;
      country?: string;
      countryCode?: string;
      city?: string;
      lat?: number;
      lon?: number;
      as?: string;       // "AS15169 Google LLC"
      asname?: string;   // "GOOGLE"
    };

    if (data.status !== "success" || !data.countryCode || !data.country) return null;

    // ip-api returns `as` as "AS15169 Google LLC" — keep just the AS number token.
    const asn = data.as ? (data.as.trim().split(/\s+/)[0] || null) : null;

    return {
      country: data.countryCode,
      countryName: data.country,
      city: data.city,
      lat: data.lat ?? 0,
      lng: data.lon ?? 0,
      asn: asn && /^AS\d+$/i.test(asn) ? asn.toUpperCase() : null,
      asnName: data.asname || null,
    };
  } catch {
    return null;
  }
}
