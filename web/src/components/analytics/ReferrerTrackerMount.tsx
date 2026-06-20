"use client";

import { useReferrerTracker } from "@/hooks/useReferrerTracker";

export default function ReferrerTrackerMount() {
  useReferrerTracker();
  return null;
}
