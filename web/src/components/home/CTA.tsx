"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, CheckCircle, Phone, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isValidEmail, isValidPhoneNumber } from "@/lib/contact-validation";
import type { SiteContentSectionIntro } from "@/lib/types";

type Mode = "email" | "sms" | "both";
type Status = "idle" | "sending" | "success" | "error";

export default function CTA({ content }: { content?: SiteContentSectionIntro }) {
  const [mode, setMode] = useState<Mode>("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const modeButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const modeDragPointerIdRef = useRef<number | null>(null);
  const modeDragStartRef = useRef<{ x: number; y: number } | null>(null);
  const modeDragActiveRef = useRef(false);
  const [modeHighlight, setModeHighlight] = useState({ left: 0, width: 0, ready: false });

  useEffect(() => {
    const modes: Mode[] = ["email", "sms", "both"];

    const syncHighlight = () => {
      const activeButton = modeButtonRefs.current[modes.indexOf(mode)];
      if (!activeButton) return;

      setModeHighlight({
        left: activeButton.offsetLeft,
        width: activeButton.offsetWidth,
        ready: true,
      });
    };

    const frame = window.requestAnimationFrame(syncHighlight);
    let resizeTimer: ReturnType<typeof setTimeout>;
    const debouncedSync = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(syncHighlight, 150); };
    window.addEventListener("resize", debouncedSync, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", debouncedSync);
    };
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!consent || !name.trim()) return;
    if (mode === "email" && !trimmedEmail) return;
    if (mode === "sms" && !trimmedPhone) return;
    if (mode === "both" && (!trimmedEmail || !trimmedPhone)) {
      setStatus("error");
      setMessage("Enter both a valid email address and phone number.");
      return;
    }
    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      setStatus("error");
      setMessage("Enter a valid email address.");
      return;
    }
    if (trimmedPhone && !isValidPhoneNumber(trimmedPhone)) {
      setStatus("error");
      setMessage("Enter a valid phone number.");
      return;
    }

    setMessage("");
    setStatus("sending");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: mode !== "sms" ? trimmedEmail : undefined,
          phone: mode !== "email" ? trimmedPhone : undefined,
          consent,
        }),
      });
      if (res.ok) {
        setStatus("success");
        setMessage("");
        setName("");
        setEmail("");
        setPhone("");
        setConsent(false);
      } else {
        const data = await res.json().catch(() => null) as { error?: string; message?: string } | null;
        setStatus("error");
        setMessage(data?.error || data?.message || "Unable to save your subscription.");
      }
    } catch {
      setStatus("error");
      setMessage("Unable to save your subscription.");
    }
  };

  const findModeButtonFromPoint = (clientX: number, clientY: number) => {
    const element = document.elementFromPoint(clientX, clientY);
    return (element as HTMLElement | null)?.closest<HTMLButtonElement>("[data-mode]") ?? null;
  };

  const updateModeFromPointerTarget = (target: EventTarget | null) => {
    const button = (target as HTMLElement | null)?.closest<HTMLButtonElement>("[data-mode]");
    const nextMode = button?.dataset.mode as Mode | undefined;
    if (nextMode) {
      setMode(nextMode);
    }
  };

  const updateModeFromPointerPosition = (clientX: number, clientY: number) => {
    const element = document.elementFromPoint(clientX, clientY);
    updateModeFromPointerTarget(element);
  };

  const title = content?.title ?? "Let's Build It Right";
  const titleWords = title.split(" ");
  const topLine = titleWords.length > 1 ? titleWords.slice(0, -1).join(" ") : title;
  const bottomLine = titleWords.length > 1 ? titleWords[titleWords.length - 1] : "";

  return (
    <section className="py-28 border-t border-white/6">
      <div className="content-container">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0 }}
          className="relative rounded-sm border border-[rgba(239,66,66,0.2)] bg-[rgba(239,66,66,0.04)] p-10 md:p-14 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[rgba(239,66,66,0.08)] via-transparent to-transparent pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-[var(--cranberry)] opacity-[0.07] rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-0 left-0 w-10 h-10 border-l border-t border-[rgba(239,66,66,0.5)]" />
          <div className="absolute top-0 right-0 w-10 h-10 border-r border-t border-[rgba(239,66,66,0.5)]" />
          <div className="absolute bottom-0 left-0 w-10 h-10 border-l border-b border-[rgba(239,66,66,0.5)]" />
          <div className="absolute bottom-0 right-0 w-10 h-10 border-r border-b border-[rgba(239,66,66,0.5)]" />

          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-sm border border-[rgba(239,66,66,0.3)] bg-[rgba(239,66,66,0.08)]">
                <span className="text-[var(--cranberry)] text-[10px] tracking-widest uppercase">
                  {content?.eyebrow ?? "Open for work"}
                </span>
              </div>

              <h2 className="font-nord text-3xl md:text-4xl text-white tracking-wider mb-3">
                {topLine}
              </h2>
              {bottomLine && (
                <h2 className="font-nord text-3xl md:text-4xl text-[var(--cranberry)] tracking-wider mb-6">
                  {bottomLine}
                </h2>
              )}

              <p className="text-sm text-white/40 leading-relaxed mb-8 max-w-sm">
                {content?.description ??
                  "Have a project in mind? Whether it's game development, a web application, custom software, or digital content, I'm ready to help bring it to life."}
              </p>

              <div className="flex items-center flex-wrap gap-4">
                <Button size="xl" asChild>
                  <Link href={content?.ctaHref ?? "/contact"} className="tracking-widest uppercase">
                    {content?.ctaLabel ?? "Contact Me"}
                  </Link>
                </Button>
              </div>
            </div>

            <div>
              <div className="mb-5">
                <p className="text-xs text-white/40 tracking-wider uppercase mb-1">Newsletter</p>
                <h3 className="font-nord text-lg text-white tracking-wide">Get Updates</h3>
              </div>

              {status === "success" ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-start gap-3 p-5 rounded-sm border border-green-500/25 bg-green-500/8"
                >
                  <CheckCircle size={18} className="text-green-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-green-300 font-medium">You&apos;re on the list!</p>
                  </div>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div
                    className="relative flex gap-1 p-1 rounded-sm bg-white/4 border border-white/8 w-fit"
                    onPointerDown={(e) => {
                      modeDragPointerIdRef.current = e.pointerId;
                      modeDragStartRef.current = { x: e.clientX, y: e.clientY };
                      modeDragActiveRef.current = false;
                    }}
                    onPointerMove={(e) => {
                      if (modeDragPointerIdRef.current !== e.pointerId) return;
                      const start = modeDragStartRef.current;
                      if (!start) return;
                      const deltaX = Math.abs(e.clientX - start.x);
                      const deltaY = Math.abs(e.clientY - start.y);
                      if (!modeDragActiveRef.current && deltaX < 6 && deltaY < 6) {
                        return;
                      }
                      modeDragActiveRef.current = true;
                      updateModeFromPointerPosition(e.clientX, e.clientY);
                    }}
                    onPointerUp={(e) => {
                      if (modeDragPointerIdRef.current !== e.pointerId) return;
                      if (modeDragActiveRef.current) {
                        const button = findModeButtonFromPoint(e.clientX, e.clientY);
                        if (button) {
                          updateModeFromPointerTarget(button);
                        }
                      }
                      modeDragPointerIdRef.current = null;
                      modeDragStartRef.current = null;
                      modeDragActiveRef.current = false;
                    }}
                    onPointerCancel={() => {
                      modeDragPointerIdRef.current = null;
                      modeDragStartRef.current = null;
                      modeDragActiveRef.current = false;
                    }}
                  >
                    <div
                      className={`pointer-events-none absolute inset-y-1 rounded-sm bg-[var(--cranberry)] shadow-[0_0_12px_rgba(239,66,66,0.3)] transition-all duration-300 ease-out ${
                        modeHighlight.ready ? "opacity-100" : "opacity-0"
                      }`}
                      style={{
                        left: `${modeHighlight.left}px`,
                        width: `${modeHighlight.width}px`,
                      }}
                    />
                    {(["email", "sms", "both"] as Mode[]).map((m) => (
                      <button
                        key={m}
                        data-mode={m}
                        ref={(node) => {
                          const modes: Mode[] = ["email", "sms", "both"];
                          modeButtonRefs.current[modes.indexOf(m)] = node;
                        }}
                        type="button"
                        onClick={() => setMode(m)}
                        className="relative z-10 px-3 py-1.5 rounded-sm text-[11px] tracking-wider uppercase transition-colors duration-200"
                        style={{
                          color: mode === m
                            ? '#fff'
                            : 'color-mix(in srgb, var(--theme-text, #fff) 40%, transparent)',
                        }}
                      >
                        {m === "both" ? "Email + SMS" : m === "email" ? "Email" : "SMS"}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    aria-label="Your name"
                    className="w-full h-10 bg-white/4 border border-white/8 focus:border-[var(--cranberry)] rounded-sm px-3.5 text-sm text-white placeholder:text-white/25 outline-none transition-colors"
                  />

                  {(mode === "email" || mode === "both") && (
                    <div className="relative">
                      <Mail size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        aria-label="Email address"
                        className="w-full h-10 bg-white/4 border border-white/8 focus:border-[var(--cranberry)] rounded-sm pl-9 pr-3.5 text-sm text-white placeholder:text-white/25 outline-none transition-colors"
                      />
                    </div>
                  )}

                  {(mode === "sms" || mode === "both") && (
                    <div className="relative">
                      <Phone size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        aria-label="Phone number"
                        className="w-full h-10 bg-white/4 border border-white/8 focus:border-[var(--cranberry)] rounded-sm pl-9 pr-3.5 text-sm text-white placeholder:text-white/25 outline-none transition-colors"
                      />
                    </div>
                  )}

                  <label className="flex items-start gap-2.5 cursor-pointer group">
                    <div className="relative shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        required
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        className="sr-only"
                      />
                      <div
                        className={`w-4 h-4 rounded-sm border transition-all duration-150 flex items-center justify-center ${
                          consent
                            ? "bg-[var(--cranberry)] border-[var(--cranberry)]"
                            : "bg-white/4 border-white/15 group-hover:border-white/30"
                        }`}
                      >
                        {consent && (
                          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                            <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] text-white/35 leading-relaxed">
                      By subscribing, you agree to our{" "}
                      <a
                        href="/terms"
                        onClick={(e) => e.stopPropagation()}
                        className="text-white/55 hover:text-white underline underline-offset-2 transition-colors"
                      >
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a
                        href="/privacy"
                        onClick={(e) => e.stopPropagation()}
                        className="text-white/55 hover:text-white underline underline-offset-2 transition-colors"
                      >
                        Privacy Policy
                      </a>
                      . You may unsubscribe at any time.
                    </span>
                  </label>

                  {status === "error" && (
                    <div className="flex items-center gap-2 text-xs text-[#ef8a8a]">
                      <AlertCircle size={13} />
                      <span>{message}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={status === "sending" || !consent}
                    className="w-full h-10 flex items-center justify-center gap-2 bg-[var(--cranberry)] text-white text-xs tracking-widest uppercase rounded-sm hover:bg-[#dd3030] transition-all shadow-[0_0_16px_rgba(239,66,66,0.25)] hover:shadow-[0_0_24px_rgba(239,66,66,0.4)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    {status === "sending" ? "Subscribing..." : "Subscribe"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
