"use client";

/* The photos are already optimized local WebP assets; native media avoids a second
   image service request and makes the presentation usable on a slow connection. */
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Expand, Grid2X2, HelpCircle, Minimize, NotebookPen, Pause, Play, Settings2, X } from "lucide-react";
import { ASSET_ROOT, creators, formatTime, slideIndexFromHash, slides } from "./slides";
import { AnimatedNumber, Clip, Photo, PhotoSequence, PresentationPreviewContext, RoomInterfaceImage } from "./PresentationMedia";
import { CreatorSequence, CurrentComputer, FutureEvents, MakerWorkshop, SplitFlapProject, TechnicalHome, WeekendCollage } from "./PresentationScenes";
import { BrandMark } from "./PresentationBrand";
import { ViewsBackdrop } from "./ViewsBackdrop";
import { BikingPlaces, HeatStory, HiltonHeadStory, OriginStory, StoryTimeline } from "./PersonalStory";
import { PresentationPlaybackContext, usePlaybackPreferences } from "./PresentationPlayback";
import { useSequenceTimer } from "./useSequenceTimer";
import { AfterDark, EverydayAI, ThankYou } from "./ClosingScenes";
import styles from "./presentation.module.css";
import "./transitions.css";

const dissolvePairs = [["minecraft", "creators"], ["hilton-head", "biking"], ["drones", "photo-album"], ["cars", "air-shows"], ["weekend", "thanks"]];
const dissolveImages: Record<string, string[]> = {
  minecraft: ["minecraft-monopoly"], creators: creators.map(([id]) => `creator-${id}`),
  "hilton-head": ["salty-dog-marina-official", "hilton-childhood-deer", "hilton-childhood-dock"], biking: [],
  drones: ["causeway", "dji-logo"], "photo-album": ["mangroves", "ucf", "watercraft", "inlet", "drone-building"],
  cars: ["car-meet", "classic-car"], "air-shows": ["air-show-poster", "blue-angels", "air-pass-poster"],
  weekend: ["cheesecake", "mangroves", "garden-lake", "coastal-bike-generated", "weekend-sports-generated"], thanks: [],
};
const keyboardShortcuts = [
  { action: "Next", keys: ["→", "Space"] },
  { action: "Previous", keys: ["←"] },
  { action: "Full screen", keys: ["F"] },
  { action: "Slide overview", keys: ["O"] },
  { action: "Notes & timer", keys: ["N"] },
  { action: "Pause / play animation", keys: ["M"] },
  { action: "First / last slide", keys: ["Home", "End"] },
  { action: "Close panel", keys: ["Esc"] },
];

function Label({ children }: { children: React.ReactNode }) { return <p className={styles.label}>{children}</p>; }

function SlideContent({ id, paused, airFavoritesRevealed, makerProjectRevealed, afterDarkStep }: { id: string; paused: boolean; airFavoritesRevealed: boolean; makerProjectRevealed: boolean; afterDarkStep: number }) {
  switch (id) {
    case "hello": return <div className={styles.cover}>
      <Photo name="skyway" alt="My aerial photograph of the Sunshine Skyway Bridge over blue water" className={styles.morphVisual} />
      <div className={styles.coverShade} />
      <div className={styles.coverCopy}><Label>Michael Cran</Label><h1>A little<br />about <em>me.</em></h1><p>Games, gadgets, family<br />& time outside.</p></div>
      <div className={styles.coverPreparedFor}><span>Prepared for</span><div><Photo name="anywhere-company-logo" alt="The Anywhere Company" contain /></div></div>
    </div>;
    case "soccer-field": return <OriginStory paused={paused} />;
    case "miami-heat": return <HeatStory />;
    case "minecraft": return <div className={styles.minecraftCinema}>
      <div className={styles.minecraftCinemaCopy}><Label>Minecraft</Label><blockquote className={styles.minecraftQuote}><span aria-hidden="true">“</span><h2>A computer is<br />only limited<br />by its user.</h2></blockquote><p>An idea becomes a world.<br />A world becomes something we share.</p></div>
      <PhotoSequence paused={paused} seconds={7} label="Minecraft worlds" showCaptions={false} images={[
        { name: "minecraft-monopoly", alt: "", caption: "Monopoly, reimagined" },
        { name: "minecraft-mario", alt: "", caption: "A familiar world, rebuilt in blocks" },
        { name: "minecraft-board", alt: "", caption: "Make the world. Make the rules." },
      ]} />
      <StoryTimeline step={2} />
    </div>;
    case "creators": return <CreatorSequence paused={paused} />;
    case "shared": return <div className={styles.numbers}>
      <ViewsBackdrop paused={paused} />
      <div className={styles.numbersCopy}><Label>Made to be shared</Label><h2 aria-label="73.6 million plus views"><span aria-hidden="true"><AnimatedNumber value={73.6} decimals={1} suffix="M" paused={paused} /><sup>+</sup></span></h2><p>views on videos<br />featuring my work.</p><div className={styles.statRow}><strong aria-label="55 published projects"><span aria-hidden="true"><AnimatedNumber value={55} paused={paused} /></span></strong><span>projects<br />published</span></div></div>
      <PhotoSequence paused={paused} seconds={6.5} label="Selected published work" images={[
        { name: "minecraft-monopoly", alt: "My Monopoly Minecraft map for PopularMMOs", caption: "Worlds to play in" },
        { name: "project-event", alt: "The Snow Brawl 2021 community event from my portfolio", caption: "Events to be part of" },
        { name: "project-artwork", alt: "Creator thumbnail artwork from my published portfolio", caption: "Artwork that tells the story" },
        { name: "project-software", alt: "My portfolio website project", caption: "Interfaces to explore" },
        { name: "playlist-thumbnails", alt: "Collage of all 21 video thumbnails in the Minecraft Projects YouTube playlist", caption: "Minecraft Projects · the full playlist" },
      ]} />
    </div>;
    case "chicago": return <div className={`${styles.chicago} ${styles.light}`}>
      <div className={styles.chicagoCopy}><Label>A place I love coming back to</Label><h2>Back to Chicago.<br /><em>Back to family.</em></h2><p>The people I go to see.<br />The city I love to revisit.</p></div>
      <PhotoSequence paused={paused} label="Chicago photographs" className={styles.chicagoPhotos} showCaptions={false} images={[
        { name: "chicago-skyline", alt: "", caption: "Back in the city", position: "center 66%" },
        { name: "chicago-alley", alt: "", caption: "Good food, tucked-away places" },
        { name: "chicago-house", alt: "", caption: "The familiar places", position: "center 60%" },
        { name: "chicago-aerial", alt: "", caption: "One last look at Lake Michigan", position: "center 70%" },
      ]} />
    </div>;
    case "hilton-head": return <HiltonHeadStory />;
    case "biking": return <BikingPlaces paused={paused} />;
    case "drones": return <div className={styles.drone}>
      <Photo name="causeway" alt="" className={styles.morphVisual} /><div className={styles.droneShade} /><div className={styles.droneCopy}><Label>Flying my two drones</Label><h2>A different<br />point of <em>view.</em></h2><p>The same world.<br />A little more perspective.</p><Photo name="dji-logo" alt="" contain className={styles.droneLogo} /></div>
    </div>;
    case "photo-album": return <div className={styles.album}>
      <header><Label>Through my lens</Label><h2>A few favorites <em>from above.</em></h2></header>
      <PhotoSequence paused={paused} advancement="manual" label="Drone photographs" className={styles.albumGallery} images={[
        { name: "mangroves", alt: "", caption: "Cockroach Bay" },
        { name: "ucf", alt: "", caption: "UCF Reflection Pond", position: "center 60%" },
        { name: "watercraft", alt: "", caption: "Out on the water" },
        { name: "inlet", alt: "", caption: "The inlet" },
        { name: "drone-building", alt: "", caption: "Total destruction" },
      ]} />
    </div>;
    case "cars": return <div className={styles.cars}>
      <div className={`${styles.carsMain} ${styles.morphVisual}`}><Photo name="car-meet" alt="Customized cars at a meet outside Ford's Garage" /><div className={styles.carsCopy}><Label>Car meets</Label><h2>A growing<br />curiosity.</h2></div></div><figure><Photo name="classic-car" alt="A red classic car I photographed at a show" /><figcaption>Through friends & air shows.</figcaption></figure>
    </div>;
    case "air-shows": return <div className={styles.air}>
      <header><Label>Air shows</Label><h2>And sometimes, <em>look up.</em></h2></header>
      <div className={styles.airMedia}>
        <Clip name="air-show" alt="My silent video of a formation flying overhead" paused={paused} />
        <div className={styles.airPhoto}><Photo name="blue-angels" alt="Blue Angels aircraft lined up at an air show I attended" />
          <AnimatePresence>{airFavoritesRevealed && <motion.div className={styles.airFocusReveal}
            initial={paused ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: paused ? 0 : .45 }}>
            <motion.div className={styles.airFocusFrame} aria-hidden="true"
              initial={paused ? false : { opacity: 0, scale: 1.08 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: paused ? 0 : 1.1, ease: [.22, 1, .36, 1] }}>
              <i /><i /><i /><i />
            </motion.div>
            <svg className={styles.airFocusLeader} viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true" focusable="false">
              <motion.path d="M750 230 L750 330 L575 575" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
                initial={paused ? false : { pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: .8 }} transition={{ duration: paused ? 0 : 1, delay: paused ? 0 : .25, ease: [.4, 0, .2, 1] }} />
              <motion.g initial={paused ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: paused ? 0 : .5, delay: paused ? 0 : .75 }}>
                <circle cx="575" cy="575" r="5" fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" /><circle cx="575" cy="575" r="1.7" fill="currentColor" />
              </motion.g>
            </svg>
            <motion.div className={styles.airFavoriteTag} role="status"
              initial={paused ? false : { y: 10, scale: .98 }} animate={{ y: 0, scale: 1 }} transition={{ duration: paused ? 0 : .7, ease: [.22, 1, .36, 1] }}>
              <span>My favorite performers</span><strong>Blue Angels</strong><small>followed by Thunderbirds</small>
            </motion.div>
          </motion.div>}</AnimatePresence>
        </div>
        <Clip name="air-pass" alt="My silent close pass video from the air show" paused={paused} />
      </div>
    </div>;
    case "tech-events": return <FutureEvents />;
    case "collection": return <div className={styles.collection}>
      <Photo name="retro-tech" alt="A collection of handheld game consoles, music players, and mobile phones" className={styles.morphVisual} /><div className={styles.collectionCopy}><Label>My tech hobbies</Label><h2>Collecting old.<br />Building new.</h2><p>Game Boys. iPods. Cameras.</p></div>
    </div>;
    case "pc": return <CurrentComputer paused={paused} />;
    case "smart-home": return <TechnicalHome paused={paused} />;
    case "room-idea": return <div className={`${styles.room} ${styles.light}`}>
      <div className={styles.roomCopy}><p className={`${styles.label} ${styles.appleEyebrow}`}><BrandMark name="apple" />Tinkering with Apple development</p><h2>Creating<br />a better<br /><em>Interface</em></h2><p className={styles.roomLidar}>iPhone + LiDAR.</p><p className={styles.roomPurpose}>AI-assisted iOS development<br />to make my smart home better.</p></div>
      <RoomInterfaceImage />
      <ol><li><span>01</span><div>Scan with iPhone<p>LiDAR captures the room</p></div></li><li><span>02</span><div>Build & test in iOS<p>Apple development · TestFlight</p></div></li><li><span>03</span><div>Better home controls<p>Bring it back to Home Assistant</p></div></li></ol>
    </div>;
    case "making": return <MakerWorkshop paused={paused} projectRevealed={makerProjectRevealed} />;
    case "split-flap": return <SplitFlapProject />;
    case "weekend": return <WeekendCollage paused={paused} />;
    case "thanks": return <EverydayAI />;
    case "after-dark": return <AfterDark paused={paused} step={afterDarkStep} />;
    case "thank-you": return <ThankYou paused={paused} />;
    default: return null;
  }
}

export default function PersonalPresentation() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [nativeMorph, setNativeMorph] = useState(false);
  const activeTransition = useRef<ViewTransition | null>(null);
  const navigationVersion = useRef(0);
  const reduceMotion = useReducedMotion();
  const [overview, setOverview] = useState(false);
  const [notes, setNotes] = useState(false);
  const [help, setHelp] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { preferences, setAutomaticMedia, setAutomaticSlides } = usePlaybackPreferences();
  const { automaticSlides } = preferences;
  const [paused, setPaused] = useState(false);
  const [airFavoritesRevealed, setAirFavoritesRevealed] = useState(false);
  const [makerProjectRevealed, setMakerProjectRevealed] = useState(false);
  const [afterDarkStep, setAfterDarkStep] = useState(0);
  const makerRevealVersion = useRef(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [status, setStatus] = useState("");
  const deckRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<number | null>(null);
  const overviewButton = useRef<HTMLButtonElement>(null);
  const helpButton = useRef<HTMLButtonElement>(null);
  const settingsButton = useRef<HTMLButtonElement>(null);
  const slide = slides[index];
  const runtime = slides.reduce((total, item) => total + item.seconds, 0);
  const motionPaused = paused || Boolean(reduceMotion) || overview || help || notes || settingsOpen;
  const revealCount = slide.id === "air-shows" || slide.id === "making" ? 1 : slide.id === "after-dark" ? 2 : 0;
  const currentReveal = slide.id === "air-shows" ? Number(airFavoritesRevealed) : slide.id === "making" ? Number(makerProjectRevealed) : slide.id === "after-dark" ? afterDarkStep : 0;
  const pendingReveal = currentReveal < revealCount;
  const timedSlideAdvance = !["creators", "photo-album", "smart-home", "making", "weekend"].includes(slide.id) && (index < slides.length - 1 || pendingReveal);
  const stepSeconds = pendingReveal ? (slide.id === "after-dark" ? afterDarkStep === 0 ? 10 : 12 : 8) : slide.seconds - (slide.id === "after-dark" ? 22 : revealCount * 8);
  const nextLabel = slide.id === "air-shows" && !airFavoritesRevealed ? "Next: reveal favorite performers" : slide.id === "making" && !makerProjectRevealed ? "Next: reveal 3D printing and the split-flap board" : slide.id === "after-dark" && afterDarkStep === 0 ? "Next: reveal AI usage and automation" : slide.id === "after-dark" && afterDarkStep === 1 ? "Next: reveal the n8n workflow" : "Next slide";
  const backLabel = slide.id === "air-shows" && airFavoritesRevealed ? "Previous: hide favorite performers" : slide.id === "making" && makerProjectRevealed ? "Previous: return to laser engraving" : slide.id === "after-dark" && afterDarkStep > 0 ? "Previous: earlier after-hours reveal" : "Previous slide";

  const go = useCallback((next: number) => {
    const bounded = Math.max(0, Math.min(slides.length - 1, next));
    if (bounded === index) return;
    const requestVersion = ++navigationVersion.current;
    makerRevealVersion.current += 1;
    const dissolve = dissolvePairs.some(([from, to]) => (slides[index].id === from && slides[bounded].id === to) || (slides[index].id === to && slides[bounded].id === from));
    const update = () => {
      setDirection(bounded >= index ? 1 : -1);
      setIndex(bounded);
      setAirFavoritesRevealed(false);
      setMakerProjectRevealed(slides[bounded].id === "making" && bounded < index);
      setAfterDarkStep(slides[bounded].id === "after-dark" && bounded < index ? 2 : 0);
      setOverview(false);
      setSettingsOpen(false);
      setStatus("");
      window.history.replaceState(null, "", `#${slides[bounded].id}`);
    };
    const start = () => {
      if (navigationVersion.current !== requestVersion) return;
      activeTransition.current?.skipTransition();
      if (nativeMorph && !reduceMotion && !paused && !overview && !help && !notes && !settingsOpen) {
        try {
          if (deckRef.current) deckRef.current.dataset.transitionStyle = dissolve ? "soft-dissolve" : "standard";
          const transition = document.startViewTransition({ types: dissolve ? ["anywhere-slide", "anywhere-dissolve"] : ["anywhere-slide"], update: () => flushSync(update) });
          activeTransition.current = transition;
          if (deckRef.current) deckRef.current.dataset.transitionStatus = "preparing";
          void transition.ready.then(() => {
            if (activeTransition.current === transition && deckRef.current) deckRef.current.dataset.transitionStatus = "running";
          }).catch(() => {
            if (activeTransition.current === transition && deckRef.current) deckRef.current.dataset.transitionStatus = "skipped";
          });
          void transition.finished.finally(() => {
            if (activeTransition.current === transition) {
              if (deckRef.current?.dataset.transitionStatus === "running") deckRef.current.dataset.transitionStatus = "complete";
              if (deckRef.current) delete deckRef.current.dataset.transitionStyle;
              activeTransition.current = null;
            }
          }).catch(() => {});
        } catch {
          if (deckRef.current) delete deckRef.current.dataset.transitionStyle;
          update();
        }
      } else update();
    };
    // Keep the current composition intact until all destination images are ready.
    if (dissolve) {
      void Promise.allSettled((dissolveImages[slides[bounded].id] ?? []).map((name) => {
        const image = new Image();
        image.src = `${ASSET_ROOT}${name}.webp`;
        return image.decode();
      })).then(start);
    } else start();
  }, [index, nativeMorph, reduceMotion, paused, overview, help, notes, settingsOpen]);

  const advance = useCallback(() => {
    if (slides[index].id === "air-shows" && !airFavoritesRevealed) setAirFavoritesRevealed(true);
    else if (slides[index].id === "making" && !makerProjectRevealed) {
      const version = ++makerRevealVersion.current;
      setStatus("");
      void Promise.all(["desktop-3d-printer-generated", "airport-split-flap-board-generated"].map((name) => {
        const image = new Image();
        image.src = `${ASSET_ROOT}${name}.webp`;
        return image.decode();
      })).then(() => {
        if (version === makerRevealVersion.current) setMakerProjectRevealed(true);
      }).catch(() => {
        if (version === makerRevealVersion.current) setStatus("The next images couldn’t load. Press Next to try again.");
      });
    }
    else if (slides[index].id === "after-dark" && afterDarkStep < 2) setAfterDarkStep((value) => value + 1);
    else go(index + 1);
  }, [index, airFavoritesRevealed, makerProjectRevealed, afterDarkStep, go]);

  const back = useCallback(() => {
    if (slides[index].id === "air-shows" && airFavoritesRevealed) setAirFavoritesRevealed(false);
    else if (slides[index].id === "making" && makerProjectRevealed) setMakerProjectRevealed(false);
    else if (slides[index].id === "after-dark" && afterDarkStep > 0) setAfterDarkStep((value) => value - 1);
    else go(index - 1);
  }, [index, airFavoritesRevealed, makerProjectRevealed, afterDarkStep, go]);

  const { clockRef: slideClockRef, remainingRef: slideRemainingRef } = useSequenceTimer({
    seconds: stepSeconds,
    cycleKey: `${slide.id}:${currentReveal}`,
    paused: motionPaused,
    enabled: automaticSlides && timedSlideAdvance,
    onAdvance: advance,
  });

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (deckRef.current?.requestFullscreen) await deckRef.current.requestFullscreen();
      else setStatus("Use your browser’s full-screen control to present.");
    } catch { setStatus("Full screen was unavailable. You can still present in this window."); }
  }, []);

  useEffect(() => {
    setNativeMorph(typeof document.startViewTransition === "function");
    const readHash = () => { navigationVersion.current += 1; makerRevealVersion.current += 1; setIndex(slideIndexFromHash(window.location.hash)); setAirFavoritesRevealed(false); setMakerProjectRevealed(false); setAfterDarkStep(0); };
    readHash();
    window.addEventListener("hashchange", readHash);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) setPaused(true);
    const motionChange = () => { if (motion.matches) setPaused(true); };
    motion.addEventListener("change", motionChange);
    const fullscreenChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", fullscreenChange);
    return () => { navigationVersion.current += 1; makerRevealVersion.current += 1; window.removeEventListener("hashchange", readHash); motion.removeEventListener("change", motionChange); document.removeEventListener("fullscreenchange", fullscreenChange); };
  }, []);

  useEffect(() => {
    if (!timerRunning) return;
    const started = Date.now() - elapsed * 1000;
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
    // Keep the same clock origin until the timer is paused or resumed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerRunning]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.target instanceof Element && (event.target.closest('[contenteditable="true"]') || (event.target.closest("button, a, select") && (event.key === " " || event.key === "Enter")))) return;
      if (event.key === "Escape") { setOverview(false); setHelp(false); setNotes(false); setSettingsOpen(false); if (settingsOpen) settingsButton.current?.focus(); return; }
      if (settingsOpen) return;
      if (event.key.toLowerCase() === "o") { event.preventDefault(); setHelp(false); setOverview((value) => !value); return; }
      if (event.key === "?") { event.preventDefault(); setOverview(false); setHelp((value) => !value); return; }
      if (overview || help) return;
      switch (event.key) {
        case "ArrowRight": case "ArrowDown": case "PageDown": case " ": event.preventDefault(); if (!event.repeat) advance(); break;
        case "ArrowLeft": case "ArrowUp": case "PageUp": event.preventDefault(); if (!event.repeat) back(); break;
        case "Home": event.preventDefault(); go(0); break;
        case "End": event.preventDefault(); go(slides.length - 1); break;
        default:
          if (event.key.toLowerCase() === "f") { event.preventDefault(); void toggleFullscreen(); }
          if (event.key.toLowerCase() === "n") { event.preventDefault(); setNotes((value) => !value); }
          if (event.key.toLowerCase() === "m") { event.preventDefault(); setPaused((value) => !value); }
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [advance, back, go, toggleFullscreen, overview, help, settingsOpen]);

  // Preload only the next slide's images, never every video in the deck.
  useEffect(() => {
    const upcoming: Record<string, string[]> = {
      "soccer-field": ["soccer-childhood-2011", "soccer-team-2011", "soccer-ipad-generated"], "miami-heat": ["heat-udonis-2013"], minecraft: ["minecraft-monopoly", "minecraft-mario"],
      creators: creators.map(([id]) => `creator-${id}`), shared: ["minecraft-monopoly", "project-event", "project-artwork", "project-software", "playlist-thumbnails"],
      chicago: ["chicago-skyline", "chicago-alley", "chicago-house", "chicago-aerial"], "hilton-head": ["salty-dog-marina-official", "hilton-childhood-deer", "hilton-childhood-dock"],
      drones: ["causeway", "dji-logo"], "photo-album": ["mangroves", "ucf", "watercraft", "inlet", "drone-building"], cars: ["car-meet", "classic-car"],
      "air-shows": ["air-show-poster", "blue-angels", "air-pass-poster"], "tech-events": ["tech-event"], collection: ["retro-tech"],
      pc: ["pc-finished", "pc-night-poster", "pc-orbit-poster", "pc-colors-poster", "pc-desk", "pc-detail", "pc-tubing", "pc-building-poster"],
      "smart-home": ["home-assistant", "home-unifi", "home-pihole", "home-tailscale", "home-portainer", "mangroves", "chicago-skyline", "garden-lake"], "room-idea": ["room-model"], making: ["engraved-card", "compact-laser-engraver-generated", "desktop-3d-printer-generated", "airport-split-flap-board-generated"], "split-flap": ["airport-split-flap-board-generated"], weekend: ["cheesecake", "mangroves", "garden-lake", "coastal-bike-generated", "weekend-sports-generated"], "after-dark": ["after-dark-poster", "core-logo-white"], "thank-you": ["michael-cran-signature", "anywhere-company-logo"],
    };
    for (const name of upcoming[slides[index + 1]?.id] ?? []) {
      const image = new Image();
      image.src = `${ASSET_ROOT}${name}.webp`;
      void image.decode().catch(() => {});
    }
  }, [index]);

  return <PresentationPlaybackContext.Provider value={preferences}><div ref={deckRef} className={styles.presentation} data-presentation="personal" data-native-morph={nativeMorph ? "enabled" : "fallback"} data-motion={motionPaused ? "paused" : "playing"} data-slide-advance={automaticSlides ? "automatic" : "manual"} onTouchStart={(event) => { touchStart.current = event.target instanceof Element && event.target.closest("button, a, aside, dialog") ? null : event.touches[0].clientX; }} onTouchEnd={(event) => {
    if (overview || notes || help || settingsOpen || touchStart.current === null) return;
    const delta = event.changedTouches[0].clientX - touchStart.current;
    touchStart.current = null;
    if (Math.abs(delta) > 60) { if (delta < 0) advance(); else back(); }
  }}>
    <main className={styles.stage} aria-label="Personal presentation" aria-roledescription="carousel">
      <div className={styles.canvas}>
        {nativeMorph ? <section key={slide.id} className={styles.slide} data-slide-id={slide.id} aria-roledescription="slide" aria-label={`${index + 1} of ${slides.length}: ${slide.title}`}>
          <SlideContent id={slide.id} paused={motionPaused} airFavoritesRevealed={airFavoritesRevealed} makerProjectRevealed={makerProjectRevealed} afterDarkStep={afterDarkStep} />
        </section> : <AnimatePresence initial={false} custom={direction}>
          <motion.section key={slide.id} custom={direction} className={styles.slide} data-slide-id={slide.id} aria-roledescription="slide" aria-label={`${index + 1} of ${slides.length}: ${slide.title}`}
            variants={{ enter: { opacity: 0 }, visible: { opacity: 1 }, leave: { opacity: 0, transition: { delay: paused || reduceMotion ? 0 : .55, duration: paused || reduceMotion ? 0 : .45 } } }}
            initial="enter" animate="visible" exit="leave" transition={{ duration: paused || reduceMotion ? 0 : 1.1, ease: "easeInOut" }}>
            <SlideContent id={slide.id} paused={motionPaused} airFavoritesRevealed={airFavoritesRevealed} makerProjectRevealed={makerProjectRevealed} afterDarkStep={afterDarkStep} />
          </motion.section>
        </AnimatePresence>}
        <div className={styles.slideNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}<span> / {slides.length}</span></div>
      </div>
    </main>
    <footer className={styles.toolbar}>
      <div className={styles.deckName}><span>MICHAEL CRAN</span><span>{slide.chapter}</span></div>
      <div className={styles.controls}>
        <button type="button" onClick={() => setPaused((value) => !value)} aria-label={paused ? "Play animations" : "Pause animations"} aria-pressed={paused} title={paused ? "Play animations (M)" : "Pause animations (M)"}>{paused ? <Play /> : <Pause />}</button>
        <button ref={overviewButton} type="button" onClick={() => setOverview(true)} aria-label="Slide overview" title="All slides (O)"><Grid2X2 /></button>
        <button type="button" onClick={() => setNotes((value) => !value)} aria-label="Speaker notes" aria-expanded={notes} title="Speaker notes (N)"><NotebookPen /></button>
        <button ref={helpButton} type="button" onClick={() => setHelp(true)} aria-label="Presentation help" title="Keyboard shortcuts (?)"><HelpCircle /></button>
        <button type="button" onClick={() => void toggleFullscreen()} aria-label={fullscreen ? "Exit full screen" : "Enter full screen"} title="Full screen (F)">{fullscreen ? <Minimize /> : <Expand />}</button>
        <button ref={settingsButton} type="button" onClick={() => { setOverview(false); setHelp(false); setNotes(false); setSettingsOpen(true); }} aria-label="Presentation settings" aria-haspopup="dialog" aria-expanded={settingsOpen} title="Playback settings"><Settings2 /></button>
        <span className={styles.controlDivider} />
        <button type="button" onClick={back} disabled={index === 0} aria-label={backLabel}><ArrowLeft /></button>
        <span className={styles.counter} aria-live="polite" aria-atomic="true">{index + 1} / {slides.length}<span className={styles.srOnly}> · {slide.title}</span></span>
        {automaticSlides && timedSlideAdvance && <div ref={slideClockRef} className={styles.slideAutoTimer} role="timer" aria-live="off" title={pendingReveal ? "Time until the next reveal" : "Time until the next slide"}><span>{pendingReveal ? "Reveal" : "Next"} <span ref={slideRemainingRef}>{stepSeconds}s</span></span><i aria-hidden="true" /></div>}
        <button type="button" onClick={advance} disabled={index === slides.length - 1 && !pendingReveal} aria-label={nextLabel}><ArrowRight /></button>
      </div>
    </footer>
    <div className={styles.progress} aria-hidden="true"><div style={{ width: `${((index + 1) / slides.length) * 100}%` }} /></div>
    {status && <p role="status" className={styles.status}>{status}</p>}
    {notes && <aside className={styles.notes} aria-label="Speaker notes">
      <div className={styles.notesTop}><Label>Speaker notes · slide {index + 1}</Label><button type="button" onClick={() => setNotes(false)} aria-label="Close speaker notes"><X /></button></div>
      <h2>{slide.title}</h2>
      <div className={styles.timing}><span>Suggested time {formatTime(slide.seconds)}</span><span>Deck ~{Math.round(runtime / 60)} min</span></div>
      <div className={styles.timer}><strong>{formatTime(elapsed)}</strong><button type="button" onClick={() => setTimerRunning((value) => !value)}>{timerRunning ? "Pause timer" : "Start timer"}</button><button type="button" onClick={() => { setTimerRunning(false); setElapsed(0); }}>Reset</button></div>
      {slide.notes.map((note) => <p key={note}>{note}</p>)}
      {slide.sources && <div className={styles.sources}><h3>Sources</h3>{slide.sources.map((source) => <a key={source.href} href={source.href} target="_blank" rel="noreferrer">{source.label} ↗</a>)}</div>}
      <div className={styles.nextSlide}><span>Up next</span><strong>{slides[index + 1]?.title ?? "Questions & conversation"}</strong></div>
    </aside>}
    {overview && <DeckDialog label="Slide overview" className={styles.overviewDialog} onClose={() => { setOverview(false); overviewButton.current?.focus(); }}>
      <div className={styles.overviewHeader}><h2>Slides</h2><span>{slides.length} slides</span></div>
      <ol className={styles.overviewGrid}>{slides.map((item, i) => <li key={item.id} className={styles.overviewCard} data-current={index === i}>
        <div className={styles.overviewPreview} data-preview-slide={item.id} aria-hidden="true" inert>
          <PresentationPreviewContext.Provider value={true}>
            <section className={styles.slide}><SlideContent id={item.id} paused={true} airFavoritesRevealed={false} makerProjectRevealed={false} afterDarkStep={0} /></section>
          </PresentationPreviewContext.Provider>
        </div>
        <div className={styles.overviewCardInfo} aria-hidden="true"><span>{String(i + 1).padStart(2, "0")}</span><strong>{item.title}</strong></div>
        <button className={styles.overviewChoice} type="button" aria-label={`Slide ${i + 1}: ${item.title}`} aria-current={index === i ? "step" : undefined} onClick={() => { if (i === index) setOverview(false); else go(i); overviewButton.current?.focus(); }} />
      </li>)}</ol>
    </DeckDialog>}
    {settingsOpen && <DeckDialog label="Presentation settings" className={styles.settingsDialog} onClose={() => { setSettingsOpen(false); settingsButton.current?.focus(); }}>
      <Label>Presentation</Label><h2>Playback settings</h2>
      <div className={styles.playbackSetting}><h3>Images & galleries</h3><p>Photos and collages.</p><div role="group" aria-label="Image advancement"><button type="button" aria-pressed={!preferences.automaticMedia} onClick={() => setAutomaticMedia(false)}>Manual</button><button type="button" aria-pressed={preferences.automaticMedia} onClick={() => setAutomaticMedia(true)}>Automatic</button></div></div>
      <div className={styles.playbackSetting}><h3>Slides & reveals</h3><p>Change slides and reveal details with Next, or follow the slide timings.</p><div role="group" aria-label="Slide and reveal advancement"><button type="button" aria-pressed={!automaticSlides} onClick={() => setAutomaticSlides(false)}>Manual</button><button type="button" aria-pressed={automaticSlides} onClick={() => setAutomaticSlides(true)}>Automatic</button></div></div>
      <p className={styles.settingsFootnote}>Creator groups, drone photographs, smart-home systems, workshop reveals and weekend images always advance by click. Settings are saved; timers pause while this panel is open.</p>
    </DeckDialog>}
    {help && <DeckDialog label="Keyboard shortcuts" className={styles.helpDialog} onClose={() => { setHelp(false); helpButton.current?.focus(); }}>
      <h2 className={styles.helpTitle}>Keyboard shortcuts</h2>
      <dl className={styles.shortcuts}>{keyboardShortcuts.map(({ action, keys }) => <div key={action}><dt>{action}</dt><dd>{keys.map((key, index) => <Fragment key={key}>{index > 0 && <span>/</span>}<kbd>{key}</kbd></Fragment>)}</dd></div>)}</dl>
      <p className={styles.helpTouch}>Touchscreen: swipe left or right.</p>
    </DeckDialog>}
  </div></PresentationPlaybackContext.Provider>;
}

function DeckDialog({ label, onClose, children, className = "" }: { label: string; onClose: () => void; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} className={`${styles.dialog} ${className}`} aria-label={label} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === ref.current) { const box = ref.current.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose(); } }}><button type="button" className={styles.dialogClose} onClick={onClose} aria-label={`Close ${label.toLowerCase()}`}><X /></button>{children}</dialog>;
}
