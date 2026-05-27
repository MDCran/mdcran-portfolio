/**
 * Best-effort haptics.
 * - Android / supporting browsers: the standard Vibration API.
 * - iOS (no Vibration API): a hidden `<input type="checkbox" switch>` — iOS 17.4+
 *   fires a subtle system haptic when that control toggles. It's unofficial and
 *   only a faint single tick, but it's harmless and degrades to nothing.
 * Never throws; safe to call anywhere (no-ops during SSR).
 */
let iosToggle: HTMLInputElement | null = null;
let vibrateWorks: boolean | null = null;

function ensureIosToggle(): HTMLInputElement | null {
  if (typeof document === "undefined") return null;
  if (iosToggle) return iosToggle;
  const label = document.createElement("label");
  label.setAttribute("aria-hidden", "true");
  label.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none;";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", ""); // iOS 17.4+ haptic switch
  input.tabIndex = -1;
  input.setAttribute("aria-hidden", "true");
  label.appendChild(input);
  document.body.appendChild(label);
  iosToggle = input;
  return input;
}

export function haptic(pattern: number | number[] = 10): void {
  try {
    const nav = typeof navigator !== "undefined" ? navigator : null;
    if (nav && typeof nav.vibrate === "function") {
      const ok = nav.vibrate(pattern);
      if (vibrateWorks === null) vibrateWorks = ok;
      if (ok) return; // Android etc. handled
    }
    // iOS fallback: toggle the hidden switch to coax a system tick.
    const el = ensureIosToggle();
    if (el) el.click();
  } catch { /* haptics are optional */ }
}
