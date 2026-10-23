# Public portfolio modernization

Scope: public pages and public evidence helpers only. No production data, credentials, admin routes, provider settings, package versions, or deployment configuration were changed by this implementation agent.

## Implemented behavior

1. **Calmer default.** The home introduction is server-rendered and immediately visible. Removed the initial covering loader and automatic Mercury/recruiter prompts from the home route. Music, personal-note, map, and ambient background components load only after their explicit buttons are used. The parent integration owns the separate global effects preference.
2. **Readability and accessibility.** Home and Engineering use a system sans-serif body font with consistent line-height, readable main summaries, visible keyboard focus, semantic headings, labeled controls, and reduced-motion CSS. Existing theme controls remain. Primary cranberry buttons use black text for contrast. Comparisons have a caption and row/column headers and support horizontal keyboard scrolling.
3. **One-minute overview.** The home page presents the shared engineering summary, resume/contact links, and Coretex, Health Tracker, and this portfolio. Cards are rendered only when the matching public CMS records are present. Portfolio source always resolves to `MDCran/mdcran-portfolio`. Articles remain linked and their home content remains intact.
4. **Role views.** `/engineering?role=ai`, `?role=backend`, and `?role=full-stack` select relevant projects from the same public catalog. Role switches clear area/search filters; refresh and history retain URL state. Unknown roles fall back to all work. These views change selection, not claims or qualifications.
5. **Flagship case studies.** Coretex, Health Tracker, and the portfolio have six selectable review steps: problem, contribution, architecture, tradeoffs, results/evidence, and suggested next evaluation. Existing contribution/architecture notes are reused. Architectural interpretation and proposed future evaluations are explicitly labeled. Results describe published capabilities/status, with no invented usage, latency, business, or clinical metrics.
6. **Account-free interaction.** The existing selectable architecture diagrams remain. New guided case studies are keyboard-operable. Health Tracker has a working local date-range export illustration with three explicitly fictional sample records, CSV preview, inclusive boundaries, invalid-range feedback, and download. It is clearly described as an illustration, not a connection to the real health application. The portfolio walkthrough points to its working filters and shortlist.
7. **Local shortlists.** Save up to four available public projects and compare technologies, responsibilities, and published status/outcomes. Values persist in local storage, synchronize across tabs, and can be removed individually or cleared. Corrupt, duplicate, oversized, or no-longer-public entries are rejected. Storage denial shows a useful message. Comparison links open unfiltered project evidence so selected projects remain reachable after a role/filter change. No shortlist is uploaded.
8. **Measured performance.** Home and Engineering include an expandable browser-local panel using the installed Next.js `useReportWebVitals` hook. It reports actual LCP, INP, CLS, FCP, and TTFB readings and their library-provided ratings. Values stay in memory. No synthesized score is displayed. The static hero removes an animation gate and its Framer Motion client dependency; optional widgets avoid eager widget loading; existing below-fold containment remains.

## Evidence and boundaries

- Public supplemental notes live in `web/src/lib/engineering.ts`; new editorial presentation and local demo helpers live in `web/src/lib/public-portfolio.ts`.
- The CoreTV platform/private implementation distinction and separate public Core AI contracts card remain intact.
- Hidden Lucky Block records are not introduced; shortlist resolution only accepts the current supplied public catalog.
- The `+73.2B` AI adjustment, existing reported metrics, Articles, source overrides, and `/code` redirect are untouched.
- Web Vitals are one browser document visit, not a field percentile, lab benchmark, or proof of overall performance. LCP/CLS can report after interaction or tab hiding; INP requires interaction. Unsupported metrics show an awaiting state. Client-side navigation does not reset a document measurement in the installed Next implementation.
- Next hook behavior was checked in installed `next/dist/client/web-vitals.js` and against [official documentation](https://nextjs.org/docs/app/api-reference/functions/use-report-web-vitals).
- The homepage now prioritizes the authoritative shared engineering identity instead of the old configurable oversized title/CTA presentation; the existing CMS location text is retained.

## Validation

- `npx tsx --test scripts/public-modernization.test.tsx`: 6 passing tests (role selection, corrupt/removed shortlist values and cap, inclusive CSV boundaries, CMS-only highlights/correct source override, SSR introduction without animation gate, illustrative-demo labeling).
- `npm run test:portfolio`: 10 passing existing tests.
- ESLint on every touched public TypeScript/TSX file and the new test file: clean.
- Full `npx tsc --noEmit` initially reported only a concurrent chat-route `Article.description` error; no public-file errors. Parent owns final integration checks/build and browser verification.
- No production build, commit, push, deployment, or production database writes were performed by this implementation agent.

## Unified profile publication (item 32)

- `profile-publication.ts` builds a deterministic public snapshot from the current resume profile, skill records/category order, visible engineering projects, and unchanged reported AI tracker total. It explicitly projects public profile fields and excludes hidden records. The portfolio and Core AI source overrides are enforced.
- `/githubprofile` now uses this snapshot for the name, title, location, skills, summary, and reported AI usage. No hardcoded Orlando location or static expanded skill list remains. The screenshot surface exposes its snapshot hash. `?capture=1` omits the decorative animated video for deterministic capture.
- Authenticated `GET /api/admin/publishing` returns the snapshot, SHA-256 hash, README, and counts with no-store headers. `?download=readme` and `?download=snapshot` return attachments. These are read-only endpoints.
- `PublishingStudio` (default export for parent dashboard integration) offers snapshot reload, Markdown review, downloads, current resume PDF/print link, and a same-origin screenshot preview. PNG capture uses installed html2canvas only after a click, checks that image and README snapshots match, and explains the browser screenshot fallback if rendering fails. This path requires browser verification; no successful image export is claimed solely from code checks.
- `node scripts/publish-profile.mjs --snapshot <downloaded-json> --screenshot <reviewed-png>` validates the snapshot checksum and PNG and previews locally with no GitHub requests. `--readme <downloaded-readme>` is also supported instead of the JSON snapshot, with less provenance checking.
- Only explicit `--apply` uses existing local `gh` authentication to publish `README.md` and `assets/githubprofile.png` together to `MDCran/mdcran`. The screenshot stays near the top of the generated README. It creates one commit, preserves other repository files, and uses a non-forced branch update so a concurrent remote commit is rejected. No server GitHub token is introduced. This implementation agent did not run apply.
- `npx tsx --test scripts/profile-publication.test.tsx`: 5 passing tests covering hidden-project exclusion, correct repository overrides, exact AI total preservation, current skill grouping, timestamp-independent hashes, current identity in screenshot markup, no-gh dry run, and checksum rejection.
- Publishing source and test ESLint: clean. Full shared typecheck currently reports a concurrent `campaign-jobs.ts` MongoDB `$push` typing error only; the publishing files have no type errors.

## Content health and asset usage

- Added authenticated read-only `GET /api/admin/content-health`: missing summaries and image alt metadata, invalid/missing dates, duplicate or malformed slugs, known source overrides, editorial SEO hints, and internal references against known public pages/projects. Hidden records remain visible only to the authenticated editorial report and are not given public-view links. Results are capped at 500 with the full issue count retained.
- Optional explicit `POST` performs bounded live checks of up to 12 saved public HTTPS URLs on a fixed approved-host list. Caller bodies/URLs are ignored; private addresses, arbitrary hosts, credentials, query strings, nonstandard ports, and API/admin paths are excluded. Three concurrent HEAD requests use four-second timeouts and manual redirects. 404/410 is marked broken; blocked or unsupported HEAD is reported unavailable rather than falsely called broken. No live network checks were run by this implementation agent.
- `ContentHealth.tsx` provides refresh, severity/category/collection/text filters, actionable record links, public-page links, and optional live-check results.
- Approved narrow change to `ContentStudio`: routed `?collection=...&record=...` links load the selected existing record/draft. Other studio editing behavior is untouched.
- `AssetUsage.tsx` accepts `assetKey` and optional `onDeleted`, lists backend-provided references (including drafts), routes to relevant editors, and explains replacement via content editing. Unreferenced deletion requires typing the exact key and calls the existing server-guarded DELETE; no forced-delete or unsupported replacement endpoint is used. Existing asset rename remains separate.
- `npx tsx --test scripts/content-health.test.ts`: 6 passing tests for missing content/alt/dates/duplicates, hidden references/source overrides, editor destinations, live-check URL restrictions, bounded public link selection, and report truncation. Touched-file ESLint passes.
- Last integration typecheck reported only a concurrent parent `AdminWorkspace.tsx` call-signature mismatch; parent owns final build/browser verification.


Final shared TypeScript verification after the content-health integration: `npx tsc --noEmit` passed. No remaining TypeScript errors at this checkpoint.

Independent integration review: README output restored to a compact Markdown project table with one row per public project/package, separate source/live destinations, and the profile screenshot near the top. Targeted public/publishing tests passed (11). Read-only localhost checks returned 200 for home, Engineering, and capture profile; unauthenticated publishing returned 401. Engineering server HTML includes role/shortlist/vitals controls; capture HTML excludes video and three consecutive settled requests returned the same publication hash. No browser session, production data, or GitHub state was changed during this review.

Public publication feed added: `GET /api/profile-publication` returns the same canonical projected snapshot without admin authentication. It uses a weak ETag and `public, max-age=0, must-revalidate` to avoid stale screenshot/README pairing. Only name/title/location/public LinkedIn/GitHub fields are exposed from the profile; unused email/PDF fields and raw CMS/admin metadata are omitted, credential-bearing URLs are rejected, and hidden-project filtering remains enforced. Local HTTP verification: 200 public response, 304 conditional response, matching header/body/capture hashes, protected Lucky Block absent. Six publishing tests and touched-file lint pass. Production acquisition/review/apply instructions are in `web/scripts/PROFILE_PUBLISHING.md`; no production writes were performed.
