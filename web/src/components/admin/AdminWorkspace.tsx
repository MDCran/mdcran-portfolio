"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { adminRequest, AdminRequestError, recordVersion, recordId, removedRecords, contentSignature } from "@/lib/admin-client";
import { useSWRConfig } from "swr";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell } from "recharts";
import TapsChart from "@/components/admin/TapsChart";
import SpotifyConnection from "@/components/admin/SpotifyConnection";
import { R2StatsBar, R2AssetDetailPanel } from "@/components/admin/R2AssetDetail";

import DatePicker from "@/components/shared/DatePicker";
import IdentityDetail from "@/components/admin/IdentityDetail";
import IdentityPicker from "@/components/admin/IdentityPicker";
import { useConfirm } from "@/components/admin/ConfirmModal";
import UtmLinkGenerator from "@/components/admin/UtmLinkGenerator";

import type { Project, Article, Client, Experience, Education, Skill, Certification, Award, ClubMembership, SiteContent, ResumeProfile, SkillCategoryMeta, EducationProgram, Identity } from "@/lib/types";
import { DEGREE_LEVELS, RESUME_SECTIONS, RESUME_SECTION_LABELS } from "@/lib/types";
import CountryFlag from "@/components/shared/CountryFlag";
import { defaultSiteContent } from "@/lib/site-content";
import { SkillIcon } from "@/lib/skill-icons";
import { assetUrl } from "@/lib/utils";
import { LayoutDashboard, FolderKanban, FileText, Users, HardDrive, Settings2, FileUser, BarChart3, Monitor, Mail, ShieldAlert, Bot, MessageSquare, Send, Zap, Wine, Eye, CalendarCheck, Fingerprint, GitMerge, TrendingUp, Activity, Database, MessageCircle, Menu, X, ChevronDown, Globe, ArrowLeft, Pencil, Check, Trash2, Link2, Loader2 } from "lucide-react";

import { ContentStudio, OperationsCenter, BackupManager, PublishingStudio, AIStudio, ContentHealth, AnalyticsDashboard, SessionsControl, BookingAdmin, IdentitiesAdmin, DeviceCandidates, DiscordSettings, AiRoutingConditions, RizzSettings, RizzSubmissions, Contact, RateLimit, RizzEntry, Campaign, MetricsAuditTarget, MetricsAuditResponse, R2BrowserFile, R2BrowserFolder, R2BrowserResponse, NavSection, DEFAULT_RESUME_PROFILE, PROJECT_VIEWS_AUDIT_CACHE_KEY, PROJECT_VIEWS_REFRESH_INTERVAL_MS, uid, toEditableImageAsset, fmtDate, fmtDateTime, fmtDayLabel, formatBytes, isImageAssetFile, r2DisplayName, formatContactSource, formatRateLimitScope, campaignDeliveredCount, compareStrings, compareDates, humanizeChoiceList, DragReorderList, arrayMove, inputCls, textareaCls, btnRed, btnGhost, btnOutlineRed, btnOutline, Label, StringChipEditor, ActionLinkListEditor, Modal, IconPickerButton, DeleteDialog, PricingBadge, CampaignStatusBadge, SeedDatabaseCard } from './AdminShared';
const ProjectModal = dynamic(() => import('./ProjectModal'));
const ArticleModal = dynamic(() => import('./ArticleModal'));
const ClientModal = dynamic(() => import('./ClientModal'));
const CampaignModal = dynamic(() => import('./CampaignModal'));
const CampaignViewModal = dynamic(() => import('./CampaignViewModal'));
const ContactEditorModal = dynamic(() => import('./ContactEditorModal'));
const R2ImagePickerModal = dynamic(() => import('./R2ImagePickerModal'));
const AssetUsage = dynamic(() => import("./AssetUsage"));
export default function AdminDashboard({ initialSection = "dashboard" }: { initialSection?: string }) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [activeSection, setActiveSection] = useState<NavSection>(initialSection as NavSection);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [saveNotice, setSaveNotice] = useState<{state: "saving" | "saved" | "failed"; message: string} | null>(null);
  const savingRef = useRef(false);
  const retrySaveRef = useRef<null | (() => Promise<void>)>(null);
  const resumeBaselineRef = useRef<Record<string, Record<string, unknown>[]>>({});
  const resumeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const siteVersionRef = useRef(0);
  const siteSavedSignatureRef = useRef("");
  const resumeSavedSignatureRef = useRef("");
  const siteQueueRef = useRef<Promise<void>>(Promise.resolve());
  const resumeLatestSignatureRef = useRef("");
  const siteLatestSignatureRef = useRef("");
  const resumeRetryRef = useRef<null | (() => Promise<void>)>(null);
  const siteRetryRef = useRef<null | (() => Promise<void>)>(null);
  const resumePendingRef = useRef(0);
  const sitePendingRef = useRef(0);
  async function runSave(label: string, operation: () => Promise<void>) {
    if (savingRef.current) return;
    savingRef.current = true;
    retrySaveRef.current = () => runSave(label, operation);
    setSaveNotice({state:"saving", message:`Saving ${label}…`});
    try { await operation(); setSaveNotice({state:"saved", message:`${label} saved.`}); retrySaveRef.current=null; }
    catch(error) { setSaveNotice({state:"failed",message:error instanceof Error ? error.message : "Save failed. Your edits are still here."}); }
    finally { savingRef.current=false; }
  }


  /* ── Identity detail sub-view (inline within the Identities section) ── */
  const { confirm: confirmIdentity, modal: identityModal } = useConfirm();
  const [identityDetailId, setIdentityDetailId] = useState<string | null>(null);
  const [allIdentities, setAllIdentities] = useState<Identity[]>([]);
  const [identityDetailEditing, setIdentityDetailEditing] = useState(false);
  const [identityDetailEditName, setIdentityDetailEditName] = useState("");
  const [identityDetailCopied, setIdentityDetailCopied] = useState(false);
  const [identityDetailBusy, setIdentityDetailBusy] = useState(false);

  const loadAllIdentities = useCallback(async () => {
    const d = await fetch("/api/admin/identities").then((r) => r.ok ? r.json() : null).catch(() => null);
    if (d?.identities) setAllIdentities(d.identities);
  }, []);

  useEffect(() => { if (activeSection === "identities") loadAllIdentities(); }, [activeSection, loadAllIdentities]);

  const identityDetailRecord = allIdentities.find((i) => i.id === identityDetailId) ?? null;

  const renameIdentityDetail = async () => {
    if (!identityDetailId || !identityDetailEditName.trim()) return;
    setIdentityDetailBusy(true);
    await adminRequest("/api/admin/identities", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: identityDetailId, name: identityDetailEditName.trim() }) });
    setIdentityDetailEditing(false);
    await loadAllIdentities();
    setIdentityDetailBusy(false);
  };
  const deleteIdentityDetail = async () => {
    if (!identityDetailId || !identityDetailRecord) return;
    if (!(await confirmIdentity({ title: "Delete this identity?", body: "This permanently removes the identity record.", confirmLabel: "Delete", danger: true }))) return;
    setIdentityDetailBusy(true);
    await adminRequest("/api/admin/identities", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: identityDetailId }) });
    setIdentityDetailId(null);
    await loadAllIdentities();
    setIdentityDetailBusy(false);
  };
  const mergeIdentityDetailInto = async (targetId: string) => {
    if (!identityDetailId) return;
    const tgt = allIdentities.find((i) => i.id === targetId);
    if (!(await confirmIdentity({ title: `Merge into "${tgt?.name}"?`, body: `All of this identity's devices and activity move into "${tgt?.name}", and this identity is deleted.`, confirmLabel: "Merge", danger: true }))) return;
    setIdentityDetailBusy(true);
    await adminRequest("/api/admin/identities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "merge", targetId, sourceIds: [identityDetailId] }) });
    setIdentityDetailId(targetId);
    await loadAllIdentities();
    setIdentityDetailBusy(false);
  };
  const copyIdentityDetailLink = () => {
    navigator.clipboard.writeText(`https://mdcran.com/?identity=${identityDetailId}`).then(() => { setIdentityDetailCopied(true); setTimeout(() => setIdentityDetailCopied(false), 1500); }).catch(() => {});
  };

  /* ── Deep-link each section via URL hash (#projects, #resume, …) ── */
  useEffect(() => {
    const VALID_SECTIONS: NavSection[] = [
      "dashboard", "projects", "articles", "clients", "r2-assets", "site-content",
      "resume", "analytics", "sessions", "contacts", "rate-limits", "ai", "contact-form-entries", "campaigns",
      "rizz", "bar", "visitors", "booking", "identities", "crossdevice", "traffic", "status", "database", "discord", "content-studio", "operations", "publishing", "content-health",
    ];
    const applyHash = () => {
      const hash = window.location.hash.replace(/^#/, "") || window.location.pathname.split("/").filter(Boolean)[2] || "dashboard";
      if ((VALID_SECTIONS as string[]).includes(hash)) setActiveSection(hash as NavSection);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    window.addEventListener("popstate", applyHash);
    return () => { window.removeEventListener("hashchange", applyHash); window.removeEventListener("popstate", applyHash); };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const target = activeSection === "dashboard" ? "/admin/dashboard" : `/admin/dashboard/${activeSection}`;
    if (window.location.pathname !== target || window.location.hash) window.history.pushState(null, "", target);
  }, [activeSection]);

  /* ── Data state ── */
  const [projects, setProjects] = useState<Project[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [siteContent, setSiteContent] = useState<SiteContent>(defaultSiteContent);
  const [siteContentAutoSaved, setSiteContentAutoSaved] = useState(false);
  const siteContentAutoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const siteContentInitializedRef = useRef(false);
  const [siteContentImageTarget, setSiteContentImageTarget] = useState<null | "brandLogoUrl" | "faviconUrl">(null);
  const [r2Folders, setR2Folders] = useState<R2BrowserFolder[]>([]);
  const [r2Files, setR2Files] = useState<R2BrowserFile[]>([]);
  const [r2Prefix, setR2Prefix] = useState("");
  const [r2Search, setR2Search] = useState("");
  const [r2Mode, setR2Mode] = useState<"browse" | "search">("browse");
  const [r2Loading, setR2Loading] = useState(false);
  const [r2Uploading, setR2Uploading] = useState(false);
  const [r2Loaded, setR2Loaded] = useState(false);
  const [r2Error, setR2Error] = useState("");
  const [r2CopiedUrl, setR2CopiedUrl] = useState("");
  const [r2PreviewFile, setR2PreviewFile] = useState<R2BrowserFile | null>(null);
  const [r2DragOver, setR2DragOver] = useState(false);
  const [r2DragFile, setR2DragFile] = useState<R2BrowserFile | null>(null);
  const [r2DropTarget, setR2DropTarget] = useState<string | null>(null);
  const [r2RenameTarget, setR2RenameTarget] = useState<R2BrowserFile | null>(null);
  const [r2RenameValue, setR2RenameValue] = useState("");
  const [r2Renaming, setR2Renaming] = useState(false);
  const [r2NewFolderName, setR2NewFolderName] = useState("");
  const [r2CreatingFolder, setR2CreatingFolder] = useState(false);
  const [r2ShowNewFolder, setR2ShowNewFolder] = useState(false);
  const r2CopyResetRef = useRef<number | null>(null);
  const r2FileInputRef = useRef<HTMLInputElement | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [analyticsOverview, setAnalyticsOverview] = useState<{
    activeNow: number;
    sessionsToday: number;
    totalVisits: number;
    totalPageviews: number;
    topBrowsers: { name: string; count: number }[];
    topOS: { name: string; count: number }[];
    topCountries: { name: string; count: number; code?: string }[];
    windows: { label: string; visits: number }[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics/overview")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setAnalyticsOverview(data); })
      .catch(() => {});
  }, []);

  const [rateLimits, setRateLimits] = useState<RateLimit[]>([]);
  const [chatRateLimitConfig, setChatRateLimitConfig] = useState<{ _version?: number; rateLimit: number; rateWindowHours: number; extraContext?: string }>({ rateLimit: 10, rateWindowHours: 24, extraContext: "" });
  const [chatSaving, setChatSaving] = useState(false);
  async function saveChatConfiguration() {
    if (chatSaving) return;
    const submitted = chatRateLimitConfig;
    setChatSaving(true);
    try {
      await runSave("AI configuration", async () => {
        const result = await adminRequest<{ config: typeof chatRateLimitConfig }>("/api/chat", { method: "PUT", body: JSON.stringify(submitted) });
        setChatRateLimitConfig(current => JSON.stringify(current) === JSON.stringify(submitted) ? result.config : { ...current, _version: result.config._version });
      });
    } finally { setChatSaving(false); }
  }
  const [chatRateLimitEntries, setChatRateLimitEntries] = useState<{ ip: string; count: number; resetAt: string }[]>([]);
  const [chatSecurity, setChatSecurity] = useState<{ total: number; last7Days: number; byCategory: Record<string, number> } | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [rizzEntries, setRizzEntries] = useState<RizzEntry[]>([]);
  const [tapCounts, setTapCounts] = useState<Record<string, number>>({});
  const [hydrated, setHydrated] = useState(false);
  const [projectViewsAuditLog, setProjectViewsAuditLog] = useState<string[]>([
    "Press Refresh to scan each linked project video.",
  ]);
  const [projectViewsRefreshing, setProjectViewsRefreshing] = useState(false);
  const [projectViewsAuditSummary, setProjectViewsAuditSummary] = useState<{
    totalProjectViews: number;
    refreshedAt?: string;
  } | null>(null);
  const projectViewsAutoRefreshRef = useRef<() => void>(() => {});
  const [tapEditorType, setTapEditorType] = useState<"project" | "article">("project");
  const [tapEditorTargetId, setTapEditorTargetId] = useState("");
  const [tapEditorCount, setTapEditorCount] = useState("");
  const [tapEditorSaving, setTapEditorSaving] = useState(false);

  /* ── Resume state ── */
  const [resumeLoaded, setResumeLoaded] = useState(false);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [educations, setEducations] = useState<Education[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [clubs, setClubs] = useState<ClubMembership[]>([]);
  const [resumeProfile, setResumeProfile] = useState<ResumeProfile>(DEFAULT_RESUME_PROFILE);
  const [skillCategories, setSkillCategories] = useState<SkillCategoryMeta[]>([]);
  const [resumePdfPickerOpen, setResumePdfPickerOpen] = useState(false);
  const [resumeLogoTarget, setResumeLogoTarget] = useState<
    | { list: "experiences" | "educations" | "certifications" | "awards" | "clubs"; index: number }
    | { list: "program"; index: number; programIndex: number }
    | null
  >(null);
  const [resumeSaving, setResumeSaving] = useState(false);
  const [resumeAutoSaved, setResumeAutoSaved] = useState(false);
  const resumeAutoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeInitializedRef = useRef(false);
  const [draggedResumeItem, setDraggedResumeItem] = useState<{
    list: "experiences" | "educations" | "skills" | "skillCategories" | "certifications" | "awards" | "clubs";
    index: number;
  } | null>(null);

  /* ── Filters ── */
  const [projectSearch, setProjectSearch] = useState("");
  const [projectCategoryFilter, setProjectCategoryFilter] = useState("");
  const [projectSort, setProjectSort] = useState<"newest" | "oldest" | "az" | "za" | "category">("newest");
  const [articleSearch, setArticleSearch] = useState("");
  const [articleSort, setArticleSort] = useState<"newest" | "oldest" | "az" | "za">("newest");
  const [clientSearch, setClientSearch] = useState("");
  const [clientSort, setClientSort] = useState<"az" | "za" | "newest" | "oldest">("az");
  const [resumeSearch, setResumeSearch] = useState("");
  const [contactsSearch, setContactsSearch] = useState("");
  const [contactsSort, setContactsSort] = useState<"newest" | "oldest" | "az" | "za">("newest");
  const [rateLimitSearch, setRateLimitSearch] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [messagesSort, setMessagesSort] = useState<"newest" | "oldest" | "az" | "za" | "read" | "unread">("newest");
  const [rizzSearch, setRizzSearch] = useState("");
  const [rizzSort, setRizzSort] = useState<"newest" | "oldest" | "az" | "za">("newest");
  const [adminSearch, setAdminSearch] = useState("");
  const [adminSearchFocused, setAdminSearchFocused] = useState(false);
  const adminSearchInputRef = useRef<HTMLInputElement | null>(null);
  const filtersReadyRef=useRef(false);
  useEffect(()=>{
    try{const saved=JSON.parse(localStorage.getItem("mdcran_admin_views")??"{}");if(typeof saved.projectSearch==="string")setProjectSearch(saved.projectSearch);if(typeof saved.projectCategoryFilter==="string")setProjectCategoryFilter(saved.projectCategoryFilter);if(typeof saved.articleSearch==="string")setArticleSearch(saved.articleSearch);if(typeof saved.clientSearch==="string")setClientSearch(saved.clientSearch);}catch{}
    filtersReadyRef.current=true;
  },[]);
  useEffect(()=>{if(filtersReadyRef.current)try{localStorage.setItem("mdcran_admin_views",JSON.stringify({projectSearch,projectCategoryFilter,articleSearch,clientSearch}));}catch{}},[projectSearch,projectCategoryFilter,articleSearch,clientSearch]);


  useEffect(() => {
    document.querySelector('nav[aria-label="Admin sections"] [aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeSection]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const dialog = document.querySelector<HTMLElement>('[aria-label="Admin navigation"]');
    dialog?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
      if (event.key !== "Tab" || !dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>("button, a[href]"));
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const onResize = () => { if (window.innerWidth >= 768) setMobileNavOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, [mobileNavOpen]);

  // Command-palette shortcut for the global admin search. It keeps navigation,
  // content lookup, and quick section changes equally fast on macOS and Windows.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      adminSearchInputRef.current?.focus();
      setAdminSearchFocused(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  /* ── Modal state ── */
  const [projectModal, setProjectModal] = useState<{ open: boolean; editing?: Project }>({ open: false });
  const [articleModal, setArticleModal] = useState<{ open: boolean; editing?: Article }>({ open: false });
  const [clientModal, setClientModal] = useState<{ open: boolean; editing?: Client }>({ open: false });
  const [campaignModal, setCampaignModal] = useState<{ open: boolean; editing?: Campaign }>({ open: false });
  const [campaignView, setCampaignView] = useState<Campaign | null>(null);
  const [contactModal, setContactModal] = useState<{ open: boolean; editing?: Contact | null }>({ open: false });

  /* ── Delete confirm ── */
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "project" | "article" | "client" | "contact" | "campaign" | "rizz" | "r2"; id: string; label: string } | null>(null);

  /* Load each workspace on demand; a failed request remains retryable. */
  const loadedDataRef=useRef(new Set<string>());
  const loadingDataRef=useRef(new Set<string>());
  useEffect(()=>{
    const need:Record<string,string[]>={
      dashboard:["projects","articles","clients","contacts","taps"],
      projects:["projects","clients","taps"],articles:["articles","taps"],clients:["clients","projects"],
      resume:["projects","clients"],"site-content":["site-content","projects","articles","clients"],bar:["site-content"],contacts:["contacts"],"contact-form-entries":["contacts"],campaigns:["campaigns","contacts"],rizz:["rizz"],"rate-limits":["rate-limits"],ai:["chat"],
    };
    const setters:Record<string,(data:never)=>void>={projects:setProjects,articles:setArticles,clients:setClients,contacts:setContacts,campaigns:setCampaigns,rizz:setRizzEntries,"rate-limits":setRateLimits};
    const keys=(need[activeSection]??[]).filter(key=>!loadedDataRef.current.has(key)&&!loadingDataRef.current.has(key));
    keys.forEach(key=>loadingDataRef.current.add(key));
    void Promise.allSettled(keys.map(async key=>{
      try{
        const data=await adminRequest<unknown>(key==="chat"?"/api/chat":`/api/admin/${key}`);
        if(key==="site-content"){siteVersionRef.current=recordVersion(data);siteSavedSignatureRef.current=contentSignature(data);setSiteContent(data as SiteContent);siteContentInitializedRef.current=true;}
        else if(key==="taps")setTapCounts(Object.fromEntries((data as {id:string;count?:number}[]).map(item=>[item.id,item.count??0])));
        else if(key==="chat"){const chat=data as {config:typeof chatRateLimitConfig;entries:typeof chatRateLimitEntries;security:typeof chatSecurity};setChatRateLimitConfig(chat.config);setChatRateLimitEntries(chat.entries);setChatSecurity(chat.security??null);}
        else setters[key]?.(data as never);
        loadedDataRef.current.add(key);
      }catch(error){setSaveNotice({state:"failed",message:error instanceof Error?error.message:`Unable to load ${key}.`});}
      finally{loadingDataRef.current.delete(key);}
    })).then(()=>setHydrated(true));
  },[activeSection]);

  useEffect(()=>{
    if(activeSection!=="campaigns")return;
    const timer=setInterval(()=>{void adminRequest<Campaign[]>("/api/admin/campaigns").then(setCampaigns).catch(()=>{});},30000);
    return ()=>clearInterval(timer);
  },[activeSection]);

  const projectViewsLastRefresh = projectViewsAuditSummary?.refreshedAt;

  useEffect(() => {
    if (!hydrated || activeSection !== "dashboard") {
      return;
    }

    const lastRefresh = projectViewsLastRefresh ? new Date(projectViewsLastRefresh).getTime() : 0;

    if (!lastRefresh || Date.now() - lastRefresh >= PROJECT_VIEWS_REFRESH_INTERVAL_MS) {
      projectViewsAutoRefreshRef.current();
    }

    const interval = window.setInterval(() => {
      projectViewsAutoRefreshRef.current();
    }, PROJECT_VIEWS_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [hydrated, projectViewsLastRefresh, activeSection]);

  function getProjectHref(project: Project): string {
    if (project.category === "coding-projects") {
      return `/engineering#project-${project.slug}`;
    }

    if (project.category === "arts-and-entertainment") {
      if (project.subcategory === "events") {
        return `/arts-and-entertainment/events/${project.slug}`;
      }
      return `/arts-and-entertainment/minecraft-maps/${project.slug}`;
    }

    if (project.category === "motion-and-graphics") {
      if (project.subcategory === "video-editing") {
        return `/motion-and-graphics/video-editing/${project.slug}`;
      }
      if (project.subcategory === "web-dev-design") {
        return `/motion-and-graphics/web-dev-design/${project.slug}`;
      }
      return `/motion-and-graphics/thumbnail-design/${project.slug}`;
    }

    return `/work`;
  }

  const tapTargets = [
    ...projects.map((project) => ({
      id: project.id,
      label: project.title,
      type: "project" as const,
    })),
    ...articles.map((article) => ({
      id: article.id,
      label: article.title,
      type: "article" as const,
    })),
  ].sort((a, b) => compareStrings(a.label, b.label, "asc"));

  const filteredTapTargets = tapTargets.filter((target) => target.type === tapEditorType);

  useEffect(() => {
    if (filteredTapTargets.length === 0) {
      setTapEditorTargetId("");
      setTapEditorCount("");
      return;
    }

    if (!filteredTapTargets.some((target) => target.id === tapEditorTargetId)) {
      const firstTarget = filteredTapTargets[0];
      setTapEditorTargetId(firstTarget.id);
      setTapEditorCount(String(tapCounts[firstTarget.id] ?? 0));
    }
  }, [filteredTapTargets, tapEditorTargetId, tapCounts]);

  async function saveTapOverride() {
    if (!tapEditorTargetId) return;

    const nextCount = Math.max(0, Number(tapEditorCount.replace(/[^\d]/g, "") || 0));
    setTapEditorSaving(true);

    try {
      const response = await fetch("/api/admin/taps", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: tapEditorTargetId,
          type: tapEditorType,
          count: nextCount,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }

      setTapCounts((prev) => ({ ...prev, [tapEditorTargetId]: nextCount }));
      setTapEditorCount(String(nextCount));
      void mutate("/api/admin/analytics");
    } catch (error) {
      console.error(error);
    } finally {
      setTapEditorSaving(false);
    }
  }

  /* ── Resume section lazy-load ── */
  useEffect(() => {
    if (activeSection !== "resume" || resumeLoaded) return;
    const controller = new AbortController();
    adminRequest<{experiences:Experience[];educations:Education[];skills:Skill[];certifications:Certification[];awards:Award[];clubs:ClubMembership[];profile:ResumeProfile;skillCategories:SkillCategoryMeta[];[key:string]:unknown}>("/api/admin/resume", { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        if (!data || ["experiences", "educations", "skills", "certifications", "awards", "clubs", "skillCategories"].some((key) => !Array.isArray(data[key])) || !data.profile || typeof data.profile !== "object") throw new Error("Invalid resume response");
        {
          resumeSavedSignatureRef.current=contentSignature({experiences:data.experiences??[],educations:data.educations??[],skills:data.skills??[],certifications:data.certifications??[],awards:data.awards??[],clubs:data.clubs??[],profile:{...DEFAULT_RESUME_PROFILE,...(data.profile??{})},skillCategories:data.skillCategories??[]});
          resumeBaselineRef.current = Object.fromEntries(["experiences","educations","skills","certifications","awards","clubs","skillCategories"].map(key => [key,data[key] as Record<string, unknown>[]]));
          resumeBaselineRef.current.resumeProfile = [data.profile as unknown as Record<string, unknown>];
          setExperiences(data.experiences ?? []);
          setEducations(data.educations ?? []);
          setSkills(data.skills ?? []);
          setCertifications(data.certifications ?? []);
          setAwards(data.awards ?? []);
          setClubs(data.clubs ?? []);
          setResumeProfile({ ...DEFAULT_RESUME_PROFILE, ...(data.profile ?? {}) });
          setSkillCategories(data.skillCategories ?? []);
        }
        setResumeLoaded(true);
        resumeInitializedRef.current = true;
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        retrySaveRef.current = null;
        setSaveNotice({state:"failed",message:"Resume could not be loaded. Reload before editing."});
      });
    return () => controller.abort();
  }, [activeSection, resumeLoaded]);

  // Queue snapshots, retaining edits made while an earlier request is in flight.
  useEffect(() => {
    const signature = contentSignature({ experiences, educations, skills, certifications, awards, clubs, profile: resumeProfile, skillCategories });
    resumeLatestSignatureRef.current = signature;
    resumeRetryRef.current = () => persistResume();
    if (!resumeInitializedRef.current || (signature === resumeSavedSignatureRef.current && resumePendingRef.current === 0)) return;
    const dirtyTimer = window.setTimeout(() => {
      setResumeAutoSaved(false);
      setSaveNotice({ state: "saving", message: "Resume changes waiting to save…" });
    }, 0);
    if (resumeAutoSaveTimerRef.current) clearTimeout(resumeAutoSaveTimerRef.current);
    resumeAutoSaveTimerRef.current = setTimeout(() => void persistResume(), 2000);
    return () => {
      window.clearTimeout(dirtyTimer);
      if (resumeAutoSaveTimerRef.current) clearTimeout(resumeAutoSaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experiences, educations, skills, certifications, awards, clubs, resumeProfile, skillCategories]);

  async function persistResume(next?: {
    experiences?: Experience[];
    educations?: Education[];
    skills?: Skill[];
    certifications?: Certification[];
    awards?: Award[];
    clubs?: ClubMembership[];
    profile?: ResumeProfile;
    skillCategories?: SkillCategoryMeta[];
  }) {
    if (!resumeInitializedRef.current) return;
    const payload = {
      experiences: next?.experiences ?? experiences,
      educations: next?.educations ?? educations,
      skills: next?.skills ?? skills,
      certifications: next?.certifications ?? certifications,
      awards: next?.awards ?? awards,
      clubs: next?.clubs ?? clubs,
      profile: next?.profile ?? resumeProfile,
      skillCategories: next?.skillCategories ?? skillCategories,
    };

    const save = async () => {
      if(contentSignature(payload)===resumeSavedSignatureRef.current)return;
      setResumeSaving(true); setResumeAutoSaved(false);
      const retry = async () => { await resumeRetryRef.current?.(); };
      retrySaveRef.current = retry;
      setSaveNotice({state:"saving",message:"Saving resume…"});
      try {
        const groups = Object.entries(payload).map(([key, value]) => {
          const collection = key === "profile" ? "resumeProfile" : key;
          const before = resumeBaselineRef.current[collection] ?? [];
          const records = (Array.isArray(value) ? value : [value]).map((entry, position) => {
            const record = entry as unknown as Record<string, unknown>;
            const original = before.find(item => recordId(collection,item) === recordId(collection,record));
            return {...record, ...(collection === "resumeProfile" ? {} : {_position:position}), _version:recordVersion(original)};
          });
          return {collection,records,deleted:removedRecords(collection,before,records)};
        });
        const result = await adminRequest<{groups:{collection:string;records:Record<string,unknown>[]}[]}>("/api/admin/content",{method:"PUT",body:JSON.stringify({groups})});
        result.groups.forEach(group => { resumeBaselineRef.current[group.collection]=group.records; });
        resumeSavedSignatureRef.current=contentSignature(payload);
        const latestSaved = resumeLatestSignatureRef.current === resumeSavedSignatureRef.current;
        setResumeAutoSaved(latestSaved);
        setSaveNotice(latestSaved ? {state:"saved",message:"Resume saved."} : {state:"saving",message:"Newer resume changes are waiting to save…"});
        if (retrySaveRef.current === retry) retrySaveRef.current = null;
      } catch(error) { setSaveNotice({state:"failed",message:error instanceof Error ? error.message : "Resume save failed. Your edits are still here."}); }
      finally { setResumeSaving(false); }
    };
    resumePendingRef.current += 1;
    resumeQueueRef.current = resumeQueueRef.current.then(save,save);
    try { await resumeQueueRef.current; }
    finally { resumePendingRef.current -= 1; }
  }

  function handleResumeDrop(
    list: "experiences" | "educations" | "skills" | "skillCategories" | "certifications" | "awards" | "clubs",
    dropIndex: number
  ) {
    if (!draggedResumeItem || draggedResumeItem.list !== list) return;

    const fromIndex = draggedResumeItem.index;
    if (fromIndex === dropIndex) {
      setDraggedResumeItem(null);
      return;
    }

    if (list === "experiences") setExperiences((prev) => arrayMove(prev, fromIndex, dropIndex));
    if (list === "educations") setEducations((prev) => arrayMove(prev, fromIndex, dropIndex));
    if (list === "skills") setSkills((prev) => arrayMove(prev, fromIndex, dropIndex));
    if (list === "skillCategories") setSkillCategories((prev) => arrayMove(prev, fromIndex, dropIndex));
    if (list === "certifications") setCertifications((prev) => arrayMove(prev, fromIndex, dropIndex));
    if (list === "awards") setAwards((prev) => arrayMove(prev, fromIndex, dropIndex));
    if (list === "clubs") setClubs((prev) => arrayMove(prev, fromIndex, dropIndex));

    setDraggedResumeItem(null);
  }

  function toggleExperienceClientLink(experienceIndex: number, clientId: string) {
    setExperiences((prev) =>
      prev.map((experience, index) => {
        if (index !== experienceIndex) return experience;

        const currentClientIds = experience.clientIds ?? [];
        const nextClientIds = currentClientIds.includes(clientId)
          ? currentClientIds.filter((id) => id !== clientId)
          : [...currentClientIds, clientId];

        return {
          ...experience,
          clientIds: nextClientIds.length ? nextClientIds : undefined,
        };
      })
    );
  }

  /* ── Resume logo assignment (shared R2 picker) ── */
  function setResumeLogo(url: string) {
    const t = resumeLogoTarget;
    if (!t) return;
    if (t.list === "experiences") setExperiences((p) => p.map((it, i) => (i === t.index ? { ...it, companyLogo: url || undefined } : it)));
    else if (t.list === "educations") setEducations((p) => p.map((it, i) => (i === t.index ? { ...it, institutionLogo: url || undefined } : it)));
    else if (t.list === "certifications") setCertifications((p) => p.map((it, i) => (i === t.index ? { ...it, issuerLogo: url || undefined } : it)));
    else if (t.list === "awards") setAwards((p) => p.map((it, i) => (i === t.index ? { ...it, logo: url || undefined } : it)));
    else if (t.list === "clubs") setClubs((p) => p.map((it, i) => (i === t.index ? { ...it, logo: url || undefined } : it)));
    else if (t.list === "program") setEducations((p) => p.map((it, i) => (i === t.index ? { ...it, programs: (it.programs ?? []).map((pr, j) => (j === t.programIndex ? { ...pr, logo: url || undefined } : pr)) } : it)));
    setResumeLogoTarget(null);
  }

  /* ── Education programs CRUD + reorder ── */
  function addProgram(eduIndex: number) {
    setEducations((prev) => prev.map((edu, i) => (i === eduIndex ? { ...edu, programs: [...(edu.programs ?? []), { id: uid(), name: "" }] } : edu)));
  }
  function updateProgram(eduIndex: number, progIndex: number, patch: Partial<EducationProgram>) {
    setEducations((prev) => prev.map((edu, i) => (i === eduIndex ? { ...edu, programs: (edu.programs ?? []).map((pr, j) => (j === progIndex ? { ...pr, ...patch } : pr)) } : edu)));
  }
  function removeProgram(eduIndex: number, progIndex: number) {
    setEducations((prev) => prev.map((edu, i) => (i === eduIndex ? { ...edu, programs: (edu.programs ?? []).filter((_, j) => j !== progIndex) } : edu)));
  }
  function moveProgram(eduIndex: number, progIndex: number, dir: -1 | 1) {
    setEducations((prev) => prev.map((edu, i) => {
      if (i !== eduIndex) return edu;
      const list = [...(edu.programs ?? [])];
      const target = progIndex + dir;
      if (target < 0 || target >= list.length) return edu;
      [list[progIndex], list[target]] = [list[target], list[progIndex]];
      return { ...edu, programs: list };
    }));
  }
  function toggleEducationLink(eduIndex: number, kind: "award" | "club", id: string) {
    setEducations((prev) => prev.map((edu, i) => {
      if (i !== eduIndex) return edu;
      const key = kind === "award" ? "linkedAwardIds" : "linkedClubIds";
      const cur = (edu[key] ?? []) as string[];
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      return { ...edu, [key]: next.length ? next : undefined };
    }));
  }

  /* ── CRUD handlers ── */
  async function saveProject(p: Project, action: "save" | "draft" = "save") {
    await runSave(action === "draft" ? "Project draft" : "Project",async()=>{
      const original=projects.find(item=>item.id===p.id);
      const result=await adminRequest<{record:Project;version:number}>("/api/admin/content",{method:"POST",body:JSON.stringify({collection:"projects",id:p.id,action,expectedVersion:recordVersion(original),record:{...original,...p}})});
      if(action === "save") setProjects(prev=>original?prev.map(item=>item.id===p.id?result.record:item):[result.record,...prev]);
      else if(original) setProjects(prev=>prev.map(item=>item.id===p.id?{...item,_version:result.version}:item));
      setProjectModal({open:false});
    });
  }
  async function deleteProject(id:string) { await deleteRecord("projects",id,projects.find(item=>item.id===id),()=>setProjects(prev=>prev.filter(item=>item.id!==id))); }
  async function saveArticle(a: Article, action: "save" | "draft" = "save") {
    await runSave(action === "draft" ? "Article draft" : "Article",async()=>{
      const original=articles.find(item=>item.id===a.id);
      const result=await adminRequest<{record:Article;version:number}>("/api/admin/content",{method:"POST",body:JSON.stringify({collection:"articles",id:a.id,action,expectedVersion:recordVersion(original),record:{...original,...a}})});
      if(action === "save") setArticles(prev=>original?prev.map(item=>item.id===a.id?result.record:item):[result.record,...prev]);
      else if(original) setArticles(prev=>prev.map(item=>item.id===a.id?{...item,_version:result.version}:item));
      setArticleModal({open:false});
    });
  }
  async function deleteArticle(id:string) { await deleteRecord("articles",id,articles.find(item=>item.id===id),()=>setArticles(prev=>prev.filter(item=>item.id!==id))); }
  async function saveClient(c: Client, linkedProjectIds:string[]) {
    await runSave("Client",async()=>{
      const original=clients.find(item=>item.id===c.id);
      const changedProjects=projects.filter(p=>linkedProjectIds.includes(p.id)!==(p.clientIds?.includes(c.id)??false)).map(p=>({...p,clientIds:linkedProjectIds.includes(p.id)?[...(p.clientIds??[]),c.id]:(p.clientIds??[]).filter(id=>id!==c.id)}));
      const result=await adminRequest<{groups:{collection:string;records:unknown[]}[]}>("/api/admin/content",{method:"PUT",body:JSON.stringify({groups:[{collection:"clients",records:[{...original,...c,_version:recordVersion(original)}]},{collection:"projects",records:changedProjects}]})});
      result.groups.forEach(group=>{if(group.collection==="clients")setClients(group.records as Client[]);if(group.collection==="projects")setProjects(group.records as Project[]);});
      setClientModal({open:false});
    });
  }
  async function deleteClient(id:string) { await deleteRecord("clients",id,clients.find(item=>item.id===id),()=>setClients(prev=>prev.filter(item=>item.id!==id))); }
  async function deleteRecord(collection:string,id:string,record:unknown,onDeleted:()=>void) {
    await runSave("Deletion",async()=>{await adminRequest("/api/admin/content",{method:"POST",body:JSON.stringify({collection,id,action:"delete",expectedVersion:recordVersion(record)})});onDeleted();setDeleteConfirm(null);});
  }

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin");
  }

  async function runMetricsAudit(target: MetricsAuditTarget) {
    const response = await fetch("/api/admin/metrics-audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target }),
    });

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    return (await response.json()) as MetricsAuditResponse;
  }

  async function refreshProjectViewsAudit(mode: "manual" | "auto" = "manual") {
    setProjectViewsRefreshing(true);
    setProjectViewsAuditLog([
      mode === "auto" ? "Automatic project video scan running..." : "Running project video scan...",
    ]);

    try {
      const report = await runMetricsAudit("project-views");
      const lines = report.lines?.length ? report.lines : ["No output returned."];
      const nextSummary = {
        totalProjectViews: report.totalProjectViews ?? 0,
        refreshedAt: report.refreshedAt,
      };
      setProjectViewsAuditLog(lines);
      setProjectViewsAuditSummary(nextSummary);
      window.localStorage.setItem(PROJECT_VIEWS_AUDIT_CACHE_KEY, JSON.stringify(nextSummary));

      const projectsRes = await fetch("/api/admin/projects");
      if (projectsRes.ok) {
        setProjects(await projectsRes.json());
      }
    } catch {
      setProjectViewsAuditLog(["Refresh failed. Check the linked videos and try again."]);
    } finally {
      setProjectViewsRefreshing(false);
    }
  }

  projectViewsAutoRefreshRef.current = () => {
    void refreshProjectViewsAudit("auto");
  };

  async function persistContacts(next: Contact[]) {
    await runSave("Contacts",async()=>{
      const changed=next.filter(item=>JSON.stringify(item)!==JSON.stringify(contacts.find(old=>old.id===item.id)));
      const result=await adminRequest<{groups:{collection:string;records:Contact[]}[]}>("/api/admin/content",{method:"PUT",body:JSON.stringify({groups:[{collection:"contacts",records:changed}]})});
      setContacts(result.groups[0].records);
    });
  }

  async function mutateRateLimitRecord(
    action: "reset" | "clear-pii",
    record: RateLimit
  ) {
    const response = await fetch("/api/admin/rate-limits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, record }),
    });

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    setRateLimits((prev) =>
      prev.map((entry) => {
        if (entry.id !== record.id) return entry;
        if (action === "reset") {
          return {
            ...entry,
            count: 0,
            blockedCount: 0,
            lastBlockedAt: undefined,
            notes: "Reset by admin",
          };
        }
        return {
          ...entry,
          ip: undefined,
          browser: undefined,
          userAgent: undefined,
          city: undefined,
          region: undefined,
          country: undefined,
          notes: "PII cleared by admin",
        };
      })
    );
  }

  async function deleteRateLimit(id: string) {
    const response = await fetch("/api/admin/rate-limits", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    setRateLimits((prev) => prev.filter((entry) => entry.id !== id));
  }

  async function deleteContact(id:string) { await deleteRecord("contacts",id,contacts.find(item=>item.id===id),()=>setContacts(prev=>prev.filter(item=>item.id!==id))); }
  async function saveContact(contact:Contact) {
    await runSave("Contact",async()=>{
      const original=contacts.find(item=>item.id===contact.id);
      const result=await adminRequest<{record:Contact}>("/api/admin/content",{method:"POST",body:JSON.stringify({collection:"contacts",id:contact.id,action:"save",expectedVersion:recordVersion(original),record:{...original,...contact}})});
      setContacts(prev=>original?prev.map(item=>item.id===contact.id?result.record:item):[result.record,...prev]);
      setContactModal({open:false});
    });
  }

  // Serialize site-content writes and report saved only for the latest local edit.
  useEffect(() => {
    const signature = contentSignature(siteContent);
    siteLatestSignatureRef.current = signature;
    siteRetryRef.current = () => saveSiteContentEditor();
    if (!siteContentInitializedRef.current || (signature === siteSavedSignatureRef.current && sitePendingRef.current === 0)) return;
    const dirtyTimer = window.setTimeout(() => {
      setSiteContentAutoSaved(false);
      setSaveNotice({state:"saving",message:"Site content changes waiting to save…"});
    }, 0);
    if (siteContentAutoSaveRef.current) clearTimeout(siteContentAutoSaveRef.current);
    siteContentAutoSaveRef.current = setTimeout(() => void saveSiteContentEditor(), 2000);
    return () => {
      window.clearTimeout(dirtyTimer);
      if (siteContentAutoSaveRef.current) clearTimeout(siteContentAutoSaveRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteContent]);

  async function saveSiteContentEditor(next?: SiteContent) {
    if (!siteContentInitializedRef.current) return;
    const content=next ?? siteContent;
    const save=async()=>{
      if(contentSignature(content)===siteSavedSignatureRef.current)return;
      const retry = async () => { await siteRetryRef.current?.(); };
      retrySaveRef.current = retry;
      setSiteContentAutoSaved(false); setSaveNotice({state:"saving",message:"Saving site content…"});
      try {
        const result=await adminRequest<{record:SiteContent;version:number}>("/api/admin/content",{method:"POST",body:JSON.stringify({collection:"siteContent",id:content.id,action:"save",expectedVersion:siteVersionRef.current,record:content})});
        siteVersionRef.current=result.version;
        siteSavedSignatureRef.current=contentSignature(content);
        const latestSaved = siteLatestSignatureRef.current === siteSavedSignatureRef.current;
        setSiteContentAutoSaved(latestSaved);
        setSaveNotice(latestSaved ? {state:"saved",message:"Site content saved."} : {state:"saving",message:"Newer site content changes are waiting to save…"});
        if (retrySaveRef.current === retry) retrySaveRef.current = null;
      }catch(error){setSaveNotice({state:"failed",message:error instanceof Error?error.message:"Save failed. Your edits are still here."});}
    };
    sitePendingRef.current += 1;
    siteQueueRef.current=siteQueueRef.current.then(save,save);
    try { await siteQueueRef.current; }
    finally { sitePendingRef.current -= 1; }
  }

  const loadR2Assets = useCallback(async (next?: { prefix?: string; search?: string }) => {
    const prefix = next?.prefix ?? r2Prefix;
    const search = next?.search ?? r2Search;
    const params = new URLSearchParams();

    if (prefix) {
      params.set("prefix", prefix);
    }

    if (search.trim()) {
      params.set("search", search.trim());
    }

    setR2Loading(true);
    setR2Error("");

    try {
      const response = await fetch(`/api/admin/r2${params.toString() ? `?${params.toString()}` : ""}`);
      const data = (await response.json()) as R2BrowserResponse | { error?: string };

      if (!response.ok) {
        throw new Error("error" in data && data.error ? data.error : "Failed to load R2 assets.");
      }

      const payload = data as R2BrowserResponse;
      setR2Prefix(payload.prefix);
      setR2Folders(payload.folders);
      setR2Files(payload.files);
      setR2Mode(payload.mode);
      setR2Loaded(true);
    } catch (error) {
      setR2Error(error instanceof Error ? error.message : "Failed to load R2 assets.");
      setR2Folders([]);
      setR2Files([]);
    } finally {
      setR2Loading(false);
    }
  }, [r2Prefix, r2Search]);

  useEffect(() => {
    if (activeSection !== "r2-assets" || r2Loaded) {
      return;
    }

    void loadR2Assets();
  }, [activeSection, r2Loaded, loadR2Assets]);

  useEffect(() => {
    if (activeSection !== "r2-assets" || !r2Loaded) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void loadR2Assets();
    }, r2Search.trim() ? 180 : 0);

    return () => window.clearTimeout(timeout);
  }, [activeSection, r2Loaded, r2Prefix, r2Search, loadR2Assets]);

  async function uploadR2Files(fileList: FileList | null) {
    if (!fileList?.length) {
      return;
    }

    setR2Uploading(true);
    setR2Error("");

    try {
      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.set("file", file);
        formData.set("prefix", r2Prefix);

        const response = await fetch("/api/admin/r2", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error || `Upload failed for ${file.name}.`);
        }
      }

      await loadR2Assets();
    } catch (error) {
      setR2Error(error instanceof Error ? error.message : "Failed to upload file.");
    } finally {
      setR2Uploading(false);
      if (r2FileInputRef.current) {
        r2FileInputRef.current.value = "";
      }
    }
  }

  async function createR2FolderHandler() {
    if (!r2NewFolderName.trim()) return;
    setR2CreatingFolder(true);
    setR2Error("");
    try {
      const res = await fetch("/api/admin/r2", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefix: r2Prefix, folderName: r2NewFolderName.trim() }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Failed to create folder.");
      }
      setR2NewFolderName("");
      setR2ShowNewFolder(false);
      await loadR2Assets();
    } catch (error) {
      setR2Error(error instanceof Error ? error.message : "Failed to create folder.");
    } finally {
      setR2CreatingFolder(false);
    }
  }

  function goUpOneR2Level() {
    const trimmed = r2Prefix.replace(/\/$/, "");
    const parent = trimmed.includes("/") ? `${trimmed.slice(0, trimmed.lastIndexOf("/") + 1)}` : "";
    setR2Search("");
    setR2Prefix(parent);
  }

  async function renameR2FileConfirmed() {
    if (!r2RenameTarget || !r2RenameValue.trim()) return;
    const oldKey = r2RenameTarget.key;
    const dir = oldKey.includes("/") ? oldKey.slice(0, oldKey.lastIndexOf("/") + 1) : "";
    const newKey = `${dir}${r2RenameValue.trim()}`;
    setR2Renaming(true);
    setR2Error("");
    try {
      const response = await fetch("/api/admin/r2", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldKey, newKey }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Rename failed.");
      }
      setR2RenameTarget(null);
      setR2RenameValue("");
      await loadR2Assets();
    } catch (error) {
      setR2Error(error instanceof Error ? error.message : "Rename failed.");
    } finally {
      setR2Renaming(false);
    }
  }

  async function moveR2File(oldKey: string, newKey: string) {
    setR2Error("");
    try {
      const response = await fetch("/api/admin/r2", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldKey, newKey }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Move failed.");
      }
      await loadR2Assets();
    } catch (error) {
      setR2Error(error instanceof Error ? error.message : "Move failed.");
    }
  }

  function deleteR2File(key: string) {
    setDeleteConfirm({ type: "r2", id: key, label: key });
  }

  async function deleteR2FileConfirmed(key: string) {
    setR2Error("");

    try {
      const response = await fetch("/api/admin/r2", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });

      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete file.");
      }

      await loadR2Assets();
    } catch (error) {
      setR2Error(error instanceof Error ? error.message : "Failed to delete file.");
    }
  }

  async function copyR2Link(url: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setR2Error("");
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.top = "-9999px";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        const copied = document.execCommand("copy");
        document.body.removeChild(textarea);

        if (!copied) {
          throw new Error("Copy command failed.");
        }
      }

      setR2Error("");
      setR2CopiedUrl(url);
      if (r2CopyResetRef.current) {
        window.clearTimeout(r2CopyResetRef.current);
      }
      r2CopyResetRef.current = window.setTimeout(() => {
        setR2CopiedUrl("");
        r2CopyResetRef.current = null;
      }, 1600);
    } catch {
      setR2Error("Failed to copy link.");
    }
  }

  function toggleContactSubscription(id:string) { void persistContacts(contacts.map(contact=>contact.id===id?{...contact,subscribed:!contact.subscribed}:contact)); }
  function setMessageReadState(ids:string[],read:boolean) { const now=new Date().toISOString(); void persistContacts(contacts.map(contact=>ids.includes(contact.id)?{...contact,messageRead:read,messageReadAt:read?now:undefined}:contact)); }

  async function deleteCampaign(id:string) { await deleteRecord("campaigns",id,campaigns.find(item=>item.id===id),()=>setCampaigns(prev=>prev.filter(item=>item.id!==id))); }

  async function saveCampaign(campaign: Campaign, action: "draft" | "schedule" | "send", batchSize?: number) {
    const response = await fetch("/api/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaign, action, batchSize }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        typeof payload?.error === "string" ? payload.error : `Request failed with ${response.status}`
      );
    }

    const savedCampaign = payload.campaign as Campaign;
    setCampaigns((prev) => {
      const exists = prev.some((entry) => entry.id === savedCampaign.id);
      const next = exists
        ? prev.map((entry) => (entry.id === savedCampaign.id ? savedCampaign : entry))
        : [savedCampaign, ...prev];
      return next.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
    setCampaignModal({ open: false });
  }

  async function deleteRizzSubmission(id:string) { await deleteRecord("rizz",id,rizzEntries.find(item=>item.id===id),()=>setRizzEntries(prev=>prev.filter(item=>item.id!==id))); }
  async function confirmDelete() {
    if (!deleteConfirm) return;
    const actions = {project:deleteProject,article:deleteArticle,client:deleteClient,contact:deleteContact,campaign:deleteCampaign,rizz:deleteRizzSubmission,r2:deleteR2FileConfirmed};
    await actions[deleteConfirm.type](deleteConfirm.id);
  }

  /* ── Export JSON ── */
  function exportData() {
    const data = { projects, articles, clients, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mdcran-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ── Reset to defaults ── */
  async function resetToDefaults() {
    return;
  }

  /* ── Filtered lists ── */
  const filteredProjects = projects.filter((p) => {
    const matchSearch = !projectSearch || p.title.toLowerCase().includes(projectSearch.toLowerCase());
    const matchCat = !projectCategoryFilter || p.category === projectCategoryFilter;
    return matchSearch && matchCat;
  }).sort((a, b) => {
    if (projectSort === "category") {
      const categoryCompare = compareStrings(a.category, b.category, "asc");
      if (categoryCompare !== 0) return categoryCompare;

      const aSubcategory = a.subcategory ?? "";
      const bSubcategory = b.subcategory ?? "";
      const subcategoryCompare = compareStrings(aSubcategory, bSubcategory, "asc");
      if (subcategoryCompare !== 0) return subcategoryCompare;

      return compareStrings(a.title, b.title, "asc");
    }
    if (projectSort === "az") return compareStrings(a.title, b.title, "asc");
    if (projectSort === "za") return compareStrings(a.title, b.title, "desc");
    return compareDates(a.publishDate, b.publishDate, projectSort);
  });

  const filteredArticles = articles.filter((a) =>
    !articleSearch || a.title.toLowerCase().includes(articleSearch.toLowerCase())
  ).sort((a, b) => {
    if (articleSort === "az") return compareStrings(a.title, b.title, "asc");
    if (articleSort === "za") return compareStrings(a.title, b.title, "desc");
    return compareDates(a.publishDate, b.publishDate, articleSort);
  });
  const filteredClients = clients.filter((client) => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      client.name.toLowerCase().includes(q) ||
      (client.location ?? "").toLowerCase().includes(q) ||
      client.roles.some((role) => role.toLowerCase().includes(q))
    );
  }).sort((a, b) => (
    clientSort === "newest" || clientSort === "oldest"
      ? compareStrings(a.id, b.id, clientSort === "newest" ? "desc" : "asc")
      : compareStrings(a.name, b.name, clientSort === "az" ? "asc" : "desc")
  ));
  const filteredContacts = contacts.filter((contact) => {
    const q = contactsSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      contact.name.toLowerCase().includes(q) ||
      (contact.email ?? "").toLowerCase().includes(q) ||
      (contact.phone ?? "").toLowerCase().includes(q) ||
      (contact.source ?? "").toLowerCase().includes(q)
    );
  }).sort((a, b) => {
    if (contactsSort === "az") return compareStrings(a.name, b.name, "asc");
    if (contactsSort === "za") return compareStrings(a.name, b.name, "desc");
    return compareDates(a.createdAt, b.createdAt, contactsSort);
  });
  const filteredRateLimits = rateLimits.filter((entry) => {
    const q = rateLimitSearch.trim().toLowerCase();
    if (!q) return true;
    return [
      entry.scope,
      entry.ip,
      entry.browser,
      entry.userAgent,
      entry.city,
      entry.region,
      entry.country,
      entry.notes,
    ]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(q));
  });
  const contactFormEntries = contacts.filter((contact) => contact.source === "contact-form");
  const filteredMessageEntries = contactFormEntries.filter((entry) => {
    const q = messageSearch.trim().toLowerCase();
    if (!q) return true;

    return (
      entry.name.toLowerCase().includes(q) ||
      (entry.subject ?? "").toLowerCase().includes(q) ||
      (entry.email ?? "").toLowerCase().includes(q) ||
      (entry.phone ?? "").toLowerCase().includes(q) ||
      entry.message.toLowerCase().includes(q)
    );
  }).sort((a, b) => {
    if (messagesSort === "az") return compareStrings(a.name, b.name, "asc");
    if (messagesSort === "za") return compareStrings(a.name, b.name, "desc");
    if (messagesSort === "read") return Number(Boolean(b.messageRead)) - Number(Boolean(a.messageRead));
    if (messagesSort === "unread") return Number(Boolean(a.messageRead)) - Number(Boolean(b.messageRead));
    return compareDates(a.createdAt, b.createdAt, messagesSort);
  });
  const filteredRizzEntries = rizzEntries.filter((entry) => {
    const q = rizzSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      entry.name.toLowerCase().includes(q) ||
      entry.nickname.toLowerCase().includes(q) ||
      entry.phone.toLowerCase().includes(q) ||
      humanizeChoiceList(entry.dateIdeas ?? (entry.dateIdea ? [entry.dateIdea] : [])).toLowerCase().includes(q) ||
      humanizeChoiceList(entry.vibes ?? (entry.vibe ? [entry.vibe] : [])).toLowerCase().includes(q) ||
      humanizeChoiceList(entry.winOvers ?? (entry.winOver ? [entry.winOver] : [])).toLowerCase().includes(q) ||
      Object.values(entry.customAnswers ?? {}).some(answer => answer?.toLowerCase().includes(q)) ||
      Object.values(entry.optionLabels ?? {}).some(label => label.toLowerCase().includes(q)) ||
      (entry.winOverOther ?? "").toLowerCase().includes(q)
    );
  }).sort((a, b) => {
    if (rizzSort === "az") return compareStrings(a.name, b.name, "asc");
    if (rizzSort === "za") return compareStrings(a.name, b.name, "desc");
    return compareDates(a.createdAt, b.createdAt, rizzSort);
  });

  /* ── Derived dashboard stats ── */

  /* ── Nav sections config ── */
  const unreadMessages = contactFormEntries.filter((entry) => !entry.messageRead).length;

  const resumeQuery = resumeSearch.trim().toLowerCase();
  const filteredExperiences = experiences.filter((exp) => {
    if (!resumeQuery) return true;
    return [exp.role, exp.companyName, exp.description, exp.type]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(resumeQuery));
  });
  const filteredEducations = educations.filter((education) => {
    if (!resumeQuery) return true;
    return [education.degree, education.institution, education.field, education.description]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(resumeQuery));
  });
  const filteredSkillsList = skills.filter((skill) => {
    if (!resumeQuery) return true;
    return [skill.name, skill.category]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(resumeQuery));
  });
  const filteredCertificationsList = certifications.filter((cert) => {
    if (!resumeQuery) return true;
    return [cert.name, cert.issuer, cert.date]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(resumeQuery));
  });
  const filteredAwardsList = awards.filter((award) => {
    if (!resumeQuery) return true;
    return [award.name, award.issuer, award.description, award.date]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(resumeQuery));
  });
  const filteredClubsList = clubs.filter((club) => {
    if (!resumeQuery) return true;
    return [club.name, club.role, club.description, club.startDate, club.endDate]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(resumeQuery));
  });

  const smsEmailLast90Days = (() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 89);

    const rows = Array.from({ length: 90 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      const key = day.toISOString().slice(0, 10);
      return { key, label: fmtDayLabel(day), sms: 0, email: 0 };
    });

    const byDay = new Map(rows.map((row) => [row.key, row]));
    contacts.forEach((contact) => {
      const createdAt = new Date(contact.createdAt);
      if (Number.isNaN(createdAt.getTime()) || createdAt < start) return;
      const bucket = byDay.get(createdAt.toISOString().slice(0, 10));
      if (!bucket) return;
      if (contact.phone) bucket.sms += 1;
      if (contact.email) bucket.email += 1;
    });

    return rows;
  })();

  const contactFormLast90Days = (() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 89);

    const rows = Array.from({ length: 90 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      const key = day.toISOString().slice(0, 10);
      return { key, label: fmtDayLabel(day), submissions: 0 };
    });

    const byDay = new Map(rows.map((row) => [row.key, row]));
    contactFormEntries.forEach((entry) => {
      const createdAt = new Date(entry.createdAt);
      if (Number.isNaN(createdAt.getTime()) || createdAt < start) return;
      const bucket = byDay.get(createdAt.toISOString().slice(0, 10));
      if (!bucket) return;
      bucket.submissions += 1;
    });

    return rows;
  })();

  const tapsPerProject = [...projects]
    .sort((a, b) => (tapCounts[b.id] ?? 0) - (tapCounts[a.id] ?? 0))
    .slice(0, 8)
    .map((p) => ({
      label: p.title.length > 22 ? p.title.slice(0, 22) + "…" : p.title,
      taps: tapCounts[p.id] ?? 0,
    }));

  const contactCaptureData = (() => {
    let emailOnly = 0;
    let phoneOnly = 0;
    let both = 0;
    let neither = 0;
    contacts.forEach((c) => {
      const hasEmail = !!c.email;
      const hasPhone = !!c.phone;
      if (hasEmail && hasPhone) both += 1;
      else if (hasEmail) emailOnly += 1;
      else if (hasPhone) phoneOnly += 1;
      else neither += 1;
    });
    return [
      { name: "Email only", value: emailOnly, fill: "#ef4242" },
      { name: "Phone only", value: phoneOnly, fill: "#d4a853" },
      { name: "Both", value: both, fill: "#34d399" },
      { name: "Neither", value: neither, fill: "rgba(255,255,255,0.15)" },
    ];
  })();

  const browserData = (analyticsOverview?.topBrowsers ?? [])
    .slice(0, 5)
    .map((b, i) => {
      const colors = ["#ef4242", "#d4a853", "#34d399", "#a855f7", "#60a5fa"];
      return { name: b.name, value: b.count, fill: colors[i] ?? "#ef4242" };
    });

  // Content-health scan: fast, local checks before publishing so the public grid
  // does not end up with empty cover areas, weak summaries, or unfindable entries.
  const contentHealth = {
    projects: projects.filter((project) => (!project.coverImage && !project.images?.length) || !project.description?.trim() || !project.tags?.length),
    articles: articles.filter((article) => !article.coverImage || !article.excerpt?.trim() || !article.tags?.length),
    clients: clients.filter((client) => !client.avatarUrl || !client.bio?.trim()),
  };
  const contentHealthTotal = contentHealth.projects.length + contentHealth.articles.length + contentHealth.clients.length;
  const contentHealthCards = [
    { label: "Projects", count: contentHealth.projects.length, onClick: () => { setActiveSection("projects"); setProjectSearch(contentHealth.projects[0]?.title ?? ""); } },
    { label: "Articles", count: contentHealth.articles.length, onClick: () => { setActiveSection("articles"); setArticleSearch(contentHealth.articles[0]?.title ?? ""); } },
    { label: "Clients", count: contentHealth.clients.length, onClick: () => { setActiveSection("clients"); setClientSearch(contentHealth.clients[0]?.name ?? ""); } },
  ];

  const navItems: { key: NavSection; label: string; unreadCount?: number }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "content-studio", label: "Content studio" },
    { key: "content-health", label: "Content health" },
    { key: "publishing", label: "Publishing" },
    { key: "operations", label: "Operations" },
    { key: "projects", label: "Projects" },
    { key: "articles", label: "Articles" },
    { key: "clients", label: "Clients" },
    { key: "r2-assets", label: "R2 Assets" },
    { key: "site-content", label: "Site Content" },
    { key: "resume", label: "Resume" },
    { key: "analytics", label: "Analytics" },
    { key: "sessions", label: "Sessions" },
    { key: "contacts", label: "Contacts" },
    { key: "rate-limits", label: "Rate Limits" },
    { key: "ai", label: "AI Assistant" },
    { key: "contact-form-entries", label: "Messages", unreadCount: unreadMessages },
    { key: "campaigns", label: "Compose" },
    { key: "rizz", label: "Rizz" },
    { key: "bar", label: "Bar" },
    { key: "visitors", label: "Visitors" },
    { key: "booking", label: "Booking" },
    { key: "identities", label: "Identities" },
    { key: "crossdevice", label: "Cross-Device" },
    { key: "traffic", label: "Traffic & AI" },
    { key: "status", label: "Status" },
    { key: "database", label: "Database" },
    { key: "discord", label: "Discord" },
  ];

  const NAV_ICONS: Partial<Record<NavSection, React.ReactNode>> = {
    dashboard:            <LayoutDashboard size={13} />,
    projects:             <FolderKanban size={13} />,
    articles:             <FileText size={13} />,
    clients:              <Users size={13} />,
    "r2-assets":          <HardDrive size={13} />,
    "site-content":       <Settings2 size={13} />,
    resume:               <FileUser size={13} />,
    analytics:            <BarChart3 size={13} />,
    sessions:             <Monitor size={13} />,
    contacts:             <Mail size={13} />,
    "rate-limits":        <ShieldAlert size={13} />,
    ai:                   <Bot size={13} />,
    "contact-form-entries": <MessageSquare size={13} />,
    campaigns:            <Send size={13} />,
    rizz:                 <Zap size={13} />,
    bar:                  <Wine size={13} />,
    visitors:             <Eye size={13} />,
    booking:              <CalendarCheck size={13} />,
    identities:           <Fingerprint size={13} />,
    crossdevice:          <GitMerge size={13} />,
    traffic:              <TrendingUp size={13} />,
    status:               <Activity size={13} />,
    "content-studio": <FileText size={13} />, "content-health": <Check size={13} />, publishing: <Send size={13} />, operations: <Activity size={13} />,
    database:             <Database size={13} />,
    discord:              <MessageCircle size={13} />,
  };

  const NAV_GROUPS: { label: string; items: NavSection[] }[] = [
    { label: "Overview",  items: ["dashboard"] },
    { label: "Content",   items: ["content-studio", "projects", "articles", "clients", "r2-assets", "site-content", "resume", "content-health", "publishing"] },
    { label: "People",    items: ["contacts", "contact-form-entries", "booking", "identities", "crossdevice", "rizz"] },
    { label: "Traffic",   items: ["analytics", "visitors", "sessions", "traffic", "ai"] },
    { label: "System",    items: ["operations", "status", "rate-limits", "database", "discord", "campaigns", "bar"] },
  ];

  const adminSearchQuery = adminSearch.trim().toLowerCase();
  const adminSearchResults = !adminSearchQuery
    ? []
    : [
        ...navItems
          .filter((item) => `${item.label} ${item.key === "dashboard" ? "spotify connection reconnect" : ""} ${item.key === "site-content" ? "homepage tokens ai usage daybreak" : ""}`.toLowerCase().includes(adminSearchQuery))
          .map((item) => ({
            id: `section-${item.key}`,
            label: item.label,
            hint: "Section",
            section: item.key,
            onSelect: () => {
              setActiveSection(item.key);
              setAdminSearch("");
            },
          })),
        ...projects
          .filter((project) => project.title.toLowerCase().includes(adminSearchQuery))
          .slice(0, 5)
          .map((project) => ({
            id: `project-${project.id}`,
            label: project.title,
            hint: "Project",
            section: "projects" as NavSection,
            onSelect: () => {
              setActiveSection("projects");
              setProjectSearch(project.title);
              setAdminSearch("");
            },
          })),
        ...articles
          .filter((article) => article.title.toLowerCase().includes(adminSearchQuery))
          .slice(0, 5)
          .map((article) => ({
            id: `article-${article.id}`,
            label: article.title,
            hint: "Article",
            section: "articles" as NavSection,
            onSelect: () => {
              setActiveSection("articles");
              setArticleSearch(article.title);
              setAdminSearch("");
            },
          })),
        ...clients
          .filter((client) => client.name.toLowerCase().includes(adminSearchQuery))
          .slice(0, 5)
          .map((client) => ({
            id: `client-${client.id}`,
            label: client.name,
            hint: "Client",
            section: "clients" as NavSection,
            onSelect: () => {
              setActiveSection("clients");
              setClientSearch(client.name);
              setAdminSearch("");
            },
          })),
        ...contacts
          .filter((contact) =>
            [contact.name, contact.email, contact.phone]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(adminSearchQuery))
          )
          .slice(0, 5)
          .map((contact) => ({
            id: `contact-${contact.id}`,
            label: contact.name,
            hint: "Contact",
            section: "contacts" as NavSection,
            onSelect: () => {
              setActiveSection("contacts");
              setContactsSearch(contact.name);
              setAdminSearch("");
            },
          })),
        ...rateLimits
          .filter((entry) =>
            [entry.ip, entry.browser, entry.userAgent, entry.scope, entry.city, entry.region, entry.country]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(adminSearchQuery))
          )
          .slice(0, 5)
          .map((entry) => ({
            id: `rate-limit-${entry.id}`,
            label: entry.ip || entry.browser || entry.scope,
            hint: "Rate Limit",
            section: "rate-limits" as NavSection,
            onSelect: () => {
              setActiveSection("rate-limits");
              setRateLimitSearch(entry.ip || entry.browser || entry.scope);
              setAdminSearch("");
            },
          })),
        ...contactFormEntries
          .filter((entry) =>
            [entry.name, entry.subject, entry.email, entry.phone, entry.message]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(adminSearchQuery))
          )
          .slice(0, 5)
          .map((entry) => ({
            id: `message-${entry.id}`,
            label: entry.subject || entry.name,
            hint: "Message",
            section: "contact-form-entries" as NavSection,
            onSelect: () => {
              setActiveSection("contact-form-entries");
              setMessageSearch(entry.subject || entry.name);
              setAdminSearch("");
            },
          })),
        ...campaigns
          .filter((campaign) =>
            (campaign.subject || "sms message").toLowerCase().includes(adminSearchQuery)
          )
          .slice(0, 5)
          .map((campaign) => ({
            id: `campaign-${campaign.id}`,
            label: campaign.subject || "SMS Message",
            hint: "Compose",
            section: "campaigns" as NavSection,
            onSelect: () => {
              setActiveSection("campaigns");
              setAdminSearch("");
              setCampaignView(campaign);
            },
          })),
        ...rizzEntries
          .filter((entry) =>
            [entry.name, entry.nickname, entry.phone]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(adminSearchQuery))
          )
          .slice(0, 5)
          .map((entry) => ({
            id: `rizz-${entry.id}`,
            label: `${entry.name} (${entry.nickname})`,
            hint: "Rizz",
            section: "rizz" as NavSection,
            onSelect: () => {
              setActiveSection("rizz");
              setRizzSearch(entry.name);
              setAdminSearch("");
            },
          })),
      ].slice(0, 16);

  const sectionTitles: Record<NavSection, string> = {
    dashboard: "Overview",
    projects: "Projects",
    articles: "Articles",
    clients: "Clients",
    "r2-assets": "R2 Assets",
    "site-content": "Site Content",
    resume: "Resume",
    analytics: "Analytics",
    sessions: "Sessions",
    contacts: "Contacts",
    "rate-limits": "Rate Limits",
    ai: "AI Assistant",
    "contact-form-entries": "Messages",
    campaigns: "Compose",
    rizz: "Rizz",
    bar: "Bar",
    visitors: "Visitors",
    booking: "Booking",
    identities: "Identities",
    crossdevice: "Cross-Device",
    traffic: "Traffic & AI",
    status: "Status",
    "content-studio":"Content studio", "content-health":"Content health", publishing:"Publishing", operations:"Operations",
    database: "Database",
    discord: "Discord",
  };

  const sectionDescriptions: Record<NavSection, string> = {
    dashboard: "Snapshot of your content, traffic and quick actions.",
    projects: "Create, edit, reorder and feature portfolio projects.",
    articles: "Write and manage articles, with rich sections and media.",
    clients: "Manage clients and the people you've worked with.",
    "r2-assets": "Browse, upload and organize media stored in R2.",
    "site-content": "Edit page headers, hero, about and footer content.",
    resume: "Profile, experience, skills, certifications, awards and the resume PDF.",
    analytics: "Visits, recruiter intent, top pages, scroll depth, live sessions and heatmaps.",
    sessions: "Live visitors and tabs — control, refresh, redirect, kill or blacklist in real time.",
    contacts: "Subscribers collected across the site.",
    "rate-limits": "Inspect and clear API and chat rate-limit records.",
    ai: "Everything the AI assistant knows — site context plus your own prompting and guidance.",
    "contact-form-entries": "Messages submitted through the contact form.",
    campaigns: "Compose and send email or SMS campaigns.",
    rizz: "Submissions from the Rizz experience.",
    bar: "Enable the /bar drink roulette and customize the wheel.",
    visitors: "Live visitor analytics and adjustments.",
    booking: "Calendar-backed meeting booking, business hours, and meeting types.",
    identities: "Recognized visitors by device fingerprint — rename, merge, link, or remove. Expand any identity for its device graph and full text + voice conversation history.",
    crossdevice: "Probabilistically matched device pairs from the cross-device engine — confirm to merge into one identity, or reject to suppress.",
    traffic: "UTM link builder and AI routing conditions for the portfolio concierge.",
    status: "Service uptime monitoring and incidents.",
    "content-studio":"Draft, preview, publish and restore content revisions.", "content-health":"Resolve content and link issues.", publishing:"Shared profile, README, resume and image exports.", operations:"Job history, failures and recovery.",
    database: "Download verified backups and preview a safe restore.",
    discord: "Route site events to your Discord server — contact forms, bookings, newsletter, identity and weekly analytics digest.",
  };

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-white/30 text-sm font-jb">Loading admin…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-jb">
      {saveNotice && <div role={saveNotice.state === "failed" ? "alert" : "status"} className={`fixed bottom-5 left-1/2 z-[100000] flex max-w-[90vw] -translate-x-1/2 items-center gap-3 rounded-lg border bg-[#121212] px-4 py-3 text-sm shadow-xl ${saveNotice.state === "failed" ? "border-red-400 text-red-200" : "border-white/20 text-white"}`}><span>{saveNotice.message}</span>{saveNotice.state === "failed" && retrySaveRef.current && <button className="underline" onClick={()=>void retrySaveRef.current?.()}>Retry</button>}{saveNotice.state !== "saving" && <button aria-label="Dismiss save status" onClick={()=>setSaveNotice(null)}>×</button>}</div>}
      {/* ── MAIN CONTENT ── */}
      <main className="min-h-screen flex flex-col">
        {/* ── TOP NAVIGATION ── */}
        <header className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/8 shrink-0">
          {/* subtle grid + glow to match the frontend */}
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                "linear-gradient(rgba(239,66,66,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(239,66,66,0.04) 1px, transparent 1px)",
              backgroundSize: "26px 26px",
            }}
          />
          {/* Row 1 — brand, title, search, actions */}
          <div className="relative px-3 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 min-w-0 sm:min-w-[200px] shrink">
              <span className="font-nord text-sm sm:text-base text-white tracking-wide">
                MDCran<span className="text-[#ef4242]">.admin</span>
              </span>
              <span className="hidden sm:block h-4 w-px bg-white/10" />
              <div className="hidden sm:block leading-none">
                <span className="block text-[9px] uppercase tracking-[0.22em] text-[#ef4242]/70">Section</span>
                <h1 className="font-nord text-sm text-white">{sectionTitles[activeSection]}</h1>
              </div>
            </div>
          <div className="flex order-last md:order-none w-full md:w-auto md:flex-1 justify-center md:px-4">
            <div className="relative w-full max-w-xl">
              <input
                ref={adminSearchInputRef}
                className="w-full h-10 rounded-sm border border-white/10 bg-white/4 px-4 text-sm text-white outline-none placeholder-white/25 focus:border-[#ef4242] transition-colors"
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                onFocus={() => setAdminSearchFocused(true)}
                onBlur={() => window.setTimeout(() => setAdminSearchFocused(false), 120)}
                placeholder="Search admin center..."
                aria-label="Search admin sections and content"
                onKeyDown={(event) => {
                  if (event.key === "Escape") { setAdminSearch(""); setAdminSearchFocused(false); }
                  if (event.key === "Enter" && adminSearchResults[0]) adminSearchResults[0].onSelect();
                }}
              />
              {adminSearchFocused && adminSearchQuery && (
                <div className="absolute z-50 top-full mt-2 w-full rounded-sm border border-white/10 bg-[#0b0b0b]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
                  {adminSearchResults.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-white/30">No matches found.</div>
                  ) : (
                    <div className="max-h-[360px] overflow-y-auto py-1">
                      {adminSearchResults.map((result) => (
                        <button
                          key={result.id}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={result.onSelect}
                          className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-white/4 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm text-white/80">{result.label}</div>
                            <div className="text-[10px] uppercase tracking-[0.18em] text-white/25">{result.hint}</div>
                          </div>
                          <span className="shrink-0 text-[9px] uppercase text-[#ef4242]/80">
                            {sectionTitles[result.section]}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="https://mdcran.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center justify-center h-9 px-3 text-[11px] tracking-wider text-white/45 border border-white/10 rounded-sm hover:border-[#ef4242]/40 hover:text-white/80 transition-colors"
                title="View live site"
              >
                Live Site ↗
              </a>
              {/* Mobile: icon-only logout */}
              <button
                onClick={handleLogout}
                className="sm:hidden inline-flex items-center justify-center h-9 w-9 text-[#ef4242]/60 border border-[#ef4242]/25 rounded-sm hover:bg-[#ef4242]/10 hover:text-[#ef4242] transition-colors"
                title="Log out"
              >
                <X size={14} />
              </button>
              {/* Desktop: text logout */}
              <button
                onClick={handleLogout}
                className="hidden sm:inline-flex items-center justify-center h-9 px-3 text-[11px] tracking-wider text-[#ef4242]/60 border border-[#ef4242]/25 rounded-sm hover:bg-[#ef4242]/10 hover:text-[#ef4242] transition-colors"
                title="Log out"
              >
                Log Out
              </button>
            </div>
          </div>

          {/* Row 2 — grouped section tabs (desktop) */}
          <nav aria-label="Admin sections" className="hidden md:flex items-stretch gap-0 px-1 overflow-x-auto border-t border-white/6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {NAV_GROUPS.map((group, gi) => (
              <div key={group.label} className={`flex items-center shrink-0 ${gi > 0 ? "border-l border-white/8 ml-px pl-px" : ""}`}>
                <span className="hidden 2xl:block px-1.5 text-[7px] tracking-[0.22em] uppercase text-white/20 whitespace-nowrap self-center select-none">{group.label}</span>
                {group.items.map((key) => {
                  const item = navItems.find((n) => n.key === key);
                  if (!item) return null;
                  const active = activeSection === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveSection(key)}
                      title={sectionTitles[key]}
                      aria-current={active ? "page" : undefined}
                      className={`relative flex min-h-11 items-center gap-1 whitespace-nowrap px-3 py-2 text-[11px] tracking-wide transition-colors shrink-0 ${
                        active ? "text-[#ef4242]" : "text-white/40 hover:text-white/80"
                      }`}
                    >
                      <span className="opacity-70 shrink-0">{NAV_ICONS[key]}</span>
                      <span>{item.label}</span>
                      {Boolean(item.unreadCount) && (
                        <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-[#ef4242] px-1 py-0.5 text-[9px] leading-none text-white">
                          {item.unreadCount}
                        </span>
                      )}
                      {active && <span className="absolute inset-x-1 -bottom-px h-px bg-[#ef4242] shadow-[0_0_8px_rgba(239,66,66,0.8)]" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Row 2 — mobile: current section chip + hamburger */}
          <div className="md:hidden flex items-center justify-between px-4 py-2 border-t border-white/6">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="flex items-center gap-2 h-9 px-3 rounded-sm border border-white/10 bg-white/4 text-[11px] text-white/70 hover:border-white/25 hover:text-white transition-colors min-w-0"
            >
              <span className="text-[#ef4242] opacity-80">{NAV_ICONS[activeSection]}</span>
              <span className="truncate max-w-[140px]">{sectionTitles[activeSection]}</span>
              <ChevronDown size={11} className="text-white/30 shrink-0 ml-1" />
            </button>
            <button
              onClick={() => setMobileNavOpen(true)}
              className="inline-flex items-center justify-center h-9 w-9 rounded-sm border border-white/10 text-white/50 hover:text-white hover:border-white/25 transition-colors"
              aria-label="Open navigation"
            >
              <Menu size={15} />
            </button>
          </div>

          {/* Mobile nav drawer */}
          {mobileNavOpen && createPortal(
            <div className="md:hidden fixed inset-0 z-[200] flex" role="dialog" aria-modal="true" aria-label="Admin navigation">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} />
              <div className="relative z-10 w-72 max-w-[85vw] h-full bg-[#0b0b0b] border-r border-white/10 flex flex-col overflow-y-auto">
                <div className="flex items-center justify-between px-4 h-14 border-b border-white/8 shrink-0">
                  <span className="font-nord text-sm text-white">MDCran<span className="text-[#ef4242]">.admin</span></span>
                  <button aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} className="inline-flex items-center justify-center h-11 w-11 text-white/40 hover:text-white transition-colors">
                    <X size={16} />
                  </button>
                </div>
                <div className="flex-1 py-3 space-y-1">
                  {NAV_GROUPS.map((group) => (
                    <div key={group.label}>
                      <p className="px-4 pt-3 pb-1.5 text-[8px] tracking-[0.22em] uppercase text-white/25">{group.label}</p>
                      {group.items.map((key) => {
                        const item = navItems.find((n) => n.key === key);
                        if (!item) return null;
                        const active = activeSection === key;
                        return (
                          <button
                            key={key}
                            onClick={() => { setActiveSection(key); setMobileNavOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                              active
                                ? "bg-[#ef4242]/10 text-[#ef4242] border-r-2 border-[#ef4242]"
                                : "text-white/55 hover:text-white hover:bg-white/4"
                            }`}
                          >
                            <span className={active ? "text-[#ef4242]" : "text-white/30"}>{NAV_ICONS[key]}</span>
                            <span className="flex-1 text-left text-[13px]">{item.label}</span>
                            {Boolean(item.unreadCount) && (
                              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#ef4242] px-1.5 py-0.5 text-[9px] leading-none text-white">{item.unreadCount}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div className="px-4 py-4 border-t border-white/8 space-y-2 shrink-0">
                  <a href="https://mdcran.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 h-9 px-3 w-full rounded-sm border border-white/10 text-[12px] text-white/45 hover:text-white/80 transition-colors">
                    <Globe size={13} /> Live Site ↗
                  </a>
                  <button onClick={handleLogout} className="flex items-center justify-center gap-2 h-9 px-3 w-full rounded-sm border border-[#ef4242]/25 text-[12px] text-[#ef4242]/60 hover:bg-[#ef4242]/10 hover:text-[#ef4242] transition-colors">
                    Log Out
                  </button>
                </div>
              </div>
            </div>
          , document.body)}
        </header>

        {/* Content */}
        <div className="flex-1 min-w-0 px-3 sm:px-6 lg:px-8 py-5 sm:py-7 max-w-[1440px] w-full mx-auto">

          {/* Section intro header — compact */}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#ef4242]/70 mb-1">{sectionTitles[activeSection]}</p>
              <p className="text-xs text-white/35 max-w-xl leading-relaxed">{sectionDescriptions[activeSection]}</p>
            </div>
          </div>
          <div className="mb-6 h-px w-full bg-gradient-to-r from-[#ef4242]/40 via-white/8 to-transparent" />

          {/* ─────────────────────────────────────
              DASHBOARD OVERVIEW
          ───────────────────────────────────── */}
          {activeSection === "content-studio" && <ContentStudio />}
          {activeSection === "content-health" && <ContentHealth />}
          {activeSection === "publishing" && <PublishingStudio />}
          {activeSection === "operations" && <OperationsCenter />}
          {activeSection === "dashboard" && <div className="mb-6"><OperationsCenter compact /></div>}
          {activeSection === "ai" && <div className="mb-6"><AIStudio /></div>}
          {activeSection === "dashboard" && (
            <div className="space-y-8">
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { label: "Total Projects", value: projects.length },
                  { label: "Total Articles", value: articles.length },
                  { label: "Total Clients", value: clients.length },
                  { label: "Featured Projects", value: projects.filter((p) => p.featured).length },
                ].map(({ label, value }) => (
                  <div key={label} className="border border-white/7 bg-white/2 rounded-sm p-5">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-white/35 mb-2">{label}</p>
                    <p className="font-nord text-3xl text-white">{value}</p>
                  </div>
                ))}
              </div>

              {/* Live metrics KPI row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {[
                  {
                    label: "Active Now",
                    value: analyticsOverview?.activeNow ?? "—",
                    dot: (analyticsOverview?.activeNow ?? 0) > 0,
                  },
                  {
                    label: "Sessions Today",
                    value: analyticsOverview?.sessionsToday ?? "—",
                    dot: false,
                  },
                  {
                    label: "Total Contacts",
                    value: contacts.length,
                    dot: false,
                  },
                  {
                    label: "Rizz Entries",
                    value: rizzEntries.length,
                    dot: false,
                  },
                ].map(({ label, value, dot }) => (
                  <div key={label} className="border border-white/7 bg-white/2 rounded-sm p-5">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-white/35 mb-2">{label}</p>
                    <div className="flex items-center gap-2">
                      {dot && (
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      )}
                      <p className="font-nord text-3xl text-white">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick links */}
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://analytics.google.com/analytics/web/#/a387300891p528038861/reports/intelligenthome"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 h-9 px-4 text-xs tracking-wider text-white/50 border border-white/10 rounded-sm hover:border-[#ef4242]/40 hover:text-white/80 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                  View Analytics
                </a>
                <a
                  href="https://mdcran.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 h-9 px-4 text-xs tracking-wider text-white/50 border border-white/10 rounded-sm hover:border-[#ef4242]/40 hover:text-white/80 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  View Live Site
                </a>
              </div>

              {/* Content health — publishing readiness at a glance */}
              <div className="border border-white/7 bg-white/2 rounded-sm p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-nord text-sm text-white">Content Health</p>
                    <p className="mt-1 text-xs text-white/35">Checks public cards for missing cover art, summaries, tags, and client profiles.</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${contentHealthTotal === 0 ? "border-emerald-400/25 bg-emerald-400/8 text-emerald-300" : "border-amber-400/25 bg-amber-400/8 text-amber-200"}`}>
                    {contentHealthTotal === 0 ? "Ready to publish" : `${contentHealthTotal} items need attention`}
                  </span>
                </div>
                {contentHealthTotal > 0 && (
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    {contentHealthCards.map(({ label, count, onClick }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={onClick}
                        className="flex items-center justify-between rounded-sm border border-white/8 bg-black/20 px-3 py-2 text-left text-xs transition-colors hover:border-[#ef4242]/35 hover:bg-[#ef4242]/5"
                      >
                        <span className="text-white/55">{label}</span>
                        <span className="text-[#ef4242]">{count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Seed database utility */}
              <SeedDatabaseCard onSeeded={() => { fetch("/api/admin/projects").then(r => r.ok ? r.json() : []).then(d => setProjects(d)); fetch("/api/admin/articles").then(r => r.ok ? r.json() : []).then(d => setArticles(d)); fetch("/api/admin/clients").then(r => r.ok ? r.json() : []).then(d => setClients(d)); }} />

              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.85fr)] gap-4">
                <TapsChart />
                <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
                  <div>
                    <p className="font-nord text-sm text-white">Tap Overrides</p>
                    <p className="text-xs text-white/35">Manually set tap counts for a project or article when you need to correct tracking.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Type</Label>
                        <select
                          className={inputCls}
                          value={tapEditorType}
                          onChange={(e) => {
                            const nextType = e.target.value as "project" | "article";
                            setTapEditorType(nextType);
                            const nextTargets = tapTargets.filter((target) => target.type === nextType);
                            const nextTarget = nextTargets[0];
                            setTapEditorTargetId(nextTarget?.id ?? "");
                            setTapEditorCount(String(nextTarget ? tapCounts[nextTarget.id] ?? 0 : ""));
                          }}
                        >
                          <option value="project">Project</option>
                          <option value="article">Article</option>
                        </select>
                      </div>
                      <div>
                        <Label>Current Count</Label>
                        <div className="flex h-9 items-center rounded-sm border border-white/10 bg-black/20 px-3 text-sm text-white/60">
                          {tapEditorTargetId ? (tapCounts[tapEditorTargetId] ?? 0).toLocaleString() : "—"}
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label>Item</Label>
                      <select
                        className={inputCls}
                        value={tapEditorTargetId}
                        onChange={(e) => {
                          const nextId = e.target.value;
                          setTapEditorTargetId(nextId);
                          setTapEditorCount(String(tapCounts[nextId] ?? 0));
                        }}
                      >
                        {filteredTapTargets.map((target) => (
                          <option key={target.id} value={target.id}>
                            {target.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Set Taps</Label>
                      <input
                        className={inputCls}
                        inputMode="numeric"
                        value={tapEditorCount}
                        onChange={(e) => setTapEditorCount(e.target.value.replace(/[^\d]/g, ""))}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-4">
                    <span className="text-[11px] text-white/30">
                      Saved to MongoDB and reflected in the tap chart.
                    </span>
                    <button
                      className={btnRed}
                      onClick={() => void saveTapOverride()}
                      disabled={!tapEditorTargetId || tapEditorSaving}
                    >
                      {tapEditorSaving ? "Saving..." : "Save Taps"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="border border-white/7 bg-white/2 rounded-sm p-5">
                  <div className="mb-4">
                    <p className="font-nord text-sm text-white">SMS + Email Inflow (90 Days)</p>
                    <p className="text-xs text-white/35">New contacts captured with phone numbers or email addresses.</p>
                  </div>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={smsEmailLast90Days}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} minTickGap={18} />
                        <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ background: "#090909", border: "1px solid rgba(255,255,255,0.08)" }}
                          labelStyle={{ color: "rgba(255,255,255,0.75)" }}
                        />
                        <Line type="monotone" dataKey="email" stroke="#ef4242" strokeWidth={2} dot={false} name="Email" />
                        <Line type="monotone" dataKey="sms" stroke="#d4a853" strokeWidth={2} dot={false} name="SMS" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="border border-white/7 bg-white/2 rounded-sm p-5">
                  <div className="mb-4">
                    <p className="font-nord text-sm text-white">Contact Form Submissions (90 Days)</p>
                    <p className="text-xs text-white/35">Daily volume of messages submitted through the contact page.</p>
                  </div>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={contactFormLast90Days}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} minTickGap={18} />
                        <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ background: "#090909", border: "1px solid rgba(255,255,255,0.08)" }}
                          labelStyle={{ color: "rgba(255,255,255,0.75)" }}
                        />
                        <Bar dataKey="submissions" fill="#ef4242" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Visitor Trend area chart */}
              <div className="border border-white/7 bg-white/2 rounded-sm p-5">
                <div className="mb-4">
                  <p className="font-nord text-sm text-white">Visitor Trend</p>
                  <p className="text-xs text-white/35">Rolling window of unique visits from first-party analytics.</p>
                </div>
                {analyticsOverview === null ? (
                  <div className="h-[220px] flex items-center justify-center">
                    <p className="text-xs text-white/35">Fetching analytics...</p>
                  </div>
                ) : (
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analyticsOverview.windows}>
                        <defs>
                          <linearGradient id="visitorGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4242" stopOpacity={0.18} />
                            <stop offset="95%" stopColor="#ef4242" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} minTickGap={18} />
                        <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ background: "#090909", border: "1px solid rgba(255,255,255,0.08)" }}
                          labelStyle={{ color: "rgba(255,255,255,0.75)" }}
                        />
                        <Area
                          type="monotone"
                          dataKey="visits"
                          stroke="#ef4242"
                          strokeWidth={2}
                          fill="url(#visitorGradient)"
                          fillOpacity={0.1}
                          dot={false}
                          name="Visits"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Contact capture breakdown + browser breakdown */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="border border-white/7 bg-white/2 rounded-sm p-5">
                  <div className="mb-4">
                    <p className="font-nord text-sm text-white">Contact Capture Breakdown</p>
                    <p className="text-xs text-white/35">How contacts were captured — email, phone, both, or neither.</p>
                  </div>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={contactCaptureData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {contactCaptureData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: "#090909", border: "1px solid rgba(255,255,255,0.08)" }}
                          labelStyle={{ color: "rgba(255,255,255,0.75)" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
                    {contactCaptureData.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: entry.fill }} />
                        <span className="text-[11px] text-white/50">{entry.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-white/7 bg-white/2 rounded-sm p-5">
                  <div className="mb-4">
                    <p className="font-nord text-sm text-white">Browser Breakdown</p>
                    <p className="text-xs text-white/35">Top browsers by visit count from first-party analytics.</p>
                  </div>
                  {browserData.length === 0 ? (
                    <div className="h-[220px] flex items-center justify-center">
                      <p className="text-xs text-white/35">No browser data yet.</p>
                    </div>
                  ) : (
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={browserData}
                          margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
                        >
                          <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                          <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} allowDecimals={false} />
                          <YAxis type="category" dataKey="name" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} width={72} />
                          <Tooltip
                            contentStyle={{ background: "#090909", border: "1px solid rgba(255,255,255,0.08)" }}
                            labelStyle={{ color: "rgba(255,255,255,0.75)" }}
                          />
                          <Bar dataKey="value" barSize={12} radius={[0, 2, 2, 0]} name="Visits">
                            {browserData.map((entry, index) => (
                              <Cell key={`browser-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>

              {/* Top projects by taps */}
              <div className="border border-white/7 bg-white/2 rounded-sm p-5">
                <div className="mb-4">
                  <p className="font-nord text-sm text-white">Top Projects by Taps</p>
                  <p className="text-xs text-white/35">Projects ranked by total tap count recorded in the tracking database.</p>
                </div>
                {tapsPerProject.length === 0 ? (
                  <div className="h-[260px] flex items-center justify-center">
                    <p className="text-xs text-white/35">No tap data yet.</p>
                  </div>
                ) : (
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={tapsPerProject}
                        margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
                      >
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                        <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} allowDecimals={false} />
                        <YAxis type="category" dataKey="label" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} width={120} />
                        <Tooltip
                          contentStyle={{ background: "#090909", border: "1px solid rgba(255,255,255,0.08)" }}
                          labelStyle={{ color: "rgba(255,255,255,0.75)" }}
                        />
                        <Bar dataKey="taps" fill="#ef4242" barSize={12} radius={[0, 2, 2, 0]} name="Taps" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-nord text-sm text-white">Project Views Refresh</p>
                      <p className="text-xs text-white/35">Scans every linked project video, updates stored view counts, and auto-runs roughly every 20 minutes while the admin center is open.</p>
                    </div>
                    <button
                      className={btnRed}
                      onClick={() => void refreshProjectViewsAudit()}
                      disabled={projectViewsRefreshing}
                    >
                      {projectViewsRefreshing ? "Refreshing..." : "Refresh"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="border border-white/8 rounded-sm p-3">
                      <p className="text-[10px] tracking-widest uppercase text-white/35 mb-1">Total Views</p>
                      <p className="font-nord text-xl text-white">
                        {projectViewsAuditSummary
                          ? projectViewsAuditSummary.totalProjectViews.toLocaleString()
                          : "Not run yet"}
                      </p>
                    </div>
                    <div className="border border-white/8 rounded-sm p-3">
                      <p className="text-[10px] tracking-widest uppercase text-white/35 mb-1">Last Refresh</p>
                      <p className="text-xs text-white/55">
                        {projectViewsAuditSummary?.refreshedAt ? fmtDateTime(projectViewsAuditSummary.refreshedAt) : "Not run yet"}
                      </p>
                    </div>
                  </div>
                  <div className="border border-white/8 rounded-sm bg-black/30">
                    <div className="px-3 py-2 border-b border-white/8 text-[10px] tracking-widest uppercase text-white/35">
                      Console
                    </div>
                    <pre className="h-80 overflow-auto px-3 py-3 text-[11px] leading-5 text-white/60 whitespace-pre-wrap">
                      {projectViewsAuditLog.join("\n")}
                    </pre>
                  </div>
                </div>

                <SpotifyConnection />
              </div>

            </div>
          )}

          {/* ─────────────────────────────────────
              PROJECTS
          ───────────────────────────────────── */}
          {activeSection === "projects" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-white/35">Create, edit, reorder and feature portfolio projects.</p>
                <button className={btnRed} onClick={() => setProjectModal({ open: true })}>+ New Project</button>
              </div>
              {/* Filter bar */}
              <div className="flex flex-wrap gap-3">
                <input
                  className={`${inputCls} max-w-xs`}
                  placeholder="Search projects…"
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                />
                <select
                  className={`${inputCls} max-w-[200px]`}
                  value={projectCategoryFilter}
                  onChange={(e) => setProjectCategoryFilter(e.target.value)}
                >
                  <option value="">All categories</option>
                  <option value="arts-and-entertainment">Arts & Entertainment</option>
                  <option value="motion-and-graphics">Motion & Graphics</option>
                  <option value="coding-projects">Engineering</option>
                </select>
                <select
                  className={`${inputCls} max-w-[170px]`}
                  value={projectSort}
                  onChange={(e) => setProjectSort(e.target.value as typeof projectSort)}
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="az">A-Z</option>
                  <option value="za">Z-A</option>
                  <option value="category">Category + Subcategory</option>
                </select>
                <span className="text-xs text-white/30 self-center ml-auto">{filteredProjects.length} projects</span>
              </div>

              {/* Table */}
              <div className="border border-white/8 rounded-sm overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-white/2 border-b border-white/8">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 w-12">Cover</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35">Title</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden lg:table-cell">Category</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden xl:table-cell">Subcategory</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35">Pricing</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden lg:table-cell">Taps</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden lg:table-cell">Featured</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden lg:table-cell">Visible</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden md:table-cell">Date</th>
                      <th className="px-3 py-2.5 text-right text-[10px] tracking-widest uppercase text-white/35">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.map((p) => (
                      <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                        <td className="px-3 py-2">
                          {p.coverImage ? (
                            <img
                              src={assetUrl(toEditableImageAsset(p.coverImage).src)}
                              alt={toEditableImageAsset(p.coverImage).alt ?? ""}
                              className="w-10 h-[30px] object-cover rounded-sm opacity-80"
                            />
                          ) : (
                            <div className="w-10 h-[30px] bg-white/5 rounded-sm" />
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => setProjectModal({ open: true, editing: p })}
                            className="text-white/80 hover:text-white text-left transition-colors font-medium truncate max-w-[200px] block"
                          >
                            {p.title}
                          </button>
                          {p.tags && p.tags.length > 0 && (
                            <div className="flex gap-1 mt-0.5 flex-wrap">
                              {p.tags.slice(0, 3).map((t) => (
                                <span key={t} className="text-[10px] text-white/25">{t}</span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-white/40 hidden lg:table-cell">{p.category}</td>
                        <td className="px-3 py-2 text-white/35 hidden xl:table-cell">{p.subcategory ?? "—"}</td>
                        <td className="px-3 py-2">
                          <PricingBadge status={p.pricing.status} />
                        </td>
                        <td className="px-3 py-2 text-white/40 hidden lg:table-cell">{tapCounts[p.id] ?? 0}</td>
                        <td className="px-3 py-2 hidden lg:table-cell">
                          {p.featured ? <span className="text-[#ef4242] text-xs">★</span> : <span className="text-white/20">—</span>}
                        </td>
                        <td className="px-3 py-2 hidden lg:table-cell">
                          {p.visible !== false ? <span className="text-emerald-400 text-xs">●</span> : <span className="text-white/20 text-xs">○</span>}
                        </td>
                        <td className="px-3 py-2 text-white/35 hidden md:table-cell">{fmtDate(p.publishDate)}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1.5 justify-end">
                            <a
                              className={btnGhost}
                              href={getProjectHref(p)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View
                            </a>
                            <button
                              className={btnOutline}
                              onClick={() => setProjectModal({ open: true, editing: p })}
                            >
                              Edit
                            </button>
                            <button
                              className={btnOutlineRed}
                              onClick={() => setDeleteConfirm({ type: "project", id: p.id, label: p.title })}
                            >
                              Del
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredProjects.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-3 py-8 text-center text-white/25 text-xs">No projects found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────
              ARTICLES
          ───────────────────────────────────── */}
          {activeSection === "articles" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-white/35">Write and manage articles, with rich sections and media.</p>
                <button className={btnRed} onClick={() => setArticleModal({ open: true })}>+ New Article</button>
              </div>
              <div className="flex flex-wrap gap-3">
                <input
                  className={`${inputCls} max-w-xs`}
                  placeholder="Search articles…"
                  value={articleSearch}
                  onChange={(e) => setArticleSearch(e.target.value)}
                />
                <select
                  className={`${inputCls} max-w-[170px]`}
                  value={articleSort}
                  onChange={(e) => setArticleSort(e.target.value as typeof articleSort)}
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="az">A-Z</option>
                  <option value="za">Z-A</option>
                </select>
                <span className="text-xs text-white/30 self-center ml-auto">{filteredArticles.length} articles</span>
              </div>

              <div className="border border-white/8 rounded-sm overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-white/2 border-b border-white/8">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 w-12">Cover</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35">Title</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden lg:table-cell">Category</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden xl:table-cell">Excerpt</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden lg:table-cell">Taps</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden lg:table-cell">Featured</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden lg:table-cell">Visible</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden md:table-cell">Date</th>
                      <th className="px-3 py-2.5 text-right text-[10px] tracking-widest uppercase text-white/35">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredArticles.map((a) => (
                      <tr key={a.id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                        <td className="px-3 py-2">
                          {a.coverImage ? (
                            <img
                              src={assetUrl(toEditableImageAsset(a.coverImage).src)}
                              alt={toEditableImageAsset(a.coverImage).alt ?? ""}
                              className="w-10 h-[30px] object-cover rounded-sm opacity-80"
                            />
                          ) : (
                            <div className="w-10 h-[30px] bg-white/5 rounded-sm" />
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <button
                            onClick={() => setArticleModal({ open: true, editing: a })}
                            className="text-white/80 hover:text-white text-left transition-colors font-medium truncate max-w-[220px] block"
                          >
                            {a.title}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 hidden lg:table-cell">
                          <span className="text-[10px] px-2 py-0.5 rounded-sm bg-white/8 text-white/40">{a.category}</span>
                        </td>
                        <td className="px-3 py-2.5 text-white/35 hidden xl:table-cell max-w-[200px]">
                          <span className="truncate block">{a.excerpt.slice(0, 60)}{a.excerpt.length > 60 ? "…" : ""}</span>
                        </td>
                        <td className="px-3 py-2.5 text-white/40 hidden lg:table-cell">{tapCounts[a.id] ?? 0}</td>
                        <td className="px-3 py-2.5 hidden lg:table-cell">
                          {a.featured ? <span className="text-[#ef4242] text-xs">★</span> : <span className="text-white/20">—</span>}
                        </td>
                        <td className="px-3 py-2.5 hidden lg:table-cell">
                          {a.visible !== false ? <span className="text-emerald-400 text-xs">●</span> : <span className="text-white/20 text-xs">○</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1.5 justify-end">
                            <a
                              className={btnGhost}
                              href={`/articles/${a.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View
                            </a>
                            <button className={btnOutline} onClick={() => setArticleModal({ open: true, editing: a })}>Edit</button>
                            <button className={btnOutlineRed} onClick={() => setDeleteConfirm({ type: "article", id: a.id, label: a.title })}>Del</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredArticles.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-3 py-8 text-center text-white/25 text-xs">No articles found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────
              CLIENTS
          ───────────────────────────────────── */}
          {activeSection === "clients" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-white/35">Manage clients and the people you&apos;ve worked with.</p>
                <button className={btnRed} onClick={() => setClientModal({ open: true })}>+ New Client</button>
              </div>
              <div className="flex flex-wrap gap-3">
                <input
                  className={`${inputCls} max-w-xs`}
                  placeholder="Search clients..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                />
                <select
                  className={`${inputCls} max-w-[170px]`}
                  value={clientSort}
                  onChange={(e) => setClientSort(e.target.value as typeof clientSort)}
                >
                  <option value="az">A-Z</option>
                  <option value="za">Z-A</option>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                </select>
                <span className="text-xs text-white/30 self-center ml-auto">{filteredClients.length} clients</span>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {filteredClients.map((c) => (
                <div key={c.id} className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {c.avatarUrl ? (
                        <img src={assetUrl(c.avatarUrl)} alt={c.name} className="w-9 h-9 rounded-full object-cover opacity-90" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center text-white/30 text-xs">
                          {c.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-white font-medium">{c.name}</p>
                        {c.location && <p className="text-[10px] text-white/30">{c.location}</p>}
                      </div>
                    </div>
                    {c.featured && (
                      <span className="text-[10px] px-2 py-0.5 rounded-sm bg-[#ef4242]/15 text-[#ef4242] flex-shrink-0">Featured</span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {c.roles.slice(0, 3).map((r) => (
                      <span key={r} className="text-[10px] px-2 py-0.5 rounded-sm bg-white/6 text-white/45">{r}</span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-white/30">
                    <span>{c.socialLinks.length} social link{c.socialLinks.length !== 1 ? "s" : ""}</span>
                    <span>{projects.filter((p) => p.clientIds?.includes(c.id)).length} project{projects.filter((p) => p.clientIds?.includes(c.id)).length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="text-[10px] text-white/20">id: {c.id}{c.quote && <span className="ml-2 text-[#d4a853]/60">has quote</span>}</div>

                  <div className="flex gap-2 pt-1 border-t border-white/6">
                    <a
                      className={btnGhost}
                      href={`/clients/${c.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View
                    </a>
                    <button className={`${btnOutline} flex-1`} onClick={() => setClientModal({ open: true, editing: c })}>Edit</button>
                    <button className={btnOutlineRed} onClick={() => setDeleteConfirm({ type: "client", id: c.id, label: c.name })}>Del</button>
                  </div>
                </div>
              ))}
              {filteredClients.length === 0 && (
                <div className="xl:col-span-3 text-center py-12 text-white/25 text-xs">No clients found.</div>
              )}
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────
              CONTACTS
          ───────────────────────────────────── */}
          {activeSection === "contacts" && (
            <div className="space-y-4">
              <div className="rounded-sm border border-white/8 bg-white/[0.02] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                  <div className="flex-1">
                    <p className="font-nord text-sm text-white">Contacts</p>
                    <p className="text-xs text-white/35">
                      Manage subscribers and outreach contacts collected from the site or added manually.
                    </p>
                  </div>
                  <button
                    className={`${btnRed} cursor-pointer`}
                    onClick={() => setContactModal({ open: true, editing: null })}
                  >
                    Add Contact
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <input
                  className={`${inputCls} max-w-xs`}
                  placeholder="Search contacts..."
                  value={contactsSearch}
                  onChange={(e) => setContactsSearch(e.target.value)}
                />
                <select
                  className={`${inputCls} max-w-[170px]`}
                  value={contactsSort}
                  onChange={(e) => setContactsSort(e.target.value as typeof contactsSort)}
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="az">A-Z</option>
                  <option value="za">Z-A</option>
                </select>
                <span className="rounded-sm border border-white/8 bg-white/[0.02] px-3 h-9 inline-flex items-center text-xs text-white/35 ml-auto">
                  {filteredContacts.length} contacts
                </span>
              </div>
              <div className="border border-white/8 rounded-sm overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-white/2 border-b border-white/8">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35">Name</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden md:table-cell">Email</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden lg:table-cell">Phone</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden md:table-cell">Source</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35">Subscribed</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden sm:table-cell">Date</th>
                      <th className="px-3 py-2.5 text-right text-[10px] tracking-widest uppercase text-white/35">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.map((c) => (
                      <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                        <td className="px-3 py-2.5 text-white/75">{c.name}</td>
                        <td className="px-3 py-2.5 text-white/45 hidden md:table-cell">{c.email || "-"}</td>
                        <td className="px-3 py-2.5 text-white/35 hidden lg:table-cell">{c.phone || "—"}</td>
                        <td className="px-3 py-2.5 text-white/35 hidden md:table-cell">{formatContactSource(c.source)}</td>
                        <td className="px-3 py-2.5">
                          <button
                            onClick={() => toggleContactSubscription(c.id)}
                            className={`text-[10px] px-2 py-0.5 rounded-sm transition-colors ${
                              c.subscribed
                                ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                                : "bg-white/8 text-white/35 hover:bg-white/12"
                            }`}
                          >
                            {c.subscribed ? "Yes" : "No"}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 text-white/30 hidden sm:table-cell">{fmtDate(c.createdAt)}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex justify-end gap-2">
                            <button
                              className={`${btnOutline} cursor-pointer`}
                              onClick={() => setContactModal({ open: true, editing: c })}
                            >
                              Edit
                            </button>
                            <button className={btnOutlineRed} onClick={() => setDeleteConfirm({ type: "contact", id: c.id, label: c.name })}>Del</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredContacts.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-white/25 text-xs">
                          No contacts found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────
              CAMPAIGNS
          ───────────────────────────────────── */}
          {activeSection === "rate-limits" && (
            <div className="space-y-4">
              <div className="rounded-sm border border-white/8 bg-white/[0.02] p-4">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-nord text-sm text-white">Rate Limits</p>
                    <p className="text-xs text-white/35">
                      Public forms are limited to 5 submissions per IP address for each form scope.
                    </p>
                  </div>
                  <div className="rounded-sm border border-white/8 bg-black/20 px-3 py-2 text-xs text-white/35">
                    Per-IP limit: 5
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <input
                  className={`${inputCls} max-w-sm`}
                  placeholder="Search rate limits..."
                  value={rateLimitSearch}
                  onChange={(e) => setRateLimitSearch(e.target.value)}
                />
                <span className="rounded-sm border border-white/8 bg-white/[0.02] px-3 h-9 inline-flex items-center text-xs text-white/35 ml-auto">
                  {filteredRateLimits.length} records
                </span>
              </div>
              <div className="border border-white/8 rounded-sm overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-white/2 border-b border-white/8">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35">Scope</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden md:table-cell">IP</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden lg:table-cell">Browser</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden xl:table-cell">Location</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35">Usage</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden lg:table-cell">Last Attempt</th>
                      <th className="px-3 py-2.5 text-right text-[10px] tracking-widest uppercase text-white/35">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRateLimits.map((entry) => (
                      <tr key={entry.id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                        <td className="px-3 py-2.5 text-white/75">
                          <div>{formatRateLimitScope(entry.scope)}</div>
                          {entry.notes && <div className="text-[10px] text-white/25">{entry.notes}</div>}
                        </td>
                        <td className="px-3 py-2.5 text-white/45 hidden md:table-cell">{entry.ip || "Removed"}</td>
                        <td className="px-3 py-2.5 text-white/35 hidden lg:table-cell">
                          <div>{entry.browser || "Removed"}</div>
                          {entry.userAgent && <div className="text-[10px] text-white/20 truncate max-w-[240px]">{entry.userAgent}</div>}
                        </td>
                        <td className="px-3 py-2.5 text-white/35 hidden xl:table-cell">
                          {[entry.city, entry.region, entry.country].filter(Boolean).join(", ") || "Unknown"}
                        </td>
                        <td className="px-3 py-2.5 text-white/60">
                          <div>{entry.count} / {entry.limit}</div>
                          <div className="text-[10px] text-[#ef4242]/75">{entry.blockedCount} blocked</div>
                        </td>
                        <td className="px-3 py-2.5 text-white/30 hidden lg:table-cell">{fmtDateTime(entry.lastAttemptAt)}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <button className={btnOutline} onClick={() => void mutateRateLimitRecord("reset", entry)}>Reset</button>
                            <button className={btnOutlineRed} onClick={() => void deleteRateLimit(entry.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredRateLimits.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-white/25 text-xs">No rate-limit records found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Chat AI Rate Limits */}
              <div className="rounded-sm border border-white/8 bg-white/[0.02] p-4 mt-6">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between mb-4">
                  <div>
                    <p className="font-nord text-sm text-white">Chat AI Rate Limits</p>
                    <p className="text-xs text-white/35">
                      Persistent per-IP limits for the AI chat assistant. Changes take effect immediately.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-[10px] tracking-widest uppercase text-white/35">Limit per IP:</label>
                    <input
                      type="number"
                      min={1}
                      className="w-16 h-8 rounded-sm border border-white/10 bg-white/4 px-2 text-xs text-white text-center focus:outline-none focus:border-white/30"
                      value={chatRateLimitConfig.rateLimit}
                      onChange={(e) => setChatRateLimitConfig((prev) => ({ ...prev, rateLimit: Math.max(1, Number(e.target.value) || 1) }))}
                    />
                    <label className="text-[10px] tracking-widest uppercase text-white/35">per</label>
                    <input
                      type="number"
                      min={1}
                      className="w-16 h-8 rounded-sm border border-white/10 bg-white/4 px-2 text-xs text-white text-center focus:outline-none focus:border-white/30"
                      value={chatRateLimitConfig.rateWindowHours}
                      onChange={(e) => setChatRateLimitConfig((prev) => ({ ...prev, rateWindowHours: Math.max(1, Number(e.target.value) || 1) }))}
                    />
                    <span className="text-[10px] tracking-widest uppercase text-white/35">hrs</span>
                    <button
                      className={btnOutline}
                      disabled={chatSaving}
                      onClick={() => void saveChatConfiguration()}
                    >
                      Save
                    </button>
                    <button
                      className={btnOutlineRed}
                      onClick={() => void runSave("Chat rate limits", async () => {
                        await adminRequest("/api/chat", { method: "DELETE", body: JSON.stringify({}) });
                        setChatRateLimitEntries([]);
                      })}
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {chatRateLimitEntries.length > 0 ? (
                  <div className="border border-white/8 rounded-sm overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-white/2 border-b border-white/8">
                        <tr>
                          <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35">IP Address</th>
                          <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35">Usage</th>
                          <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35">Resets At</th>
                          <th className="px-3 py-2.5 text-right text-[10px] tracking-widest uppercase text-white/35">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chatRateLimitEntries.map((entry) => (
                          <tr key={entry.ip} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                            <td className="px-3 py-2.5 text-white/60">{entry.ip}</td>
                            <td className="px-3 py-2.5 text-white/60">{entry.count} / {chatRateLimitConfig.rateLimit}</td>
                            <td className="px-3 py-2.5 text-white/35">{new Date(entry.resetAt).toLocaleString()}</td>
                            <td className="px-3 py-2.5 text-right">
                              <button
                                className={btnOutlineRed}
                                onClick={() => void runSave("Chat rate limit", async () => {
                                  await adminRequest("/api/chat", { method: "DELETE", body: JSON.stringify({ ip: entry.ip }) });
                                  setChatRateLimitEntries((prev) => prev.filter((e) => e.ip !== entry.ip));
                                })}
                              >
                                Clear
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-white/25 text-center py-4">No active chat rate limit entries.</p>
                )}
              </div>
            </div>
          )}

          {activeSection === "ai" && (
            <div className="space-y-6">
              <div className="rounded-sm border border-white/8 bg-white/[0.02] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-nord text-sm text-white">AI safety activity</p>
                    <p className="text-xs text-white/35 mt-0.5">Blocked prompt attacks are counted by broad category only. No message content, IP address, device, or identity is saved.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-nord text-white">{chatSecurity?.last7Days ?? "—"}</p>
                    <p className="text-[10px] tracking-widest uppercase text-white/35">last 7 days</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ["Instruction override", "instruction-override"],
                    ["Prompt exposure", "prompt-exposure"],
                    ["Role manipulation", "role-manipulation"],
                    ["Message forgery", "message-forgery"],
                  ].map(([label, key]) => (
                    <div key={key} className="rounded-sm border border-white/6 bg-white/[0.02] px-3 py-2">
                      <p className="text-lg text-white/75">{chatSecurity?.byCategory[key] ?? "—"}</p>
                      <p className="text-[10px] leading-snug text-white/35">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* What the assistant already knows (read-only, from the live site data) */}
              <div className="rounded-sm border border-white/8 bg-white/[0.02] p-5 space-y-3">
                <div>
                  <p className="font-nord text-sm text-white">What the assistant knows</p>
                  <p className="text-xs text-white/35 mt-0.5">The AI is grounded in your live site data — it&apos;s rebuilt on every message, so edits elsewhere in the admin update it automatically.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    ["Projects", "Every project — title, description, category, clients, GitHub, view counts."],
                    ["Articles", "All articles, excerpts, and section anchors it can scroll to."],
                    ["Clients", "Clients/creators and what Michael did with them."],
                    ["Resume & experience", "Roles, dates, education, skills, certifications, awards, organizations."],
                    ["Site map & pages", "Every page URL — it can navigate, highlight, zoom, and run the projects walkthrough."],
                    ["Controls", "Theme switching, text size, accessibility toggles, contact + meeting booking."],
                    ["Visitor context", "Time of day, returning vs. new, recent topics — used only to colour tone."],
                    ["Voice", "Reads replies aloud in Michael's voice; same voice powers the tour and voice chat."],
                  ].map(([t, d]) => (
                    <div key={t} className="rounded-sm border border-white/6 bg-white/[0.02] px-3 py-2">
                      <p className="text-[11px] text-white/70 font-medium">{t}</p>
                      <p className="text-[10px] text-white/35 leading-relaxed mt-0.5">{d}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-white/25">Backend, tracking, tap/view algorithms, and this admin stay private automatically — the assistant refuses to reveal them.</p>
              </div>

              {/* Admin-authored AI context / prompting */}
              <div className="rounded-sm border border-white/8 bg-white/[0.02] p-5 space-y-2">
                <div>
                  <p className="font-nord text-sm text-white">Your context &amp; prompting</p>
                  <p className="text-xs text-white/35">
                    Extra knowledge + guidance for the assistant (e.g. current availability, what to emphasize to recruiters, how to steer answers). Treated as authoritative and injected into its instructions. Do NOT put anything secret here — visitors can draw on it through the chat.
                  </p>
                </div>
                <textarea
                  value={chatRateLimitConfig.extraContext ?? ""}
                  onChange={(e) => setChatRateLimitConfig((prev) => ({ ...prev, extraContext: e.target.value }))}
                  rows={10}
                  maxLength={8000}
                  placeholder="e.g. Michael is currently open to full-time roles starting June 2026. He's especially interested in full-stack and platform engineering work. When recruiters ask about availability, mention he can start within two weeks…"
                  className="w-full rounded-sm border border-white/10 bg-white/4 px-3 py-2 text-xs text-white outline-none focus:border-white/30 resize-y font-jb leading-relaxed"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/30">{(chatRateLimitConfig.extraContext ?? "").length} / 8000</span>
                  <button
                    className={btnOutline}
                    disabled={chatSaving}
                      onClick={() => void saveChatConfiguration()}
                  >
                    Save Context
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === "contact-form-entries" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <input
                  className={`${inputCls} max-w-sm`}
                  value={messageSearch}
                  onChange={(e) => setMessageSearch(e.target.value)}
                  placeholder="Search messages..."
                />
                <select
                  className={`${inputCls} max-w-[180px]`}
                  value={messagesSort}
                  onChange={(e) => setMessagesSort(e.target.value as typeof messagesSort)}
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="read">Read First</option>
                  <option value="unread">Unread First</option>
                  <option value="az">A-Z</option>
                  <option value="za">Z-A</option>
                </select>
                <button
                  className={btnOutline}
                  onClick={() => setMessageReadState(contactFormEntries.map((entry) => entry.id), true)}
                  disabled={contactFormEntries.length === 0}
                >
                  Mark All Read
                </button>
                <button
                  className={btnOutline}
                  onClick={() => setMessageReadState(contactFormEntries.map((entry) => entry.id), false)}
                  disabled={contactFormEntries.length === 0}
                >
                  Mark All Unread
                </button>
                <span className="text-xs text-white/30 self-center ml-auto">
                  {unreadMessages} unread / {contactFormEntries.length} total
                </span>
              </div>
              {contactFormEntries.length === 0 ? (
                <div className="rounded-sm border border-white/8 px-4 py-8 text-center text-xs text-white/25">
                  No messages yet.
                </div>
              ) : filteredMessageEntries.length === 0 ? (
                <div className="rounded-sm border border-white/8 px-4 py-8 text-center text-xs text-white/25">
                  No messages match that search.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredMessageEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className={`rounded-sm border p-4 [overflow-wrap:anywhere] ${
                        entry.messageRead
                          ? "border-white/8 bg-white/[0.02]"
                          : "border-[#ef4242]/20 bg-[#ef4242]/[0.03]"
                      }`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm text-white/80">{entry.name}</span>
                            <span className={`rounded-sm px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                              entry.messageRead
                                ? "border border-white/10 bg-white/4 text-white/35"
                                : "border border-[#ef4242]/20 bg-[#ef4242]/10 text-[#ef4242]"
                            }`}>
                              {entry.messageRead ? "Read" : "Unread"}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-[11px] text-white/35">
                            <span>{entry.email || "No email"}</span>
                            <span>{entry.phone || "No phone"}</span>
                            <span>{fmtDate(entry.createdAt)}</span>
                          </div>
                          {entry.subject && (
                            <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                              {entry.subject}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className={btnOutline}
                            onClick={() => setMessageReadState([entry.id], !entry.messageRead)}
                          >
                            Mark {entry.messageRead ? "Unread" : "Read"}
                          </button>
                          <button
                            className={btnOutlineRed}
                            onClick={() =>
                              setDeleteConfirm({ type: "contact", id: entry.id, label: entry.name })
                            }
                          >
                            Del
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 whitespace-pre-wrap break-words rounded-sm border border-white/6 bg-black/20 px-3 py-3 text-xs leading-relaxed text-white/55">
                        {entry.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection === "r2-assets" && (
            <div className="space-y-6">
              <R2StatsBar />
              <div
                className={`border bg-white/2 rounded-sm p-5 space-y-4 relative transition-colors ${r2DragOver ? "border-[#ef4242]/50 bg-[#ef4242]/5" : "border-white/7"}`}
                onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setR2DragOver(true); } }}
                onDragEnter={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setR2DragOver(true); } }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setR2DragOver(false); }}
                onDrop={(e) => { e.preventDefault(); setR2DragOver(false); if (e.dataTransfer.types.includes("Files")) void uploadR2Files(e.dataTransfer.files); }}
              >
                {r2DragOver && (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-sm border-2 border-dashed border-[#ef4242]/60 bg-[#ef4242]/8">
                    <p className="font-nord text-sm text-[#ef4242]">Drop files to upload</p>
                  </div>
                )}
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                  <div className="flex-1">
                    <p className="font-nord text-sm text-white">Cloudflare R2 Bucket</p>
                    <p className="text-xs text-white/35">
                      Browse folders, search assets, upload files into the current folder, delete files, and copy public CDN links. Drag files to upload or drag file rows to folders to move.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className={btnOutline}
                      onClick={() => void loadR2Assets()}
                      disabled={r2Loading}
                    >
                      {r2Loading ? "Refreshing..." : "Refresh"}
                    </button>
                    <button
                      className={btnGhost}
                      onClick={() => r2FileInputRef.current?.click()}
                      disabled={r2Uploading}
                    >
                      {r2Uploading ? "Uploading..." : "Upload File"}
                    </button>
                    <button
                      className={btnOutline}
                      onClick={() => setR2ShowNewFolder(true)}
                    >
                      New Folder
                    </button>
                    <input
                      ref={r2FileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => void uploadR2Files(e.target.files)}
                    />
                  </div>
                </div>

                {r2ShowNewFolder && (
                  <div className="flex items-center gap-2">
                    <input
                      className={inputCls + " flex-1"}
                      placeholder="Folder name..."
                      value={r2NewFolderName}
                      onChange={(e) => setR2NewFolderName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") void createR2FolderHandler(); if (e.key === "Escape") { setR2ShowNewFolder(false); setR2NewFolderName(""); } }}
                      autoFocus
                    />
                    <button className={btnRed} onClick={() => void createR2FolderHandler()} disabled={r2CreatingFolder || !r2NewFolderName.trim()}>
                      {r2CreatingFolder ? "Creating..." : "Create"}
                    </button>
                    <button className={btnOutline} onClick={() => { setR2ShowNewFolder(false); setR2NewFolderName(""); }}>Cancel</button>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
                  <input
                    className={inputCls}
                    value={r2Search}
                    onChange={(e) => setR2Search(e.target.value)}
                    placeholder="Search this folder or bucket..."
                  />
                  <div className="flex gap-2">
                    <button
                      className={btnOutline}
                      onClick={() => {
                        setR2Search("");
                        void loadR2Assets({ search: "" });
                      }}
                      disabled={!r2Search}
                    >
                      Clear Search
                    </button>
                    <button
                      className={btnOutline}
                      onClick={goUpOneR2Level}
                      disabled={!r2Prefix}
                    >
                      Up One Level
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-sm border border-white/8 bg-black/20 px-3 py-2 text-[11px] text-white/35">
                  <button
                    type="button"
                    disabled={!r2Prefix}
                    onClick={goUpOneR2Level}
                    className="shrink-0 text-[11px] text-white/40 hover:text-white/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Back
                  </button>
                  <span className="text-white/20">|</span>
                  <span>
                    <span className="text-white/50">Location:</span>{" "}
                    {r2Mode === "search"
                      ? `Search results for "${r2Search.trim()}" in ${r2Prefix || "bucket root"}`
                      : r2Prefix || "bucket root"}
                  </span>
                </div>

                {r2Error && (
                  <div className="rounded-sm border border-[#ef4242]/20 bg-[#ef4242]/8 px-3 py-2 text-xs text-[#ef4242]">
                    {r2Error}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                <div className="border border-white/7 bg-white/2 rounded-sm overflow-hidden">
                  <div className="border-b border-white/8 px-4 py-3 text-[10px] tracking-widest uppercase text-white/35">
                    Folders
                  </div>
                  <div className="max-h-[520px] overflow-y-auto">
                    {r2Folders.length === 0 ? (
                      <div className="px-4 py-6 text-xs text-white/25">
                        {r2Mode === "search" ? "Folder browse is disabled while searching." : "No folders in this location."}
                      </div>
                    ) : (
                      r2Folders.map((folder) => (
                        <button
                          key={folder.prefix}
                          className={`flex w-full items-center justify-between border-b px-4 py-3 text-left text-xs transition-colors ${r2DropTarget === folder.prefix ? "border-[#ef4242]/40 bg-[#ef4242]/10 text-[#ef4242]" : "border-white/6 text-white/55 hover:bg-white/3 hover:text-white"}`}
                          onClick={() => {
                            setR2Search("");
                            setR2Prefix(folder.prefix);
                          }}
                          onDragOver={(e) => { if (r2DragFile) { e.preventDefault(); setR2DropTarget(folder.prefix); } }}
                          onDragEnter={(e) => { if (r2DragFile) { e.preventDefault(); setR2DropTarget(folder.prefix); } }}
                          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setR2DropTarget(null); }}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (r2DragFile) {
                              const filename = r2DragFile.key.split("/").pop() ?? r2DragFile.name;
                              void moveR2File(r2DragFile.key, `${folder.prefix}${filename}`);
                            }
                            setR2DropTarget(null);
                            setR2DragFile(null);
                          }}
                        >
                          <span className="truncate">{folder.name}/</span>
                          <span className={r2DropTarget === folder.prefix ? "text-[#ef4242]/60" : "text-white/20"}>
                            {r2DropTarget === folder.prefix ? "Drop here" : "Open"}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="border border-white/7 bg-white/2 rounded-sm overflow-hidden">
                  <div className="border-b border-white/8 px-4 py-3 text-[10px] tracking-widest uppercase text-white/35">
                    Files ({r2Files.length})
                  </div>
                  {r2Files.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-white/25">
                      {r2Loading ? "Loading assets..." : "No files found."}
                    </div>
                  ) : (
                    <div className="max-h-[520px] overflow-y-auto">
                      {r2Files.map((file) => (
                        <div
                          key={file.key}
                          draggable
                          onDragStart={(e) => {
                            setR2DragFile(file);
                            e.dataTransfer.setData("text/plain", file.key);
                          }}
                          onDragEnd={() => { setR2DragFile(null); setR2DropTarget(null); }}
                          className={`border-b border-white/6 px-4 py-3 last:border-b-0 transition-opacity cursor-grab ${r2DragFile?.key === file.key ? "opacity-40" : ""}`}
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex min-w-0 items-start gap-3">
                              {isImageAssetFile(file.name) ? (
                                <button
                                  type="button"
                                  onClick={() => setR2PreviewFile(file)}
                                  className="block shrink-0 transition-opacity hover:opacity-90"
                                >
                                  <img
                                    src={file.publicUrl}
                                    alt={file.name}
                                    className="h-14 w-20 rounded-sm border border-white/8 bg-black/20 object-cover"
                                  />
                                </button>
                              ) : (
                                <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-sm border border-white/8 bg-black/20 text-[10px] uppercase tracking-[0.18em] text-white/20">
                                  File
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="truncate text-xs text-white/75" title={file.key}>{r2DisplayName(file.key)}</div>
                                <div className="truncate text-[10px] text-white/25">{file.publicUrl}</div>
                                <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-white/25">
                                  <span>{formatBytes(file.size)}</span>
                                  <span>{fmtDateTime(file.lastModified)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <a
                                href={file.publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={btnOutline}
                              >
                                Open
                              </a>
                              <button
                                className={`${btnOutline} cursor-pointer`}
                                onClick={() => void copyR2Link(file.publicUrl)}
                              >
                                {r2CopiedUrl === file.publicUrl ? "Copied." : "Copy Link"}
                              </button>
                              <button
                                className={`${btnOutline} cursor-pointer`}
                                onClick={() => { setR2RenameTarget(file); setR2RenameValue(file.name); }}
                              >
                                Rename
                              </button>
                              <button
                                className={btnOutlineRed}
                                onClick={() => void deleteR2File(file.key)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === "site-content" && (
            <div className="space-y-6">
              <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-nord text-sm text-white">Editable Site Copy</p>
                    <p className="text-xs text-white/35">
                      Saved to MongoDB and used to drive shared brand assets, homepage copy and order, footer content, work and subpage headers, and legal page content.
                    </p>
                  </div>
                  <span className="text-[11px] tracking-wider text-white/30">
                    {siteContentAutoSaved ? "Saved" : "Auto-saves on change"}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div>
                    <Label>Shared Logo URL</Label>
                    <div className="grid grid-cols-[1.6fr_auto] gap-2">
                      <input
                        className={inputCls}
                        value={siteContent.brandLogoUrl}
                        onChange={(e) =>
                          setSiteContent((prev) => ({
                            ...prev,
                            brandLogoUrl: e.target.value,
                          }))
                        }
                        placeholder="https://cdn.mdcran.com/WEB_ASSETS/LOGOS/AI_MDCRAN_BLUE.png"
                      />
                      <button
                        type="button"
                        className={`${btnOutline} cursor-pointer`}
                        onClick={() => setSiteContentImageTarget("brandLogoUrl")}
                      >
                        Select Image
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label>Favicon URL</Label>
                    <div className="grid grid-cols-[1.6fr_auto] gap-2">
                      <input
                        className={inputCls}
                        value={siteContent.faviconUrl}
                        onChange={(e) =>
                          setSiteContent((prev) => ({
                            ...prev,
                            faviconUrl: e.target.value,
                          }))
                        }
                        placeholder="https://cdn.mdcran.com/WEB_ASSETS/LOGOS/AI_MDCRAN_BLUE.png"
                      />
                      <button
                        type="button"
                        className={`${btnOutline} cursor-pointer`}
                        onClick={() => setSiteContentImageTarget("faviconUrl")}
                      >
                        Select Image
                      </button>
                    </div>
                  </div>
                  <div className="flex items-end">
                    <div className="flex h-16 w-full items-center gap-3 rounded-sm border border-white/8 bg-black/20 px-3">
                      {siteContent.brandLogoUrl ? (
                        <img
                          src={assetUrl(siteContent.brandLogoUrl)}
                          alt="Shared brand logo preview"
                          className="max-h-10 w-auto rounded-sm object-contain"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-sm border border-white/10 bg-white/5" />
                      )}
                      <span className="text-xs text-white/35">Navbar, footer, and admin login logo</span>
                    </div>
                  </div>
                  <div className="flex items-end">
                    <div className="flex h-16 w-full items-center gap-3 rounded-sm border border-white/8 bg-black/20 px-3">
                      {siteContent.faviconUrl ? (
                        <img
                          src={assetUrl(siteContent.faviconUrl)}
                          alt="Favicon preview"
                          className="h-8 w-8 rounded-sm object-contain"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-sm border border-white/10 bg-white/5" />
                      )}
                      <span className="text-xs text-white/35">Browser tab, bookmark, and app icon metadata</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Announcement banner */}
              <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-nord text-sm text-white">Announcement Banner</p>
                    <p className="text-[11px] text-white/35">Thin stripe across the top of every page.</p>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer">
                    <input type="checkbox" className="accent-[#ef4242]" checked={siteContent.announcementBanner?.enabled ?? false} onChange={(e) => setSiteContent((prev) => ({ ...prev, announcementBanner: { ...prev.announcementBanner, enabled: e.target.checked } }))} />
                    Enabled
                  </label>
                </div>
                {/* Live preview */}
                {siteContent.announcementBanner?.message && (
                  <div className="rounded-sm overflow-hidden text-xs" style={{ background: siteContent.announcementBanner.bgColor, color: siteContent.announcementBanner.textColor }}>
                    <div className={`px-3 py-2 flex items-center gap-2 ${siteContent.announcementBanner.align === "left" ? "justify-start" : siteContent.announcementBanner.align === "right" ? "justify-end" : "justify-center"}`}>
                      {siteContent.announcementBanner.icon && <SkillIcon name={siteContent.announcementBanner.icon} size={14} />}
                      <span>{siteContent.announcementBanner.message}</span>
                      {siteContent.announcementBanner.ctaLabel && <span className="ml-2 border rounded-sm px-2 py-0.5 text-[10px] uppercase" style={{ borderColor: siteContent.announcementBanner.textColor }}>{siteContent.announcementBanner.ctaLabel}</span>}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <Label>Message</Label>
                    <input className={inputCls} value={siteContent.announcementBanner?.message ?? ""} onChange={(e) => setSiteContent((prev) => ({ ...prev, announcementBanner: { ...prev.announcementBanner, message: e.target.value } }))} placeholder="e.g. Now booking freelance projects for Q3" />
                  </div>
                  <div>
                    <Label>Icon</Label>
                    <div><IconPickerButton value={siteContent.announcementBanner?.icon} onChange={(icon) => setSiteContent((prev) => ({ ...prev, announcementBanner: { ...prev.announcementBanner, icon: icon ?? "" } }))} label="Icon" /></div>
                  </div>
                  <div>
                    <Label>Alignment</Label>
                    <select className={inputCls} value={siteContent.announcementBanner?.align ?? "center"} onChange={(e) => setSiteContent((prev) => ({ ...prev, announcementBanner: { ...prev.announcementBanner, align: e.target.value as "left" | "center" | "right" } }))}>
                      <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
                    </select>
                  </div>
                  <div>
                    <Label>Background color</Label>
                    <div className="flex gap-2">
                      <input type="color" className="h-9 w-10 rounded-sm bg-transparent border border-white/10 cursor-pointer" value={siteContent.announcementBanner?.bgColor ?? "#ef4242"} onChange={(e) => setSiteContent((prev) => ({ ...prev, announcementBanner: { ...prev.announcementBanner, bgColor: e.target.value } }))} />
                      <input className={inputCls} value={siteContent.announcementBanner?.bgColor ?? ""} onChange={(e) => setSiteContent((prev) => ({ ...prev, announcementBanner: { ...prev.announcementBanner, bgColor: e.target.value } }))} placeholder="#ef4242" />
                    </div>
                  </div>
                  <div>
                    <Label>Text color</Label>
                    <div className="flex gap-2">
                      <input type="color" className="h-9 w-10 rounded-sm bg-transparent border border-white/10 cursor-pointer" value={siteContent.announcementBanner?.textColor ?? "#ffffff"} onChange={(e) => setSiteContent((prev) => ({ ...prev, announcementBanner: { ...prev.announcementBanner, textColor: e.target.value } }))} />
                      <input className={inputCls} value={siteContent.announcementBanner?.textColor ?? ""} onChange={(e) => setSiteContent((prev) => ({ ...prev, announcementBanner: { ...prev.announcementBanner, textColor: e.target.value } }))} placeholder="#ffffff" />
                    </div>
                  </div>
                  <div>
                    <Label>CTA label (optional)</Label>
                    <input className={inputCls} value={siteContent.announcementBanner?.ctaLabel ?? ""} onChange={(e) => setSiteContent((prev) => ({ ...prev, announcementBanner: { ...prev.announcementBanner, ctaLabel: e.target.value } }))} placeholder="Learn more" />
                  </div>
                  <div>
                    <Label>CTA link</Label>
                    <input className={inputCls} value={siteContent.announcementBanner?.ctaHref ?? ""} onChange={(e) => setSiteContent((prev) => ({ ...prev, announcementBanner: { ...prev.announcementBanner, ctaHref: e.target.value } }))} placeholder="/contact" />
                  </div>
                  <div>
                    <Label>Show from (optional)</Label>
                    <DatePicker withTime value={siteContent.announcementBanner?.startsAt ?? ""} onChange={(v) => setSiteContent((prev) => ({ ...prev, announcementBanner: { ...prev.announcementBanner, startsAt: v } }))} placeholder="Always" />
                  </div>
                  <div>
                    <Label>Hide after (optional)</Label>
                    <DatePicker withTime value={siteContent.announcementBanner?.endsAt ?? ""} onChange={(v) => setSiteContent((prev) => ({ ...prev, announcementBanner: { ...prev.announcementBanner, endsAt: v } }))} placeholder="Never" />
                  </div>
                </div>
              </div>

              {/* Home: By the Numbers (stats) */}
              <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
                <p className="font-nord text-sm text-white">Home: By the Numbers</p>
                <div>
                  <Label>Eyebrow</Label>
                  <input
                    className={inputCls}
                    value={siteContent.homeStats?.eyebrow ?? ""}
                    onChange={(e) => setSiteContent((prev) => ({ ...prev, homeStats: { eyebrow: e.target.value, metrics: prev.homeStats?.metrics ?? [] } }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Metric labels (live values are computed automatically)</Label>
                  {(siteContent.homeStats?.metrics ?? []).map((m, mi) => (
                    <div key={m.key} className="grid grid-cols-1 sm:grid-cols-[120px_1fr_1.4fr] gap-2 items-center">
                      <span className="text-[10px] text-white/30 font-jb truncate">{m.key}</span>
                      <input
                        className={inputCls}
                        value={m.label}
                        onChange={(e) => setSiteContent((prev) => ({ ...prev, homeStats: { eyebrow: prev.homeStats.eyebrow, metrics: prev.homeStats.metrics.map((x, i) => (i === mi ? { ...x, label: e.target.value } : x)) } }))}
                        placeholder="Label"
                      />
                      <input
                        className={inputCls}
                        value={m.description}
                        onChange={(e) => setSiteContent((prev) => ({ ...prev, homeStats: { eyebrow: prev.homeStats.eyebrow, metrics: prev.homeStats.metrics.map((x, i) => (i === mi ? { ...x, description: e.target.value } : x)) } }))}
                        placeholder="Description"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Home: AI Usage Tracker */}
              <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-nord text-sm text-white">Home: AI Usage Tracker</p>
                  <span className="text-[10px] text-white/25">Updates monthly — edit here, then save.</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="col-span-2">
                    <Label>Combined AI Tokens (optional override)</Label>
                    <input type="number" min="0" step="1" className={inputCls}
                      placeholder="Auto: Claude + OpenAI totals"
                      value={siteContent.aiUsageTracker?.totalTokens ?? ""}
                      onChange={(e) => setSiteContent(prev => ({ ...prev, aiUsageTracker: { ...prev.aiUsageTracker, totalTokens: e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)) } }))} />
                    <p className="mt-2 text-[10px] text-white/40">Use a verified usage report. This is a reported metric; ChatGPT lifetime usage is not synced.</p>
                  </div>
                  <div className="col-span-2">
                    <Label>Access Note</Label>
                    <input className={inputCls} value={siteContent.aiUsageTracker?.accessNote ?? ""}
                      onChange={(e) => setSiteContent(prev => ({ ...prev, aiUsageTracker: { ...prev.aiUsageTracker, accessNote: e.target.value } }))} />
                    <label className="mt-2 flex min-h-11 items-center gap-2 text-xs text-white/60"><input type="checkbox" checked={siteContent.aiUsageTracker?.accessNoteEnabled ?? false}
                      onChange={(e) => setSiteContent(prev => ({ ...prev, aiUsageTracker: { ...prev.aiUsageTracker, accessNoteEnabled: e.target.checked } }))} />Show access note on homepage</label>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Label>Last Updated</Label>
                    <DatePicker
                      value={siteContent.aiUsageTracker?.lastUpdated ?? ""}
                      onChange={(v) => setSiteContent((prev) => ({ ...prev, aiUsageTracker: { ...prev.aiUsageTracker, lastUpdated: v } }))}
                    />
                  </div>
                  <div>
                    <Label>Claude Total Tokens</Label>
                    <input
                      type="number"
                      className={inputCls}
                      value={siteContent.aiUsageTracker?.claude.totalTokens ?? 0}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, aiUsageTracker: { ...prev.aiUsageTracker, claude: { ...prev.aiUsageTracker.claude, totalTokens: Number(e.target.value) } } }))}
                    />
                  </div>
                  <div>
                    <Label>Claude Total Messages</Label>
                    <input
                      type="number"
                      className={inputCls}
                      value={siteContent.aiUsageTracker?.claude.totalMessages ?? 0}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, aiUsageTracker: { ...prev.aiUsageTracker, claude: { ...prev.aiUsageTracker.claude, totalMessages: Number(e.target.value) } } }))}
                    />
                  </div>
                  <div>
                    <Label>Peak Hour</Label>
                    <input
                      className={inputCls}
                      value={siteContent.aiUsageTracker?.claude.peakHour ?? ""}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, aiUsageTracker: { ...prev.aiUsageTracker, claude: { ...prev.aiUsageTracker.claude, peakHour: e.target.value } } }))}
                      placeholder="1 AM"
                    />
                  </div>
                </div>

                <div className="max-w-xs">
                  <Label>Favorite Model</Label>
                  <input
                    className={inputCls}
                    value={siteContent.aiUsageTracker?.claude.favoriteModel ?? ""}
                    onChange={(e) => setSiteContent((prev) => ({ ...prev, aiUsageTracker: { ...prev.aiUsageTracker, claude: { ...prev.aiUsageTracker.claude, favoriteModel: e.target.value } } }))}
                    placeholder="Opus 4.8"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Claude Model Breakdown</Label>
                    <button
                      className={btnOutline}
                      onClick={() => setSiteContent((prev) => ({
                        ...prev,
                        aiUsageTracker: {
                          ...prev.aiUsageTracker,
                          claude: { ...prev.aiUsageTracker.claude, models: [...prev.aiUsageTracker.claude.models, { name: "", percent: 0 }] },
                        },
                      }))}
                    >
                      + Add Model
                    </button>
                  </div>
                  {(siteContent.aiUsageTracker?.claude.models ?? []).map((model, mi) => (
                    <div key={mi} className="grid grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_1fr_1fr_auto] gap-2 items-center">
                      <input
                        className={inputCls}
                        value={model.name}
                        placeholder="Model name"
                        onChange={(e) => setSiteContent((prev) => ({ ...prev, aiUsageTracker: { ...prev.aiUsageTracker, claude: { ...prev.aiUsageTracker.claude, models: prev.aiUsageTracker.claude.models.map((m, i) => (i === mi ? { ...m, name: e.target.value } : m)) } } }))}
                      />
                      <input
                        type="number"
                        className={inputCls}
                        value={model.percent}
                        placeholder="%"
                        onChange={(e) => setSiteContent((prev) => ({ ...prev, aiUsageTracker: { ...prev.aiUsageTracker, claude: { ...prev.aiUsageTracker.claude, models: prev.aiUsageTracker.claude.models.map((m, i) => (i === mi ? { ...m, percent: Number(e.target.value) } : m)) } } }))}
                      />
                      <input
                        type="number"
                        className={inputCls}
                        value={model.inputTokens ?? ""}
                        placeholder="Input tokens"
                        onChange={(e) => setSiteContent((prev) => ({ ...prev, aiUsageTracker: { ...prev.aiUsageTracker, claude: { ...prev.aiUsageTracker.claude, models: prev.aiUsageTracker.claude.models.map((m, i) => (i === mi ? { ...m, inputTokens: e.target.value ? Number(e.target.value) : undefined } : m)) } } }))}
                      />
                      <input
                        type="number"
                        className={inputCls}
                        value={model.outputTokens ?? ""}
                        placeholder="Output tokens"
                        onChange={(e) => setSiteContent((prev) => ({ ...prev, aiUsageTracker: { ...prev.aiUsageTracker, claude: { ...prev.aiUsageTracker.claude, models: prev.aiUsageTracker.claude.models.map((m, i) => (i === mi ? { ...m, outputTokens: e.target.value ? Number(e.target.value) : undefined } : m)) } } }))}
                      />
                      <button
                        className="text-[#ef4242]/60 hover:text-[#ef4242] text-xs px-2"
                        onClick={() => setSiteContent((prev) => ({ ...prev, aiUsageTracker: { ...prev.aiUsageTracker, claude: { ...prev.aiUsageTracker.claude, models: prev.aiUsageTracker.claude.models.filter((_, i) => i !== mi) } } }))}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/6">
                  <div>
                    <Label>OpenAI Total Tokens</Label>
                    <input
                      type="number"
                      className={inputCls}
                      value={siteContent.aiUsageTracker?.openai.totalTokens ?? 0}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, aiUsageTracker: { ...prev.aiUsageTracker, openai: { ...prev.aiUsageTracker.openai, totalTokens: Number(e.target.value) } } }))}
                    />
                  </div>
                  <div>
                    <Label>OpenAI Total Requests</Label>
                    <input
                      type="number"
                      className={inputCls}
                      value={siteContent.aiUsageTracker?.openai.totalRequests ?? 0}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, aiUsageTracker: { ...prev.aiUsageTracker, openai: { ...prev.aiUsageTracker.openai, totalRequests: Number(e.target.value) } } }))}
                    />
                  </div>
                  <div>
                    <Label>ElevenLabs Characters Used</Label>
                    <input
                      type="number"
                      className={inputCls}
                      value={siteContent.aiUsageTracker?.elevenlabs.charactersUsed ?? 0}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, aiUsageTracker: { ...prev.aiUsageTracker, elevenlabs: { ...prev.aiUsageTracker.elevenlabs, charactersUsed: Number(e.target.value) } } }))}
                    />
                  </div>
                  <div>
                    <Label>ElevenLabs Quota (optional)</Label>
                    <input
                      type="number"
                      className={inputCls}
                      value={siteContent.aiUsageTracker?.elevenlabs.charactersQuota ?? ""}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, aiUsageTracker: { ...prev.aiUsageTracker, elevenlabs: { ...prev.aiUsageTracker.elevenlabs, charactersQuota: e.target.value ? Number(e.target.value) : undefined } } }))}
                    />
                  </div>
                </div>
              </div>

              {([
                ["homeServices", "Home: Services Section"],
                ["artsAndEntertainment", "Arts & Entertainment Page"],
                ["motionAndGraphics", "Motion & Graphics Page"],
              ] as const).map(([key, label]) => {
                const block = siteContent[key];
                const showCountField = key === "artsAndEntertainment";
                const showItemsField = key === "homeServices";
                const cardGridClass = showCountField && showItemsField
                  ? "grid-cols-4"
                  : showCountField || showItemsField
                    ? "grid-cols-3"
                    : "grid-cols-2";
                const descriptionSpanClass = showCountField && showItemsField
                  ? "col-span-4"
                  : showCountField || showItemsField
                    ? "col-span-3"
                    : "col-span-2";

                return (
                  <div key={key} className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
                    <p className="font-nord text-sm text-white">{label}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <Label>Eyebrow</Label>
                        <input
                          className={inputCls}
                          value={block.eyebrow}
                          onChange={(e) =>
                            setSiteContent((prev) => ({
                              ...prev,
                              [key]: { ...prev[key], eyebrow: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Title</Label>
                        <input
                          className={inputCls}
                          value={block.title}
                          onChange={(e) =>
                            setSiteContent((prev) => ({
                              ...prev,
                              [key]: { ...prev[key], title: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <textarea
                          className={textareaCls}
                          rows={2}
                          value={block.description}
                          onChange={(e) =>
                            setSiteContent((prev) => ({
                              ...prev,
                              [key]: { ...prev[key], description: e.target.value },
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      {(block.cards ?? []).map((card, cardIndex) => (
                        <div key={`${key}-${cardIndex}`} className={`grid ${cardGridClass} gap-3 rounded-sm border border-white/8 p-3`}>
                          <div className={descriptionSpanClass}>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] tracking-widest uppercase text-white/30">
                                Card {cardIndex + 1}
                              </span>
                              <button
                                type="button"
                                className="text-[#ef4242]/70 hover:text-[#ef4242] text-[11px] cursor-pointer"
                                onClick={() =>
                                  setSiteContent((prev) => ({
                                    ...prev,
                                    [key]: {
                                      ...prev[key],
                                      cards: (prev[key].cards ?? []).filter((_, index) => index !== cardIndex),
                                    },
                                  }))
                                }
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                          <div>
                            <Label>Card Title</Label>
                            <input
                              className={inputCls}
                              value={card.title}
                              onChange={(e) =>
                                setSiteContent((prev) => ({
                                  ...prev,
                                  [key]: {
                                    ...prev[key],
                                    cards: (prev[key].cards ?? []).map((entry, index) =>
                                      index === cardIndex ? { ...entry, title: e.target.value } : entry
                                    ),
                                  },
                                }))
                              }
                            />
                          </div>
                          <div>
                            <Label>Link</Label>
                            <input
                              className={inputCls}
                              value={card.href}
                              onChange={(e) =>
                                setSiteContent((prev) => ({
                                  ...prev,
                                  [key]: {
                                    ...prev[key],
                                    cards: (prev[key].cards ?? []).map((entry, index) =>
                                      index === cardIndex ? { ...entry, href: e.target.value } : entry
                                    ),
                                  },
                                }))
                              }
                            />
                          </div>
                          {showCountField && (
                            <div>
                              <Label>Count / Label</Label>
                              <input
                                className={inputCls}
                                value={card.count ?? ""}
                                onChange={(e) =>
                                  setSiteContent((prev) => ({
                                    ...prev,
                                    [key]: {
                                      ...prev[key],
                                      cards: (prev[key].cards ?? []).map((entry, index) =>
                                        index === cardIndex ? { ...entry, count: e.target.value || undefined } : entry
                                      ),
                                    },
                                  }))
                                }
                              />
                            </div>
                          )}
                          {showItemsField && (
                            <div>
                              <Label>Items</Label>
                              <StringChipEditor
                                items={card.items ?? []}
                                placeholder="Add a service tag"
                                onChange={(items) =>
                                  setSiteContent((prev) => ({
                                    ...prev,
                                    [key]: {
                                      ...prev[key],
                                      cards: (prev[key].cards ?? []).map((entry, index) =>
                                        index === cardIndex ? { ...entry, items } : entry
                                      ),
                                    },
                                  }))
                                }
                              />
                            </div>
                          )}
                          <div className={descriptionSpanClass}>
                            <Label>Description</Label>
                            <textarea
                              className={textareaCls}
                              rows={2}
                              value={card.description}
                              onChange={(e) =>
                                setSiteContent((prev) => ({
                                  ...prev,
                                  [key]: {
                                    ...prev[key],
                                    cards: (prev[key].cards ?? []).map((entry, index) =>
                                      index === cardIndex ? { ...entry, description: e.target.value } : entry
                                    ),
                                  },
                                }))
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className={`${btnOutline} cursor-pointer`}
                      onClick={() =>
                        setSiteContent((prev) => ({
                          ...prev,
                          [key]: {
                            ...prev[key],
                            cards: [
                              ...(prev[key].cards ?? []),
                              {
                                title: "New Card",
                                description: "",
                                href: "/",
                                ...(showCountField ? { count: "" } : {}),
                                ...(showItemsField ? { items: [] } : {}),
                              },
                            ],
                          },
                        }))
                      }
                    >
                      + Add Card
                    </button>
                  </div>
                );
              })}

              <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
                <p className="font-nord text-sm text-white">Code Page Header</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <Label>Eyebrow</Label>
                    <input
                      className={inputCls}
                      value={siteContent.codePage.eyebrow}
                      onChange={(e) =>
                        setSiteContent((prev) => ({
                          ...prev,
                          codePage: { ...prev.codePage, eyebrow: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Title</Label>
                    <input
                      className={inputCls}
                      value={siteContent.codePage.title}
                      onChange={(e) =>
                        setSiteContent((prev) => ({
                          ...prev,
                          codePage: { ...prev.codePage, title: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <textarea
                      className={textareaCls}
                      rows={2}
                      value={siteContent.codePage.description}
                      onChange={(e) =>
                        setSiteContent((prev) => ({
                          ...prev,
                          codePage: { ...prev.codePage, description: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* ─── Featured Work Order (Projects + Articles unified) ─── */}
              {(() => {
                const featuredProjects = projects.filter((p) => p.featured);
                const featuredArticles = articles.filter((a) => a.homeFeatured);
                type WorkItem = { id: string; title: string; kind: "project" | "article"; label: string };
                const allItems: WorkItem[] = [
                  ...featuredProjects.map((p) => ({ id: p.id, title: p.title, kind: "project" as const, label: p.subcategory ?? p.category })),
                  ...featuredArticles.map((a) => ({ id: a.id, title: a.title, kind: "article" as const, label: a.category })),
                ];
                const allItemMap = new Map(allItems.map((item) => [item.id, item]));
                const savedOrder = (siteContent.featuredWorkOrder ?? []).filter((id: string) => allItemMap.has(id));
                const unsorted = allItems.filter((item) => !savedOrder.includes(item.id)).map((item) => item.id);
                const orderedIds = [...savedOrder, ...unsorted];
                const ordered = orderedIds.map((id: string) => allItemMap.get(id)).filter(Boolean) as WorkItem[];

                function moveWork(from: number, to: number) {
                  const newIds = arrayMove(orderedIds, from, to);
                  const next = { ...siteContent, featuredWorkOrder: newIds };
                  setSiteContent(next);

                }

                return (
                  <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
                    <div>
                      <p className="font-nord text-sm text-white">Featured Work — Home Page Order</p>
                      <p className="text-xs text-white/40 mt-1">Projects and articles shown in the Featured Work section on the home page. Reorder freely — saves after changes settle.</p>
                    </div>
                    {ordered.length === 0 ? (
                      <p className="text-xs text-white/30 italic">No projects or articles are marked as featured. Mark items as featured in their respective tabs.</p>
                    ) : (
                      <DragReorderList
                        items={ordered}
                        keyFn={(item) => item.id}
                        onReorder={(from, to) => moveWork(from, to)}
                        renderItem={(item, i) => (
                          <>
                            <span className="text-white/20 text-xs select-none cursor-grab mr-1">⠿</span>
                            <span className="text-[10px] text-white/25 w-5 text-right tabular-nums shrink-0">{i + 1}</span>
                            <span className={`text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm border shrink-0 ${
                              item.kind === "article"
                                ? "border-sky-400/30 bg-sky-400/8 text-sky-400"
                                : "border-[#ef4242]/30 bg-[#ef4242]/8 text-[#ef4242]"
                            }`}>
                              {item.kind === "article" ? "Article" : "Project"}
                            </span>
                            <span className="flex-1 text-xs text-white/80 truncate min-w-0">{item.title}</span>
                            <span className="hidden sm:inline text-[10px] text-white/25 shrink-0">{item.label}</span>
                            <div className="flex gap-1 shrink-0">
                              <button type="button" disabled={i === 0}
                                className="h-6 w-6 flex items-center justify-center text-white/40 hover:text-white border border-white/10 hover:border-white/25 rounded-sm disabled:opacity-20 transition-colors"
                                onClick={() => moveWork(i, i - 1)}>↑</button>
                              <button type="button" disabled={i === ordered.length - 1}
                                className="h-6 w-6 flex items-center justify-center text-white/40 hover:text-white border border-white/10 hover:border-white/25 rounded-sm disabled:opacity-20 transition-colors"
                                onClick={() => moveWork(i, i + 1)}>↓</button>
                            </div>
                          </>
                        )}
                      />
                    )}
                  </div>
                );
              })()}

              {/* ─── Featured Clients Order ─── */}
              {(() => {
                const featuredClients = clients.filter((c) => c.featured);
                const savedIds = siteContent.featuredClientIds.filter((id) => featuredClients.some((c) => c.id === id));
                const missingIds = featuredClients.filter((c) => !savedIds.includes(c.id)).map((c) => c.id);
                const orderedIds = [...savedIds, ...missingIds];
                const ordered = orderedIds.map((id) => featuredClients.find((c) => c.id === id)).filter(Boolean) as typeof featuredClients;

                function moveFeaturedClient(from: number, to: number) {
                  const newIds = arrayMove(orderedIds, from, to);
                  const next = { ...siteContent, featuredClientIds: newIds };
                  setSiteContent(next);

                }

                return (
                  <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
                    <div>
                      <p className="font-nord text-sm text-white">Featured Clients — Home Page Order</p>
                      <p className="text-xs text-white/40 mt-1">Only featured clients are listed. Use arrows to set the display order — saves after changes settle.</p>
                    </div>
                    {ordered.length === 0 ? (
                      <p className="text-xs text-white/30 italic">No clients are marked as featured. Mark a client as &quot;Featured&quot; in the Clients tab first.</p>
                    ) : (
                      <DragReorderList
                        items={ordered}
                        keyFn={(c) => c.id}
                        onReorder={(from, to) => moveFeaturedClient(from, to)}
                        renderItem={(c, i) => (
                          <>
                            <span className="text-white/20 text-xs select-none cursor-grab mr-1">⠿</span>
                            <span className="text-[10px] text-white/25 w-5 text-right tabular-nums shrink-0">{i + 1}</span>
                            {c.isEmployer && (
                              <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm border border-sky-400/30 bg-sky-400/8 text-sky-400 shrink-0">
                                Employer
                              </span>
                            )}
                            <span className="flex-1 text-xs text-white/80 truncate min-w-0">{c.name}</span>
                            <div className="flex gap-1 shrink-0">
                              <button type="button" disabled={i === 0}
                                className="h-6 w-6 flex items-center justify-center text-white/40 hover:text-white border border-white/10 hover:border-white/25 rounded-sm disabled:opacity-20 transition-colors"
                                onClick={() => moveFeaturedClient(i, i - 1)}>↑</button>
                              <button type="button" disabled={i === ordered.length - 1}
                                className="h-6 w-6 flex items-center justify-center text-white/40 hover:text-white border border-white/10 hover:border-white/25 rounded-sm disabled:opacity-20 transition-colors"
                                onClick={() => moveFeaturedClient(i, i + 1)}>↓</button>
                            </div>
                          </>
                        )}
                      />
                    )}
                  </div>
                );
              })()}


              <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
                <p className="font-nord text-sm text-white">Homepage Layout, Hero, and About</p>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div>
                    <Label>Homepage Section Order <span className="text-white/20 font-normal ml-1">— drag to reorder</span></Label>
                    <DragReorderList
                      items={siteContent.homeSectionOrder}
                      keyFn={(section) => section}
                      onReorder={(from, to) => {
                        const next = { ...siteContent, homeSectionOrder: arrayMove(siteContent.homeSectionOrder, from, to) };
                        setSiteContent(next);
      
                      }}
                      renderItem={(section, i) => (
                        <>
                          <span className="text-white/20 text-xs select-none cursor-grab mr-1">⠿</span>
                          <span className="text-[10px] text-white/25 w-5 text-right tabular-nums shrink-0">{i + 1}</span>
                          <span className="flex-1 text-xs text-white/80 capitalize">{section.replace(/-/g, " ")}</span>
                        </>
                      )}
                    />
                  </div>
                  <div className="rounded-sm border border-white/8 bg-black/20 px-3 py-2 text-xs text-white/35">
                    Valid keys: `hero`, `stats`, `about`, `services`, `featured`, `clients`, `cta`
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <div>
                    <Label>Hero Eyebrow</Label>
                    <input
                      className={inputCls}
                      value={siteContent.homeHero.eyebrow}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, homeHero: { ...prev.homeHero, eyebrow: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <Label>Hero Title Primary</Label>
                    <input
                      className={inputCls}
                      value={siteContent.homeHero.titlePrimary}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, homeHero: { ...prev.homeHero, titlePrimary: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <Label>Hero Title Accent</Label>
                    <input
                      className={inputCls}
                      value={siteContent.homeHero.titleAccent}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, homeHero: { ...prev.homeHero, titleAccent: e.target.value } }))}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <Label>Hero Description</Label>
                    <textarea
                      className={textareaCls}
                      rows={2}
                      value={siteContent.homeHero.description}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, homeHero: { ...prev.homeHero, description: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <Label>Hero Supporting Text</Label>
                    <input
                      className={inputCls}
                      value={siteContent.homeHero.supportingText}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, homeHero: { ...prev.homeHero, supportingText: e.target.value } }))}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <Label>Hero Location Text</Label>
                    <input
                      className={inputCls}
                      value={siteContent.homeHero.locationText}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, homeHero: { ...prev.homeHero, locationText: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <Label>Primary CTA Label</Label>
                    <input
                      className={inputCls}
                      value={siteContent.homeHero.primaryCta.label}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, homeHero: { ...prev.homeHero, primaryCta: { ...prev.homeHero.primaryCta, label: e.target.value } } }))}
                    />
                  </div>
                  <div>
                    <Label>Primary CTA Link</Label>
                    <input
                      className={inputCls}
                      value={siteContent.homeHero.primaryCta.href}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, homeHero: { ...prev.homeHero, primaryCta: { ...prev.homeHero.primaryCta, href: e.target.value } } }))}
                    />
                  </div>
                  <div>
                    <Label>Secondary CTA Label</Label>
                    <input
                      className={inputCls}
                      value={siteContent.homeHero.secondaryCta.label}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, homeHero: { ...prev.homeHero, secondaryCta: { ...prev.homeHero.secondaryCta, label: e.target.value } } }))}
                    />
                  </div>
                  <div>
                    <Label>Secondary CTA Link</Label>
                    <input
                      className={inputCls}
                      value={siteContent.homeHero.secondaryCta.href}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, homeHero: { ...prev.homeHero, secondaryCta: { ...prev.homeHero.secondaryCta, href: e.target.value } } }))}
                    />
                  </div>
                  <div>
                    <Label>Tertiary CTA Label</Label>
                    <input
                      className={inputCls}
                      value={siteContent.homeHero.tertiaryCta.label}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, homeHero: { ...prev.homeHero, tertiaryCta: { ...prev.homeHero.tertiaryCta, label: e.target.value } } }))}
                    />
                  </div>
                  <div>
                    <Label>Tertiary CTA Link</Label>
                    <input
                      className={inputCls}
                      value={siteContent.homeHero.tertiaryCta.href}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, homeHero: { ...prev.homeHero, tertiaryCta: { ...prev.homeHero.tertiaryCta, href: e.target.value } } }))}
                    />
                  </div>
                </div>
                <div>
                  <Label>Hero Service Tags (one per line: Label | /link)</Label>
                  <textarea
                    className={textareaCls}
                    rows={5}
                    value={siteContent.homeHero.serviceTags.map((tag) => `${tag.label} | ${tag.href}`).join("\n")}
                    onChange={(e) =>
                      setSiteContent((prev) => ({
                        ...prev,
                        homeHero: {
                          ...prev.homeHero,
                          serviceTags: e.target.value
                            .split("\n")
                            .map((line) => line.trim())
                            .filter(Boolean)
                            .map((line) => {
                              const [label, href] = line.split("|").map((part) => part.trim());
                              return { label: label || href || "Link", href: href || "/" };
                            }),
                        },
                      }))
                    }
                  />
                </div>

                <div className="border-t border-white/8 pt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div>
                    <Label>About Eyebrow</Label>
                    <input
                      className={inputCls}
                      value={siteContent.homeAbout.eyebrow}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, homeAbout: { ...prev.homeAbout, eyebrow: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <Label>About Title</Label>
                    <input
                      className={inputCls}
                      value={siteContent.homeAbout.title}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, homeAbout: { ...prev.homeAbout, title: e.target.value } }))}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <Label>About Description</Label>
                    <textarea
                      className={textareaCls}
                      rows={4}
                      value={siteContent.homeAbout.description}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, homeAbout: { ...prev.homeAbout, description: e.target.value } }))}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <Label>About Supporting Text</Label>
                    <input
                      className={inputCls}
                      value={siteContent.homeAbout.supportingText}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, homeAbout: { ...prev.homeAbout, supportingText: e.target.value } }))}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <Label>About Tags (comma-separated)</Label>
                    <input
                      className={inputCls}
                      value={siteContent.homeAbout.tags.join(", ")}
                      onChange={(e) =>
                        setSiteContent((prev) => ({
                          ...prev,
                          homeAbout: {
                            ...prev.homeAbout,
                            tags: e.target.value.split(",").map((item) => item.trim()).filter(Boolean),
                          },
                        }))
                      }
                    />
                  </div>
                  {siteContent.homeAbout.images.map((image, index) => (
                    <React.Fragment key={`about-image-${index}`}>
                      <div>
                        <Label>About Image {index + 1} URL</Label>
                        <input
                          className={inputCls}
                          value={image.src}
                          onChange={(e) =>
                            setSiteContent((prev) => ({
                              ...prev,
                              homeAbout: {
                                ...prev.homeAbout,
                                images: prev.homeAbout.images.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, src: e.target.value } : entry
                                ),
                              },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>About Image {index + 1} Alt</Label>
                        <input
                          className={inputCls}
                          value={image.alt ?? ""}
                          onChange={(e) =>
                            setSiteContent((prev) => ({
                              ...prev,
                              homeAbout: {
                                ...prev.homeAbout,
                                images: prev.homeAbout.images.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, alt: e.target.value } : entry
                                ),
                              },
                            }))
                          }
                        />
                      </div>
                    </React.Fragment>
                  ))}
                  <div className="lg:col-span-2">
                    <button
                      type="button"
                      className={`${btnOutline} cursor-pointer`}
                      onClick={() =>
                        setSiteContent((prev) => ({
                          ...prev,
                          homeAbout: {
                            ...prev.homeAbout,
                            images: [...prev.homeAbout.images, { src: "", alt: "" }],
                          },
                        }))
                      }
                    >
                      + Add About Image
                    </button>
                  </div>
                </div>
              </div>

              {([
                ["homeTimeline", "Homepage: Experience / Timeline", false],
                ["homeFeaturedWork", "Homepage: Featured Work", true],
                ["homeClients", "Homepage: Clients", false],
                ["homeVisitorMap", "Homepage: Visitor Map", false],
                ["homeCta", "Homepage: Newsletter CTA", true],
              ] as const).map(([key, label, showCtaFields]) => (
                <div key={key} className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
                  <p className="font-nord text-sm text-white">{label}</p>
                  <div className={`grid grid-cols-1 gap-3 ${showCtaFields ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
                    <div>
                      <Label>Eyebrow</Label>
                      <input
                        className={inputCls}
                        value={siteContent[key].eyebrow}
                        onChange={(e) => setSiteContent((prev) => ({ ...prev, [key]: { ...prev[key], eyebrow: e.target.value } }))}
                      />
                    </div>
                    <div>
                      <Label>Title</Label>
                      <input
                        className={inputCls}
                        value={siteContent[key].title}
                        onChange={(e) => setSiteContent((prev) => ({ ...prev, [key]: { ...prev[key], title: e.target.value } }))}
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <textarea
                        className={textareaCls}
                        rows={2}
                        value={siteContent[key].description}
                        onChange={(e) => setSiteContent((prev) => ({ ...prev, [key]: { ...prev[key], description: e.target.value } }))}
                      />
                    </div>
                    {showCtaFields && (
                      <div>
                        <Label>CTA Label</Label>
                        <input
                          className={inputCls}
                          value={siteContent[key].ctaLabel ?? ""}
                          onChange={(e) => setSiteContent((prev) => ({ ...prev, [key]: { ...prev[key], ctaLabel: e.target.value } }))}
                        />
                      </div>
                    )}
                    {showCtaFields && (
                      <div>
                        <Label>CTA Link</Label>
                        <input
                          className={inputCls}
                          value={siteContent[key].ctaHref ?? ""}
                          onChange={(e) => setSiteContent((prev) => ({ ...prev, [key]: { ...prev[key], ctaHref: e.target.value } }))}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
                <p className="font-nord text-sm text-white">Work Page</p>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <div>
                    <Label>Eyebrow</Label>
                    <input className={inputCls} value={siteContent.workPage.eyebrow} onChange={(e) => setSiteContent((prev) => ({ ...prev, workPage: { ...prev.workPage, eyebrow: e.target.value } }))} />
                  </div>
                  <div>
                    <Label>Title</Label>
                    <input className={inputCls} value={siteContent.workPage.title} onChange={(e) => setSiteContent((prev) => ({ ...prev, workPage: { ...prev.workPage, title: e.target.value } }))} />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <textarea className={textareaCls} rows={2} value={siteContent.workPage.description} onChange={(e) => setSiteContent((prev) => ({ ...prev, workPage: { ...prev.workPage, description: e.target.value } }))} />
                  </div>
                </div>
                <div className="space-y-3">
                  {(siteContent.workPage.cards ?? []).map((card, cardIndex) => (
                    <div key={`work-card-${cardIndex}`} className="grid grid-cols-1 gap-3 rounded-sm border border-white/8 p-3 lg:grid-cols-3">
                      <div className="lg:col-span-3 flex items-center justify-between">
                        <span className="text-[10px] tracking-widest uppercase text-white/30">Section {cardIndex + 1}</span>
                        <button
                          type="button"
                          className="text-[#ef4242]/70 hover:text-[#ef4242] text-[11px] cursor-pointer"
                          onClick={() => setSiteContent((prev) => ({ ...prev, workPage: { ...prev.workPage, cards: (prev.workPage.cards ?? []).filter((_, index) => index !== cardIndex) } }))}
                        >
                          Remove
                        </button>
                      </div>
                      <div>
                        <Label>Section Title</Label>
                        <input className={inputCls} value={card.title} onChange={(e) => setSiteContent((prev) => ({ ...prev, workPage: { ...prev.workPage, cards: (prev.workPage.cards ?? []).map((entry, index) => index === cardIndex ? { ...entry, title: e.target.value } : entry) } }))} />
                      </div>
                      <div>
                        <Label>Section Link</Label>
                        <input className={inputCls} value={card.href} onChange={(e) => setSiteContent((prev) => ({ ...prev, workPage: { ...prev.workPage, cards: (prev.workPage.cards ?? []).map((entry, index) => index === cardIndex ? { ...entry, href: e.target.value } : entry) } }))} />
                      </div>
                      <div>
                        <Label>Items</Label>
                        <StringChipEditor
                          items={card.items ?? []}
                          placeholder="Add a linked item"
                          onChange={(items) =>
                            setSiteContent((prev) => ({
                              ...prev,
                              workPage: {
                                ...prev.workPage,
                                cards: (prev.workPage.cards ?? []).map((entry, index) =>
                                  index === cardIndex ? { ...entry, items } : entry
                                ),
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="lg:col-span-3">
                        <Label>Description</Label>
                        <textarea className={textareaCls} rows={2} value={card.description} onChange={(e) => setSiteContent((prev) => ({ ...prev, workPage: { ...prev.workPage, cards: (prev.workPage.cards ?? []).map((entry, index) => index === cardIndex ? { ...entry, description: e.target.value } : entry) } }))} />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className={`${btnOutline} cursor-pointer`}
                  onClick={() =>
                    setSiteContent((prev) => ({
                      ...prev,
                      workPage: {
                        ...prev.workPage,
                        cards: [
                          ...(prev.workPage.cards ?? []),
                          { title: "New Section", description: "", href: "/", items: [] },
                        ],
                      },
                    }))
                  }
                >
                  + Add Work Section
                </button>
              </div>

              <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
                <p className="font-nord text-sm text-white">Page Headers</p>
                {([
                  ["publications", "Publications"],
                  ["articles", "Articles"],
                  ["contact", "Contact"],
                  ["resume", "Resume"],
                  ["subscribe", "Subscribe"],
                  ["unsubscribe", "Unsubscribe"],
                  ["minecraftMaps", "Minecraft Maps"],
                  ["events", "Events"],
                  ["thumbnailDesign", "Thumbnail Design"],
                  ["videoEditing", "Video Editing"],
                  ["webDevDesign", "Web Dev & Design"],
                ] as const).map(([key, label]) => (
                  <div key={key} className="grid grid-cols-1 gap-3 rounded-sm border border-white/8 p-3 lg:grid-cols-3">
                    <div className="lg:col-span-3 text-[11px] tracking-widest uppercase text-white/35">{label}</div>
                    <div>
                      <Label>Eyebrow</Label>
                      <input className={inputCls} value={siteContent.pageHeaders[key].eyebrow} onChange={(e) => setSiteContent((prev) => ({ ...prev, pageHeaders: { ...prev.pageHeaders, [key]: { ...prev.pageHeaders[key], eyebrow: e.target.value } } }))} />
                    </div>
                    <div>
                      <Label>Title</Label>
                      <input className={inputCls} value={siteContent.pageHeaders[key].title} onChange={(e) => setSiteContent((prev) => ({ ...prev, pageHeaders: { ...prev.pageHeaders, [key]: { ...prev.pageHeaders[key], title: e.target.value } } }))} />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <textarea className={textareaCls} rows={2} value={siteContent.pageHeaders[key].description} onChange={(e) => setSiteContent((prev) => ({ ...prev, pageHeaders: { ...prev.pageHeaders, [key]: { ...prev.pageHeaders[key], description: e.target.value } } }))} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
                <p className="font-nord text-sm text-white">Footer</p>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <div>
                    <Label>Location Text</Label>
                    <input className={inputCls} value={siteContent.footer.locationText} onChange={(e) => setSiteContent((prev) => ({ ...prev, footer: { ...prev.footer, locationText: e.target.value } }))} />
                  </div>
                  <div>
                    <Label>Status Label</Label>
                    <input className={inputCls} value={siteContent.footer.statusLabel} onChange={(e) => setSiteContent((prev) => ({ ...prev, footer: { ...prev.footer, statusLabel: e.target.value } }))} />
                  </div>
                  <div>
                    <Label>Email Link</Label>
                    <input className={inputCls} value={siteContent.footer.emailHref} onChange={(e) => setSiteContent((prev) => ({ ...prev, footer: { ...prev.footer, emailHref: e.target.value } }))} />
                  </div>
                  <div>
                    <Label>GitHub Link</Label>
                    <input className={inputCls} value={siteContent.footer.githubHref} onChange={(e) => setSiteContent((prev) => ({ ...prev, footer: { ...prev.footer, githubHref: e.target.value } }))} />
                  </div>
                  <div>
                    <Label>Copyright Text</Label>
                    <input className={inputCls} value={siteContent.footer.copyrightText} onChange={(e) => setSiteContent((prev) => ({ ...prev, footer: { ...prev.footer, copyrightText: e.target.value } }))} />
                  </div>
                  <div className="lg:col-span-3">
                    <Label>Footer Blurb</Label>
                    <textarea className={textareaCls} rows={2} value={siteContent.footer.blurb} onChange={(e) => setSiteContent((prev) => ({ ...prev, footer: { ...prev.footer, blurb: e.target.value } }))} />
                  </div>
                </div>
                <div className="space-y-3">
                  {siteContent.footer.linkGroups.map((group, groupIndex) => (
                    <div key={`footer-group-${groupIndex}`} className="rounded-sm border border-white/8 p-3 space-y-3">
                      <div>
                        <Label>Group Title</Label>
                        <input className={inputCls} value={group.title} onChange={(e) => setSiteContent((prev) => ({ ...prev, footer: { ...prev.footer, linkGroups: prev.footer.linkGroups.map((entry, index) => index === groupIndex ? { ...entry, title: e.target.value } : entry) } }))} />
                      </div>
                      {group.links.map((link, linkIndex) => (
                        <div key={`footer-link-${groupIndex}-${linkIndex}`} className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                          <div>
                            <Label>Link Label</Label>
                            <input className={inputCls} value={link.label} onChange={(e) => setSiteContent((prev) => ({ ...prev, footer: { ...prev.footer, linkGroups: prev.footer.linkGroups.map((entry, index) => index === groupIndex ? { ...entry, links: entry.links.map((entryLink, entryLinkIndex) => entryLinkIndex === linkIndex ? { ...entryLink, label: e.target.value } : entryLink) } : entry) } }))} />
                          </div>
                          <div>
                            <Label>Link URL</Label>
                            <input className={inputCls} value={link.href} onChange={(e) => setSiteContent((prev) => ({ ...prev, footer: { ...prev.footer, linkGroups: prev.footer.linkGroups.map((entry, index) => index === groupIndex ? { ...entry, links: entry.links.map((entryLink, entryLinkIndex) => entryLinkIndex === linkIndex ? { ...entryLink, href: e.target.value } : entryLink) } : entry) } }))} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div>
                  <Label>Bottom Links</Label>
                  <ActionLinkListEditor
                    items={siteContent.footer.bottomLinks}
                    onChange={(bottomLinks) =>
                      setSiteContent((prev) => ({
                        ...prev,
                        footer: {
                          ...prev.footer,
                          bottomLinks,
                        },
                      }))
                    }
                  />
                </div>
              </div>

              {([
                ["termsPage", "Terms Page"],
                ["privacyPage", "Privacy Page"],
              ] as const).map(([key, label]) => (
                <div key={key} className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
                  <p className="font-nord text-sm text-white">{label}</p>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                    <div>
                      <Label>Eyebrow</Label>
                      <input className={inputCls} value={siteContent[key].eyebrow} onChange={(e) => setSiteContent((prev) => ({ ...prev, [key]: { ...prev[key], eyebrow: e.target.value } }))} />
                    </div>
                    <div>
                      <Label>Title</Label>
                      <input className={inputCls} value={siteContent[key].title} onChange={(e) => setSiteContent((prev) => ({ ...prev, [key]: { ...prev[key], title: e.target.value } }))} />
                    </div>
                    <div>
                      <Label>Last Updated</Label>
                      <input className={inputCls} value={siteContent[key].lastUpdated} onChange={(e) => setSiteContent((prev) => ({ ...prev, [key]: { ...prev[key], lastUpdated: e.target.value } }))} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    {siteContent[key].sections.map((section, sectionIndex) => (
                      <div key={`${key}-section-${sectionIndex}`} className="rounded-sm border border-white/8 p-3 space-y-3">
                        <div>
                          <Label>Section Heading</Label>
                          <input className={inputCls} value={section.heading} onChange={(e) => setSiteContent((prev) => ({ ...prev, [key]: { ...prev[key], sections: prev[key].sections.map((entry, index) => index === sectionIndex ? { ...entry, heading: e.target.value } : entry) } }))} />
                        </div>
                        <div>
                          <Label>Section Body</Label>
                          <textarea className={textareaCls} rows={3} value={section.body} onChange={(e) => setSiteContent((prev) => ({ ...prev, [key]: { ...prev[key], sections: prev[key].sections.map((entry, index) => index === sectionIndex ? { ...entry, body: e.target.value } : entry) } }))} />
                        </div>
                        <div>
                          <Label>Bullets</Label>
                          <StringChipEditor
                            items={section.bullets ?? []}
                            placeholder="Add a bullet"
                            onChange={(bullets) =>
                              setSiteContent((prev) => ({
                                ...prev,
                                [key]: {
                                  ...prev[key],
                                  sections: prev[key].sections.map((entry, index) =>
                                    index === sectionIndex ? { ...entry, bullets } : entry
                                  ),
                                },
                              }))
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeSection === "campaigns" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-white/35">Compose and send email or SMS campaigns.</p>
                <button className={btnRed} onClick={() => setCampaignModal({ open: true })}>+ Compose</button>
              </div>
              <div className="border border-white/8 rounded-sm overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-white/2 border-b border-white/8">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35">Subject</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden md:table-cell">Type</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35">Status</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden md:table-cell">Recipients</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden sm:table-cell">Date</th>
                      <th className="px-3 py-2.5 text-right text-[10px] tracking-widest uppercase text-white/35">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c) => (
                      <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                        <td className="px-3 py-2.5 text-white/75">
                          <div className="flex flex-col gap-1">
                            <span>{c.subject || "SMS Message"}</span>
                            {c.type === "email" && c.recipients > 0 && (
                              <span className="text-[10px] text-white/25">
                                Sent {campaignDeliveredCount(c)} / {c.recipients}
                              </span>
                            )}
                            {c.scheduledFor && c.status === "scheduled" && (
                              <span className="text-[10px] text-white/25">Scheduled {fmtDateTime(c.scheduledFor)}</span>
                            )}
                            {c.lastError && (
                              <span className="text-[10px] text-[#ef4242]/80">{c.lastError}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 hidden md:table-cell">
                          <span className={`text-[10px] px-2 py-0.5 rounded-sm ${c.type === "email" ? "bg-blue-500/15 text-blue-400" : "bg-purple-500/15 text-purple-400"}`}>
                            {c.type}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <CampaignStatusBadge status={c.status} />
                        </td>
                        <td className="px-3 py-2.5 text-white/40 hidden md:table-cell">{c.recipients}</td>
                        <td className="px-3 py-2.5 text-white/30 hidden sm:table-cell">{fmtDateTime(c.sentAt || c.scheduledFor || c.createdAt)}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex justify-end gap-2">
                            <button className={btnGhost} onClick={() => setCampaignView(c)}>View</button>
                            <button className={btnOutlineRed} onClick={() => setDeleteConfirm({ type: "campaign", id: c.id, label: c.subject || "SMS Message" })}>Del</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {campaigns.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-white/25 text-xs">No messages yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────
              RESUME
          ───────────────────────────────────── */}
          {activeSection === "rizz" && (
            <div className="space-y-4">
              <RizzSettings content={siteContent} onChange={setSiteContent} />

              <div className="flex flex-wrap gap-3">
                <input
                  className={`${inputCls} max-w-xs`}
                  placeholder="Search rizz submissions..."
                  value={rizzSearch}
                  onChange={(e) => setRizzSearch(e.target.value)}
                />
                <select
                  className={`${inputCls} max-w-[170px]`}
                  value={rizzSort}
                  onChange={(e) => setRizzSort(e.target.value as typeof rizzSort)}
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="az">A-Z</option>
                  <option value="za">Z-A</option>
                </select>
                <span className="text-xs text-white/30 self-center ml-auto">{filteredRizzEntries.length} entries</span>
              </div>
              <RizzSubmissions entries={filteredRizzEntries} onDelete={(entry) => setDeleteConfirm({ type: "rizz", id: entry.id, label: entry.name })} />
            </div>
          )}

          {activeSection === "resume" && (
            <div className="space-y-6">
              {!resumeLoaded ? (
                <p className="text-white/30 text-xs">Loading resume data…</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-3">
                    <input
                      className={`${inputCls} max-w-sm`}
                      placeholder="Search resume..."
                      value={resumeSearch}
                      onChange={(e) => setResumeSearch(e.target.value)}
                    />
                    <span className="text-xs text-white/30 self-center ml-auto">
                      {filteredExperiences.length + filteredEducations.length + filteredSkillsList.length + filteredCertificationsList.length + filteredAwardsList.length + filteredClubsList.length} matches
                    </span>
                  </div>

                  {/* Profile / personal info + resume PDF */}
                  <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
                    <div>
                      <p className="font-nord text-sm text-white">Profile & Contact</p>
                      <p className="text-xs text-white/35">Name, title, location and links shown on the resume page header.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input className={inputCls} value={resumeProfile.fullName} onChange={(e) => setResumeProfile((p) => ({ ...p, fullName: e.target.value }))} placeholder="Full name" />
                      <input className={inputCls} value={resumeProfile.title} onChange={(e) => setResumeProfile((p) => ({ ...p, title: e.target.value }))} placeholder="Title (e.g. Software Engineer)" />
                      <input className={inputCls} value={resumeProfile.location} onChange={(e) => setResumeProfile((p) => ({ ...p, location: e.target.value }))} placeholder="Location (e.g. Orlando, Florida)" />
                      <input className={inputCls} value={resumeProfile.email} onChange={(e) => setResumeProfile((p) => ({ ...p, email: e.target.value }))} placeholder="Contact email" />
                      <input className={inputCls} value={resumeProfile.linkedinUrl} onChange={(e) => setResumeProfile((p) => ({ ...p, linkedinUrl: e.target.value }))} placeholder="LinkedIn URL" />
                      <input className={inputCls} value={resumeProfile.githubUrl} onChange={(e) => setResumeProfile((p) => ({ ...p, githubUrl: e.target.value }))} placeholder="GitHub URL" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] tracking-widest uppercase text-white/35">Resume PDF (Download button)</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          className={`${inputCls} flex-1 min-w-[200px]`}
                          value={resumeProfile.pdfUrl}
                          onChange={(e) => setResumeProfile((p) => ({ ...p, pdfUrl: e.target.value }))}
                          placeholder="Uploaded PDF URL (leave blank for /Michael_Cran_Resume.pdf)"
                        />
                        <button type="button" className={`${btnOutline} cursor-pointer`} onClick={() => setResumePdfPickerOpen(true)}>
                          Upload / Select PDF
                        </button>
                        {resumeProfile.pdfUrl && (
                          <a href={resumeProfile.pdfUrl} target="_blank" rel="noopener noreferrer" className={btnOutline}>
                            Preview
                          </a>
                        )}
                      </div>
                      <p className="text-[10px] text-white/25">If no PDF is set, the Download PDF button is hidden on the resume page.</p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] tracking-widest uppercase text-white/35">Resume Section Order (main column)</p>
                      <DragReorderList
                        items={(resumeProfile.sectionOrder?.length ? resumeProfile.sectionOrder : [...RESUME_SECTIONS])}
                        keyFn={(s) => s}
                        onReorder={(from, to) => setResumeProfile((p) => ({ ...p, sectionOrder: arrayMove(p.sectionOrder?.length ? p.sectionOrder : [...RESUME_SECTIONS], from, to) }))}
                        renderItem={(s, i) => (
                          <>
                            <span className="text-white/20 text-xs select-none cursor-grab mr-1">⠿</span>
                            <span className="text-[10px] text-white/25 w-5 text-right tabular-nums shrink-0">{i + 1}</span>
                            <span className="text-sm text-white/70">{RESUME_SECTION_LABELS[s] ?? s}</span>
                          </>
                        )}
                      />
                    </div>
                  </div>

                  {resumePdfPickerOpen && (
                    <R2ImagePickerModal
                      title="Select Resume PDF"
                      allowPdf
                      onClose={() => setResumePdfPickerOpen(false)}
                      onSelect={(url) => {
                        setResumeProfile((p) => ({ ...p, pdfUrl: url }));
                        setResumePdfPickerOpen(false);
                      }}
                    />
                  )}

                  {resumeLogoTarget && (
                    <R2ImagePickerModal
                      title="Select Logo"
                      onClose={() => setResumeLogoTarget(null)}
                      onSelect={(url) => setResumeLogo(url)}
                    />
                  )}

                  <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-6">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-nord text-sm text-white">Edit Resume Content</p>
                        <p className="text-xs text-white/35">Saved to MongoDB and used by the public resume page.</p>
                      </div>
                      <span className="text-[11px] tracking-wider text-white/30">
                        {resumeSaving ? "Saving..." : resumeAutoSaved ? "Saved" : "Auto-saves on change"}
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-nord text-xs text-white">Experience</p>
                          <p className="text-[10px] text-white/25 mt-1">Drag cards to reorder.</p>
                        </div>
                        <button
                          className={btnOutline}
                          onClick={() =>
                            setExperiences((prev) => [
                              ...prev,
                              { id: uid(), type: "job", companyName: "", role: "", startDate: "", description: "" },
                            ])
                          }
                        >
                          + Add Experience
                        </button>
                      </div>
                      {experiences.map((exp, idx) => (
                        <div
                          key={exp.id}
                          draggable
                          onDragStart={() => setDraggedResumeItem({ list: "experiences", index: idx })}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleResumeDrop("experiences", idx)}
                          onDragEnd={() => setDraggedResumeItem(null)}
                          className="border border-white/6 rounded-sm p-4 space-y-3 cursor-grab active:cursor-grabbing hover:border-[#ef4242]/20 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[10px] tracking-widest uppercase text-white/35">{exp.id || "new-entry"}</span>
                            <div className="flex items-center gap-2">
                              <button type="button" className={`${btnOutline} cursor-pointer`} onClick={() => setResumeLogoTarget({ list: "experiences", index: idx })}>
                                {exp.companyLogo ? "Change Logo" : "+ Logo"}
                              </button>
                              {exp.companyLogo && <img src={assetUrl(exp.companyLogo)} alt="" className="h-6 w-6 rounded-sm object-cover border border-white/10" />}
                              <button className="text-[#ef4242]/60 hover:text-[#ef4242] text-xs" onClick={() => setExperiences((prev) => prev.filter((_, i) => i !== idx))}>Remove</button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <input className={inputCls} value={exp.id} onChange={(e) => setExperiences((prev) => prev.map((item, i) => (i === idx ? { ...item, id: e.target.value } : item)))} placeholder="ID" />
                            <select className={inputCls} value={exp.type} onChange={(e) => setExperiences((prev) => prev.map((item, i) => (i === idx ? { ...item, type: e.target.value as Experience["type"] } : item)))}><option value="job">Job</option><option value="volunteer">Volunteer</option><option value="renowned">Renowned</option></select>
                            <input className={inputCls} value={exp.companyName} onChange={(e) => setExperiences((prev) => prev.map((item, i) => (i === idx ? { ...item, companyName: e.target.value } : item)))} placeholder="Company name" />
                            <input className={inputCls} value={exp.role} onChange={(e) => setExperiences((prev) => prev.map((item, i) => (i === idx ? { ...item, role: e.target.value } : item)))} placeholder="Role" />
                            <input className={inputCls} value={exp.startDate} onChange={(e) => setExperiences((prev) => prev.map((item, i) => (i === idx ? { ...item, startDate: e.target.value } : item)))} placeholder="YYYY-MM" />
                            <input className={inputCls} value={exp.endDate ?? ""} disabled={!!exp.current} onChange={(e) => setExperiences((prev) => prev.map((item, i) => (i === idx ? { ...item, endDate: e.target.value || undefined } : item)))} placeholder="YYYY-MM" />
                            <input className={inputCls} value={exp.location ?? ""} onChange={(e) => setExperiences((prev) => prev.map((item, i) => (i === idx ? { ...item, location: e.target.value || undefined } : item)))} placeholder="Location (e.g. Orlando, FL)" />
                            <input className={inputCls} value={exp.companyUrl ?? ""} onChange={(e) => setExperiences((prev) => prev.map((item, i) => (i === idx ? { ...item, companyUrl: e.target.value || undefined } : item)))} placeholder="Company URL" />
                          </div>
                          <label className="flex items-center gap-2 text-xs text-white/50">
                            <input type="checkbox" className="accent-[#ef4242]" checked={!!exp.current} onChange={(e) => setExperiences((prev) => prev.map((item, i) => (i === idx ? { ...item, current: e.target.checked, endDate: e.target.checked ? undefined : item.endDate } : item)))} />
                            Current role
                          </label>
                          {clients.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-[10px] tracking-widest uppercase text-white/35">
                                Linked Clients
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {clients.map((client) => {
                                  const isLinked = exp.clientIds?.includes(client.id) ?? false;
                                  return (
                                    <button
                                      key={`${exp.id}-${client.id}`}
                                      type="button"
                                      onClick={() => toggleExperienceClientLink(idx, client.id)}
                                      className={`rounded-sm border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] transition-colors ${
                                        isLinked
                                          ? "border-[#ef4242]/30 bg-[#ef4242]/10 text-[#ef4242]"
                                          : "border-white/10 bg-white/[0.02] text-white/35 hover:border-white/20 hover:text-white/60"
                                      }`}
                                    >
                                      {client.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          <textarea className={textareaCls} rows={3} value={exp.description} onChange={(e) => setExperiences((prev) => prev.map((item, i) => (i === idx ? { ...item, description: e.target.value } : item)))} placeholder="Description" />
                          <textarea className={textareaCls} rows={3} value={(exp.highlights ?? []).join("\n")} onChange={(e) => setExperiences((prev) => prev.map((item, i) => (i === idx ? { ...item, highlights: e.target.value.split("\n").map((line) => line.trim()).filter(Boolean) } : item)))} placeholder="Highlights — one per line (shown under 'Read More')" />
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-nord text-xs text-white">Education</p>
                          <p className="text-[10px] text-white/25 mt-1">Drag cards to reorder.</p>
                        </div>
                        <button
                          className={btnOutline}
                          onClick={() =>
                            setEducations((prev) => [
                              ...prev,
                              { id: uid(), institution: "", degree: "", startDate: "", description: "" },
                            ])
                          }
                        >
                          + Add Education
                        </button>
                      </div>
                      {educations.map((education, idx) => (
                        <div
                          key={education.id}
                          draggable
                          onDragStart={() => setDraggedResumeItem({ list: "educations", index: idx })}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleResumeDrop("educations", idx)}
                          onDragEnd={() => setDraggedResumeItem(null)}
                          className="border border-white/6 rounded-sm p-4 space-y-3 cursor-grab active:cursor-grabbing hover:border-[#ef4242]/20 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[10px] tracking-widest uppercase text-white/35">{education.id || "new-entry"}</span>
                            <div className="flex items-center gap-2">
                              <button type="button" className={`${btnOutline} cursor-pointer`} onClick={() => setResumeLogoTarget({ list: "educations", index: idx })}>
                                {education.institutionLogo ? "Change Logo" : "+ Logo"}
                              </button>
                              {education.institutionLogo && <img src={assetUrl(education.institutionLogo)} alt="" className="h-6 w-6 rounded-sm object-cover border border-white/10" />}
                              <button className="text-[#ef4242]/60 hover:text-[#ef4242] text-xs" onClick={() => setEducations((prev) => prev.filter((_, i) => i !== idx))}>Remove</button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <input className={inputCls} value={education.id} onChange={(e) => setEducations((prev) => prev.map((item, i) => (i === idx ? { ...item, id: e.target.value } : item)))} placeholder="ID" />
                            <input className={inputCls} value={education.institution} onChange={(e) => setEducations((prev) => prev.map((item, i) => (i === idx ? { ...item, institution: e.target.value } : item)))} placeholder="Institution" />
                            <input className={inputCls} value={education.degree} onChange={(e) => setEducations((prev) => prev.map((item, i) => (i === idx ? { ...item, degree: e.target.value } : item)))} placeholder="Degree (summary)" />
                            <input className={inputCls} value={education.field ?? ""} onChange={(e) => setEducations((prev) => prev.map((item, i) => (i === idx ? { ...item, field: e.target.value || undefined } : item)))} placeholder="Field of study" />
                            <input className={inputCls} value={education.startDate} onChange={(e) => setEducations((prev) => prev.map((item, i) => (i === idx ? { ...item, startDate: e.target.value } : item)))} placeholder="YYYY-MM" />
                            <input className={inputCls} value={education.endDate ?? ""} disabled={!!education.current} onChange={(e) => setEducations((prev) => prev.map((item, i) => (i === idx ? { ...item, endDate: e.target.value || undefined } : item)))} placeholder="YYYY-MM" />
                            <input className={inputCls} value={education.location ?? ""} onChange={(e) => setEducations((prev) => prev.map((item, i) => (i === idx ? { ...item, location: e.target.value || undefined } : item)))} placeholder="Location" />
                            <input className={inputCls} value={education.gpa ?? ""} onChange={(e) => setEducations((prev) => prev.map((item, i) => (i === idx ? { ...item, gpa: e.target.value || undefined } : item)))} placeholder="GPA (optional)" />
                            <input className={`${inputCls} col-span-2`} value={education.url ?? ""} onChange={(e) => setEducations((prev) => prev.map((item, i) => (i === idx ? { ...item, url: e.target.value || undefined } : item)))} placeholder="Website" />
                          </div>
                          <textarea
                            className={textareaCls}
                            rows={2}
                            value={education.description ?? ""}
                            onChange={(e) =>
                              setEducations((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, description: e.target.value || undefined } : item
                                )
                              )
                            }
                            placeholder="Description (shown on resume page)"
                          />
                          <label className="flex items-center gap-2 text-xs text-white/50">
                            <input type="checkbox" className="accent-[#ef4242]" checked={!!education.current} onChange={(e) => setEducations((prev) => prev.map((item, i) => (i === idx ? { ...item, current: e.target.checked, endDate: e.target.checked ? undefined : item.endDate } : item)))} />
                            Currently enrolled
                          </label>
                          <textarea className={textareaCls} rows={3} value={(education.highlights ?? []).join("\n")} onChange={(e) => setEducations((prev) => prev.map((item, i) => (i === idx ? { ...item, highlights: e.target.value.split("\n").map((line) => line.trim()).filter(Boolean) || undefined } : item)))} placeholder="Bullet points (one per line)" />

                          {/* Programs (degrees / certificates within this institution) */}
                          <div className="border-t border-white/6 pt-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] tracking-widest uppercase text-white/35">Programs</p>
                              <button type="button" className={btnOutline} onClick={() => addProgram(idx)}>+ Add Program</button>
                            </div>
                            {(education.programs ?? []).map((prog, pIdx) => (
                              <div key={prog.id} className="rounded-sm border border-white/8 bg-white/[0.02] p-3 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] text-white/30">Program {pIdx + 1}</span>
                                  <div className="flex items-center gap-1.5">
                                    <button type="button" className="text-white/30 hover:text-white/70 text-xs px-1 disabled:opacity-30" disabled={pIdx === 0} onClick={() => moveProgram(idx, pIdx, -1)}>↑</button>
                                    <button type="button" className="text-white/30 hover:text-white/70 text-xs px-1 disabled:opacity-30" disabled={pIdx === (education.programs?.length ?? 0) - 1} onClick={() => moveProgram(idx, pIdx, 1)}>↓</button>
                                    <button type="button" className={`${btnOutline} cursor-pointer`} onClick={() => setResumeLogoTarget({ list: "program", index: idx, programIndex: pIdx })}>{prog.logo ? "Logo ✓" : "+ Logo"}</button>
                                    {prog.logo && <img src={assetUrl(prog.logo)} alt="" className="h-5 w-5 rounded-sm object-cover border border-white/10" />}
                                    <button type="button" className="text-[#ef4242]/60 hover:text-[#ef4242] text-xs" onClick={() => removeProgram(idx, pIdx)}>Remove</button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <input className={inputCls} value={prog.name} onChange={(e) => updateProgram(idx, pIdx, { name: e.target.value })} placeholder="Program name" />
                                  <select className={inputCls} value={prog.degreeLevel ?? ""} onChange={(e) => updateProgram(idx, pIdx, { degreeLevel: e.target.value || undefined })}>
                                    <option value="">Degree level…</option>
                                    {DEGREE_LEVELS.map((d) => <option key={d} value={d}>{d}</option>)}
                                  </select>
                                  <input className={inputCls} value={prog.field ?? ""} onChange={(e) => updateProgram(idx, pIdx, { field: e.target.value || undefined })} placeholder="Field of study" />
                                  <div className="grid grid-cols-2 gap-2">
                                    <input className={inputCls} value={prog.startDate ?? ""} onChange={(e) => updateProgram(idx, pIdx, { startDate: e.target.value || undefined })} placeholder="Start YYYY-MM" />
                                    <input className={inputCls} value={prog.endDate ?? ""} onChange={(e) => updateProgram(idx, pIdx, { endDate: e.target.value || undefined })} placeholder="End YYYY-MM" />
                                  </div>
                                </div>
                                <textarea className={textareaCls} rows={2} value={prog.description ?? ""} onChange={(e) => updateProgram(idx, pIdx, { description: e.target.value || undefined })} placeholder="Description" />
                              </div>
                            ))}
                          </div>

                          {/* Link awards / organizations to this education */}
                          {(awards.length > 0 || clubs.length > 0) && (
                            <div className="border-t border-white/6 pt-3 space-y-2">
                              {awards.length > 0 && (
                                <div className="space-y-1.5">
                                  <p className="text-[10px] tracking-widest uppercase text-white/35">Linked Awards</p>
                                  <div className="flex flex-wrap gap-2">
                                    {awards.map((a) => {
                                      const on = education.linkedAwardIds?.includes(a.id) ?? false;
                                      return <button key={a.id} type="button" onClick={() => toggleEducationLink(idx, "award", a.id)} className={`rounded-sm border px-2.5 py-1 text-[10px] tracking-[0.12em] transition-colors ${on ? "border-[#ef4242]/30 bg-[#ef4242]/10 text-[#ef4242]" : "border-white/10 bg-white/[0.02] text-white/35 hover:border-white/20 hover:text-white/60"}`}>{a.name || a.id}</button>;
                                    })}
                                  </div>
                                </div>
                              )}
                              {clubs.length > 0 && (
                                <div className="space-y-1.5">
                                  <p className="text-[10px] tracking-widest uppercase text-white/35">Linked Organizations</p>
                                  <div className="flex flex-wrap gap-2">
                                    {clubs.map((c) => {
                                      const on = education.linkedClubIds?.includes(c.id) ?? false;
                                      return <button key={c.id} type="button" onClick={() => toggleEducationLink(idx, "club", c.id)} className={`rounded-sm border px-2.5 py-1 text-[10px] tracking-[0.12em] transition-colors ${on ? "border-[#ef4242]/30 bg-[#ef4242]/10 text-[#ef4242]" : "border-white/10 bg-white/[0.02] text-white/35 hover:border-white/20 hover:text-white/60"}`}>{c.name || c.id}</button>;
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {(() => {
                      // Only the categories the admin actually made + ones already in use —
                      // no hardcoded defaults cluttering the list.
                      const categoryOptions = Array.from(new Set([
                        ...skillCategories.map((c) => c.id),
                        ...skills.map((s) => s.category),
                      ].filter(Boolean)));
                      const labelFor = (id: string) =>
                        skillCategories.find((c) => c.id === id)?.label || (id.charAt(0).toUpperCase() + id.slice(1));
                      return (
                    <div className="space-y-6">
                      {/* Skill categories */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-nord text-xs text-white">Skill Categories</p>
                            <p className="text-[10px] text-white/25 mt-1">Set a category id (matches each skill&apos;s category), display label and icon. Reorder controls display order.</p>
                          </div>
                          <button className={btnOutline} onClick={() => setSkillCategories((prev) => [...prev, { id: `category-${prev.length + 1}`, label: "New Category", icon: undefined }])}>+ Add Category</button>
                        </div>
                        {skillCategories.map((cat, idx) => (
                          <div
                            key={`cat-${idx}`}
                            draggable
                            onDragStart={() => setDraggedResumeItem({ list: "skillCategories", index: idx })}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleResumeDrop("skillCategories", idx)}
                            onDragEnd={() => setDraggedResumeItem(null)}
                            className="grid grid-cols-2 md:grid-cols-[1fr_1fr_auto_auto] gap-2 items-center cursor-move"
                          >
                            <input className={inputCls} value={cat.id} onChange={(e) => setSkillCategories((prev) => prev.map((c, i) => (i === idx ? { ...c, id: e.target.value } : c)))} placeholder="Category id (e.g. technology)" />
                            <input className={inputCls} value={cat.label} onChange={(e) => setSkillCategories((prev) => prev.map((c, i) => (i === idx ? { ...c, label: e.target.value } : c)))} placeholder="Display label" />
                            <IconPickerButton value={cat.icon} onChange={(icon) => setSkillCategories((prev) => prev.map((c, i) => (i === idx ? { ...c, icon } : c)))} label="Icon" />
                            <button className="text-[#ef4242]/60 hover:text-[#ef4242] text-xs px-2" onClick={() => setSkillCategories((prev) => prev.filter((_, i) => i !== idx))}>Remove</button>
                          </div>
                        ))}
                        {skillCategories.length === 0 && (
                          <p className="text-[10px] text-white/25">No custom categories yet — categories are inferred from skills below. Add one to set a custom label and icon.</p>
                        )}
                      </div>

                      {/* Skills */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-nord text-xs text-white">Skills</p>
                            <p className="text-[10px] text-white/25 mt-1">Drag rows to reorder. Pick a category and optional icon.</p>
                          </div>
                          <button className={btnOutline} onClick={() => setSkills((prev) => [...prev, { name: "", category: skillCategories[0]?.id ?? categoryOptions[0] ?? "technology" }])}>+ Add Skill</button>
                        </div>
                        {skills.map((skill, idx) => (
                          <div
                            key={idx}
                            draggable
                            onDragStart={() => setDraggedResumeItem({ list: "skills", index: idx })}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleResumeDrop("skills", idx)}
                            onDragEnd={() => setDraggedResumeItem(null)}
                            className="grid grid-cols-2 md:grid-cols-[1fr_auto_180px_auto] gap-2 items-center cursor-move"
                          >
                            <input className={inputCls} value={skill.name} onChange={(e) => setSkills((prev) => prev.map((item, i) => (i === idx ? { ...item, name: e.target.value } : item)))} placeholder="Skill" />
                            <IconPickerButton value={skill.icon} onChange={(icon) => setSkills((prev) => prev.map((item, i) => (i === idx ? { ...item, icon } : item)))} label="Icon" />
                            <select
                              className={inputCls}
                              value={skill.category}
                              onChange={(e) => setSkills((prev) => prev.map((item, i) => (i === idx ? { ...item, category: e.target.value } : item)))}
                            >
                              {Array.from(new Set([...categoryOptions, skill.category].filter(Boolean))).map((option) => (
                                <option key={option} value={option}>{labelFor(option)}</option>
                              ))}
                            </select>
                            <button className="text-[#ef4242]/60 hover:text-[#ef4242] text-xs px-2" onClick={() => setSkills((prev) => prev.filter((_, i) => i !== idx))}>Remove</button>
                          </div>
                        ))}
                      </div>
                    </div>
                      );
                    })()}

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-nord text-xs text-white">Certifications</p>
                          <p className="text-[10px] text-white/25 mt-1">Drag cards to reorder.</p>
                        </div>
                        <button className={btnOutline} onClick={() => setCertifications((prev) => [...prev, { id: uid(), name: "", issuer: "", date: "", credentialUrl: "" }])}>+ Add Certification</button>
                      </div>
                      {certifications.map((cert, idx) => (
                        <div
                          key={cert.id}
                          draggable
                          onDragStart={() => setDraggedResumeItem({ list: "certifications", index: idx })}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleResumeDrop("certifications", idx)}
                          onDragEnd={() => setDraggedResumeItem(null)}
                          className="border border-white/6 rounded-sm p-4 grid grid-cols-2 gap-3 cursor-move"
                        >
                          <input className={inputCls} value={cert.id} onChange={(e) => setCertifications((prev) => prev.map((item, i) => (i === idx ? { ...item, id: e.target.value } : item)))} placeholder="ID" />
                          <input className={inputCls} value={cert.name} onChange={(e) => setCertifications((prev) => prev.map((item, i) => (i === idx ? { ...item, name: e.target.value } : item)))} placeholder="Name" />
                          <input className={inputCls} value={cert.issuer} onChange={(e) => setCertifications((prev) => prev.map((item, i) => (i === idx ? { ...item, issuer: e.target.value } : item)))} placeholder="Issuer" />
                          <input className={inputCls} value={cert.credentialId ?? ""} onChange={(e) => setCertifications((prev) => prev.map((item, i) => (i === idx ? { ...item, credentialId: e.target.value || undefined } : item)))} placeholder="Credential ID" />
                          <input className={inputCls} value={cert.date} onChange={(e) => setCertifications((prev) => prev.map((item, i) => (i === idx ? { ...item, date: e.target.value } : item)))} placeholder="Issued YYYY-MM" />
                          <input className={inputCls} value={cert.expiryDate ?? ""} onChange={(e) => setCertifications((prev) => prev.map((item, i) => (i === idx ? { ...item, expiryDate: e.target.value || undefined } : item)))} placeholder="Expires YYYY-MM" />
                          <input className="col-span-2 w-full bg-white/4 border border-white/10 focus:border-[#ef4242] rounded-sm px-3 h-9 text-sm text-white outline-none placeholder-white/25 transition-colors" value={cert.credentialUrl ?? ""} onChange={(e) => setCertifications((prev) => prev.map((item, i) => (i === idx ? { ...item, credentialUrl: e.target.value || undefined } : item)))} placeholder="Verification URL" />
                          <textarea className="col-span-2 w-full bg-white/4 border border-white/10 focus:border-[#ef4242] rounded-sm px-3 py-2 text-sm text-white outline-none placeholder-white/25 transition-colors resize-none" rows={2} value={cert.description ?? ""} onChange={(e) => setCertifications((prev) => prev.map((item, i) => (i === idx ? { ...item, description: e.target.value || undefined } : item)))} placeholder="Description" />
                          <div className="col-span-2 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <button type="button" className={`${btnOutline} cursor-pointer`} onClick={() => setResumeLogoTarget({ list: "certifications", index: idx })}>{cert.issuerLogo ? "Change Logo" : "+ Logo"}</button>
                              {cert.issuerLogo && <img src={assetUrl(cert.issuerLogo)} alt="" className="h-6 w-6 rounded-sm object-cover border border-white/10" />}
                            </div>
                            <button className="text-[#ef4242]/60 hover:text-[#ef4242] text-xs" onClick={() => setCertifications((prev) => prev.filter((_, i) => i !== idx))}>Remove</button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-nord text-xs text-white">Awards</p>
                          <p className="text-[10px] text-white/25 mt-1">Drag cards to reorder.</p>
                        </div>
                        <button className={btnOutline} onClick={() => setAwards((prev) => [...prev, { id: uid(), name: "", date: "" }])}>+ Add Award</button>
                      </div>
                      {awards.map((award, idx) => (
                        <div
                          key={award.id}
                          draggable
                          onDragStart={() => setDraggedResumeItem({ list: "awards", index: idx })}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleResumeDrop("awards", idx)}
                          onDragEnd={() => setDraggedResumeItem(null)}
                          className="border border-white/6 rounded-sm p-4 grid grid-cols-2 gap-3 cursor-move"
                        >
                          <input className={inputCls} value={award.id} onChange={(e) => setAwards((prev) => prev.map((item, i) => (i === idx ? { ...item, id: e.target.value } : item)))} placeholder="ID" />
                          <input className={inputCls} value={award.date} onChange={(e) => setAwards((prev) => prev.map((item, i) => (i === idx ? { ...item, date: e.target.value } : item)))} placeholder="Received YYYY-MM" />
                          <input className={inputCls} value={award.name} onChange={(e) => setAwards((prev) => prev.map((item, i) => (i === idx ? { ...item, name: e.target.value } : item)))} placeholder="Name" />
                          <input className={inputCls} value={award.issuer ?? ""} onChange={(e) => setAwards((prev) => prev.map((item, i) => (i === idx ? { ...item, issuer: e.target.value || undefined } : item)))} placeholder="Issuer" />
                          <input className="col-span-2 w-full bg-white/4 border border-white/10 focus:border-[#ef4242] rounded-sm px-3 h-9 text-sm text-white outline-none placeholder-white/25 transition-colors" value={award.issuerUrl ?? ""} onChange={(e) => setAwards((prev) => prev.map((item, i) => (i === idx ? { ...item, issuerUrl: e.target.value || undefined } : item)))} placeholder="Link" />
                          <textarea className="col-span-2 w-full bg-white/4 border border-white/10 focus:border-[#ef4242] rounded-sm px-3 py-2 text-sm text-white outline-none placeholder-white/25 transition-colors resize-none" rows={2} value={award.description ?? ""} onChange={(e) => setAwards((prev) => prev.map((item, i) => (i === idx ? { ...item, description: e.target.value || undefined } : item)))} placeholder="Description" />
                          <textarea className="col-span-2 w-full bg-white/4 border border-white/10 focus:border-[#ef4242] rounded-sm px-3 py-2 text-sm text-white outline-none placeholder-white/25 transition-colors resize-none" rows={2} value={(award.requirements ?? []).join("\n")} onChange={(e) => setAwards((prev) => prev.map((item, i) => (i === idx ? { ...item, requirements: e.target.value.split("\n").map((l) => l.trim()).filter(Boolean) } : item)))} placeholder="Requirements (one per line)" />
                          <div className="col-span-2 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <button type="button" className={`${btnOutline} cursor-pointer`} onClick={() => setResumeLogoTarget({ list: "awards", index: idx })}>{award.logo ? "Change Logo" : "+ Logo / Badge"}</button>
                              {award.logo && <img src={assetUrl(award.logo)} alt="" className="h-6 w-6 rounded-sm object-cover border border-white/10" />}
                            </div>
                            <button className="text-[#ef4242]/60 hover:text-[#ef4242] text-xs" onClick={() => setAwards((prev) => prev.filter((_, i) => i !== idx))}>Remove</button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-nord text-xs text-white">Organizations</p>
                          <p className="text-[10px] text-white/25 mt-1">Drag cards to reorder.</p>
                        </div>
                        <button className={btnOutline} onClick={() => setClubs((prev) => [...prev, { id: uid(), name: "" }])}>+ Add Organization</button>
                      </div>
                      {clubs.map((club, idx) => (
                        <div
                          key={club.id}
                          draggable
                          onDragStart={() => setDraggedResumeItem({ list: "clubs", index: idx })}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleResumeDrop("clubs", idx)}
                          onDragEnd={() => setDraggedResumeItem(null)}
                          className="border border-white/6 rounded-sm p-4 grid grid-cols-2 gap-3 cursor-move"
                        >
                          <input className={inputCls} value={club.id} onChange={(e) => setClubs((prev) => prev.map((item, i) => (i === idx ? { ...item, id: e.target.value } : item)))} placeholder="ID" />
                          <input className={inputCls} value={club.name} onChange={(e) => setClubs((prev) => prev.map((item, i) => (i === idx ? { ...item, name: e.target.value } : item)))} placeholder="Name" />
                          <input className={inputCls} value={club.role ?? ""} onChange={(e) => setClubs((prev) => prev.map((item, i) => (i === idx ? { ...item, role: e.target.value || undefined } : item)))} placeholder="Role" />
                          <input className={inputCls} value={club.url ?? ""} onChange={(e) => setClubs((prev) => prev.map((item, i) => (i === idx ? { ...item, url: e.target.value || undefined } : item)))} placeholder="URL" />
                          <input className={inputCls} value={club.startDate ?? ""} onChange={(e) => setClubs((prev) => prev.map((item, i) => (i === idx ? { ...item, startDate: e.target.value || undefined } : item)))} placeholder="YYYY-MM" />
                          <input className={inputCls} value={club.endDate ?? ""} onChange={(e) => setClubs((prev) => prev.map((item, i) => (i === idx ? { ...item, endDate: e.target.value || undefined } : item)))} placeholder="YYYY-MM" />
                          <textarea className="col-span-2 w-full bg-white/4 border border-white/10 focus:border-[#ef4242] rounded-sm px-3 py-2 text-sm text-white outline-none placeholder-white/25 transition-colors resize-none" rows={2} value={club.description ?? ""} onChange={(e) => setClubs((prev) => prev.map((item, i) => (i === idx ? { ...item, description: e.target.value || undefined } : item)))} placeholder="Description" />
                          <div className="col-span-2 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <button type="button" className={`${btnOutline} cursor-pointer`} onClick={() => setResumeLogoTarget({ list: "clubs", index: idx })}>{club.logo ? "Change Logo" : "+ Logo"}</button>
                              {club.logo && <img src={assetUrl(club.logo)} alt="" className="h-6 w-6 rounded-sm object-cover border border-white/10" />}
                            </div>
                            <button className="text-[#ef4242]/60 hover:text-[#ef4242] text-xs" onClick={() => setClubs((prev) => prev.filter((_, i) => i !== idx))}>Remove</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Work Experience */}
                  <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-3">
                    <p className="font-nord text-sm text-white mb-3">Work Experience</p>
                    {filteredExperiences.filter((e) => e.type === "job").map((exp) => (
                      <div key={exp.id} className="border border-white/6 rounded-sm p-4 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm text-white font-medium">{exp.role}</p>
                            <p className="text-xs text-white/50">{exp.companyName}</p>
                          </div>
                          <span className="text-[10px] text-white/30 flex-shrink-0">
                            {exp.startDate} – {exp.current ? "Present" : (exp.endDate ?? "—")}
                          </span>
                        </div>
                        {exp.description && (
                          <p className="text-xs text-white/35 line-clamp-2">{exp.description}</p>
                        )}
                      </div>
                    ))}
                    {filteredExperiences.filter((e) => e.type === "job").length === 0 && (
                      <p className="text-xs text-white/25">No work experience yet.</p>
                    )}
                  </div>

                  {/* Volunteer */}
                  <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-3">
                    <p className="font-nord text-sm text-white mb-3">Volunteer</p>
                    {filteredExperiences.filter((e) => e.type === "volunteer").map((exp) => (
                      <div key={exp.id} className="border border-white/6 rounded-sm p-4 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm text-white font-medium">{exp.role}</p>
                            <p className="text-xs text-white/50">{exp.companyName}</p>
                          </div>
                          <span className="text-[10px] text-white/30 flex-shrink-0">
                            {exp.startDate} – {exp.current ? "Present" : (exp.endDate ?? "—")}
                          </span>
                        </div>
                        {exp.description && (
                          <p className="text-xs text-white/35 line-clamp-2">{exp.description}</p>
                        )}
                      </div>
                    ))}
                    {filteredExperiences.filter((e) => e.type === "volunteer").length === 0 && (
                      <p className="text-xs text-white/25">No volunteer work yet.</p>
                    )}
                  </div>

                  {/* Education */}
                  <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-3">
                    <p className="font-nord text-sm text-white mb-3">Education</p>
                    {filteredEducations.map((education) => (
                      <div key={education.id} className="border border-white/6 rounded-sm p-4 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm text-white font-medium">{education.degree}</p>
                            <p className="text-xs text-white/50">{education.institution}</p>
                          </div>
                          <span className="text-[10px] text-white/30 flex-shrink-0">
                            {education.startDate} â€“ {education.current ? "Present" : (education.endDate ?? "â€”")}
                          </span>
                        </div>
                        {education.field && (
                          <p className="text-xs text-white/35">{education.field}</p>
                        )}
                        {education.description && (
                          <p className="text-xs text-white/35 leading-relaxed">{education.description}</p>
                        )}
                      </div>
                    ))}
                    {filteredEducations.length === 0 && (
                      <p className="text-xs text-white/25">No education yet.</p>
                    )}
                  </div>

                  {/* Skills */}
                  <div className="border border-white/7 bg-white/2 rounded-sm p-5">
                    <p className="font-nord text-sm text-white mb-3">Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {filteredSkillsList.map((s, i) => (
                        <span
                          key={`${s.name}-${i}`}
                          className="px-2.5 py-1 text-[11px] rounded-sm bg-white/6 text-white/60 border border-white/8"
                        >
                          {s.name}
                        </span>
                      ))}
                      {filteredSkillsList.length === 0 && <p className="text-xs text-white/25">No skills yet.</p>}
                    </div>
                  </div>

                  {/* Certifications */}
                  <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-3">
                    <p className="font-nord text-sm text-white mb-3">Certifications</p>
                    {filteredCertificationsList.map((cert) => (
                      <div key={cert.id} className="flex items-center justify-between border border-white/6 rounded-sm px-4 py-3">
                        <div>
                          <p className="text-sm text-white font-medium">{cert.name}</p>
                          <p className="text-xs text-white/45">{cert.issuer}</p>
                        </div>
                        <span className="text-[10px] text-white/30">{cert.date}</span>
                      </div>
                    ))}
                    {filteredCertificationsList.length === 0 && <p className="text-xs text-white/25">No certifications yet.</p>}
                  </div>

                  {/* Awards */}
                  <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-3">
                    <p className="font-nord text-sm text-white mb-3">Awards</p>
                    {filteredAwardsList.map((award) => (
                      <div key={award.id} className="flex items-center justify-between border border-white/6 rounded-sm px-4 py-3">
                        <div>
                          <p className="text-sm text-white font-medium">{award.name}</p>
                          {award.issuer && <p className="text-xs text-white/45">{award.issuer}</p>}
                          {award.description && <p className="text-xs text-white/30 line-clamp-1">{award.description}</p>}
                        </div>
                        <span className="text-[10px] text-white/30">{award.date}</span>
                      </div>
                    ))}
                    {filteredAwardsList.length === 0 && <p className="text-xs text-white/25">No awards yet.</p>}
                  </div>

                  {/* Organizations */}
                  <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-3">
                    <p className="font-nord text-sm text-white mb-3">Organizations</p>
                    {filteredClubsList.map((club) => (
                      <div key={club.id} className="flex items-start justify-between border border-white/6 rounded-sm px-4 py-3">
                        <div>
                          <p className="text-sm text-white font-medium">{club.name}</p>
                          {club.role && <p className="text-xs text-white/45">{club.role}</p>}
                          {club.description && <p className="text-xs text-white/30 line-clamp-1">{club.description}</p>}
                        </div>
                        <span className="text-[10px] text-white/30">
                          {club.startDate ?? "—"}{club.endDate ? ` – ${club.endDate}` : ""}
                        </span>
                      </div>
                    ))}
                    {filteredClubsList.length === 0 && <p className="text-xs text-white/25">No organizations yet.</p>}
                  </div>
                </>
              )}
            </div>
          )}

          {activeSection === "analytics" && (
            <AnalyticsDashboard />
          )}

          {activeSection === "sessions" && (
            <SessionsControl />
          )}

          {activeSection === "bar" && (() => {
            const cats = siteContent.barCategories ?? [];
            const setCats = (next: typeof cats) => setSiteContent((prev) => ({ ...prev, barCategories: next }));
            const updateCat = (i: number, patch: Partial<(typeof cats)[number]>) => setCats(cats.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
            const saveBar = async (payload: typeof siteContent) => {
              await saveSiteContentEditor(payload);
            };
            return (
              <div className="space-y-4">
                {/* Enable / disable /bar */}
                <div className="flex items-center justify-between gap-3 border border-white/8 rounded-sm p-4 bg-white/2">
                  <div>
                    <p className="font-nord text-sm text-white flex items-center gap-2">
                      <span className={`inline-block h-2 w-2 rounded-full ${siteContent.barEnabled ? "bg-emerald-400" : "bg-white/20"}`} />
                      /bar page is {siteContent.barEnabled ? "LIVE" : "OFF (404)"}
                    </p>
                    <p className="text-xs text-white/35 mt-0.5">The drink roulette. When off, /bar returns Not Found.</p>
                  </div>
                  <button
                    className={siteContent.barEnabled ? btnOutlineRed : "inline-flex items-center justify-center px-4 h-9 text-xs font-medium bg-[#ef4242] hover:bg-[#d93838] text-white rounded-sm transition-colors"}
                    onClick={async () => { const next = { ...siteContent, barEnabled: !siteContent.barEnabled }; setSiteContent(next); await saveBar(next); }}
                  >
                    {siteContent.barEnabled ? "Disable /bar" : "Enable /bar"}
                  </button>
                </div>

                {/* Slot lineup customization */}
                <div>
                  <div className="mb-3">
                    <p className="font-nord text-sm text-white">Slot Machine Lineup</p>
                    <p className="text-xs text-white/35 mt-0.5">These categories and drinks fill the /bar slot machine. Each drink is one slot result; the description shows when a player lands on a drink from that category. Visitors can pick which categories to include and add their own — this is the master list.</p>
                  </div>

                  <div className="space-y-4">
                    {cats.map((cat, i) => (
                      <div key={cat.id} className="rounded-sm border border-white/10 bg-white/[0.03] p-4 space-y-4" style={{ borderLeft: `3px solid ${cat.color}` }}>
                        {/* Header row: color + name */}
                        <div className="flex items-end gap-3">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] tracking-[0.16em] uppercase text-white/40">Color</label>
                            <input type="color" value={cat.color} onChange={(e) => updateCat(i, { color: e.target.value })} className="h-10 w-12 rounded-sm border border-white/12 bg-transparent cursor-pointer p-0.5" title="Category color" />
                          </div>
                          <div className="flex-1 space-y-1.5">
                            <label className="block text-[10px] tracking-[0.16em] uppercase text-white/40">Category name</label>
                            <input className="h-10 w-full rounded-sm border border-white/12 bg-white/5 px-3.5 text-sm text-white outline-none transition-colors focus:border-white/30 placeholder:text-white/25" value={cat.name} placeholder="e.g. The Classics" onChange={(e) => updateCat(i, { name: e.target.value })} />
                          </div>
                          <button className={`${btnOutlineRed} h-10`} onClick={() => setCats(cats.filter((_, idx) => idx !== i))}>Remove</button>
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                          <label className="block text-[10px] tracking-[0.16em] uppercase text-white/40">Description <span className="text-white/25 normal-case tracking-normal">— shown when a player lands on this category</span></label>
                          <textarea className="w-full resize-y rounded-sm border border-white/12 bg-white/5 px-3.5 py-2.5 text-sm leading-relaxed text-white outline-none transition-colors focus:border-white/30 placeholder:text-white/25" rows={2} value={cat.description} placeholder="Safe, crowd-pleasing options…" onChange={(e) => updateCat(i, { description: e.target.value })} />
                        </div>

                        {/* Drinks + Recipes */}
                        <div className="space-y-2">
                          <label className="block text-[10px] tracking-[0.16em] uppercase text-white/40">Drinks &amp; Recipes <span className="text-white/25">({cat.options.length})</span></label>
                          <div className="space-y-3">
                            {cat.options.map((opt, oi) => {
                              const recipe = cat.recipes?.[opt] ?? "";
                              const setRecipe = (v: string) => {
                                const newRecipes = { ...(cat.recipes ?? {}), [opt]: v };
                                if (!v) delete newRecipes[opt];
                                updateCat(i, { recipes: newRecipes });
                              };
                              const renameDrink = (newName: string) => {
                                const oldName = opt;
                                const newOptions = cat.options.map((o, k) => (k === oi ? newName : o));
                                const newRecipes = { ...(cat.recipes ?? {}) };
                                if (newName !== oldName && oldName in newRecipes) {
                                  newRecipes[newName] = newRecipes[oldName];
                                  delete newRecipes[oldName];
                                }
                                updateCat(i, { options: newOptions, recipes: newRecipes });
                              };
                              return (
                                <div key={oi} className="rounded-sm border border-white/8 bg-white/2 p-3 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-white/25 w-5 text-right tabular-nums">{oi + 1}.</span>
                                    <input className="h-9 flex-1 rounded-sm border border-white/12 bg-white/5 px-3.5 text-sm text-white outline-none transition-colors focus:border-white/30 placeholder:text-white/25" value={opt} placeholder="Drink name" onChange={(e) => renameDrink(e.target.value)} />
                                    <button className="flex h-9 w-9 items-center justify-center rounded-sm border border-white/10 text-white/30 hover:border-[#ef4242]/40 hover:text-[#ef4242] transition-colors" title="Remove drink" onClick={() => {
                                      const newOptions = cat.options.filter((_, k) => k !== oi);
                                      const newRecipes = { ...(cat.recipes ?? {}) };
                                      delete newRecipes[opt];
                                      updateCat(i, { options: newOptions, recipes: newRecipes });
                                    }}>✕</button>
                                  </div>
                                  <textarea
                                    className="w-full resize-y rounded-sm border border-white/8 bg-white/3 px-3 py-2 text-xs leading-relaxed text-white/70 outline-none transition-colors focus:border-white/25 placeholder:text-white/20"
                                    rows={2}
                                    value={recipe}
                                    placeholder="Recipe (optional) — shown after the spin…"
                                    onChange={(e) => setRecipe(e.target.value)}
                                  />
                                </div>
                              );
                            })}
                          </div>
                          <button className={btnOutline} onClick={() => updateCat(i, { options: [...cat.options, "New drink"] })}>+ Add drink</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <button className={btnOutline} onClick={() => setCats([...cats, { id: (crypto.randomUUID?.() ?? String(Date.now())), name: "New Category", color: "#a855f7", description: "", options: ["New drink"] }])}>+ Add category</button>
                    <button
                      className="inline-flex items-center justify-center px-5 h-9 text-xs font-medium bg-[#ef4242] hover:bg-[#d93838] text-white rounded-sm transition-colors ml-auto"
                      onClick={async () => { await saveBar(siteContent); }}
                    >
                      Save lineup
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {activeSection === "visitors" && (
            <AdminVisitorsSection />
          )}

          {activeSection === "booking" && (
            <BookingAdmin />
          )}

          {activeSection === "identities" && (
            identityDetailId && identityDetailRecord ? (
              <div className="space-y-4">
                {/* Back + header */}
                <button
                  onClick={() => { setIdentityDetailId(null); setIdentityDetailEditing(false); }}
                  className="inline-flex items-center gap-1.5 text-xs text-white/45 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft size={13} /> Back to Identities
                </button>
                <div className="rounded-sm border border-white/8 bg-white/2 p-4">
                  <div className="flex items-center gap-2.5">
                    <Fingerprint size={18} className="text-[var(--cranberry)] shrink-0" />
                    {identityDetailEditing ? (
                      <>
                        <input
                          value={identityDetailEditName}
                          onChange={(e) => setIdentityDetailEditName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") renameIdentityDetail(); if (e.key === "Escape") setIdentityDetailEditing(false); }}
                          className="h-9 flex-1 rounded-sm border border-white/15 bg-white/4 px-2 text-base text-white outline-none"
                          autoFocus
                        />
                        <button onClick={renameIdentityDetail} className="text-emerald-400 hover:text-emerald-300 cursor-pointer"><Check size={17} /></button>
                        <button onClick={() => setIdentityDetailEditing(false)} className="text-white/40 hover:text-white cursor-pointer"><X size={17} /></button>
                      </>
                    ) : (
                      <>
                        <h2 className="font-nord text-lg text-white flex items-center gap-2">
                          {identityDetailRecord.name}
                          {identityDetailRecord.anonymous && <span className="rounded-sm bg-white/8 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/40">anon</span>}
                        </h2>
                        <span className="flex-1" />
                        <span className="text-[11px] text-white/30">{identityDetailRecord.devices.length} device{identityDetailRecord.devices.length === 1 ? "" : "s"}</span>
                        {allIdentities.length > 1 && (
                          <IdentityPicker identities={allIdentities} excludeId={identityDetailId} onPick={mergeIdentityDetailInto} label="Merge into" icon={<GitMerge size={11} />} accent />
                        )}
                        <button onClick={() => { setIdentityDetailEditing(true); setIdentityDetailEditName(identityDetailRecord.name); }} title="Rename" className="text-white/40 hover:text-white cursor-pointer"><Pencil size={14} /></button>
                        <button onClick={copyIdentityDetailLink} title="Copy tracking link" className="text-white/40 hover:text-[var(--cranberry)] cursor-pointer">{identityDetailCopied ? <Check size={15} className="text-emerald-400" /> : <Link2 size={15} />}</button>
                        <button onClick={deleteIdentityDetail} title="Delete identity" className="text-white/40 hover:text-[#ef4242] cursor-pointer"><Trash2 size={15} /></button>
                      </>
                    )}
                  </div>
                  {identityDetailBusy && <div className="mt-2 flex items-center gap-2 text-[11px] text-white/40"><Loader2 size={12} className="animate-spin" /> Working…</div>}
                </div>
                <div className="rounded-sm border border-white/8 bg-black/20 p-4">
                  <IdentityDetail id={identityDetailId} allIdentities={allIdentities} confirm={confirmIdentity} onMutate={loadAllIdentities} />
                </div>
                {identityModal}
              </div>
            ) : (
              <IdentitiesAdmin onOpenIdentity={(id) => { setIdentityDetailId(id); setIdentityDetailEditing(false); }} />
            )
          )}

          {activeSection === "crossdevice" && (
            <DeviceCandidates />
          )}

          {activeSection === "traffic" && (
            <div className="space-y-6">
              <UtmLinkGenerator />
              <AiRoutingConditions />
            </div>
          )}

          {activeSection === "status" && (
            <AdminStatusSection />
          )}

          {activeSection === "database" && (
            <BackupManager />
          )}

          {activeSection === "discord" && (
            <DiscordSettings />
          )}

        </div>
      </main>

      {/* ── MODALS ── */}
      {projectModal.open && (
        <ProjectModal
          initial={projectModal.editing}
          clients={clients}
          onClose={() => setProjectModal({ open: false })}
          onSave={saveProject}
        />
      )}

      {articleModal.open && (
        <ArticleModal
          initial={articleModal.editing}
          onClose={() => setArticleModal({ open: false })}
          onSave={saveArticle}
        />
      )}

      {clientModal.open && (
        <ClientModal
          initial={clientModal.editing}
          projects={projects}
          onClose={() => setClientModal({ open: false })}
          onSave={saveClient}
        />
      )}

      {contactModal.open && (
        <ContactEditorModal
          initial={contactModal.editing ?? undefined}
          onClose={() => setContactModal({ open: false })}
          onSave={saveContact}
        />
      )}

      {campaignModal.open && (
        <CampaignModal
          initial={campaignModal.editing}
          contacts={contacts}
          onClose={() => setCampaignModal({ open: false })}
          onSave={saveCampaign}
        />
      )}

      {campaignView && (
        <CampaignViewModal
          campaign={campaignView}
          contacts={contacts}
          onSendBatch={(campaign, count) => saveCampaign(campaign, "send", count)}
          onClose={() => setCampaignView(null)}
        />
      )}

      {deleteConfirm && (
        <DeleteDialog
          label={deleteConfirm.label}
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={confirmDelete}
        />
      )}

      {r2RenameTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center px-4 py-6">
          <div className="w-full max-w-sm space-y-4 rounded-sm border border-white/10 bg-[#0d0d0d] p-6">
            <p className="font-nord text-sm text-white">Rename File</p>
            <p className="truncate text-[11px] text-white/35">Current: {r2RenameTarget.name}</p>
            <div className="flex gap-2">
              <input
                className={`${inputCls} flex-1`}
                value={r2RenameValue}
                onChange={(e) => setR2RenameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void renameR2FileConfirmed(); }}
                placeholder="new-filename.ext"
                autoFocus
              />
              <button
                type="button"
                className={btnOutline}
                onClick={() => {
                  const ext = r2RenameTarget.name.includes(".") ? `.${r2RenameTarget.name.split(".").pop()}` : "";
                  setR2RenameValue(`${crypto.randomUUID()}${ext}`);
                }}
              >
                UUID
              </button>
            </div>
            <div className="flex justify-end gap-3">
              <button className={btnGhost} onClick={() => { setR2RenameTarget(null); setR2RenameValue(""); }}>Cancel</button>
              <button
                className={btnRed}
                disabled={!r2RenameValue.trim() || r2Renaming}
                onClick={() => void renameR2FileConfirmed()}
              >
                {r2Renaming ? "Renaming…" : "Rename"}
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

      {r2PreviewFile && (
        <Modal
          title={r2PreviewFile.name}
          onClose={() => setR2PreviewFile(null)}
          wide
        >
          <div className="space-y-4 p-6">
            <R2AssetDetailPanel fileKey={r2PreviewFile.key} onChanged={() => void loadR2Assets()} /><AssetUsage assetKey={r2PreviewFile.key} onDeleted={()=>{setR2PreviewFile(null);void loadR2Assets();}} />
            <div className="flex flex-wrap items-center justify-end gap-2 text-[11px] text-white/35 border-t border-white/6 pt-3">
              <button
                className={`${btnOutline} cursor-pointer`}
                onClick={() => void copyR2Link(r2PreviewFile.publicUrl)}
              >
                {r2CopiedUrl === r2PreviewFile.publicUrl ? "Copied." : "Copy Link"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {siteContentImageTarget && (
        <R2ImagePickerModal
          title={
            siteContentImageTarget === "brandLogoUrl"
              ? "Select Shared Logo"
              : "Select Favicon"
          }
          onClose={() => setSiteContentImageTarget(null)}
          onSelect={(url) => {
            setSiteContent((prev) => ({
              ...prev,
              [siteContentImageTarget]: url,
            }));
            setSiteContentImageTarget(null);
          }}
        />
      )}
    </div>
  );
}

/* ─── Admin Visitors Section ────────────────────────────────────────────── */
function AdminVisitorsSection() {
  type VisitorData = {
    counts: { country: string; countryName: string; count: number }[];
    adjustments: { id: string; country: string; countryName: string; addedCount: number; createdAt: string }[];
    multiplier: number;
  };
  const [data, setData] = useState<VisitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshRequired, setRefreshRequired] = useState(false);
  const [form, setForm] = useState({ country: "", countryName: "", addedCount: "" });
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [multiplierInput, setMultiplierInput] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const lifecycleRef = useRef<AbortController | null>(null);
  const mutationActiveRef = useRef(false);
  const saving = pendingAction === "add";
  const savingMultiplier = pendingAction === "multiplier";

  useEffect(() => {
    const controller = new AbortController();
    lifecycleRef.current = controller;
    adminRequest<VisitorData>("/api/admin/visitors", { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        setData(result);
        setMultiplierInput(String(result.multiplier ?? 1));
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load visitor data.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  async function refreshData() {
    const controller = lifecycleRef.current;
    if (!controller || controller.signal.aborted || refreshing || mutationActiveRef.current) return;
    setRefreshing(true); setError("");
    try {
      const result = await adminRequest<VisitorData>("/api/admin/visitors", { signal: controller.signal });
      if (controller.signal.aborted) return;
      setData(result);
      setRefreshRequired(false);
      if (!data) setMultiplierInput(String(result.multiplier ?? 1));
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to refresh visitor data.");
    } finally { if (!controller.signal.aborted) setRefreshing(false); }
  }

  async function saveChange(action: string, url: string, init: RequestInit, onSuccess?: () => void) {
    const controller = lifecycleRef.current;
    if (!controller || controller.signal.aborted || mutationActiveRef.current || refreshing || refreshRequired) return;
    mutationActiveRef.current = true;
    setPendingAction(action); setError(""); setNotice("");
    let committed = false;
    try {
      await adminRequest(url, { ...init, signal: controller.signal });
      committed = true;
      if (controller.signal.aborted) return;
      onSuccess?.();
      setNotice(action === "add" ? "Adjustment added." : action === "multiplier" ? "Multiplier saved." : "Adjustment deleted.");
      const result = await adminRequest<VisitorData>("/api/admin/visitors", { signal: controller.signal });
      if (!controller.signal.aborted) setData(result);
    } catch (cause) {
      if (!controller.signal.aborted && (committed || (cause instanceof AdminRequestError && cause.status >= 200 && cause.status < 300))) setRefreshRequired(true);
      if (!controller.signal.aborted) setError(committed ? "The change was saved, but the latest visitor data could not be loaded. Refresh the data before making another change." : cause instanceof Error ? cause.message : "The change could not be saved. Your entries are still here.");
    } finally {
      mutationActiveRef.current = false;
      if (!controller.signal.aborted) setPendingAction(null);
    }
  }

  const handleAdd = async () => {
    const submitted = { ...form };
    const count = Number(submitted.addedCount);
    if (!submitted.country.trim() || !submitted.countryName.trim() || !Number.isSafeInteger(count) || count < 1) {
      setError("Enter a country code, country name and positive whole-number count.");
      return;
    }
    await saveChange("add", "/api/admin/visitors", {
      method: "POST",
      body: JSON.stringify({ country: submitted.country.trim(), countryName: submitted.countryName.trim(), addedCount: count }),
    }, () => setForm((current) => JSON.stringify(current) === JSON.stringify(submitted) ? { country: "", countryName: "", addedCount: "" } : current));
  };

  const handleDelete = (id: string) => saveChange(`delete:${id}`, `/api/admin/visitors?${new URLSearchParams({ id })}`, { method: "DELETE" });

  const handleSaveMultiplier = async () => {
    const multiplier = Number(multiplierInput);
    if (!Number.isFinite(multiplier) || multiplier < 1) { setError("Enter a multiplier of at least 1."); return; }
    await saveChange("multiplier", "/api/admin/visitors", { method: "POST", body: JSON.stringify({ type: "multiplier", multiplier }) });
  };

  if (loading) return <p role="status" className="text-white/30 text-xs">Loading visitor data...</p>;
  if (!data) return <div className="space-y-3 text-xs"><p role="alert" className="text-red-300">{error || "Visitor data is unavailable."}</p><button onClick={() => void refreshData()} disabled={refreshing} className={btnOutline}>{refreshing ? "Loading..." : "Retry loading visitor data"}</button></div>;

  const inputCls = "h-9 rounded-sm border border-white/10 bg-white/4 px-3 text-xs text-white outline-none placeholder-white/25 focus:border-[#ef4242] transition-colors";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div aria-live="polite">{notice && <p role="status" className="text-xs text-emerald-300">{notice}</p>}{pendingAction && <p role="status" className="text-xs text-white/50">Saving visitor changes...</p>}</div>
        <button onClick={() => void refreshData()} disabled={refreshing || Boolean(pendingAction)} className={btnOutline}>{refreshing ? "Refreshing..." : "Refresh visitor data"}</button>
      </div>
      {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
      {refreshRequired && <p role="status" className="text-xs text-amber-300">Read-only: displayed data may be out of date. Refresh successfully to enable changes.</p>}
      {/* Auto-inflation multiplier */}
      <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
        <div>
          <p className="font-nord text-sm text-white">Auto-Inflation Multiplier</p>
          <p className="text-xs text-white/35 mt-0.5">Multiplies all visitor counts (real + manual adjustments) before display. 1× = no change. 2.5× = 2.5× the real count everywhere on the site.</p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            className={`${inputCls} w-28`}
            type="number"
            min="1"
            step="0.1"
            value={multiplierInput}
            onChange={(e) => setMultiplierInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSaveMultiplier(); }}
          />
          <span className="text-xs text-white/35">× multiplier</span>
          <button onClick={handleSaveMultiplier} disabled={Boolean(pendingAction) || refreshing || refreshRequired} className="h-9 px-4 text-xs tracking-widest uppercase bg-[#ef4242] text-white rounded-sm hover:bg-[#dd3030] transition-colors disabled:opacity-50">
            {savingMultiplier ? "..." : "Save"}
          </button>
          {data?.multiplier && data.multiplier > 1 && (
            <span className="text-[10px] text-emerald-400 font-jb">Active ({data.multiplier}×)</span>
          )}
        </div>
      </div>

      {/* Live counts table */}
      <div className="border border-white/8 rounded-sm overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-white/2 border-b border-white/8">
            <tr>
              <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35">Country</th>
              <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35">Code</th>
              <th className="px-3 py-2.5 text-right text-[10px] tracking-widest uppercase text-white/35">Count</th>
            </tr>
          </thead>
          <tbody>
            {(data?.counts ?? []).map((c) => (
              <tr key={c.country} className="border-b border-white/5 last:border-0 hover:bg-white/3">
                <td className="px-3 py-2 text-white/75"><span className="mr-1.5"><CountryFlag countryCode={c.country} label="" /></span>{c.countryName}</td>
                <td className="px-3 py-2 text-white/40">{c.country}</td>
                <td className="px-3 py-2 text-right text-white/60">{c.count.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Manual per-country adjustments */}
      <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
        <p className="font-nord text-sm text-white">Manual Adjustments</p>
        <p className="text-xs text-white/35">Add a fixed visitor count to a specific country. Applied before the multiplier.</p>
        <div className="flex flex-wrap gap-2 items-end">
          <input className={inputCls} placeholder="Code (e.g. US)" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value.toUpperCase() }))} />
          <input className={inputCls} placeholder="Country name" value={form.countryName} onChange={(e) => setForm((f) => ({ ...f, countryName: e.target.value }))} />
          <input className={`${inputCls} w-24`} placeholder="Count" type="number" min="1" value={form.addedCount} onChange={(e) => setForm((f) => ({ ...f, addedCount: e.target.value }))} />
          <button onClick={handleAdd} disabled={Boolean(pendingAction) || refreshing || refreshRequired} className="h-9 px-4 text-xs tracking-widest uppercase bg-[#ef4242] text-white rounded-sm hover:bg-[#dd3030] transition-colors disabled:opacity-50">
            {saving ? "..." : "Add"}
          </button>
        </div>
        {(data?.adjustments ?? []).length > 0 && (
          <div className="border border-white/8 rounded-sm overflow-x-auto mt-3">
            <table className="w-full text-xs">
              <thead className="bg-white/2 border-b border-white/8">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] tracking-widest uppercase text-white/35">Country</th>
                  <th className="px-3 py-2 text-right text-[10px] tracking-widest uppercase text-white/35">Added</th>
                  <th className="px-3 py-2 text-right text-[10px] tracking-widest uppercase text-white/35">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data?.adjustments ?? []).map((adj) => (
                  <tr key={adj.id} className="border-b border-white/5 last:border-0 hover:bg-white/3">
                    <td className="px-3 py-2 text-white/75"><span className="mr-1.5"><CountryFlag countryCode={adj.country} label="" /></span>{adj.countryName} ({adj.country})</td>
                    <td className="px-3 py-2 text-right text-white/60">+{adj.addedCount.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => void handleDelete(adj.id)} disabled={Boolean(pendingAction) || refreshing || refreshRequired} className="text-[10px] text-red-400 hover:text-red-300 disabled:opacity-40">{pendingAction === `delete:${adj.id}` ? "Deleting..." : "Delete"}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Admin Status Section ──────────────────────────────────────────────── */
function AdminStatusSection() {
  type Service = { id: string; name: string; group?: string; sortOrder: number; pingUrl?: string; defunct?: boolean; createdAt: string };
  type Incident = { id: string; serviceId: string; title: string; message: string; severity: string; status: string; startedAt: string; resolvedAt?: string; createdAt: string; updatedAt?: string };
  type StatusData = { services: Service[]; incidents: Incident[] };
  type Ping = { reachable: boolean; latencyMs: number | null; error?: string };
  const [services, setServices] = useState<Service[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [pingResults, setPingResults] = useState<Record<string, Ping>>({});
  const [pinging, setPinging] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshRequired, setRefreshRequired] = useState(false);
  const [incForm, setIncForm] = useState({ title: "", message: "", severity: "minor", serviceId: "" });
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pingError, setPingError] = useState("");
  const [notice, setNotice] = useState("");
  const lifecycleRef = useRef<AbortController | null>(null);
  const mutationActiveRef = useRef(false);
  const saving = pendingAction === "create";

  const readPings = useCallback(async (signal: AbortSignal): Promise<Record<string, Ping>> => {
    const result = await adminRequest<{ results: (Ping & { id: string })[] }>("/api/admin/status/ping", { method: "POST", signal });
    return Object.fromEntries(result.results.map(({ id, ...ping }) => [id, ping]));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    lifecycleRef.current = controller;
    adminRequest<StatusData>("/api/admin/status", { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        setServices(result.services); setIncidents(result.incidents); setLoaded(true);
      })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load service status."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    readPings(controller.signal)
      .then((result) => { if (!controller.signal.aborted) setPingResults(result); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setPingError(cause instanceof Error ? cause.message : "Service pings could not be completed."); })
      .finally(() => { if (!controller.signal.aborted) setPinging(false); });
    return () => controller.abort();
  }, [readPings]);

  async function refreshData() {
    const controller = lifecycleRef.current;
    if (!controller || controller.signal.aborted || refreshing || mutationActiveRef.current) return;
    setRefreshing(true); setError("");
    try {
      const result = await adminRequest<StatusData>("/api/admin/status", { signal: controller.signal });
      if (controller.signal.aborted) return;
      setServices(result.services); setIncidents(result.incidents); setLoaded(true);
      setRefreshRequired(false);
    } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to refresh status data."); }
    finally { if (!controller.signal.aborted) setRefreshing(false); }
  }

  async function runPings() {
    const controller = lifecycleRef.current;
    if (!controller || controller.signal.aborted || pinging) return;
    setPinging(true); setPingError("");
    try {
      const result = await readPings(controller.signal);
      if (!controller.signal.aborted) setPingResults(result);
    } catch (cause) { if (!controller.signal.aborted) setPingError(cause instanceof Error ? cause.message : "Service pings could not be completed."); }
    finally { if (!controller.signal.aborted) setPinging(false); }
  }

  async function saveIncidentChange(action: string, url: string, init: RequestInit, onSuccess?: () => void) {
    const controller = lifecycleRef.current;
    if (!controller || controller.signal.aborted || mutationActiveRef.current || refreshing || refreshRequired) return;
    mutationActiveRef.current = true;
    setPendingAction(action); setError(""); setNotice("");
    let committed = false;
    try {
      await adminRequest(url, { ...init, signal: controller.signal });
      committed = true;
      if (controller.signal.aborted) return;
      onSuccess?.();
      setNotice(action === "create" ? "Incident created." : action.startsWith("resolve:") ? "Incident resolved." : "Incident deleted.");
      const result = await adminRequest<StatusData>("/api/admin/status", { signal: controller.signal });
      if (!controller.signal.aborted) { setServices(result.services); setIncidents(result.incidents); }
    } catch (cause) {
      if (!controller.signal.aborted && (committed || (cause instanceof AdminRequestError && cause.status >= 200 && cause.status < 300))) setRefreshRequired(true);
      if (!controller.signal.aborted) setError(committed ? "The change was saved, but the latest status data could not be loaded. Refresh the data before making another change." : cause instanceof Error ? cause.message : "The incident change could not be saved. Your entries are still here.");
    } finally {
      mutationActiveRef.current = false;
      if (!controller.signal.aborted) setPendingAction(null);
    }
  }

  const handleCreateIncident = async () => {
    const submitted = { ...incForm };
    if (!submitted.title.trim() || !submitted.serviceId) { setError("Select a service and enter an incident title."); return; }
    await saveIncidentChange("create", "/api/admin/status", {
      method: "POST", body: JSON.stringify({ type: "incident", ...submitted, title: submitted.title.trim() }),
    }, () => setIncForm((current) => JSON.stringify(current) === JSON.stringify(submitted) ? { title: "", message: "", severity: "minor", serviceId: "" } : current));
  };

  const handleResolve = (incident: Incident) => saveIncidentChange(`resolve:${incident.id}`, "/api/admin/status", {
    method: "PUT", body: JSON.stringify({ type: "incident", ...incident, status: "resolved", resolvedAt: new Date().toISOString() }),
  });

  const handleDeleteIncident = (id: string) => saveIncidentChange(`delete:${id}`, `/api/admin/status?${new URLSearchParams({ type: "incident", id })}`, { method: "DELETE" });

  if (loading) return <p role="status" className="text-white/30 text-xs">Loading status data...</p>;
  if (!loaded) return <div className="space-y-3 text-xs"><p role="alert" className="text-red-300">{error || "Service status is unavailable."}</p><button onClick={() => void refreshData()} disabled={refreshing} className={btnOutline}>{refreshing ? "Loading..." : "Retry loading status data"}</button></div>;

  const inputCls = "h-9 rounded-sm border border-white/10 bg-white/4 px-3 text-xs text-white outline-none placeholder-white/25 focus:border-[#ef4242] transition-colors";
  const activeIncidents = incidents.filter((i) => i.status !== "resolved");
  const resolvedIncidents = incidents.filter((i) => i.status === "resolved").slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div aria-live="polite">{notice && <p role="status" className="text-xs text-emerald-300">{notice}</p>}{pendingAction && <p role="status" className="text-xs text-white/50">Saving incident changes...</p>}</div>
        <button onClick={() => void refreshData()} disabled={refreshing || Boolean(pendingAction)} className={btnOutline}>{refreshing ? "Refreshing..." : "Refresh status data"}</button>
      </div>
      {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
      {refreshRequired && <p role="status" className="text-xs text-amber-300">Read-only: displayed data may be out of date. Refresh successfully to enable changes.</p>}
      {pingError && <p role="alert" className="text-xs text-amber-300">{pingError} Previous ping results may be out of date.</p>}
      <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-nord text-sm text-white">Services ({services.length})</p>
          <button onClick={runPings} disabled={pinging} className="text-[10px] text-white/40 hover:text-white/70 transition-colors disabled:opacity-40">
            {pinging ? "Pinging..." : "Refresh Pings"}
          </button>
        </div>
        <div className="space-y-1">
          {services.map((s) => {
            const hasIncident = activeIncidents.some((i) => i.serviceId === s.id);
            const ping = pingResults[s.id];
            const isDefunct = s.defunct;

            // Determine live status: incident > ping failure > operational
            let statusLabel: string;
            let statusCls: string;
            if (hasIncident) {
              statusLabel = "Incident";
              statusCls = "bg-red-500/20 text-red-400 border-red-500/20";
            } else if (isDefunct) {
              statusLabel = "Defunct";
              statusCls = "bg-white/5 text-white/30 border-white/10";
            } else if (ping && !ping.reachable) {
              statusLabel = "Unreachable";
              statusCls = "bg-orange-500/20 text-orange-400 border-orange-500/20";
            } else if (ping && ping.reachable) {
              statusLabel = "Operational";
              statusCls = "bg-green-500/20 text-green-400 border-green-500/20";
            } else if (!s.pingUrl) {
              statusLabel = hasIncident ? "Incident" : "No Ping URL";
              statusCls = hasIncident ? "bg-red-500/20 text-red-400 border-red-500/20" : "bg-white/5 text-white/25 border-white/10";
            } else {
              statusLabel = pinging ? "Pinging..." : "Unknown";
              statusCls = "bg-white/5 text-white/25 border-white/10";
            }

            return (
              <div key={s.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-sm bg-white/2 border border-white/5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-white/80 truncate">{s.name}</span>
                  {s.group && <span className="text-[10px] text-white/30">{s.group}</span>}
                  {ping?.latencyMs != null && (
                    <span className="text-[10px] text-white/20 tabular-nums">{ping.latencyMs}ms</span>
                  )}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-sm border shrink-0 ${statusCls}`}>{statusLabel}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
        <p className="font-nord text-sm text-white">Create Incident</p>
        <div className="flex flex-wrap gap-2 items-end">
          <select className={`${inputCls} w-48`} value={incForm.serviceId} onChange={(e) => setIncForm((f) => ({ ...f, serviceId: e.target.value }))}>
            <option value="">Select service...</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input className={`${inputCls} flex-1`} placeholder="Title" value={incForm.title} onChange={(e) => setIncForm((f) => ({ ...f, title: e.target.value }))} />
          <select className={`${inputCls} w-28`} value={incForm.severity} onChange={(e) => setIncForm((f) => ({ ...f, severity: e.target.value }))}>
            <option value="minor">Minor</option>
            <option value="major">Major</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <textarea
          className="w-full min-h-[60px] rounded-sm border border-white/10 bg-white/4 px-3 py-2 text-xs text-white outline-none placeholder-white/25 focus:border-[#ef4242] transition-colors resize-y"
          placeholder="Incident message..."
          value={incForm.message}
          onChange={(e) => setIncForm((f) => ({ ...f, message: e.target.value }))}
        />
        <button onClick={handleCreateIncident} disabled={Boolean(pendingAction) || refreshing || refreshRequired} className="h-9 px-4 text-xs tracking-widest uppercase bg-[#ef4242] text-white rounded-sm hover:bg-[#dd3030] transition-colors disabled:opacity-50">
          {saving ? "..." : "Create Incident"}
        </button>
      </div>

      {activeIncidents.length > 0 && (
        <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-3">
          <p className="font-nord text-sm text-white">Active Incidents ({activeIncidents.length})</p>
          {activeIncidents.map((inc) => (
            <div key={inc.id} className="flex items-start justify-between gap-3 px-3 py-3 rounded-sm bg-white/2 border border-white/5">
              <div>
                <div className="text-xs text-white/80 mb-1">{inc.title}</div>
                <div className="text-[11px] text-white/40">{inc.message}</div>
                <div className="text-[10px] text-white/25 mt-1">{services.find((s) => s.id === inc.serviceId)?.name} — {inc.severity} — {inc.status}</div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => void handleResolve(inc)} disabled={Boolean(pendingAction) || refreshing || refreshRequired} className="text-[10px] text-green-400 hover:text-green-300 disabled:opacity-40">{pendingAction === `resolve:${inc.id}` ? "Resolving..." : "Resolve"}</button>
                <button onClick={() => void handleDeleteIncident(inc.id)} disabled={Boolean(pendingAction) || refreshing || refreshRequired} className="text-[10px] text-red-400 hover:text-red-300 disabled:opacity-40">{pendingAction === `delete:${inc.id}` ? "Deleting..." : "Delete"}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {resolvedIncidents.length > 0 && (
        <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-3">
          <p className="font-nord text-sm text-white">Resolved ({resolvedIncidents.length})</p>
          {resolvedIncidents.map((inc) => (
            <div key={inc.id} className="flex items-start justify-between gap-3 px-3 py-2 rounded-sm bg-white/1 border border-white/3">
              <div>
                <div className="text-xs text-white/50">{inc.title}</div>
                <div className="text-[10px] text-white/25 mt-0.5">{services.find((s) => s.id === inc.serviceId)?.name} — {inc.resolvedAt ? new Date(inc.resolvedAt).toLocaleDateString() : ""}</div>
              </div>
              <button onClick={() => void handleDeleteIncident(inc.id)} disabled={Boolean(pendingAction) || refreshing || refreshRequired} className="text-[10px] text-red-400/50 hover:text-red-300 shrink-0 disabled:opacity-40">{pendingAction === `delete:${inc.id}` ? "Deleting..." : "Delete"}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

