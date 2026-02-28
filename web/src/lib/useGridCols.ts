"use client";

import { useState, useEffect } from "react";

const DEFAULT_COLS = 3;
const MIN_COLS = 2;
const MAX_COLS = 5;

/**
 * Persists grid column preference per page in localStorage.
 * @param storageKey - unique key per listing page (e.g. "grid_cols_minecraft-maps")
 * @param defaultCols - default column count when no stored preference (default: 3)
 */
export function useGridCols(storageKey: string, defaultCols: number = DEFAULT_COLS) {
  const [cols, setCols] = useState(defaultCols);

  // Load from localStorage on mount (client-only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const n = parseInt(stored, 10);
        if (n >= MIN_COLS && n <= MAX_COLS) setCols(n);
      }
    } catch {}
  }, [storageKey]);

  const setColsAndStore = (n: number) => {
    const clamped = Math.max(MIN_COLS, Math.min(MAX_COLS, n));
    setCols(clamped);
    try {
      localStorage.setItem(storageKey, String(clamped));
    } catch {}
  };

  return [cols, setColsAndStore] as const;
}
