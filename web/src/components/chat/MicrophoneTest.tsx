"use client";
import { useEffect, useRef, useState } from "react";
import { initialMicrophoneTestState, MicrophoneTestSession } from "@/lib/microphone-test-session";
export default function MicrophoneTest({ onStart }: { onStart?: () => void }) {
  const [{ devices, device, level, active, recording, url, error }, setState] = useState(initialMicrophoneTestState);
  const session = useRef<MicrophoneTestSession | null>(null);
  const clipAudio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const controller = new MicrophoneTestSession(setState, () => clipAudio.current?.pause());
    session.current = controller;
    return () => { controller.dispose(); session.current = null; };
  }, []);
  function stop() { session.current?.stop(); }
  function start() { onStart?.(); return session.current?.start(); }
  return <details className="mx-4 my-2 rounded border border-current/20 p-2 text-xs" onToggle={e => { if (!e.currentTarget.open) stop(); }}><summary>Test microphone</summary><div className="mt-3 space-y-3"><p>Audio stays in this browser. Testing pauses the voice conversation; resume it when finished.</p><label className="block">Input device <select className="max-w-full bg-[var(--background,#111)]" value={device} onChange={e => { session.current?.selectDevice(e.target.value); }}><option value="">System default</option>{devices.filter(d => d.deviceId).map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || "Microphone"}</option>)}</select></label><meter aria-label="Microphone input level" min={0} max={1} value={level} className="w-full" /><p>{active ? "Speak to check the input meter." : "Enable the microphone to see available devices."}</p><div className="flex flex-wrap gap-2"><button className="rounded border px-2 py-1" onClick={() => active ? stop() : void start()}>{active ? "Stop test" : "Enable microphone"}</button><button className="rounded border px-2 py-1 disabled:opacity-40" disabled={!active || recording} onClick={() => session.current?.record()}>{recording ? "Recording 5 seconds…" : "Record 5-second test"}</button></div>{url && <><audio ref={clipAudio} controls src={url} className="w-full" /><button onClick={() => { session.current?.deleteRecording(); }}>Delete recording</button></>}{error && <p role="alert">{error}</p>}</div></details>;
}
