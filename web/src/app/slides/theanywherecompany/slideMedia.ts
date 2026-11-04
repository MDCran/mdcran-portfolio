import { ASSET_ROOT, creators } from "./slides";

// Include gallery images and video posters so reveals are ready after arrival too.
export const slideImages: Record<string, readonly string[]> = {
  hello: ["skyway", "anywhere-company-logo"],
  "soccer-field": ["soccer-childhood-2011", "soccer-team-2011", "soccer-ipad-generated"],
  "miami-heat": ["heat-udonis-2013"],
  minecraft: ["minecraft-monopoly", "minecraft-mario", "minecraft-board"],
  creators: creators.map(([id]) => `creator-${id}`),
  shared: ["minecraft-monopoly", "project-event", "project-artwork", "project-software", "playlist-thumbnails"],
  chicago: ["chicago-skyline", "chicago-alley", "chicago-house", "chicago-aerial"],
  "hilton-head": ["salty-dog-marina-official", "hilton-childhood-deer", "hilton-childhood-dock"],
  biking: [],
  drones: ["causeway", "dji-logo"],
  "photo-album": ["mangroves", "ucf", "watercraft", "inlet", "drone-building"],
  cars: ["car-meet", "classic-car"],
  "air-shows": ["air-show-poster", "blue-angels", "air-pass-poster"],
  "tech-events": ["tech-event"],
  collection: ["retro-tech"],
  pc: ["pc-finished", "pc-night-poster", "pc-desk", "pc-detail", "pc-building-poster", "pc-glow-poster", "pc-orbit-poster", "pc-tubing", "pc-colors-poster"],
  "smart-home": ["home-assistant", "home-unifi", "home-pihole", "home-tailscale", "home-portainer", "mangroves", "chicago-skyline", "garden-lake"],
  "room-idea": ["room-model"],
  making: ["engraved-card", "compact-laser-engraver-generated", "desktop-3d-printer-generated", "airport-split-flap-board-generated"],
  "split-flap": ["airport-split-flap-board-generated"],
  weekend: ["cheesecake", "mangroves", "garden-lake", "coastal-bike-generated", "weekend-sports-generated"],
  thanks: [],
  "after-dark": ["after-dark-poster", "core-logo-white"],
  "thank-you": ["michael-cran-signature", "anywhere-company-logo"],
};

type DecodableImage = Pick<HTMLImageElement, "src" | "decoding" | "decode">;

export function createImagePreloader(createImage: () => DecodableImage, capacity = 48) {
  const cache = new Map<string, { image: DecodableImage; ready: Promise<void> }>();
  return (src: string): Promise<void> => {
    const cached = cache.get(src);
    if (cached) {
      cache.delete(src);
      cache.set(src, cached);
      return cached.ready;
    }
    const image = createImage();
    image.decoding = "async";
    image.src = src;
    const entry = { image, ready: Promise.resolve() };
    entry.ready = Promise.resolve().then(() => image.decode()).catch((error) => {
      if (cache.get(src) === entry) cache.delete(src);
      throw error;
    });
    cache.set(src, entry);
    // Retain decoded images nearby without holding the entire deck in memory.
    if (cache.size > capacity) cache.delete(cache.keys().next().value!);
    return entry.ready;
  };
}

const preloadImage = createImagePreloader(() => new Image());

export async function preloadPresentationImages(names: readonly string[]): Promise<void> {
  await Promise.all(names.map((name) => preloadImage(`${ASSET_ROOT}${name}.webp`)));
}

export function preloadSlideImages(id: string): Promise<void> {
  return preloadPresentationImages(slideImages[id] ?? []);
}
