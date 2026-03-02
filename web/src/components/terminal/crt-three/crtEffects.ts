// ─── CRT Effects Pipeline ─────────────────────────────────────────────────────
// EffectComposer chain: Render → UnrealBloom → Custom post composite.

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import {
  crtCompositePostFragmentShader,
  crtPassThroughVertexShader,
} from "./crtShaders";

export type CRTComposerBundle = {
  composer: EffectComposer;
  bloomPass: UnrealBloomPass;
  postPass: ShaderPass;
};

export function createCRTEffects(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  size: THREE.Vector2
): CRTComposerBundle {
  const composer = new EffectComposer(renderer);
  composer.setSize(size.x, size.y);
  composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

  composer.addPass(new RenderPass(scene, camera));

  // Bloom — lower threshold so the monitor glow and particles catch bloom too.
  // Strength is driven dynamically in the animate loop.
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(size.x, size.y),
    0.88,   // strength  (overridden per-frame)
    0.64,   // radius    — softer spread
    0.46    // threshold — lower so screen edges and particles also bloom
  );
  composer.addPass(bloomPass);

  // Composite post pass: CA, grain, vignette, colour grade, scan roll.
  const postPass = new ShaderPass(
    new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse:    { value: null },
        uResolution: { value: size.clone() },
        uTime:       { value: 0 },
        uPulse:      { value: 0 },
        uHue:        { value: 0 },
        uGlitch:     { value: 0 },
        uBloomBoost: { value: 0 },
      },
      vertexShader:   crtPassThroughVertexShader,
      fragmentShader: crtCompositePostFragmentShader,
    }),
    "tDiffuse"
  );
  composer.addPass(postPass);

  return { composer, bloomPass, postPass };
}

export function resizeCRTEffects(
  bundle: CRTComposerBundle,
  width: number,
  height: number
) {
  bundle.composer.setSize(width, height);
  bundle.composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  bundle.bloomPass.setSize(width, height);
  (bundle.postPass.uniforms.uResolution.value as THREE.Vector2).set(width, height);
}
