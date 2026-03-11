"use client";

import { motion } from "framer-motion";
import { Briefcase, Eye } from "lucide-react";

interface RecruiterToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export default function RecruiterToggle({ enabled, onToggle }: RecruiterToggleProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onToggle}
      className={`flex items-center gap-2 h-9 px-4 text-xs tracking-widest uppercase rounded-sm border transition-colors ${
        enabled
          ? "bg-[#2563eb] border-[#2563eb] text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]"
          : "bg-transparent border-white/15 text-white/60 hover:border-white/30 hover:text-white"
      }`}
    >
      {enabled ? <Eye size={13} /> : <Briefcase size={13} />}
      Recruiter {enabled ? "ON" : "OFF"}
    </motion.button>
  );
}
