import type { RizzSetting } from "./rizz";

const notes = ["You make ordinary days feel a little less ordinary.", "A tiny reminder: you're someone's favorite notification.", "If today is a lot, you don't have to be. Just be you.", "Your laugh? Easily one of my favorite sounds.", "I'd pick your company over a perfect plan, every time."];
const indoor = ["Tiny adventure: pick a movie neither of us has seen. I'll handle the snacks.", "Tiny adventure: one card-game rematch. Winner picks dessert.", "Tiny adventure: build the most unnecessarily cozy blanket setup."];
const outdoor = ["Tiny adventure: take a slow walk and find the prettiest thing on the way.", "Tiny adventure: pack two snacks and call it a picnic.", "Tiny adventure: find a spot to watch the sky change colors."];
export function sunshineMessages(setting: RizzSetting, customNotes: string[] = []): string[] {
  const custom = customNotes.filter(note => typeof note === "string" && note.trim()).slice(0, 20).map(note => note.trim().slice(0, 300));
  return [...(custom.length ? custom : notes), ...(setting !== "outdoors" ? indoor : []), ...(setting !== "indoors" ? outdoor : [])];
}
