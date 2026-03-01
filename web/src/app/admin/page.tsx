"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

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
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Password required.");
      return;
    }
    setLoading(true);
    setError("");

    // Brief delay for UX
    await new Promise((r) => setTimeout(r, 400));

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push("/admin/dashboard");
      } else {
        const next = attempts + 1;
        setAttempts(next);
        if (next >= 5) {
          setError("Too many attempts. Please try again later.");
        } else {
          setError(`Invalid credentials. ${5 - next} attempt${5 - next === 1 ? "" : "s"} remaining.`);
        }
        setPassword("");
        setLoading(false);
      }
    } catch {
      setError("Connection error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6 relative overflow-hidden">
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
              src="/cdn/WEB_ASSETS/LOGOS/AI_MDCRAN_BLUE.png"
              alt="MDCran"
              style={{ height: "48px", width: "auto" }}
              className="rounded-sm opacity-90"
            />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="font-nord text-2xl tracking-[0.3em] text-white uppercase mb-2"
            style={{ textShadow: "0 0 30px rgba(239,66,66,0.4)" }}
          >
            Admin Center
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="text-[10px] tracking-[0.25em] uppercase text-white/30"
          >
            Restricted Access · MDCran
          </motion.p>
        </div>

        {/* Login card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="relative rounded-sm border border-white/8 bg-white/3 backdrop-blur-xl px-8 pt-8 pb-1"
        >
          <CornerBrackets />

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Password field */}
            <div>
              <label className="block text-[10px] tracking-[0.25em] uppercase text-white/40 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  disabled={loading || attempts >= 5}
                  placeholder="Enter admin password"
                  autoComplete="current-password"
                  className="w-full h-11 bg-white/4 border border-white/10 focus:border-[#ef4242] rounded-sm px-4 pr-12 text-white text-sm placeholder:text-white/20 outline-none transition-all duration-200 tracking-wider disabled:opacity-40"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors text-xs tracking-wider"
                  tabIndex={-1}
                >
                  {showPw ? "HIDE" : "SHOW"}
                </button>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 text-[#ef4242] text-xs py-2 px-3 bg-[#ef4242]/8 border border-[#ef4242]/20 rounded-sm">
                    <span className="text-base leading-none">⚠</span>
                    <span>{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <div className="relative group pt-1">
              <div className="absolute -inset-1 rounded-sm bg-[#ef4242] opacity-0 group-hover:opacity-20 blur-md transition-opacity duration-500 pointer-events-none" />
              <button
                type="submit"
                disabled={loading || attempts >= 5}
                className="relative w-full h-11 bg-[#ef4242] hover:bg-[#dd3030] disabled:opacity-40 disabled:cursor-not-allowed text-white font-nord tracking-[0.25em] text-xs uppercase rounded-sm transition-colors duration-200 shadow-[0_0_30px_rgba(239,66,66,0.3)] flex items-center justify-center gap-2"
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
                ) : (
                  "Access Dashboard"
                )}
              </button>
            </div>
          </form>

          {/* Hint */}
          <div className="mt-5 pt-4 pb-3 border-t border-white/5 text-center">
            <p className="text-[10px] text-white/20 tracking-[0.16em] uppercase whitespace-nowrap">
              Unauthorized access attempts are logged.
            </p>
          </div>
        </motion.div>

        {/* Footer link */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-6 text-[10px] text-white/20 tracking-wider"
        >
          <Link href="/" className="hover:text-white/40 transition-colors">
            ← Return to MDCran.com
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
