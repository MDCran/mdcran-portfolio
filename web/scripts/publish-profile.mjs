#!/usr/bin/env node
// Explicit local publishing boundary. Preview is the default; only --apply writes GitHub.
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const target = "MDCran/mdcran";
const imageTarget = "assets/githubprofile.png";
const args = process.argv.slice(2);
const help = `Usage: node scripts/publish-profile.mjs --snapshot publication.json --screenshot profile.png [--apply]
   or: node scripts/publish-profile.mjs --readme README.md --screenshot profile.png [--apply]

Preview is the default and makes no GitHub requests or changes.
Download the canonical public JSON from https://www.mdcran.com/api/profile-publication
and capture https://www.mdcran.com/githubprofile?capture=1 with a matching data-publication-hash.
--apply uses your existing gh authentication to atomically update README.md and ${imageTarget} in ${target}.
Review the downloaded image and Markdown first. No server GitHub token is required.`;
if (args.includes("--help") || args.length === 0) { console.log(help); process.exit(0); }

function option(name) {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a file path.`);
  return resolve(value);
}
function digest(value) { return createHash("sha256").update(value).digest("hex"); }
function gh(path, method = "GET", body) {
  const result = spawnSync("gh", ["api", `repos/${target}${path ? `/${path}` : ""}`, "--method", method, ...(body ? ["--input", "-"] : [])], {
    encoding: "utf8", input: body ? JSON.stringify(body) : undefined, windowsHide: true, maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw new Error(`Could not run gh: ${result.error.message}. Install GitHub CLI and sign in first.`);
  if (result.status !== 0) throw new Error(`GitHub ${method} request failed: ${result.stderr.trim()}`);
  return JSON.parse(result.stdout);
}

try {
  for (let i = 0; i < args.length; i++) {
    if (["--snapshot", "--readme", "--screenshot"].includes(args[i])) { i++; continue; }
    if (args[i] !== "--apply") throw new Error(`Unknown argument: ${args[i]}`);
  }
  const snapshotPath = option("--snapshot");
  const readmePath = option("--readme");
  const screenshotPath = option("--screenshot");
  if (!!snapshotPath === !!readmePath) throw new Error("Provide exactly one of --snapshot or --readme.");
  if (!screenshotPath) throw new Error("Provide --screenshot with the reviewed profile PNG.");
  if (statSync(snapshotPath ?? readmePath).size > 2_000_000) throw new Error("The publication file exceeds 2 MB.");
  let readme;
  let publicationHash;
  if (snapshotPath) {
    const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8").replace(/^\uFEFF/, ""));
    const hash = snapshot.hash;
    const content = { ...snapshot };
    delete content.hash;
    delete content.generatedAt;
    if (snapshot.schemaVersion !== 1 || typeof snapshot.readme !== "string" || snapshot.screenshotPath !== imageTarget) throw new Error("This is not a supported shared profile publication snapshot.");
    if (digest(JSON.stringify(content)) !== hash) throw new Error("Snapshot hash does not match its contents. Export a fresh snapshot instead of editing it.");
    publicationHash = hash;
    readme = snapshot.readme;
  } else readme = readFileSync(readmePath, "utf8").replace(/^\uFEFF/, "");
  if (!readme.startsWith("<!-- Generated from the shared public portfolio publication snapshot. -->") || !readme.includes(`](${imageTarget})`)) throw new Error("README is missing the shared publication marker or its profile image link.");
  if (statSync(screenshotPath).size > 8_000_000) throw new Error("The screenshot exceeds 8 MB; export a smaller PNG.");
  const screenshot = readFileSync(screenshotPath);
  if (!screenshot.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || screenshot.length < 24) throw new Error("The screenshot must be a valid PNG file.");
  const width = screenshot.readUInt32BE(16), height = screenshot.readUInt32BE(20);
  if (width < 600 || height < 400) throw new Error("The profile screenshot is too small. Use a full-page export at least 600 × 400 pixels.");
  console.log(`Target: ${target}\nREADME.md: ${Buffer.byteLength(readme)} bytes, SHA-256 ${digest(readme)}\n${imageTarget}: ${width} × ${height}, ${screenshot.length} bytes, SHA-256 ${digest(screenshot)}${publicationHash ? `\nPublication: ${publicationHash}` : ""}`);
  if (!args.includes("--apply")) {
    console.log("Preview only. No GitHub requests or writes were made. Review the files, then rerun with --apply to publish both in one commit.");
    process.exit(0);
  }
  const repo = gh("");
  const branch = repo.default_branch;
  if (typeof branch !== "string" || !branch) throw new Error("GitHub did not return a default branch.");
  const ref = gh(`git/ref/heads/${encodeURIComponent(branch)}`);
  const parent = ref.object.sha;
  const previous = gh(`git/commits/${parent}`);
  const readmeBlob = gh("git/blobs", "POST", { content: readme, encoding: "utf-8" });
  const imageBlob = gh("git/blobs", "POST", { content: screenshot.toString("base64"), encoding: "base64" });
  const tree = gh("git/trees", "POST", { base_tree: previous.tree.sha, tree: [
    { path: "README.md", mode: "100644", type: "blob", sha: readmeBlob.sha },
    { path: imageTarget, mode: "100644", type: "blob", sha: imageBlob.sha },
  ] });
  if (tree.sha === previous.tree.sha) { console.log("The README and screenshot are already current; no commit created."); process.exit(0); }
  const commit = gh("git/commits", "POST", { message: `Publish shared portfolio profile${publicationHash ? ` (${publicationHash.slice(0, 12)})` : ""}`, tree: tree.sha, parents: [parent] });
  // Non-forced update rejects a concurrent remote change instead of overwriting it.
  gh(`git/refs/heads/${encodeURIComponent(branch)}`, "PATCH", { sha: commit.sha, force: false });
  console.log(`Published both files: https://github.com/${target}/commit/${commit.sha}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
