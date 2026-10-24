"use client";

import { useEffect, useRef } from "react";
import { Activity, BarChart3, Bot, CalendarCheck, Check, Database, Eye, FileText, FileUser, Fingerprint, FolderKanban, GitMerge, HardDrive, LayoutDashboard, Mail, MessageCircle, MessageSquare, Monitor, Send, Settings2, ShieldAlert, TrendingUp, Users, Wine, Zap, type LucideIcon } from "lucide-react";
import { adminNavigationGroups, adminSectionPath, adminSectionTitles, type AdminSection } from "@/lib/admin-navigation";
import styles from "./AdminShell.module.css";

const icons: Record<AdminSection, LucideIcon> = {
  dashboard: LayoutDashboard, projects: FolderKanban, articles: FileText, clients: Users,
  "r2-assets": HardDrive, "site-content": Settings2, resume: FileUser, analytics: BarChart3,
  sessions: Monitor, contacts: Mail, "rate-limits": ShieldAlert, ai: Bot,
  "contact-form-entries": MessageSquare, campaigns: Send, rizz: Zap, bar: Wine,
  visitors: Eye, booking: CalendarCheck, identities: Fingerprint, crossdevice: GitMerge,
  traffic: TrendingUp, status: Activity, database: Database, discord: MessageCircle,
  "content-studio": FileText, "content-health": Check, publishing: Send, operations: Activity,
};

export default function AdminNavigation({ activeSection, onNavigate, unreadMessages = 0 }: {
  activeSection: AdminSection;
  onNavigate: (section: AdminSection) => void;
  unreadMessages?: number;
}) {
  const navigationRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const navigation = navigationRef.current;
    const selected = navigation?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!navigation || !selected || navigation.clientHeight === 0) return;
    const navBounds = navigation.getBoundingClientRect();
    const itemBounds = selected.getBoundingClientRect();
    // Scroll this menu only; never move the editor or the page underneath it.
    if (itemBounds.top < navBounds.top) navigation.scrollTop -= navBounds.top - itemBounds.top + 12;
    else if (itemBounds.bottom > navBounds.bottom) navigation.scrollTop += itemBounds.bottom - navBounds.bottom + 12;
  }, [activeSection]);

  return <nav ref={navigationRef} aria-label="Admin sections" className={styles.navigation}>
    {adminNavigationGroups.map(group => <div key={group.label} className={styles.group}>
      <p className={styles.groupLabel}>{group.label}</p>
      <ul className={styles.list}>
        {group.items.map(section => {
          const Icon = icons[section];
          return <li key={section}>
            <a href={adminSectionPath(section)} aria-current={section === activeSection ? "page" : undefined}
              className={styles.navLink}
              onClick={event => {
                if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                onNavigate(section);
              }}>
              <Icon size={17} aria-hidden="true" />
              <span>{adminSectionTitles[section]}</span>
              {section === "contact-form-entries" && unreadMessages > 0 && <span className={styles.badge} aria-label={`${unreadMessages} unread messages`}>{unreadMessages}</span>}
            </a>
          </li>;
        })}
      </ul>
    </div>)}
  </nav>;
}
