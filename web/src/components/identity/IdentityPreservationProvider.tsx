"use client";

import { useMemo } from "react";
import { useIdentityPreservation } from "@/hooks/useIdentityPreservation";
import { IdentityContext } from "@/context/IdentityContext";

export default function IdentityPreservationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { identity, loading } = useIdentityPreservation();
  const value = useMemo(() => ({ identity, loading }), [identity, loading]);
  return (
    <IdentityContext.Provider value={value}>
      {children}
    </IdentityContext.Provider>
  );
}
