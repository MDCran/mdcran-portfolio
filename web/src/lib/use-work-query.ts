"use client";

import { useSearchParams } from "next/navigation";

/** Next's native history integration updates search params without a server fetch. */
export function useWorkQuery() {
  const params = useSearchParams();
  const update = (values: Record<string, string>) => {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(values)) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    window.history.replaceState(null, "", url);
  };
  return { params, update };
}
