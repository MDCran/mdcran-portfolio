"use client";

import { useEffect } from "react";

const SESSION_KEY = "_vt_1";

export default function VisitorTracker() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      return; // sessionStorage blocked (private mode, etc.)
    }

    void fetch("/api/visitors", { method: "POST", keepalive: true }).catch(() => {});
  }, []);

  return null;
}
