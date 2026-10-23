import type { EvidenceSource } from "@/lib/assistant-evidence";
export default function EvidenceSources({ sources }: { sources?: EvidenceSource[] }) {
  if (!sources?.length) return null;
  return <details className="mt-3 rounded border border-current/20 p-2 text-xs"><summary>Public sources cited · {sources.length}</summary><ul className="mt-2 space-y-2">{sources.map(source => <li key={source.href}><a className="underline" href={source.href}>{source.title}</a><p className="mt-1 opacity-70">{source.excerpt}</p></li>)}</ul><p className="mt-2 opacity-60">Links matched to published portfolio records. Check the source for the scope of each claim.</p></details>;
}
