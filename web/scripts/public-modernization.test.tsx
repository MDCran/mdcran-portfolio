import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToPipeableStream, renderToStaticMarkup } from "react-dom/server";
import { PassThrough } from "node:stream";
import { comparisonEvidence, matchesRole, normalizeRole, trackingCsv, flagshipReviews } from "../src/lib/public-portfolio";
import EngineeringHighlights from "../src/components/home/EngineeringHighlights";
import Hero from "../src/components/home/Hero";
import HomeExtras from "../src/components/home/HomeExtras";
import MapWidget from "../src/components/home/MapWidget";
import { defaultSiteContent } from "../src/lib/site-content";
import ProjectWalkthrough from "../src/components/work/ProjectWalkthrough";
import Stats from "../src/components/home/Stats";
import AIUsageTracker from "../src/components/home/AIUsageTracker";
import { SWRConfig } from "swr";
import type { Project, SiteContentAiUsage } from "../src/lib/types";

test("role views reject unknown roles and select relevant evidence", () => {
  assert.equal(normalizeRole("backend"), "backend");
  assert.equal(normalizeRole("invented"), "all");
  assert.equal(matchesRole("health-tracker", "backend"), true);
  assert.equal(matchesRole("army-reserve-mercury", "backend"), false);
  assert.equal(matchesRole("core-ai-contracts", "ai"), true);
  assert.equal(matchesRole("unlisted-public-project", "all"), true);
  assert.equal(comparisonEvidence("lucky-block-creator"), null);
  assert.match(comparisonEvidence("core-ai-contracts")!.responsibility, /contracts/);
});

test("sample export includes both date boundaries and supports empty ranges", () => {
  const result = trackingCsv("2026-01-08", "2026-01-10");
  assert.equal(result.rows.length, 2);
  assert.match(result.csv, /"2026-01-08"/);
  assert.match(result.csv, /"2026-01-10"/);
  assert.doesNotMatch(result.csv, /2026-01-12/);
  assert.equal(trackingCsv("2026-02-01", "2026-02-02").csv, "Date,Category,Entry,Amount");
  assert.equal(trackingCsv("", "").rows.length, 3);
});

test("recruiter overview only renders available public records with correct source override", () => {
  const projects = [{ slug: "webdesign-portfolio", title: "Portfolio", githubUrl: "https://github.com/MDCran/old-source" }, { slug: "lucky-block-creator", title: "Hidden record" }] as Project[];
  const markup = renderToStaticMarkup(<EngineeringHighlights projects={projects} />);
  assert.match(markup, /https:\/\/github.com\/MDCran\/mdcran-portfolio/);
  assert.doesNotMatch(markup, /old-source|Hidden record|project-coretex/);
  assert.match(markup, /role=backend/);
  assert.match(markup, /\/articles/);
});

test("restored hero uses saved branding and canonical location with all personal widgets mounted", async () => {
  const markup = await new Promise<string>((resolve, reject) => {
    const output = new PassThrough(); let html = "";
    output.on("data", chunk => { html += chunk.toString(); }); output.on("end", () => resolve(html)); output.on("error", reject);
    const stream = renderToPipeableStream(<Hero content={{ ...defaultSiteContent.homeHero, titlePrimary: "Saved", titleAccent: "Brand", locationText: "Old location" }} location="Current profile location" />, { onAllReady() { stream.pipe(output); }, onError: reject });
  });
  assert.match(markup, /Saved/); assert.match(markup, /Brand/);
  assert.match(markup, /min-h-screen/);
  assert.match(markup, /Based in Current profile location/);
  assert.match(markup, /Verse of the Day/);
  assert.match(markup, /View area on map/);
  assert.match(markup, /<div class="relative z-10 w-full content-container pt-32 sm:pt-36 pb-20">/);
  assert.match(markup, /<div data-highlight-id="personal-widgets" class="grid grid-cols-1 sm:grid-cols-3 gap-4">/);
  assert.match(markup, /spotify/i);
  assert.match(markup, /href="\/engineering"/);
  assert.doesNotMatch(markup, /Old location|Orlando|href="\/code|Show music/);
  assert.doesNotMatch(renderToStaticMarkup(<HomeExtras />), /personal-widgets|Show music/);
});

test("location map embeds only the canonical location and keeps an accessible external fallback", () => {
  const markup = renderToStaticMarkup(<MapWidget location=" Boca Raton, FL & nearby " />);
  assert.match(markup, /title="Map of Boca Raton, FL &amp; nearby"/);
  assert.match(markup, /src="https:\/\/maps\.google\.com\/maps\?q=Boca%20Raton%2C%20FL%20%26%20nearby&amp;z=11&amp;output=embed"/);
  assert.match(markup, /loading="lazy"/);
  assert.match(markup, /maps\/search\/\?api=1&amp;query=Boca%20Raton%2C%20FL%20%26%20nearby/);
  assert.doesNotMatch(markup, /Orlando|orlando-map|key=/);
  assert.equal(renderToStaticMarkup(<MapWidget location=" " />), "");
  assert.equal(renderToStaticMarkup(<MapWidget />), "");
});

test("flagship walkthrough labels illustrative data and distinguishes next evaluations", () => {
  const markup = renderToStaticMarkup(<ProjectWalkthrough slug="health-tracker" />);
  assert.match(markup, /fictional sample records/);
  assert.match(markup, /Next evaluation/);
  assert.match(markup, /download="sample-health-export.csv"/);
  assert.match(flagshipReviews.coretex.result, /No adoption or latency measurement/);
  assert.equal(renderToStaticMarkup(<ProjectWalkthrough slug="unknown" />), "");
});

test("available metrics render their real totals before scrolling or hydration", () => {
  const markup = renderToStaticMarkup(<SWRConfig value={{ provider: () => new Map(), fallback: {
    "/api/metrics": { totalProjectViews: 1234567, totalProjects: 42, yearsActive: 8 },
    "github-contrib-summary": { total: 9876, trend: [] },
  } }}><Stats /></SWRConfig>);
  const cards = markup.split("Public Projects")[0];
  assert.match(cards, /1,234,567/);
  assert.match(cards, /9,876/);
  assert.match(cards, />42</);
  assert.doesNotMatch(cards, /opacity:0|transform:|Loading metric/);
});

test("unloaded metrics expose loading rather than a fabricated zero", () => {
  const markup = renderToStaticMarkup(<SWRConfig value={{ provider: () => new Map() }}><Stats /></SWRConfig>);
  const cards = markup.split("Public Projects")[0];
  assert.match(cards, /aria-label="Loading metric"/);
  assert.doesNotMatch(cards, /class="stat-value[^\"]*">0</);
});

test("reported AI total is immediate and exact for assistive readers, retaining adjustment", () => {
  const content = { totalTokens: 73_200_000_123, claude: { totalTokens: 100 }, openai: { totalTokens: 23 }, elevenlabs: { charactersUsed: 2345 } } as SiteContentAiUsage;
  const markup = renderToStaticMarkup(<AIUsageTracker content={content} />);
  assert.match(markup, />73\.2B</);
  assert.match(markup, /class="sr-only">73,200,000,123</);
  assert.match(markup, /class="sr-only">2,345</);
  const fallback = renderToStaticMarkup(<AIUsageTracker content={{ ...content, totalTokens: undefined }} />);
  assert.match(fallback, /class="sr-only">123</);
});
