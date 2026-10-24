import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import EngineeringProjectCard from "../src/components/work/EngineeringProjectCard";
import EngineeringProjectEvidence from "../src/components/work/EngineeringProjectEvidence";
import { publicEngineeringProjects, engineeringDetail } from "../src/lib/engineering-projects";
import { coreAiContracts } from "../src/lib/engineering";
import { projectUrl } from "../src/lib/utils";
import { evidenceForSkill } from "../src/lib/portfolio-evidence";
import type { Project } from "../src/lib/types";
import CodeProjectRedirect from "../src/app/code/[slug]/page";
import CodingProjectRedirect from "../src/app/coding-projects/[slug]/page";
import { validateSiteActions } from "../src/lib/assistant-actions";

const project: Project = { id: "army-reserve-mercury", slug: "army-reserve-mercury", title: "Army Reserve Mercury", category: "coding-projects", description: "A project summary.", tags: ["TypeScript"], pricing: { status: "unavailable" } };

test("engineering project cards link to the full page without a dropdown", () => {
  const markup = renderToStaticMarkup(<EngineeringProjectCard project={project} />);
  assert.match(markup, /href="\/engineering\/army-reserve-mercury"[^>]*>View project details/);
  assert.doesNotMatch(markup, /<details|<summary|href="[^\"]*#project-/);
  assert.match(markup, /aria-label="View project details: Army Reserve Mercury"/);
});

test("resume, services, chat cards and old engineering categories share a real page URL", () => {
  for (const category of ["coding-projects", "code", "software", "engineering", "CODE"]) {
    assert.equal(projectUrl(category, "health-tracker"), "/engineering/health-tracker");
  }
  assert.equal(projectUrl("motion-and-graphics", "website", "web-dev-design"), "/motion-and-graphics/web-dev-design/website");
  assert.equal(projectUrl("arts-and-entertainment", "map", "minecraft-maps"), "/arts-and-entertainment/minecraft-maps/map");
  assert.ok(evidenceForSkill("TypeScript", ["coretex"]).every((evidence) => evidence.href === `/engineering/${evidence.slug}`));
});

test("dedicated engineering pages retain the contribution and supporting evidence", () => {
  const detail = engineeringDetail(project.slug)!;
  const markup = renderToStaticMarkup(<EngineeringProjectEvidence slug={project.slug} detail={detail} />);
  assert.match(markup, /Contribution &amp; implementation/);
  assert.ok(markup.includes(detail.contribution.replaceAll("&", "&amp;").replaceAll("'", "&#x27;")));
  assert.match(markup, /Engineering approach/);
});

test("public engineering page selection excludes hidden/unrelated records and includes public contracts", () => {
  const selected = publicEngineeringProjects([project, { ...project, id: "hidden", slug: "hidden", visible: false }, { ...project, id: "art", slug: "art", category: "arts-and-entertainment" }]);
  assert.ok(selected.some((entry) => entry.slug === project.slug));
  assert.ok(selected.some((entry) => entry.slug === coreAiContracts.id));
  assert.ok(!selected.some((entry) => ["hidden", "art"].includes(entry.slug)));
  assert.ok(!publicEngineeringProjects([{ ...project, slug: coreAiContracts.id, visible: false }]).some((entry) => entry.slug === coreAiContracts.id));
});

test("legacy URLs redirect to a project page rather than back into a card", async () => {
  for (const redirect of [CodeProjectRedirect, CodingProjectRedirect]) {
    await assert.rejects(redirect({ params: Promise.resolve({ slug: project.slug }) }), (error: unknown) => {
      return error instanceof Error && "digest" in error && String(error.digest).includes(`/engineering/${project.slug};308;`);
    });
  }
});

test("AI navigation accepts the published dedicated project path", () => {
  const href = projectUrl(project.category, project.slug);
  const action = { type: "navigate", value: href };
  assert.deepEqual(validateSiteActions({ actions: [action] }, [href]), [action]);
  assert.deepEqual(validateSiteActions({ actions: [{ type: "navigate", value: "/engineering/unpublished" }] }, [href]), []);
});
