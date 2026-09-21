"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { RizzCard } from "@/app/rizz/RizzPageClient";
import { accentTextColor, getRizzConfig, type RizzConfig, type RizzSetting } from "@/lib/rizz";
import InvitationHeader from "./InvitationHeader";
import { sunshineMessages } from "@/lib/secret-pages";
import styles from "@/app/rizz/rizz.module.css";
import secret from "./secret.module.css";

export default function SecretPageClient({ kind, name, rizzEnabled, setting = "any", notes = [], cardConfig = getRizzConfig({ rizzTheme: "pokemon" }) }: { kind: "rivalCard" | "pocketSunshine"; name?: string; rizzEnabled: boolean; setting?: RizzSetting; notes?: string[]; cardConfig?: RizzConfig }) {
  const [flipped, setFlipped] = useState(false);
  const [noteIndex, setNoteIndex] = useState<number | null>(null);
  const messages = sunshineMessages(setting, notes);
  function drawNote() {
    // Pick a new note without immediately repeating the previous one.
    setNoteIndex(previous => previous === null ? Math.floor(Math.random() * messages.length) : (previous + 1 + Math.floor(Math.random() * (messages.length - 1))) % messages.length);
  }
  const rival = kind === "rivalCard";
  const theme = cardConfig.appearance;
  const accent = rival ? theme.accent : "#f9d68e";
  return <main className={styles.page} data-theme={rival ? "pokemon" : "outdoors"} style={{ "--rizz-accent": accent, "--rizz-on-accent": accentTextColor(accent) } as CSSProperties}>
    <div className={styles.shell}>
      <InvitationHeader name={name} />
      <section className={secret.container}>
        <p className={styles.eyebrow}>{rival ? "SPECIAL EDITION · ONE OF ONE" : "A SMALL GOOD THING, JUST BECAUSE"}</p>
        <h1>{rival ? theme.title : "Pocket Sunshine."}</h1>
        <p className={secret.description}>{rival ? theme.description : "For the days that could use a little extra light. Tap the jar. There's something in here for you."}</p>
        {rival ? <>
          <button className={secret.flip} aria-pressed={flipped} aria-label={flipped ? "Show the front of your rival card" : "Flip your rival card to reveal a rematch invitation"} onClick={() => setFlipped(value => !value)}>
            {flipped ? <div className={secret.cardBack}><span>{theme.tag}</span><strong>{theme.move}</strong><p>{theme.description}</p><div>{theme.cardDescription}</div><small>tap to flip back ↺</small></div> : <RizzCard targetName={name} config={cardConfig} />}
          </button>
          <p className={secret.caption}><RotateCcw size={13} /> Tap the card to flip it</p>
          {rizzEnabled && <Link className={styles.primary} href="/rizz">Let&apos;s plan that rematch <ArrowRight size={16} /></Link>}
        </> : <>
          <button className={secret.jarButton} onClick={drawNote} aria-label="Open the jar for a little sunshine"><span className={secret.jarLid} /><span className={secret.jar}><span>✧</span><strong>☀</strong><span>♡</span></span><span className={secret.jarLabel}>a little light<br /><small>for you</small></span></button>
          <div className={secret.note} role="status" aria-live="polite">{noteIndex === null ? "Your first little good thing is one tap away." : messages[noteIndex]}</div>
          <button className={styles.primary} onClick={drawNote}>{noteIndex === null ? "Find a little sunshine" : "One more little good thing"} <span aria-hidden="true">✦</span></button>
        </>}
      </section><footer className={styles.bottomNote}>{rival ? theme.footer : "Pocket Sunshine · MDCran"}</footer>
    </div>
  </main>;
}
