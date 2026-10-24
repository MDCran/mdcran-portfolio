import { type SiteAction } from "./assistant-actions";
import { safePublicPath, type EvidenceSource } from "./assistant-evidence";

const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function shouldKeepCurrentPage(userText: string) {
  return /\b(?:(?:don['’]?t|do not|without|avoid|stop)\s+(?:(?:automatically|auto|the page)\s+)?(?:navigat\w*|redirect\w*|open\w*|mov\w*)|stay (?:here|on this page)|(?:text|answer|chat) only)\b/i.test(userText);
}

/** Resolve the project the answer actually chose against the published catalog.
 * Cards and citations should lead to that project's page, not a generic gallery. */
export function projectGuidanceActions({ actions, text, catalog, userText, currentPage }: {
  actions: SiteAction[]; text: string; catalog: readonly EvidenceSource[]; userText: string; currentPage: string;
}): SiteAction[] {
  if (text.includes("__BEHAVIOR__")) return [];
  if (currentPage === "/terminal") return actions;
  if (shouldKeepCurrentPage(userText)) {
    return actions.filter(action => action.type !== "navigate");
  }
  const projects = catalog.filter(source => source.kind === "project" && safePublicPath(source.href));
  const legacyNavigation = text.match(/__NAV:(\/[^_\s]+)__/);
  const navigation = actions.find(action => action.type === "navigate") ?? (legacyNavigation ? { type: "navigate" as const, value: legacyNavigation[1] } : undefined);
  // Keep an explicit request for another destination, such as the resume.
  if (navigation && !["/", "/engineering", "/work"].includes(navigation.value.split("#")[0]) && !projects.some(project => project.href === navigation.value.split("#")[0])) return actions;
  let chosen = projects.find(project => project.href === navigation?.value.split("#")[0]);
  const cardIds = [...new Set([
    ...actions.filter(action => action.type === "project").map(action => action.value),
    ...[...text.matchAll(/__PROJECTCARD:([\w-]+)__/g)].map(match => match[1]),
  ])];
  const cards = projects.filter(project => cardIds.includes(project.id));
  if (!chosen && cards.length === 1) chosen = cards[0];
  if (!chosen) {
    const links = [...text.matchAll(/\[[^\]]+\]\((\/[^\s)]+)\)/g)].map(match => match[1].split("#")[0]);
    const cited = projects.filter(project => links.includes(project.href));
    if (cited.length === 1) chosen = cited[0];
  }
  if (!chosen && cards.length < 2) {
    const words = ` ${normalize(text.replace(/__[A-Z_]+(?::[^_]+)?__/g, ""))} `;
    const named = projects.filter(project => normalize(project.title).length >= 5 && words.includes(` ${normalize(project.title)} `));
    if (named.length === 1) chosen = named[0];
  }
  if (!chosen) return actions;
  const onProject = currentPage === chosen.href || navigation?.value.split("#")[0] === chosen.href;
  const requestedHighlight = actions.find(action => action.type === "highlight")?.value;
  const highlight = onProject && requestedHighlight && !["featured", "projects", "work", "engineering"].includes(requestedHighlight) ? requestedHighlight : undefined;
  return [
    ...(currentPage === chosen.href ? [] : [{ type: "navigate" as const, value: chosen.href }]),
    { type: "highlight", value: highlight || "project-title" },
    { type: "project", value: chosen.id },
    ...actions.filter(action => action.type === "theme" || action.type === "textSize"),
  ].slice(0, 4) as SiteAction[];
}
