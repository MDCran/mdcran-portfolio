"use client";
import { useEffect, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import FilterSelect from "@/components/shared/FilterSelect";
import { Settings, X, RotateCcw, Trash2, Plus } from "lucide-react";
import styles from "./AssistantControls.module.css";
import { readVisitorMemory, editRememberedTopics } from "@/lib/visitor-memory";
import {
  clearAssistantConversation,
  defaultAssistantPreferences,
  readAssistantPreferences,
  saveAssistantPreferences,
  type AssistantPreferences,
} from "@/lib/assistant-preferences";
export default function AssistantControls() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
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
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
      <button type="button" className={styles.settingsTrigger} aria-label="Conversation settings" title="Conversation settings">
        <Settings size={14} aria-hidden="true" />
      </button>
      </Popover.Trigger>
      <Popover.Portal>
      <Popover.Content aria-label="Conversation settings" data-assistant-ui data-force-dark="" className={styles.settingsPopover} align="end" sideOffset={12} collisionPadding={16} onEscapeKeyDown={(event) => event.stopPropagation()} onOpenAutoFocus={(event) => { event.preventDefault(); closeRef.current?.focus(); }}>
        <div className={styles.settingsHeader}>
          <Settings size={14} aria-hidden="true" />
          <span>Conversation settings</span>
          <button ref={closeRef} type="button" className={styles.settingsTrigger} aria-label="Close conversation settings" onClick={() => setOpen(false)}><X size={14} aria-hidden="true" /></button>
        </div>
      <div className={`${styles.body} ${styles.settingsBody}`}>
        <div className={styles.field}>
          <span>Audience</span>
          <FilterSelect label="Audience" className={styles.settingsSelect} value={prefs.audience}
            onChange={(value) => change({ audience: value as AssistantPreferences["audience"] })}
            options={[{ value: "general", label: "General" }, { value: "recruiter", label: "Recruiter" }, { value: "engineering", label: "Engineering" }]} />
        </div>
        <div className={styles.field}>
          <span>Answer detail</span>
          <FilterSelect label="Answer detail" className={styles.settingsSelect} value={prefs.detail}
            onChange={(value) => change({ detail: value as AssistantPreferences["detail"] })}
            options={[{ value: "concise", label: "Concise" }, { value: "detailed", label: "Detailed" }]} />
        </div>
        <label className={styles.field}>
          <span className={styles.fieldRow}><span>Speaking pace</span><span className={styles.pace}>{prefs.pace.toFixed(1)}×</span></span>
          <input
            className={styles.range}
            type="range"
            min="0.7"
            max="1.2"
            step="0.1"
            value={prefs.pace}
            onChange={(e) => change({ pace: Number(e.target.value) })}
          />
        </label>
        <label className={styles.field}>
          Pronunciation hint{" "}
          <input
            className={styles.input}
            maxLength={160}
            value={prefs.pronunciation}
            placeholder="e.g. pronounce my name as…"
            onChange={(e) => change({ pronunciation: e.target.value })}
          />
        </label>
        <label className={styles.toggleRow}>
          <input
            type="checkbox"
            checked={prefs.memory}
            onChange={(e) => change({ memory: e.target.checked })}
          />
          Remember visits and topics on this device
        </label>
        <p className={styles.note}>
          Memory is optional. When enabled, prior conversations may inform
          replies. Turning it off stops recall and removes saved device topics.
          Service and security logs may still be retained.
        </p>
        {prefs.memory && <div className={styles.topics}>
          <p>Remembered topics on this device</p>
          {topics.length === 0 && <p className={styles.note}>No saved topics.</p>}
          {topics.map((topic, index) => <div key={`${index}-${topic}`} className={styles.topicRow}><input aria-label={`Remembered topic ${index + 1}`} className={styles.input} defaultValue={topic} maxLength={80} onBlur={e => { if (e.target.value !== topic) editRememberedTopics(topics.map((t, i) => i === index ? e.target.value : t)); }} /><button className={styles.button} onClick={() => editRememberedTopics(topics.filter((_, i) => i !== index))} aria-label={`Delete remembered topic ${index + 1}`}><Trash2 size={13} aria-hidden="true" /></button></div>)}
          <form className={styles.topicRow} onSubmit={e => { e.preventDefault(); if (topicDraft.trim()) { editRememberedTopics([...topics, topicDraft]); setTopicDraft(""); } }}><input aria-label="New remembered topic" className={styles.input} value={topicDraft} maxLength={80} onChange={e => setTopicDraft(e.target.value)} placeholder="Add a topic to remember" /><button className={styles.button} type="submit"><Plus size={12} aria-hidden="true" />Save</button></form>
          <p className={styles.note}>Editing or deleting starts a fresh conversation so prior replies cannot restore removed topics. Up to six topics are saved.</p>
        </div>}
        <button
          className={styles.dangerButton}
          onClick={clearAssistantConversation}
        >
          <RotateCcw size={12} aria-hidden="true" />Clear conversation & start fresh
        </button>
      </div>
      </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
