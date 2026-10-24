"use client";

import * as React from "react";
import { TerminalScrollMotion, terminalWheelDelta } from "@/lib/terminal-scroll";

export function useTerminalScroll(
  shellRef: React.RefObject<HTMLDivElement | null>,
  transcriptRef: React.RefObject<HTMLDivElement | null>,
  enabled: boolean,
) {
  const following = React.useRef(true);
  const progress = React.useRef(() => {});
  const followOutput = React.useCallback(() => progress.current(), []);
  const resumeFollowing = React.useCallback(() => { following.current = true; }, []);

  React.useEffect(() => {
    const shell = shellRef.current, transcript = transcriptRef.current;
    if (!enabled || !shell || !transcript) return;
    const motion = new TerminalScrollMotion();
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let lastWritten = transcript.scrollTop;
    let position = transcript.scrollTop;
    let manual = false;
    const max = () => Math.max(0, transcript.scrollHeight - transcript.clientHeight);
    const reduced = () => preference.matches || document.documentElement.dataset.motion === "reduce";
    const selection = () => Boolean(window.getSelection()?.toString());
    const stop = () => { cancelAnimationFrame(frame); frame = 0; motion.stop(); position = transcript.scrollTop; };
    const write = (top: number) => {
      // The animation owns easing; never layer the browser's smooth scrolling on top.
      transcript.scrollTo({ top, behavior: "instant" });
      position = top;
      lastWritten = transcript.scrollTop;
    };
    const tick = (now: number) => {
      frame = 0;
      if (document.hidden || (!manual && selection())) { motion.stop(); return; }
      write(motion.step(position, now, max(), reduced()));
      if (motion.target !== null) frame = requestAnimationFrame(tick);
    };
    const animate = () => {
      if (document.hidden) return;
      if (reduced()) { write(motion.step(position, performance.now(), max(), true)); return; }
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const follow = () => {
      if (!following.current || selection()) return;
      manual = false;
      motion.moveTo(max(), max());
      animate();
    };
    progress.current = follow;

    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.defaultPrevented || !event.cancelable || !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      // Preview panels, suggestions, the tour, and embedded content keep their own scrolling.
      let node = event.target instanceof Element ? event.target : null;
      if (node?.closest("textarea,select,iframe,input[type=range],input[type=number],[data-terminal-target=preview]")) return;
      while (node && node !== shell && node !== transcript) {
        if (node.scrollHeight > node.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(node).overflowY)) return;
        node = node.parentElement;
      }
      const limit = max();
      if (!limit) return;
      event.preventDefault();
      manual = true;
      const delta = terminalWheelDelta(event.deltaY, event.deltaMode, transcript.clientHeight);
      motion.wheel(position, delta, limit);
      // Disable following on the gesture, before an animation or new text can move the viewport.
      following.current = delta > 0 && motion.target !== null && motion.target >= limit - 2;
      animate();
    };
    const scroll = () => {
      if (Math.abs(transcript.scrollTop - lastWritten) < 1) return;
      // Native touch scrolling, scrollbar dragging, and keyboard navigation take over immediately.
      stop();
      following.current = max() - transcript.scrollTop <= 2;
      lastWritten = transcript.scrollTop;
    };
    const interrupt = () => { stop(); following.current = false; };
    const key = (event: KeyboardEvent) => {
      if (["PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowDown", " "].includes(event.key)) interrupt();
    };
    const visibility = () => { if (document.hidden) stop(); else follow(); };
    const resize = new ResizeObserver(follow);
    resize.observe(transcript);
    shell.addEventListener("wheel", wheel, { passive: false });
    transcript.addEventListener("scroll", scroll, { passive: true });
    transcript.addEventListener("pointerdown", interrupt, { passive: true });
    transcript.addEventListener("keydown", key);
    document.addEventListener("visibilitychange", visibility);
    follow();
    return () => {
      stop(); progress.current = () => {};
      resize.disconnect();
      shell.removeEventListener("wheel", wheel);
      transcript.removeEventListener("scroll", scroll);
      transcript.removeEventListener("pointerdown", interrupt);
      transcript.removeEventListener("keydown", key);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [enabled, shellRef, transcriptRef]);

  return { followOutput, resumeFollowing };
}
