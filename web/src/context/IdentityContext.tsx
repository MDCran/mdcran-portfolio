"use client";

import { createContext, useContext } from "react";
import type { RecycledIdentity } from "@/hooks/useIdentityPreservation";

export interface IdentityContextValue {
  identity: RecycledIdentity | null;
  loading: boolean;
}

export const IdentityContext = createContext<IdentityContextValue>({
  identity: null,
  loading: true,
});

export function useIdentity(): IdentityContextValue {
  return useContext(IdentityContext);
}
