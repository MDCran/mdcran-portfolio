import crypto from "node:crypto";

export type GeoResult = {
  country: string;
  countryName: string;
  city?: string;
  lat: number;
  lng: number;
};

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
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,city,lat,lon`,
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
    };

    if (data.status !== "success" || !data.countryCode || !data.country) return null;

    return {
      country: data.countryCode,
      countryName: data.country,
      city: data.city,
      lat: data.lat ?? 0,
      lng: data.lon ?? 0,
    };
  } catch {
    return null;
  }
}
