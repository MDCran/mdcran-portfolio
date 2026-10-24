"use client";

import EvidenceSources from "./EvidenceSources";
import type { EvidenceSource } from "@/lib/assistant-evidence";
import MicrophoneTest, { type MicrophoneTestControl } from "./MicrophoneTest";
import { useRef } from "react";
import AssistantControls from "./AssistantControls";
import { AudioLines, Mic, MicOff, MessageSquare, Send, Text } from "lucide-react";
import styles from "./AssistantControls.module.css";

interface Props {
  onMicrophoneTest: () => void;
  paused: boolean;
  onPause: () => void;
  onTextHandoff: () => void;
  turns: { role: "user" | "assistant"; text: string; sources?: EvidenceSource[] }[];
  text: string;
  onTextChange: (text: string) => void;
  onSend: () => void;
  thinking: boolean;
}

export default function VoiceConversationControls({
  onMicrophoneTest,
  paused,
  onPause,
  onTextHandoff,
  turns,
  text,
  onTextChange,
  onSend,
  thinking,
}: Props) {
  const microphoneTest = useRef<MicrophoneTestControl | null>(null);
  return (
    <div
      data-assistant-ui
      data-force-dark=""
      className={styles.panel}
    >
      <div className={styles.header}>
        <span className={styles.iconBox}><AudioLines size={17} aria-hidden="true" /></span>
        <div><p className={styles.heading}>Voice controls</p><p className={styles.subtitle}>Your conversation, your pace</p></div>
        <div className={styles.settingsSlot}><AssistantControls /></div>
      </div>
      <div className={styles.toolbar}>
        <button
          className={styles.button}
          onClick={() => { microphoneTest.current?.stop(); onPause(); }}
        >
          {paused ? <Mic size={13} aria-hidden="true" /> : <MicOff size={13} aria-hidden="true" />}
          {paused ? "Resume microphone" : "Pause microphone"}
        </button>
        <button
          className={styles.button}
          onClick={onTextHandoff}
        >
          <MessageSquare size={13} aria-hidden="true" /> Continue in text
        </button>
      </div>
      <details className={styles.accordion}>
        <summary className={styles.summary}><Text size={14} aria-hidden="true" />Transcript & text input</summary>
        <div className={styles.body}>
        <div className={styles.transcript}>
          {turns.length === 0 && <p className={styles.note}>Your conversation will appear here. You can also type a question below.</p>}
          {turns.map((turn, index) => (
            <div key={index} className={styles.turn} data-role={turn.role}>
              <strong className={styles.turnRole}>{turn.role === "user" ? "You" : "AI guide"}</strong>
              {turn.text}
              <EvidenceSources sources={turn.sources} />
            </div>
          ))}
        </div>
        <label className={styles.field}>
          Edit or type your question
          <textarea
            className={styles.input}
            placeholder="Type a question or edit your transcript…"
            value={text}
            maxLength={6000}
            onChange={(event) => onTextChange(event.target.value)}
          />
        </label>
        <button
          disabled={!text.trim() || thinking}
          className={styles.primaryButton}
          onClick={onSend}
        >
          <Send size={12} aria-hidden="true" /> Send text
        </button>
        </div>
      </details>
      <MicrophoneTest ref={microphoneTest} onStart={onMicrophoneTest} />
    </div>
  );
}
