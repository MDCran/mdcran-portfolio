"use client";

import { usePathname } from "next/navigation";
import ResumeButton from "@/components/shared/ResumeButton";
import KeyboardShortcuts from "@/components/shared/KeyboardShortcuts";
import TerminalExperience from "@/components/terminal/TerminalExperience";
import ChatBubble from "@/components/chat/ChatBubble";
import ChatPanel from "@/components/chat/ChatPanel";
import ThemeOverlay from "@/components/shared/ThemeOverlay";
import ThemeEffectsOverlay from "@/components/shared/ThemeEffectsOverlay";
import StatusBanner from "@/components/status/StatusBanner";

const CHROMELESS_PREFIXES = ["/admin", "/githubprofile"];
const MINIMAL_CHROME_PREFIXES = ["/visitor-map"];

export default function GlobalChrome() {
  const pathname = usePathname();

  if (pathname.startsWith("/terminal")) {
    return <TerminalExperience />;
  }

  if (CHROMELESS_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  // Minimal chrome: only chat bubble + panel
  if (MINIMAL_CHROME_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return (
      <>
        <ChatBubble />
        <ChatPanel />
      </>
    );
  }

  return (
    <>
      <StatusBanner />
      <TerminalExperience />
      <KeyboardShortcuts />
      <ResumeButton />
      <ChatBubble />
      <ChatPanel />
      <ThemeOverlay />
      <ThemeEffectsOverlay />
    </>
  );
}
