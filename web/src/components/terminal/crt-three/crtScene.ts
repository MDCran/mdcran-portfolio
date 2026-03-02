// ─── CRT Scene ────────────────────────────────────────────────────────────────
// Cinematic 3D CRT terminal environment.  The actual terminal content is
// rendered as an HTML overlay on top of this Three.js canvas — the scene
// provides the 3D monitor body, atmosphere, particles, and post-processing.

import * as THREE from "three";
import { createCRTEffects, resizeCRTEffects } from "./crtEffects";
import {
  crtScreenVertexShader,
  crtScreenFragmentShader,
} from "./crtShaders";

// ─── Public Types ─────────────────────────────────────────────────────────────

export type CRTPowerState = "off" | "starting" | "on" | "stopping";

type CreateCRTSceneOptions = {
  container: HTMLElement;
  getScreenElement?: () => HTMLElement | null;
};

export type CRTSceneController = {
  destroy: () => void;
  setPowerState: (state: CRTPowerState) => void;
  triggerPulse: (amount?: number) => void;
};

// Pointer/tilt responsiveness tuning for the DOM terminal overlay.
// Higher values feel snappier; lower values feel heavier/smoother.
const CRT_POINTER_FOLLOW_LERP = 0.1;
const CRT_MONITOR_TILT_LERP = 0.1;
const CRT_MONITOR_ROLL_LERP = 0.1;

// ─── Geometry helpers ─────────────────────────────────────────────────────────

/** Convex CRT screen surface — displaces Z by a radial quadratic. */
function createCurvedScreenGeometry(w: number, h: number, segments = 48) {
  const geo = new THREE.PlaneGeometry(w, h, segments, segments);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const hw = w / 2, hh = h / 2;

  for (let i = 0; i < pos.count; i++) {
    const nx = pos.getX(i) / hw;
    const ny = pos.getY(i) / hh;
    const curve  = (nx * nx + ny * ny) * 0.072;
    const corner = Math.abs(nx * ny) * 0.013;
    pos.setZ(i, curve + corner);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

// ─── Texture helpers ──────────────────────────────────────────────────────────

function makeGlowTexture(colorA: string, colorB: string) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0,   colorA);
  g.addColorStop(0.3, colorB);
  g.addColorStop(1,   "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace  = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeGlareTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Primary diagonal glare streak
  const g = ctx.createLinearGradient(0, 0, 512, 256);
  g.addColorStop(0,    "rgba(255,255,255,0)");
  g.addColorStop(0.32, "rgba(255,255,255,0.07)");
  g.addColorStop(0.50, "rgba(210,255,248,0.22)");
  g.addColorStop(0.68, "rgba(255,255,255,0.06)");
  g.addColorStop(1,    "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 256);

  // Top-left corner caustic blob
  const g2 = ctx.createRadialGradient(60, 32, 0, 60, 32, 80);
  g2.addColorStop(0, "rgba(255,255,255,0.12)");
  g2.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, 512, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace  = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Tiny procedural noise texture for the bezel plastic surface. */
function makeBezelNoiseTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const data = ctx.createImageData(size, size);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 18 + Math.random() * 12;
    data.data[i    ] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 4);
  tex.needsUpdate = true;
  return tex;
}

// ─── Material dispose helper ──────────────────────────────────────────────────

function disposeMat(mat: THREE.Material | THREE.Material[]) {
  if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
  else mat.dispose();
}

// ─── Main factory ─────────────────────────────────────────────────────────────

export function createCRTScene({
  container,
  getScreenElement,
}: CreateCRTSceneOptions): CRTSceneController {

  // ── Renderer ──────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha:     true,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace    = THREE.SRGBColorSpace;
  renderer.toneMapping         = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = false;
  renderer.domElement.style.cssText = "width:100%;height:100%;display:block";
  renderer.domElement.dataset.crtThreeCanvas = "true";

  const size = new THREE.Vector2(
    Math.max(1, container.clientWidth),
    Math.max(1, container.clientHeight)
  );
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(size.x, size.y, false);
  container.appendChild(renderer.domElement);

  const isMobile = size.x < 900;

  // ── Scene ─────────────────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x010203, isMobile ? 0.10 : 0.065);

  // ── Camera ────────────────────────────────────────────────────────────────
  const camera = new THREE.PerspectiveCamera(28, size.x / size.y, 0.1, 60);
  camera.position.set(0, 0.22, 4.4);

  // ── Post-processing ───────────────────────────────────────────────────────
  const effects = createCRTEffects(renderer, scene, camera, size);

  // ── Textures ──────────────────────────────────────────────────────────────
  const glowTex   = makeGlowTexture("rgba(140,255,200,0.7)", "rgba(80,220,255,0.18)");
  const glareTex  = makeGlareTexture();
  const bezelNoise = makeBezelNoiseTexture();

  // ── Lighting ──────────────────────────────────────────────────────────────
  const ambient = new THREE.AmbientLight(0x6bcfaa, 0.28);
  scene.add(ambient);

  const fillLight = new THREE.PointLight(0x4dc8ff, 1.55, 14, 2);
  fillLight.position.set(2.0, 1.2, 3.0);
  scene.add(fillLight);

  const rimLight = new THREE.PointLight(0x72ffb2, 0.95, 12, 2);
  rimLight.position.set(-2.2, -0.2, 2.5);
  scene.add(rimLight);

  const backLight = new THREE.PointLight(0x3a1aff, 0.30, 8, 2);
  backLight.position.set(0, 0, -2.5);
  scene.add(backLight);

  // ── Monitor group ─────────────────────────────────────────────────────────
  const monitorGroup = new THREE.Group();
  monitorGroup.position.set(0, 0.04, 0.0);
  monitorGroup.scale.setScalar(1.22);
  scene.add(monitorGroup);

  // Main CRT body
  const shellMat = new THREE.MeshStandardMaterial({
    color:             0x0e1210,
    roughness:         0.58,
    metalness:         0.22,
    emissive:          0x04100a,
    emissiveIntensity: 0.06,
  });
  if (bezelNoise) shellMat.map = bezelNoise;
  const shell = new THREE.Mesh(new THREE.BoxGeometry(3.72, 2.64, 1.90), shellMat);
  shell.position.z = -0.38;
  monitorGroup.add(shell);

  // Front face plate
  const frontMat = new THREE.MeshStandardMaterial({
    color:     0x0b0e0c,
    roughness: 0.65,
    metalness: 0.14,
  });
  if (bezelNoise) frontMat.map = bezelNoise;
  const frontFace = new THREE.Mesh(new THREE.BoxGeometry(3.74, 2.66, 0.12), frontMat);
  frontFace.position.z = 0.55;
  monitorGroup.add(frontFace);

  // Bezel inner frame
  const bezelMat = new THREE.MeshStandardMaterial({
    color:     0x040605,
    roughness: 0.72,
    metalness: 0.10,
  });
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(3.26, 2.16, 0.18), bezelMat);
  bezel.position.z = 0.58;
  monitorGroup.add(bezel);

  // Screen black backing
  const screenBack = new THREE.Mesh(
    new THREE.PlaneGeometry(2.98, 1.80),
    new THREE.MeshBasicMaterial({ color: 0x010502, transparent: true, opacity: 0.96 })
  );
  screenBack.position.z = 0.68;
  monitorGroup.add(screenBack);

  // ── Screen mesh — phosphor glow surface ───────────────────────────────────
  // The terminal content is rendered as an HTML overlay in front of this
  // canvas; this mesh provides the green phosphor glow that bleeds around
  // the terminal edges and makes the screen look "alive".
  const terminalResolution = new THREE.Vector2(1280, 720);
  const terminalCanvas = document.createElement("canvas");
  terminalCanvas.width = terminalResolution.x;
  terminalCanvas.height = terminalResolution.y;

  const terminalTexture = new THREE.CanvasTexture(terminalCanvas);
  terminalTexture.colorSpace = THREE.SRGBColorSpace;
  terminalTexture.minFilter = THREE.LinearFilter;
  terminalTexture.magFilter = THREE.LinearFilter;
  terminalTexture.generateMipmaps = false;

  const screenUniforms = {
    uTexture: { value: terminalTexture },
    uResolution: { value: terminalResolution.clone() },
    uTime: { value: 0 },
    uGlow: { value: 0.06 },
    uPulse: { value: 0 },
    uPower: { value: 0 },
    uWarmup: { value: 0 },
    uDegauss: { value: 0 },
    uHue: { value: 0 },
    uGlitch: { value: 0 },
    uBloom: { value: 0 },
  };

  const screenMat = new THREE.ShaderMaterial({
    uniforms: screenUniforms,
    vertexShader: crtScreenVertexShader,
    fragmentShader: crtScreenFragmentShader,
    transparent: true,
    depthWrite: false,
  });
  const screen = new THREE.Mesh(createCurvedScreenGeometry(2.96, 1.78), screenMat);
  screen.position.z = 0.70;
  monitorGroup.add(screen);

  // ── Glass overlay ─────────────────────────────────────────────────────────
  const glassMat = new THREE.MeshPhysicalMaterial({
    color:               0xd0ffe8,
    transparent:         true,
    opacity:             0.06,
    roughness:           0.06,
    metalness:           0.02,
    clearcoat:           1.0,
    clearcoatRoughness:  0.06,
    envMapIntensity:     0.6,
  });
  const glass = new THREE.Mesh(createCurvedScreenGeometry(3.02, 1.84), glassMat);
  glass.position.z = 0.745;
  monitorGroup.add(glass);

  // ── Glass glare highlight ─────────────────────────────────────────────────
  const glare = glareTex
    ? new THREE.Mesh(
        new THREE.PlaneGeometry(2.96, 1.84),
        new THREE.MeshBasicMaterial({
          map:         glareTex,
          transparent: true,
          opacity:     0.12,
          blending:    THREE.AdditiveBlending,
          depthWrite:  false,
        })
      )
    : null;
  if (glare) {
    glare.position.z = 0.755;
    glare.rotation.z = -0.07;
    monitorGroup.add(glare);
  }

  // ── Bezel edge highlight strips (chamfer illusion) ────────────────────────
  const chamferMat = new THREE.MeshStandardMaterial({
    color:             0x1a2018,
    roughness:         0.42,
    metalness:         0.38,
    emissive:          0x0a1810,
    emissiveIntensity: 0.12,
  });
  const chamferT = new THREE.Mesh(new THREE.BoxGeometry(3.24, 0.055, 0.055), chamferMat);
  chamferT.position.set(0,  1.095, 0.58);
  monitorGroup.add(chamferT);
  const chamferB = chamferT.clone();
  chamferB.position.set(0, -1.095, 0.58);
  monitorGroup.add(chamferB);
  const chamferL = new THREE.Mesh(new THREE.BoxGeometry(0.055, 2.17, 0.055), chamferMat);
  chamferL.position.set(-1.64, 0, 0.58);
  monitorGroup.add(chamferL);
  const chamferR = chamferL.clone();
  chamferR.position.set(1.64, 0, 0.58);
  monitorGroup.add(chamferR);

  // ── Power LED ─────────────────────────────────────────────────────────────
  const ledMat = new THREE.MeshStandardMaterial({
    color:             0x00ff60,
    emissive:          0x00ff60,
    emissiveIntensity: 2.0,
    roughness:         0.2,
    metalness:         0.1,
  });
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), ledMat);
  led.position.set(-1.52, -1.02, 0.62);
  monitorGroup.add(led);

  const ledGlow = glowTex
    ? new THREE.Sprite(
        new THREE.SpriteMaterial({
          map:         glowTex,
          color:       0x44ff88,
          opacity:     0.55,
          transparent: true,
          depthWrite:  false,
          blending:    THREE.AdditiveBlending,
        })
      )
    : null;
  if (ledGlow) {
    ledGlow.position.copy(led.position);
    ledGlow.position.z += 0.05;
    ledGlow.scale.set(0.22, 0.22, 1);
    monitorGroup.add(ledGlow);
  }

  // ── Monitor neck + base ───────────────────────────────────────────────────
  const neckMat = new THREE.MeshStandardMaterial({ color: 0x151a18, roughness: 0.55, metalness: 0.26 });
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.17, 0.52, 20), neckMat);
  neck.position.set(0, -1.52, -0.18);
  monitorGroup.add(neck);

  const baseMat = new THREE.MeshStandardMaterial({ color: 0x101413, roughness: 0.60, metalness: 0.28 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.60, 0.75, 0.14, 28), baseMat);
  base.position.set(0, -1.82, -0.10);
  monitorGroup.add(base);

  // ── Background glow sprite ────────────────────────────────────────────────
  const bgGlow = glowTex
    ? new THREE.Sprite(
        new THREE.SpriteMaterial({
          map:         glowTex,
          color:       0x60ffb0,
          opacity:     0.16,
          transparent: true,
          depthWrite:  false,
          blending:    THREE.AdditiveBlending,
        })
      )
    : null;
  if (bgGlow) {
    bgGlow.position.set(0, 0.08, -1.4);
    bgGlow.scale.set(8.0, 5.6, 1);
    scene.add(bgGlow);
  }

  const columnGlow = glowTex
    ? new THREE.Sprite(
        new THREE.SpriteMaterial({
          map:         glowTex,
          color:       0x2affb0,
          opacity:     0.07,
          transparent: true,
          depthWrite:  false,
          blending:    THREE.AdditiveBlending,
        })
      )
    : null;
  if (columnGlow) {
    columnGlow.position.set(0, 0, -0.8);
    columnGlow.scale.set(2.2, 7.0, 1);
    scene.add(columnGlow);
  }

  // ── Dust particles (two layers) ───────────────────────────────────────────
  function makeDustLayer(count: number, spread: [number, number, number], particleSize: number, opacity: number) {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const s = i * 3;
      positions[s]     = (Math.random() - 0.5) * spread[0];
      positions[s + 1] = (Math.random() - 0.5) * spread[1];
      positions[s + 2] = -2.0 - Math.random() * spread[2];
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return new THREE.Points(geo,
      new THREE.PointsMaterial({
        color:           0x9affd2,
        size:            particleSize,
        map:             glowTex ?? undefined,
        transparent:     true,
        opacity,
        depthWrite:      false,
        blending:        THREE.AdditiveBlending,
        sizeAttenuation: true,
      })
    );
  }

  const dustCoarse = makeDustLayer(isMobile ? 60 : 110, [10, 7, 6], 0.030, 0.14);
  const dustFine   = makeDustLayer(isMobile ? 80 : 150, [8,  5, 8], 0.012, 0.22);
  scene.add(dustCoarse);
  scene.add(dustFine);

  // ── State ─────────────────────────────────────────────────────────────────
  let disposed          = false;
  let frameId           = 0;
  let elapsed           = 0;
  let lastFrameAt       = performance.now();
  let pulseStrength     = 0.14;
  let targetPower       = 0;
  let smoothedPower     = 0;
  let targetGlow        = 0.06;
  let currentGlow       = 0.06;
  let currentPowerState: CRTPowerState = "off";
  let warmup            = 0;
  let degauss           = 0;
  let neonHue           = Math.random();
  let neonHueTarget     = neonHue;
  let glitchStrength    = 0;
  let bloomBoost        = 0;
  let distortionPulse   = 0;
  let beatTimer         = 0;
  let nextBeat          = 0.65 + Math.random() * 0.75;

  const pointerTarget = new THREE.Vector2();
  const pointerSmooth = new THREE.Vector2();

  // ── Resize ────────────────────────────────────────────────────────────────
  const resize = () => {
    if (disposed) return;
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(w, h, false);
    resizeCRTEffects(effects, w, h);
  };

  const resizeObs = new ResizeObserver(resize);
  resizeObs.observe(container);

  // ── Pointer tracking ──────────────────────────────────────────────────────
  const onPointerMove = (e: PointerEvent) => {
    const r = container.getBoundingClientRect();
    if (!r.width || !r.height) return;
    pointerTarget.x =  ((e.clientX - r.left) / r.width  - 0.5) * 2;
    pointerTarget.y =  ((e.clientY - r.top)  / r.height - 0.5) * 2;
  };
  const onPointerLeave = () => pointerTarget.set(0, 0);
  window.addEventListener("pointermove",  onPointerMove,  { passive: true });
  window.addEventListener("pointerleave", onPointerLeave, { passive: true });

  // ── HTML → texture capture (terminal overlay → CanvasTexture) ───────────
  // The DOM terminal is the visible interactive surface; the 3D scene now
  // only drives lighting and motion so we avoid expensive continuous capture.

  // ── Power target logic ────────────────────────────────────────────────────
  const updatePowerTargets = () => {
    switch (currentPowerState) {
      case "off":
        targetPower = 0.04;
        targetGlow  = 0.06;
        break;
      case "starting":
        targetPower = 0.58;
        targetGlow  = 0.82;
        break;
      case "on":
        targetPower = 1;
        targetGlow  = 0.74;
        break;
      case "stopping":
        targetPower = 0.18;
        targetGlow  = 0.28;
        break;
    }
  };

  // ── Animation loop ────────────────────────────────────────────────────────
  const animate = () => {
    if (disposed) return;
    frameId = window.requestAnimationFrame(animate);

    const now   = performance.now();
    const delta = Math.min(0.05, Math.max(0.001, (now - lastFrameAt) / 1000));
    lastFrameAt = now;
    elapsed    += delta;

    pointerSmooth.lerp(pointerTarget, CRT_POINTER_FOLLOW_LERP);
    pulseStrength = Math.max(0, pulseStrength - delta * 0.38);
    smoothedPower = THREE.MathUtils.lerp(smoothedPower, targetPower, 0.052);
    currentGlow   = THREE.MathUtils.lerp(currentGlow, targetGlow + pulseStrength * 0.80, 0.072);
    warmup        = THREE.MathUtils.clamp(
      warmup + ((currentPowerState === "on" || currentPowerState === "starting") ? delta * 0.17 : -delta * 0.80),
      0, 1
    );
    degauss       = Math.max(0, degauss - delta * 0.25);

    // Neon / glitch beat scheduling (music-reactive vibe)
    beatTimer += delta;
    if (beatTimer >= nextBeat) {
      beatTimer = 0;
      nextBeat = 0.55 + Math.random() * 0.85;
      neonHueTarget = Math.random();
      glitchStrength = Math.min(1, glitchStrength + 0.45 + Math.random() * 0.35);
      bloomBoost     = Math.min(1, bloomBoost + 0.55 + Math.random() * 0.30);
      distortionPulse = Math.max(distortionPulse, 0.12 + Math.random() * 0.22);
      pulseStrength   = Math.max(pulseStrength, 0.32 + Math.random() * 0.18);
    }

    glitchStrength  = Math.max(0, glitchStrength - delta * 0.55);
    bloomBoost      = Math.max(0, bloomBoost - delta * 0.70);
    distortionPulse = Math.max(0, distortionPulse - delta * 0.80);
    neonHue         = THREE.MathUtils.lerp(neonHue, neonHueTarget, 0.08);

    // ── Monitor floating animation ────────────────────────────────────────
    monitorGroup.position.y  = 0.04 + Math.sin(elapsed * 0.88) * 0.058;
    monitorGroup.position.x  = Math.sin(elapsed * 0.31) * 0.028;
    monitorGroup.rotation.y  = THREE.MathUtils.lerp(
      monitorGroup.rotation.y, 0.08 + pointerSmooth.x * 0.20, CRT_MONITOR_TILT_LERP
    );
    monitorGroup.rotation.x  = THREE.MathUtils.lerp(
      monitorGroup.rotation.x, -0.08 - pointerSmooth.y * 0.13, CRT_MONITOR_TILT_LERP
    );
    monitorGroup.rotation.z  = THREE.MathUtils.lerp(
      monitorGroup.rotation.z, Math.sin(elapsed * 0.41) * 0.013, CRT_MONITOR_ROLL_LERP
    );

    const screenElement = getScreenElement?.();
    if (screenElement) {
      screenElement.style.setProperty(
        "--crt-dom-shift-x",
        `${monitorGroup.position.x * 20 + pointerSmooth.x * 10}px`
      );
      screenElement.style.setProperty(
        "--crt-dom-shift-y",
        `${(monitorGroup.position.y - 0.04) * 18}px`
      );
      screenElement.style.setProperty(
        "--crt-dom-rot-x",
        `${THREE.MathUtils.radToDeg(monitorGroup.rotation.x) * 0.9}deg`
      );
      screenElement.style.setProperty(
        "--crt-dom-rot-y",
        `${THREE.MathUtils.radToDeg(monitorGroup.rotation.y) * 0.9}deg`
      );
      screenElement.style.setProperty(
        "--crt-dom-rot-z",
        `${THREE.MathUtils.radToDeg(monitorGroup.rotation.z) * 0.7}deg`
      );
      screenElement.style.setProperty(
        "--crt-dom-scale",
        `${1.0 + smoothedPower * 0.006 + currentGlow * 0.004}`
      );
    }

    // ── Light animation ───────────────────────────────────────────────────
    fillLight.position.set(
      Math.sin(elapsed * 0.76) * 2.6,
      1.1 + Math.cos(elapsed * 0.62) * 0.38,
      2.8 + Math.sin(elapsed * 0.40) * 0.22
    );
    rimLight.position.set(
      -2.1 + Math.cos(elapsed * 0.50) * 0.22,
      -0.12 + Math.sin(elapsed * 0.56) * 0.20,
      2.5
    );
    fillLight.intensity = 1.55 + pulseStrength * 0.8 + currentGlow * 0.3;
    rimLight.intensity  = 0.95 + pulseStrength * 0.4;

    // ── Screen glow pulse ─────────────────────────────────────────────────
    // Emissive intensity synced with power/glow so the screen "breathes"
    screenUniforms.uGlow.value = currentGlow;

    // ── Power LED animation ───────────────────────────────────────────────
    const ledOn    = currentPowerState === "on" || currentPowerState === "starting";
    const ledPulse = ledOn ? 1.8 + Math.sin(elapsed * 1.2) * 0.4 + pulseStrength * 1.2 : 0.0;
    ledMat.emissiveIntensity = THREE.MathUtils.lerp(ledMat.emissiveIntensity, ledPulse, 0.12);
    if (ledGlow) {
      (ledGlow.material as THREE.SpriteMaterial).opacity = ledOn
        ? 0.45 + Math.sin(elapsed * 1.2) * 0.12 + pulseStrength * 0.25
        : 0.0;
    }

    // ── Particles ─────────────────────────────────────────────────────────
    dustCoarse.rotation.y += 0.00065;
    dustCoarse.rotation.x  = Math.sin(elapsed * 0.11) * 0.025;
    dustFine.rotation.y   -= 0.00048;
    dustFine.rotation.x    = Math.cos(elapsed * 0.14) * 0.018;

    // ── Background glow ───────────────────────────────────────────────────
    if (bgGlow) {
      (bgGlow.material as THREE.SpriteMaterial).opacity = 0.10 + currentGlow * 0.07;
      bgGlow.scale.set(
        6.5 + Math.sin(elapsed * 0.40) * 0.20,
        4.4 + Math.cos(elapsed * 0.36) * 0.18,
        1
      );
    }
    if (columnGlow) {
      (columnGlow.material as THREE.SpriteMaterial).opacity = 0.04 + currentGlow * 0.04;
    }

    // ── Glare parallax ────────────────────────────────────────────────────
    if (glare) {
      const gm = glare.material as THREE.MeshBasicMaterial;
      gm.opacity       = 0.08 + currentGlow * 0.035 + pulseStrength * 0.040;
      glare.position.x = Math.sin(elapsed * 0.48) * 0.055 + pointerSmooth.x * 0.038;
      glare.position.y = Math.cos(elapsed * 0.42) * 0.025 - pointerSmooth.y * 0.028;
    }

    // ── Bloom ─────────────────────────────────────────────────────────────
    screenUniforms.uTime.value    = elapsed;
    screenUniforms.uPulse.value   = pulseStrength + distortionPulse;
    screenUniforms.uPower.value   = smoothedPower;
    screenUniforms.uWarmup.value  = warmup;
    screenUniforms.uDegauss.value = degauss;
    screenUniforms.uHue.value     = neonHue;
    screenUniforms.uGlitch.value  = glitchStrength;
    screenUniforms.uBloom.value   = bloomBoost;

    effects.bloomPass.strength    = 0.68 + currentGlow * 0.48 + pulseStrength * 0.70 + bloomBoost * 1.10;
    effects.postPass.uniforms.uTime.value        = elapsed;
    effects.postPass.uniforms.uPulse.value       = pulseStrength;
    effects.postPass.uniforms.uHue.value         = neonHue;
    effects.postPass.uniforms.uGlitch.value      = glitchStrength;
    effects.postPass.uniforms.uBloomBoost.value  = bloomBoost;

    effects.composer.render();
  };

// ── Boot ──────────────────────────────────────────────────────────────────
  updatePowerTargets();
  animate();

  // ── Controller ────────────────────────────────────────────────────────────
  return {
    destroy() {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      resizeObs.disconnect();
      window.removeEventListener("pointermove",  onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      scene.traverse((obj: THREE.Object3D) => {
        const m = obj as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) disposeMat(m.material);
      });

      glowTex?.dispose();
      glareTex?.dispose();
      bezelNoise?.dispose();
      terminalTexture.dispose();
      const screenElement = getScreenElement?.();
      if (screenElement) {
        screenElement.style.removeProperty("--crt-dom-shift-x");
        screenElement.style.removeProperty("--crt-dom-shift-y");
        screenElement.style.removeProperty("--crt-dom-rot-x");
        screenElement.style.removeProperty("--crt-dom-rot-y");
        screenElement.style.removeProperty("--crt-dom-rot-z");
        screenElement.style.removeProperty("--crt-dom-scale");
      }
      effects.composer.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    },

    setPowerState(state) {
      currentPowerState = state;
      updatePowerTargets();
      pulseStrength = Math.max(
        pulseStrength,
        state === "starting" ? 0.38 : state === "stopping" ? 0.24 : 0.12
      );
      if (state === "starting") {
        warmup = 0;
        degauss = 1;
      } else if (state === "off") {
        warmup = 0;
        degauss = 0;
      }
    },

    triggerPulse(amount = 0.22) {
      pulseStrength = Math.min(1.2, pulseStrength + amount);
      bloomBoost    = Math.min(1, bloomBoost + amount * 0.9);
      glitchStrength= Math.min(1, glitchStrength + amount * 0.6);
    },
  };
}
