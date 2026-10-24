import "./helpers/css-modules";
import { imageAssetSrc } from "../src/lib/utils";
import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createStreamLines, isNoisyTranscript } from "../src/lib/stream-lines";
import {
  validPublishDate,
  effectiveProjectDate,
} from "../src/lib/project-date";
import {
  evidenceForSkill,
  matchJobDescription,
  matchesArea,
} from "../src/lib/portfolio-evidence";
import { isPublicContextPath } from "../src/lib/page-context";
import {
  readAssistantPreferences,
  saveAssistantPreferences,
  clearAssistantConversation,
} from "../src/lib/assistant-preferences";
import {
  readVisitorMemory,
  recordVisit,
  rememberTopic,
} from "../src/lib/visitor-memory";
import {
  offerConversation,
  takeConversation,
} from "../src/lib/conversation-handoff";
import { resumeSections, formatResumeDate } from "../src/lib/resume-data";
import EngineeringExplorer from "../src/components/work/EngineeringExplorer";

test("SSE retains split JSON, CRLF, UTF-8, and final unterminated frame", () => {
  const input = 'data: {"text":"café 🧠"}\r\ndata: {"text":"complete"}';
  const bytes = new TextEncoder().encode(input);
  for (let split = 0; split <= bytes.length; split++) {
    const decode = createStreamLines();
    const lines = [
      ...decode(bytes.slice(0, split)),
      ...decode(bytes.slice(split)),
      ...decode(),
    ];
    assert.deepEqual(
      lines.map((l) => JSON.parse(l.slice(6)).text),
      ["café 🧠", "complete"],
    );
    assert.deepEqual(decode(), []);
  }
});
test("voice preserves short consent, refusal, greetings, and non-English speech", () => {
  for (const text of ["no", "yes", "okay", "hi", "thanks", "stop", "sí", "不"])
    assert.equal(isNoisyTranscript(text), false, text);
  for (const text of ["", " ", "...", "um", "hmm"])
    assert.equal(isNoisyTranscript(text), true, text);
});
test("dates reject impossible, malformed, and ancient records without invention", () => {
  for (const date of ["0006-10-20", "02-30-2025", "13-2025", "not a date"])
    assert.equal(validPublishDate(date), null, date);
  assert.equal(effectiveProjectDate({}), "");
  assert.equal(effectiveProjectDate({ publishDate: "02-2024" }), "02-2024");
  assert.equal(formatResumeDate("2024-02-29"), "Feb 2024");
});
test("evidence only references explicitly allowed public projects", () => {
  assert.deepEqual(evidenceForSkill("TypeScript"), []);
  const matches = matchJobDescription("TypeScript, React and Kubernetes", [
    "coretex",
  ]);
  assert.deepEqual(
    matches.map((m) => m.skill),
    ["TypeScript", "React"],
  );
  assert.ok(
    matches.every((m) => m.evidence.every((e) => e.slug === "coretex")),
  );
  assert.equal(matchesArea("React Native mobile UI", "mobile"), true);
  assert.equal(matchesArea("Java Spring Boot PostgreSQL", "ai"), false);
  assert.equal(matchesArea("Docker infrastructure", "cloud"), true);
});
test("page context blocks private surfaces", () => {
  for (const path of [
    "/admin",
    "/admin/users",
    "/api/data",
    "/rizz/private",
    "/identity",
    "/auth/callback",
    "/visitor-map",
  ])
    assert.equal(isPublicContextPath(path), false, path);
  for (const path of ["/engineering", "/resume", "/articles/react"])
    assert.equal(isPublicContextPath(path), true, path);
});
test("memory is opt-in and clearing rotates recall scope and ephemeral transfers", () => {
  const storage = new Map<string, string>();
  const fakeStorage = {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => storage.set(k, v),
    removeItem: (k: string) => storage.delete(k),
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: fakeStorage,
    configurable: true,
  });
  Object.defineProperty(globalThis, "sessionStorage", {
    value: fakeStorage,
    configurable: true,
  });
  Object.defineProperty(globalThis, "window", {
    value: new EventTarget(),
    configurable: true,
  });
  try {
    recordVisit();
    rememberTopic("private query");
    assert.equal(storage.has("mdcran_visitor_memory"), false);
    saveAssistantPreferences({ ...readAssistantPreferences(), memory: true });
    recordVisit();
    rememberTopic("React projects");
    assert.deepEqual(readVisitorMemory().topics, ["React projects"]);
    const epoch = readAssistantPreferences().memoryEpoch;
    offerConversation([{ role: "user", content: "transfer me" }]);
    clearAssistantConversation();
    assert.notEqual(readAssistantPreferences().memoryEpoch, epoch);
    assert.deepEqual(readVisitorMemory().topics, []);
    assert.deepEqual(takeConversation(), []);
    saveAssistantPreferences({ ...readAssistantPreferences(), memory: false });
    rememberTopic("do not store");
    assert.equal(storage.has("mdcran_visitor_memory"), false);
  } finally {
    Reflect.deleteProperty(globalThis, "window");
    Reflect.deleteProperty(globalThis, "localStorage");
    Reflect.deleteProperty(globalThis, "sessionStorage");
  }
});
test("text and voice handoff retains turns once and omits UI-only messages", () => {
  offerConversation([
    { role: "assistant", content: "__WELCOME__" },
    { role: "user", content: "Tell me about Coretex" },
    { role: "assistant", content: "Here is the public architecture." },
  ]);
  assert.equal(takeConversation().length, 2);
  assert.deepEqual(takeConversation(), []);
});
test("resume keeps current roles first and derives legacy education", () => {
  const sections = resumeSections(
    [
      {
        id: "old",
        type: "job",
        role: "Engineer",
        companyName: "Past",
        startDate: "01-2020",
        endDate: "01-2021",
        description: "",
      },
      {
        id: "new",
        type: "job",
        role: "Engineer",
        companyName: "Current",
        startDate: "01-2024",
        current: true,
        description: "",
      },
      {
        id: "ucf-cs",
        type: "volunteer",
        role: "B.S. Computer Science",
        companyName: "UCF",
        startDate: "08-2020",
        endDate: "05-2024",
        description: "",
      },
    ],
    [],
  );
  assert.deepEqual(
    sections.jobs.map((j) => j.id),
    ["new", "old"],
  );
  assert.equal(sections.derivedEducations[0].institution, "UCF");
  assert.equal(sections.volunteerWork.length, 0);
});
test("project explorer exposes named inputs, filter state, and live result count", () => {
  const html = renderToStaticMarkup(
    <EngineeringExplorer entries={[{ slug: "coretex", text: "AI TypeScript" }]}>
      <article>Coretex</article>
    </EngineeringExplorer>,
  );
  assert.match(html, /Search projects, articles and technologies/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /role="status"/);
  assert.doesNotMatch(html, /Match a role to project experience|Job description<textarea|id="role-match"/);
  assert.doesNotMatch(html, /shortlist|Save to shortlist|Project comparison/i);
});

test("GitHub screenshot assets resolve to the allowed raw image host", () => {
  assert.equal(
    imageAssetSrc(
      "https://github.com/MDCran/coretex/blob/main/docs/screenshots/coretex-home.jpg?raw=true",
    ),
    "https://raw.githubusercontent.com/MDCran/coretex/main/docs/screenshots/coretex-home.jpg",
  );
  assert.equal(
    imageAssetSrc("https://github.com/another/repo/blob/main/code.ts"),
    "https://github.com/another/repo/blob/main/code.ts",
  );
});
