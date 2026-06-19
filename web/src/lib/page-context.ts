/**
 * page-context.ts — DOM context extractor for AI assistant.
 * Call extractPageContext() to get a ~2 kB string of what's visible on screen.
 */

function isVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return true;
  const s = el.style;
  if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") return false;
  return true;
}

function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function textOf(el: Element): string {
  let out = "";
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) out += node.textContent ?? "";
    else if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName !== "SCRIPT" && (node as Element).tagName !== "STYLE")
      out += (node as Element).textContent ?? "";
  }
  return clean(out);
}

function trunc(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function isInternal(href: string | null): href is string {
  return typeof href === "string" && href.startsWith("/") && !href.startsWith("//");
}

export function extractPageContext(): string {
  if (typeof window === "undefined" || typeof document === "undefined") return "";

  const lines: string[] = ["=== CURRENT PAGE DOM CONTEXT ==="];

  const navLinks: string[] = [];
  document.querySelectorAll("nav a, [role='navigation'] a, header a").forEach((el) => {
    if (!isVisible(el)) return;
    const href = (el as HTMLAnchorElement).getAttribute("href") ?? "";
    const label = clean(el.getAttribute("aria-label") || textOf(el));
    if (!label || href.startsWith("#")) return;
    navLinks.push(`${label} (${href})`);
  });
  const seenNav = new Set<string>();
  const uniqueNav = navLinks.filter((v) => { if (seenNav.has(v)) return false; seenNav.add(v); return true; });
  if (uniqueNav.length) lines.push(`NAV LINKS: ${uniqueNav.join(" | ")}`);

  const headings: string[] = [];
  document.querySelectorAll("h1, h2, h3, h4").forEach((el) => {
    if (!isVisible(el)) return;
    const t = clean(el.textContent ?? "");
    if (t) headings.push(`"${t}"`);
  });
  if (headings.length) lines.push(`HEADINGS: ${headings.slice(0, 12).join(" | ")}`);

  const buttons: string[] = [];
  const seenBtn = new Set<string>();
  document.querySelectorAll("button, [role='button'], input[type='button'], input[type='submit']").forEach((el) => {
    if (!isVisible(el)) return;
    const label = el.getAttribute("aria-label") || (el instanceof HTMLInputElement ? el.value : "") || clean(el.textContent ?? "");
    const t = clean(label);
    if (!t || seenBtn.has(t)) return;
    seenBtn.add(t); buttons.push(`"${t}"`);
  });
  if (buttons.length) lines.push(`BUTTONS: ${buttons.slice(0, 20).join(" | ")}`);

  const checklistItems: string[] = [];
  document.querySelectorAll("input[type='checkbox']").forEach((el) => {
    if (!isVisible(el)) return;
    const cb = el as HTMLInputElement;
    let label = "";
    if (cb.id) { const lbl = document.querySelector(`label[for='${cb.id}']`); if (lbl) label = clean(lbl.textContent ?? ""); }
    if (!label) {
      let parent = cb.parentElement;
      while (parent && !(parent instanceof HTMLLIElement) && !(parent instanceof HTMLLabelElement) && parent.tagName !== "DIV") parent = parent.parentElement;
      if (parent) label = clean(parent.textContent ?? "").replace(/^[\[\]xX✓\s]+/, "").trim();
    }
    if (label) checklistItems.push(`${cb.checked ? "[x]" : "[ ]"} ${trunc(label, 60)}${cb.checked ? " (checked)" : ""}`);
  });
  document.querySelectorAll("[role='checkbox']").forEach((el) => {
    if (!isVisible(el)) return;
    const checked = el.getAttribute("aria-checked") === "true";
    const label = clean(el.getAttribute("aria-label") || el.textContent || "");
    if (label) checklistItems.push(`${checked ? "[x]" : "[ ]"} ${trunc(label, 60)}${checked ? " (checked)" : ""}`);
  });
  if (checklistItems.length) lines.push(`CHECKLIST ITEMS: ${checklistItems.slice(0, 25).join(" | ")}`);

  const internalLinks: string[] = [];
  const seenHref = new Set<string>();
  document.querySelectorAll("a[href]").forEach((el) => {
    if (!isVisible(el)) return;
    const href = (el as HTMLAnchorElement).getAttribute("href") ?? "";
    if (!isInternal(href) || seenHref.has(href)) return;
    seenHref.add(href);
    const label = clean(el.getAttribute("aria-label") || el.textContent || "");
    if (label) internalLinks.push(`"${trunc(label, 50)}" (${href})`);
  });
  if (internalLinks.length) lines.push(`INTERNAL LINKS: ${internalLinks.slice(0, 20).join(" | ")}`);

  const cards: string[] = [];
  document.querySelectorAll("[class*='card'] h2, [class*='card'] h3, [class*='card'] h4, article h2, article h3, [data-highlight-id] h2, [data-highlight-id] h3").forEach((el) => {
    if (!isVisible(el)) return;
    const t = clean(el.textContent ?? "");
    if (t) cards.push(`"${trunc(t, 60)}"`);
  });
  if (cards.length) lines.push(`CARDS/ARTICLES: ${[...new Set(cards)].slice(0, 10).join(" | ")}`);

  const formFields: string[] = [];
  document.querySelectorAll("input:not([type='hidden']):not([type='submit']):not([type='button']):not([type='checkbox']):not([type='radio']), textarea, select").forEach((el) => {
    if (!isVisible(el)) return;
    const inp = el as HTMLInputElement;
    const ph = clean(inp.placeholder ?? "");
    const nm = clean(inp.name ?? inp.id ?? "");
    const type = inp.type ?? el.tagName.toLowerCase();
    const label = ph || nm;
    if (label) formFields.push(`[${type}] "${label}"${inp.value ? ` (current: "${trunc(inp.value, 30)}")` : ""}`);
  });
  if (formFields.length) lines.push(`FORM FIELDS (use with __TYPE:field-label|text__): ${formFields.slice(0, 12).join(" | ")}`);

  const badges: string[] = [];
  const seenBadge = new Set<string>();
  document.querySelectorAll("[class*='badge'], [class*='tag'], [class*='chip'], [class*='label'], [class*='pill']").forEach((el) => {
    if (!isVisible(el)) return;
    const t = clean(el.textContent ?? "");
    if (!t || t.length > 40 || seenBadge.has(t)) return;
    seenBadge.add(t); badges.push(`"${t}"`);
  });
  if (badges.length) lines.push(`BADGES/TAGS: ${badges.slice(0, 15).join(" | ")}`);

  const paras: string[] = [];
  document.querySelectorAll("p").forEach((el) => {
    if (!isVisible(el)) return;
    const t = clean(el.textContent ?? "");
    if (t.length > 20) paras.push(trunc(t, 100));
  });
  if (paras.length) lines.push(`PARAGRAPHS: ${paras.slice(0, 20).map((p) => `"${p}"`).join(" | ")}`);

  lines.push("=== END DOM CONTEXT ===");
  const result = lines.join("\n");
  return result.length > 4000 ? result.slice(0, 3997) + "..." : result;
}

export function findElementByText(text: string): HTMLElement | null {
  if (typeof window === "undefined" || typeof document === "undefined" || !text) return null;
  const needle = text.trim().toLowerCase();
  if (!needle) return null;

  const CANDIDATES = "a, button, h1, h2, h3, h4, h5, h6, [role='button'], [role='link'], [role='menuitem'], [role='checkbox'], label, li, p";
  let bestPartial: HTMLElement | null = null;
  for (const el of document.querySelectorAll<HTMLElement>(CANDIDATES)) {
    if (!isVisible(el)) continue;
    const t = clean(el.textContent ?? "").toLowerCase();
    if (t === needle) return el;
    if (!bestPartial && t.includes(needle)) bestPartial = el;
  }
  if (bestPartial) return bestPartial;

  let ariaPartial: HTMLElement | null = null;
  document.querySelectorAll<HTMLElement>("[aria-label]").forEach((el) => {
    if (!isVisible(el)) return;
    const label = (el.getAttribute("aria-label") ?? "").trim().toLowerCase();
    if (label === needle) { if (!bestPartial) bestPartial = el; }
    else if (!ariaPartial && label.includes(needle)) ariaPartial = el;
  });
  if (bestPartial) return bestPartial;
  if (ariaPartial) return ariaPartial;

  for (const el of document.querySelectorAll<HTMLElement>("input, textarea, select")) {
    if (!isVisible(el)) continue;
    const ph = ((el as HTMLInputElement).placeholder ?? "").toLowerCase();
    const nm = ((el as HTMLInputElement).name ?? "").toLowerCase();
    if (ph.includes(needle) || nm.includes(needle)) return el;
  }
  return null;
}
