import test from "node:test";
import assert from "node:assert/strict";
import { streamTerminalAnswer, cleanTerminalAnswer, terminalHistory } from "../src/lib/terminal-ai";
import { buildSearch } from "../src/lib/terminal-search";
import { INITIAL_PACMAN_MAZE, nextPacmanRound, pacmanCollision, pacmanTickMs, snakeSelfCollision } from "../src/lib/terminal-games";
import type { Article, Client, Project } from "../src/lib/types";

function sse(text: string, chunkSize = 1) {
  const bytes = new TextEncoder().encode(text);
  return new Response(new ReadableStream({ start(controller) {
    for (let start = 0; start < bytes.length; start += chunkSize) controller.enqueue(bytes.slice(start, start + chunkSize));
    controller.close();
  } }), { headers: { "Content-Type": "text/event-stream" } });
}

test("terminal AI decodes fragmented UTF-8 streams and returns safe public citations", async () => {
  const streamed: string[] = [];
  const response = sse('data: {"text":"Café 🧠"}\r\n\r\ndata: {"sources":[{"title":"Project","href":"/engineering"},{"title":"Source","href":"https://github.com/MDCran/coretex"},{"title":"Private","href":"/admin"},{"title":"Unsafe","href":"javascript:alert(1)"}]}\n\ndata: [DONE]');
  const result = await streamTerminalAnswer({ question: "Explain Coretex", history: [], signal: new AbortController().signal, onText: text => streamed.push(text),
    fetcher: (async (url, init) => { assert.equal(url, "/api/chat"); const body = JSON.parse(String(init?.body)); assert.equal(body.currentPage, "/terminal"); assert.equal(body.memoryConsent, false); return response; }) as typeof fetch });
  assert.equal(result.text, "Café 🧠");
  assert.deepEqual(result.sources.map(source => source.href), ["/engineering", "https://github.com/MDCran/coretex"]);
  assert.equal(streamed.at(-1), "Café 🧠");
});

test("AI error frames, HTTP failures, malformed streams and incomplete answers stay failures", async () => {
  const responses = [Response.json({ error: "Capacity reached" }, { status: 429 }), sse('data: {"error":"Provider unavailable"}\n\n'), sse('data: {"text":"Partial answer"}\n\n'), sse('data: not-json\n\n'), sse('data: [DONE]\n\n'), Response.json({ text: "wrong protocol" })];
  for (const response of responses) await assert.rejects(streamTerminalAnswer({ question: "Hello", history: [], signal: new AbortController().signal, onText() {}, fetcher: (async () => response) as typeof fetch }));
});

test("stopping AI cancels a pending stream read and releases the reader", async () => {
  const controller = new AbortController();
  let cancelled = false;
  const response = new Response(new ReadableStream({ cancel() { cancelled = true; } }), { headers: { "Content-Type": "text/event-stream" } });
  const request = streamTerminalAnswer({ question: "Hello", history: [], signal: controller.signal, onText() {}, fetcher: (async () => response) as typeof fetch });
  await new Promise(resolve => setTimeout(resolve, 0));
  controller.abort();
  await assert.rejects(request, { name: "AbortError" });
  assert.equal(cancelled, true);
});

test("AI context stays bounded and control markers never become shell commands", async () => {
  const history = Array.from({ length: 24 }, (_, index) => ({ role: (index % 2 ? "assistant" : "user") as "assistant" | "user", content: "x".repeat(4000) }));
  const messages = terminalHistory(history, "Follow up");
  assert.ok(messages.length <= 13);
  assert.ok(messages.reduce((sum, message) => sum + message.content.length, 0) <= 24000);
  assert.equal(messages.at(-1)?.content, "Follow up");
  assert.equal(cleanTerminalAnswer("Hello __NAVIGATE:/engineering__ <script>bad</script>"), "Hello  bad");
  assert.equal(cleanTerminalAnswer("Hello __NAVIGATE:/engine"), "Hello");
  const answer = await streamTerminalAnswer({ question: "Hello", history: [], signal: new AbortController().signal, onText() {}, fetcher: (async () => sse('data: {"text":"See my work."}\n\ndata: {"actions":[{"type":"navigate","href":"/admin"}]}\n\ndata: [DONE]\n\n')) as typeof fetch });
  assert.equal(answer.text, "See my work.");
});

const projects = [
  { id: "coretex", slug: "coretex", title: "Coretex", description: "AI agents", tags: ["React"], clientIds: ["client"], sections: [{ type: "text", content: "Orchestration architecture" }], videos: [{ youtubeId: "demo123", title: "Agent demo" }] },
  { id: "other", slug: "other", title: "Other", description: "Coretex integration" },
] as unknown as Project[];
const data = { projects, articles: [{ id: "article", slug: "cafe", title: "Café tooling", excerpt: "Developer workflows", tags: [] }] as unknown as Article[], clients: [{ id: "client", name: "Studio", bio: "Creator", roles: [] }] as unknown as Client[] };

test("search ranks exact names, matches multiple terms, and searches full project evidence", () => {
  assert.equal(buildSearch(data, "coretex")[0].kind, "project");
  assert.equal((buildSearch(data, "coretex")[0] as {id:string}).id, "coretex");
  assert.equal(buildSearch(data, "AI React").length, 1);
  assert.equal(buildSearch(data, "orchestration")[0].kind, "project");
  assert.ok(buildSearch(data, "Studio").some(hit => hit.kind === "project"));
  assert.ok(buildSearch(data, "Agent demo").some(hit => hit.kind === "video"));
  assert.equal(buildSearch(data, "cafe")[0].kind, "article");
  assert.deepEqual(buildSearch(data, "does-not-exist"), []);
  assert.deepEqual(buildSearch(data, "   "), []);
});

test("search retains every matching result and tolerates optional metadata", () => {
  const result = buildSearch({ projects: Array.from({ length: 30 }, (_, index) => ({ id: String(index), slug: String(index), title: `Example ${index}` })) as Project[], articles: [], clients: [] }, "example");
  assert.equal(result.length, 30);
  assert.equal(new Set(result.map(hit => (hit as {id:string}).id)).size, 30);
});

test("short technology queries do not match unrelated word fragments", () => {
  const candidates = { ...data, projects: [...projects, { id: "css", slug: "css", title: "Frontend", description: "React and Tailwind" } as Project] };
  assert.equal(buildSearch(candidates, "AI React").some(hit => "id" in hit && hit.id === "css"), false);
  assert.equal(buildSearch(candidates, "AI React").some(hit => "id" in hit && hit.id === "coretex"), true);
});

test("Pac-Man collision catches crossing paths and level difficulty stays bounded", () => {
  assert.equal(pacmanCollision({x:1,y:1}, {x:2,y:1}, {x:2,y:1}, {x:1,y:1}), true);
  assert.equal(pacmanCollision({x:1,y:1}, {x:2,y:1}, {x:3,y:1}, {x:3,y:2}), false);
  assert.ok(pacmanTickMs(2) < pacmanTickMs(1));
  assert.equal(pacmanTickMs(100), 90);
  assert.deepEqual(nextPacmanRound({ score: 2340, lives: 2, level: 3 }, true), { score: 2340, lives: 2, level: 4 });
  assert.deepEqual(nextPacmanRound({ score: 2340, lives: 0, level: 3 }, false), { score: 0, lives: 3, level: 1 });
});

test("every Pac-Man pellet and ghost spawn is reachable from the player start", () => {
  const maze = INITIAL_PACMAN_MAZE;
  const seen = new Set(["7,9"]);
  const queue = [{x:7,y:9}];
  while (queue.length) {
    const cell = queue.shift()!;
    for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      const x = (cell.x + dx + 15) % 15; const y = (cell.y + dy + 15) % 15;
      if (maze[y][x] !== 1 && !seen.has(`${x},${y}`)) { seen.add(`${x},${y}`); queue.push({x,y}); }
    }
  }
  for (let y=0;y<15;y++) for(let x=0;x<15;x++) if (maze[y][x] === 2 || maze[y][x] === 3) assert.ok(seen.has(`${x},${y}`), `unreachable pellet ${x},${y}`);
  for (const x of [5,6,8,9]) assert.ok(seen.has(`${x},7`));
});

test("Snake can enter a vacating tail but cannot cross its growing body", () => {
  const snake = [{x:1,y:1},{x:1,y:2},{x:2,y:2},{x:2,y:1}];
  assert.equal(snakeSelfCollision(snake,{x:2,y:1},false),false);
  assert.equal(snakeSelfCollision(snake,{x:2,y:1},true),true);
  assert.equal(snakeSelfCollision(snake,{x:1,y:2},false),true);
});
