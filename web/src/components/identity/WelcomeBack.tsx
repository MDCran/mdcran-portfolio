"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useIdentity } from "@/context/IdentityContext";

export default function WelcomeBack() {
  const { identity } = useIdentity();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show for recycled (returning) visitors with a real name
    if (identity && !identity.isNew && identity.name && identity.name !== "Guest") {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(t);
    }
  }, [identity]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35 }}
          className="fixed top-4 left-1/2 z-[9999] -translate-x-1/2 rounded-full bg-black/80 px-5 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-sm border border-white/10"
          role="status"
          aria-live="polite"
        >
          Welcome back, {identity!.name}! 👋
        </motion.div>
      )}
    </AnimatePresence>
  );
}
