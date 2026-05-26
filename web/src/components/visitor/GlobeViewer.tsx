"use client";

import React from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { COUNTRY_CENTROIDS } from "./countryCentroids";
import { flagEmoji } from "@/lib/flag";

export type CountryStat = {
  country: string;
  countryName: string;
  lat: number;
  lng: number;
  count: number;
};

type Props = {
  stats: CountryStat[];
  total: number;
  hideStats?: boolean;
};

// ── Texture tuning — adjust these to taste ───────────────────────────────────
const GLOBE_CONTRAST   = 110;   // CSS contrast  (%) — 100 = original, 200 = very punchy
const GLOBE_SATURATION = 110;   // CSS saturate  (%) — 100 = original, 400 = neon
const GLOBE_BRIGHTNESS = 1.508; // CSS brightness     — 1.0 = original
const GLOBE_SHARPNESS  = 0.9;   // Unsharp-mask amt   — 0 = off, 1 = strong, 2 = extreme

// ── Lat/lng → 3-D point on sphere ─────────────────────────────────────────────
function latLngToVec3(lat: number, lng: number, r = 1): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

// ── Textured globe mesh — progressive loading ─────────────────────────────────
// onStage(n): called with 1 (low), 2 (mid), 3 (full) as each quality tier loads
function buildGlobeMesh(onStage: (stage: number) => void): THREE.Mesh {
  const geo = new THREE.SphereGeometry(1, 80, 80);
  const mat = new THREE.MeshPhongMaterial({
    color: new THREE.Color(0x112233),
    specular: new THREE.Color(0x0a0a0a),
    shininess: 6,
  });

  const applyCanvas = (c: HTMLCanvasElement) => {
    const prev = mat.map;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    mat.map = tex;
    mat.color.set(0xffffff);
    mat.needsUpdate = true;
    prev?.dispose();
  };

  const drawAtScale = (img: HTMLImageElement, w: number, h: number, scale: number): HTMLCanvasElement => {
    const cw = Math.max(1, Math.floor(w / scale));
    const ch = Math.max(1, Math.floor(h / scale));
    const c = document.createElement("canvas");
    c.width = cw; c.height = ch;
    const ctx = c.getContext("2d")!;
    ctx.filter = `contrast(${GLOBE_CONTRAST}%) saturate(${GLOBE_SATURATION}%) brightness(${GLOBE_BRIGHTNESS})`;
    ctx.drawImage(img, 0, 0, cw, ch);
    return c;
  };

  const img = new Image();
  img.onload = () => {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;

    // Stage 1 — 1/8 resolution (blurry but instant once downloaded)
    applyCanvas(drawAtScale(img, w, h, 8));
    onStage(1);

    // Stage 2 — 1/2 resolution (crisp enough to read continents)
    requestAnimationFrame(() => {
      applyCanvas(drawAtScale(img, w, h, 2));
      onStage(2);

      // Stage 3 — full resolution with unsharp mask
      requestAnimationFrame(() => {
        const c = drawAtScale(img, w, h, 1);
        if (GLOBE_SHARPNESS > 0) {
          const ctx = c.getContext("2d")!;
          const blurRadius = Math.max(1, Math.ceil(GLOBE_SHARPNESS * 2));
          const blurC = document.createElement("canvas");
          blurC.width = w; blurC.height = h;
          const blurCtx = blurC.getContext("2d")!;
          blurCtx.filter = `blur(${blurRadius}px)`;
          blurCtx.drawImage(c, 0, 0);
          const orig    = ctx.getImageData(0, 0, w, h);
          const blurred = blurCtx.getImageData(0, 0, w, h);
          const out     = new ImageData(w, h);
          const s       = GLOBE_SHARPNESS;
          for (let i = 0; i < orig.data.length; i += 4) {
            out.data[i]   = Math.max(0, Math.min(255, orig.data[i]   + s * (orig.data[i]   - blurred.data[i])));
            out.data[i+1] = Math.max(0, Math.min(255, orig.data[i+1] + s * (orig.data[i+1] - blurred.data[i+1])));
            out.data[i+2] = Math.max(0, Math.min(255, orig.data[i+2] + s * (orig.data[i+2] - blurred.data[i+2])));
            out.data[i+3] = orig.data[i+3];
          }
          ctx.putImageData(out, 0, 0);
        }
        applyCanvas(c);
        onStage(3);
      });
    });
  };
  img.src = "/world.jpg";

  return new THREE.Mesh(geo, mat);
}

// ── Lat/lon grid lines ────────────────────────────────────────────────────────
function buildGridLines(): THREE.Group {
  const SEGS = 120;
  const pts: number[] = [];

  for (let lat = -80; lat <= 80; lat += 20) {
    for (let i = 0; i < SEGS; i++) {
      const l1 = (i / SEGS) * 360 - 180, l2 = ((i + 1) / SEGS) * 360 - 180;
      const a = latLngToVec3(lat, l1, 1.002), b = latLngToVec3(lat, l2, 1.002);
      pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  for (let lng = 0; lng < 360; lng += 20) {
    for (let i = 0; i < SEGS; i++) {
      const l1 = (i / SEGS) * 180 - 90, l2 = ((i + 1) / SEGS) * 180 - 90;
      const a = latLngToVec3(l1, lng, 1.002), b = latLngToVec3(l2, lng, 1.002);
      pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }

  const eqPts: number[] = [];
  for (let i = 0; i < SEGS; i++) {
    const l1 = (i / SEGS) * 360 - 180, l2 = ((i + 1) / SEGS) * 360 - 180;
    const a = latLngToVec3(0, l1, 1.003), b = latLngToVec3(0, l2, 1.003);
    eqPts.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }

  const mkLines = (data: number[], color: number, opacity: number) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(data, 3));
    return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
  };

  const group = new THREE.Group();
  group.add(mkLines(pts, 0x1a1a1a, 0.45));
  group.add(mkLines(eqPts, 0x333333, 0.6));
  return group;
}

// ── Star field ────────────────────────────────────────────────────────────────
function buildStarField(): THREE.Points {
  const N = 2000;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    const r = 9 + Math.random() * 5;
    pos[i * 3]     = r * Math.sin(p) * Math.cos(t);
    pos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
    pos[i * 3 + 2] = r * Math.cos(p);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.038, sizeAttenuation: true, transparent: true, opacity: 0.75 }));
}

// ── Country dot texture ───────────────────────────────────────────────────────
function buildDotTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const grd = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0,   "rgba(255,80,80,1)");
  grd.addColorStop(0.3, "rgba(239,66,66,0.9)");
  grd.addColorStop(0.6, "rgba(220,40,40,0.4)");
  grd.addColorStop(1,   "rgba(200,0,0,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// ── Country visitor markers ───────────────────────────────────────────────────
function buildMarkers(stats: CountryStat[], dotTex: THREE.Texture): THREE.Points {
  const positions: number[] = [];
  for (const s of stats) {
    const c = COUNTRY_CENTROIDS[s.country];
    const v = latLngToVec3(c?.lat ?? s.lat, c?.lng ?? s.lng, 1.018);
    positions.push(v.x, v.y, v.z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({
    map: dotTex,
    size: 0.06,
    sizeAttenuation: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    color: new THREE.Color(0xff5050),
  }));
}

function labelPositionsFor(stats: CountryStat[]): THREE.Vector3[] {
  return stats.map((s) => {
    const c = COUNTRY_CENTROIDS[s.country];
    return latLngToVec3(c?.lat ?? s.lat, c?.lng ?? s.lng, 1.08);
  });
}

const raycaster = new THREE.Raycaster();

// ── Component ─────────────────────────────────────────────────────────────────
export default function GlobeViewer({ stats: initialStats, total: initialTotal, hideStats }: Props) {
  const wrapRef    = React.useRef<HTMLDivElement>(null);
  const overlayRef = React.useRef<HTMLCanvasElement>(null);
  const hoveredRef = React.useRef<CountryStat | null>(null);
  const [hovered, setHovered] = React.useState<{ stat: CountryStat; x: number; y: number } | null>(null);

  const [stats, setStats] = React.useState<CountryStat[]>(initialStats);
  const [total, setTotal] = React.useState(initialTotal);
  const [loadStage, setLoadStage] = React.useState(0); // 0=downloading, 1=low, 2=mid, 3=full

  // Refs so the render loop always reads the latest values without re-running useEffect
  const statsRef         = React.useRef(stats);
  const labelPositionsRef = React.useRef<THREE.Vector3[]>(labelPositionsFor(initialStats));
  const sceneRef         = React.useRef<THREE.Scene | null>(null);
  const markersRef       = React.useRef<THREE.Points | null>(null);
  const dotTexRef        = React.useRef<THREE.Texture | null>(null);

  React.useEffect(() => { statsRef.current = stats; }, [stats]);

  // ── Poll /api/data/visitors every 30 s ────────────────────────────────────
  React.useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/data/visitors");
        if (!res.ok) return;
        const data = await res.json() as { countries: CountryStat[]; total: number };
        setStats(data.countries);
        setTotal(data.total);
      } catch { /* silently ignore */ }
    };
    const id = setInterval(() => void poll(), 30_000);
    return () => clearInterval(id);
  }, []);

  // ── Rebuild markers when stats change (after Three.js scene is alive) ──────
  React.useEffect(() => {
    const scene  = sceneRef.current;
    const dotTex = dotTexRef.current;
    if (!scene || !dotTex) return; // Three.js not yet initialised

    // Swap markers
    if (markersRef.current) {
      scene.remove(markersRef.current);
      markersRef.current.geometry.dispose();
    }
    if (stats.length > 0) {
      const m = buildMarkers(stats, dotTex);
      scene.add(m);
      markersRef.current = m;
    } else {
      markersRef.current = null;
    }

    labelPositionsRef.current = labelPositionsFor(stats);
  }, [stats]);

  // ── Three.js scene — initialised once ─────────────────────────────────────
  React.useEffect(() => {
    const wrap    = wrapRef.current;
    const overlay = overlayRef.current;
    if (!wrap || !overlay) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    Object.assign(renderer.domElement.style, {
      position: "absolute", inset: "0", width: "100%", height: "100%", display: "block",
    });
    wrap.appendChild(renderer.domElement);

    // Scene / camera / lights
    const scene  = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
    camera.position.set(0, 0, 2.8);
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(5, 3, 5);
    scene.add(dir);

    scene.add(buildStarField());
    scene.add(buildGlobeMesh(setLoadStage));
    scene.add(buildGridLines());

    // Initial markers
    const dotTex = buildDotTexture();
    dotTexRef.current = dotTex;
    if (initialStats.length > 0) {
      const m = buildMarkers(initialStats, dotTex);
      scene.add(m);
      markersRef.current = m;
    }

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan     = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance   = 1.55;
    controls.maxDistance   = 5.5;
    controls.autoRotate      = true;
    controls.autoRotateSpeed = 0.35;
    controls.addEventListener("start", () => { controls.autoRotate = false; });
    controls.addEventListener("end",   () => { controls.autoRotate = true;  });

    // Overlay canvas
    const oc = overlay.getContext("2d")!;

    // Resize
    const resize = () => {
      const w = wrap.clientWidth, h = wrap.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio, 2);
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      overlay.width        = w * dpr;
      overlay.height       = h * dpr;
      overlay.style.width  = `${w}px`;
      overlay.style.height = `${h}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    // Hover
    raycaster.params.Points = { threshold: 0.07 };
    const mouse = new THREE.Vector2();
    const onMouseMove = (e: MouseEvent) => {
      const markers = markersRef.current;
      if (!markers) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.set(
        ((e.clientX - rect.left) / rect.width)  *  2 - 1,
        -((e.clientY - rect.top)  / rect.height) *  2 + 1
      );
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObject(markers);
      const s = (hits.length > 0 && hits[0].index !== undefined)
        ? (statsRef.current[hits[0].index] ?? null)
        : null;
      hoveredRef.current = s;
      setHovered(s ? { stat: s, x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
    };
    renderer.domElement.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("mouseleave", () => { hoveredRef.current = null; setHovered(null); });

    // Render loop
    const camPos = new THREE.Vector3();
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);

      const dpr = Math.min(window.devicePixelRatio, 2);
      const cw = overlay.width, ch = overlay.height;
      oc.clearRect(0, 0, cw, ch);
      camera.getWorldPosition(camPos);
      const camDir = camPos.clone().normalize();

      const liveStats = statsRef.current;
      const labelPos  = labelPositionsRef.current;
      for (let i = 0; i < liveStats.length; i++) {
        const s  = liveStats[i];
        const wp = labelPos[i] ?? latLngToVec3(s.lat, s.lng, 1.08);

        const facing = camDir.dot(wp.clone().normalize());
        if (facing < 0.08) continue;
        const alpha = Math.min((facing - 0.08) / 0.22, 1);

        const proj = wp.clone().project(camera);
        const sx = ((proj.x + 1) / 2) * cw;
        const sy = (-(proj.y - 1) / 2) * ch;

        const label    = s.count.toLocaleString();
        const fontSize = Math.round((10 + Math.min(Math.log2(s.count + 1) * 1.4, 7)) * dpr);

        oc.save();
        oc.globalAlpha   = alpha * 0.95;
        oc.font          = `700 ${fontSize}px 'JetBrains Mono', monospace`;
        oc.textAlign     = "center";
        oc.textBaseline  = "middle";
        oc.shadowColor   = "#ef4242";
        oc.shadowBlur    = 9 * dpr;
        oc.fillStyle     = "#ef4242";
        oc.fillText(label, sx, sy);
        oc.shadowBlur    = 0;
        oc.fillStyle     = "#ffffff";
        oc.fillText(label, sx, sy);
        oc.restore();
      }
    };
    animate();

    return () => {
      sceneRef.current   = null;
      markersRef.current = null;
      dotTexRef.current  = null;
      cancelAnimationFrame(animId);
      ro.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("mousemove", onMouseMove);
      renderer.dispose();
      dotTex.dispose();
      if (wrap.contains(renderer.domElement)) wrap.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // scene created once

  const topCountries = stats.slice(0, 8);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* Three.js mount + overlay */}
      <div ref={wrapRef} style={{ position: "absolute", inset: 0 }}>
        <canvas ref={overlayRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10 }} />
        {hovered && (
          <div
            style={{
              position: "absolute",
              left: hovered.x + 16,
              top:  hovered.y - 16,
              zIndex: 20,
              pointerEvents: "none",
              background: "rgba(4,10,18,0.95)",
              border: "1px solid rgba(239,66,66,0.45)",
              borderRadius: 6,
              padding: "5px 12px",
              fontSize: 12,
              fontFamily: "'JetBrains Mono', monospace",
              color: "#fff",
              whiteSpace: "nowrap",
              boxShadow: "0 0 18px rgba(239,66,66,0.18)",
            }}
          >
            <span style={{ marginRight: 6 }}>{flagEmoji(hovered.stat.country)}</span>
            <span style={{ color: "#ef4242" }}>{hovered.stat.countryName}</span>
            <span style={{ color: "rgba(255,255,255,0.4)", marginLeft: 8 }}>
              {hovered.stat.count.toLocaleString()} visitor{hovered.stat.count !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Map load progress — bottom-right */}
      {loadStage < 3 && (
        <div
          style={{
            position: "absolute",
            bottom: 24,
            right: 24,
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: "rgba(255,255,255,0.35)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#ef4242",
              animation: "pulse 1s ease-in-out infinite",
            }}
          />
          {loadStage === 0 ? "Loading map…" : loadStage === 1 ? "Enhancing…" : "Sharpening…"}
          <span style={{ color: "rgba(255,255,255,0.18)" }}>
            {loadStage}/3
          </span>
        </div>
      )}

      {/* Stats panel — bottom-left */}
      {!hideStats && (
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: 24,
          zIndex: 20,
          background: "rgba(4,10,18,0.55)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 10,
          padding: "16px 20px",
          minWidth: 210,
          fontFamily: "'JetBrains Mono', monospace",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 2 }}>
          Visitors
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, color: "#ef4242", lineHeight: 1, marginBottom: 12 }}>
          {total.toLocaleString()}
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 4 }}>
          Top Countries
        </div>
        {topCountries.length === 0 && (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>No data yet</div>
        )}
        {topCountries.map((s, i) => (
          <div key={s.country} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
            <span style={{ color: "rgba(255,255,255,0.25)", width: 16, textAlign: "right" }}>{i + 1}</span>
            <span style={{ fontSize: 14, lineHeight: 1 }}>{flagEmoji(s.country)}</span>
            <span style={{ color: "rgba(255,255,255,0.65)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {s.countryName}
            </span>
            <span style={{ color: "#ef4242", fontWeight: 600 }}>{s.count.toLocaleString()}</span>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
