"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Check, X, Mail, Phone } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHeader from "@/components/shared/PageHeader";
import ClientPageTitle from "@/components/shared/ClientPageTitle";
import { isValidEmail, isValidPhoneNumber } from "@/lib/contact-validation";

type Mode = "email" | "phone" | "both";
type Status = "idle" | "loading" | "success" | "error";
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SubscribePage() {
  const { data: siteContent } = useSWR("/api/data/site-content", fetcher, { revalidateOnFocus: false });
  const header = siteContent?.pageHeaders?.subscribe;
  const [mode, setMode] = useState<Mode>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const modeButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const modeDragPointerIdRef = useRef<number | null>(null);
  const modeDragStartRef = useRef<{ x: number; y: number } | null>(null);
  const modeDragActiveRef = useRef(false);
  const [modeHighlight, setModeHighlight] = useState({ left: 0, width: 0, ready: false });

  useEffect(() => {
    const modes: Mode[] = ["email", "phone", "both"];

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
    window.addEventListener("resize", syncHighlight);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", syncHighlight);
    };
  }, [mode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!consent) return;
    if (mode === "email" && !trimmedEmail) return;
    if (mode === "phone" && !trimmedPhone) return;
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

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: mode !== "phone" ? trimmedEmail : undefined,
          phone: mode !== "email" ? trimmedPhone : undefined,
          name: name.trim() || undefined,
          consent,
          source: "subscribe-page",
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setStatus("success");
        setMessage("You're on the list!");
      } else {
        setStatus("error");
        setMessage(
          typeof data?.error === "string"
            ? data.error
            : typeof data?.message === "string"
              ? data.message
            : "Unable to save your subscription."
        );
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

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

  return (
    <>
      <ClientPageTitle title={header?.title ?? "Subscribe"} />
      <Navbar />
      <PageHeader
        eyebrow={header?.eyebrow ?? "Preferences"}
        title={header?.title ?? "Subscribe"}
        description={header?.description ?? "Choose how you'd like to hear from MDCran and subscribe to updates."}
        breadcrumbs={[{ label: "Subscribe" }]}
      />
      <main className="content-container max-w-2xl py-14 sm:py-16">
        {status === "success" ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-sm border border-emerald-500/25 bg-emerald-500/10">
              <Check size={22} className="text-emerald-400" />
            </div>
            <p className="text-sm text-white/70">{message}</p>
            <p className="mt-2 text-xs text-white/40">
              You can unsubscribe any time at{" "}
              <Link href="/unsubscribe" className="text-[#ef4242] hover:underline">
                mdcran.com/unsubscribe
              </Link>
              .
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div
              className="relative flex w-fit items-center gap-1 rounded-sm border border-white/8 bg-white/3 p-1"
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
                className={`pointer-events-none absolute inset-y-1 rounded-sm bg-[#ef4242] shadow-[0_0_12px_rgba(239,66,66,0.3)] transition-all duration-300 ease-out ${
                  modeHighlight.ready ? "opacity-100" : "opacity-0"
                }`}
                style={{
                  left: `${modeHighlight.left}px`,
                  width: `${modeHighlight.width}px`,
                }}
              />
              {([
                ["email", "Email"],
                ["phone", "SMS"],
                ["both", "Email + SMS"],
              ] as [Mode, string][]).map(([nextMode, label]) => (
                <button
                  key={nextMode}
                  data-mode={nextMode}
                  ref={(node) => {
                    const modes: Mode[] = ["email", "phone", "both"];
                    modeButtonRefs.current[modes.indexOf(nextMode)] = node;
                  }}
                  type="button"
                  onClick={() => setMode(nextMode)}
                  className={`relative z-10 px-3 py-1.5 text-[11px] uppercase tracking-wider rounded-sm transition-colors duration-200 ${
                    mode === nextMode
                      ? "text-white"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div>
              <label className="mb-2 block text-[11px] uppercase tracking-wider text-white/40">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full h-11 rounded-sm border border-white/8 bg-white/4 px-4 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#ef4242]"
              />
            </div>

            {(mode === "email" || mode === "both") && (
              <div>
                <label className="mb-2 block text-[11px] uppercase tracking-wider text-white/40">
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
                    className="w-full h-11 rounded-sm border border-white/8 bg-white/4 pl-10 pr-4 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#ef4242]"
                  />
                </div>
              </div>
            )}

            {(mode === "phone" || mode === "both") && (
              <div>
                <label className="mb-2 block text-[11px] uppercase tracking-wider text-white/40">
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
                    className="w-full h-11 rounded-sm border border-white/8 bg-white/4 pl-10 pr-4 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#ef4242]"
                  />
                </div>
              </div>
            )}

            <label className="flex items-start gap-3 pt-1 text-xs text-white/40">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border-white/15 bg-transparent accent-[#ef4242]"
              />
              <span className="leading-relaxed">
                By subscribing, you agree to the{" "}
                <Link href="/terms" className="text-white/70 underline underline-offset-2 hover:text-[#ef4242]">
                  Terms of Service
                </Link>
                {" "}and{" "}
                <Link href="/privacy" className="text-white/70 underline underline-offset-2 hover:text-[#ef4242]">
                  Privacy Policy
                </Link>
                . You may unsubscribe at any time.
              </span>
            </label>

            {status === "error" ? (
              <div className="flex items-center gap-2 rounded-sm border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                <X size={14} className="shrink-0" />
                <span>{message}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={status === "loading" || !consent}
              className="w-full h-11 rounded-sm bg-[#ef4242] text-sm uppercase tracking-wider text-white transition-all hover:bg-[#dd3030] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {status === "loading" ? "Subscribing..." : "Subscribe"}
            </button>
          </form>
        )}
      </main>
      <Footer />
    </>
  );
}
