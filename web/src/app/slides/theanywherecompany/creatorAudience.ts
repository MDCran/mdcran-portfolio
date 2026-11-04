export const audienceChecked = "3 Nov 2026";

export type CreatorAudience = {
  subscribers?: number;
  display?: string;
  channel?: string;
  source?: string;
  note?: string;
};

// Rounded public YouTube figures checked against the linked channel pages.
// These are channel subscribers, not portfolio follower totals or combined audiences.
export const creatorAudience: Record<string, CreatorAudience> = {
  popularmmos: { subscribers: 17_500_000, display: "17.5M", channel: "https://www.youtube.com/@PopularMMOs", source: "https://www.youtube.com/user/popularmmos" },
  gamingwithjen: { subscribers: 4_930_000, display: "4.93M", channel: "https://www.youtube.com/@GamingWithJen", source: "https://www.youtube.com/user/GamingWithJen" },
  lubcubs: { subscribers: 34_700, display: "34.7K", channel: "https://www.youtube.com/@Lubcubs", source: "https://www.youtube.com/channel/UCgiz5akRFYpqhxIImKoYR2Q" },
  beckjack: { subscribers: 5_520_000, display: "5.52M", channel: "https://www.youtube.com/@beckbrojack", source: "https://www.youtube.com/@beckbrojack/search" },
  jelly: { subscribers: 23_300_000, display: "23.3M", channel: "https://www.youtube.com/@Jelly", source: "https://www.youtube.com/@jelly" },
  crainer: { subscribers: 7_720_000, display: "7.72M", channel: "https://www.youtube.com/@MisterCrainer", source: "https://www.youtube.com/@MisterCrainer/about" },
  slogo: { subscribers: 11_700_000, display: "11.7M", channel: "https://www.youtube.com/@Slogo", source: "https://www.youtube.com/@slogo" },
  ssundee: { subscribers: 25_500_000, display: "25.5M", channel: "https://www.youtube.com/@SSundee", source: "https://www.youtube.com/@SSundee/videos" },
  tommyinnit: { subscribers: 14_900_000, display: "14.9M", channel: "https://www.youtube.com/@TommyInnit", source: "https://www.youtube.com/@tommyinnit" },
  unspeakable: { subscribers: 20_100_000, display: "20.1M", channel: "https://www.youtube.com/@Unspeakable", source: "https://www.youtube.com/channel/UCet_y01v87pE7MPGikjTQQw", note: "Main Unspeakable channel, listed in its official sister channel's channel links." },
  moosecraft: { subscribers: 5_560_000, display: "5.56M", channel: "https://www.youtube.com/@MooseCraft", source: "https://www.youtube.com/channel/UCV7lBBz6G20d87WoKFPjsPw" },
  shark: { subscribers: 5_190_000, display: "5.19M", channel: "https://www.youtube.com/@09sharkboy", source: "https://www.youtube.com/@09sharkboy" },
  stroie: { subscribers: 77, display: "77", channel: "https://www.youtube.com/@stroie824", source: "https://www.youtube.com/@stroie824" },
  theagaming: { note: "Subscriber count not verified" },
  ccrizzic: { subscribers: 95_900, display: "95.9K", channel: "https://www.youtube.com/@CCrizzic", source: "https://www.youtube.com/@CCrizzic/videos" },
  doctorbenx: { subscribers: 2_300_000, display: "2.3M", channel: "https://www.youtube.com/@benx", source: "https://www.youtube.com/Benx" },
  epicstun: { subscribers: 1_210_000, display: "1.21M", channel: "https://www.youtube.com/@EpicStun", source: "https://www.youtube.com/@EpicStun/videos" },
  lynixity: { subscribers: 1_640_000, display: "1.64M", channel: "https://www.youtube.com/@Lynix", source: "https://www.youtube.com/lynix" },
  gav1n: { note: "Event creator · count not verified", source: "https://beacons.ai/ogav1n" },
  nico: { subscribers: 5_160_000, display: "5.16M", channel: "https://www.youtube.com/@Nico", source: "https://www.youtube.com/@nico" },
  cash: { subscribers: 11_800_000, display: "11.8M", channel: "https://www.youtube.com/@Cash", source: "https://www.youtube.com/@cash/videos" },
  bendie: { note: "Creator · count not verified", source: "https://x.com/CodeBendie" },
  "100media": { note: "Development team", source: "https://www.mdcran.com/clients/100media" },
  plixel: { note: "Minecraft community", source: "https://github.com/Plixel" },
  pokefind: { subscribers: 11_100, display: "11.1K", channel: "https://www.youtube.com/@PokeFind", source: "https://www.youtube.com/@PokeFind" },
  tubnet: { subscribers: 87_000, display: "87K", channel: "https://www.youtube.com/@TubNet", source: "https://www.youtube.com/@TubNet" },
};
