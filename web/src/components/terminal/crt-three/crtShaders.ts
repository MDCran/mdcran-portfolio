// ─── CRT Shaders ─────────────────────────────────────────────────────────────
// Cinematic, production-quality GLSL shaders for the 3D CRT terminal.

export const crtPassThroughVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const crtScreenVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// ─── Screen Fragment Shader ───────────────────────────────────────────────────
// Full CRT simulation applied to the terminal texture.
// uWarmup: 0→1 brightness/glow fade-in only (no UV distortion — terminal
//   content is always sampled at full resolution so text is always readable).
// uDegauss: 0→1 rainbow wave overlay that decays after power-on.
export const crtScreenFragmentShader = `
uniform sampler2D uTexture;
uniform vec2      uResolution;
uniform float     uTime;
uniform float     uGlow;
uniform float     uPulse;
uniform float     uPower;
uniform float     uWarmup;   // 0 = cold/off, 1 = fully warmed up
uniform float     uDegauss;  // 0 = none, >0 = degauss wave active
uniform float     uHue;      // 0-1 neon hue driver
uniform float     uGlitch;   // 0-1 glitch strength
uniform float     uBloom;    // 0-1 bloom booster

varying vec2 vUv;

// ── Noise ─────────────────────────────────────────────────────────────────────

float h11(float n) {
  return fract(sin(n) * 43758.5453123);
}
float h21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float h21b(vec2 p) {
  return fract(sin(dot(p, vec2(269.5, 183.3))) * 40379.11);
}

// ── Two-coefficient barrel warp ───────────────────────────────────────────────
vec2 barrel(vec2 uv, float k1, float k2) {
  vec2 c   = uv * 2.0 - 1.0;
  float r2 = dot(c, c);
  c *= 1.0 + k1 * r2 + k2 * r2 * r2;
  return c * 0.5 + 0.5;
}

// ── Rounded screen corners ────────────────────────────────────────────────────
float screenMask(vec2 uv, float r) {
  vec2  q = abs(uv * 2.0 - 1.0) - (1.0 - r);
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  return step(d, r);
}

// ── Radial chromatic aberration ───────────────────────────────────────────────
vec3 sampleCA(vec2 uv, float amount) {
  vec2  dir  = uv - 0.5;
  float d    = length(dir);
  vec2  norm = d > 0.001 ? dir / d : vec2(0.0);
  float mag  = amount * (0.35 + d * d * 4.0);
  float r = texture2D(uTexture, clamp(uv + norm * mag, 0.001, 0.999)).r;
  float g = texture2D(uTexture, uv).g;
  float b = texture2D(uTexture, clamp(uv - norm * mag, 0.001, 0.999)).b;
  return vec3(r, g, b);
}

// ── Degauss rainbow wave ──────────────────────────────────────────────────────
vec3 degaussOverlay(vec2 uv, float t) {
  float fade  = pow(t, 0.7);
  float freq  = 12.0 + (1.0 - t) * 8.0;
  float phase = uv.x * freq + uv.y * 6.0;
  float osc   = sin(phase + (1.0 - t) * 28.0);
  float osc2  = sin(phase * 1.6 - (1.0 - t) * 16.0 + uv.y * 5.0);
  vec3 wa = vec3(
    sin(osc  * 3.14159 + 0.00) * 0.5 + 0.5,
    sin(osc  * 3.14159 + 2.09) * 0.5 + 0.5,
    sin(osc  * 3.14159 + 4.19) * 0.5 + 0.5
  );
  vec3 wb = vec3(
    sin(osc2 * 3.14159 + 1.00) * 0.5 + 0.5,
    sin(osc2 * 3.14159 + 3.14) * 0.5 + 0.5,
    sin(osc2 * 3.14159 + 5.24) * 0.5 + 0.5
  );
  return mix(wa, wb, 0.45) * fade * 0.72;
}

void main() {
  // ── 1. Barrel distortion ────────────────────────────────────────────────────
  float k1 = 0.062 + uPulse * 0.007 + uGlitch * 0.012;
  float k2 = 0.016 + uGlitch * 0.010;
  vec2 uv = barrel(vUv, k1, k2);
  uv += (vec2(h21(vUv * 1200.0 + uTime), h21b(vUv * 800.0 - uTime)) - 0.5) * 0.0025 * uGlitch;

  // Rounded corner + out-of-bounds clip
  if (screenMask(uv, 0.09) < 0.5 || uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
    return;
  }

  // ── 2. Sample with chromatic aberration ─────────────────────────────────────
  // NOTE: No warmup UV distortion here — terminal text must always be readable.
  float caAmt = 0.0026 + uGlow * 0.0016 + uPulse * 0.005;
  caAmt += uGlitch * 0.004;
  vec3 color  = sampleCA(uv, caAmt);

  // ── 3. Scanlines ────────────────────────────────────────────────────────────
  float scanWave = sin(uv.y * uResolution.y * 0.47 * 3.14159) * 0.5 + 0.5;
  float scan     = mix(0.64, 1.0, pow(scanWave, 1.6));
  // Slow refresh-band crawl
  float bandPos   = fract(uv.y - uTime * 0.014);
  float bandShape = smoothstep(0.0, 0.05, bandPos) * smoothstep(0.10, 0.05, bandPos);
  scan *= 1.0 + bandShape * 0.036;
  color *= scan;

  // ── 4. Shadow mask (aperture grille) ────────────────────────────────────────
  vec2  fc  = uv * uResolution;
  float row = mod(floor(fc.y * 0.5), 2.0);
  float col = mod(floor(fc.x) + row * 1.5, 3.0);
  vec3 slotMask;
  if      (col < 1.0) slotMask = vec3(1.15, 0.85, 0.85);
  else if (col < 2.0) slotMask = vec3(0.85, 1.15, 0.85);
  else                slotMask = vec3(0.85, 0.85, 1.15);
  color *= mix(vec3(1.0), slotMask, clamp(0.13 + uGlow * 0.05, 0.0, 0.26));

  // ── 5. P31 phosphor bloom (green, medium persistence) ───────────────────────
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color += vec3(0.68, 1.0, 0.72) * pow(max(luma, 0.0), 2.2) * (0.07 + uGlow * 0.16 + uPulse * 0.10 + uBloom * 0.35);

  // ── 6. Phosphor persistence / burn-in ───────────────────────────────────────
  vec3  src     = texture2D(uTexture, uv).rgb;
  float persist = 0.015 + uGlow * 0.018 + uPulse * 0.038;
  persist      += uBloom * 0.025;
  color.g += src.g * persist * 0.90;
  color.r += src.g * persist * 0.18;
  color.b += src.b * persist * 0.36;
  // Central ghost
  float centrBurn = smoothstep(0.72, 0.0, length(uv - 0.5));
  color += vec3(0.014, 0.044, 0.018) * centrBurn * (0.10 + uGlow * 0.14);

  // ── 7. Multi-octave noise / static ──────────────────────────────────────────
  float n1    = h21 (vec2(uv.y * 1900.0 + uTime * 8.5,  uv.x * 1500.0 - uTime * 11.2));
  float n2    = h21b(vec2(uv.y *  940.0 - uTime * 5.3,  uv.x * 2300.0 + uTime *  7.9));
  float noise = n1 * 0.62 + n2 * 0.38;
  noise = noise * noise * 2.0 - 0.5;
  color += noise * (0.013 + uPulse * 0.017);

  // ── 8. Signal glitch bands ───────────────────────────────────────────────────
  float rowH = h11(floor(uv.y * uResolution.y) * 0.1 + floor(uTime * 1.4));
  if (rowH > 0.9968) {
    float shiftAmt = (rowH - 0.9968) * 240.0;
    float gx       = h21(vec2(rowH, uTime)) * 0.18;
    vec2  gUV      = vec2(fract(uv.x + gx), uv.y);
    color = mix(color, sampleCA(gUV, 0.014), shiftAmt);
  }

  // ── 9. Flicker (60Hz + slow drift + micro jitter) ───────────────────────────
  float hf = 1.0 - 0.009 * sin(uTime * 376.99 + uv.y * 2.8);
  float lf = 1.0 - 0.005 * sin(uTime * 2.71);
  float mf = 1.0 - 0.003 * sin(uTime * 113.0 + uv.x * 6.0);
  color *= hf * lf * mf;
  color += vec3(0.06, 0.12, 0.08) * uBloom * 0.35;

  // ── 10. Vignette + corner darkening ─────────────────────────────────────────
  vec2  vigUV = vUv * 2.0 - 1.0;
  vigUV *= vec2(0.9, 1.08);
  float vig = pow(clamp(1.0 - dot(vigUV, vigUV) * 0.34, 0.0, 1.0), 0.88);
  color *= vig;
  vec2  co   = abs(uv * 2.0 - 1.0);
  color *= mix(0.78, 1.0, smoothstep(1.18, 0.68, co.x + co.y));
  // Subtle inner-edge caustic glow
  color += vec3(0.018, 0.050, 0.024) * smoothstep(0.0, 0.08, 1.0 - max(co.x, co.y)) * uGlow;

  // ── 11. Warm-up brightness (no UV compression — text is always visible) ─────
  // On power-on, a brief bright center line flashes then fades as screen warms.
  if (uWarmup < 1.0) {
    float w     = uWarmup;
    float cl    = smoothstep(0.08, 0.0, abs(uv.y - 0.5)) * (1.0 - w);
    color += vec3(0.5, 1.0, 0.6) * cl * 1.6;   // bright green center-line flash
    // Slight oversaturation that fades as warmup completes
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    color     = mix(vec3(lum), color, 1.0 + (1.0 - w) * 0.6);
  }

  // ── 12. Degauss rainbow wash ─────────────────────────────────────────────────
  if (uDegauss > 0.001) {
    vec3 dw = degaussOverlay(uv, uDegauss);
    color   = mix(color, color + dw, min(uDegauss, 0.88));
  }

  // ── 12.5 Neon hue modulation / color bleed ─────────────────────────────
  float hue = uHue * 6.28318;
  vec3 neon = vec3(
    0.48 + 0.52 * sin(hue + 0.0),
    0.42 + 0.58 * sin(hue + 2.09),
    0.44 + 0.56 * sin(hue + 4.18)
  );
  color = mix(color, color * neon, 0.22 + uBloom * 0.30 + uPulse * 0.10);
  color += neon * 0.08 * uBloom;

  // ── 13. Power + glow modulation ─────────────────────────────────────────────
  // uPower is the main brightness gate (0=off, 1=on).
  // uWarmup multiplies in to give a brief dim-then-bright ramp on power-on.
  // At full power + full warmup → 1.0 × 1.0 = unchanged.
  color *= (0.18 + uPower * 0.82) * (0.22 + uWarmup * 0.78);
  color *= 1.0 + uGlow * 0.18 + uPulse * 0.30 + uBloom * 0.35;

  gl_FragColor = vec4(color, 1.0);
}
`;

// ─── Composite Post-Process Shader ────────────────────────────────────────────
// Applied to the full rendered scene after bloom.
export const crtCompositePostFragmentShader = `
uniform sampler2D tDiffuse;
uniform vec2      uResolution;
uniform float     uTime;
uniform float     uPulse;
uniform float     uHue;
uniform float     uGlitch;
uniform float     uBloomBoost;

varying vec2 vUv;

float h21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float h21b(vec2 p) {
  return fract(sin(dot(p, vec2(269.5, 183.3))) * 40379.11);
}

// 3-octave FBM grain
float grain(vec2 uv, float t) {
  float v = 0.0;
  float a = 0.5;
  vec2  s = vec2(100.0, 73.0);
  vec2  off = vec2(t * 0.22, 0.0);
  for (int i = 0; i < 3; i++) {
    v  += a * h21(uv + off + s);
    uv  = uv * 2.1 + s;
    a  *= 0.48;
  }
  return v;
}

void main() {
  vec2 texel = 1.0 / max(uResolution, vec2(1.0));

  // ── Scene-level chromatic aberration ───────────────────────────────────────
  vec2  dir  = vUv - 0.5;
  float d    = length(dir);
  vec2  norm = d > 0.001 ? dir / d : vec2(0.0);
  float ca   = (0.7 + uPulse * 1.1 + uGlitch * 1.6) * texel.x * (0.5 + d * d * 2.2);
  float r = texture2D(tDiffuse, vUv + norm * ca).r;
  float g = texture2D(tDiffuse, vUv).g;
  float b = texture2D(tDiffuse, vUv - norm * ca).b;
  vec3 color = vec3(r, g, b);

  // ── Film grain ─────────────────────────────────────────────────────────────
  color += (grain(vUv * uResolution * 0.42, uTime) - 0.5) * 0.020;
  color += (grain(vUv * uResolution * 1.6, uTime * 1.9) - 0.5) * 0.010 * uGlitch;

  // Rare phosphor speckle
  float sp = h21b(vUv * uResolution + floor(uTime * 22.0));
  if (sp > 0.9990) color += vec3(0.25, 0.72, 0.42) * (sp - 0.9990) * 560.0;

  // ── Horizontal scan noise ──────────────────────────────────────────────────
  float sn = h21(vec2(floor(vUv.y * uResolution.y * 0.75) * 0.06, uTime * 0.38));
  color.rg += vec2(0.007, 0.003) * sn * (0.45 + uPulse * 0.75 + uGlitch * 1.4);

  // ── Atmospheric haze lift ──────────────────────────────────────────────────
  color += vec3(0.007, 0.020, 0.009) + uPulse * vec3(0.010, 0.024, 0.012) + uBloomBoost * vec3(0.022, 0.050, 0.030);

  // ── Cinematic vignette ─────────────────────────────────────────────────────
  vec2 vv = (vUv * 2.0 - 1.0) * vec2(0.84, 0.96);
  color  *= pow(clamp(1.0 - dot(vv, vv) * 0.50, 0.0, 1.0), 0.94);

  // ── Color grade: dark phosphor terminal ────────────────────────────────────
  float hue = uHue * 6.28318;
  vec3 neon = vec3(
    0.55 + 0.45 * sin(hue + 0.0),
    0.52 + 0.48 * sin(hue + 2.09),
    0.50 + 0.50 * sin(hue + 4.18)
  );
  color   = color * 0.93 + 0.007;   // slight black lift (filmic)
  color   = mix(color, color * neon, 0.28 + uBloomBoost * 0.22 + uPulse * 0.06);
  color.g *= 1.045;                  // phosphor green warmth
  color.b  = color.b * 0.96 + 0.009; // cool blue shadows
  color    = pow(max(color, 0.0), vec3(0.94));

  // ── Slow scan-roll band ────────────────────────────────────────────────────
  float roll     = fract(vUv.y - uTime * 0.0055);
  float rollBand = smoothstep(0.0, 0.035, roll) * smoothstep(0.065, 0.035, roll);
  color += vec3(0.005, 0.014, 0.007) * rollBand * (1.0 + uBloomBoost * 0.8);

  gl_FragColor = vec4(color, 1.0);
}
`;
