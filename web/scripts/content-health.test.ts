import test from "node:test";
import assert from "node:assert/strict";
import { allowedHealthCheckUrl, inspectContentHealth, publicHealthCheckUrls, type ContentHealthData } from "../src/lib/content-health";
import { assetReferenceEditorHref, contentEditorHref } from "../src/lib/content-editor-link";
import type { Project } from "../src/lib/types";

const project = (id: string, extra = {}): Project => ({ id, slug: id, title: id, category: "coding-projects", pricing: {}, ...extra } as Project);
const data = (projects: Project[]): ContentHealthData => ({ projects, articles: [], clients: [] });

test("health checks find missing copy, explicit image descriptions, impossible dates and duplicate slugs", () => {
  const report = inspectContentHealth(data([
    project("one", { slug: "same", publishDate: "2026-02-30", coverImage: { src: "https://cdn.mdcran.com/cover.png" } }),
    project("two", { slug: "same", description: "A factual description for the second project with adequate context.", coverImage: { src: "/cover.png", alt: "" } }),
  ]));
  assert.equal(report.issues.filter((i) => i.category === "routing" && i.field === "slug").length, 2);
  assert.ok(report.issues.some((i) => i.recordId === "one" && i.category === "copy"));
  assert.ok(report.issues.some((i) => i.recordId === "one" && i.field === "publishDate" && i.severity === "error"));
  assert.ok(report.issues.some((i) => i.recordId === "one" && i.category === "media"));
  assert.ok(!report.issues.some((i) => i.recordId === "two" && i.category === "media"));
});

test("hidden routes and wrong source records produce actionable findings without a public hidden link", () => {
  const report = inspectContentHealth(data([
    project("hidden", { visible: false }),
    project("webdesign-portfolio", { githubUrl: "https://github.com/MDCran/wrong", externalUrl: "/engineering#project-hidden" }),
    project("core-ai", { githubUrl: "https://github.com/MDCran/core-ai" }),
  ]));
  assert.ok(report.issues.filter((i) => i.recordId === "hidden").every((i) => !i.publicHref));
  assert.ok(report.issues.some((i) => i.recordId === "webdesign-portfolio" && i.category === "source"));
  assert.ok(report.issues.some((i) => i.recordId === "webdesign-portfolio" && i.category === "links"));
  assert.ok(!report.issues.some((i) => i.recordId === "core-ai" && i.category === "source"));
  assert.equal(contentEditorHref("projects", "id with space"), "/admin/dashboard/content-studio?collection=projects&record=id+with+space");
  assert.equal(assetReferenceEditorHref("contentDrafts", "projects:portfolio"), contentEditorHref("projects", "portfolio"));
});

test("live checker rejects arbitrary hosts, private addresses, credentials, query strings and admin paths", () => {
  for (const url of ["http://github.com/MDCran", "https://localhost/", "https://127.0.0.1/", "https://169.254.169.254/", "https://github.com.attacker.example/", "https://github.com@attacker.example/", "https://user:pass@github.com/", "https://github.com:8443/", "https://www.mdcran.com/api/admin/publishing", "https://www.mdcran.com/%61pi/admin/publishing", "https://www.mdcran.com/admin", "https://github.com/MDCran?token=secret", "file:///etc/passwd"]) assert.equal(allowedHealthCheckUrl(url), null, url);
  assert.equal(allowedHealthCheckUrl("https://github.com/MDCran/core-ai#readme"), "https://github.com/MDCran/core-ai");
});

test("live checker is capped, deduplicated and only selects stored public content", () => {
  const projects = Array.from({ length: 20 }, (_, i) => project(`project-${i}`, { githubUrl: `https://github.com/MDCran/repo-${i}` }));
  projects.unshift(project("private", { visible: false, githubUrl: "https://github.com/MDCran/private" }), project("lucky-block-creator-website", { githubUrl: "https://github.com/MDCran/protected" }));
  const urls = publicHealthCheckUrls(data(projects));
  assert.equal(urls.length, 12);
  assert.ok(urls.every((url) => !url.includes("private") && !url.includes("protected")));
  assert.equal(new Set(urls).size, urls.length);
});

test("large audits preserve total count while bounding the response", () => {
  const report = inspectContentHealth(data(Array.from({ length: 200 }, (_, i) => project(`project-${i}`))));
  assert.equal(report.issues.length, 500);
  assert.equal(report.truncated, true);
  assert.ok(report.counts.issues > 500);
});

test("legacy malformed text fields become findings instead of crashing the audit", () => {
  const report = inspectContentHealth(data([project("legacy", { title: 123, slug: null, category: null, description: false, publishDate: 42 })]));
  assert.ok(report.issues.some((issue) => issue.field === "title"));
  assert.ok(report.issues.some((issue) => issue.field === "slug"));
  assert.ok(report.issues.some((issue) => issue.field === "publishDate"));
});
