"use client";
import { useEffect, useRef, useState } from "react";
import { adminRequest } from "@/lib/admin-client";
import type { ProfilePublication } from "@/lib/profile-publication";

function download(data: Blob, filename: string) {
  const url = URL.createObjectURL(data);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function PublishingStudio() {
  const [snapshot, setSnapshot] = useState<ProfilePublication | null>(null);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(false);
  const [frameReady, setFrameReady] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    let active = true;
    adminRequest<ProfilePublication>("/api/admin/publishing").then((data) => { if (active) setSnapshot(data); }).catch((error: unknown) => { if (active) setMessage(error instanceof Error ? error.message : "Could not load publication."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function reload() {
    setLoading(true); setMessage(""); setPreview(false); setFrameReady(false);
    try { setSnapshot(await adminRequest<ProfilePublication>("/api/admin/publishing")); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not load publication."); }
    finally { setLoading(false); }
  }
  async function capture() {
    setCapturing(true); setMessage("");
    try {
      const doc = frame.current?.contentDocument;
      const element = doc?.querySelector<HTMLElement>("[data-profile-capture]");
      if (!doc || !element || !snapshot) throw new Error("Wait for the profile preview to finish loading.");
      await doc.fonts.ready;
      if (element.dataset.publicationHash !== snapshot.hash) throw new Error("Public content changed since this snapshot. Reload the publication and preview before exporting.");
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(element, {
        backgroundColor: "#070707", scale: 1.5, useCORS: true, logging: false,
        windowWidth: 1280, windowHeight: Math.max(1600, element.scrollHeight),
        onclone: (cloned) => {
          cloned.documentElement.setAttribute("data-theme", "dark");
          const style = cloned.createElement("style");
          style.textContent = "*, *::before, *::after { animation: none !important; transition: none !important; }";
          cloned.head.append(style);
        },
      });
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("The browser could not encode the image.")), "image/png"));
      download(blob, "githubprofile.png");
      setMessage("Profile PNG downloaded. Review the image before publishing it with the matching snapshot.");
    } catch (error) {
      setMessage(`${error instanceof Error ? error.message : "Image export failed."} If your browser cannot render this page to canvas, open the capture page below and use the browser’s full-page screenshot. README and snapshot downloads remain available.`);
    } finally { setCapturing(false); }
  }
  const button = "rounded-sm border border-white/20 px-4 py-2 text-sm disabled:opacity-50";
  return <section className="space-y-5">
    <div><h2 className="text-xl font-semibold">Publish one shared profile</h2><p className="mt-2 max-w-3xl text-sm text-white/70">The resume, GitHub profile image, and README use the current public profile, skills, and engineering project records. Review and download a matching snapshot here, then publish with your existing GitHub sign-in from the local publishing tool.</p></div>
    <div className="flex flex-wrap gap-3"><button className={button} onClick={reload} disabled={loading}>{loading ? "Loading snapshot…" : "Reload publication"}</button><a className={button} href="/resume/print" target="_blank" rel="noopener noreferrer">Print / save resume PDF</a><a className={button} href="/githubprofile?capture=1" target="_blank" rel="noopener noreferrer">Open profile capture page</a></div>
    <p role="status" className="whitespace-pre-wrap text-sm text-white/80">{message}</p>
    {snapshot && <>
      <div className="rounded-sm border border-white/15 p-4"><p className="text-sm">{snapshot.profile.fullName} · {snapshot.profile.title} · {snapshot.profile.location}</p><p className="mt-2 text-sm text-white/70">{snapshot.counts.skills} skills · {snapshot.counts.skillCategories} categories · {snapshot.counts.projects} public projects/packages</p><p className="mt-2 break-all font-mono text-xs text-white/55">Snapshot SHA-256: {snapshot.hash}</p></div>
      <div className="flex flex-wrap gap-3"><button className={button} onClick={() => download(new Blob([snapshot.readme], { type: "text/markdown;charset=utf-8" }), "README.md")}>Download README</button><button className={button} onClick={() => download(new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" }), "profile-publication.json")}>Download full snapshot</button><button className={button} aria-expanded={preview} aria-controls="publication-preview" onClick={() => { setPreview(!preview); setFrameReady(false); }}>{preview ? "Hide" : "Load"} image preview</button><button className={button} disabled={!preview || !frameReady || capturing} onClick={capture}>{capturing ? "Exporting image…" : "Download profile PNG"}</button></div>
      <details className="rounded-sm border border-white/15 p-4"><summary className="cursor-pointer text-sm font-semibold">Review generated README Markdown</summary><pre className="mt-4 max-h-[36rem] overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-white/80">{snapshot.readme}</pre></details>
      <div id="publication-preview" className="overflow-x-auto">{preview && <iframe ref={frame} onLoad={() => setFrameReady(true)} src={`/githubprofile?capture=1&snapshot=${snapshot.hash}`} title="Current public GitHub profile screenshot preview" width="1280" height="1600" className="border border-white/15" />}</div>
      <details className="rounded-sm border border-white/15 p-4"><summary className="cursor-pointer text-sm font-semibold">Publish to GitHub from your computer</summary><p className="mt-3 text-sm text-white/70">After downloading the full snapshot and reviewing the PNG, run the local publishing tool. It previews by default; add --apply only when the two files are ready. It uses existing gh authentication and updates README.md plus assets/githubprofile.png together in MDCran/mdcran. No GitHub token is stored in this site.</p><pre className="mt-3 overflow-x-auto text-xs">node scripts/publish-profile.mjs --snapshot path/to/profile-publication.json --screenshot path/to/githubprofile.png</pre></details>
    </>}
  </section>;
}
