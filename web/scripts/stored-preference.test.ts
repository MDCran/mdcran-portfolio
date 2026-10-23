import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createPreferenceStore, useStoredPreference } from "../src/lib/useStoredPreference";

test("quota failures retain the requested preference even when reads return an old value", () => {
  const data = new Map([["theme", "dark"]]);
  let writable = false;
  const notifications: string[] = [];
  const store = createPreferenceStore({
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => {
      if (!writable) throw new DOMException("Storage full", "QuotaExceededError");
      data.set(key, value);
    },
  }, key => notifications.push(store.read(key, "dark")));

  store.write("theme", "light", "dark");
  assert.equal(data.get("theme"), "dark");
  assert.equal(store.read("theme", "dark"), "light");
  assert.deepEqual(notifications, ["light"]);

  writable = true;
  store.write("theme", "hacker", "dark");
  assert.equal(data.get("theme"), "hacker");
  data.set("theme", "cyberpunk");
  assert.equal(store.read("theme", "dark"), "cyberpunk", "A successful write must retire the memory override");
});

test("consecutive functional accessibility updates merge the latest stored or in-memory value", () => {
  for (const writable of [true, false]) {
    const data = new Map<string, string>();
    const store = createPreferenceStore({
      getItem: key => data.get(key) ?? null,
      setItem: (key, value) => {
        if (!writable) throw new Error("Storage unavailable");
        data.set(key, value);
      },
    }, () => {});
    const fallback = JSON.stringify({ textScale: 1, motion: "allow", cursor: "default" });
    for (const patch of [{ textScale: 1.3 }, { motion: "reduce" }, { cursor: "large" }]) {
      store.write("a11y", previous => JSON.stringify({ ...JSON.parse(previous), ...patch }), fallback);
    }
    assert.deepEqual(JSON.parse(store.read("a11y", fallback)), { textScale: 1.3, motion: "reduce", cursor: "large" });
  }
});

test("authoritative storage events replace session overrides without affecting other keys", () => {
  const data = new Map<string, string>();
  const store = createPreferenceStore({
    getItem: key => data.get(key) ?? null,
    setItem: () => { throw new Error("Storage full"); },
  }, () => {});
  store.write("theme", "light", "dark");
  store.write("language", "fr-FR", "en-US");
  data.set("theme", "hacker");
  store.storageChanged("theme");
  assert.equal(store.read("theme", "dark"), "hacker");
  assert.equal(store.read("language", "en-US"), "fr-FR");
  data.clear();
  store.storageChanged(null);
  assert.equal(store.read("theme", "dark"), "dark");
  assert.equal(store.read("language", "en-US"), "en-US");
});

test("fully blocked storage still supports functional updates", () => {
  const store = createPreferenceStore({
    getItem: () => { throw new Error("Blocked"); },
    setItem: () => { throw new Error("Blocked"); },
  }, () => {});
  assert.equal(store.read("columns", "3"), "3");
  store.write("columns", previous => String(Number(previous) + 1), "3");
  store.write("columns", previous => String(Number(previous) + 1), "3");
  assert.equal(store.read("columns", "3"), "5");
});

test("server rendering uses the fallback and reports preferences not ready", () => {
  function Preference() {
    const [value, , ready] = useStoredPreference("theme", "dark");
    return createElement("span", null, `${value}:${ready}`);
  }
  assert.equal(renderToString(createElement(Preference)), "<span>dark:false</span>");
});
