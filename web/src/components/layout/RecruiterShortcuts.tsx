"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export default function RecruiterShortcuts() {
  const path = usePathname();
  if (!["/", "/engineering", "/resume", "/work"].includes(path)) return null;
  return (
    <nav
      aria-label="Recruiter shortcuts"
      className="print:hidden border-b border-white/10 bg-[#0c0c0e] px-4 py-3 text-xs text-white/65"
    >
      <div className="content-container flex items-center gap-5 overflow-x-auto whitespace-nowrap sm:justify-center">
        <span className="text-white/40">Quick review</span>
        <Link
          aria-current={path === "/resume" ? "page" : undefined}
          className="hover:text-white"
          href="/resume"
        >
          Resume
        </Link>
        <Link className="hover:text-white" href="/engineering#projects">
          Top projects
        </Link>
        <Link className="hover:text-white" href="/engineering#role-match">
          Match a role
        </Link>
        <a className="hover:text-white" href="https://github.com/MDCran">
          GitHub
        </a>
        <Link className="hover:text-white" href="/contact">
          Contact
        </Link>
      </div>
    </nav>
  );
}
