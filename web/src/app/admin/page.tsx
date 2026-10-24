"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { assetUrl } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { SiteContent } from "@/lib/types";

/* ─── Corner Brackets ────────────────────────────────────── */
function CornerBrackets() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-0 left-0 w-6 h-6">
        <div className="absolute top-0 left-0 w-full h-px bg-[#ef4242]" />
        <div className="absolute top-0 left-0 h-full w-px bg-[#ef4242]" />
      </div>
      <div className="absolute top-0 right-0 w-6 h-6">
        <div className="absolute top-0 right-0 w-full h-px bg-[#ef4242]" />
        <div className="absolute top-0 right-0 h-full w-px bg-[#ef4242]" />
      </div>
      <div className="absolute bottom-0 left-0 w-6 h-6">
        <div className="absolute bottom-0 left-0 w-full h-px bg-[#ef4242]" />
        <div className="absolute bottom-0 left-0 h-full w-px bg-[#ef4242]" />
      </div>
      <div className="absolute bottom-0 right-0 w-6 h-6">
        <div className="absolute bottom-0 right-0 w-full h-px bg-[#ef4242]" />
        <div className="absolute bottom-0 right-0 h-full w-px bg-[#ef4242]" />
      </div>
    </div>
  );
}

/* ─── Scan line animation ────────────────────────────────── */
function ScanLines() {
  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-4"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(239,66,66,0.04) 3px, rgba(239,66,66,0.04) 4px)",
      }}
    />
  );
}

/* ─── Admin Login Page ───────────────────────────────────── */
export default function AdminLoginPage() {
  const router = useRouter();
  const [brandLogoUrl, setBrandLogoUrl] = useState("/cdn/WEB_ASSETS/LOGOS/AI_MDCRAN_BLUE.png");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"password" | "setup" | "code">("password");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/data/site-content")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: SiteContent | null) => {
        if (!cancelled && data?.brandLogoUrl) {
          setBrandLogoUrl(data.brandLogoUrl);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!password.trim()) {
      setError("Password required.");
      return;
    }
    if ((step === "code" || step === "setup") && !/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code from your authenticator.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, code: code.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({} as Record<string, unknown>));
      // IMPORTANT: check setup/needCode BEFORE res.ok. The first-time-setup response
      // comes back 200 (res.ok) with { setup: true } — if we redirected on res.ok we'd
      // skip the QR step, bounce to the dashboard with no cookie, and spin.
      if (data.setup) {
        setStep("setup");
        setQr(typeof data.qr === "string" ? data.qr : "");
        setSecret(typeof data.secret === "string" ? data.secret : "");
        setError(typeof data.error === "string" ? data.error : "");
        setCode("");
        setLoading(false);
        return;
      }
      if (data.needCode) {
        setStep("code");
        setError(typeof data.error === "string" ? data.error : "");
        setLoading(false);
        return;
      }
      if (res.ok) {
        router.push("/admin/dashboard");
        return;
      }
      // Bad password (still at the password step).
      const next = attempts + 1;
      setAttempts(next);
      setError(next >= 5 ? "Too many attempts. Please try again later." : `Invalid credentials. ${5 - next} attempt${5 - next === 1 ? "" : "s"} remaining.`);
      setPassword("");
      setLoading(false);
    } catch {
      setError("Connection error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-dvh bg-[#0a0a0a] flex items-center justify-center px-4 py-10 sm:px-6 relative overflow-x-clip">
      <ScanLines />

      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#ef4242] opacity-4 rounded-full blur-[120px]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#ef4242]/50 to-transparent" />
      </div>

      {/* Grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(239,66,66,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(239,66,66,0.04) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo / branding */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center justify-center mb-6"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={assetUrl(brandLogoUrl)}
              alt="MDCran"
              style={{ height: "48px", width: "auto" }}
              className="rounded-sm opacity-90"
            />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            id="admin-login-title"
            className="font-nord text-xl sm:text-2xl tracking-[0.15em] sm:tracking-[0.3em] text-white uppercase mb-2"
            style={{ textShadow: "0 0 30px rgba(239,66,66,0.4)" }}
          >
            Admin Center
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="text-[10px] tracking-[0.25em] uppercase text-white/60"
          >
            Restricted Access · MDCran
          </motion.p>
        </div>

        {/* Login card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="relative rounded-sm border border-white/15 bg-white/3 backdrop-blur-xl px-5 sm:px-8 pt-8 pb-1"
        >
          <CornerBrackets />

          <form onSubmit={handleSubmit} aria-labelledby="admin-login-title" aria-busy={loading} className="space-y-5">
            {/* Password field */}
            <div>
              <label htmlFor="admin-password" className="block text-[11px] tracking-[0.2em] uppercase text-white/70 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  id="admin-password"
                  name="password"
                  type={showPw ? "text" : "password"}
                  required
                  aria-describedby={error ? "admin-login-error" : undefined}
                  aria-invalid={Boolean(error) && step === "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  disabled={loading || attempts >= 5}
                  placeholder="Enter admin password"
                  autoComplete="current-password"
                  className="w-full h-12 bg-white/4 border border-white/25 focus:border-[#f78787] focus:ring-2 focus:ring-[#ef4242]/20 rounded-sm px-3 pr-20 text-white text-base placeholder:text-white/50 outline-none transition-colors duration-200 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  aria-pressed={showPw}
                  aria-controls="admin-password"
                  className="absolute right-1 top-1/2 -translate-y-1/2 min-h-11 px-3 rounded-sm text-white/70 hover:text-white focus-visible:outline-2 focus-visible:outline-[#f78787] transition-colors text-xs tracking-wider"
                >
                  {showPw ? "HIDE" : "SHOW"}
                </button>
              </div>
            </div>

            {/* 2FA setup QR */}
            {step === "setup" && (
              <div className="rounded-sm border border-white/10 bg-white/3 p-4 text-center space-y-2">
                <p className="text-[10px] tracking-[0.2em] uppercase text-[#ef4242]">Set up 2FA</p>
                <p id="admin-code-help" className="text-xs text-white/70 leading-relaxed">Scan with Google Authenticator / Authy, then enter the 6-digit code. This is required on every future login.</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {qr && <img src={qr} alt="2FA QR code" className="mx-auto rounded-sm bg-white p-1" width={180} height={180} />}
                {secret && <p className="text-xs text-white/70 break-all font-mono">Manual key: {secret}</p>}
              </div>
            )}

            {/* 2FA code field */}
            {(step === "setup" || step === "code") && (
              <div>
                <label htmlFor="admin-authentication-code" className="block text-[11px] tracking-[0.2em] uppercase text-white/70 mb-2">Authentication Code</label>
                <input
                  id="admin-authentication-code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  required
                  pattern="[0-9]{6}"
                  maxLength={6}
                  disabled={loading}
                  aria-invalid={Boolean(error)}
                  aria-describedby={[step === "setup" ? "admin-code-help" : "", error ? "admin-login-error" : ""].filter(Boolean).join(" ") || undefined}
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                  placeholder="6-digit code"
                  autoFocus
                  className="w-full h-12 bg-white/4 border border-white/25 focus:border-[#f78787] focus:ring-2 focus:ring-[#ef4242]/20 rounded-sm px-4 text-white text-base tracking-[0.4em] text-center placeholder:tracking-normal placeholder:text-white/50 outline-none transition-colors disabled:opacity-50"
                />
              </div>
            )}

            {/* Error */}
            <div id="admin-login-error" role="alert" aria-atomic="true">
              {error && (
                  <div className="flex items-start gap-2 text-red-300 text-xs py-2 px-3 bg-[#ef4242]/8 border border-[#ef4242]/25 rounded-sm">
                    <span className="text-base leading-none" aria-hidden="true">⚠</span>
                    <span>{error}</span>
                  </div>
              )}
            </div>
            <p role="status" className="sr-only">{loading ? "Authenticating. Please wait." : ""}</p>

            {/* Submit */}
            <div className="relative group pt-1">
              <div className="absolute -inset-1 rounded-sm bg-[#ef4242] opacity-0 group-hover:opacity-20 blur-md transition-opacity duration-500 pointer-events-none" />
              <button
                type="submit"
                disabled={loading || attempts >= 5}
                className="relative w-full min-h-12 px-3 py-2 bg-[#bd2938] hover:bg-[#a92432] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f78787] disabled:opacity-50 disabled:cursor-not-allowed text-white font-nord tracking-[0.16em] text-xs uppercase rounded-sm transition-colors duration-200 shadow-[0_0_30px_rgba(239,66,66,0.3)] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                    Authenticating
                  </>
                ) : step === "setup" ? (
                  "Verify & Enable 2FA"
                ) : step === "code" ? (
                  "Verify Code"
                ) : (
                  "Access Dashboard"
                )}
              </button>
            </div>
          </form>

          {/* Hint */}
          <div className="mt-5 pt-4 pb-3 border-t border-white/5 text-center">
            <p className="text-[10px] text-white/60 tracking-[0.1em] uppercase leading-relaxed">
              Unauthorized access attempts are logged.
            </p>
          </div>
        </motion.div>

        {/* Footer link */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-6 text-xs text-white/60 tracking-wider"
        >
          <Link href="/" className="inline-flex min-h-11 items-center rounded-sm hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f78787] transition-colors">
            ← Return to MDCran.com
          </Link>
        </motion.p>
      </motion.div>
    </main>
  );
}
