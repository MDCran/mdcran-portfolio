"use client";

import { useEffect, useState } from "react";
import { LockKeyhole } from "lucide-react";
import styles from "./pin-gate.module.css";

export default function SlidePinGate() {
  const [pin, setPin] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!retryAt) return;
    const update = () => {
      const remaining = Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
      setSeconds(remaining);
      if (!remaining) { setRetryAt(0); setError(""); }
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [retryAt]);

  async function unlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || retryAt > Date.now() || !/^\d{4}$/.test(pin)) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/slides/theanywherecompany/unlock", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }),
      });
      const result = await response.json();
      if (response.ok) { window.location.reload(); return; }
      const retry = Number(response.headers.get("Retry-After"));
      if (Number.isFinite(retry) && retry > 0) { setSeconds(retry); setRetryAt(Date.now() + retry * 1000); }
      setError(result.error ?? "Unable to unlock. Please try again.");
      setPin("");
    } catch { setError("Unable to connect. Please try again."); }
    setPending(false);
  }

  return <main className={styles.gate}>
    <form className={styles.panel} onSubmit={unlock}>
      <LockKeyhole className={styles.icon} aria-hidden="true" />
      <p className={styles.eyebrow}>The Anywhere Company</p>
      <h1>Private presentation</h1>
      <p className={styles.intro}>Enter the 4-digit PIN to continue.</p>
      <label htmlFor="slideshow-pin">PIN</label>
      <input id="slideshow-pin" name="pin" type="password" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{4}" maxLength={4} required value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))} disabled={pending || seconds > 0} aria-describedby={error ? "pin-error" : undefined} aria-invalid={error && !seconds ? true : undefined} autoFocus />
      <button type="submit" disabled={pending || seconds > 0 || pin.length !== 4}>{pending ? "Unlocking…" : "Unlock slideshow"}</button>
      {error && <p id="pin-error" className={styles.error} role="alert">{seconds ? `Try again in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}.` : error}</p>}
    </form>
  </main>;
}
