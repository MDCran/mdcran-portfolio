"use client";

import { useStoredPreference } from "./useStoredPreference";

const DEFAULT_COLS = 3;
const MIN_COLS = 2;
const MAX_COLS = 5;

/**
 * Persists grid column preference per page in localStorage.
 * @param storageKey - unique key per listing page (e.g. "grid_cols_minecraft-maps")
 * @param defaultCols - default column count when no stored preference (default: 3)
 */
export function useGridCols(storageKey: string, defaultCols: number = DEFAULT_COLS) {
  const [stored, setStored] = useStoredPreference(storageKey, String(defaultCols));
  const parsed = Number(stored);
  const cols = Number.isInteger(parsed) && parsed >= MIN_COLS && parsed <= MAX_COLS ? parsed : defaultCols;

  const setColsAndStore = (n: number) => {
    if (!Number.isFinite(n)) return;
    const clamped = Math.max(MIN_COLS, Math.min(MAX_COLS, Math.round(n)));
    setStored(String(clamped));
  };

  return [cols, setColsAndStore] as const;
}
