"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, FolderCode, Crosshair, Github, Mail } from "lucide-react";
import styles from "./RecruiterShortcuts.module.css";

const shortcuts = [
  { label: "Resume", href: "/resume", icon: FileText },
  { label: "Top projects", href: "/engineering#projects", icon: FolderCode },
  { label: "Match a role", href: "/engineering#role-match", icon: Crosshair },
  { label: "GitHub", href: "https://github.com/MDCran", icon: Github },
  { label: "Contact", href: "/contact", icon: Mail },
];

export default function RecruiterShortcuts() {
  const path = usePathname();
  if (!["/", "/engineering", "/resume", "/work"].includes(path)) return null;
  return (
    <nav
      aria-label="Recruiter shortcuts"
      className={`${styles.bar} print:hidden`}
    >
      <div className={`content-container ${styles.inner}`}>
        <span className={styles.label}>Quick review</span>
        <div className={styles.links}>
          {shortcuts.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={styles.link}
              aria-current={path === href ? "page" : undefined}
            >
              <Icon size={13} strokeWidth={1.75} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
