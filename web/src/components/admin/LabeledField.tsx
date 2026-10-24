import type { ReactElement, ReactNode } from "react";

/** One native input, select or textarea, explicitly enclosed by its visible label. */
export default function LabeledField({ label, required, className = "", children }: {
  label: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactElement;
}) {
  return <label className={`block min-w-0 ${className}`}>
    <span className="block text-[10px] tracking-[0.2em] uppercase text-white/70 mb-1.5">
      {label}
      {required && <><span aria-hidden="true" className="text-[#ef4242] ml-0.5">*</span><span className="sr-only"> (required)</span></>}
    </span>
    {children}
  </label>;
}
