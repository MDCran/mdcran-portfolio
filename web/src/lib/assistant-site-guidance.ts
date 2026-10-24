import type { SiteAction } from "./assistant-actions";
import type { ResponseActions } from "./assistant-response";

type GuidanceView = {
  path: () => string;
  hasTarget: (target: string) => boolean;
  pointNavigation: (href: string) => void;
};

const browserView: GuidanceView = {
  path: () => window.location.pathname,
  hasTarget: target => Boolean(document.querySelector(`[data-highlight-id="${target}"]`) || document.getElementById(target)),
  pointNavigation: href => window.dispatchEvent(new CustomEvent("mdcran:cursor-nav", { detail: { href, label: "Opening the page…" } })),
};

/** Shared by text and voice: let the pointer land, open the page, then wait for
 * the real destination/section to mount before spotlighting it. All steps belong
 * to the response so stop, close and a newer reply cancel the whole sequence. */
export function queueSiteGuidance(actions: SiteAction[], response: ResponseActions, execute: (action: SiteAction) => void, view = browserView) {
  const navigation = actions.find(action => action.type === "navigate");
  const highlight = actions.find(action => action.type === "highlight");
  const target = highlight?.value || navigation?.value.split("#")[1];
  for (const action of actions) {
    if (action.type !== "navigate" && action.type !== "highlight" && action.type !== "project") response.schedule(() => execute(action));
  }
  if (!navigation && !target) return;
  response.schedule(() => {
    const origin = view.path();
    const destination = navigation?.value.split("#")[0] || origin;
    const focusWhenMounted = (remaining = 80) => {
      if (!target) return;
      if (view.path() === destination && view.hasTarget(target)) execute({ type: "highlight", value: target });
      else if (remaining > 0) response.schedule(() => focusWhenMounted(remaining - 1), 100);
    };
    if (navigation && origin !== destination) {
      view.pointNavigation(navigation.value);
      response.schedule(() => {
        // A visitor who navigates manually takes control of the page.
        if (view.path() !== origin) return;
        execute(navigation);
        focusWhenMounted();
      }, 950);
    } else focusWhenMounted();
  });
}
