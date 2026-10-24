"use client";

export default function GameControls({ onKey, paused = false, startLabel = "Restart", canPause = true }: { onKey: (key: string) => void; paused?: boolean; startLabel?: string; canPause?: boolean }) {
  const buttons = [
    { key: "Enter", label: startLabel, text: startLabel },
    { key: "p", label: paused ? "Resume game" : "Pause game", text: paused ? "Resume" : "Pause" },
    { key: "ArrowLeft", label: "Move left", text: "←" },
    { key: "ArrowUp", label: "Move up", text: "↑" },
    { key: "ArrowDown", label: "Move down", text: "↓" },
    { key: "ArrowRight", label: "Move right", text: "→" },
  ];
  return (
    <div role="group" aria-label="Game controls" className="flex shrink-0 flex-wrap justify-center gap-1 p-2" onKeyDown={event => { if (event.key === "Enter" || event.key === " ") event.stopPropagation(); }}>
      {buttons.map(button => <button key={button.key} type="button" aria-label={button.label}
        disabled={button.key === "p" && !canPause}
        className="min-h-10 min-w-10 touch-manipulation rounded-sm border border-white/20 bg-white/5 px-2 text-xs text-white/80 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        onClick={() => onKey(button.key)}>{button.text}</button>)}
    </div>
  );
}
