"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Send, CheckCircle, Loader2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

type Mode = "email" | "sms" | "both";
type Status = "idle" | "sending" | "success" | "error";

export default function CTA() {
  const [mode, setMode] = useState<Mode>("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent || !name) return;
    if (mode === "email" && !email) return;
    if (mode === "sms" && !phone) return;
    if (mode === "both" && (!email || !phone)) return;

    setStatus("sending");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: mode !== "sms" ? email : undefined,
          phone: mode !== "email" ? phone : undefined,
          consent,
        }),
      });
      if (res.ok) {
        setStatus("success");
        setName(""); setEmail(""); setPhone(""); setConsent(false);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <section className="py-28 border-t border-white/6">
      <div className="content-container">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0 }}
          className="relative rounded-sm border border-[rgba(239,66,66,0.2)] bg-[rgba(239,66,66,0.04)] p-10 md:p-14 overflow-hidden"
        >
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-[rgba(239,66,66,0.08)] via-transparent to-transparent pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-[#ef4242] opacity-[0.07] rounded-full blur-3xl pointer-events-none" />

          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-10 h-10 border-l border-t border-[rgba(239,66,66,0.5)]" />
          <div className="absolute top-0 right-0 w-10 h-10 border-r border-t border-[rgba(239,66,66,0.5)]" />
          <div className="absolute bottom-0 left-0 w-10 h-10 border-l border-b border-[rgba(239,66,66,0.5)]" />
          <div className="absolute bottom-0 right-0 w-10 h-10 border-r border-b border-[rgba(239,66,66,0.5)]" />

          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left - CTA copy */}
            <div>
              <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-sm border border-[rgba(239,66,66,0.3)] bg-[rgba(239,66,66,0.08)]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ef4242] animate-pulse" />
                <span className="text-[#ef4242] text-[10px] tracking-widest uppercase">Available for work</span>
              </div>

              <h2 className="font-nord text-3xl md:text-4xl text-white tracking-wider mb-3">
                Let&apos;s Build
              </h2>
              <h2 className="font-nord text-3xl md:text-4xl text-[#ef4242] tracking-wider mb-6">
                It Right
              </h2>

              <p className="text-sm text-white/40 leading-relaxed mb-8 max-w-sm">
                Have a project in mind? Whether it&apos;s a Minecraft event, a batch of
                thumbnails, or a new website, I&apos;m ready to help bring it together.
              </p>

              <div className="flex items-center flex-wrap gap-4">
                <Button size="xl" asChild>
                  <Link href="/contact" className="tracking-widest uppercase">
                    Contact Me
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right - Subscribe form */}
            <div>
              <div className="mb-5">
                <p className="text-xs text-white/40 tracking-wider uppercase mb-1">Stay in the loop</p>
                <h3 className="font-nord text-lg text-white tracking-wide">Get updates &amp; releases</h3>
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
                    <p className="text-xs text-green-400/60 mt-1">Check your inbox or messages for confirmation.</p>
                  </div>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Mode toggle */}
                  <div className="flex gap-1 p-1 rounded-sm bg-white/4 border border-white/8 w-fit">
                    {(["email", "sms", "both"] as Mode[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMode(m)}
                        className={`px-3 py-1.5 rounded-sm text-[11px] tracking-wider uppercase transition-all duration-150 ${
                          mode === m
                            ? "bg-[#ef4242] text-white shadow-[0_0_12px_rgba(239,66,66,0.3)]"
                            : "text-white/40 hover:text-white/70"
                        }`}
                      >
                        {m === "both" ? "Email + SMS" : m === "email" ? "Email" : "SMS"}
                      </button>
                    ))}
                  </div>

                  {/* Name */}
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full h-10 bg-white/4 border border-white/8 focus:border-[#ef4242] rounded-sm px-3.5 text-sm text-white placeholder:text-white/25 outline-none transition-colors"
                  />

                  {/* Email */}
                  {(mode === "email" || mode === "both") && (
                    <div className="relative">
                      <Mail size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                      <input
                        type="email"
                        required={mode === "email" || mode === "both"}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full h-10 bg-white/4 border border-white/8 focus:border-[#ef4242] rounded-sm pl-9 pr-3.5 text-sm text-white placeholder:text-white/25 outline-none transition-colors"
                      />
                    </div>
                  )}

                  {/* Phone */}
                  {(mode === "sms" || mode === "both") && (
                    <div className="relative">
                      <Phone size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                      <input
                        type="tel"
                        required={mode === "sms" || mode === "both"}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full h-10 bg-white/4 border border-white/8 focus:border-[#ef4242] rounded-sm pl-9 pr-3.5 text-sm text-white placeholder:text-white/25 outline-none transition-colors"
                      />
                    </div>
                  )}

                  {/* Consent */}
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
                            ? "bg-[#ef4242] border-[#ef4242]"
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

                  <button
                    type="submit"
                    disabled={status === "sending" || !consent}
                    className="w-full h-10 flex items-center justify-center gap-2 bg-[#ef4242] text-white text-xs tracking-widest uppercase rounded-sm hover:bg-[#dd3030] transition-all shadow-[0_0_16px_rgba(239,66,66,0.25)] hover:shadow-[0_0_24px_rgba(239,66,66,0.4)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    {status === "sending" ? (
                      <><Loader2 size={13} className="animate-spin" /> Subscribing...</>
                    ) : (
                      <><Send size={13} /> Subscribe</>
                    )}
                  </button>

                  {status === "error" && (
                    <p className="text-[11px] text-[#ef4242] text-center">
                      Something went wrong. Please try again.
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
