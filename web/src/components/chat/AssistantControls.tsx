"use client";
import { useEffect, useState } from "react";
import {
  clearAssistantConversation,
  defaultAssistantPreferences,
  readAssistantPreferences,
  saveAssistantPreferences,
  type AssistantPreferences,
} from "@/lib/assistant-preferences";
export default function AssistantControls() {
  const [prefs, setPrefs] = useState(defaultAssistantPreferences);
  useEffect(() => {
    const update = () => setPrefs(readAssistantPreferences());
    update();
    window.addEventListener("mdcran:preferences-changed", update);
    return () =>
      window.removeEventListener("mdcran:preferences-changed", update);
  }, []);
  function change(next: Partial<AssistantPreferences>) {
    const p = { ...prefs, ...next };
    setPrefs(p);
    saveAssistantPreferences(p);
  }
  return (
    <details
      className="mx-4 my-2 rounded border border-current/15 p-2 text-xs"
      data-assistant-ui
    >
      <summary className="cursor-pointer">
        Conversation preferences · {prefs.audience}
      </summary>
      <div className="mt-3 grid gap-3">
        <label>
          Audience{" "}
          <select
            className="ml-2 bg-[var(--background,#111)]"
            value={prefs.audience}
            onChange={(e) =>
              change({
                audience: e.target.value as AssistantPreferences["audience"],
              })
            }
          >
            <option value="general">General</option>
            <option value="recruiter">Recruiter</option>
            <option value="engineering">Engineering</option>
          </select>
        </label>
        <label>
          Answer detail{" "}
          <select
            className="ml-2 bg-[var(--background,#111)]"
            value={prefs.detail}
            onChange={(e) =>
              change({
                detail: e.target.value as AssistantPreferences["detail"],
              })
            }
          >
            <option value="concise">Concise</option>
            <option value="detailed">Detailed</option>
          </select>
        </label>
        <label>
          Speaking pace · {prefs.pace.toFixed(1)}×{" "}
          <input
            className="ml-2"
            type="range"
            min="0.7"
            max="1.2"
            step="0.1"
            value={prefs.pace}
            onChange={(e) => change({ pace: Number(e.target.value) })}
          />
        </label>
        <label>
          Pronunciation hint{" "}
          <input
            className="mt-1 w-full rounded border border-current/20 bg-transparent p-2"
            maxLength={160}
            value={prefs.pronunciation}
            placeholder="e.g. pronounce my name as…"
            onChange={(e) => change({ pronunciation: e.target.value })}
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={prefs.memory}
            onChange={(e) => change({ memory: e.target.checked })}
          />
          Remember visits and topics on this device
        </label>
        <p className="opacity-65">
          Memory is optional. When enabled, prior conversations may inform
          replies. Turning it off stops recall and removes saved device topics.
          Service and security logs may still be retained.
        </p>
        <button
          className="justify-self-start rounded border border-current/25 px-3 py-2"
          onClick={clearAssistantConversation}
        >
          Clear conversation & start fresh
        </button>
      </div>
    </details>
  );
}
