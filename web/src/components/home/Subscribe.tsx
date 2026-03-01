"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Phone, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

type Mode = "email" | "phone" | "both";

export default function Subscribe() {
  const [mode, setMode] = useState<Mode>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) return;
    if (mode === "email" && !email) return;
    if (mode === "phone" && !phone) return;
    if (mode === "both" && !email && !phone) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: mode !== "phone" ? email : undefined,
          phone: mode !== "email" ? phone : undefined,
          name: name || undefined,
          consent,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
        setMessage("You're on the list!");
      } else {
        setStatus("error");
        setMessage(data.message ?? "Something went wrong.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <section className="py-28 border-t border-white/6">
      <div className="content-container">
        <div className="max-w-3xl mx-auto">
        <div className="relative rounded-sm border border-white/8 bg-white/2 backdrop-blur-xl p-8 sm:p-10 md:p-12 overflow-hidden">
          {/* Subtle grid */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(rgba(239,66,66,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(239,66,66,0.04) 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />
          <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full bg-[#ef4242] opacity-[0.05] blur-3xl" />

          <div className="relative">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0 }}
              className="flex items-center gap-3 mb-4"
            >
              <div className="h-px w-8 bg-[#ef4242]" />
              <span className="text-[#ef4242] text-[11px] tracking-[0.25em] uppercase">Stay Updated</span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0 }}
              className="font-nord text-2xl md:text-3xl text-white tracking-wider mb-3"
            >
              Get the Latest
            </motion.h2>
            <p className="text-sm text-white/40 mb-6 leading-relaxed">
              New projects, events, and releases — delivered directly to you. No spam, ever.
            </p>

            <AnimatePresence mode="wait">
              {status === "success" ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 p-5 rounded-sm border border-green-500/20 bg-green-500/8"
                >
                  <CheckCircle2 size={18} className="text-green-400 shrink-0" />
                  <div>
                    <div className="text-sm text-white">{message}</div>
                    <div className="text-xs text-white/40 mt-0.5">
                      You can unsubscribe anytime at{" "}
                      <a href="/unsubscribe" className="text-[#ef4242] hover:underline">
                        mdcran.com/unsubscribe
                      </a>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onSubmit={handleSubmit}
                  className="space-y-5"
                >
                  {/* Mode selector */}
                  <div className="flex items-center gap-1 p-1 rounded-sm border border-white/8 bg-white/3 w-fit mb-1">
                    {([["email", "Email"], ["phone", "SMS"], ["both", "Both"]] as [Mode, string][]).map(
                      ([m, label]) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMode(m)}
                          className={`px-3 py-1.5 text-[11px] tracking-wider uppercase rounded-sm transition-all duration-200 ${
                            mode === m
                              ? "bg-[#ef4242] text-white"
                              : "text-white/40 hover:text-white"
                          }`}
                        >
                          {label}
                        </button>
                      )
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] text-white/35 tracking-wider uppercase mb-2">
                        Name (optional)
                      </label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        className="w-full h-11 bg-white/4 border border-white/8 focus:border-[#ef4242] rounded-sm px-4 text-sm text-white placeholder:text-white/20 outline-none transition-colors backdrop-blur-sm"
                      />
                    </div>

                    {(mode === "email" || mode === "both") && (
                      <div>
                        <label className="block text-[11px] text-white/35 tracking-wider uppercase mb-2">
                          Email
                        </label>
                        <div className="relative">
                          <Mail size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            required={mode === "email" || mode === "both"}
                            className="w-full h-11 bg-white/4 border border-white/8 focus:border-[#ef4242] rounded-sm pl-10 pr-4 text-sm text-white placeholder:text-white/20 outline-none transition-colors backdrop-blur-sm"
                          />
                        </div>
                      </div>
                    )}

                    {(mode === "phone" || mode === "both") && (
                      <div>
                        <label className="block text-[11px] text-white/35 tracking-wider uppercase mb-2">
                          Phone (SMS)
                        </label>
                        <div className="relative">
                          <Phone size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+1 (555) 000-0000"
                            required={mode === "phone" || mode === "both"}
                            className="w-full h-11 bg-white/4 border border-white/8 focus:border-[#ef4242] rounded-sm pl-10 pr-4 text-sm text-white placeholder:text-white/20 outline-none transition-colors backdrop-blur-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer group pt-1">
                    <div
                      className={`mt-0.5 w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 transition-all duration-200 ${
                        consent
                          ? "bg-[#ef4242] border-[#ef4242]"
                          : "border-white/15 group-hover:border-white/30"
                      }`}
                      onClick={() => setConsent(!consent)}
                    >
                      {consent && (
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                          <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs text-white/40 leading-relaxed">
                      I consent to receiving updates from MDCran. I can unsubscribe at any time.
                    </span>
                  </label>

                  {status === "error" && (
                    <div className="flex items-center gap-2 text-xs text-red-400">
                      <AlertCircle size={13} />
                      {message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!consent || status === "loading"}
                    className="group flex items-center gap-2 h-11 px-6 bg-[#ef4242] text-white text-xs tracking-widest uppercase rounded-sm hover:bg-[#dd3030] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(239,66,66,0.3)] hover:shadow-[0_0_30px_rgba(239,66,66,0.5)]"
                  >
                    {status === "loading" ? "Subscribing..." : "Subscribe"}
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-200" />
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}
