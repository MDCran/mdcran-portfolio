"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Smartphone, Loader2 } from "lucide-react";
import QRCode from "qrcode";
import { computeFingerprint } from "@/lib/device-fingerprint";
import { useIdentity } from "@/context/IdentityContext";

const OPEN_EVENT = "mdcran:scan-to-mobile";

type Status = "loading" | "ready" | "error";

export default function ScanToMobileModal() {
  const { identity } = useIdentity();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("loading");
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setStatus("loading");
    setDataUrl(null);
    try {
      const fp = await computeFingerprint();
      const res = await fetch("/api/identity/handshake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          serial: fp.serial,
          name: identity?.name || undefined,
        }),
      });
      if (!res.ok) throw new Error("handshake failed");
      const { handshakeId } = (await res.json()) as { handshakeId?: string };
      if (!handshakeId) throw new Error("no handshakeId");
      const url = `${window.location.origin}/?handshake_id=${handshakeId}`;
      const png = await QRCode.toDataURL(url, {
        width: 240,
        margin: 1,
        color: { dark: "#0a0a0a", light: "#ffffff" },
      });
      setDataUrl(png);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [identity?.name]);

  // Open on the custom event and (re)generate a fresh QR.
  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      void generate();
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [generate]);

  // Close on Escape while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="scan-to-mobile"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label="Continue on your phone"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-xs rounded-sm border border-white/8 bg-[#080808]/95 p-6 backdrop-blur-xl"
            style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.6)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-sm text-white/40 transition-colors hover:text-white/80 cursor-pointer"
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2.5">
              <Smartphone size={18} style={{ color: "var(--cranberry,#ef4242)" }} />
              <h2 className="text-sm font-medium text-white">Continue on your phone</h2>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-white/60">
              Scan this with your phone&apos;s camera — you&apos;ll pick up right where you left off.
            </p>

            {/* QR panel */}
            <div className="mt-5 flex min-h-[256px] items-center justify-center rounded-sm bg-white p-3">
              {status === "loading" && (
                <Loader2
                  size={28}
                  className="animate-spin"
                  style={{ color: "var(--cranberry,#ef4242)" }}
                />
              )}
              {status === "error" && (
                <div className="flex flex-col items-center gap-3 px-4 py-6 text-center">
                  <p className="text-[12px] text-[#0a0a0a]">
                    Couldn&apos;t generate the code — try again.
                  </p>
                  <button
                    type="button"
                    onClick={() => void generate()}
                    className="rounded-sm px-3 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-90 cursor-pointer"
                    style={{ backgroundColor: "var(--cranberry,#ef4242)" }}
                  >
                    Retry
                  </button>
                </div>
              )}
              {status === "ready" && dataUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={dataUrl}
                  alt="QR code to continue on your phone"
                  width={240}
                  height={240}
                  className="h-[240px] w-[240px]"
                />
              )}
            </div>

            <p className="mt-4 text-center text-[10px] text-white/40">
              This code expires in about 15 minutes.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
