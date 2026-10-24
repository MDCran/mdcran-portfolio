/** Shared navigation metadata for the admin shell and route validation. */
export const adminSectionTitles = {
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
  } as const;

export type AdminSection = keyof typeof adminSectionTitles;

export const adminSectionDescriptions: Record<AdminSection, string> = {
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

export const adminNavigationGroups: readonly {label: string; items: readonly AdminSection[]}[] = [
  {
    "label": "Overview",
    "items": [
      "dashboard"
    ]
  },
  {
    "label": "Content & portfolio",
    "items": [
      "content-studio",
      "projects",
      "articles",
      "clients",
      "resume",
      "site-content",
      "r2-assets",
      "content-health",
      "publishing"
    ]
  },
  {
    "label": "Messages & meetings",
    "items": [
      "contact-form-entries",
      "contacts",
      "campaigns",
      "booking"
    ]
  },
  {
    "label": "Audience & insights",
    "items": [
      "analytics",
      "visitors",
      "sessions",
      "identities",
      "crossdevice"
    ]
  },
  {
    "label": "Assistant & experiences",
    "items": [
      "ai",
      "traffic",
      "rizz",
      "bar"
    ]
  },
  {
    "label": "System & integrations",
    "items": [
      "operations",
      "status",
      "rate-limits",
      "database",
      "discord"
    ]
  }
];

export const adminNavigationItems = adminNavigationGroups.flatMap(group =>
  group.items.map(key => ({ key, label: adminSectionTitles[key], group: group.label, description: adminSectionDescriptions[key] }))
);

export function isAdminSection(value: string): value is AdminSection {
  return Object.hasOwn(adminSectionTitles, value);
}

export function adminSectionPath(section: AdminSection) {
  return section === 'dashboard' ? '/admin/dashboard' : `/admin/dashboard/${section}`;
}

/** Prefer supported legacy hashes, then the routed workspace path. */
export function adminSectionFromLocation(pathname: string, hash = ''): AdminSection {
  const legacy = hash.replace(/^#/, '');
  if (isAdminSection(legacy)) return legacy;
  const route = pathname.replace(/\/$/, '').split('/')[3] ?? 'dashboard';
  return isAdminSection(route) ? route : 'dashboard';
}
