export type MicrophoneTestState = {
  devices: MediaDeviceInfo[]; device: string; level: number;
  active: boolean; pending: boolean; recording: boolean; url: string; error: string;
};
export const initialMicrophoneTestState: MicrophoneTestState = {
  devices: [], device: "", level: 0, active: false, pending: false, recording: false, url: "", error: "",
};

/** Owns browser resources independently of React rendering. Every asynchronous
 * continuation belongs to one generation, including permission and device scans. */
export class MicrophoneTestSession {
  private generation = 0;
  private disposed = false;
  private stream: MediaStream | null = null;
  private trackEnded: (() => void) | null = null;
  private context: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private recorder: MediaRecorder | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private frame = 0;
  private scan = 0;
  private devices: MediaDevices | null = null;
  private state = { ...initialMicrophoneTestState };
  constructor(private changed: (state: MicrophoneTestState) => void, private pausePlayback: () => void) {}

  private update(patch: Partial<MicrophoneTestState>) {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch }; this.changed(this.state);
  }
  private current(epoch: number) { return !this.disposed && epoch === this.generation; }
  private refreshDevices = async () => {
    const epoch = this.generation; const scan = ++this.scan;
    try {
      const devices = (await this.devices?.enumerateDevices() ?? []).filter(d => d.kind === "audioinput");
      if (!this.current(epoch) || scan !== this.scan) return;
      if (this.state.device && !devices.some(d => d.deviceId === this.state.device)) {
        this.stop();
        this.update({ device: "", devices, error: "That microphone was disconnected. Select an input and enable the microphone again." });
      } else this.update({ devices });
    } catch { /* A working input meter does not depend on device enumeration. */ }
  };
  stop() {
    ++this.generation; ++this.scan; this.pausePlayback();
    if (this.timer !== null) clearTimeout(this.timer); this.timer = null;
    if (this.recorder) {
      this.recorder.onstop = null; this.recorder.ondataavailable = null; this.recorder.onerror = null;
      try { if (this.recorder.state !== "inactive") this.recorder.stop(); } catch { /* Already stopped. */ }
      this.recorder = null;
    }
    this.source?.disconnect(); this.source = null;
    this.stream?.getTracks().forEach(t => { if (this.trackEnded) t.removeEventListener("ended", this.trackEnded); t.stop(); }); this.stream = null; this.trackEnded = null;
    if (this.context) void this.context.close().catch(() => {}); this.context = null;
    cancelAnimationFrame(this.frame); this.frame = 0;
    this.update({ active: false, pending: false, recording: false, level: 0 });
  }
  selectDevice(device: string) { this.stop(); this.update({ device, error: "" }); }
  async start() {
    if (this.disposed) return;
    this.stop(); this.update({ error: "" }); const epoch = this.generation;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        this.update({ error: "Microphone testing requires HTTPS and a browser with microphone support." }); return;
      }
      if (!this.devices) {
        this.devices = navigator.mediaDevices;
        this.devices.addEventListener?.("devicechange", this.refreshDevices);
      }
      this.update({ pending: true });
      const input = await this.devices.getUserMedia({ audio: this.state.device ? { deviceId: { exact: this.state.device } } : true });
      if (!this.current(epoch)) { input.getTracks().forEach(t => t.stop()); return; }
      this.update({ pending: false });
      this.stream = input;
      this.trackEnded = () => {
        if (!this.current(epoch)) return;
        this.stop(); this.update({ error: "Microphone input ended. Check the connection and site permissions, then enable it again." });
      };
      input.getTracks().forEach(t => t.addEventListener("ended", this.trackEnded!));
      // Labels may require permission. Enumeration failures must not block capture.
      void this.refreshDevices();
      const ctx = new AudioContext(); this.context = ctx; await ctx.resume();
      if (!this.current(epoch)) return;
      const analyser = ctx.createAnalyser(); analyser.fftSize = 256;
      this.source = ctx.createMediaStreamSource(input); this.source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const tick = () => {
        if (!this.current(epoch)) return;
        analyser.getByteTimeDomainData(data);
        this.update({ level: Math.min(1, Math.sqrt(data.reduce((sum, n) => sum + ((n - 128) / 128) ** 2, 0) / data.length) * 4) });
        this.frame = requestAnimationFrame(tick);
      };
      tick(); this.update({ active: true });
    } catch (error) {
      if (!this.current(epoch)) return;
      this.stop();
      const name = error instanceof Error ? error.name : "";
      this.update({ error: name === "NotAllowedError" ? "Allow microphone access in this site's browser permissions, then try again. You can continue by typing." : name === "NotFoundError" ? "No microphone was found. Connect an input device and try again." : name === "OverconstrainedError" ? "That microphone is unavailable. Select System default or another input and try again." : "Could not open that microphone. Check permissions, close other recording apps, or select another input." });
    }
  }
  record() {
    if (!this.state.active || !this.stream || this.state.recording || this.disposed) return;
    if (typeof MediaRecorder === "undefined") { this.update({ error: "Test recording is unavailable in this browser; the input meter still works." }); return; }
    const epoch = this.generation; const chunks: Blob[] = [];
    try {
      const recorder = new MediaRecorder(this.stream); this.recorder = recorder;
      recorder.ondataavailable = e => { if (this.current(epoch) && e.data.size) chunks.push(e.data); };
      const recordingFailed = () => { if (this.current(epoch)) { this.stop(); this.update({ error: "Could not record this input. Enable the microphone and try again." }); } };
      recorder.onerror = recordingFailed;
      recorder.onstop = () => {
        if (!this.current(epoch)) return;
        if (this.timer !== null) clearTimeout(this.timer); this.timer = null;
        this.deleteRecording();
        this.update({ url: URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType })), recording: false });
      };
      recorder.start(); this.update({ recording: true, error: "" });
      this.timer = setTimeout(() => { if (this.current(epoch) && recorder.state === "recording") { try { recorder.stop(); } catch { recordingFailed(); } } }, 5000);
    } catch { this.stop(); this.update({ error: "Test recording is unavailable for this input. Try another microphone." }); }
  }
  deleteRecording() {
    this.pausePlayback(); if (this.state.url) URL.revokeObjectURL(this.state.url);
    this.update({ url: "" });
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.stop();
    this.devices?.removeEventListener?.("devicechange", this.refreshDevices);
    if (this.state.url) URL.revokeObjectURL(this.state.url);
  }
}
