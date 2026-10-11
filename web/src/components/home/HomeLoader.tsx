"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const SESSION_KEY = "mdcran_home_intro_shown";

/** A brief first-visit transition; never waits on third-party services. */
export default function HomeLoader() {
  const [show, setShow] = useState(true);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SESSION_KEY) === "1";
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch { /* Storage is optional. */ }
    const timer = setTimeout(() => setShow(false), seen || reducedMotion ? 0 : 650);
    return () => clearTimeout(timer);
  }, [reducedMotion]);
  return <AnimatePresence>{show && (
    <motion.div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#090a0d] px-6"
      initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.2 }}
      role="status" aria-label="Loading portfolio">
      <div className="w-full max-w-xs text-center">
        <p className="font-nord text-xl tracking-wide text-white">Michael Cran</p>
        <p className="mt-3 text-xs leading-relaxed text-white/55">Software · AI · Business Automation</p>
        <div className="mt-6 h-px overflow-hidden bg-white/10" aria-hidden="true">
          <motion.div className="h-full bg-white/70" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
            style={{ transformOrigin: "left" }} transition={{ duration: reducedMotion ? 0 : 0.6 }} />
        </div>
        <p className="mt-4 text-[10px] tracking-widest text-white/40">Preparing portfolio</p>
      </div>
    </motion.div>
  )}</AnimatePresence>;
}
