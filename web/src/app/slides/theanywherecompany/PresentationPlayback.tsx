"use client";

import { createContext, useContext, useMemo } from "react";
import { useStoredPreference } from "@/lib/useStoredPreference";

type PlaybackPreferences = { automaticMedia: boolean; automaticSlides: boolean };
const defaults: PlaybackPreferences = { automaticMedia: true, automaticSlides: false };
const storageKey = "theanywherecompany.playback.v1";

export const PresentationPlaybackContext = createContext<PlaybackPreferences>(defaults);
export function usePresentationPlayback() { return useContext(PresentationPlaybackContext); }

function parsePreferences(stored: string): PlaybackPreferences {
  try {
    const value: unknown = JSON.parse(stored);
    if (value && typeof value === "object") {
      const saved = value as Partial<PlaybackPreferences>;
      return { automaticMedia: typeof saved.automaticMedia === "boolean" ? saved.automaticMedia : defaults.automaticMedia, automaticSlides: typeof saved.automaticSlides === "boolean" ? saved.automaticSlides : defaults.automaticSlides };
    }
  } catch { /* Use defaults if a saved value cannot be read. */ }
  return defaults;
}

export function usePlaybackPreferences() {
  const [stored, setStored] = useStoredPreference(storageKey, JSON.stringify(defaults));
  const preferences = useMemo(() => parsePreferences(stored), [stored]);
  const setAutomaticMedia = (automaticMedia: boolean) => setStored((value) => JSON.stringify({ ...parsePreferences(value), automaticMedia }));
  const setAutomaticSlides = (automaticSlides: boolean) => setStored((value) => JSON.stringify({ ...parsePreferences(value), automaticSlides }));
  return { preferences, setAutomaticMedia, setAutomaticSlides };
}
