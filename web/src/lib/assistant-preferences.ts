import { clearConversationHandoff } from "./conversation-handoff";
export type Audience = "general" | "recruiter" | "engineering";
export interface AssistantPreferences {
  memory: boolean;
  memorySince: number;
  memoryEpoch: string;
  audience: Audience;
  detail: "concise" | "detailed";
  pace: number;
  pronunciation: string;
}
export const defaultAssistantPreferences: AssistantPreferences = {
  memory: false,
  memorySince: 0,
  memoryEpoch: "",
  audience: "general",
  detail: "concise",
  pace: 1,
  pronunciation: "",
};
const KEY = "mdcran_assistant_preferences";
export function readAssistantPreferences(): AssistantPreferences {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || "{}");
    return {
      memory: p.memory === true,
      memoryEpoch:
        typeof p.memoryEpoch === "string" &&
        /^[a-zA-Z0-9-]{16,80}$/.test(p.memoryEpoch)
          ? p.memoryEpoch
          : "",
      memorySince:
        typeof p.memorySince === "number" && Number.isFinite(p.memorySince)
          ? Math.max(0, p.memorySince)
          : 0,
      audience: ["recruiter", "engineering"].includes(p.audience)
        ? p.audience
        : "general",
      detail: p.detail === "detailed" ? "detailed" : "concise",
      pace:
        typeof p.pace === "number" ? Math.max(0.7, Math.min(1.2, p.pace)) : 1,
      pronunciation:
        typeof p.pronunciation === "string"
          ? p.pronunciation.slice(0, 160)
          : "",
    };
  } catch {
    return { ...defaultAssistantPreferences };
  }
}
export function saveAssistantPreferences(p: AssistantPreferences) {
  if (p.memory && !readAssistantPreferences().memory)
    p = { ...p, memorySince: Date.now(), memoryEpoch: crypto.randomUUID() };
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* Storage may be disabled. */
  }
  if (!p.memory) {
    try {
      localStorage.removeItem("mdcran_visitor_memory");
    } catch {
      /* */
    }
  }
  window.dispatchEvent(new Event("mdcran:preferences-changed"));
}
export function clearAssistantConversation() {
  clearConversationHandoff();
  saveAssistantPreferences({
    ...readAssistantPreferences(),
    memorySince: Date.now(),
    memoryEpoch: crypto.randomUUID(),
  });
  try {
    localStorage.removeItem("mdcran_visitor_memory");
    sessionStorage.removeItem("mdcran_greeted_session");
  } catch {
    /* */
  }
  window.dispatchEvent(new Event("mdcran:conversation-clear"));
}
export function pageQuestions(path: string): string[] {
  if (path.startsWith("/resume"))
    return [
      "Summarize your experience for a recruiter",
      "Which projects demonstrate your strongest skills?",
      "What experience is not demonstrated in your portfolio?",
    ];
  if (path.startsWith("/engineering"))
    return [
      "Explain the architecture of Coretex with source links",
      "Compare Health Tracker and this portfolio",
      "Show your AI engineering work",
    ];
  if (path.startsWith("/articles"))
    return [
      "Summarize this article",
      "What projects relate to this article?",
      "Show supporting sources",
    ];
  return [
    "Show me your best project",
    "Show your engineering experience with evidence",
    "Take me to your resume",
  ];
}
