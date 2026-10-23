"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { AlertTriangle } from "lucide-react";

export interface ConfirmOpts {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type State = ConfirmOpts & {
  id: number;
  resolve: (value: boolean) => void;
  returnFocus: HTMLElement | null;
};

/** Promise-based confirmation. Render modal alongside the controls calling confirm. */
export function useConfirm() {
  const [state, setState] = useState<State | null>(null);
  const pending = useRef<State | null>(null);
  const sequence = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const previous = pending.current;
      pending.current = null;
      previous?.resolve(false);
    };
  }, []);

  const confirm = useCallback((opts: ConfirmOpts) => new Promise<boolean>((resolve) => {
    if (!mounted.current) { resolve(false); return; }
    const previous = pending.current;
    // A replacement keeps the original invoking control as the return target.
    const returnFocus = previous?.returnFocus ??
      (typeof document !== "undefined" && document.activeElement instanceof HTMLElement ? document.activeElement : null);
    previous?.resolve(false);
    const next = { ...opts, id: ++sequence.current, resolve, returnFocus };
    pending.current = next;
    setState(next);
  }), []);

  const finish = useCallback((id: number, value: boolean) => {
    const current = pending.current;
    if (!current || current.id !== id) return;
    pending.current = null;
    current.resolve(value);
    if (mounted.current) setState(null);
  }, []);

  const modal = state ? (
    <AlertDialog.Root key={state.id} open onOpenChange={(open) => { if (!open) finish(state.id, false); }}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm" />
        <AlertDialog.Content
          className="fixed left-1/2 top-1/2 z-[10001] w-[calc(100%_-_2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-sm border border-white/10 bg-[#0c0c0e] p-5 shadow-2xl"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            // Radix has no Trigger in this promise API, so restore the caller ourselves.
            // Do not steal focus from a newer replacement dialog.
            if (!pending.current && state.returnFocus?.isConnected) state.returnFocus.focus({ preventScroll: true });
          }}
        >
          <div className="flex items-start gap-3">
            {state.danger && <AlertTriangle aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-[var(--cranberry,#ef4242)]" />}
            <div className="min-w-0">
              <AlertDialog.Title className="text-sm font-medium text-white">{state.title}</AlertDialog.Title>
              <AlertDialog.Description className={state.body ? "mt-1.5 whitespace-pre-wrap break-words text-[12px] leading-relaxed text-white/55" : "sr-only"}>
                {state.body || "Choose Cancel to keep things unchanged, or confirm to continue."}
              </AlertDialog.Description>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Cancel type="button" onClick={() => finish(state.id, false)} className="h-8 px-3 rounded-sm border border-white/12 text-xs text-white/60 hover:text-white hover:border-white/25 cursor-pointer">
              {state.cancelLabel ?? "Cancel"}
            </AlertDialog.Cancel>
            <AlertDialog.Action type="button" onClick={() => finish(state.id, true)} className="h-8 px-3 rounded-sm text-xs font-medium text-white bg-[var(--cranberry,#ef4242)] hover:opacity-90 cursor-pointer">
              {state.confirmLabel ?? "Confirm"}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  ) : null;

  return { confirm, modal };
}
