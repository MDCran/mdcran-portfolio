"use client";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { initialMicrophoneTestState, MicrophoneTestSession } from "@/lib/microphone-test-session";
import { MICROPHONE_PERMISSION_GUIDANCE } from "@/lib/voice-input";
import { Mic, Play, Square, Trash2 } from "lucide-react";
import styles from "./AssistantControls.module.css";
export type MicrophoneTestControl = { stop: () => void };
export default function MicrophoneTest({ onStart, ref }: { onStart?: () => void; ref?: Ref<MicrophoneTestControl> }) {
  const [{ devices, device, level, active, pending, recording, url, error }, setState] = useState(initialMicrophoneTestState);
  const session = useRef<MicrophoneTestSession | null>(null);
  const clipAudio = useRef<HTMLAudioElement | null>(null);
  useImperativeHandle(ref, () => ({ stop: () => session.current?.stop() }), []);
  useEffect(() => {
    const controller = new MicrophoneTestSession(setState, () => clipAudio.current?.pause());
    session.current = controller;
    return () => { controller.dispose(); session.current = null; };
  }, []);
  function stop() { session.current?.stop(); }
  function start() { onStart?.(); return session.current?.start(); }
  return (
    <details className={styles.accordion} onToggle={e => { if (!e.currentTarget.open) stop(); }}>
      <summary className={styles.summary}><Mic size={14} aria-hidden="true" />Test microphone</summary>
      <div className={styles.body}>
        <p className={styles.note}>Audio stays in this browser. Testing pauses the voice conversation; resume it when finished.</p>
        <label className={styles.field}>Input device
          <select className={styles.select} value={device} onChange={e => { session.current?.selectDevice(e.target.value); }}>
            <option value="">System default</option>
            {devices.filter(d => d.deviceId).map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || "Microphone"}</option>)}
          </select>
        </label>
        <meter aria-label="Microphone input level" min={0} max={1} value={level} className={styles.meter} />
        <p role="status" className={styles.note}>{pending ? MICROPHONE_PERMISSION_GUIDANCE : active ? "Speak to check the input meter." : "Enable the microphone to see available devices."}</p>
        <div className={styles.actions}>
          <button className={styles.button} onClick={() => active || pending ? stop() : void start()}>
            {active || pending ? <Square size={12} aria-hidden="true" /> : <Mic size={12} aria-hidden="true" />}
            {pending ? "Cancel microphone request" : active ? "Stop test" : "Enable microphone"}
          </button>
          <button className={styles.button} disabled={!active || recording} onClick={() => session.current?.record()}><Play size={12} aria-hidden="true" />{recording ? "Recording 5 seconds…" : "Record 5-second test"}</button>
        </div>
        {url && <><audio ref={clipAudio} controls src={url} className="w-full" /><button className={styles.button} onClick={() => { session.current?.deleteRecording(); }}><Trash2 size={12} aria-hidden="true" />Delete recording</button></>}
        {error && <p role="alert" className={styles.error}>{error}</p>}
      </div>
    </details>
  );
}
