import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { adminNavigationGroups, adminNavigationItems, adminSectionDescriptions, adminSectionFromLocation, adminSectionPath, adminSectionTitles, isAdminSection } from "../src/lib/admin-navigation";

// These server-rendering tests inspect semantics; Next.js owns CSS bundling.
const require = createRequire(import.meta.url);
require.extensions[".css"] = module => {
  module.exports = new Proxy({}, { get: (_, name) => name === "__esModule" ? false : String(name) });
};

test("all 28 admin destinations appear exactly once in the grouped navigation", () => {
  const keys = adminNavigationGroups.flatMap(group => group.items);
  assert.equal(keys.length, 28);
  assert.equal(new Set(keys).size, keys.length);
  assert.deepEqual([...keys].sort(), Object.keys(adminSectionTitles).sort());
  for (const item of adminNavigationItems) {
    assert.ok(item.label.trim());
    assert.ok(item.group.trim());
    assert.ok(adminSectionDescriptions[item.key].trim());
    assert.equal(adminSectionFromLocation(adminSectionPath(item.key)), item.key);
  }
});

test("direct routes, trailing slashes, and legacy hash links resolve consistently", () => {
  assert.equal(adminSectionFromLocation("/admin/dashboard"), "dashboard");
  assert.equal(adminSectionFromLocation("/admin/dashboard/booking/"), "booking");
  assert.equal(adminSectionFromLocation("/admin/dashboard", "#resume"), "resume");
  assert.equal(adminSectionFromLocation("/admin/dashboard/projects", "#unrelated-anchor"), "projects");
  assert.equal(adminSectionFromLocation("/admin/dashboard/missing"), "dashboard");
  assert.equal(isAdminSection("toString"), false);
  assert.equal(isAdminSection("__proto__"), false);
  assert.equal(isAdminSection("missing"), false);
});

test("navigation exposes real links, one active page, and unread message context", async () => {
  const { default: AdminNavigation } = await import("../src/components/admin/AdminNavigation");
  const html = renderToStaticMarkup(<AdminNavigation activeSection="contact-form-entries" onNavigate={() => {}} unreadMessages={7} />);
  assert.equal((html.match(/href="\/admin\/dashboard/g) ?? []).length, 28);
  assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1);
  assert.match(html, /href="\/admin\/dashboard\/contact-form-entries" aria-current="page"/);
  assert.match(html, /aria-label="7 unread messages"/);
  assert.match(html, /Messages &amp; meetings/);
  assert.match(html, /System &amp; integrations/);
  const empty = renderToStaticMarkup(<AdminNavigation activeSection="dashboard" onNavigate={() => {}} unreadMessages={0} />);
  assert.doesNotMatch(empty, /unread messages/);
});

test("shell preserves supplied controls and page body with one labelled main heading", async () => {
  const { default: AdminShell } = await import("../src/components/admin/AdminShell");
  const html = renderToStaticMarkup(<AdminShell activeSection="projects" onNavigate={() => {}} onLogout={() => {}} unreadMessages={0} search={<input aria-label="Search admin" />}><button>Existing project action</button></AdminShell>);
  assert.equal((html.match(/<main\b/g) ?? []).length, 1);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, /<h1>Projects<\/h1>/);
  assert.match(html, /Create, edit, reorder and feature portfolio projects/);
  assert.match(html, /href="#admin-page-content"/);
  assert.match(html, /id="admin-page-content" tabindex="-1"/);
  assert.match(html, /aria-label="Open admin navigation"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-label="Search admin"/);
  assert.match(html, /Existing project action/);
});
