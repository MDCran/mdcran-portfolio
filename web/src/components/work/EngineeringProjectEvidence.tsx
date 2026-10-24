import { ExternalLink } from "lucide-react";
import ArchitectureDiagram from "./ArchitectureDiagram";
import ProjectWalkthrough from "./ProjectWalkthrough";
import type { EngineeringProjectDetail } from "@/lib/engineering";

/** Engineering context stays on the full project page rather than inside a card. */
export default function EngineeringProjectEvidence({ slug, detail }: { slug: string; detail?: EngineeringProjectDetail }) {
  return (
    <section aria-label="Engineering details" className="space-y-10">
      {detail?.contribution && <div>
        <h2 className="font-nord text-lg text-white">Contribution & implementation</h2>
        <p className="mt-4 text-sm leading-7 text-white/70">{detail.contribution}</p>
      </div>}
      {!!detail?.decisions?.length && <div>
        <h2 className="font-nord text-lg text-white">Engineering approach</h2>
        <ul className="mt-4 space-y-3 pl-5 text-sm leading-7 text-white/70">
          {detail.decisions.map((decision) => <li key={decision} className="list-disc marker:text-[var(--cranberry)]">{decision}</li>)}
        </ul>
      </div>}
      <ArchitectureDiagram slug={slug} />
      <ProjectWalkthrough slug={slug} />
      {detail?.evidence && <div className="border-t border-white/10 pt-6 text-sm">
        <a href={detail.evidence} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[var(--cranberry)] transition-colors hover:text-white">{detail.evidenceLabel ?? "Additional evidence"}<ExternalLink size={14} aria-hidden="true" /></a>
      </div>}
    </section>
  );
}
