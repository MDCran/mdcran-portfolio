"use client";

import { useEffect, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ExternalLink, LogOut, Menu, X } from "lucide-react";
import AdminNavigation from "./AdminNavigation";
import { adminNavigationItems, adminSectionDescriptions, adminSectionTitles, type AdminSection } from "@/lib/admin-navigation";
import styles from "./AdminShell.module.css";

export default function AdminShell({ activeSection, onNavigate, onLogout, unreadMessages, search, children }: {
  activeSection: AdminSection;
  onNavigate: (section: AdminSection) => void;
  onLogout: () => void;
  unreadMessages: number;
  search: ReactNode;
  children: ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) setDrawerOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  const navigate = (section: AdminSection) => {
    onNavigate(section);
    setDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const group = adminNavigationItems.find(item => item.key === activeSection)?.group;
  const footer = <div className={styles.sidebarFooter}>
    <a href="/" target="_blank" rel="noopener noreferrer"><ExternalLink size={16} aria-hidden="true" /> View live site <span className="sr-only">(opens in a new tab)</span></a>
    <button type="button" onClick={onLogout}><LogOut size={16} aria-hidden="true" /> Log out</button>
  </div>;

  return <div className={styles.shell}>
    <a href="#admin-page-content" className={styles.skipLink}>Skip to page content</a>
    <aside className={styles.sidebar} aria-label="Admin workspace">
      <div className={styles.brand}>MDCran<span>.admin</span><small>Website workspace</small></div>
      <AdminNavigation activeSection={activeSection} onNavigate={navigate} unreadMessages={unreadMessages} />
      {footer}
    </aside>
    <div className={styles.workspace}>
      <header className={styles.toolbar}>
        <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
          <Dialog.Trigger type="button" className={styles.menuButton} aria-label="Open admin navigation"><Menu size={20} aria-hidden="true" /><span>Menu</span></Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className={styles.drawerOverlay} />
            <Dialog.Content className={styles.drawer}>
              <div className={styles.drawerHeading}>
                <Dialog.Title className={styles.drawerTitle}>Admin navigation</Dialog.Title>
                <Dialog.Close type="button" className={styles.closeButton} aria-label="Close admin navigation"><X size={20} aria-hidden="true" /></Dialog.Close>
              </div>
              <Dialog.Description className="sr-only">Choose a page to manage your website. Press Escape to close this menu.</Dialog.Description>
              <AdminNavigation activeSection={activeSection} onNavigate={navigate} unreadMessages={unreadMessages} />
              {footer}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        <div className={styles.search}>{search}</div>
        <a href="/" target="_blank" rel="noopener noreferrer" className={styles.liveLink}>Live site <ExternalLink size={14} aria-hidden="true" /><span className="sr-only">(opens in a new tab)</span></a>
      </header>
      <main id="admin-page-content" tabIndex={-1} className={styles.content}>
        <div className={styles.pageHeading}>
          <p className={styles.eyebrow}>{group}</p>
          <h1>{adminSectionTitles[activeSection]}</h1>
          <p className={styles.description}>{adminSectionDescriptions[activeSection]}</p>
        </div>
        {children}
      </main>
    </div>
  </div>;
}
