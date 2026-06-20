import type { TrafficSourceId, ReferrerContext } from './types';

const DOMAIN_SOURCE_MAP: Record<string, { id: TrafficSourceId; label: string }> = {
  'linkedin.com': { id: 'linkedin', label: 'LinkedIn' },
  'lnkd.in': { id: 'linkedin', label: 'LinkedIn' },
  'handshake.com': { id: 'handshake', label: 'Handshake' },
  'app.joinhandshake.com': { id: 'handshake', label: 'Handshake' },
  'indeed.com': { id: 'indeed', label: 'Indeed' },
  'ziprecruiter.com': { id: 'ziprecruiter', label: 'ZipRecruiter' },
  'glassdoor.com': { id: 'glassdoor', label: 'Glassdoor' },
  'discord.com': { id: 'discord', label: 'Discord' },
  'discord.gg': { id: 'discord', label: 'Discord' },
  'google.com': { id: 'google', label: 'Google Search' },
  'google.co.uk': { id: 'google', label: 'Google Search' },
  'bing.com': { id: 'google', label: 'Bing Search' },
  'github.com': { id: 'github', label: 'GitHub' },
  'twitter.com': { id: 'twitter', label: 'Twitter/X' },
  'x.com': { id: 'twitter', label: 'Twitter/X' },
  'instagram.com': { id: 'instagram', label: 'Instagram' },
};

const UTM_SOURCE_MAP: Record<string, { id: TrafficSourceId; label: string }> = {
  linkedin: { id: 'linkedin', label: 'LinkedIn' },
  handshake: { id: 'handshake', label: 'Handshake' },
  indeed: { id: 'indeed', label: 'Indeed' },
  ziprecruiter: { id: 'ziprecruiter', label: 'ZipRecruiter' },
  glassdoor: { id: 'glassdoor', label: 'Glassdoor' },
  discord: { id: 'discord', label: 'Discord' },
  google: { id: 'google', label: 'Google' },
  github: { id: 'github', label: 'GitHub' },
  twitter: { id: 'twitter', label: 'Twitter/X' },
  x: { id: 'twitter', label: 'Twitter/X' },
  instagram: { id: 'instagram', label: 'Instagram' },
  sms: { id: 'sms', label: 'Text Message' },
  text: { id: 'sms', label: 'Text Message' },
  email: { id: 'email', label: 'Email' },
};

export function extractDomain(rawReferrer: string): string {
  if (!rawReferrer) return '';
  try {
    const url = new URL(rawReferrer);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function resolveSourceFromDomain(domain: string): { id: TrafficSourceId; label: string } {
  if (!domain) return { id: 'direct', label: 'Direct' };
  const lower = domain.toLowerCase();
  for (const [key, source] of Object.entries(DOMAIN_SOURCE_MAP)) {
    if (lower === key || lower.endsWith('.' + key)) return source;
  }
  return { id: 'other', label: domain };
}

export function resolveSourceFromUtm(utmSource: string): { id: TrafficSourceId; label: string } | null {
  if (!utmSource) return null;
  return UTM_SOURCE_MAP[utmSource.toLowerCase().trim()] ?? null;
}

export function parseReferrerContext(searchString: string, referrerRaw: string): ReferrerContext {
  let params: URLSearchParams;
  try { params = new URLSearchParams(searchString); } catch { params = new URLSearchParams(); }

  const utmSource = params.get('utm_source') ?? '';
  const utmMedium = params.get('utm_medium') ?? '';
  const utmCampaign = params.get('utm_campaign') ?? '';
  const utmTerm = params.get('utm_term') ?? '';
  const utmContent = params.get('utm_content') ?? '';
  const referrerDomain = extractDomain(referrerRaw);

  // UTM source takes priority over referrer domain
  const utmResolved = utmSource ? resolveSourceFromUtm(utmSource) : null;
  const domainResolved = referrerDomain ? resolveSourceFromDomain(referrerDomain) : null;
  const resolved = utmResolved ?? domainResolved ?? { id: 'direct' as TrafficSourceId, label: 'Direct' };

  return {
    resolvedSource: resolved.id,
    resolvedSourceLabel: resolved.label,
    referrerRaw,
    referrerDomain,
    utmSource,
    utmMedium,
    utmCampaign,
    utmTerm,
    utmContent,
    capturedAt: new Date().toISOString(),
  };
}

/** Evaluate whether a referrer context matches an AI routing condition trigger. */
export function matchesConditionTrigger(
  ctx: ReferrerContext,
  field: string,
  operator: string,
  value: string,
  values?: string[],
): boolean {
  const valueToCheck = (() => {
    switch (field) {
      case 'source': return ctx.resolvedSource;
      case 'referrer_domain': return ctx.referrerDomain;
      case 'utm_source': return ctx.utmSource;
      case 'utm_campaign': return ctx.utmCampaign;
      case 'utm_medium': return ctx.utmMedium;
      default: return '';
    }
  })();
  const v = valueToCheck.toLowerCase();
  // 'is_any_of' matches when the field equals ANY of the listed values
  // (one rule for linkedin OR handshake OR indeed). Falls back to splitting
  // triggerValue on commas/newlines if no explicit list was provided.
  if (operator === 'is_any_of') {
    const list = (values && values.length ? values : value.split(/[,\n]/))
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    return list.includes(v);
  }
  const target = value.toLowerCase();
  switch (operator) {
    case 'equals': return v === target;
    case 'includes': return v.includes(target);
    case 'starts_with': return v.startsWith(target);
    case 'not_equals': return v !== target;
    default: return false;
  }
}

/** Evaluate whether a guardrail passes (returns true = condition can fire). */
export function passesGuardrail(
  currentPage: string,
  field?: string,
  operator?: string,
  value?: string
): boolean {
  if (!field || !operator || !value) return true;
  const page = currentPage.split(/[?#]/)[0].toLowerCase();
  const target = value.toLowerCase();
  if (field === 'current_page') {
    if (operator === 'not_equals') return page !== target;
    if (operator === 'equals') return page === target;
  }
  return true;
}
