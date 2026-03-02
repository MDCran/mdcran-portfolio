"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { FileText, Mail } from "lucide-react";

export default function ResumeButton() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin") || pathname.startsWith("/rizz")) return null;
  const showResume = pathname !== "/resume";
  const showContact = pathname !== "/contact";

  if (!showResume && !showContact) return null;

  const buttonClassName =
    "flex h-10 w-10 items-center justify-center bg-[#0d0d0d] border border-white/12 hover:border-[#ef4242]/50 text-white/60 hover:text-white text-[11px] tracking-widest uppercase rounded-sm transition-all duration-200 shadow-[0_4px_24px_rgba(0,0,0,0.5)] hover:shadow-[0_4px_24px_rgba(239,66,66,0.15)] backdrop-blur-sm md:h-10 md:w-auto md:justify-start md:gap-2 md:px-4";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, x: 12 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ delay: 1.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="fixed bottom-6 left-6 z-50 flex flex-col gap-3"
    >
      {showResume && (
        <Link href="/resume" className={buttonClassName}>
          <FileText size={12} className="text-[#ef4242]" />
          <span className="hidden md:inline">Resume</span>
        </Link>
      )}
      {showContact && (
        <Link href="/contact" className={buttonClassName}>
          <Mail size={12} className="text-[#ef4242]" />
          <span className="hidden md:inline">Contact</span>
        </Link>
      )}
    </motion.div>
  );
}
