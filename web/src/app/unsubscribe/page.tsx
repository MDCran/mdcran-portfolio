"use client";

import { useState } from "react";
import useSWR from "swr";
import { Check, X } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHeader from "@/components/shared/PageHeader";
import ClientPageTitle from "@/components/shared/ClientPageTitle";
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function UnsubscribePage() {
  const { data: siteContent } = useSWR("/api/data/site-content", fetcher, { revalidateOnFocus: false });
  const header = siteContent?.pageHeaders?.unsubscribe;
  const [identifier, setIdentifier] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(() => {
    if (typeof window === "undefined") return "idle";
    const statusParam = new URLSearchParams(window.location.search).get("status");
    return statusParam === "success" || statusParam === "error" ? statusParam : "idle";
  });
  const [message, setMessage] = useState(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get("status");
    const messageParam = params.get("message");
    if (statusParam === "success" || statusParam === "error") {
      return messageParam || (statusParam === "success"
        ? "You've been successfully unsubscribed."
        : "Unable to unsubscribe that contact.");
    }
    return "";
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setStatus("success");
        setMessage(data.message || "You've been successfully unsubscribed.");
      } else {
        setStatus("error");
        setMessage(
          typeof data?.message === "string"
            ? data.message
            : "Unable to unsubscribe that contact."
        );
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <>
      <ClientPageTitle title={header?.title ?? "Unsubscribe"} />
      <Navbar />
      <PageHeader
        eyebrow={header?.eyebrow ?? "Preferences"}
        title={header?.title ?? "Unsubscribe"}
        description={header?.description ?? "Enter your email address or phone number to unsubscribe from updates."}
        breadcrumbs={[{ label: "Unsubscribe" }]}
      />
      <main className="content-container max-w-lg py-14 sm:py-16">
        {status === "success" ? (
          <div className="text-center py-12">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-sm border border-emerald-500/25 bg-emerald-500/10">
              <Check size={22} className="text-emerald-400" />
            </div>
            <p className="text-white/70 text-sm">{message}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] text-white/40 tracking-wider uppercase mb-2">
                Email Or Phone
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="your@email.com or +1 (555) 000-0000"
                className="w-full h-11 bg-white/4 border border-white/8 focus:border-[#ef4242] rounded-sm px-4 text-sm text-white placeholder:text-white/25 outline-none transition-colors"
              />
            </div>
            {status === "error" && (
              <div className="flex items-center gap-2 rounded-sm border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                <X size={14} className="shrink-0" />
                <span>{message}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={status === "loading" || !identifier.trim()}
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
