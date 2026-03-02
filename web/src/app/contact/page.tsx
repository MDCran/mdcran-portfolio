"use client";

import React, { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { motion } from "framer-motion";
import { Send, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHeader from "@/components/shared/PageHeader";
import ClientPageTitle from "@/components/shared/ClientPageTitle";
import { isValidEmail, isValidPhoneNumber } from "@/lib/contact-validation";

type Status = "idle" | "sending" | "success" | "error";
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ContactPage() {
  const { data: siteContent } = useSWR("/api/data/site-content", fetcher, { revalidateOnFocus: false });
  const header = siteContent?.pageHeaders?.contact;
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [submissionId, setSubmissionId] = useState(() => crypto.randomUUID());
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    consent: false,
  });

  const set = (k: keyof typeof form, v: string | boolean) => {
    if (status === "error") {
      setStatus("idle");
    }
    if (errorMessage) {
      setErrorMessage("");
    }
    setForm((f) => ({ ...f, [k]: v }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = form.email.trim();
    const trimmedPhone = form.phone.trim();

    if (!form.name.trim() || !form.message.trim()) return;
    if (!trimmedEmail && !trimmedPhone) {
      setStatus("error");
      setErrorMessage("Enter an email address or phone number.");
      return;
    }
    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      setStatus("error");
      setErrorMessage("Enter a valid email address.");
      return;
    }
    if (trimmedPhone && !isValidPhoneNumber(trimmedPhone)) {
      setStatus("error");
      setErrorMessage("Enter a valid phone number.");
      return;
    }
    if (!form.consent) return;

    setErrorMessage("");
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, submissionId }),
      });
      if (res.ok) {
        setStatus("success");
        setErrorMessage("");
        setForm({ name: "", email: "", phone: "", subject: "", message: "", consent: false });
        setSubmissionId(crypto.randomUUID());
      } else {
        const data = await res.json().catch(() => null) as { error?: string } | null;
        setStatus("error");
        setErrorMessage(data?.error || "Something went wrong.");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Something went wrong.");
    }
  };

  return (
    <>
      <ClientPageTitle title={header?.title ?? "Contact"} />
      <Navbar />
      <PageHeader
        eyebrow={header?.eyebrow ?? "Get in touch"}
        title={header?.title ?? "Contact"}
        description={header?.description ?? "Let's build something extraordinary together."}
        breadcrumbs={[{ label: "Contact" }]}
      />
      <main className="content-container py-14 sm:py-16">
        <div className="max-w-3xl">
          {/* Success state */}
          {status === "success" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 flex items-start gap-3 p-5 rounded-sm border border-green-500/25 bg-green-500/8"
            >
              <CheckCircle size={18} className="text-green-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-green-300 font-medium">Message sent!</p>
                <p className="text-xs text-green-400/70 mt-1">
                  I&apos;ll get back to you as soon as possible.
                </p>
              </div>
            </motion.div>
          )}

          {/* Error state */}
          {status === "error" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 flex items-start gap-3 p-5 rounded-sm border border-[rgba(239,66,66,0.25)] bg-[rgba(239,66,66,0.08)]"
            >
              <AlertCircle size={18} className="text-[#ef4242] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-[#ef4242] font-medium">{errorMessage || "Something went wrong."}</p>
                <p className="text-xs text-white/40 mt-1">
                  Please try again or email me directly at{" "}
                  <a href="mailto:contact@mdcran.com" className="text-[#ef4242] hover:underline">
                    contact@mdcran.com
                  </a>
                </p>
              </div>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name + Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[11px] text-white/40 tracking-wider uppercase mb-2">
                  Name <span className="text-[#ef4242]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Your name"
                  className="w-full h-11 bg-white/4 border border-white/8 focus:border-[#ef4242] rounded-sm px-4 text-sm text-white placeholder:text-white/25 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] text-white/40 tracking-wider uppercase mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="your@email.com"
                  className="w-full h-11 bg-white/4 border border-white/8 focus:border-[#ef4242] rounded-sm px-4 text-sm text-white placeholder:text-white/25 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Phone + Subject */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[11px] text-white/40 tracking-wider uppercase mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full h-11 bg-white/4 border border-white/8 focus:border-[#ef4242] rounded-sm px-4 text-sm text-white placeholder:text-white/25 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] text-white/40 tracking-wider uppercase mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => set("subject", e.target.value)}
                  placeholder="What is this about?"
                  className="w-full h-11 bg-white/4 border border-white/8 focus:border-[#ef4242] rounded-sm px-4 text-sm text-white placeholder:text-white/25 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-[11px] text-white/40 tracking-wider uppercase mb-2">
                Message <span className="text-[#ef4242]">*</span>
              </label>
              <textarea
                required
                rows={6}
                value={form.message}
                onChange={(e) => set("message", e.target.value)}
                placeholder="Tell me about your project, timeline, and budget..."
                className="w-full bg-white/4 border border-white/8 focus:border-[#ef4242] rounded-sm p-4 text-sm text-white placeholder:text-white/25 outline-none transition-colors resize-none"
              />
            </div>

            {/* Consent */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  required
                  checked={form.consent}
                  onChange={(e) => set("consent", e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded-sm border transition-all duration-150 flex items-center justify-center ${
                    form.consent
                      ? "bg-[#ef4242] border-[#ef4242]"
                      : "bg-white/4 border-white/15 group-hover:border-white/30"
                  }`}
                >
                  {form.consent && (
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-xs text-white/40 leading-relaxed">
                I agree that MDCran may contact me via the email and/or phone provided. I understand
                I can opt out at any time. By submitting you agree to the{" "}
                <Link href="/terms" className="text-white/70 underline underline-offset-2 hover:text-[#ef4242] transition-colors">
                  Terms of Service
                </Link>
                {" "}and{" "}
                <Link href="/privacy" className="text-white/70 underline underline-offset-2 hover:text-[#ef4242] transition-colors">
                  Privacy Policy
                </Link>
                .{" "}
                <span className="text-[#ef4242]">*</span>
              </span>
            </label>

            {/* Note: email or phone required */}
            {!form.email && !form.phone && (
              <p className="text-[11px] text-white/30 tracking-wide">
                At least one contact method (email or phone) is required.
              </p>
            )}

            <button
              type="submit"
              disabled={status === "sending" || !form.consent || (!form.email && !form.phone)}
              className="w-full h-12 flex items-center justify-center gap-2.5 bg-[#ef4242] text-white text-sm tracking-wider uppercase rounded-sm hover:bg-[#dd3030] transition-all shadow-[0_0_20px_rgba(239,66,66,0.3)] hover:shadow-[0_0_30px_rgba(239,66,66,0.5)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {status === "sending" ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={15} />
                  Send Message
                </>
              )}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
