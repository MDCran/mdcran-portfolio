"use client";

import React from "react";
import { motion } from "framer-motion";
import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
}

export default function PageHeader({
  eyebrow,
  title,
  description,
  breadcrumbs,
  actions,
}: PageHeaderProps) {
  return (
    <div className="pt-28 sm:pt-32 pb-12 sm:pb-14 border-b border-white/6">
      <div className="content-container">
        {/* Breadcrumbs */}
        {breadcrumbs && (
          <motion.nav
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="flex flex-wrap items-center gap-2 mb-7 sm:mb-8 text-[11px] text-white/30"
          >
            <Link href="/" className="hover:text-white/60 transition-colors flex items-center gap-1">
              <Home size={11} />
            </Link>
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={crumb.label}>
                <ChevronRight size={10} className="text-white/20" />
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="hover:text-white/60 transition-colors tracking-wider uppercase break-words"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-white/50 tracking-wider uppercase break-words">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </motion.nav>
        )}

        <div className="flex items-start sm:items-end justify-between flex-wrap gap-5 sm:gap-6">
          <div className="min-w-0">
            {eyebrow && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.05 }}
                className="flex items-center gap-3 mb-4"
              >
                <div className="h-px w-8 bg-[#ef4242]" />
                <span className="text-[#ef4242] text-[11px] tracking-[0.25em] uppercase">
                  {eyebrow}
                </span>
              </motion.div>
            )}
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="font-nord text-3xl sm:text-4xl md:text-5xl text-white tracking-wider"
            >
              {title}
            </motion.h1>
            {description && (
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-4 text-sm md:text-[15px] text-white/40 max-w-2xl leading-relaxed"
              >
                {description}
              </motion.p>
            )}
          </div>
          {actions && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              {actions}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
