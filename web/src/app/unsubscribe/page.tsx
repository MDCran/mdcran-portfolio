"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHeader from "@/components/shared/PageHeader";

export default function UnsubscribePage() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email && !phone) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
        setMessage("You've been successfully unsubscribed.");
      } else {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <>
      <Navbar />
      <PageHeader
        eyebrow="Preferences"
        title="Unsubscribe"
        description="Enter your email or phone number to unsubscribe from MDCran updates."
        breadcrumbs={[{ label: "Unsubscribe" }]}
      />
      <main className="content-container max-w-lg py-14 sm:py-16">
        {status === "success" ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-sm bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
              <div className="w-5 h-5 rounded-full bg-green-400" />
            </div>
            <p className="text-white/70 text-sm">{message}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] text-white/40 tracking-wider uppercase mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full h-11 bg-white/4 border border-white/8 focus:border-[#ef4242] rounded-sm px-4 text-sm text-white placeholder:text-white/25 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] text-white/40 tracking-wider uppercase mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full h-11 bg-white/4 border border-white/8 focus:border-[#ef4242] rounded-sm px-4 text-sm text-white placeholder:text-white/25 outline-none transition-colors"
              />
            </div>
            {status === "error" && (
              <p className="text-xs text-red-400">{message}</p>
            )}
            <button
              type="submit"
              disabled={status === "loading" || (!email && !phone)}
              className="w-full h-11 border border-white/15 text-white/70 text-sm tracking-wider uppercase rounded-sm hover:border-[#ef4242] hover:text-white transition-all disabled:opacity-40"
            >
              {status === "loading" ? "Processing..." : "Unsubscribe"}
            </button>
          </form>
        )}
      </main>
      <Footer />
    </>
  );
}
