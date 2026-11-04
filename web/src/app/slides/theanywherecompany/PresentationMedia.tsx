"use client";

/* eslint-disable @next/next/no-img-element */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useIsPresent } from "framer-motion";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { ASSET_ROOT } from "./slides";
import { useSequenceTimer } from "./useSequenceTimer";
import { usePresentationPlayback } from "./PresentationPlayback";
import { preloadPresentationImages } from "./slideMedia";
import { useManualSlideSteps, useManualStartIndex } from "./PresentationSteps";
import styles from "./presentation.module.css";

export const PresentationPreviewContext = createContext(false);

export type GalleryImage = {
  name: string;
  alt: string;
  caption: string;
  position?: string;
  contain?: boolean;
  video?: boolean;
  content?: React.ReactNode;
};

export function Photo({ name, alt, className = "", contain = false, position }: { name: string; alt: string; className?: string; contain?: boolean; position?: string }) {
  const preview = useContext(PresentationPreviewContext);
  return <img src={`${ASSET_ROOT}${name}.webp`} alt={alt} className={`${styles.photo} ${contain ? styles.contain : ""} ${className}`} style={position ? { objectPosition: position } : undefined} draggable={false} decoding="async" loading={preview ? "lazy" : undefined} />;
}

export function Clip({ name, alt, paused }: { name: string; alt: string; paused: boolean }) {
  const preview = useContext(PresentationPreviewContext);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const update = () => {
      if (paused || document.hidden) video.pause();
      else void video.play().catch(() => { /* Keep the poster when autoplay is unavailable. */ });
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => { video.pause(); document.removeEventListener("visibilitychange", update); };
  }, [paused]);
  if (preview || failed) return <Photo name={`${name}-poster`} alt={alt} />;
  return <video ref={videoRef} className={styles.clip} src={`${ASSET_ROOT}${name}.mp4`} poster={`${ASSET_ROOT}${name}-poster.webp`} autoPlay={!paused} muted loop playsInline preload="metadata" aria-label={alt || undefined} aria-hidden={alt ? undefined : true} onError={() => setFailed(true)} />;
}

export function PhotoSequence({ images, paused, label, className = "", activeIndex, onActiveChange, seconds = 6.8, showCaptions = true, advancement }: { images: GalleryImage[]; paused: boolean; label: string; className?: string; activeIndex?: number; onActiveChange?: (index: number) => void; seconds?: number; showCaptions?: boolean; advancement?: "manual" | "automatic" }) {
  const preview = useContext(PresentationPreviewContext);
  const { automaticMedia } = usePresentationPlayback();
  const automatic = !preview && (advancement ? advancement === "automatic" : automaticMedia);
  const initialIndex = useManualStartIndex(images.length, !automatic);
  const [internalActive, setInternalActive] = useState(initialIndex);
  const [localPaused, setLocalPaused] = useState(false);
  const [cycle, setCycle] = useState(0);
  const selectionVersion = useRef(0);
  const active = activeIndex ?? internalActive;
  const select = useCallback((next: number) => {
    const bounded = (next + images.length) % images.length;
    const version = ++selectionVersion.current;
    const commit = () => {
      if (selectionVersion.current !== version) return;
      if (activeIndex === undefined) setInternalActive(bounded);
      onActiveChange?.(bounded);
      setCycle((value) => value + 1);
    };
    const target = images[bounded];
    if (target.content) { commit(); return; }
    // Keep the current picture visible until the next picture or video poster is ready.
    void preloadPresentationImages([`${target.name}${target.video ? "-poster" : ""}`]).then(commit).catch(() => { /* Retain the current picture on a failed load. */ });
  }, [images, activeIndex, onActiveChange]);
  useManualSlideSteps({ index: active, count: images.length, select, enabled: !preview && (!automatic || localPaused), nextLabel: `Next image in ${label}`, previousLabel: `Previous image in ${label}` });
  useEffect(() => () => { selectionVersion.current += 1; }, []);
  const { clockRef } = useSequenceTimer({ seconds, cycleKey: `${images[active].name}:${cycle}`, paused: paused || localPaused, enabled: automatic && images.length > 1, onAdvance: () => select(active + 1) });
  useEffect(() => {
    if (preview) return;
    const next = images[(active + 1) % images.length];
    if (next.content) return;
    void preloadPresentationImages([`${next.name}${next.video ? "-poster" : ""}`]).catch(() => {});
  }, [active, images, preview]);
  return <div ref={clockRef} className={`${styles.gallery} ${className}`} role="group" aria-roledescription="image carousel" aria-label={label} data-motion={paused || localPaused ? "paused" : "playing"} data-advance={automatic ? "automatic" : "manual"}>
    <div className={`${styles.galleryViewport} ${styles.morphVisual}`}><AnimatePresence initial={false}>
      <SequenceFrame key={images[active].name} item={images[active]} index={active} paused={paused || localPaused} />
    </AnimatePresence>
      <div className={styles.galleryShade} aria-hidden="true" />
      {showCaptions && <div className={styles.galleryCaption}><p>
        <span>{String(active + 1).padStart(2, "0")}</span>{images[active].caption}
      </p></div>}
    </div>
    <div className={styles.galleryControls}>
      <div className={styles.gallerySteps}>{images.map((item, index) => <button key={item.name} type="button" aria-label={`Show ${item.caption}`} aria-pressed={active === index} onClick={() => select(index)}><span /></button>)}</div>
      {automatic && <button type="button" onClick={() => setLocalPaused((value) => !value)} aria-label={`${localPaused ? "Play" : "Pause"} ${label}`} aria-pressed={localPaused}>{localPaused ? <Play /> : <Pause />}</button>}
      <button type="button" onClick={() => select(active - 1)} aria-label={`Previous image in ${label}`}><ArrowLeft /></button>
      <button type="button" onClick={() => select(active + 1)} aria-label={`Next image in ${label}`}><ArrowRight /></button>
    </div>
  </div>;
}

export function SequenceFrame({ item, index, paused }: { item: GalleryImage; index: number; paused: boolean }) {
  const present = useIsPresent();
  return <motion.figure className={styles.galleryFrame} data-active={present} aria-hidden={!present} aria-label={`Image ${index + 1}: ${item.caption}`}
    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    exit={{ opacity: 0, transition: { delay: paused ? 0 : 1.5, duration: 0 } }}
    transition={{ duration: paused ? 0 : 1.5, ease: "easeInOut" }}>
    {item.content ?? (item.video ? <Clip name={item.name} alt={item.alt} paused={paused || !present} /> : <Photo {...item} />)}
  </motion.figure>;
}

export function AnimatedNumber({ value, decimals = 0, suffix = "", paused }: { value: number; decimals?: number; suffix?: string; paused: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (paused) { node.textContent = value.toFixed(decimals) + suffix; return; }
    let frame = 0;
    let started: number | undefined;
    const tick = (now: number) => {
      started ??= now;
      const progress = Math.min(1, (now - started) / 1800);
      const eased = 1 - Math.pow(1 - progress, 4);
      node.textContent = (value * eased).toFixed(decimals) + suffix;
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, decimals, suffix, paused]);
  return <span ref={ref}>{value.toFixed(decimals)}{suffix}</span>;
}

export function RoomInterfaceImage() {
  return <figure className={`${styles.roomVisual} ${styles.morphVisual}`}>
    <Photo name="room-model" alt="My 3D home-interface prototype: a room-by-room apartment model with lighting, climate, and device markers" />
  </figure>;
}
