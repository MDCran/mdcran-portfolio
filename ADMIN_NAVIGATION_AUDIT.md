# Admin navigation and presentation audit

Date: 2026-10-23

The admin shell groups all 28 pages in six categories, provides a persistent independently scrolling desktop sidebar, and uses a Radix dialog for the mobile menu. Existing section content and actions remain in their workspaces. Search supports arrow keys, Enter, and Escape. Login fields have associated labels, keyboard-accessible password visibility, and announced errors.

Source review found existing horizontal scroll wrappers around the admin tables. Shell styling preserves table markup while improving form contrast, focus indicators, and narrower desktop grids. Booking and Discord headers now wrap their description and retain a nonshrinking, single-line Save button on mobile.

Seven deterministic navigation/accessibility tests, targeted lint, and a full TypeScript check passed before the final header-only layout adjustment. Browser verification is recorded separately by the parent task.

## Remaining accessibility limitation

Booking's five simple caption/control patterns (feed URL, timezone, scheduling-rule rows, location, and duration) now also use explicit wrapping labels. Repeated rows retain their own individual control association.

Of 155 legacy `AdminShared.Label` usages, 110 straightforward pairs were migrated to `LabeledField`, which explicitly encloses one native input, select, or textarea in its visible label. These changes preserve each control's props, event handlers, and layout classes; no DOM mutation or automatic label matching is used. The remaining 45 legacy usages include custom controls, complex groups, and read-only headings and still require individual review. The source review and focused keyboard tests are not a complete WCAG audit or a claim of WCAG conformance.
