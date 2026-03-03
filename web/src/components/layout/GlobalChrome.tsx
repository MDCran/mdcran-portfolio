"use client";

import { usePathname } from "next/navigation";
import ResumeButton from "@/components/shared/ResumeButton";
import KeyboardShortcuts from "@/components/shared/KeyboardShortcuts";
import TerminalExperience from "@/components/terminal/TerminalExperience";

const CHROMELESS_PREFIXES = ["/admin", "/githubprofile", "/visitor"];

export default function GlobalChrome() {
  const pathname = usePathname();

  if (pathname.startsWith("/terminal")) {
    return <TerminalExperience />;
  }

  if (CHROMELESS_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <>
      <TerminalExperience />
      <KeyboardShortcuts />
      <ResumeButton />
    </>
  );
}
