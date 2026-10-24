import test from "node:test";
import assert from "node:assert/strict";
import { ROOTS, ROUTES, VALID_DIRS, parseArguments, resolveTerminalPath, isCodeProject, formatDate, submitTerminalForm, validateTerminalForm, validateTerminalSnapshot, sanitizeBrowseUrl, type TerminalForm } from "../src/lib/terminal-shell";
import { randomFreeCell } from "../src/lib/terminal-games";
import type { Project } from "../src/lib/types";
import { COMMAND_GROUPS, COMMANDS, TERMINAL_COMMANDS, terminalCommand, terminalCompletions, cycleTerminalCompletion, terminalHelp, resolveTerminalToggle } from "../src/lib/terminal-commands";
import { TerminalScrollMotion, terminalWheelDelta } from "../src/lib/terminal-scroll";
import { THEMES } from "../src/lib/themes";
import { DEFAULT_TERMINAL_THEME, TERMINAL_THEMES, resolveTerminalTheme, terminalThemeStyle } from "../src/lib/terminal-theme";

test("terminal themes share the site's palette and resolve names without accepting invalid input", () => {
  assert.deepEqual([...TERMINAL_THEMES].sort(), THEMES.map(theme => theme.id).sort());
  assert.equal(DEFAULT_TERMINAL_THEME, "hacker");
  assert.equal(resolveTerminalTheme(" CYBERPUNK "), "cyberpunk");
  assert.equal(resolveTerminalTheme("High Contrast"), "high-contrast");
  assert.equal(resolveTerminalTheme("gray"), "grayscale");
  for (const name of ["missing", "dark light", "", "__proto__", "red; background:url(test)"]) assert.equal(resolveTerminalTheme(name), null);
  for (const theme of THEMES) {
    const style = terminalThemeStyle(theme.id);
    assert.equal(style["--terminal-background"], theme.background);
    assert.equal(style["--terminal-text"], theme.text);
    assert.equal(style["--terminal-accent"], theme.id === "grayscale" ? theme.accent : theme.primary);
    assert.equal(style.colorScheme, theme.id === "light" ? "light" : "dark");
  }
});

test("theme names and management options are discoverable through Tab and focused help", () => {
  assert.deepEqual(terminalCompletions("theme "), [...TERMINAL_THEMES,"list","status","reset"].map(name => `theme ${name} `));
  assert.deepEqual(terminalCompletions("/theme cy"), ["/theme cyberpunk "]);
  assert.equal(terminalHelp("theme").commands[0].example, "theme cyberpunk");
  assert.ok(terminalHelp("settings").commands.some(command => command.name === "theme"));
});

function colorContrast(a: string, b: string) {
  const luminance = (hex: string) => {
    const rgb = [1,3,5].map(index => parseInt(hex.slice(index,index+2),16) / 255)
      .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  };
  const values = [luminance(a),luminance(b)].sort((x,y)=>y-x);
  return (values[0] + .05) / (values[1] + .05);
}

test("theme body text, muted text, and highlighted text retain readable contrast", () => {
  for (const name of TERMINAL_THEMES) {
    const style = terminalThemeStyle(name);
    for (const role of ["text", "muted"]) {
      assert.ok(colorContrast(style[`--terminal-${role}`], style["--terminal-background"]) >= 4.5, `${name} ${role}`);
      assert.ok(colorContrast(style[`--terminal-${role}`], style["--terminal-surface"]) >= 4.5, `${name} ${role} on panel`);
    }
    assert.ok(colorContrast(style["--terminal-on-selection"], style["--terminal-selection"]) >= 4.5, `${name} highlight`);
  }
});

test("terminal scrolling eases between positions and coalesces repeated wheel input", () => {
  const motion = new TerminalScrollMotion();
  motion.wheel(0, 120, 1000);
  const first = motion.step(0, 0, 1000);
  assert.ok(first > 0 && first < 120);
  motion.wheel(first, 120, 1000);
  assert.equal(motion.target, 240);
  let position = first;
  for (let time = 8; time < 1500; time += 8) {
    const next = motion.step(position, time, 1000);
    assert.ok(next >= position && next <= 240);
    position = next;
  }
  assert.equal(position, 240);
  assert.equal(motion.target, null);
});

test("reversing direction cancels queued travel and native interactions can stop motion", () => {
  const motion = new TerminalScrollMotion();
  motion.moveTo(800, 1000);
  const position = motion.step(400, 0, 1000);
  motion.wheel(position, -50, 1000);
  assert.equal(motion.target, position - 50);
  assert.ok(motion.step(position, 16, 1000) < position);
  motion.stop();
  assert.equal(motion.step(200, 32, 1000), 200);
});

test("streaming output can move the destination without jumps, and resizing clamps it", () => {
  const motion = new TerminalScrollMotion();
  motion.moveTo(500, 500);
  const first = motion.step(400, 0, 500);
  motion.moveTo(520, 520);
  const next = motion.step(first, 16, 520);
  assert.ok(next > first && next < 520);
  assert.equal(motion.step(next, 32, 200), 200);
  motion.moveTo(-100, 200);
  assert.equal(motion.target, 0);
});

test("scrolling respects reduced motion and preserves wheel delta units", () => {
  const motion = new TerminalScrollMotion();
  motion.moveTo(600, 1000);
  assert.equal(motion.step(0, 0, 1000, true), 600);
  assert.equal(motion.target, null);
  assert.equal(terminalWheelDelta(2.5, 0, 400), 2.5);
  assert.equal(terminalWheelDelta(-3, 1, 400), -48);
  assert.equal(terminalWheelDelta(1, 2, 400), 400);
});

test("Tab cycles every toggle match, wraps, and Shift+Tab reverses without narrowing the original prefix", () => {
  const matches = terminalCompletions("toggle");
  assert.deepEqual(matches, ["togglemusic ", "togglekeystrokeclicks ", "togglebackground "]);
  let cycle = cycleTerminalCompletion("toggle", matches, null)!;
  assert.equal(cycle.options[cycle.index], "togglemusic ");
  for (const expected of ["togglekeystrokeclicks ", "togglebackground ", "togglemusic "]) {
    const input = cycle.options[cycle.index];
    cycle = cycleTerminalCompletion(input, terminalCompletions(input), cycle)!;
    assert.equal(cycle.options[cycle.index], expected);
    assert.equal(cycle.seed, "toggle");
  }
  cycle = cycleTerminalCompletion(cycle.options[cycle.index], [], cycle, true)!;
  assert.equal(cycle.options[cycle.index], "togglebackground ");
});

test("editing the completed value starts a fresh completion cycle, with slash and case support", () => {
  const old = cycleTerminalCompletion("toggle", terminalCompletions("toggle"), null)!;
  const input = "togglemusic o";
  const next = cycleTerminalCompletion(input, terminalCompletions(input), old)!;
  assert.equal(next.seed, input);
  assert.deepEqual(next.options, ["togglemusic on ", "togglemusic off "]);
  assert.equal(cycleTerminalCompletion("nonexistent", [], next), null);
  assert.deepEqual(terminalCompletions("  /TOGGLE"), ["  /togglemusic ", "  /togglekeystrokeclicks ", "  /togglebackground "]);
  assert.deepEqual(terminalCompletions("/togglebackground ST"), ["/togglebackground status "]);
});

test("completion works for command options, aliases, contextual paths, search phrases, and draft fields", () => {
  assert.deepEqual(terminalCompletions("mode "), ["mode shell ", "mode ai "]);
  assert.ok(terminalCompletions("resume d").includes("resume download "));
  assert.ok(terminalCompletions("tour ").includes("tour stop "));
  assert.deepEqual(terminalCompletions("cd e", {directories:["engineering","articles"]}), ["cd engineering "]);
  assert.deepEqual(terminalCompletions("nano co", {entities:["coretex","health"]}), ["nano coretex "]);
  assert.deepEqual(terminalCompletions("search machine l", {searches:["Machine learning","React"]}), ["search Machine learning"]);
  assert.deepEqual(terminalCompletions("select ", {resultCount:2}), ["select 1 ","select 2 "]);
  assert.deepEqual(terminalCompletions("set ", {fields:["identifier"]}), ["set identifier "]);
  assert.deepEqual(terminalCompletions("set message Hello"), []);
  assert.deepEqual(terminalCompletions(""), []);
});

test("all three toggle commands use the same options and idempotent on/off/status behavior", () => {
  for (const name of ["togglemusic", "togglekeystrokeclicks", "togglebackground"]) {
    assert.deepEqual(terminalCompletions(`${name} `), ["on","off","status"].map(value => `${name} ${value} `));
    for (const current of [true,false]) {
      assert.deepEqual(resolveTerminalToggle(current, []), {enabled:!current,statusOnly:false});
      assert.deepEqual(resolveTerminalToggle(current, ["ON"]), {enabled:true,statusOnly:false});
      assert.deepEqual(resolveTerminalToggle(current, ["off"]), {enabled:false,statusOnly:false});
      assert.deepEqual(resolveTerminalToggle(current, ["status"]), {enabled:current,statusOnly:true});
    }
  }
  for (const args of [["maybe"], ["on","off"], ["status","extra"]]) assert.equal(resolveTerminalToggle(true,args), null);
});

test("help covers every discoverable command and alias, and category names are unambiguous", () => {
  assert.equal(new Set(COMMANDS).size, COMMANDS.length);
  assert.equal(terminalHelp().overview, true);
  assert.equal(terminalHelp("all").commands.length, TERMINAL_COMMANDS.length);
  for (const name of COMMANDS) {
    assert.equal(terminalHelp(name).commands[0], terminalCommand(name));
    assert.ok(terminalHelp(name).commands[0].description.length > 0);
    assert.ok(terminalCompletions(name).includes(`${name} `));
  }
  for (const group of COMMAND_GROUPS) {
    assert.equal(terminalCommand(group.id), undefined);
    assert.ok(terminalHelp(group.id).commands.length > 0);
    assert.ok(terminalHelp(group.id).commands.every(command => command.group === group.id));
  }
  assert.equal(terminalHelp("toggle").commands.length, 3);
  assert.equal(terminalHelp("missing").commands.length, 0);
  assert.equal(terminalHelp("/NANO").commands[0].name, "open");
});

test("every root and route alias resolves to a real virtual directory", () => {
  for (const root of ROOTS) assert.ok(VALID_DIRS.has(`/${root}`), root);
  for (const [alias, target] of Object.entries(ROUTES)) {
    assert.deepEqual(resolveTerminalPath([], alias), target);
    assert.ok(VALID_DIRS.has(`/${target.join("/")}`), alias);
  }
});

test("filesystem handles absolute, relative, parent, current and legacy paths", () => {
  assert.deepEqual(resolveTerminalPath([], "code"), ["engineering"]);
  assert.deepEqual(resolveTerminalPath([], "/code/./../articles"), ["articles"]);
  assert.deepEqual(resolveTerminalPath(["motion-and-graphics", "video-editing"], "../thumbnail-design"), ["motion-and-graphics", "thumbnail-design"]);
  assert.deepEqual(resolveTerminalPath(["articles"], "../../.."), []);
  assert.deepEqual(resolveTerminalPath(["articles"], "."), ["articles"]);
  assert.equal(resolveTerminalPath([], "missing"), null);
  assert.equal(resolveTerminalPath([], "constructor"), null);
  assert.equal(resolveTerminalPath([], "__proto__"), null);
});

test("quoted multiword titles and empty draft values survive parsing", () => {
  assert.deepEqual(parseArguments('"Jane Doe" jane@example.com "Project inquiry" "Hello there"').values, ["Jane Doe", "jane@example.com", "Project inquiry", "Hello there"]);
  assert.deepEqual(parseArguments('phone ""').values, ["phone", ""]);
  assert.equal(parseArguments('"unfinished').activeQuote, '"');
  assert.equal(parseArguments('"finished" ').hasTrailingSpace, true);
});

test("engineering listing includes current and legacy project categories", () => {
  for (const category of ["engineering", "coding-projects", "code"]) assert.ok(isCodeProject({ category } as Project));
  assert.ok(isCodeProject({ category: "other", extraCategories: ["engineering"] } as unknown as Project));
  assert.equal(isCodeProject({ category: "other" } as unknown as Project), false);
  assert.equal(formatDate("bad date"), "");
  assert.equal(formatDate("2026-02-09"), "February 9, 2026");
});

const form: TerminalForm = { name: "Test", email: "test@example.com", phone: "", subject: "Test", message: "Test message", identifier: "test@example.com" };

test("invalid form input is rejected before a request can be sent", async () => {
  let called = false;
  const fetcher = (async () => { called = true; return Response.json({ success: true }); }) as typeof fetch;
  await assert.rejects(submitTerminalForm("contact", { ...form, email: "invalid" }, fetcher), /valid email/);
  assert.equal(called, false);
  assert.throws(() => validateTerminalForm("contact", { ...form, name: " " }), /name/);
  assert.throws(() => validateTerminalForm("unsubscribe", { ...form, identifier: "invalid" }), /valid email/);
});

test("all form modes use their correct endpoint and preserve required payloads", async () => {
  for (const mode of ["contact", "subscribe", "unsubscribe"] as const) {
    const fetcher = (async (url, init) => {
      assert.equal(url, `/api/${mode}`);
      assert.equal(init?.method, "POST");
      const body = JSON.parse(String(init?.body));
      if (mode === "unsubscribe") assert.equal(body.identifier, form.identifier);
      else { assert.equal(body.consent, true); assert.equal(body.email, form.email); }
      return Response.json({ success: true });
    }) as typeof fetch;
    await submitTerminalForm(mode, form, fetcher);
  }
});

test("server errors, malformed bodies and unconfirmed replies never report success", async () => {
  const responses = [Response.json({ error: "Too many requests" }, { status: 429 }), Response.json({ success: false }), new Response("not JSON"), new Response(null, { status: 204 })];
  for (const response of responses) await assert.rejects(submitTerminalForm("contact", form, (async () => response) as typeof fetch));
  await assert.rejects(submitTerminalForm("subscribe", form, (async () => { throw new Error("Offline"); }) as typeof fetch), /Offline/);
  await assert.rejects(submitTerminalForm("unsubscribe", form, (async () => Response.json({ success: false, message: "No subscribed record" }, {status:400})) as typeof fetch), /No subscribed record/);
});

test("malformed portfolio snapshots are rejected before rendering", () => {
  for (const value of [null, {}, { projects: "invalid" }]) assert.throws(() => validateTerminalSnapshot(value));
  const snapshot = Object.fromEntries(["projects", "featuredProjects", "articles", "clients", "featuredClients", "experiences", "educations", "skills", "certifications", "awards", "clubs"].map(key => [key, []]));
  assert.doesNotThrow(() => validateTerminalSnapshot(snapshot));
});

test("browser accepts web addresses, enforces existing filters and rejects unsafe schemes", () => {
  assert.equal(sanitizeBrowseUrl("example.com").url, "https://example.com/");
  for (const url of ["javascript:alert(1)", "data:text/html,test", "ftp://example.com", "https://user:secret@example.com"]) assert.equal(sanitizeBrowseUrl(url).url, "");
  assert.equal(sanitizeBrowseUrl("https://sub.pornhub.com").blocked, true);
  assert.match(sanitizeBrowseUrl("https://google.com/search?q=hello").url, /safe=strict/);
});

test("Snake spawns only in free cells and terminates on a full board", () => {
  const occupied = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
  assert.deepEqual(randomFreeCell(occupied, 2), { x: 1, y: 1 });
  assert.equal(randomFreeCell([...occupied, { x: 1, y: 1 }], 2), null);
});
