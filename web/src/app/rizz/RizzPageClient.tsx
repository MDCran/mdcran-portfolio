"use client";

import { useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { computeFingerprint } from "@/lib/device-fingerprint";


/* ── Floating Hearts Background ────────────────────────── */
// Stable values to avoid SSR/client hydration mismatch
const HEARTS = [
  { id: 0, left: "3%", delay: 0.2, duration: 12, size: 20, opacity: 0.35, drift: 22 },
  { id: 1, left: "12%", delay: 2.8, duration: 14, size: 28, opacity: 0.25, drift: -18 },
  { id: 2, left: "20%", delay: 5.5, duration: 10, size: 16, opacity: 0.40, drift: 30 },
  { id: 3, left: "28%", delay: 1.0, duration: 16, size: 22, opacity: 0.30, drift: -24 },
  { id: 4, left: "36%", delay: 4.2, duration: 11, size: 18, opacity: 0.35, drift: 14 },
  { id: 5, left: "44%", delay: 6.8, duration: 13, size: 24, opacity: 0.28, drift: -20 },
  { id: 6, left: "50%", delay: 2.0, duration: 15, size: 32, opacity: 0.20, drift: 16 },
  { id: 7, left: "58%", delay: 5.0, duration: 9, size: 20, opacity: 0.38, drift: -14 },
  { id: 8, left: "66%", delay: 0.5, duration: 17, size: 14, opacity: 0.45, drift: 26 },
  { id: 9, left: "74%", delay: 3.5, duration: 12, size: 26, opacity: 0.30, drift: -22 },
  { id: 10, left: "82%", delay: 6.0, duration: 14, size: 18, opacity: 0.38, drift: 18 },
  { id: 11, left: "92%", delay: 0.8, duration: 11, size: 30, opacity: 0.22, drift: -16 },
  { id: 12, left: "7%", delay: 3.8, duration: 13, size: 22, opacity: 0.32, drift: 20 },
  { id: 13, left: "33%", delay: 7.2, duration: 10, size: 16, opacity: 0.42, drift: -28 },
  { id: 14, left: "55%", delay: 1.5, duration: 16, size: 20, opacity: 0.30, drift: 12 },
  { id: 15, left: "70%", delay: 4.5, duration: 9, size: 24, opacity: 0.35, drift: -18 },
  { id: 16, left: "16%", delay: 0.3, duration: 15, size: 34, opacity: 0.18, drift: 22 },
  { id: 17, left: "88%", delay: 3.0, duration: 12, size: 20, opacity: 0.35, drift: -20 },
  { id: 18, left: "42%", delay: 5.8, duration: 11, size: 26, opacity: 0.28, drift: 24 },
  { id: 19, left: "60%", delay: 2.5, duration: 14, size: 18, opacity: 0.40, drift: -15 },
  { id: 20, left: "25%", delay: 7.0, duration: 10, size: 22, opacity: 0.32, drift: 28 },
  { id: 21, left: "78%", delay: 1.2, duration: 13, size: 28, opacity: 0.25, drift: -22 },
  { id: 22, left: "48%", delay: 4.0, duration: 12, size: 16, opacity: 0.45, drift: 18 },
  { id: 23, left: "95%", delay: 6.5, duration: 15, size: 20, opacity: 0.30, drift: -12 },
];

function FloatingHearts() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {HEARTS.map((h) => (
        <motion.div
          key={h.id}
          className="absolute"
          style={{ left: h.left, bottom: "-30px", fontSize: `${h.size}px`, opacity: 0 }}
          animate={{
            y: [0, -900],
            x: [0, h.drift, h.drift * 0.5],
            opacity: [0, h.opacity, h.opacity, 0],
            rotate: [0, h.drift > 0 ? 15 : -15, 0],
          }}
          transition={{
            duration: h.duration,
            delay: h.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" style={{ color: "#ef4242" }}>
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </motion.div>
      ))}
    </div>
  );
}

type DateIdeaOption = {
  value: "fancy-dinner-date" | "spontaneous-adventure" | "food-and-walking" | "coffee-and-talking" | "surprise-me";
  label: string;
};

type VibeOption = {
  value: "chill-and-cozy" | "fun-and-chaotic" | "romantic-and-cute" | "adventurous";
  label: string;
};

type ActivityOption = {
  value: "ice-cream-date" | "night-drive" | "movie-night" | "arcade" | "disney-fireworks" | "surprise-me";
  label: string;
};

type WinOverOption = {
  value: "food" | "attention" | "effort" | "making-me-laugh" | "being-sweet" | "consistency" | "touch" | "other";
  label: string;
};

const dateIdeas: DateIdeaOption[] = [
  { value: "fancy-dinner-date", label: "Fancy Dinner Date" },
  { value: "spontaneous-adventure", label: "Spontaneous Adventure" },
  { value: "food-and-walking", label: "Food + Walking" },
  { value: "coffee-and-talking", label: "Coffee + Talking" },
  { value: "surprise-me", label: "Surprise Me" },
];

const vibes: VibeOption[] = [
  { value: "chill-and-cozy", label: "Chill and Cozy" },
  { value: "fun-and-chaotic", label: "Fun and Chaotic" },
  { value: "romantic-and-cute", label: "Romantic and Cute" },
  { value: "adventurous", label: "Adventurous" },
];

const activities: ActivityOption[] = [
  { value: "ice-cream-date", label: "Ice Cream Date" },
  { value: "night-drive", label: "Night Drive" },
  { value: "movie-night", label: "Movie Night" },
  { value: "arcade", label: "Arcade" },
  { value: "disney-fireworks", label: "Disney Fireworks" },
  { value: "surprise-me", label: "Surprise Me" },
];

const winOverOptions: WinOverOption[] = [
  { value: "food", label: "Food" },
  { value: "attention", label: "Attention" },
  { value: "effort", label: "Effort" },
  { value: "making-me-laugh", label: "Making Me Laugh" },
  { value: "being-sweet", label: "Being Sweet" },
  { value: "consistency", label: "Consistency" },
  { value: "touch", label: "Touch" },
  { value: "other", label: "Other" },
];

const noMessages = [
  "Wait... that wasn't a real no, right? Try again.",
  "Hmm, pretty sure your finger slipped. One more try.",
  "The yes button is literally right there. So close.",
  "Bold move. But I believe in second chances.",
  "I'm not mad. Just disappointed. And persistent.",
  "That no was giving 'playing hard to get' energy.",
  "I'll pretend I didn't see that. Go ahead.",
  "My heart just did a little crack sound effect.",
  "You sure? Because yes comes with snacks.",
  "I refuse to believe that was your final answer.",
];

const absoluteNoPositions = [
  { top: "10%", left: "62%" },
  { top: "56%", left: "6%" },
  { top: "52%", left: "66%" },
  { top: "2%", left: "18%" },
];

function ChoiceGroup<T extends string>({
  label,
  options,
  values,
  onToggle,
}: {
  label: string;
  options: { value: T; label: string }[];
  values: T[];
  onToggle: (next: T) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] tracking-[0.24em] uppercase text-white/45">{label}</p>
        <span className="text-[10px] text-white/25">Multi-select</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const active = values.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              className={`rounded-sm border px-4 py-3 text-left text-sm transition-all ${
                active
                  ? "border-[#ef4242]/60 bg-[#ef4242]/12 text-white shadow-[0_0_20px_rgba(239,66,66,0.12)]"
                  : "border-white/10 bg-white/[0.02] text-white/65 hover:border-white/20 hover:text-white"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const QUESTION_STEPS = [
  "Your Name",
  "Your Phone",
  "Nickname",
  "Date Type",
  "Vibe",
  "Activity",
  "Win You Over",
] as const;

/** Format a phone number nicely as the user types — US style (XXX) XXX-XXXX with
 *  an optional +1, and a graceful + prefix for international numbers. */
function formatPhone(input: string): string {
  const startsPlus = input.trimStart().startsWith("+");
  const digits = input.replace(/\D/g, "");
  if (!digits) return startsPlus ? "+" : "";
  // Explicit international (+) or longer-than-US → just keep a clean + prefix.
  if (startsPlus || digits.length > 11) return "+" + digits;

  let n = digits;
  let cc = "";
  if (n.length === 11 && n[0] === "1") { cc = "+1 "; n = n.slice(1); }
  const a = n.slice(0, 3), b = n.slice(3, 6), c = n.slice(6, 10);
  if (n.length <= 3) return cc ? `${cc}(${a}` : a;
  if (n.length <= 6) return `${cc}(${a}) ${b}`;
  return `${cc}(${a}) ${b}-${c}`;
}

function isValidPhoneNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (!/^\+?[\d\s().-]+$/.test(trimmed)) return false;

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  return true;
}

export default function RizzPageClient({ targetName }: { targetName?: string }) {
  const router = useRouter();
  const [stage, setStage] = useState<"pitch" | "form" | "success">("pitch");
  const [formStep, setFormStep] = useState(0);
  const [noClicks, setNoClicks] = useState(0);
  const [pitchMessage, setPitchMessage] = useState(
    targetName
      ? `${targetName}, I made a whole page just to ask you out. That's either romantic or unhinged. Probably both.`
      : "I made a whole page just to ask you out. That's either romantic or unhinged. Probably both."
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    nickname: "",
    phone: "",
    dateIdeas: [] as DateIdeaOption["value"][],
    vibes: [] as VibeOption["value"][],
    activities: [] as ActivityOption["value"][],
    winOvers: [] as WinOverOption["value"][],
    winOverOther: "",
  });

  const prankMode = noClicks % 6;
  const noIsAbsolute = prankMode >= 3;
  const noAbsolutePos = absoluteNoPositions[(noClicks - 3 + absoluteNoPositions.length) % absoluteNoPositions.length];

  const yesButtonClass = useMemo(() => {
    if (prankMode === 1) return "scale-[1.08]";
    if (prankMode === 4) return "scale-[1.14]";
    if (prankMode === 5) return "scale-[1.18]";
    return "scale-100";
  }, [prankMode]);

  const pitchShake =
    noClicks >= 2
      ? {
          x: [0, -4, 4, -3, 3, -2, 2, 0],
          y: [0, 2, -2, 2, -1, 1, 0],
        }
      : undefined;

  const yesGlowStyle = useMemo(() => {
    if (noClicks <= 0) {
      return undefined;
    }

    const intensity = Math.min(noClicks, 6);
    const outer = 28 + intensity * 10;
    const inner = 12 + intensity * 4;

    return {
      boxShadow: `0 0 ${inner}px rgba(239,66,66,0.35), 0 0 ${outer}px rgba(239,66,66,0.32), 0 0 ${outer + 18}px rgba(239,66,66,0.18)`,
    };
  }, [noClicks]);

  const panicOverlayOpacity = Math.min(noClicks * 0.045, 0.24);
  const pitchAnimate = pitchShake ? { opacity: 1, ...pitchShake } : { opacity: 1, y: 0 };
  const pitchTransition = { duration: 0.35 };

  function handleNoClick() {
    setNoClicks((current) => {
      const next = current + 1;
      setPitchMessage(noMessages[(next - 1) % noMessages.length]);
      return next;
    });
  }

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setError("");
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleSelection<
    K extends "dateIdeas" | "vibes" | "activities" | "winOvers",
    V extends (typeof form)[K] extends Array<infer U> ? U : never,
  >(key: K, value: V) {
    setError("");
    setForm((prev) => {
      const current = prev[key] as V[];
      const next = current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value];

      return {
        ...prev,
        [key]: next,
      };
    });
  }

  function validateStep(step: number): string | null {
    if (step === 0) {
      if (!form.name.trim()) {
        return "Your name is required.";
      }
      return null;
    }

    if (step === 1) {
      if (!form.phone.trim()) {
        return "Your phone number is required.";
      }
      if (!isValidPhoneNumber(form.phone)) {
        return "Enter a real phone number.";
      }
      return null;
    }

    if (step === 3 && form.dateIdeas.length === 0) {
      return "Pick at least one date type.";
    }

    if (step === 4 && form.vibes.length === 0) {
      return "Pick at least one vibe.";
    }

    if (step === 5 && form.activities.length === 0) {
      return "Pick at least one activity.";
    }

    if (step === 6) {
      if (form.winOvers.length === 0) {
        return "Pick at least one answer.";
      }
      if (form.winOvers.includes("other") && !form.winOverOther.trim()) {
        return "Tell me what wins you over.";
      }
    }

    return null;
  }

  function handleNextStep() {
    const nextError = validateStep(formStep);
    if (nextError) {
      setError(nextError);
      return;
    }

    setError("");
    setFormStep((current) => Math.min(current + 1, QUESTION_STEPS.length - 1));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (formStep < QUESTION_STEPS.length - 1) {
      handleNextStep();
      return;
    }

    const nextError = validateStep(formStep);
    if (nextError) {
      setError(nextError);
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      // serial is non-essential metadata — a fingerprint failure must not block the submit.
      const fp = await computeFingerprint().catch(() => null);
      const response = await fetch("/api/rizz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          nickname: form.nickname.trim(),
          phone: form.phone.trim(),
          dateIdeas: form.dateIdeas,
          vibes: form.vibes,
          activities: form.activities,
          winOvers: form.winOvers,
          winOverOther: form.winOverOther.trim() || undefined,
          serial: fp?.serial,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Request failed");
      }

      setStage("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const progress = ((formStep + 1) / QUESTION_STEPS.length) * 100;
  const isOptionalStep = formStep === 2;


  return (
    <main className="min-h-screen">
      <section className="relative overflow-hidden border-b border-white/6">
        <FloatingHearts />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(239,66,66,0.2),transparent_38%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02),transparent_42%)]" />
        <div className="content-container relative py-16 sm:py-20 md:py-24">
          <AnimatePresence mode="wait">
            {stage === "pitch" && (
              <motion.div
                key="pitch"
                initial={{ opacity: 0, y: 16 }}
                animate={pitchAnimate}
                exit={{ opacity: 0, y: -12 }}
                transition={pitchTransition}
                className="mx-auto max-w-5xl"
              >
                <div className="grid gap-6 lg:gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                  <div className="order-2 lg:order-1">
                    <p className="mb-4 flex items-center gap-2 text-[11px] tracking-[0.28em] uppercase text-[#ef4242]">
                      <motion.span
                        animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                      >
                        <Sparkles size={14} />
                      </motion.span>
                      Rizz Protocol
                    </p>
                    <h1 className="font-nord text-4xl leading-tight text-white sm:text-5xl md:text-6xl">
                      {targetName ? (
                        <>{targetName}, wanna go on a date with me?</>
                      ) : (
                        <>Wanna go on a date with me?</>
                      )}
                    </h1>
                    <p className="mt-3 text-sm text-white/40 sm:text-base">
                      {targetName
                        ? `Made this just for you. No pressure... but also yes pressure.`
                        : `A deeply unserious but very sincere proposal.`
                      }
                    </p>

                    <div className="mt-8 relative min-h-[164px] rounded-sm border border-white/8 bg-black/35 p-4 sm:p-5">
                      <div
                        className="absolute inset-0 rounded-sm transition-opacity duration-300"
                        style={{
                          background: "radial-gradient(circle at center, rgba(239,66,66,0.18), transparent 62%)",
                          opacity: panicOverlayOpacity,
                        }}
                      />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,66,66,0.08),transparent_42%)]" />
                      <div className="relative flex h-full flex-col justify-center">
                        <p className="mb-4 text-[11px] tracking-[0.22em] uppercase text-white/35">
                          Choose Carefully
                        </p>
                        <div className="mb-4 min-h-[24px] text-sm text-white/60 sm:text-[15px]">
                          {pitchMessage}
                        </div>
                        <div
                          className={`relative min-h-[92px] ${!noIsAbsolute ? "flex flex-wrap items-center gap-3" : ""} ${
                            prankMode === 2 ? "flex-row-reverse" : ""
                          }`}
                        >
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.96 }}
                            className={`inline-flex h-12 items-center justify-center rounded-sm bg-[#ef4242] px-8 text-[11px] font-medium uppercase tracking-[0.25em] text-white shadow-[0_0_26px_rgba(239,66,66,0.28)] transition-transform ${yesButtonClass}`}
                            style={yesGlowStyle}
                            onClick={() => {
                              setStage("form");
                              setFormStep(0);
                              setError("");
                            }}
                          >
                            Yes
                          </motion.button>

                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.96 }}
                            className={`inline-flex h-12 items-center justify-center rounded-sm border border-white/12 bg-white/[0.03] px-7 text-[11px] font-medium uppercase tracking-[0.25em] text-white/60 transition-all hover:border-white/20 hover:text-white ${
                              prankMode === 2 ? "scale-[0.82]" : "scale-100"
                            } ${noIsAbsolute ? "absolute" : ""}`}
                            style={
                              noIsAbsolute
                                ? {
                                    top: noAbsolutePos.top,
                                    left: noAbsolutePos.left,
                                  }
                                : undefined
                            }
                            onClick={handleNoClick}
                          >
                            No
                          </motion.button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 inline-flex items-center gap-2 text-[11px] text-white/24">
                      <ChevronDown size={14} className="text-[#ef4242]" />
                      The page is heavily biased toward yes.
                    </div>
                  </div>

                  <div className="order-1 rounded-sm border border-white/8 bg-black/30 p-3 shadow-[0_0_40px_rgba(0,0,0,0.24)] lg:order-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/rizz-love.gif"
                      alt="Love GIF"
                      className="h-auto w-full rounded-sm"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {stage === "form" && (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
                className="relative mx-auto max-w-2xl overflow-hidden rounded-sm border border-white/8 bg-black/35 p-4 pt-6 sm:p-6 sm:pt-8 md:p-7 md:pt-9"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-white/8">
                  <div
                    className="h-full bg-[#ef4242] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mb-6 flex flex-col gap-3">
                  <div>
                    <p className="text-[11px] tracking-[0.24em] uppercase text-[#ef4242]">
                      {targetName ? `Locked In, ${targetName}` : "Locked In"}
                    </p>
                    <h2 className="mt-2 font-nord text-2xl text-white sm:text-3xl">{QUESTION_STEPS[formStep]}</h2>
                  </div>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                  {formStep === 0 && (
                    <label className="space-y-2 block">
                      <span className="text-[11px] tracking-[0.24em] uppercase text-white/45">Name</span>
                      <input
                        className="h-11 w-full rounded-sm border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#ef4242]"
                        value={form.name}
                        onChange={(event) => updateField("name", event.target.value)}
                        placeholder="Your actual government name..."
                      />
                    </label>
                  )}

                  {formStep === 1 && (
                    <label className="space-y-2 block">
                      <span className="text-[11px] tracking-[0.24em] uppercase text-white/45">Phone Number</span>
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        className="h-11 w-full rounded-sm border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#ef4242]"
                        value={form.phone}
                        onChange={(event) => updateField("phone", formatPhone(event.target.value))}
                        placeholder="(555) 123-4567"
                      />
                    </label>
                  )}

                  {formStep === 2 && (
                    <div className="space-y-4">
                      <label className="space-y-2 block">
                        <span className="text-[11px] tracking-[0.24em] uppercase text-white/45">Nickname</span>
                        <input
                          className="h-11 w-full rounded-sm border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#ef4242]"
                          value={form.nickname}
                          onChange={(event) => updateField("nickname", event.target.value)}
                          placeholder="What you actually like being called"
                        />
                      </label>
                      <p className="text-xs text-white/30">Optional. You can skip this one.</p>
                    </div>
                  )}

                  {formStep === 3 && (
                    <ChoiceGroup
                      label="What kind of date sounds good?"
                      options={dateIdeas}
                      values={form.dateIdeas}
                      onToggle={(value) => toggleSelection("dateIdeas", value)}
                    />
                  )}

                  {formStep === 4 && (
                    <ChoiceGroup
                      label="Pick the vibe"
                      options={vibes}
                      values={form.vibes}
                      onToggle={(value) => toggleSelection("vibes", value)}
                    />
                  )}

                  {formStep === 5 && (
                    <ChoiceGroup
                      label="Pick the move"
                      options={activities}
                      values={form.activities}
                      onToggle={(value) => toggleSelection("activities", value)}
                    />
                  )}

                  {formStep === 6 && (
                    <div className="space-y-4">
                      <ChoiceGroup
                        label="Fastest way to win you over"
                        options={winOverOptions}
                        values={form.winOvers}
                        onToggle={(value) => toggleSelection("winOvers", value)}
                      />

                      {form.winOvers.includes("other") && (
                        <label className="space-y-2 block">
                          <span className="text-[11px] tracking-[0.24em] uppercase text-white/45">What Should I Know?</span>
                          <input
                            className="h-11 w-full rounded-sm border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#ef4242]"
                            value={form.winOverOther}
                            onChange={(event) => updateField("winOverOther", event.target.value)}
                            placeholder="Type your answer"
                          />
                        </label>
                      )}
                    </div>
                  )}

                  {error && <p className="text-sm text-[#ef4242]">{error}</p>}

                  <div className="relative flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        setFormStep((current) => Math.max(current - 1, 0));
                      }}
                      disabled={formStep === 0}
                      className="inline-flex h-11 cursor-pointer items-center justify-center rounded-sm border border-white/10 px-5 text-[11px] uppercase tracking-[0.2em] text-white/55 transition-colors hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      Previous
                    </button>

                    {formStep < QUESTION_STEPS.length - 1 ? (
                      <div className="flex items-center gap-3">
                        {isOptionalStep && (
                          <button
                            type="button"
                            onClick={() => {
                              setError("");
                              setFormStep((current) => Math.min(current + 1, QUESTION_STEPS.length - 1));
                            }}
                            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-sm border border-white/10 px-5 text-[11px] uppercase tracking-[0.2em] text-white/55 transition-colors hover:border-white/20 hover:text-white"
                          >
                            Skip
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleNextStep}
                          className="inline-flex h-11 cursor-pointer items-center justify-center rounded-sm bg-[#ef4242] px-6 text-[11px] font-medium uppercase tracking-[0.25em] text-white transition-colors hover:bg-[#db3535]"
                        >
                          Next
                        </button>
                      </div>
                    ) : (
                      <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex h-11 items-center justify-center rounded-sm bg-[#ef4242] px-6 text-[11px] font-medium uppercase tracking-[0.25em] text-white transition-colors hover:bg-[#db3535] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {submitting ? "Submitting..." : "Lock It In"}
                      </button>
                    )}
                  </div>
                </form>
              </motion.div>
            )}

            {stage === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="mx-auto max-w-3xl rounded-sm border border-white/8 bg-black/35 px-6 py-14 text-center shadow-[0_0_50px_rgba(0,0,0,0.18)]"
              >
                <div className="mx-auto max-w-md rounded-sm border border-white/10 bg-black/20 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/rizz-date.gif"
                    alt="It's a date GIF"
                    className="h-auto w-full rounded-sm"
                  />
                </div>
                <h2 className="mt-3 font-nord text-3xl text-white sm:text-4xl">
                  {targetName ? `It's a date, ${targetName}!` : "Mission Complete!"}
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/55">
                  {targetName
                    ? `I officially have no excuse to mess this up now. See you soon, ${targetName}.`
                    : "I officially have no excuse to mess this up now."
                  }
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="mx-auto mt-7 inline-flex h-11 items-center justify-center rounded-sm bg-[#ef4242] px-6 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  Go to Home Page
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
}
