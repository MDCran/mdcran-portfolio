import { formatPublishDate } from "@/lib/read-time";
import EngineeringExplorer from "@/components/work/EngineeringExplorer";
import ArchitectureDiagram from "@/components/work/ArchitectureDiagram";
import ProjectWalkthrough from "@/components/work/ProjectWalkthrough";
import PublicVitals from "@/components/shared/PublicVitals";
import SectionActions from "@/components/shared/SectionActions";
import Image from "next/image";
import Link from "next/link";
import { Fragment, Suspense, type ReactNode } from "react";
import { ArrowRight, ExternalLink, Github, Mail } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  ENGINEERING_SUMMARY,
  coreAiContracts,
  engineeringFocus,
  engineeringProjectOrder,
  engineeringProjects,
} from "@/lib/engineering";
import { getProjects, getArticles } from "@/lib/public-content-cache";
import type { ArticleSection, ImageAsset, Project } from "@/lib/types";
import { buildSeoMetadata, CONTACT_EMAIL } from "@/lib/seo";
import {
  imageAssetAlt,
  imageAssetSrc,
  shouldBypassImageOptimization,
} from "@/lib/utils";

export const metadata = buildSeoMetadata({
  title: "Michael Cran | Software, AI & Full-Stack Engineering",
  description:
    "Michael Cran's engineering portfolio: AI agents, TypeScript safety contracts, Java APIs, React applications, and cloud infrastructure. Review public code and architecture.",
  path: "/engineering",
  keywords: [
    "Michael Cran",
    "software engineer",
    "AI engineer",
    "full-stack engineer",
    "backend engineer",
    "Python",
    "TypeScript",
    "React",
    "Java",
    "PostgreSQL",
    "AWS",
  ],
});

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

function ProjectCard({ project }: { project: Project }) {
  const detail = engineeringProjects[project.slug];
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

  return (
    <article
      id={`project-${project.slug}`}
      className="scroll-mt-28 rounded-sm border border-white/12 bg-white/3 p-5 sm:p-7"
    >
      <p className="text-[11px] uppercase tracking-wider text-[var(--cranberry)]">
        {detail?.category ?? "Software engineering"}
      </p>
      <h3 className="mt-3 text-2xl font-semibold text-white">
        {project.title}
      </h3>
      <p className="mt-2 text-xs text-white/55">
        {project.slug === "core-ai"
          ? "Public case study · Private platform implementation · Public contracts"
          : sourceUrl
            ? "Public source linked"
            : "Public case study · Source not listed"}
        {project.liveUrl ? " · Live product" : ""}
      </p>
      <SectionActions anchor={`project-${project.slug}`} />
      {detail?.status && (
        <p className="mt-2 text-xs text-white/55">{detail.status}</p>
      )}
      {cover && (
        <div className="mt-5 overflow-hidden rounded-sm border border-white/10">
          <ProjectImage source={cover} fallback={project.title} />
        </div>
      )}
      {project.description && (
        <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-white/75">
          {project.description}
        </p>
      )}
      {detail?.summary && detail.summary !== project.description && (
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          {detail.summary}
        </p>
      )}

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
      {skills.length > 0 && (
        <ul
          aria-label={`${project.title} technologies and skills`}
          className="mt-5 flex flex-wrap gap-2"
        >
          {skills.map((skill) => (
            <li
              key={skill}
              className="rounded-sm border border-white/15 px-2 py-1 text-xs text-white/75"
            >
              {skill}
            </li>
          ))}
        </ul>
      )}

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

      {(sourceUrl ||
        project.liveUrl ||
        project.externalUrl ||
        detail?.evidence) && (
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 border-t border-white/10 pt-5 text-sm">
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
    </article>
  );
}

function CoreAiContractsCard() {
  return (
    <article
      id={`project-${coreAiContracts.id}`}
      className="scroll-mt-28 rounded-sm border border-white/12 bg-white/3 p-5 sm:p-7"
    >
      <p className="text-[11px] uppercase tracking-wider text-[var(--cranberry)]">
        {coreAiContracts.category}
      </p>
      <h3 className="mt-3 text-2xl font-semibold text-white">
        {coreAiContracts.title}
      </h3>
      <p className="mt-2 text-xs text-white/55">{coreAiContracts.status}</p>
      <p className="mt-5 text-sm leading-relaxed text-white/75">
        {coreAiContracts.summary}
      </p>
      <h4 className="mt-6 text-sm font-semibold text-white">
        Contribution & implementation
      </h4>
      <p className="mt-2 text-sm leading-relaxed text-white/70">
        {coreAiContracts.contribution}
      </p>
      <h4 className="mt-5 text-sm font-semibold text-white">
        Engineering approach
      </h4>
      <ul className="mt-2 space-y-2 pl-5 text-sm leading-relaxed text-white/70">
        {coreAiContracts.decisions.map((decision) => (
          <li
            key={decision}
            className="list-disc marker:text-[var(--cranberry)]"
          >
            {decision}
          </li>
        ))}
      </ul>
      <ul
        aria-label="Core AI technologies and skills"
        className="mt-5 flex flex-wrap gap-2"
      >
        {coreAiContracts.skills.map((skill) => (
          <li
            key={skill}
            className="rounded-sm border border-white/15 px-2 py-1 text-xs text-white/75"
          >
            {skill}
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 border-t border-white/10 pt-5 text-sm">
        <a
          href={coreAiContracts.repo}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-[var(--cranberry)] hover:underline underline-offset-4"
        >
          <Github size={15} aria-hidden="true" />
          Source
        </a>
        <a
          href={coreAiContracts.evidence}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-white/80 hover:underline underline-offset-4"
        >
          Read the public contracts{" "}
          <ExternalLink size={13} aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}

export default async function EngineeringPage() {
  const [allProjects, articles] = await Promise.all([
    getProjects(),
    getArticles(),
  ]);
  const engineeringWork = allProjects.filter(
    (project) =>
      ["coding-projects", "code"].includes(project.category.toLowerCase()) ||
      (project.extraCategories ?? []).some((category) =>
        ["coding-projects", "code"].includes(category.toLowerCase()),
      ),
  );
  const projectsBySlug = new Map(
    engineeringWork.map((project) => [project.slug, project]),
  );
  const orderedProjects = [
    ...engineeringProjectOrder
      .map((slug) => projectsBySlug.get(slug))
      .filter((project): project is Project => !!project),
    ...engineeringWork.filter(
      (project) =>
        !engineeringProjectOrder.includes(
          project.slug as (typeof engineeringProjectOrder)[number],
        ),
    ),
  ];

  return (
    <>
      <Navbar />
      <main className="public-portfolio content-container pb-20 pt-36 sm:pt-40">
        <section aria-labelledby="engineering-heading" className="max-w-3xl">
          <p className="mb-4 text-xs uppercase tracking-[0.2em] text-[var(--cranberry)]">
            Michael Cran · Open for engineering roles
          </p>
          <h1
            id="engineering-heading"
            className="font-nord text-3xl leading-tight text-white sm:text-5xl"
          >
            Software & AI engineering
          </h1>
          <p className="mt-6 text-base leading-relaxed text-white/75">
            {ENGINEERING_SUMMARY}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/resume"
              className="inline-flex items-center gap-2 rounded-sm bg-[var(--cranberry)] px-5 py-3 text-sm font-medium text-black"
            >
              View resume <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <a
              href="https://github.com/MDCran"
              className="inline-flex items-center gap-2 rounded-sm border border-white/20 px-5 py-3 text-sm text-white/85"
            >
              <Github size={16} aria-hidden="true" />
              GitHub
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center gap-2 px-3 py-3 text-sm text-white/75"
            >
              <Mail size={16} aria-hidden="true" />
              Discuss a role
            </a>
          </div>
        </section>

        <section aria-labelledby="focus-heading" className="mt-16">
          <h2 id="focus-heading" className="font-nord text-2xl text-white">
            Where I can contribute
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/65">
            My work spans applied AI, full-stack and backend development, and
            cloud operations. These are the core tools from my resume, with
            public projects below for a closer look.
          </p>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {engineeringFocus.map((focus) => (
              <article
                key={focus.id}
                id={focus.id}
                className="scroll-mt-28 rounded-sm border border-white/12 bg-white/3 p-6"
              >
                <h3 className="text-lg font-semibold text-white">
                  {focus.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-white/70">
                  {focus.description}
                </p>
                <ul
                  aria-label={`${focus.title} tools`}
                  className="mt-5 flex flex-wrap gap-2"
                >
                  {focus.skills.map((skill) => (
                    <li
                      key={skill}
                      className="rounded-sm border border-white/15 px-2 py-1 text-xs text-white/75"
                    >
                      {skill}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-xs leading-relaxed text-white/60">
                  {focus.evidence}
                </p>
                <a
                  href="#projects"
                  className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--cranberry)] underline-offset-4 hover:underline"
                >
                  Review projects <ArrowRight size={14} aria-hidden="true" />
                </a>
              </article>
            ))}
          </div>
        </section>

        <section
          id="projects"
          aria-labelledby="projects-heading"
          className="mt-16 scroll-mt-28"
        >
          <h2 id="projects-heading" className="font-nord text-2xl text-white">
            Engineering work
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/65">
            {orderedProjects.length + 1} public software projects and packages
            are gathered here with their implementation notes, screenshots,
            demos, and source links. Open a project’s notes to review its full
            write-up.
          </p>
          <Suspense
            fallback={
              <p className="py-8 text-white/60">Loading project filters…</p>
            }
          >
            <EngineeringExplorer
              entries={[
                ...orderedProjects.map((p) => ({
                  slug: p.slug,
                  title: p.title,
                  text: [
                    p.title,
                    p.description,
                    ...(p.tags ?? []),
                    ...(engineeringProjects[p.slug]?.skills ?? []),
                    engineeringProjects[p.slug]?.category,
                  ].join(" "),
                })),
                {
                  slug: coreAiContracts.id,
                  title: coreAiContracts.title,
                  text: `${coreAiContracts.title} ${coreAiContracts.skills.join(" ")}`,
                },
              ]}
            >
              {orderedProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
              <CoreAiContractsCard />
            </EngineeringExplorer>
          </Suspense>
        </section>

        {articles.filter((a) =>
          (a.tags ?? []).some((t) =>
            /engineering|typescript|react|ai|software|cloud/i.test(t),
          ),
        ).length > 0 && (
          <section className="mt-12">
            <h2 className="font-nord text-xl text-white">Related writing</h2>
            <ul className="mt-4 space-y-3">
              {articles
                .filter((a) =>
                  (a.tags ?? []).some((t) =>
                    /engineering|typescript|react|ai|software|cloud/i.test(t),
                  ),
                )
                .slice(0, 4)
                .map((a) => (
                  <li key={a.id}>
                    <Link
                      className="text-sm text-[var(--cranberry)] underline"
                      href={`/articles/${a.slug}`}
                    >
                      {a.title}
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        )}
        <section
          id="building-now"
          className="mt-12 rounded-sm border border-white/15 p-6"
        >
          <h2 className="font-nord text-2xl text-white">
            Current public project status
          </h2>
          <p className="mt-2 text-sm text-white/55">
            Status from published project notes; these are not live activity
            reports.
          </p>
          <ul className="mt-4 space-y-3">
            {orderedProjects
              .filter((p) => engineeringProjects[p.slug])
              .slice(0, 4)
              .map((p) => (
                <li key={p.slug} className="text-sm text-white/75">
                  <a
                    href={`#project-${p.slug}`}
                    className="text-[var(--cranberry)] underline"
                  >
                    {p.title}
                  </a>{" "}
                  · {engineeringProjects[p.slug].status}
                  {formatPublishDate(p.publishDate)
                    ? ` · Published ${formatPublishDate(p.publishDate)}`
                    : ""}
                </li>
              ))}
          </ul>
        </section>
        <section
          aria-labelledby="experience-heading"
          className="mt-16 rounded-sm border border-white/12 p-6 sm:p-8"
        >
          <h2 id="experience-heading" className="font-nord text-2xl text-white">
            Experience beyond the repositories
          </h2>
          <ul className="mt-5 space-y-4 text-sm leading-relaxed text-white/75">
            <li>
              <strong className="text-white">CoreTV:</strong> founder and lead
              engineer for business technology, AI reception, websites, and
              workflow automation.
            </li>
            <li>
              <strong className="text-white">
                International Computer Exchange:
              </strong>{" "}
              software engineering internship supporting enterprise
              infrastructure and disaster recovery systems.
            </li>
            <li>
              <strong className="text-white">Army Reserve — Mercury:</strong>{" "}
              secure serverless web and mobile application built in partnership
              with the U.S. Army Reserve.
            </li>
          </ul>
          <p className="mt-5 text-sm leading-relaxed text-white/60">
            Client implementations remain private. The public repositories above
            provide reviewable examples of my engineering work; my resume covers
            dates, responsibilities, and qualifications.
          </p>
          <Link
            href="/resume"
            className="mt-5 inline-flex items-center gap-2 text-sm text-[var(--cranberry)] hover:underline underline-offset-4"
          >
            Full experience & qualifications{" "}
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>
        <PublicVitals />
      </main>
      <Footer />
    </>
  );
}
