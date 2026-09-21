"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Heart, Sparkles, Check } from "lucide-react";
import { computeFingerprint } from "@/lib/device-fingerprint";
import { allOptions, answerKeys, getOptions, getRizzConfig, questionLabels, rizzThemes, validateRizzAnswers, type AnswerKey, type RizzAnswers, type RizzConfig } from "@/lib/rizz";
import styles from "./rizz.module.css";

const steps = ["Hello, you", ...answerKeys.map(key => questionLabels[key]), "Your little plan"];

export function RizzCard({ targetName, config }: { targetName?: string; config: RizzConfig }) {
  const theme = rizzThemes[config.theme];
  return <div className={styles.collectible}>
    <div className={styles.cardTop}><span>ONE OF A KIND</span><span>♡ ∞</span></div>
    <div className={styles.cardArt} aria-hidden="true">
      <div className={styles.orbit} /><div className={styles.orbitTwo} />
      <span className={styles.starOne}>✧</span><span className={styles.starTwo}>✦</span>
      {config.theme === "pokemon" ? <div className={styles.captureBall}><span /></div> : <span className={styles.bigSymbol}>{theme.icon}</span>}
      <span className={styles.artCaption}>better together</span>
    </div>
    <div className={styles.cardBody}>
      <div className={styles.cardLabel}>{theme.card}</div><h2>{targetName || "You, obviously."}</h2>
      <div className={styles.cardMove}><span aria-hidden="true">{theme.icon}</span><div><strong>{theme.move}</strong><p>Super effective against a boring evening.</p></div></div>
      <div className={styles.cardBottom}><span>RARITY: IRREPLACEABLE</span><span>001 / 001</span></div>
    </div>
  </div>;
}

export default function RizzPageClient({ targetName, config = getRizzConfig({}) }: { targetName?: string; config?: RizzConfig }) {
  const theme = rizzThemes[config.theme];
  const [stage, setStage] = useState<"pitch" | "form" | "success" | "declined">("pitch");
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const submitLock = useRef(false);
  const [form, setForm] = useState<RizzAnswers>({ name: targetName || "", phone: "", nickname: "", dateIdeas: [], vibes: [], activities: [], winOvers: [], customAnswers: { dateIdeas: "", vibes: "", activities: "", winOvers: "" } });
  useEffect(() => {
    if (stage !== "pitch") {
      heading.current?.focus({ preventScroll: true });
      heading.current?.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [stage, step]);
  function updateField(key: "name" | "nickname" | "phone", value: string) {
    setError(""); setForm(previous => ({ ...previous, [key]: value }));
  }
  function toggle(key: AnswerKey, value: string) {
    setError(""); setForm(previous => ({ ...previous, [key]: previous[key].includes(value) ? previous[key].filter(item => item !== value) : [...previous[key], value] }));
  }
  function writeAnswer(key: AnswerKey, value: string) {
    setError(""); setForm(previous => ({ ...previous, customAnswers: { ...previous.customAnswers, [key]: value } }));
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current) return;
    const validation = validateRizzAnswers(form, config, step === 5 ? undefined : step);
    if (validation) { setError(validation); return; }
    if (step < 5) { setError(""); setStep(step + 1); return; }
    submitLock.current = true; setSubmitting(true); setError("");
    try {
      // Identity metadata must never hold up a date invitation.
      const fingerprint = await Promise.race([computeFingerprint().catch(() => null), new Promise<null>(resolve => setTimeout(() => resolve(null), 1500))]);
      const response = await fetch("/api/rizz", { method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(20000), body: JSON.stringify({ ...form, serial: fingerprint?.serial }) });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Couldn't send your plan. Your answers are still here—try again.");
      }
      setStage("success");
    } catch (err) {
      setError(err instanceof Error && err.name !== "TimeoutError" ? err.message : "That took too long. Your answers are still here—try again.");
    } finally { submitLock.current = false; setSubmitting(false); }
  }
  const key = step > 0 && step < 5 ? answerKeys[step - 1] : null;
  return <main className={styles.page} data-theme={config.theme} style={{ "--rizz-accent": theme.accent } as CSSProperties}>
    <div className={styles.shell}>
      <header className={styles.topline}><Link href="/" className={styles.homeLink}><ArrowLeft size={14} /> Back to the world</Link><span><Heart size={13} /> made for {targetName || "you"}</span></header>
      {stage === "pitch" && <div className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><Sparkles size={14} /> {theme.tag}</p><h1>{theme.title}</h1>
          <p className={styles.intro}>{targetName && <strong>{targetName}, </strong>}{theme.description}</p>
          <div className={styles.heroActions}><button className={styles.primary} onClick={() => setStage("form")}>I&apos;m in. Let&apos;s make a plan <ArrowRight size={17} /></button><button className={styles.quiet} onClick={() => setStage("declined")}>Maybe another time</button></div>
          <p className={styles.smallNote}>A few little questions. A plan that feels like you.</p>
        </div>
        <div className={styles.cardWrap}><RizzCard targetName={targetName} config={config} /><p className={styles.cardFootnote}>a very rare pull, if you ask me.</p></div>
        <div className={styles.heroFooter}><span>01 / AN INVITATION, JUST FOR YOU</span><span>Good company &gt; perfect plans</span></div>
      </div>}
      {stage === "form" && <section className={styles.formPanel}>
        <div className={styles.formMeta}><span>{theme.icon} A PLAN FOR TWO</span><span>Step {step + 1} of {steps.length}</span></div>
        <div className={styles.progress} role="progressbar" aria-label="Your plan progress" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={step + 1}>{steps.map((label, index) => <span key={label} data-complete={index <= step} />)}</div>
        <h1 className={styles.stepTitle} ref={heading} tabIndex={-1}>{steps[step]}</h1>
        <p className={styles.stepHint}>{step === 0 ? "What should I call you, and where can I reach you?" : step === 5 ? "Looks like our kind of good time. Give it one last look." : `Pick as many as you like${key && config.allowCustomAnswers[key] ? ", or tell me in your own words" : ""}.`}</p>
        <form onSubmit={handleSubmit} noValidate><fieldset className={styles.fields} disabled={submitting}>
          <legend className={styles.srOnly}>{steps[step]}</legend>
          {step === 0 && <div className={styles.contactFields}>
            <label>Your name<input autoComplete="given-name" maxLength={100} value={form.name} onChange={event => updateField("name", event.target.value)} placeholder="The name you go by" required /></label>
            <label>Phone number<input type="tel" inputMode="tel" autoComplete="tel" maxLength={30} value={form.phone} onChange={event => updateField("phone", event.target.value)} placeholder="Include your country code if needed" required /><span className={styles.fieldNote}>So I can follow up and make plans with you.</span></label>
            <label>Nickname <span className={styles.optional}>(optional)</span><input autoComplete="nickname" maxLength={100} value={form.nickname} onChange={event => updateField("nickname", event.target.value)} placeholder="Bonus points for an inside joke" /></label>
          </div>}
          {key && <div className={styles.question}>
            {config.setting !== "any" && (key === "dateIdeas" || key === "activities") && <p className={styles.preference}>{config.setting === "indoors" ? "☾ Keeping it cozy indoors" : "☀ A little time outside"}</p>}
            <div className={styles.choices}>{getOptions(key, config).map(option => <button type="button" key={option.value} aria-pressed={form[key].includes(option.value)} className={styles.choice} onClick={() => toggle(key, option.value)}><span className={styles.choiceIcon} aria-hidden="true">{option.icon}</span><span>{option.label}</span><span className={styles.check}>{form[key].includes(option.value) && <Check size={13} />}</span></button>)}</div>
            {config.allowCustomAnswers[key] && <label className={styles.customAnswer}>Your own answer <span className={styles.optional}>(instead of, or as well as, a pick)</span><textarea maxLength={300} rows={3} value={form.customAnswers[key]} onChange={event => writeAnswer(key, event.target.value)} placeholder={key === "activities" ? "A favorite game? A place you've wanted to try?" : "Tell me what feels like you…"} /><span className={styles.fieldNote}>{form.customAnswers[key].length}/300</span></label>}
          </div>}
          {step === 5 && <div className={styles.review}>
            <div className={styles.reviewRow}><div><span>The lovely human</span><p>{form.name}{form.nickname && ` (${form.nickname})`}</p><p>{form.phone}</p></div><button type="button" onClick={() => { setStep(0); setError(""); }} aria-label="Edit contact details">Edit</button></div>
            {answerKeys.map((answerKey, index) => <div className={styles.reviewRow} key={answerKey}><div><span>{questionLabels[answerKey]}</span><p>{form[answerKey].map(value => allOptions[answerKey].find(option => option.value === value)?.label).join(" · ")}</p>{form.customAnswers[answerKey].trim() && <p className={styles.written}>{form.customAnswers[answerKey]}</p>}</div><button type="button" onClick={() => { setStep(index + 1); setError(""); }} aria-label={`Edit ${questionLabels[answerKey]}`}>Edit</button></div>)}
          </div>}
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.formActions}><button className={styles.back} type="button" onClick={() => { setError(""); if (step === 0) setStage("pitch"); else setStep(step - 1); }}><ArrowLeft size={16} /><span>Back</span></button><button className={styles.primary} type="submit">{submitting ? "Sending your plan…" : step === 5 ? "Send my little plan" : "Continue"}{!submitting && (step === 5 ? <Heart size={16} /> : <ArrowRight size={16} />)}</button></div>
        </fieldset></form>
      </section>}
      {(stage === "success" || stage === "declined") && <section className={styles.finish}>
        <div className={styles.finishIcon} aria-hidden="true">{stage === "success" ? theme.icon : "♡"}</div><p className={styles.eyebrow}>{stage === "success" ? "INVITATION ACCEPTED" : "ALL GOOD, PROMISE"}</p>
        <h1 ref={heading} tabIndex={-1}>{stage === "success" ? config.theme === "pokemon" ? "It's a date. Bring your best deck." : "Well, now I'm smiling." : "Another time is okay."}</h1>
        <p>{stage === "success" ? "Your answers are sent. I'll be in touch to turn our little plan into a real one." : "Thanks for stopping by this little corner of the internet. No pressure, just a little affection."}</p>
        {stage === "declined" && <button className={styles.primary} onClick={() => setStage("pitch")}>Back to the invitation <ArrowRight size={16} /></button>}<Link className={styles.quiet} href="/">Back to the world</Link>
      </section>}
      <footer className={styles.bottomNote}>handmade invitation · very real feelings</footer>
    </div>
  </main>;
}
