"use client";
import { useState } from "react";
export default function SectionActions({ anchor }: { anchor?: string }) {
  const [status, setStatus] = useState("");
  return (
    <div className="my-3 flex flex-wrap items-center gap-4 text-xs text-white/60 print:hidden">
      <button
        className="underline underline-offset-4 hover:text-white"
        onClick={() => {
          const details = [
            ...document.querySelectorAll<HTMLDetailsElement>(
              "main details:not([open])",
            ),
          ];
          details.forEach((d) => (d.open = true));
          const restore = () => {
            details.forEach((d) => (d.open = false));
            window.removeEventListener("afterprint", restore);
          };
          window.addEventListener("afterprint", restore);
          window.print();
        }}
      >
        Print page / Save PDF
      </button>
      <button
        className="underline underline-offset-4 hover:text-white"
        onClick={async () => {
          const url = new URL(location.href);
          if (anchor) url.hash = anchor;
          try {
            await navigator.clipboard.writeText(url.toString());
            setStatus("Link copied");
          } catch {
            setStatus("Copy the link from your address bar");
            history.replaceState(null, "", url);
          }
        }}
      >
        Copy section link
      </button>
      <span role="status">{status}</span>
    </div>
  );
}
