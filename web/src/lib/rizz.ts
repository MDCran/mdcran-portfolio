import type { RizzActivity, RizzDateIdea, RizzVibe, RizzWinOver, SiteContent } from "./types";

export type RizzTheme = NonNullable<SiteContent["rizzTheme"]>;
export type RizzSetting = NonNullable<SiteContent["rizzSetting"]>;
export type AnswerKey = "dateIdeas" | "vibes" | "activities" | "winOvers";
export type RizzConfig = { theme: RizzTheme; setting: RizzSetting; allowCustomAnswers: Record<AnswerKey, boolean> };
export const answerKeys: AnswerKey[] = ["dateIdeas", "vibes", "activities", "winOvers"];
export const questionLabels: Record<AnswerKey, string> = {
  dateIdeas: "Your ideal hangout", vibes: "Set the vibe", activities: "Pick our side quest", winOvers: "The way to your heart",
};

export const rizzThemes: Record<RizzTheme, { name: string; tag: string; title: string; description: string; icon: string; card: string; move: string; accent: string }> = {
  romance: { name: "Sweetheart", tag: "A little courage. A lot of feelings.", title: "You. Me. A little adventure?", description: "I made you a whole page. A little extra? Absolutely. Worth it? You are.", icon: "♡", card: "My favorite person", move: "Make a little time for us", accent: "#ff9dbb" },
  pokemon: { name: "Pokémon · card rivals", tag: "A new challenger (with feelings)", title: "My favorite rival. My first pick.", description: "One more Pokémon card rematch? I'll bring my deck, you bring that annoyingly cute winning streak.", icon: "✦", card: "Favorite rival", move: "Rematch + snacks", accent: "#ffda75" },
  "monster-hunter": { name: "Monster Hunter · co-op", tag: "An invitation from your hunting partner", title: "My next quest? More time with you.", description: "Big monsters. Questionable strategy. Excellent company. There's a spot in my party with your name on it.", icon: "⚔", card: "Favorite hunting partner", move: "One hunt. Then one more.", accent: "#e9c58c" },
  outdoors: { name: "Little adventures", tag: "Good company. The scenic route.", title: "Let's take the long way together.", description: "A little fresh air, something good to eat, and absolutely nowhere we need to rush to.", icon: "☀", card: "My favorite view", move: "Take the scenic route", accent: "#a7e6ba" },
  cozy: { name: "Cozy club", tag: "Reserved: the spot next to me", title: "Big fan of doing very little with you.", description: "Comfy clothes, a snack situation, and something good on screen. Staying in is a perfectly good adventure.", icon: "☾", card: "Comfort person", move: "Snacks + a night in", accent: "#c9b5ff" },
};

type Option<T extends string = string> = { value: T; label: string; icon: string; setting?: "indoors" | "outdoors"; theme?: RizzTheme };
export const dateOptions: Option<RizzDateIdea>[] = [
  { value: "pokemon-card-night", label: "Pokémon card night", icon: "✦", setting: "indoors", theme: "pokemon" },
  { value: "co-op-hunt", label: "A co-op hunting session", icon: "⚔", setting: "indoors", theme: "monster-hunter" },
  { value: "cozy-night-in", label: "A cozy night in", icon: "☾", setting: "indoors" },
  { value: "fancy-dinner-date", label: "Dress up for dinner", icon: "✧", setting: "indoors" },
  { value: "coffee-and-talking", label: "Coffee + a long chat", icon: "☕", setting: "indoors" },
  { value: "picnic", label: "A picnic for two", icon: "☀", setting: "outdoors" },
  { value: "food-and-walking", label: "Good food + a wander", icon: "❀", setting: "outdoors" },
  { value: "spontaneous-adventure", label: "A spontaneous adventure", icon: "↗", setting: "outdoors" },
  { value: "surprise-me", label: "Surprise me", icon: "✺" },
];
export const vibeOptions: Option<RizzVibe>[] = [
  { value: "chill-and-cozy", label: "Chill + cozy", icon: "☾" },
  { value: "fun-and-chaotic", label: "Playfully chaotic", icon: "ϟ" },
  { value: "romantic-and-cute", label: "A little romantic", icon: "♡" },
  { value: "adventurous", label: "Up for an adventure", icon: "↗" },
];
export const activityOptions: Option<RizzActivity>[] = [
  { value: "pokemon-rematch", label: "Pokémon TCG rematch", icon: "✦", setting: "indoors", theme: "pokemon" },
  { value: "monster-hunter", label: "Monster Hunter together", icon: "⚔", setting: "indoors", theme: "monster-hunter" },
  { value: "board-games", label: "Board games + snacks", icon: "⚄", setting: "indoors" },
  { value: "movie-night", label: "Movie night", icon: "▷", setting: "indoors" },
  { value: "arcade", label: "An arcade rivalry", icon: "✜", setting: "indoors" },
  { value: "ice-cream-date", label: "An ice cream stop", icon: "♡" },
  { value: "nature-walk", label: "A nature walk", icon: "❀", setting: "outdoors" },
  { value: "stargazing", label: "Stargazing", icon: "✧", setting: "outdoors" },
  { value: "night-drive", label: "A night drive", icon: "☾" },
  { value: "disney-fireworks", label: "Disney fireworks", icon: "✺", setting: "outdoors" },
  { value: "surprise-me", label: "You pick this one", icon: "↗" },
];
export const winOverOptions: Option<RizzWinOver>[] = [
  { value: "food", label: "Know my snack order", icon: "☕" },
  { value: "attention", label: "Be present with me", icon: "✦" },
  { value: "effort", label: "The little thoughtful things", icon: "✧" },
  { value: "making-me-laugh", label: "Make me laugh", icon: "☺" },
  { value: "being-sweet", label: "Be a little sweet", icon: "♡" },
  { value: "consistency", label: "Keep showing up", icon: "∞" },
  { value: "touch", label: "Affection", icon: "❀" },
  { value: "other", label: "Something else", icon: "✎" },
];
export const allOptions = { dateIdeas: dateOptions, vibes: vibeOptions, activities: activityOptions, winOvers: winOverOptions };

export function getRizzConfig(content: Pick<SiteContent, "rizzTheme" | "rizzSetting" | "rizzAllowCustomAnswers">): RizzConfig {
  const theme = content.rizzTheme && Object.hasOwn(rizzThemes, content.rizzTheme) ? content.rizzTheme : "romance";
  const setting = content.rizzSetting === "indoors" || content.rizzSetting === "outdoors" ? content.rizzSetting : "any";
  const allowCustomAnswers = Object.fromEntries(answerKeys.map(key => [key, content.rizzAllowCustomAnswers?.[key] !== false])) as Record<AnswerKey, boolean>;
  return { theme, setting, allowCustomAnswers };
}

export function getOptions(key: AnswerKey, config: RizzConfig): Option[] {
  return allOptions[key].filter(option =>
    (!option.setting || config.setting === "any" || option.setting === config.setting) &&
    (option.value !== "other" || config.allowCustomAnswers.winOvers)
  ).sort((a, b) => Number(b.theme === config.theme) - Number(a.theme === config.theme));
}

export function isValidPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  return /^\+?[\d\s().-]+$/.test(value.trim()) && digits.length >= 10 && digits.length <= 15 && !/^(\d)\1+$/.test(digits);
}

export type RizzAnswers = { name: string; phone: string; nickname: string; dateIdeas: string[]; vibes: string[]; activities: string[]; winOvers: string[]; customAnswers: Record<AnswerKey, string> };

export function parseRizzAnswers(body: unknown): RizzAnswers | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const input = body as Record<string, unknown>;
  const text = (value: unknown) => value === undefined || value === null ? "" : typeof value === "string" ? value.trim() : null;
  const name = text(input.name), phone = text(input.phone), nickname = text(input.nickname);
  if (name === null || phone === null || nickname === null || phone.length > 30) return null;
  if (input.customAnswers !== undefined && (!input.customAnswers || typeof input.customAnswers !== "object" || Array.isArray(input.customAnswers))) return null;
  const custom = (input.customAnswers ?? {}) as Record<string, unknown>;
  const legacyKeys = { dateIdeas: "dateIdea", vibes: "vibe", activities: "activity", winOvers: "winOver" };
  const result: RizzAnswers = { name, phone, nickname, dateIdeas: [], vibes: [], activities: [], winOvers: [], customAnswers: { dateIdeas: "", vibes: "", activities: "", winOvers: "" } };
  for (const key of answerKeys) {
    const raw = input[key] ?? input[legacyKeys[key]] ?? [];
    const values = Array.isArray(raw) ? raw : [raw];
    if (values.length > 20 || values.some(value => typeof value !== "string")) return null;
    result[key] = [...new Set(values)] as string[];
    const written = text(custom[key] ?? (key === "winOvers" ? input.winOverOther : undefined));
    if (written === null) return null;
    result.customAnswers[key] = written;
  }
  return result;
}

export function validateRizzAnswers(answers: RizzAnswers, config: RizzConfig, step?: number): string | null {
  if (step === undefined || step === 0) {
    if (!answers.name.trim() || answers.name.length > 100 || answers.nickname.length > 100) return "Add your name (up to 100 characters).";
    if (!isValidPhoneNumber(answers.phone)) return "Add a valid phone number so I can make plans with you.";
  }
  for (const [index, key] of answerKeys.entries()) {
    if (step !== undefined && step !== index + 1) continue;
    const options = getOptions(key, config);
    const custom = answers.customAnswers[key].trim();
    if (custom.length > 300) return "Keep each written answer under 300 characters.";
    if (custom && !config.allowCustomAnswers[key]) return "Written answers are turned off for this question. Refresh to see the latest options.";
    if (answers[key].some(value => !options.some(option => option.value === value))) return "The choices have changed. Refresh and choose again.";
    if (!answers[key].length && !custom) return `Choose something for “${questionLabels[key]}”${config.allowCustomAnswers[key] ? " or write your own answer" : ""}.`;
    if (key === "winOvers" && answers.winOvers.includes("other") && !custom) return "Tell me a little about that something else.";
  }
  return null;
}
