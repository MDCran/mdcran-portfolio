"use client";

import { useEffect } from "react";

export default function ClientPageTitle({ title }: { title?: string }) {
  useEffect(() => {
    if (!title?.trim()) return;
    document.title = title.includes("MDCran") ? title : `${title} | MDCran`;
  }, [title]);

  return null;
}
