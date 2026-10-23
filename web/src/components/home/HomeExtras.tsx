"use client";

import { lazy, Suspense } from "react";

const HomeAmbient = lazy(() => import("./HomeAmbient"));

export default function HomeExtras() {
  return <Suspense fallback={null}><HomeAmbient /></Suspense>;
}
