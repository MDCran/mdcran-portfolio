"use client";

import { useCallback, useSyncExternalStore } from "react";

const CHANGE_EVENT = "mdcran:stored-preference";
type PreferenceUpdate = string | ((previous: string) => string);
type PreferenceStorage = { getItem(key: string): string | null; setItem(key: string, value: string): void };

/** A failed browser write remains usable for this session until storage changes. */
export function createPreferenceStore(storage: PreferenceStorage, notify: (key: string) => void) {
  const memoryFallback = new Map<string, string>();
  function read(key: string, fallback: string) {
    if (memoryFallback.has(key)) return memoryFallback.get(key)!;
    try { return storage.getItem(key) ?? fallback; }
    catch { return fallback; }
  }
  function write(key: string, update: PreferenceUpdate, fallback: string) {
    const next = typeof update === "function" ? update(read(key, fallback)) : update;
    try { storage.setItem(key, next); memoryFallback.delete(key); }
    catch { memoryFallback.set(key, next); }
    notify(key);
  }
  function storageChanged(key: string | null) {
    if (key === null) memoryFallback.clear();
    else memoryFallback.delete(key);
  }
  return { read, write, storageChanged };
}

const browserPreferences = createPreferenceStore({
  getItem: key => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
}, key => window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: key })));
const subscribeHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

/** Server and hydration renders use the fallback; side effects can wait for ready. */
export function useStoredPreference(key: string, fallback: string) {
  const subscribe = useCallback((notify: () => void) => {
    const storageChanged = (event: StorageEvent) => {
      if (event.key !== key && event.key !== null) return;
      browserPreferences.storageChanged(event.key);
      notify();
    };
    const localChanged = (event: Event) => { if ((event as CustomEvent<string>).detail === key) notify(); };
    window.addEventListener("storage", storageChanged);
    window.addEventListener(CHANGE_EVENT, localChanged);
    return () => {
      window.removeEventListener("storage", storageChanged);
      window.removeEventListener(CHANGE_EVENT, localChanged);
    };
  }, [key]);
  const read = useCallback(() => browserPreferences.read(key, fallback), [key, fallback]);
  const serverValue = useCallback(() => fallback, [fallback]);
  const value = useSyncExternalStore(subscribe, read, serverValue);
  const ready = useSyncExternalStore(subscribeHydration, clientReady, serverReady);
  const setValue = useCallback((next: PreferenceUpdate) => {
    browserPreferences.write(key, next, fallback);
  }, [key, fallback]);
  return [value, setValue, ready] as const;
}
