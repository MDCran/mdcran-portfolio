import { ExternalLink, Github } from "lucide-react";
import ArchitectureDiagram from "./ArchitectureDiagram";
import ProjectWalkthrough from "./ProjectWalkthrough";
import type { EngineeringProjectDetail } from "@/lib/engineering";

/** Engineering context stays on the full project page rather than inside a card. */
export default function EngineeringProjectEvidence({ slug, detail }: { slug: string; detail?: EngineeringProjectDetail }) {
  return (
    <section aria-label="Engineering details" className="space-y-6">
      {detail?.status && <p className="text-xs text-white/50">{detail.status}</p>}
      {detail?.summary && <p className="text-sm leading-relaxed text-white/70">{detail.summary}</p>}
      {detail?.contribution && <div>
        <h2 className="font-nord text-lg text-white">Contribution & implementation</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/70">{detail.contribution}</p>
      </div>}
      {!!detail?.decisions?.length && <div>
        <h2 className="font-nord text-lg text-white">Engineering approach</h2>
        <ul className="mt-3 space-y-2 pl-5 text-sm leading-relaxed text-white/70">
          {detail.decisions.map((decision) => <li key={decision} className="list-disc marker:text-[var(--cranberry)]">{decision}</li>)}
        </ul>
      </div>}
      {!!detail?.skills?.length && <p className="text-xs leading-relaxed text-white/50">{detail.skills.join(" · ")}</p>}
      <ArchitectureDiagram slug={slug} />
      <ProjectWalkthrough slug={slug} />
      {(detail?.sourceUrl || detail?.evidence) && <div className="flex flex-wrap gap-4 border-t border-white/10 pt-5 text-sm">
        {detail.sourceUrl && <a href={detail.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[var(--cranberry)] underline underline-offset-4"><Github size={15} aria-hidden="true" />{detail.sourceLabel ?? "Public source"}</a>}
        {detail.evidence && <a href={detail.evidence} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-white/75 underline underline-offset-4">{detail.evidenceLabel ?? "Additional evidence"}<ExternalLink size={14} aria-hidden="true" /></a>}
      </div>}
    </section>
  );
}
