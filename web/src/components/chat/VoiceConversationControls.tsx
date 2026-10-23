"use client";

import EvidenceSources from "./EvidenceSources";
import type { EvidenceSource } from "@/lib/assistant-evidence";
import MicrophoneTest from "./MicrophoneTest";
import AssistantControls from "./AssistantControls";

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
  return (
    <div
      data-assistant-ui
      className="max-h-[65vh] w-[min(90vw,24rem)] overflow-y-auto rounded border border-white/15 bg-black/95 text-white"
    >
      <div className="flex flex-wrap gap-2 p-3 text-xs">
        <button
          className="rounded border border-white/20 px-3 py-2"
          onClick={onPause}
        >
          {paused ? "Resume microphone" : "Pause microphone"}
        </button>
        <button
          className="rounded border border-white/20 px-3 py-2"
          onClick={onTextHandoff}
        >
          Continue in text
        </button>
      </div>
      <details className="px-3 pb-3 text-xs">
        <summary className="cursor-pointer">Transcript & text input</summary>
        <div className="my-2 max-h-40 space-y-2 overflow-y-auto">
          {turns.map((turn, index) => (
            <div key={index}>
              <strong>{turn.role === "user" ? "You" : "AI guide"}:</strong>{" "}
              {turn.text}
              <EvidenceSources sources={turn.sources} />
            </div>
          ))}
        </div>
        <label className="block">
          Edit or type your question
          <textarea
            className="my-2 block w-full border border-white/20 bg-transparent p-2"
            value={text}
            maxLength={6000}
            onChange={(event) => onTextChange(event.target.value)}
          />
        </label>
        <button
          disabled={!text.trim() || thinking}
          className="rounded border border-white/20 px-3 py-2 disabled:opacity-40"
          onClick={onSend}
        >
          Send text
        </button>
      </details>
      <MicrophoneTest onStart={onMicrophoneTest} />
      <AssistantControls />
    </div>
  );
}
