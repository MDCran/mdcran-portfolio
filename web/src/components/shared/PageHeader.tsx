"use client";

import React from "react";
import { motion } from "framer-motion";
import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/lib/ThemeContext";

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
  const { themeInfo } = useTheme();
  const isLight = themeInfo.id === "light";
  const crumbBase = isLight ? 'rgba(0,0,0,0.45)' : 'color-mix(in srgb, var(--theme-text, #fff) 30%, transparent)';
  const crumbHover = isLight ? 'rgba(0,0,0,0.7)' : 'color-mix(in srgb, var(--theme-text, #fff) 60%, transparent)';
  const crumbActive = isLight ? 'rgba(0,0,0,0.6)' : 'color-mix(in srgb, var(--theme-text, #fff) 50%, transparent)';
  const crumbChevron = isLight ? 'rgba(0,0,0,0.3)' : 'color-mix(in srgb, var(--theme-text, #fff) 20%, transparent)';

  return (
    <div className="pt-28 sm:pt-32 pb-12 sm:pb-14 border-b" style={{ borderColor: 'color-mix(in srgb, var(--theme-text, #fff) 6%, transparent)' }}>
      <div className="content-container">
        {/* Breadcrumbs */}
        {breadcrumbs && (
          <motion.nav
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="flex flex-wrap items-center gap-2 mb-7 sm:mb-8 text-[11px]"
            style={{ color: crumbBase }}
          >
            <Link
              href="/"
              className="transition-colors flex items-center gap-1"
              style={{ color: crumbBase }}
              onMouseEnter={(e) => { e.currentTarget.style.color = crumbHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = crumbBase; }}
            >
              <Home size={11} />
            </Link>
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={crumb.label}>
                <ChevronRight size={10} style={{ color: crumbChevron }} />
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="transition-colors tracking-wider uppercase break-words"
                    style={{ color: crumbBase }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = crumbHover; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = crumbBase; }}
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="tracking-wider uppercase break-words" style={{ color: crumbActive }}>{crumb.label}</span>
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
                <div className="h-px w-8 bg-[var(--cranberry)]" />
                <span className="text-[var(--cranberry)] text-[11px] tracking-[0.25em] uppercase">
                  {eyebrow}
                </span>
              </motion.div>
            )}
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="font-nord text-3xl sm:text-4xl md:text-5xl tracking-wider"
              style={{ color: 'var(--theme-text, #fff)' }}
            >
              {title}
            </motion.h1>
            {description && (
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-4 text-sm md:text-[15px] max-w-2xl leading-relaxed"
                style={{ color: 'color-mix(in srgb, var(--theme-text, #fff) 40%, transparent)' }}
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
