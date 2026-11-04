"use client";

import { createContext, useContext, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

export type SlideStepInfo = { slideId: string; index: number; count: number; nextLabel: string; previousLabel: string };
type SlideStep = SlideStepInfo & { select: (index: number) => void };
const emptySteps: readonly SlideStepInfo[] = [];

export function createSlideStepController() {
  const entries = new Map<string, SlideStep>();
  const listeners = new Set<() => void>();
  let snapshot = emptySteps;
  const publish = () => {
    snapshot = [...entries.values()].map(({ slideId, index, count, nextLabel, previousLabel }) => ({ slideId, index, count, nextLabel, previousLabel }));
    listeners.forEach((notify) => notify());
  };
  return {
    subscribe(notify: () => void) { listeners.add(notify); return () => { listeners.delete(notify); }; },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => emptySteps,
    register(owner: string, step: SlideStep) {
      const old = entries.get(owner);
      entries.set(owner, step);
      if (!old || old.slideId !== step.slideId || old.index !== step.index || old.count !== step.count || old.nextLabel !== step.nextLabel || old.previousLabel !== step.previousLabel) publish();
    },
    unregister(owner: string) { if (entries.delete(owner)) publish(); },
    move(slideId: string, direction: 1 | -1) {
      const step = [...entries.values()].find((entry) => entry.slideId === slideId);
      if (!step) return false;
      const next = step.index + direction;
      if (next < 0 || next >= step.count) return false;
      step.select(next);
      return true;
    },
  };
}

type SlideStepController = ReturnType<typeof createSlideStepController>;
const SlideStepContext = createContext<{ controller: SlideStepController; slideId: string; fromEnd: boolean } | null>(null);

export function useSlideStepController() {
  const [controller] = useState(createSlideStepController);
  const steps = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getServerSnapshot);
  return { controller, steps };
}

export function SlideStepProvider({ controller, slideId, fromEnd, children }: { controller: SlideStepController; slideId: string; fromEnd: boolean; children: React.ReactNode }) {
  const value = useMemo(() => ({ controller, slideId, fromEnd }), [controller, slideId, fromEnd]);
  return <SlideStepContext.Provider value={value}>{children}</SlideStepContext.Provider>;
}

export function useManualStartIndex(count: number, enabled = true) {
  const context = useContext(SlideStepContext);
  return enabled && context?.fromEnd ? count - 1 : 0;
}

export function useManualSlideSteps({ index, count, select, enabled = true, nextLabel = "Next image", previousLabel = "Previous image" }: { index: number; count: number; select: (index: number) => void; enabled?: boolean; nextLabel?: string; previousLabel?: string }) {
  const context = useContext(SlideStepContext);
  const controller = context?.controller;
  const owner = useId();
  const selectRef = useRef(select);
  useLayoutEffect(() => { selectRef.current = select; }, [select]);
  useLayoutEffect(() => {
    if (!context) return;
    if (!enabled) { context.controller.unregister(owner); return; }
    context.controller.register(owner, { slideId: context.slideId, index, count, nextLabel, previousLabel, select: (next) => selectRef.current(next) });
  }, [context, owner, enabled, index, count, nextLabel, previousLabel]);
  useLayoutEffect(() => () => { controller?.unregister(owner); }, [controller, owner]);
}
