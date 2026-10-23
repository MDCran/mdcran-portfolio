import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildProfilePublication, publishedSkillGroups, publicUrl } from "../src/lib/profile-publication";
import { profilePublicationResponse } from "../src/lib/profile-publication-response";
import GitHubProfilePage from "../src/components/github/GitHubProfilePage";
import type { Project, ResumeProfile, SiteContentAiUsage } from "../src/lib/types";

const profile: ResumeProfile = { fullName: "Fixture Developer", title: "Fixture Engineer", location: "Fixture City", email: "fixture@example.com", githubUrl: "https://github.com/MDCran", linkedinUrl: "", pdfUrl: "" };
const aiUsage = { totalTokens: 73_200_000_123, lastUpdated: "2026-10-23", claude: { totalTokens: 100 }, openai: { totalTokens: 23 } } as SiteContentAiUsage;
const project = (slug: string, extra = {}): Project => ({ id: slug, slug, title: slug, category: "coding-projects", pricing: {}, ...extra } as Project);
function publication() {
  return buildProfilePublication({
    profile: { ...profile, privateNote: "Do not publish" } as ResumeProfile,
    aiUsage, skills: [{ name: "TypeScript", category: "language" }], categories: [{ id: "language", label: "Languages" }],
    projects: [project("webdesign-portfolio", { githubUrl: "https://github.com/MDCran/wrong", liveUrl: "https://www.mdcran.com/" }), project("core-ai", { githubUrl: "https://github.com/MDCran/private-platform", liveUrl: "https://coretv.co/" }), project("lucky-block-creator-website"), project("hidden-fixture", { visible: false }), project("creative-only", { category: "motion-and-graphics" })],
  });
}

test("publication uses public records, explicit source overrides, and exact reported AI total", () => {
  const snapshot = publication();
  assert.deepEqual(snapshot.projects.map((p) => p.slug), ["core-ai", "webdesign-portfolio", "core-ai-contracts"]);
  assert.equal(snapshot.projects.find((p) => p.slug === "webdesign-portfolio")?.sourceUrl, "https://github.com/MDCran/mdcran-portfolio");
  assert.equal(snapshot.projects.find((p) => p.slug === "core-ai")?.sourceUrl, "https://github.com/MDCran/core-ai");
  assert.match(snapshot.readme, /platform implementation is private/);
  assert.doesNotMatch(JSON.stringify(snapshot), /Do not publish|privateNote|private-platform|lucky-block|hidden-fixture|creative-only/);
  assert.equal(snapshot.reportedAiTokens, 73_200_000_123);
  assert.match(snapshot.readme, /73,200,000,123/);
  assert.ok(snapshot.readme.indexOf("assets/githubprofile.png") < snapshot.readme.indexOf("## Public engineering work"));
  assert.match(snapshot.readme, /\| Project & case study \| What it demonstrates \| Source \| Live product \|/);
  assert.equal(snapshot.readme.split("\n").filter((line) => line.startsWith("| [")).length, snapshot.counts.projects);
  assert.doesNotMatch(snapshot.readme, /^### /m);
  assert.ok(snapshot.readme.includes("[Open](<https://www.mdcran.com/>)"));
  assert.ok(snapshot.readme.includes("[Open](<https://coretv.co/>)"));
});

test("skill groups use only current named skills, ordered category metadata, and honest unknown categories", () => {
  assert.deepEqual(publishedSkillGroups([{ name: "Java", category: "languages" }, { name: "Java", category: "languages" }, { name: "Docker", category: "tools" }], [{ id: "empty", label: "Empty" }, { id: "languages", label: "Current languages" }]), [
    { id: "languages", title: "Current languages", tags: ["Java"] }, { id: "tools", title: "tools", tags: ["Docker"] },
  ]);
  assert.equal(publicUrl("javascript:alert(1)"), undefined);
  assert.equal(publicUrl("https://user:password@example.com/"), undefined);
  assert.equal(publicUrl("https://github.com/MDCran?access_token=secret"), undefined);
  assert.equal(publicUrl("https://cdn.mdcran.com/file?X-Amz-Signature=secret"), undefined);
});

test("public publication response exposes only the projected public fields and rejects stale validators", async () => {
  const snapshot = publication();
  const response = profilePublicationResponse(snapshot, null);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-publication-hash"), snapshot.hash);
  assert.equal(response.headers.get("cache-control"), "public, max-age=0, must-revalidate");
  const body = await response.json();
  assert.deepEqual(Object.keys(body.profile).sort(), ["fullName", "githubUrl", "linkedinUrl", "location", "title"]);
  assert.doesNotMatch(JSON.stringify(body), /privateNote|Do not publish|lucky-block-creator|hidden-fixture|fixture@example.com/);
  assert.equal(profilePublicationResponse(snapshot, `W/"${snapshot.hash}"`).status, 304);
  assert.equal(profilePublicationResponse(snapshot, `"${snapshot.hash}"`).status, 304);
  assert.equal(await profilePublicationResponse(snapshot, `W/"${snapshot.hash}"`).text(), "");
  assert.equal(profilePublicationResponse(snapshot, 'W/"outdated"').status, 200);
});

test("hash excludes export timestamp and changes when public content changes", () => {
  const input = { profile, aiUsage, projects: [], skills: [], categories: [] };
  const first = buildProfilePublication(input, "2026-01-01");
  assert.equal(first.hash, buildProfilePublication(input, "2026-02-01").hash);
  assert.notEqual(first.hash, buildProfilePublication({ ...input, profile: { ...profile, location: "Updated fixture city" } }).hash);
});

test("profile screenshot uses shared identity and skills rather than static location or added skills", () => {
  const snapshot = publication();
  const markup = renderToStaticMarkup(<GitHubProfilePage publication={snapshot} capture />);
  assert.match(markup, /Fixture Developer/);
  assert.match(markup, /Fixture City/);
  assert.match(markup, /Languages/);
  assert.match(markup, /TypeScript/);
  assert.match(markup, new RegExp(`data-publication-hash="${snapshot.hash}"`));
  assert.doesNotMatch(markup, /Orlando|CUDA|Triton|<video/);
});

test("publisher previews without gh access and refuses a tampered snapshot", () => {
  const directory = mkdtempSync(join(tmpdir(), "mdcran-publication-test-"));
  const file = join(directory, "publication.json");
  try {
    const snapshot = publication();
    writeFileSync(file, JSON.stringify(snapshot));
    const args = [resolve("scripts/publish-profile.mjs"), "--snapshot", file, "--screenshot", resolve("public/cdn/WEB_ASSETS/PROJECTS/portfolio-new.png")];
    const preview = spawnSync(process.execPath, args, { encoding: "utf8", env: { ...process.env, PATH: "", Path: "" } });
    assert.equal(preview.status, 0, preview.stderr);
    assert.match(preview.stdout, /Preview only. No GitHub requests or writes/);
    writeFileSync(file, JSON.stringify({ ...snapshot, readme: `${snapshot.readme}\nChanged` }));
    const tampered = spawnSync(process.execPath, args, { encoding: "utf8" });
    assert.equal(tampered.status, 1);
    assert.match(tampered.stderr, /Snapshot hash does not match/);
  } finally { rmSync(file, { force: true }); rmdirSync(directory); }
});
