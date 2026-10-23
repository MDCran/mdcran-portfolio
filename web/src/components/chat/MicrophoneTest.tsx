"use client";
import { useEffect, useRef, useState } from "react";
export default function MicrophoneTest({ onStart }: { onStart?: () => void }) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [device, setDevice] = useState("");
  const [level, setLevel] = useState(0);
  const [active, setActive] = useState(false);
  const [recording, setRecording] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const stream = useRef<MediaStream | null>(null);
  const context = useRef<AudioContext | null>(null);
  const raf = useRef(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);
  const clip = useRef("");
  const clipAudio = useRef<HTMLAudioElement | null>(null);
  function stop() {
    clipAudio.current?.pause();
    generation.current++;
    if (timer.current) clearTimeout(timer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
    stream.current?.getTracks().forEach(t => t.stop()); stream.current = null;
    void context.current?.close(); context.current = null;
    cancelAnimationFrame(raf.current); setLevel(0); setActive(false); setRecording(false);
  }
  useEffect(() => () => { generation.current++; if (timer.current) clearTimeout(timer.current); if (recorder.current?.state === "recording") recorder.current.stop(); stream.current?.getTracks().forEach(t => t.stop()); void context.current?.close(); cancelAnimationFrame(raf.current); if (clip.current) URL.revokeObjectURL(clip.current); }, []);
  async function start() {
    stop(); onStart?.(); setError(""); const epoch = generation.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Microphone testing requires HTTPS and a browser with microphone support.");
      const input = await navigator.mediaDevices.getUserMedia({ audio: device ? { deviceId: { exact: device } } : true });
      if (epoch !== generation.current) { input.getTracks().forEach(t => t.stop()); return; }
      stream.current = input;
      setDevices((await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === "audioinput"));
      if (epoch !== generation.current) { input.getTracks().forEach(t => t.stop()); return; }
      const ctx = new AudioContext(); context.current = ctx; await ctx.resume();
      const analyser = ctx.createAnalyser(); analyser.fftSize = 256; ctx.createMediaStreamSource(input).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const tick = () => { analyser.getByteTimeDomainData(data); setLevel(Math.min(1, Math.sqrt(data.reduce((sum, n) => sum + ((n - 128) / 128) ** 2, 0) / data.length) * 4)); raf.current = requestAnimationFrame(tick); }; tick(); setActive(true);
    } catch (e) { stop(); setError(e instanceof DOMException && e.name === "NotAllowedError" ? "Allow microphone access in this site's browser permissions, then try again. You can continue by typing." : e instanceof DOMException && e.name === "NotFoundError" ? "No microphone was found. Connect an input device and try again." : "Could not open that microphone. Check permissions, close other recording apps, or select another input."); }
  }
  function record() {
    if (!stream.current || typeof MediaRecorder === "undefined") { setError("Test recording is unavailable in this browser; the input meter still works."); return; }
    const epoch = generation.current; const chunks: Blob[] = []; const mr = new MediaRecorder(stream.current); recorder.current = mr;
    mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    mr.onstop = () => { if (epoch !== generation.current) return; if (clip.current) URL.revokeObjectURL(clip.current); clip.current = URL.createObjectURL(new Blob(chunks, { type: mr.mimeType })); setUrl(clip.current); setRecording(false); };
    mr.start(); setRecording(true); timer.current = setTimeout(() => { if (mr.state === "recording") mr.stop(); }, 5000);
  }
  return <details className="mx-4 my-2 rounded border border-current/20 p-2 text-xs" onToggle={e => { if (!e.currentTarget.open) stop(); }}><summary>Test microphone</summary><div className="mt-3 space-y-3"><p>Audio stays in this browser. Testing pauses the voice conversation; resume it when finished.</p><label className="block">Input device <select className="max-w-full bg-[var(--background,#111)]" value={device} onChange={e => { stop(); setDevice(e.target.value); }}><option value="">System default</option>{devices.filter(d => d.deviceId).map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || "Microphone"}</option>)}</select></label><meter aria-label="Microphone input level" min={0} max={1} value={level} className="w-full" /><p>{active ? "Speak to check the input meter." : "Enable the microphone to see available devices."}</p><div className="flex flex-wrap gap-2"><button className="rounded border px-2 py-1" onClick={() => active ? stop() : void start()}>{active ? "Stop test" : "Enable microphone"}</button><button className="rounded border px-2 py-1 disabled:opacity-40" disabled={!active || recording} onClick={record}>{recording ? "Recording 5 seconds…" : "Record 5-second test"}</button></div>{url && <><audio ref={clipAudio} controls src={url} className="w-full" /><button onClick={() => { clipAudio.current?.pause(); URL.revokeObjectURL(clip.current); clip.current = ""; setUrl(""); }}>Delete recording</button></>}{error && <p role="alert">{error}</p>}</div></details>;
}
