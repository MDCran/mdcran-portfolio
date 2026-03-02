"use client";

import * as React from "react";
import {
  createCRTScene,
  type CRTSceneController,
  type CRTPowerState,
} from "./crt-three/crtScene";

type CRTThreeCanvasProps = {
  powerState: CRTPowerState;
  pulseTick: number;
  screenRef?: React.RefObject<HTMLElement | null>;
  className?: string;
  onSceneStateChange?: (state: "ready" | "error") => void;
};

export default function CRTThreeCanvas({
  powerState,
  pulseTick,
  screenRef,
  className,
  onSceneStateChange,
}: CRTThreeCanvasProps) {
  const mountRef = React.useRef<HTMLDivElement | null>(null);
  const sceneRef = React.useRef<CRTSceneController | null>(null);
  const startupTimerRef = React.useRef<number | null>(null);
  const powerStateRef = React.useRef(powerState);

  React.useEffect(() => {
    powerStateRef.current = powerState;
  }, [powerState]);

  React.useEffect(() => {
    const mount = mountRef.current;

    if (!mount || sceneRef.current) {
      return;
    }

    startupTimerRef.current = window.setTimeout(() => {
      const nextMount = mountRef.current;

      if (!nextMount || sceneRef.current) {
        return;
      }

      try {
        const scene = createCRTScene({
          container: nextMount,
          getScreenElement: () => screenRef?.current ?? null,
        });
        sceneRef.current = scene;
        scene.setPowerState(powerStateRef.current);
        onSceneStateChange?.("ready");
      } catch {
        sceneRef.current = null;
        onSceneStateChange?.("error");
      }
    }, 220);

    return () => {
      if (startupTimerRef.current) {
        window.clearTimeout(startupTimerRef.current);
        startupTimerRef.current = null;
      }
      sceneRef.current?.destroy();
      sceneRef.current = null;
    };
  }, [onSceneStateChange, screenRef]);

  React.useEffect(() => {
    sceneRef.current?.setPowerState(powerState);
  }, [powerState]);

  React.useEffect(() => {
    if (pulseTick <= 0) return;
    sceneRef.current?.triggerPulse(0.24);
  }, [pulseTick]);

  return <div ref={mountRef} className={className} aria-hidden />;
}
