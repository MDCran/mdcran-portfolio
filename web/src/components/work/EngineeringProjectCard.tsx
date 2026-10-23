import Image from "next/image";
import { Fragment, type ReactNode } from "react";
import { Code2, ExternalLink, Github } from "lucide-react";
import ArchitectureDiagram from "@/components/work/ArchitectureDiagram";
import ProjectWalkthrough from "@/components/work/ProjectWalkthrough";
import SectionActions from "@/components/shared/SectionActions";
import { engineeringProjects, type EngineeringProjectDetail } from "@/lib/engineering";
import type { ArticleSection, ImageAsset, Project } from "@/lib/types";
import { imageAssetAlt, imageAssetSrc, shouldBypassImageOptimization } from "@/lib/utils";

function renderInline(text: string): ReactNode[] {
  return text
    .split(/(\*\*.+?\*\*|https?:\/\/[^\s<]+)/g)
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (/^https?:\/\//.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-[var(--cranberry)] underline underline-offset-2 hover:text-white"
          >
            {part}
          </a>
        );
      }
      return <Fragment key={index}>{part}</Fragment>;
    });
}

function renderProjectMarkdown(content: string): ReactNode {
  const blocks = content.split(/\n\s*\n/).filter((block) => block.trim());
  return blocks.map((block, blockIndex) => {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.every((line) => line.startsWith("|") && line.endsWith("|"))) {
      const rows = lines
        .filter((line) => !/^\|[\s|:-]+\|$/.test(line))
        .map((line) =>
          line
            .slice(1, -1)
            .split("|")
            .map((cell) => cell.trim()),
        );
      const [head, ...body] = rows;
      return (
        <div
          key={blockIndex}
          className="my-5 overflow-x-auto rounded-sm border border-white/10"
        >
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr>
                {head?.map((cell, index) => (
                  <th
                    key={index}
                    className="border-b border-white/10 bg-white/5 px-3 py-2 font-semibold text-white"
                  >
                    {renderInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, index) => (
                    <td
                      key={index}
                      className="border-b border-white/5 px-3 py-2 align-top text-white/70"
                    >
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (lines[0]?.startsWith("### ")) {
      return (
        <h4 key={blockIndex} className="mt-6 text-sm font-semibold text-white">
          {lines[0].slice(4)}
        </h4>
      );
    }
    if (lines[0]?.startsWith("## ")) {
      return (
        <h4
          key={blockIndex}
          className="mt-7 text-base font-semibold text-white"
        >
          {lines[0].slice(3)}
        </h4>
      );
    }
    if (lines[0]?.startsWith("# ")) {
      return (
        <h4 key={blockIndex} className="mt-7 text-lg font-semibold text-white">
          {lines[0].slice(2)}
        </h4>
      );
    }
    if (lines.every((line) => /^[-*] /.test(line))) {
      return (
        <ul
          key={blockIndex}
          className="my-4 space-y-2 pl-5 text-sm leading-relaxed text-white/70"
        >
          {lines.map((line, index) => (
            <li
              key={index}
              className="list-disc marker:text-[var(--cranberry)]"
            >
              {renderInline(line.slice(2))}
            </li>
          ))}
        </ul>
      );
    }
    return (
      <p
        key={blockIndex}
        className="my-4 whitespace-pre-line text-sm leading-relaxed text-white/70"
      >
        {renderInline(block.replace(/\n/g, " "))}
      </p>
    );
  });
}

function ProjectImage({
  source,
  fallback,
  caption,
}: {
  source: string | ImageAsset;
  fallback: string;
  caption?: string;
}) {
  const src = imageAssetSrc(source);
  if (!src) return null;
  return (
    <figure className="overflow-hidden rounded-sm border border-white/10 bg-black/20">
      <Image
        src={src}
        alt={imageAssetAlt(source, fallback)}
        width={1400}
        height={900}
        sizes="(max-width: 768px) 100vw, 50vw"
        className="h-auto w-full"
        unoptimized={shouldBypassImageOptimization(src)}
      />
      {caption && (
        <figcaption className="px-3 py-2 text-xs text-white/50">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function ProjectSectionContent({
  section,
  projectTitle,
}: {
  section: ArticleSection;
  projectTitle: string;
}) {
  switch (section.type) {
    case "text":
      return <div>{renderProjectMarkdown(section.content ?? "")}</div>;
    case "quote":
      return section.content ? (
        <blockquote className="my-5 border-l-2 border-[var(--cranberry)] pl-4 text-sm italic leading-relaxed text-white/75">
          “{section.content}&rdquo;
          {section.caption && (
            <cite className="mt-2 block text-xs not-italic text-white/45">
              — {section.caption}
            </cite>
          )}
        </blockquote>
      ) : null;
    case "image":
      return section.src ? (
        <ProjectImage
          source={section.src}
          fallback={section.alt ?? projectTitle}
          caption={section.caption}
        />
      ) : null;
    case "gallery":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {(section.images ?? []).map((image, index) => (
            <ProjectImage
              key={index}
              source={image}
              fallback={`${projectTitle} gallery image ${index + 1}`}
            />
          ))}
        </div>
      );
    case "video":
      return section.youtubeId ? (
        <div className="overflow-hidden rounded-sm border border-white/10">
          <div className="relative aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${section.youtubeId}`}
              title={section.caption ?? `${projectTitle} demo`}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          </div>
        </div>
      ) : null;
    case "code":
      return (
        <pre className="overflow-x-auto rounded-sm border border-white/10 bg-black/30 p-4 text-xs leading-relaxed text-emerald-300">
          <code>{section.content}</code>
        </pre>
      );
    case "before-after": {
      const before = imageAssetSrc(section.beforeImage);
      const after = imageAssetSrc(section.afterImage);
      if (!before || !after) return null;
      return (
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ProjectImage
              source={section.beforeImage!}
              fallback={`${projectTitle} before`}
            />
            <ProjectImage
              source={section.afterImage!}
              fallback={`${projectTitle} after`}
            />
          </div>
          {section.caption && (
            <p className="mt-2 text-xs text-white/50">{section.caption}</p>
          )}
        </div>
      );
    }
    case "divider":
      return <hr className="my-6 border-white/10" />;
    case "checklist":
    case "ingredient-list":
    case "steps":
    case "store-checklist":
      return section.items?.length ? (
        <ul className="my-4 space-y-2 pl-5 text-sm text-white/70">
          {section.items.map((item, index) => (
            <li
              key={index}
              className="list-disc marker:text-[var(--cranberry)]"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : null;
    case "info-block":
      return section.label || section.value ? (
        <p className="text-sm text-white/70">
          <strong className="text-white">{section.label}</strong>
          {section.label && section.value ? ": " : ""}
          {section.value}
        </p>
      ) : null;
    case "button":
      return section.content && section.label ? (
        <a
          href={section.content}
          target={section.content.startsWith("http") ? "_blank" : undefined}
          rel={
            section.content.startsWith("http")
              ? "noopener noreferrer"
              : undefined
          }
          className="inline-flex items-center gap-2 rounded-sm border border-white/15 px-4 py-2 text-sm text-white/80 hover:border-[var(--cranberry)] hover:text-white"
        >
          {section.label}
          <ExternalLink size={13} aria-hidden="true" />
        </a>
      ) : null;
    case "pdf":
      return section.src ? (
        <a
          href={section.src}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[var(--cranberry)] underline underline-offset-4"
        >
          {section.caption ?? "Open PDF"}
        </a>
      ) : null;
    default:
      return section.content ? (
        <p className="whitespace-pre-line text-sm leading-relaxed text-white/70">
          {section.content}
        </p>
      ) : section.caption ? (
        <p className="text-sm text-white/60">{section.caption}</p>
      ) : null;
  }
}

export default function EngineeringProjectCard({ project, detailOverride }: { project: Project; detailOverride?: EngineeringProjectDetail }) {
  const detail = detailOverride ?? engineeringProjects[project.slug];
  const cover = project.coverImage ?? project.images?.[0];
  const sourceUrl = detail?.sourceUrl ?? project.githubUrl ?? project.repositories?.[0]?.url;
  const additionalRepositories = (project.repositories ?? []).filter(
    (repository) => repository.url !== sourceUrl,
  );
  const skills = Array.from(
    new Set([...(project.tags ?? []), ...(detail?.skills ?? [])]),
  );
  const expandedImages = project.images ?? [];
  const videos = project.videos ?? [];
  const hasExpandedContent =
    !!project.sections?.length ||
    expandedImages.length > 0 ||
    videos.length > 0;

  const coverSrc = imageAssetSrc(cover);
  return (
    <article id={`project-${project.slug}`} className="group flex h-full min-w-0 flex-col overflow-hidden rounded-sm border border-white/7 bg-white/2 transition-colors hover:border-[var(--cranberry)]/25">
      <div className="relative aspect-video shrink-0 overflow-hidden bg-white/5">
        {coverSrc ? <Image src={coverSrc} alt={imageAssetAlt(cover, project.title)} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" unoptimized={shouldBypassImageOptimization(coverSrc)} /> : <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--cranberry-dim)] to-transparent"><Code2 size={40} className="text-[var(--cranberry)]/60" aria-hidden="true" /></div>}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-nord text-sm leading-snug tracking-wide text-white">{project.title}</h3>
        <p className="mt-2 text-[10px] text-white/40">{project.slug === "core-ai" ? "Case study · Private platform · Public contracts" : project.slug === "army-reserve-mercury" ? "Case study · Organization linked" : sourceUrl ? "Public source" : "Case study"}{project.liveUrl ? " · Live product" : ""}</p>
        <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-white/50">{project.description || detail?.summary}</p>
      {skills.length > 0 && (
        <ul
          aria-label={`${project.title} technologies and skills`}
          className="mt-4 mb-5 flex flex-wrap gap-1.5"
        >
          {skills.slice(0, 4).map((skill) => (
            <li
              key={skill}
              className="rounded-sm border border-white/8 bg-white/4 px-2 py-1 text-[10px] text-white/50"
            >
              {skill}
            </li>
          ))}
        </ul>
      )}

      <details className="mt-auto border-t border-white/8 pt-4">
        <summary className="cursor-pointer text-[11px] font-medium uppercase tracking-wider text-white/70 transition-colors hover:text-[var(--cranberry)]">Project details & demos</summary>
        <SectionActions anchor={`project-${project.slug}`} />
        {detail?.status && <p className="mt-4 text-xs leading-relaxed text-white/50">{detail.status}</p>}
        {project.description && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-white/65">{project.description}</p>}
        {detail?.summary && detail.summary !== project.description && <p className="mt-3 text-sm leading-relaxed text-white/65">{detail.summary}</p>}
        {skills.length > 4 && <p className="mt-4 text-xs leading-relaxed text-white/50">{skills.join(" · ")}</p>}
      {detail?.contribution && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-white">
            Contribution & implementation
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-white/70">
            {detail.contribution}
          </p>
        </div>
      )}
      {detail?.decisions?.length ? (
        <div className="mt-5">
          <h4 className="text-sm font-semibold text-white">
            Engineering approach
          </h4>
          <ul className="mt-2 space-y-2 pl-5 text-sm leading-relaxed text-white/70">
            {detail.decisions.map((decision) => (
              <li
                key={decision}
                className="list-disc marker:text-[var(--cranberry)]"
              >
                {decision}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ArchitectureDiagram slug={project.slug} />
      <ProjectWalkthrough slug={project.slug} />
      {hasExpandedContent ? (
        <details className="group mt-6 border-t border-white/10 pt-4">
          <summary className="cursor-pointer list-none text-sm font-medium text-white/80 marker:hidden hover:text-white">
            <span className="inline-flex items-center gap-2">
              Full project notes, screenshots & demos{" "}
              <span className="text-xs text-white/40 group-open:hidden">
                ＋
              </span>
              <span className="hidden text-xs text-white/40 group-open:inline">
                −
              </span>
            </span>
            <span className="mt-1 block text-xs font-normal text-white/45">
              {project.sections?.length ?? 0} project sections
              {expandedImages.length
                ? ` · ${expandedImages.length} gallery image${expandedImages.length === 1 ? "" : "s"}`
                : ""}
              {videos.length
                ? ` · ${videos.length} video${videos.length === 1 ? "" : "s"}`
                : ""}
            </span>
          </summary>
          <div className="mt-5 space-y-5">
            {project.sections?.map((section, index) => (
              <ProjectSectionContent
                key={`${project.slug}-${index}`}
                section={section}
                projectTitle={project.title}
              />
            ))}
            {expandedImages.length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-semibold text-white">
                  Project gallery
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {expandedImages.map((image, index) => (
                    <ProjectImage
                      key={index}
                      source={image}
                      fallback={`${project.title} gallery image ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}
            {videos.map((video) => (
              <div
                key={video.youtubeId}
                className="overflow-hidden rounded-sm border border-white/10"
              >
                <div className="relative aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${video.youtubeId}`}
                    title={video.title}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full"
                  />
                </div>
                <p className="px-3 py-2 text-xs text-white/50">{video.title}</p>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      </details>
      {(sourceUrl ||
        project.liveUrl ||
        project.externalUrl ||
        detail?.evidence) && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-3 border-t border-white/8 pt-4 text-xs">
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[var(--cranberry)] hover:underline underline-offset-4"
            >
              <Github size={15} aria-hidden="true" />
              {detail?.sourceLabel ?? "Source"}
            </a>
          )}
          {additionalRepositories.map((repository) => (
            <a
              key={repository.url}
              href={repository.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[var(--cranberry)] hover:underline underline-offset-4"
            >
              <Github size={15} aria-hidden="true" />
              {repository.label}
            </a>
          ))}
          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-white/80 hover:underline underline-offset-4"
            >
              <ExternalLink size={14} aria-hidden="true" />
              Live site
            </a>
          )}
          {project.externalUrl && project.externalUrl !== detail?.evidence && (
            <a
              href={project.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-white/80 hover:underline underline-offset-4"
            >
              <ExternalLink size={14} aria-hidden="true" />
              Project reference
            </a>
          )}
          {detail?.evidence && (
            <a
              href={detail.evidence}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-white/80 hover:underline underline-offset-4"
            >
              {detail.evidenceLabel ?? "Additional evidence"}
              <ExternalLink size={13} aria-hidden="true" />
            </a>
          )}
        </div>
      )}
      </div>
    </article>
  );
}
