/** Client-side resolver: turn an agent-provided target string into a DOM element.
 *  Shared by the directive handlers (highlight/zoom/emphasize) and the ghost cursor. */

function norm(s: string): string {
  return s.toLowerCase().replace(/[-_\s]+/g, "");
}

function findElementByText(searchText: string): HTMLElement | null {
  const lower = searchText.toLowerCase();
  const contentRoots = document.querySelectorAll("main, article");
  const searchIn = contentRoots.length > 0 ? contentRoots : [document.body];
  for (const root of searchIn) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent || !node.textContent.toLowerCase().includes(lower)) continue;
      let parent = node.parentElement;
      while (parent && parent !== document.body && parent !== root) {
        const tag = parent.tagName.toLowerCase();
        const isBlock = ["div", "section", "li", "td", "p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "figure"].includes(tag);
        if (isBlock && parent.textContent && parent.textContent.length < 800) return parent;
        parent = parent.parentElement;
      }
    }
  }
  return null;
}

export function findTarget(target: string): HTMLElement | null {
  const normed = norm(target);
  const all = Array.from(document.querySelectorAll("[data-highlight-id]")) as HTMLElement[];

  const byAttr = document.querySelector(`[data-highlight-id="${target}"]`) as HTMLElement | null;
  if (byAttr) return byAttr;
  const byId = document.getElementById(target);
  if (byId) return byId;

  for (const el of all) {
    const hid = norm(el.getAttribute("data-highlight-id") || "");
    if (hid === normed || hid.includes(normed) || normed.includes(hid)) return el;
  }
  const stem = normed.replace(/s$/, "");
  for (const el of all) {
    const hid = norm(el.getAttribute("data-highlight-id") || "");
    if (hid.includes(stem) || stem.includes(hid)) return el;
  }
  for (const el of all) {
    const headings = el.querySelectorAll("h1,h2,h3,h4,h5,h6,p,span");
    for (const h of headings) {
      const hText = norm(h.textContent || "");
      if (hText.includes(normed) || hText.includes(stem)) return el;
    }
  }
  for (const el of all) {
    const text = norm(el.textContent || "");
    if (text.includes(normed) || text.includes(stem)) return el;
  }
  return findElementByText(target);
}
