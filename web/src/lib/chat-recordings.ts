/** Fixed English copy and recordings. Bump the filename version when changing a line. */
export const CHAT_RECORDINGS = {
  greeting: {
    text: "Hi, I’m Michael’s AI portfolio guide. Ask about his projects, experience, or skills, and I’ll point you to the supporting work.",
    href: "/chat-audio/greeting-v1.mp3",
  },
  returning: {
    text: "Welcome back. I’m Michael’s AI portfolio guide. What would you like to explore?",
    href: "/chat-audio/returning-v1.mp3",
  },
  farewell: {
    text: "Looks like you may have stepped away. I'll be ending this chat shortly. Feel free to reach back out anytime!",
    href: "/chat-audio/farewell-v1.mp3",
  },
} as const;

export const CHAT_RECORDING_VOICE = {
  id: "EgUcxulGJojl01KsxgA1",
  model: "eleven_multilingual_v2",
  settings: { stability: 0.45, similarity_boost: 0.9, style: 0.6, use_speaker_boost: true },
} as const;

function normalize(text: string): string {
  return text.replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
}

/** Match only exact fixed copy; ordinary replies continue to use live speech. */
export function getChatRecording(text: string) {
  const normalized = normalize(text);
  return Object.values(CHAT_RECORDINGS).find((recording) => normalize(recording.text) === normalized);
}
