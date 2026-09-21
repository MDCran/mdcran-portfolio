import type { RizzActivity, RizzDateIdea, RizzVibe, RizzWinOver, RizzThemeCustomization, SiteContent } from "./types";

export type RizzTheme = NonNullable<SiteContent["rizzTheme"]>;
export type RizzSetting = NonNullable<SiteContent["rizzSetting"]>;
export type AnswerKey = "dateIdeas" | "vibes" | "activities" | "winOvers";
export type RizzConfig = {
  theme: RizzTheme;
  setting: RizzSetting;
  allowCustomAnswers: Record<AnswerKey, boolean>;
  appearance: Required<Omit<RizzThemeCustomization, "optionLabels">> & { icon: string; name: string };
  optionLabels: Record<string, string>;
};
export const answerKeys: AnswerKey[] = ["dateIdeas", "vibes", "activities", "winOvers"];
export const questionLabels: Record<AnswerKey, string> = {
  dateIdeas: "Your ideal hangout", vibes: "Set the vibe", activities: "Pick our side quest", winOvers: "The way to your heart",
};

export const rizzThemes: Record<RizzTheme, { name: string; tag: string; title: string; description: string; icon: string; card: string; move: string; accent: string }> = {
  romance: { name: "Classic", tag: "An invitation, made for you", title: "Good company. A plan for two.", description: "Choose a few things you enjoy and let's plan some time together.", icon: "♡", card: "One of a kind", move: "A little time together", accent: "#ff9dbb" },
  pokemon: { name: "Pokémon · card rivals", tag: "A new challenger awaits", title: "Your next favorite rematch.", description: "Bring your favorite deck. Pick a game, plan a rematch, and make an evening of it.", icon: "✦", card: "Card rival", move: "Rematch + snacks", accent: "#ffda75" },
  "monster-hunter": { name: "Monster Hunter · co-op", tag: "An invitation from your hunting partner", title: "Your next co-op quest.", description: "Choose the next hunt, bring your favorite loadout, and make a plan for the next session.", icon: "⚔", card: "Hunting partner", move: "One hunt. Then one more.", accent: "#e9c58c" },
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

export const themeCopyFields = [
  { key: "tag", label: "Eyebrow text", max: 100 },
  { key: "title", label: "Headline", max: 160 },
  { key: "description", label: "Invitation message", max: 600 },
  { key: "card", label: "Card label", max: 80 },
  { key: "move", label: "Card move / activity", max: 100 },
  { key: "cardDescription", label: "Card description", max: 300 },
  { key: "button", label: "Invitation button", max: 80 },
  { key: "successTitle", label: "Confirmation headline", max: 160 },
  { key: "footer", label: "Footer note", max: 120 },
] as const;

export function sanitizeThemeCustomizations(value: SiteContent["rizzThemeCustomizations"]): NonNullable<SiteContent["rizzThemeCustomizations"]> {
  const result: NonNullable<SiteContent["rizzThemeCustomizations"]> = {};
  for (const theme of Object.keys(rizzThemes) as RizzTheme[]) {
    const source = value?.[theme];
    if (!source || typeof source !== "object") continue;
    const clean: RizzThemeCustomization = {};
    for (const field of themeCopyFields) {
      const text = source[field.key];
      if (typeof text === "string" && text.trim()) clean[field.key] = text.trim().slice(0, field.max);
    }
    if (typeof source.accent === "string" && /^#[0-9a-f]{6}$/i.test(source.accent)) clean.accent = source.accent;
    const labels: Record<string, string> = {};
    for (const key of answerKeys) {
      for (const option of allOptions[key]) {
        const id = `${key}:${option.value}`;
        const label = source.optionLabels?.[id];
        if (typeof label === "string" && label.trim()) labels[id] = label.trim().slice(0, 100);
      }
    }
    if (Object.keys(labels).length) clean.optionLabels = labels;
    if (Object.keys(clean).length) result[theme] = clean;
  }
  return result;
}

export function accentTextColor(hex: string): string {
  const rgb = [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 > 0.179 ? "#101014" : "#ffffff";
}

export function getRizzConfig(content: Pick<SiteContent, "rizzTheme" | "rizzSetting" | "rizzAllowCustomAnswers" | "rizzThemeCustomizations">): RizzConfig {
  const theme = content.rizzTheme && Object.hasOwn(rizzThemes, content.rizzTheme) ? content.rizzTheme : "romance";
  const setting = content.rizzSetting === "indoors" || content.rizzSetting === "outdoors" ? content.rizzSetting : "any";
  const allowCustomAnswers = Object.fromEntries(answerKeys.map(key => [key, content.rizzAllowCustomAnswers?.[key] !== false])) as Record<AnswerKey, boolean>;
  const custom = sanitizeThemeCustomizations(content.rizzThemeCustomizations)[theme] ?? {};
  const { optionLabels = {}, ...copy } = custom;
  const appearance = {
    ...rizzThemes[theme],
    cardDescription: "Super effective against a boring evening.",
    button: "Let's make a plan",
    successTitle: theme === "pokemon" ? "Bring your best deck." : "Your plan is on its way.",
    footer: "A personal invitation · MDCran",
    ...copy,
  };
  return { theme, setting, allowCustomAnswers, appearance, optionLabels };
}

export function getOptions(key: AnswerKey, config: RizzConfig): Option[] {
  return allOptions[key].filter(option =>
    (!option.setting || config.setting === "any" || option.setting === config.setting) &&
    (option.value !== "other" || config.allowCustomAnswers.winOvers)
  ).map(option => ({ ...option, label: config.optionLabels[`${key}:${option.value}`] || option.label }))
    .sort((a, b) => Number(b.theme === config.theme) - Number(a.theme === config.theme));
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
