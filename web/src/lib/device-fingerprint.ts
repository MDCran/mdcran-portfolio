/* Client-side device fingerprint → a stable serial that survives cache/cookie clears,
   because it's derived from the device itself (GPU, canvas, screen, UA) rather than stored.
   NOTE: browsers cannot read a MAC address; this fingerprint is the privacy-safe equivalent. */

function canvasFp(): string {
  try {
    const c = document.createElement("canvas");
    c.width = 240; c.height = 60;
    const ctx = c.getContext("2d");
    if (!ctx) return "";
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60"; ctx.fillRect(10, 10, 100, 30);
    ctx.fillStyle = "#069"; ctx.fillText("MDCran·fp·Æ8🔒", 2, 15);
    ctx.fillStyle = "rgba(102,204,0,0.7)"; ctx.fillText("MDCran·fp·Æ8🔒", 4, 17);
    return c.toDataURL();
  } catch { return ""; }
}

function webglInfo(): { vendor: string; renderer: string } {
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl") || c.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return { vendor: "", renderer: "" };
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const vendor = dbg ? String(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)) : String(gl.getParameter(gl.VENDOR));
    const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
    return { vendor, renderer };
  } catch { return { vendor: "", renderer: "" }; }
}

async function sha256hex(str: string): Promise<string> {
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
  } catch {
    // Fallback FNV-1a if SubtleCrypto is unavailable (non-HTTPS).
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(16).padStart(8, "0");
  }
}

export interface Fingerprint {
  serial: string;
  gpu: string;
  screen: string;
  timezone: string;
  language: string;
  userAgent: string;
  /** prefers-color-scheme — a hardware-parity signal for cross-device stitching.
   *  Intentionally NOT part of the serial hash (it flips when the user toggles
   *  dark/light, which must not change the stable device serial). */
  colorScheme: "dark" | "light";
}

let cached: Fingerprint | null = null;

export async function computeFingerprint(): Promise<Fingerprint> {
  if (cached) return cached;
  const gl = webglInfo();
  const nav = navigator as Navigator & { deviceMemory?: number };
  const screenStr = `${screen.width}x${screen.height}@${window.devicePixelRatio}x${screen.colorDepth}`;
  const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return ""; } })();
  const colorScheme: "dark" | "light" = (() => {
    try { return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"; }
    catch { return "light"; }
  })();
  const components = [
    nav.userAgent, nav.platform, nav.language, (nav.languages || []).join(","),
    nav.hardwareConcurrency, nav.deviceMemory, screenStr, tz, gl.vendor, gl.renderer, canvasFp(),
  ].join("|");
  const serial = await sha256hex(components);
  cached = { serial, gpu: gl.renderer || gl.vendor || "", screen: screenStr, timezone: tz, language: nav.language, userAgent: nav.userAgent, colorScheme };
  return cached;
}
