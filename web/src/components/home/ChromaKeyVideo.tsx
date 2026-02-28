"use client";

import React, { useEffect, useRef } from "react";

interface ChromaKeyVideoProps {
  src: string;
  className?: string;
}

const KEY_COLOR = { r: 23, g: 203, b: 1 };
const HARD_CUTOFF = 96;
const SOFT_CUTOFF = 162;

export default function ChromaKeyVideo({ src, className }: ChromaKeyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;

    let frameId = 0;
    let cancelled = false;

    const renderFrame = () => {
      if (cancelled) return;

      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frame = context.getImageData(0, 0, canvas.width, canvas.height);
        const { data } = frame;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          const dr = r - KEY_COLOR.r;
          const dg = g - KEY_COLOR.g;
          const db = b - KEY_COLOR.b;
          const distance = Math.sqrt(dr * dr + dg * dg + db * db);
          const greenDominant = g > r * 1.12 && g > b * 1.18;

          if (!greenDominant) continue;

          if (distance <= HARD_CUTOFF) {
            data[i + 3] = 0;
            continue;
          }

          if (distance <= SOFT_CUTOFF) {
            const softness = (distance - HARD_CUTOFF) / (SOFT_CUTOFF - HARD_CUTOFF);
            // Bias the feathering to remove more of the semi-transparent green fringe.
            data[i + 3] = Math.round(data[i + 3] * softness * softness);
          }

          // Reduce green spill on edge pixels that remain partially visible.
          const reducedGreen = Math.max(r, b) + Math.abs(r - b) * 0.25;
          if (data[i + 3] > 0 && g > reducedGreen) {
            data[i + 1] = Math.round(reducedGreen);
          }

          // Extra despill on partially transparent edge pixels, especially around fingers/hair.
          if (data[i + 3] > 0 && data[i + 3] < 255) {
            const edgeGreenCap = Math.max(r, b) + 6;
            if (data[i + 1] > edgeGreenCap) {
              data[i + 1] = edgeGreenCap;
            }

            // Slightly favor the remaining RGB channels so keyed edges read cleaner.
            data[i] = Math.min(255, Math.round(data[i] * 1.03));
            data[i + 2] = Math.min(255, Math.round(data[i + 2] * 1.02));
          }
        }

        context.putImageData(frame, 0, 0);
      }

      frameId = window.requestAnimationFrame(renderFrame);
    };

    const handleLoaded = async () => {
      try {
        await video.play();
      } catch {
        // Ignore autoplay failures; the video element remains available for later playback.
      }
      frameId = window.requestAnimationFrame(renderFrame);
    };

    video.addEventListener("loadeddata", handleLoaded);

    if (video.readyState >= 2) {
      void handleLoaded();
    }

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      video.removeEventListener("loadeddata", handleLoaded);
    };
  }, [src]);

  return (
    <div className={className}>
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="absolute h-0 w-0 opacity-0 pointer-events-none"
      >
        <source src={src} type="video/mp4" />
      </video>
      <canvas ref={canvasRef} className="h-auto w-full" />
    </div>
  );
}
