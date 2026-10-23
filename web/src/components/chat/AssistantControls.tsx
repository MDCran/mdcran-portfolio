"use client";
import { useEffect, useState } from "react";
import { readVisitorMemory, editRememberedTopics } from "@/lib/visitor-memory";
import {
  clearAssistantConversation,
  defaultAssistantPreferences,
  readAssistantPreferences,
  saveAssistantPreferences,
  type AssistantPreferences,
} from "@/lib/assistant-preferences";
export default function AssistantControls() {
  const [prefs, setPrefs] = useState(defaultAssistantPreferences);
  const [topics, setTopics] = useState<string[]>([]);
  const [topicDraft, setTopicDraft] = useState("");
  useEffect(() => {
    const update = () => { setPrefs(readAssistantPreferences()); setTopics(readVisitorMemory().topics); };
    update();
    window.addEventListener("mdcran:preferences-changed", update);
    window.addEventListener("mdcran:memory-changed", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("mdcran:preferences-changed", update);
      window.removeEventListener("mdcran:memory-changed", update);
      window.removeEventListener("storage", update);
    };
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
        {prefs.memory && <div className="space-y-2">
          <p>Remembered topics on this device</p>
          {topics.length === 0 && <p className="opacity-60">No saved topics.</p>}
          {topics.map((topic, index) => <div key={`${index}-${topic}`} className="flex items-center gap-2"><input aria-label={`Remembered topic ${index + 1}`} className="min-w-0 flex-1 border border-current/20 bg-transparent p-1" defaultValue={topic} maxLength={80} onBlur={e => { if (e.target.value !== topic) editRememberedTopics(topics.map((t, i) => i === index ? e.target.value : t)); }} /><button onClick={() => editRememberedTopics(topics.filter((_, i) => i !== index))} aria-label={`Delete remembered topic ${index + 1}`}>Delete</button></div>)}
          <form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (topicDraft.trim()) { editRememberedTopics([...topics, topicDraft]); setTopicDraft(""); } }}><input aria-label="New remembered topic" className="min-w-0 flex-1 border border-current/20 bg-transparent p-1" value={topicDraft} maxLength={80} onChange={e => setTopicDraft(e.target.value)} placeholder="Add a topic to remember" /><button type="submit">Save</button></form>
          <p className="opacity-60">Editing or deleting starts a fresh conversation so prior replies cannot restore removed topics. Up to six topics are saved.</p>
        </div>}
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
