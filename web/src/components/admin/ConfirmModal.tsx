"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";

export interface ConfirmOpts {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}
type State = ConfirmOpts & { resolve: (v: boolean) => void };

/** Promise-based confirm dialog — a styled in-app modal, never window.confirm/alert.
 *  Usage: const { confirm, modal } = useConfirm();  if (!(await confirm({title})) ) return;  ...render {modal}. */
export function useConfirm() {
  const [state, setState] = useState<State | null>(null);

  const confirm = useCallback(
    (opts: ConfirmOpts) => new Promise<boolean>((resolve) => setState({ ...opts, resolve })),
    [],
  );
  const finish = useCallback((v: boolean) => {
    setState((s) => { s?.resolve(v); return null; });
  }, []);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(false);
      else if (e.key === "Enter") finish(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, finish]);

  const modal = (
    <AnimatePresence>
      {state && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => finish(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true"
            className="w-full max-w-sm rounded-sm border border-white/10 bg-[#0c0c0e] p-5 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              {state.danger && <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[var(--cranberry,#ef4242)]" />}
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">{state.title}</p>
                {state.body && <p className="mt-1.5 whitespace-pre-wrap break-words text-[12px] leading-relaxed text-white/55">{state.body}</p>}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => finish(false)} className="h-8 px-3 rounded-sm border border-white/12 text-xs text-white/60 hover:text-white hover:border-white/25 cursor-pointer">
                {state.cancelLabel ?? "Cancel"}
              </button>
              <button onClick={() => finish(true)} className="h-8 px-3 rounded-sm text-xs font-medium text-white bg-[var(--cranberry,#ef4242)] hover:opacity-90 cursor-pointer">
                {state.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return { confirm, modal };
}
