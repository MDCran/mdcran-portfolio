"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, MapPin, Radar, RotateCcw } from "lucide-react";
import { creators } from "./slides";
import { AnimatedNumber, Clip, Photo, PhotoSequence, SequenceFrame } from "./PresentationMedia";
import { BrandMark, type PresentationBrandName } from "./PresentationBrand";
import { audienceChecked, creatorAudience } from "./creatorAudience";
import styles from "./presentation.module.css";

const allCreators = [...creators.slice(2), ...creators.slice(0, 2)];
const creatorEase = [.22, 1, .36, 1] as const;

export function CreatorSequence({ paused }: { paused: boolean }) {
  const [{ phase, seenGroups }, setSequence] = useState({ phase: 0, seenGroups: [0] });
  const finale = phase === 4;
  const select = (next: number) => {
    const selected = Math.max(0, Math.min(4, next));
    setSequence((current) => ({ phase: selected, seenGroups: current.seenGroups.includes(selected) ? current.seenGroups : [...current.seenGroups, selected] }));
  };
  const replay = () => setSequence({ phase: 0, seenGroups: [0] });
  return <div className={styles.creatorCinema} data-creator-phase={phase} data-creator-advance="manual">
    <header><p className={styles.label}>The people I got to create for</p><h2>{finale ? "A special part of the story." : "A few familiar faces."}</h2></header>
    <div className={`${styles.creatorStage} ${styles.morphVisual}`} aria-label={finale ? "PopularMMOs and GamingWithJen, with the other creator logos in the background" : `Creator group ${phase + 1} of 4`}>
      {allCreators.map(([id, name], index) => {
        const isMain = index >= 24;
        const group = isMain ? 4 : Math.floor(index / 6);
        const featured = finale ? isMain : !isMain && Math.floor(index / 6) === phase;
        const shown = seenGroups.includes(group);
        const slot = index % 6;
        const backgroundX = 5.5 + (index % 9) * 11.1;
        const backgroundY = 14 + Math.floor(index / 9) * 34;
        const left = featured ? (finale ? 32 + (index - 24) * 36 : 23 + (slot % 3) * 27) : backgroundX;
        const top = featured ? (finale ? 47 : 25 + Math.floor(slot / 3) * 49) : backgroundY;
        return <motion.figure key={id} className={styles.creatorFloat} style={{ visibility: shown ? "visible" : "hidden" }} aria-hidden={!featured} data-creator-state={featured ? "featured" : shown ? "background" : "unseen"} data-creator-group={group}
          initial={false} animate={{ left: `${left}%`, top: `${top}%`, width: `${featured ? (finale ? 22 : 8.5) : 6.5}cqw`, opacity: featured ? 1 : shown ? finale ? .2 : .09 : 0, filter: `blur(${featured ? 0 : finale ? 3.5 : 2}px)`, zIndex: featured ? 2 : 0 }}
          transition={{ duration: paused ? 0 : 1.4, ease: creatorEase }}>
          <Photo name={`creator-${id}`} alt="" contain />
          <motion.figcaption animate={{ opacity: featured ? 1 : 0 }} transition={{ duration: paused ? 0 : .7, delay: paused ? 0 : .3 }}>
            <span className={styles.creatorName}>{name}</span>
            <CreatorAudienceStat id={id} name={name} featured={featured} paused={paused} />
          </motion.figcaption>
        </motion.figure>;
      })}
    </div>
    <footer className={styles.creatorSequenceFooter}>
      <div className={styles.creatorControls}>
        <div className={styles.creatorChapters} role="group" aria-label="Creator sequence">{["01", "02", "03", "04", "Pat & Jen"].map((name, index) => <button type="button" key={name} onClick={() => select(index)} aria-label={`Show ${index === 4 ? "PopularMMOs and GamingWithJen" : `creator group ${index + 1}`}`} aria-pressed={phase === index}>{name}</button>)}<button type="button" onClick={replay} aria-label="Replay creator sequence"><RotateCcw /></button></div>
        <div className={styles.creatorPlayback} role="group" aria-label="Creator playback">
          <button type="button" onClick={() => select(phase - 1)} disabled={phase === 0} aria-label="Previous creator group"><ArrowLeft /></button>
          <button type="button" onClick={() => select(phase + 1)} disabled={finale} aria-label="Next creator group"><ArrowRight /></button>
        </div>
      </div>
    </footer>
  </div>;
}

function CreatorAudienceStat({ id, name, featured, paused }: { id: string; name: string; featured: boolean; paused: boolean }) {
  const audience = creatorAudience[id];
  if (!audience?.subscribers || !audience.display) return <span className={styles.creatorNoCount}>{audience?.note ?? "Subscriber count not verified"}</span>;
  const suffix = /[MK]$/.exec(audience.display)?.[0] ?? "";
  const number = audience.display.replace(/[MK]$/, "");
  const decimals = number.split(".")[1]?.length ?? 0;
  return <a className={styles.creatorAudience} href={audience.source ?? audience.channel} target="_blank" rel="noreferrer" tabIndex={featured ? 0 : -1} title={`${name}: ${audience.display} public YouTube subscribers · checked ${audienceChecked}`}>
    <span className={styles.creatorSubscriberCount} aria-label={`${audience.display} YouTube subscribers`}><span aria-hidden="true"><AnimatedNumber value={Number(number)} decimals={decimals} suffix={suffix} paused={paused || !featured} /></span><small>subscribers</small></span>
  </a>;
}

export function CurrentComputer({ paused }: { paused: boolean }) {
  return <div className={styles.pcCinema}>
    <header><div><p className={styles.label}>Building new tech</p><h2>The computer<br />I built myself.</h2></div><div className={styles.pcSpec}><span>MY CURRENT BUILD</span><p>Custom water cooling.<br />Hardline tubing.</p></div></header>
    <div className={styles.pcCollage}>
      <PhotoSequence paused={paused} seconds={7.5} label="Current computer build" showCaptions={false} images={[
        { name: "pc-finished", alt: "", caption: "The whole build" },
        { name: "pc-night", alt: "", caption: "After dark", video: true },
        { name: "pc-desk", alt: "", caption: "At my desk" },
        { name: "pc-detail", alt: "", caption: "The details inside" },
        { name: "pc-building", alt: "", caption: "My custom loop, up close", video: true },
        { name: "pc-glow", alt: "", caption: "Light, inside the loop", video: true },
      ]} />
      <figure className={styles.pcOrbit}><Clip name="pc-orbit" alt="" paused={paused} /></figure>
      <div className={styles.pcDetails}><figure><Photo name="pc-tubing" alt="" /></figure><figure><Clip name="pc-colors" alt="" paused={paused} /></figure></div>
    </div>
  </div>;
}

export function MakerWorkshop({ paused, projectRevealed }: { paused: boolean; projectRevealed: boolean }) {
  const tool = projectRevealed
    ? { name: "desktop-3d-printer-generated", alt: "Generated illustration of a desktop 3D printer making an enclosure component", caption: "3D printing · ideas into form" }
    : { name: "compact-laser-engraver-generated", alt: "Generated illustration of a compact desktop laser engraver in a home workshop", caption: "Laser engraving · detail in metal" };
  const example = projectRevealed
    ? { name: "airport-split-flap-board-generated", alt: "Airport-style split-flap board concept with three rows of mechanical letter flaps in a charcoal enclosure", caption: "My next project: an airport-style split-flap board" }
    : { name: "engraved-card", alt: "My own laser-engraved metal MDCran card, with my portrait and design", caption: "My custom laser engraved business card." };
  const step = projectRevealed ? 1 : 0;
  return <div className={styles.makerWorkshop} data-maker-stage={projectRevealed ? "project" : "engraving"}>
    <div className={styles.makerBackground}><AnimatePresence initial={false}><SequenceFrame key={tool.name} item={tool} index={step} paused={paused} /></AnimatePresence></div>
    <div className={styles.makerShade} aria-hidden="true" />
    <div className={styles.makerCopy}>
      <h2>A design on screen.<br /><em>A real object.</em></h2>
      <p>Laser-engraved metal.<br />3D-printed possibilities.</p>
    </div>
    <figure className={`${styles.engravedExample} ${styles.morphVisual}`}>
      <div className={styles.makerForeground}><AnimatePresence initial={false}><SequenceFrame key={example.name} item={example} index={step} paused={paused} /></AnimatePresence></div>
      {!projectRevealed && <figcaption>My custom laser engraved business card.</figcaption>}
    </figure>
  </div>;
}

export function SplitFlapProject() {
  return <div className={styles.splitFlapProject}>
    <div className={styles.splitFlapCopy}>
      <p className={styles.label}>My next side project</p>
      <h2>A split-flap<br /><em>board.</em></h2>
      <p>Laser-engraved metal flaps.<br />A 3D-printed body.<br />An airport-style display.</p>
    </div>
    <figure className={`${styles.splitFlapVisual} ${styles.morphVisual}`}>
      <Photo name="airport-split-flap-board-generated" alt="Airport-style split-flap board concept with physical letter flaps displaying Chicago, Orlando, and Hilton Head" />
      <figcaption>Conceptual idea for next project</figcaption>
    </figure>
    <dl className={styles.clockParts}>
      <div><dt>01 · The flaps</dt><dd>Laser-engraved<br />metal cards</dd></div>
      <div><dt>02 · The body</dt><dd>3D-printed<br />modular enclosure</dd></div>
      <div><dt>03 · The movement</dt><dd>Stepper motors<br />& an Arduino</dd></div>
      <div><dt>04 · The position</dt><dd>Magnets<br />& Hall-effect sensors</dd></div>
    </dl>
  </div>;
}

const homeImageDescriptions: Record<string, string> = {
  "home-assistant": "Home Assistant dashboard with lighting and device controls",
  "home-unifi": "Ubiquiti UniFi dashboard with network traffic graphs",
  "home-pihole": "Pi-hole dashboard with DNS request statistics and graphs",
  "home-tailscale": "Tailscale dashboard listing connected machines",
  "home-portainer": "Portainer dashboard listing containers and their status",
};

const homeSystems = [
  { name: "home-assistant", caption: "Home Assistant · local automation", tag: "AUTOMATION", heading: "The home, orchestrated.", description: "Home Assistant on a Raspberry Pi 5 brings the devices and routines together.", details: [["Runtime", "Raspberry Pi 5"], ["Devices", "Lights, sensors & cameras"], ["Automations", "Scenes, presence & routines"]], flow: ["Devices", "Home Assistant", "Scenes"] },
  { name: "home-unifi", caption: "Ubiquiti UniFi · a segmented network", tag: "NETWORK ARCHITECTURE", heading: "A network with boundaries.", description: "Ubiquiti UniFi separates the homelab, smart devices, guests, and trusted devices across five VLANs.", details: [["Hardware", "Ubiquiti router, switch & AP"], ["Segments", "Admin · IoT · VM · Guest · Mgmt"], ["Policy", "Cross-VLAN traffic blocked by default"]], flow: ["Ubiquiti", "5 VLANs", "Firewall"] },
  { name: "home-pihole", caption: "Pi-hole · filtering at the DNS layer", tag: "DNS & FILTERING", heading: "One layer. Every device.", description: "Pi-hole filters DNS requests across the network, blocking ads and trackers centrally.", details: [["Service", "Pi-hole on Raspberry Pi"], ["Layer", "Network-wide DNS filtering"], ["Coverage", "Across connected devices"]], flow: ["Devices", "Pi-hole DNS", "Internet"] },
  { name: "home-tailscale", caption: "Tailscale · secure remote access", tag: "REMOTE ACCESS", heading: "Home, from anywhere.", description: "A WireGuard-based mesh connects my devices back to the services at home.", details: [["Transport", "WireGuard-based mesh"], ["Services", "Home Assistant & NAS"], ["Exposure", "No inbound port forwarding"]], flow: ["My devices", "Tailscale", "Homelab"] },
  { name: "home-portainer", caption: "Portainer · an always-on homelab", tag: "CONTAINERS & STORAGE", heading: "Small machine. Real services.", description: "An always-on Raspberry Pi runs the services. UNAS provides the central storage layer.", details: [["Services", "Docker containers"], ["Management", "Portainer"], ["Storage", "UNAS · files & photos"]], flow: ["Portainer", "Containers", "UNAS"] },
  { name: "home-immich", kind: "photos", caption: "Immich · my photo library", tag: "PHOTOS & MEMORIES", heading: "My photos. My own library.", description: "Immich brings my photos and videos into a self-hosted photo library, as part of my Raspberry Pi homelab.", details: [["Library", "Immich · photos & videos"], ["Home server", "Raspberry Pi"], ["Purpose", "My own place for the images I take"]], flow: ["My photos", "Immich", "Photo library"] },
  { name: "home-nextcloud", kind: "files", caption: "Nextcloud · files & sync", tag: "FILES & PERSONAL CLOUD", heading: "A home for my files.", description: "Nextcloud adds files and sync to the same home setup, with the Raspberry Pi keeping my services running.", details: [["Service", "Nextcloud"], ["Home server", "Raspberry Pi"], ["Purpose", "Files, sync & my own cloud"]], flow: ["My devices", "Nextcloud", "My files"] },
] as const;

const homeStack: { name: PresentationBrandName; label: string }[] = [
  { name: "homeassistant", label: "Home Assistant" }, { name: "ubiquiti", label: "Ubiquiti" },
  { name: "pihole", label: "Pi-hole" }, { name: "immich", label: "Immich photo library" },
  { name: "nextcloud", label: "Nextcloud" }, { name: "raspberrypi", label: "Raspberry Pi" },
];

export function TechnicalHome({ paused }: { paused: boolean }) {
  const [active, setActive] = useState(0);
  const system = homeSystems[active];
  return <div className={styles.technicalHome}>
    <header><div><p className={styles.label}>My smart home</p><h2>Making everything smart.</h2></div><span className={styles.technicalBadge}>LOCAL-FIRST / PERSONAL HOMELAB</span></header>
    <ul className={styles.homeStackStrip} aria-label="My smart-home stack">{homeStack.map((item) => <li key={item.name}><BrandMark name={item.name} decorative /><span>{item.label}</span></li>)}</ul>
    <div className={styles.technicalLayout}>
      <div className={styles.technicalCopy}><AnimatePresence mode="wait" initial={false}><motion.div key={system.name} data-system-copy={system.name}
        initial={{ opacity: 0, y: 12, filter: "blur(5px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -8, filter: "blur(5px)" }} transition={{ duration: paused ? 0 : .45, ease: creatorEase }}>
        <span className={styles.systemTag}>{String(active + 1).padStart(2, "0")} / {system.tag}</span><h3>{system.heading}</h3><p>{system.description}</p>
        <dl className={styles.systemDetails}>{system.details.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
        <div className={styles.systemFlow} aria-label={system.flow.join(" to ")}>{system.flow.map((label, index) => <span key={label}>{index > 0 && <i aria-hidden="true">→</i>}{label}</span>)}</div>
      </motion.div></AnimatePresence></div>
      <PhotoSequence paused={paused} advancement="manual" activeIndex={active} onActiveChange={setActive} label="Smart-home systems" images={homeSystems.map((item) => ({ name: item.name, alt: "kind" in item ? "" : homeImageDescriptions[item.name], caption: item.caption, content: "kind" in item ? <HomeLibraryVisual kind={item.kind} /> : undefined }))} />
    </div>
  </div>;
}

function HomeLibraryVisual({ kind }: { kind: "photos" | "files" }) {
  return <div className={styles.libraryVisual} role="img" aria-label={kind === "photos" ? "Immich photo-library illustration using my own Chicago, drone, and nature photographs" : "Nextcloud files and sync in my Raspberry Pi home stack"}>
    <div className={styles.libraryVisualHeading}><BrandMark name={kind === "photos" ? "immich" : "nextcloud"} decorative /><div><strong>{kind === "photos" ? "Immich" : "Nextcloud"}</strong><span>{kind === "photos" ? "My photo library" : "My own place for files & sync"}</span></div></div>
    {kind === "photos" ? <div className={styles.libraryPhotoGrid}><Photo name="mangroves" alt="My drone photograph of mangroves" /><Photo name="chicago-skyline" alt="My photograph of Chicago" position="center 65%" /><Photo name="garden-lake" alt="My photograph of a lake and gardens" /></div> : <div className={styles.privateCloudVisual}><BrandMark name="nextcloud" decorative /><h4>Files. Sync. At home.</h4><div><span>My devices</span><i>↔</i><span>Nextcloud</span><i>↔</i><span>My files</span></div><p>Part of my Raspberry Pi homelab.</p></div>}
  </div>;
}

const weekendMoments = [
  { id: "cooking", image: "cheesecake", title: "Cooking & baking", alt: "My homemade cheesecake decorated with strawberries, Oreos, and cream", position: "center 50%" },
  { id: "drone", image: "mangroves", title: "Out with the drone", alt: "My aerial drone photograph of mangroves surrounded by water", position: "center" },
  { id: "nature", image: "garden-lake", title: "A little time in nature", alt: "My photograph of a lake and gardens during a day outside", position: "center" },
  { id: "biking", image: "coastal-bike-generated", title: "A ride to the coast", alt: "Illustration of a bicycle by a coastal trail and beach", position: "72% center" },
  { id: "sports", image: "weekend-sports-generated", title: "A game with friends", alt: "Illustration of a soccer ball, frisbee, and pickleball paddles ready for an afternoon of games", position: "center" },
] as const;

export function WeekendCollage({ paused }: { paused: boolean }) {
  const [active, setActive] = useState(0);
  const select = (next: number) => setActive((next + weekendMoments.length) % weekendMoments.length);
  const move = (direction: number) => select(active + direction);
  return <div className={styles.weekendCinema} data-weekend-active={weekendMoments[active].id} data-advance="manual">
    <header><div><p className={styles.label}>Everyday life / outside of work</p><h2>My kind of weekend.</h2></div><p>Cooking. Drones. Nature. Biking.<br />Frisbee. Soccer. Pickleball.</p></header>
    <div className={`${styles.weekendReel} ${styles.morphVisual}`} role="group" aria-label="Weekend photo collage">
      {weekendMoments.map((item, index) => <motion.button key={item.id} type="button" className={styles.weekendPanel} aria-label={`Focus ${item.title}`} aria-pressed={active === index} onClick={() => select(index)}
        initial={false} animate={{ flexGrow: index === active ? 4.5 : 1 }} transition={{ duration: paused ? 0 : 2.2, ease: creatorEase }}>
        <motion.div className={styles.weekendPanelImage} initial={false} animate={{ scale: index === active ? 1 : 1.025 }} transition={{ duration: paused ? 0 : 2.4, ease: creatorEase }}><Photo name={item.image} alt={item.alt} position={item.position} /></motion.div>
        <div className={styles.weekendPanelShade} />
        <span className={styles.weekendPanelNumber}>{String(index + 1).padStart(2, "0")}</span>
        <motion.div className={styles.weekendPanelCaption} aria-hidden={index !== active} initial={false} animate={{ opacity: index === active ? 1 : 0, y: index === active ? 0 : 12 }} transition={{ duration: paused ? 0 : .9, delay: paused || index !== active ? 0 : .65 }}><strong>{item.title}</strong></motion.div>
      </motion.button>)}
    </div>
    <footer className={styles.weekendReelControls}><div>{weekendMoments.map((item, index) => <button key={item.id} type="button" onClick={() => select(index)} aria-label={`Show ${item.title}`} aria-pressed={active === index}><span /></button>)}</div><button type="button" aria-label="Previous weekend image" onClick={() => move(-1)}><ArrowLeft /></button><button type="button" aria-label="Next weekend image" onClick={() => move(1)}><ArrowRight /></button></footer>
  </div>;
}

export function FutureEvents() {
  return <div className={styles.futureTech}>
    <div className={styles.techGrid} aria-hidden="true" />
    <div className={styles.futureCopy}>
      <p className={styles.label}>Tech events</p><h2>I like seeing<br /><em>what’s next.</em></h2>
      <section className={styles.eventsRadar} aria-label="Events I’d love to attend">
        <h3><Radar aria-hidden="true" />On my radar</h3>
        <p>Events I’d love to attend.</p>
        <ul>
          <li><MapPin aria-hidden="true" /><span>CES <small>· Las Vegas</small></span></li>
          <li><BrandMark name="github" decorative /><span>GitHub Universe</span></li>
          <li><BrandMark name="apple" decorative /><span>Apple WWDC</span></li>
          <li><BrandMark name="openai" decorative /><span>OpenAI DevDay</span></li>
        </ul>
      </section>
    </div>
    <figure className={`${styles.futurePhoto} ${styles.morphVisual}`}><Photo name="tech-event" alt="A humanoid robot on a display platform under a canopy" /><div className={styles.techPhotoShade} /><figcaption><strong>Tesla Optimus</strong></figcaption><div className={styles.techCorner} aria-hidden="true" /></figure>
  </div>;
}
