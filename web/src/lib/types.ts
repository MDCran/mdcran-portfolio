// ─── Pricing ──────────────────────────────────────────────
export type ProjectStatus = "free" | "for_sale" | "unavailable";

export interface ProjectPricing {
  status: ProjectStatus;
  price?: number;           // USD cents e.g. 999 = $9.99
  stripeProductId?: string;
  downloadUrl?: string;
  checkoutUrl?: string;     // direct checkout/payment link for for_sale items
}

// ─── Social Platforms ─────────────────────────────────────
export type Platform =
  | "youtube" | "twitch" | "tiktok" | "instagram" | "facebook"
  | "x" | "github" | "website" | "spotify" | "discord" | "other";

export interface SocialLink {
  platform: Platform;
  url: string;
  handle?: string;
  title?: string;
  channelId?: string; // for YouTube API queries
  userId?: string;    // for other platform API queries
}

// ─── API metrics ──────────────────────────────────────────
export interface PlatformMetric {
  platform: Platform;
  count: number;
  label: string;
  lastUpdated?: string;
}

export interface ClientMetrics {
  totalFollowers: number;
  totalViews: number;
  platforms: PlatformMetric[];
  lastUpdated: string;
}

// ─── Client ──────────────────────────────────────────────
export interface ClientQuote {
  text: string;
  context?: string; // e.g. "On the Monopoly Map project"
}

export interface Client {
  id: string;
  name: string;
  avatarUrl?: string;
  bannerUrl?: string;
  roles: string[];
  bio?: string;
  quote?: ClientQuote;
  socialLinks: SocialLink[];
  featured?: boolean;
  location?: string;
  // Follower/view counts stored in DB (admin editable; fetched from APIs when keys present)
  followerCount?: number;
  viewCount?: number;
  // When true, treated as an employer (badge + /employers/[id] route)
  isEmployer?: boolean;
}

// ─── Video ───────────────────────────────────────────────
export interface Video {
  youtubeId: string;
  title: string;
  channelName?: string;
  publishDate?: string;
  viewCount?: number;
  thumbnailUrl?: string;
}

export interface ImageAsset {
  src: string;
  alt?: string;
}

// ─── Project Credits ──────────────────────────────────────
export interface ProjectCredit {
  name: string;
  role: string;          // e.g. "Builder", "Designer", "Writer"
  isMe?: boolean;
  profileUrl?: string;
}

// ─── Project ─────────────────────────────────────────────
export type Category =
  | "arts-and-entertainment"
  | "motion-and-graphics"
  | "coding-projects"
  | "press"
  | "publications"
  | "software";

// A project can belong to multiple categories (e.g. CoreTV is coding-projects + web-design)
export type Subcategory =
  | "minecraft-maps"
  | "events"
  | "thumbnail-design"
  | "graphic-design"
  | "video-editing"
  | "web-dev-design"
  | "articles-and-docs"
  | "storyline-writing"
  | "script-writing"
  | "resource-packs"
  | "coding";

export interface Project {
  id: string;
  slug: string;
  title: string;
  description?: string;
  longDescription?: string;
  category: Category;
  subcategory?: Subcategory;
  // Multi-category support (e.g. CoreTV = coding + web-design)
  extraCategories?: Category[];
  extraSubcategories?: Subcategory[];
  coverImage?: string | ImageAsset;
  images?: (string | ImageAsset)[];
  clientIds?: string[];
  publisherId?: string;   // company that published/contracted the work
  credits?: ProjectCredit[];
  videos?: Video[];
  tags?: string[];
  publishDate?: string;   // format: "MM-YYYY" or "MM-DD-YYYY"
  pricing: ProjectPricing;
  featured?: boolean;
  visible?: boolean;      // defaults to true; set false to hide from public site
  liveUrl?: string;
  externalUrl?: string;   // Army Reserve article link, etc.
  githubUrl?: string;     // optional link to GitHub repository
  sections?: ArticleSection[];
}

// ─── Company / Experience ─────────────────────────────────
export type ExperienceType = "job" | "volunteer" | "renowned";

export interface Experience {
  id: string;
  type: ExperienceType;
  companyName: string;
  companyLogo?: string;
  companyUrl?: string;
  role: string;
  startDate: string;  // "MM-YYYY"
  endDate?: string;   // "MM-YYYY" or undefined if current
  current?: boolean;
  location?: string;
  description: string;
  highlights?: string[];
  clientIds?: string[];  // clients worked with during this role (logos shown under description)
  projectIds?: string[]; // projects created during this role
  timelineTags?: { label: string; color: "red" | "orange" | "green" | "blue" | "purple" }[];
}

// ─── Skills ───────────────────────────────────────────────
export type SkillCategory = string;

export interface Skill {
  name: string;
  category: SkillCategory;
  icon?: string;
}

// Metadata for a skill category (label + icon), ordered for display.
export interface SkillCategoryMeta {
  id: string;     // stable id matching Skill.category
  label: string;  // display label
  icon?: string;  // lucide icon name from the shared registry
}

// ─── Resume profile (editable personal/contact info) ──────
export interface ResumeProfile {
  fullName: string;
  title: string;
  location: string;
  email: string;
  linkedinUrl: string;
  githubUrl: string;
  pdfUrl: string;   // uploaded resume PDF (R2 url) — Download button hidden when empty
  sectionOrder?: string[]; // order of the resume's main-column sections
}

export const RESUME_SECTIONS = ["experience", "featured", "education", "volunteer"] as const;
export const RESUME_SECTION_LABELS: Record<string, string> = {
  experience: "Work Experience",
  featured: "Featured Work",
  education: "Education",
  volunteer: "Volunteer",
};

// ─── Certification ────────────────────────────────────────
export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issuerLogo?: string;       // logo
  date: string;              // "MM-YYYY" — issued
  expiryDate?: string;       // expires
  credentialUrl?: string;    // verification url
  credentialId?: string;     // credential id
  description?: string;
}

// ─── Award ───────────────────────────────────────────────
export interface Award {
  id: string;
  name: string;
  issuer?: string;
  issuerUrl?: string;        // link
  date: string;              // "MM-YYYY" — received date
  description?: string;
  logo?: string;             // icon / logo / badge
  requirements?: string[];   // requirements bullets
}

// ─── Club / Organization ──────────────────────────────────
export interface ClubMembership {
  id: string;
  name: string;
  logo?: string;
  role?: string;             // role / status
  startDate?: string;        // "MM-YYYY"
  endDate?: string;          // "MM-YYYY"
  description?: string;
  url?: string;              // website
}

// ─── Education ────────────────────────────────────────────
// Degree levels offered in the admin program editor (free-text fallback allowed).
export const DEGREE_LEVELS = [
  "None",
  "High School Diploma",
  "Certificate",
  "Associate of Arts",
  "Associate of Science",
  "Bachelor of Science",
  "Bachelor of Arts",
  "Bachelor of Fine Arts",
  "Bachelor of Business Administration",
  "Master of Arts",
  "Master of Science",
  "Master of Fine Arts",
  "Master of Business Administration",
  "Doctor of Philosophy",
  "Doctor of Medicine",
  "Juris Doctor",
  "Doctor of Education",
] as const;

export interface EducationProgram {
  id: string;
  name: string;              // program name
  degreeLevel?: string;      // one of DEGREE_LEVELS (or custom)
  field?: string;            // field of study
  description?: string;
  startDate?: string;        // "MM-YYYY"
  endDate?: string;          // "MM-YYYY"
  logo?: string;             // program logo
}

export interface Education {
  id: string;
  institution: string;
  institutionLogo?: string;  // logo
  degree: string;            // kept for backward-compat / summary
  field?: string;
  startDate: string;         // "MM-YYYY"
  endDate?: string;          // "MM-YYYY"
  current?: boolean;
  location?: string;
  gpa?: string;
  description?: string;       // markdown supported
  highlights?: string[];      // bullet point list
  url?: string;               // website
  programs?: EducationProgram[];
  linkedAwardIds?: string[];  // awards tied to this education
  linkedClubIds?: string[];   // organizations tied to this education
}

// ─── Subscribe / Campaign ─────────────────────────────────
export interface SubscribePayload {
  email?: string;
  phone?: string;
  name?: string;
  consent: boolean;
}

// ─── API Summary ──────────────────────────────────────────
export interface MetricsSummary {
  totalProjectViews: number;
  totalFollowers: number;
  clientCount: number;
  projectCount: number;
  yearsActive: number;
  lastUpdated: string;
}

// ─── Spotify ──────────────────────────────────────────────
export interface SpotifyHistoryTrack {
  isPlaying: boolean;
  title?: string;
  artist?: string;
  albumArt?: string;
  albumName?: string;
  songUrl?: string;
  progressMs?: number;
  durationMs?: number;
  playedAt: string;
}

export interface SpotifyTrack {
  isPlaying: boolean;
  title?: string;
  artist?: string;
  albumArt?: string;
  albumName?: string;
  songUrl?: string;
  progressMs?: number;
  durationMs?: number;
  playedAt?: string;
  history?: SpotifyHistoryTrack[];
}

// ─── Bible Verse ─────────────────────────────────────────
export interface BibleVerse {
  reference: string;
  text: string;
  translation?: string;
}

// ─── Article Tags ─────────────────────────────────────────
export interface ArticleTag {
  id: string;
  name: string;
  color?: string;       // hex color, optional (auto-picked if absent)
}

// ─── Articles ─────────────────────────────────────────────
export type ArticleCategory =
  | "press"
  | "recipe"
  | "tech"
  | "personal"
  | "tutorial"
  | "announcement";

export type ArticleSectionType =
  | "text"
  | "image"
  | "gallery"
  | "video"
  | "quote"
  | "code"
  | "divider"
  | "checklist"
  | "ingredient-list"
  | "steps"
  | "store-checklist"
  | "info-block"
  | "before-after"
  | "button"
  | "pdf";

export interface ImageTag {
  id: string;
  x: number;           // 0–100 (% of image width)
  y: number;           // 0–100 (% of image height)
  label: string;
  link?: string;       // optional URL the tag links to
}

export interface ArticleSection {
  type: ArticleSectionType;
  content?: string;    // markdown text / code / quote text / button URL
  caption?: string;
  src?: string;        // single image or PDF src
  images?: (string | ImageAsset)[];   // gallery images
  imageTags?: ImageTag[];             // positioned tags for a single image
  galleryTags?: ImageTag[][];         // positioned tags per gallery image (indexed)
  youtubeId?: string;  // embedded video
  language?: string;   // code block language
  alt?: string;
  // For checklist / ingredient-list / steps / store-checklist
  items?: string[];
  // For info-block (cook time, preheat temp, etc.)
  label?: string;
  value?: string;
  // For before-after comparison slider
  beforeImage?: string | ImageAsset;
  afterImage?: string | ImageAsset;
  // For pdf viewer dimensions
  pdfWidth?: string;   // e.g. "100%" or "800px"
  pdfHeight?: string;  // e.g. "600px" or "800px"
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage?: string | ImageAsset;
  author: string;
  authorProfilePic?: string;   // settable per article, defaults to AI_MDCRAN_BLUE
  publishDate: string;         // "YYYY-MM-DD"
  updatedDate?: string;
  tags: string[];
  category: ArticleCategory;
  sections: ArticleSection[];
  featured?: boolean;          // featured on articles page (only 1 at a time)
  homeFeatured?: boolean;      // featured on home page (multiple allowed)
  visible?: boolean;           // defaults to true; set false to hide from public site
  tapCount?: number;           // stored in MongoDB, shown to all visitors
}

// ─── Contact Submission ───────────────────────────────────
export interface ContactSubmission {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  subject?: string;
  message: string;
  source?: string;
  subscribed: boolean;
  createdAt: string; // ISO string
  updatedAt?: string;
  submissionKey?: string;
  messageRead?: boolean;
  messageReadAt?: string;
  // Cross-device identity tie (set on contact-form submissions)
  serial?: string;
  ip?: string | null;
  identityId?: string | null;
  country?: string | null;
  utmSource?: string | null;
  referrerDomain?: string | null;
}

export interface RateLimitRecord {
  id: string;
  scope: "contact-form" | "subscribe-form";
  ip?: string;
  browser?: string;
  userAgent?: string;
  city?: string;
  region?: string;
  country?: string;
  count: number;
  blockedCount: number;
  limit: number;
  browserLocked?: boolean;
  firstSeenAt: string;
  lastAttemptAt: string;
  lastBlockedAt?: string;
  notes?: string;
}

export type CampaignType = "email" | "sms";

export type CampaignStatus = "draft" | "sent" | "scheduled";

export interface CampaignDeliveryLogEntry {
  contactId: string;
  deliveredAt: string;
}

export interface Campaign {
  id: string;
  type: CampaignType;
  subject?: string;
  message: string;
  status: CampaignStatus;
  recipients: number;
  recipientMode: "all" | "specific";
  contactIds?: string[];
  attachments?: string[];
  bodySource?: "text" | "html";
  htmlBody?: string;
  htmlFileName?: string;
  scheduledFor?: string;
  sentAt?: string;
  deliveredContactIds?: string[];
  deliveryLog?: CampaignDeliveryLogEntry[];
  lastError?: string;
  createdAt: string;
  updatedAt?: string;
}

export type RizzDateIdea =
  | "fancy-dinner-date"
  | "spontaneous-adventure"
  | "food-and-walking"
  | "coffee-and-talking"
  | "surprise-me";

export type RizzVibe =
  | "chill-and-cozy"
  | "fun-and-chaotic"
  | "romantic-and-cute"
  | "adventurous";

export type RizzActivity =
  | "ice-cream-date"
  | "night-drive"
  | "movie-night"
  | "arcade"
  | "disney-fireworks"
  | "surprise-me";

export type RizzWinOver =
  | "food"
  | "attention"
  | "effort"
  | "making-me-laugh"
  | "being-sweet"
  | "consistency"
  | "touch"
  | "other";

export interface RizzSubmission {
  id: string;
  name: string;
  nickname: string;
  phone: string;
  dateIdeas: RizzDateIdea[];
  vibes: RizzVibe[];
  activities: RizzActivity[];
  winOvers: RizzWinOver[];
  dateIdea?: RizzDateIdea;
  vibe?: RizzVibe;
  activity?: RizzActivity;
  winOver?: RizzWinOver;
  winOverOther?: string;
  createdAt: string;
  // Cross-device identity tie
  serial?: string;
  ip?: string | null;
  identityId?: string | null;
}

// ─── Status Page ─────────────────────────────────────────
export type ServiceStatus = "operational" | "partial_outage" | "major_outage";
export type IncidentStatus = "investigating" | "identified" | "monitoring" | "resolved";
export type IncidentSeverity = "minor" | "major" | "critical";

export interface StatusService {
  id: string;
  name: string;
  group?: string;
  sortOrder: number;
  pingUrl?: string;
  defunct?: boolean;
  createdAt: string;
}

export interface StatusIncident {
  id: string;
  serviceId: string;
  title: string;
  message: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  startedAt: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DailyStatus {
  date: string;
  status: ServiceStatus;
  incidents: number;
}

export interface StatusServiceWithHealth extends StatusService {
  currentStatus: ServiceStatus;
  uptimePercent90d: number;
  dailyStatus: DailyStatus[];
  latencyMs?: number | null;   // live ping latency (null = unreachable / not pinged)
  liveChecked?: boolean;       // true when status reflects a live ping this request
}

// ─── Visitor Adjustments ──────────────────────────────────
export interface VisitorAdjustment {
  id: string;
  country: string;
  countryName: string;
  addedCount: number;
  createdAt: string;
}

// ─── Tracking ─────────────────────────────────────────────
export interface TapRecord {
  id: string;       // project or article id
  type: "project" | "article";
  count: number;
}

export interface DownloadRecord {
  id: string;       // project id
  count: number;
}

// ─── Asset ────────────────────────────────────────────────
export interface Asset {
  id: string;
  filename: string;
  url: string;          // public URL path (e.g. /cdn/WEB_ASSETS/PROJECTS/foo.png)
  mimeType: string;
  size?: number;        // bytes
  uploadedAt: string;   // ISO string
  tags?: string[];      // categorization
}

// ─── Settings ─────────────────────────────────────────────
export interface SiteSettings {
  id: string;
  heroImages?: string[];      // DB-driven hero images admin can set
  featuredProjectIds?: string[];
  featuredClientIds?: string[];
  featuredArticleId?: string;
}

export interface SiteContentLinkCard {
  title: string;
  description: string;
  href: string;
  count?: string;
  items?: string[];
}

export interface SiteContentPageBlock {
  eyebrow: string;
  title: string;
  description: string;
  cards?: SiteContentLinkCard[];
}

export interface SiteContentActionLink {
  label: string;
  href: string;
}

export interface SiteContentHero {
  eyebrow: string;
  titlePrimary: string;
  titleAccent: string;
  description: string;
  supportingText: string;
  locationText: string;
  serviceTags: SiteContentActionLink[];
  primaryCta: SiteContentActionLink;
  secondaryCta: SiteContentActionLink;
  tertiaryCta: SiteContentActionLink;
}

export interface SiteContentAbout {
  eyebrow: string;
  title: string;
  description: string;
  supportingText: string;
  tags: string[];
  images: ImageAsset[];
}

export interface SiteContentSectionIntro {
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export interface SiteContentStatMetric {
  key: string;          // matches the live metric key (totalFollowers, totalProjectViews, totalProjects, yearsActive)
  label: string;
  description: string;
}

export interface SiteContentStats {
  eyebrow: string;
  metrics: SiteContentStatMetric[];
}

export interface SiteContentAiUsageModel {
  name: string;
  percent: number;
  inputTokens?: number;
  outputTokens?: number;
}

export interface SiteContentAiUsage {
  lastUpdated: string;              // ISO date — set when the admin updates the numbers each month
  claude: {
    totalTokens: number;
    totalMessages: number;
    peakHour: string;               // e.g. "1 AM"
    favoriteModel: string;
    models: SiteContentAiUsageModel[];
  };
  openai: {
    totalTokens: number;
    totalRequests: number;
  };
  elevenlabs: {
    charactersUsed: number;         // 0 = not yet set by admin, renders as "—"
    charactersQuota?: number;
  };
}

export interface SiteContentBanner {
  enabled: boolean;
  message: string;
  icon?: string;                       // lucide icon name from the shared registry
  bgColor: string;                     // hex background
  textColor: string;                   // hex text/icon color
  align: "left" | "center" | "right";
  ctaLabel?: string;
  ctaHref?: string;
  startsAt?: string;                   // ISO datetime — show from (optional)
  endsAt?: string;                     // ISO datetime — stop showing (optional)
}

export interface SiteContentFooterLinkGroup {
  title: string;
  links: SiteContentActionLink[];
}

export interface SiteContentFooter {
  locationText: string;
  statusLabel: string;
  emailHref: string;
  githubHref: string;
  blurb: string;
  linkGroups: SiteContentFooterLinkGroup[];
  bottomLinks: SiteContentActionLink[];
  copyrightText: string;
}

export interface SiteContentPageHeaders {
  publications: Omit<SiteContentPageBlock, "cards">;
  articles: Omit<SiteContentPageBlock, "cards">;
  contact: Omit<SiteContentPageBlock, "cards">;
  resume: Omit<SiteContentPageBlock, "cards">;
  subscribe: Omit<SiteContentPageBlock, "cards">;
  unsubscribe: Omit<SiteContentPageBlock, "cards">;
  minecraftMaps: Omit<SiteContentPageBlock, "cards">;
  events: Omit<SiteContentPageBlock, "cards">;
  thumbnailDesign: Omit<SiteContentPageBlock, "cards">;
  videoEditing: Omit<SiteContentPageBlock, "cards">;
  webDevDesign: Omit<SiteContentPageBlock, "cards">;
}

export interface SiteContentLegalSection {
  heading: string;
  body: string;
  bullets?: string[];
}

export interface SiteContentLegalPage {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  sections: SiteContentLegalSection[];
}

export interface SiteContent {
  id: string;
  brandLogoUrl: string;
  faviconUrl: string;
  homeSectionOrder: string[];
  featuredProjectIds: string[];   // ordered list of project IDs shown on home page
  featuredArticleIds: string[];   // ordered list of article IDs shown on home page
  featuredWorkOrder: string[];    // unified order of project + article IDs for featured work section
  featuredClientIds: string[];    // ordered list of client IDs shown on home page
  announcementBanner: SiteContentBanner;
  homeHero: SiteContentHero;
  homeAbout: SiteContentAbout;
  homeStats: SiteContentStats;
  aiUsageTracker: SiteContentAiUsage;
  homeTimeline: SiteContentSectionIntro;
  homeServices: SiteContentPageBlock;
  homeFeaturedWork: SiteContentSectionIntro;
  homeClients: SiteContentSectionIntro;
  homeVisitorMap: SiteContentSectionIntro;
  homeCta: SiteContentSectionIntro;
  artsAndEntertainment: SiteContentPageBlock;
  motionAndGraphics: SiteContentPageBlock;
  workPage: SiteContentPageBlock;
  codePage: Omit<SiteContentPageBlock, "cards">;
  pageHeaders: SiteContentPageHeaders;
  footer: SiteContentFooter;
  termsPage: SiteContentLegalPage;
  privacyPage: SiteContentLegalPage;
  rizzTargetName?: string;  // personalize /rizz page with a name
  rizzEnabled?: boolean;    // when false, /rizz returns 404
  barEnabled?: boolean;     // when false, /bar returns 404
  barCategories?: BarDrinkCategory[]; // the drink roulette wheel content
}

/** A category of drinks on the /bar roulette wheel. */
export interface BarDrinkCategory {
  id: string;
  name: string;
  color: string;        // hex used for the wheel segments
  description: string;  // shown when a drink from this category is landed on
  options: string[];    // individual drinks (each becomes a wheel segment)
  recipes?: Record<string, string>; // per-drink recipe shown after spin (keyed by option name)
}

// ─── Personal Identity (device fingerprinting) ────────────
export interface IdentityDevice {
  serial: string;          // stable device fingerprint hash
  ip?: string | null;
  browser?: string;
  os?: string;
  device?: string;         // desktop | mobile | tablet
  gpu?: string;            // WebGL renderer
  screen?: string;         // e.g. "1920x1080@2"
  timezone?: string;
  language?: string;
  userAgent?: string;
  /** How this device became linked to its identity (cross-device engine). */
  linkMethod?: LinkMethod;
  /** 0-1 confidence in the link (1 = deterministic / QR / manual). */
  linkConfidence?: number;
  firstSeen: string;
  lastSeen: string;
}

export interface Identity {
  id: string;
  name: string;
  devices: IdentityDevice[];
  createdAt: string;
  updatedAt: string;
  /** Pre-created by the admin (e.g. to hand out a tracking link). Exempt from the
   *  empty-identity cleanup so it survives until someone claims it via the link. */
  createdByAdmin?: boolean;
  /** Auto-created for an unnamed visitor so EVERY visitor ties to an identity for
   *  tracking. Name is an auto-label ("Anonymous · LinkedIn · Orlando"); cleared
   *  to a real name (and flag dropped) on claim/confirm/provide/handshake. */
  anonymous?: boolean;
}

// ─── Meeting booking ──────────────────────────────────────
export interface BookingMeetingType {
  id: string;
  name: string;                 // "Consultation"
  description?: string;
  location: string;             // "Google Meet" | "Zoom" | "In-Person" | custom
  durations: number[];          // minutes, e.g. [30, 60]
  enabled: boolean;
}

export interface BookingDayHours {
  enabled: boolean;             // is this weekday bookable
  start: string;                // "09:00" (24h, business timezone)
  end: string;                  // "17:00"
}

export interface BookingBlackout {
  start: string;                // "YYYY-MM-DD" inclusive
  end: string;                  // "YYYY-MM-DD" inclusive
  label?: string;
}

export interface BookingConfig {
  enabled: boolean;
  icalUrl: string;              // private/public .ics feed (admin-only, never sent to clients)
  timezone: string;             // IANA, e.g. "America/New_York"
  hours: BookingDayHours[];     // length 7, indexed by Date.getDay() (0 = Sunday)
  blockHolidays: boolean;       // block US federal holidays
  minNoticeDays: number;        // earliest bookable day = today + this many days
  maxAdvanceDays: number;       // latest bookable day = today + this many days
  maxPerDay: number;            // max site-booked meetings per day
  bufferMinutes: number;        // min gap between meetings
  slotIntervalMinutes: number;  // slot granularity (e.g. 30)
  blackouts: BookingBlackout[]; // vacation / unavailable ranges
  meetingTypes: BookingMeetingType[];
}

export interface BookingRecord {
  id: string;
  typeId: string;
  typeName: string;
  durationMinutes: number;
  location: string;
  start: string;                // ISO (UTC)
  end: string;                  // ISO (UTC)
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message?: string;
  createdAt: string;            // ISO
  status: "confirmed" | "cancelled";
  // Cross-device identity tie
  serial?: string;
  ip?: string | null;
  identityId?: string | null;
}

// ─── Traffic Source / Referrer Tracking ──────────────────────────────────────
export type TrafficSourceId =
  | 'linkedin' | 'handshake' | 'indeed' | 'ziprecruiter' | 'glassdoor'
  | 'discord' | 'google' | 'github' | 'twitter' | 'instagram'
  | 'sms' | 'email' | 'direct' | 'other';

export interface ReferrerContext {
  resolvedSource: TrafficSourceId;
  resolvedSourceLabel: string;   // e.g. "LinkedIn", "Indeed", "Direct"
  referrerRaw: string;            // raw document.referrer
  referrerDomain: string;         // e.g. "linkedin.com"
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  capturedAt: string;             // ISO timestamp of first capture
}

// ─── AI Routing Conditions ────────────────────────────────────────────────
export type ConditionField = 'source' | 'referrer_domain' | 'utm_source' | 'utm_campaign' | 'utm_medium';
// 'is_any_of' matches when the field equals ANY value in triggerValues (e.g. linkedin OR handshake OR indeed in one rule).
export type ConditionOperator = 'equals' | 'includes' | 'starts_with' | 'not_equals' | 'is_any_of';
export type GuardrailField = 'current_page';

export interface AiRoutingCondition {
  id: string;
  name: string;                    // admin-facing label
  triggerField: ConditionField;
  triggerOperator: ConditionOperator;
  triggerValue: string;            // single value (equals/includes/starts_with/not_equals)
  triggerValues?: string[];        // multiple values for 'is_any_of'
  // Optional guardrail: "only fire if current page != /resume"
  guardrailField?: GuardrailField;
  guardrailOperator?: ConditionOperator;
  guardrailValue?: string;
  // Raw suggestion text the admin types — AI rephrases it naturally
  suggestionText: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── UTM Links (saved, reusable tracking links) ───────────────────────────
export interface UtmLink {
  id: string;
  label: string;            // admin-facing name, e.g. "LinkedIn — Spring outreach"
  baseUrl: string;          // e.g. "https://mdcran.com/resume"
  source: string;           // utm_source
  medium: string;           // utm_medium
  campaign: string;         // utm_campaign
  term?: string;            // utm_term
  content?: string;         // utm_content
  url: string;              // fully built URL (cached for copy)
  createdAt: string;
  updatedAt: string;
}

// ─── Identity Verification States ────────────────────────────────────────
export type IdentityVerificationState = 'anonymous' | 'suggested' | 'confirmed' | 'denied';

export interface SessionIdentityContext {
  state: IdentityVerificationState;
  suggestedIdentityId?: string;
  suggestedIdentityName?: string;
  suggestedCertainty?: number;    // 0-1 confidence
  confirmedIdentityId?: string;
  confirmedName?: string;
  /** confirmedName is a high-confidence GUESS (auto-set), not user-confirmed —
   *  the AI should use it lightly. */
  autoNamed?: boolean;
  deniedIdentityIds: string[];   // identity IDs explicitly denied by this device
  /** Top probabilistic cross-device link candidate for this device (for AI probing). */
  linkCandidate?: SessionLinkCandidate;
}

/** Lightweight cross-device candidate shipped to the client / AI for graceful probing. */
export interface SessionLinkCandidate {
  /** The OTHER device serial that scored against this one. */
  otherSerial: string;
  /** Name on the other device's identity, if it has one. */
  otherName?: string | null;
  score: number;                  // 0-100
  /** Deep-link path both devices touched (e.g. "/projects/mercury"). */
  sharedPath?: string | null;
  criteria: string[];
}

// ─── Cross-Device Identity Resolution Engine ──────────────────────────────────
/** How a device became linked to an identity. */
export type LinkMethod =
  | 'serial'      // exact fingerprint match on an existing identity
  | 'token'       // recycler token (uid / admin ?identity= link)
  | 'ip'          // accepted same-IP household suggestion
  | 'handshake'   // deterministic QR "Scan to Mobile" bridge (100% certain)
  | 'manual'      // admin attached / merged
  | 'merge'       // folded in via identity merge
  | 'candidate';  // confirmed probabilistic candidate

export interface DeviceRecentPath {
  path: string;
  dwellMs: number;     // time-on-page for this path
  ts: string;          // ISO
}

/** One network a device has been seen on (for cross-network name suggestions). */
export interface DeviceNetwork {
  subnet24: string;        // /24 (IPv4) or /48 (IPv6)
  ip?: string | null;
  asn?: string | null;
  firstSeen: string;       // ISO
  lastSeen: string;        // ISO
}

/**
 * Canonical per-device telemetry registry (keyed by fingerprint serial).
 * Exists even for ANONYMOUS devices (no identity yet) so two unlinked devices
 * can be scored against each other. Complements identities.devices[] (which
 * stays the authoritative identity↔device link map).
 */
export interface DeviceRecord {
  serial: string;                          // primary key
  identityId: string | null;               // synced when the device is linked
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';
  browser?: string;
  os?: string;
  gpu?: string;
  screen?: string;
  timezone?: string;
  language?: string;
  colorScheme?: 'dark' | 'light' | null;   // prefers-color-scheme (hardware parity)
  userAgent?: string;
  ip?: string | null;
  ipHash?: string | null;
  subnet24?: string | null;                // IPv4 /24 ("203.0.113") or IPv6 /48
  asn?: string | null;                     // e.g. "AS15169"
  asnName?: string | null;                 // e.g. "GOOGLE"
  country?: string | null;
  recentPaths?: DeviceRecentPath[];        // capped FIFO of deep-link dwell
  /** Networks this device has loaded the site on (deduped by subnet, capped).
   *  Powers off-network name suggestions: a phone keeps suggesting a name from a
   *  WiFi it was on days ago, even while currently on cellular. */
  networks?: DeviceNetwork[];
  sessionCount?: number;
  firstSeen: string;                       // ISO
  lastSeen: string;                        // ISO
  createdAt: string;
  updatedAt: string;
}

export type DeviceLinkState = 'SUSPECTED' | 'CONFIRMED' | 'REJECTED';

export interface DeviceLinkBreakdown {
  network: number;     // 0-40
  time: number;        // 0-30
  behavior: number;    // 0-20
  hardware: number;    // 0-10
}

/**
 * Probabilistic safety buffer. A score >= 50 writes a SUSPECTED row here — it is
 * NEVER auto-merged into identities. Confirmation happens deterministically (QR),
 * or via the admin / an AI-led probe the user accepts.
 */
export interface DeviceLinkCandidate {
  id: string;
  pairKey: string;                 // sorted "serialA|serialB" — unique per pair
  sourceSerial: string;            // device that triggered the evaluation
  targetSerial: string;            // matched candidate device
  sourceIdentityId?: string | null;
  targetIdentityId?: string | null;
  sourceName?: string | null;
  targetName?: string | null;
  confidenceScore: number;         // 0-100
  breakdown: DeviceLinkBreakdown;
  criteria: string[];              // human-readable matched signals
  sharedPath?: string | null;      // deep-link both devices touched
  state: DeviceLinkState;
  rejectionCount?: number;         // decays future re-suggestion weight
  resolvedBy?: 'auto' | 'admin' | 'ai';  // who confirmed/rejected it
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  rejectedAt?: string;
}

/** Self-management policy for the cross-device candidate queue: high-confidence
 *  pairs auto-link, weak/stale ones auto-reject, so the admin doesn't have to
 *  hand-manage every candidate (they can still override per-candidate). */
export interface CrossDeviceAutoConfig {
  enabled: boolean;
  autoConfirmScore: number;     // >= this confidence (0-100) auto-confirms + links
  autoRejectStaleDays: number;  // SUSPECTED older than this (and below autoConfirmScore) auto-rejects
}

export type HandshakeStatus = 'PENDING' | 'CLAIMED' | 'EXPIRED';

/** Transient deterministic-bridge token encoded into the "Scan to Mobile" QR. */
export interface HandshakeBridge {
  id: string;                      // handshakeId (the QR payload)
  sourceSerial: string;
  sourceIdentityId?: string | null;
  sourceName?: string | null;
  status: HandshakeStatus;
  createdAt: string;
  expiresAt: string;
  claimedAt?: string;
  claimedSerial?: string | null;
  claimedIp?: string | null;
}

export type AiChannel = 'text' | 'voice';

/** Header for a logged AI conversation (text or voice). */
export interface AiConversation {
  id: string;
  sessionId: string;               // per-chat-open uuid from the client
  serial: string | null;           // device serial
  identityId: string | null;       // resolved at log time, if known
  channel: AiChannel;
  currentPage?: string | null;
  messageCount: number;
  startedAt: string;
  lastAt: string;
  ip?: string | null;
  country?: string | null;
}

/** A single AI conversation message (user or assistant), markers stripped. */
export interface AiMessage {
  id: string;
  conversationId: string;
  sessionId: string;
  serial: string | null;
  identityId: string | null;
  channel: AiChannel;
  role: 'user' | 'assistant';
  content: string;
  currentPage?: string | null;
  createdAt: string;
}
