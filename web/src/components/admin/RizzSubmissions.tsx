import type { RizzSubmission } from "@/lib/types";
import { allOptions, answerKeys, questionLabels, rizzThemes } from "@/lib/rizz";

export default function RizzSubmissions({ entries, onDelete }: { entries: RizzSubmission[]; onDelete: (entry: RizzSubmission) => void }) {
  const legacyKeys = { dateIdeas: "dateIdea", vibes: "vibe", activities: "activity", winOvers: "winOver" } as const;
  if (!entries.length) return <p className="rounded-xl border border-white/10 p-8 text-center text-sm text-white/50">No rizz submissions found.</p>;
  return <div className="grid gap-4 xl:grid-cols-2">{entries.map(entry => <article key={entry.id} className="min-w-0 rounded-xl border border-white/10 p-4 sm:p-5">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words text-base text-white">{entry.name}{entry.nickname && <span className="text-white/50"> · {entry.nickname}</span>}</h3><p className="mt-1 break-words text-sm text-white/70">{entry.phone}</p><p className="mt-2 text-xs text-white/50">{new Date(entry.createdAt).toLocaleString()}{entry.theme && rizzThemes[entry.theme] ? ` · ${rizzThemes[entry.theme].name}` : ""}{entry.setting && entry.setting !== "any" ? ` · ${entry.setting}` : ""}</p></div><button type="button" className="min-h-11 rounded-lg border border-red-400/25 px-3 text-xs text-red-300" onClick={() => onDelete(entry)}>Delete</button></div>
    <dl className="mt-4 space-y-4">{answerKeys.map(key => {
      const legacyValue = entry[legacyKeys[key]];
      const selections = entry[key] ?? (legacyValue ? [legacyValue] : []);
      const written = entry.customAnswers?.[key] || (key === "winOvers" ? entry.winOverOther : undefined);
      return <div key={key} className="border-t border-white/5 pt-3"><dt className="text-xs text-rose-200/80">{questionLabels[key]}</dt><dd className="mt-1 break-words text-sm leading-relaxed text-white/75">{selections.map(value => allOptions[key].find(option => option.value === value)?.label ?? value.replaceAll("-", " ")).join(" · ") || (written ? "" : "—")}{written && <p className="mt-1 whitespace-pre-wrap break-words text-white/60">{written}</p>}</dd></div>;
    })}</dl>
  </article>)}</div>;
}
