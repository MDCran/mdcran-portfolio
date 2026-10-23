# Portfolio experience implementation checklist

Implementation branch: `codex/portfolio-experience-upgrade`.

The implementation reuses existing public CMS records, resume data, media, theme controls, and assistant behavior. Hidden project filtering remains in `db.ts`; Lucky Block is also removed from the supplemental engineering notes. No production data was modified by this implementation agent.

| # | Agreed improvement | Result |
|---|---|---|
| 1 | Compact, active sticky navigation | Improved: compact height on scroll, current-page semantics, retained fixed navigation. |
| 2 | Resume table of contents | Added links to sections that actually exist in the supplied resume. |
| 3 | Recruiter shortcuts | Added resume, top projects, role match, GitHub, and contact shortcuts. |
| 4 | AI/full-stack/cloud/mobile project filters | Added to Engineering using public technology/category evidence. |
| 5 | Project/article/skill/technology search | Retained global catalog search; improved work search labels; Engineering searches project descriptions and technology evidence. Resume skills link to evidence or matching project search. |
| 6 | Shareable URL filters | Added Engineering and Work filters/sorting to query parameters. State derives from Next search parameters so same-page navigation, refresh, and history remain synchronized. |
| 7 | Project breadcrumbs/back navigation | Added category-aware breadcrumbs; retained existing back links and Engineering routes. |
| 8 | Clear live/source/media/case-study links | Retained public destinations and expanded notes; added public-source/case-study access labels. Fixed GitHub blob screenshot URLs. |
| 9 | Mobile navigation | Retained keyboard/mobile menu; shortcuts scroll horizontally without page overflow; increased header clearance. |
| 10 | Concise role statement | Reused existing shared engineering summary across Engineering and Resume. |
| 11 | Evidence-based metrics | Removed synthetic date generation and homepage view/follower drift. Views show reported video aggregates; prompt attribution distinguishes client audiences from personal impact. Existing reported AI token totals, including the approved adjustment, are untouched. |
| 12 | Contribution/ownership | Retained curated contribution and implementation notes for each known engineering project. |
| 13 | Public/private/internal/demo labels | Public source and case-study labels are explicit; CORE platform distinguishes private implementation from public contracts. No access classification is invented for unknown work. |
| 14 | Authorized private summaries | Existing public summaries retained; hidden Lucky Block excluded. No private repositories or customer records added. |
| 15 | Clean printable/ATS resume | Added `/resume/print`, a single-column selectable-text resume with browser Print → Save as PDF, alongside the existing downloadable PDF. It is a print/export path, not a newly generated binary PDF download. |
| 16 | Authoritative dates/location | Footer reads resume-profile location. Shared chronology and date formatting serve interactive and print resumes. Invalid/ancient dates are omitted, with no fabricated replacement. Historical job locations retained. |
| 17 | Skills linked to evidence | Resume skills and role-match results link only to public CMS project slugs. |
| 18 | Certification verification and awards | Existing verification URLs retained; print resume includes certifications and concise awards; shared date formatting applied. |
| 19 | Career/project timeline | Existing interactive timeline retained; invalid project/article dates filtered; resume chronology shared with print. |
| 20 | Interactive architecture | Added selectable simplified diagrams for Coretex, Health Tracker, and this portfolio, grounded in existing implementation notes and source links. |
| 21 | Safe-to-try demos | Retained actual live products/videos. Added local interactive architecture and role matching that require no account or pasted-data upload. No external disposable sandbox or fake demo URL was invented. |
| 22 | Before/after case studies | Existing before/after slider and actual project media retained; Engineering still renders published before/after sections and galleries. |
| 23 | Curated public GitHub/activity | Retained curated source links and actual contribution calendar; removed manufactured fallback contribution trend. GitHub errors show unavailable rather than an invented number. |
| 24 | Building-now/status area | Added current published project statuses and valid publish dates, explicitly identified as project notes rather than live activity updates. |
| 25 | Related projects/articles | Existing related project cards retained; Engineering adds related public writing selected from actual tags. |
| 26 | Accessible curated themes | Reused existing Dark, Light, High Contrast, Grayscale, Hacker, and Cyberpunk themes and accessibility controls. No duplicate theme system added. |
| 27 | Printable projects/section links | Added copy-link and page print actions. Printing opens closed project notes temporarily and removes chrome; section anchors remain shareable. |
| 28 | Job-description match | Added local explicit-technology matching with linked public evidence and a concise needs-confirmation note. No unsupported score or inferred qualifications. |
| 29 | Page-aware chat context | Captures bounded public main/article content, prioritizing the hash/current section. Excludes form values, hidden content, assistant dialogs, and private routes. |
| 30 | Exact supporting answer links | Prompt requires specific public evidence links and acknowledges gaps; context ranks and bounds public records. Live model compliance still requires provider testing. |
| 31 | Page-specific questions | Resume, Engineering, Articles, and general pages have appropriate suggested prompts in text and voice. |
| 32 | Audience modes | Added General, Recruiter, and Engineering preferences sent to the server. |
| 33 | Visible opt-in memory | Defaults off; gates device topics and server prior-session recall. Clear rotates a recall epoch and cutoff, resets text/voice state, and discards ephemeral handoffs. UI distinguishes memory from operational log retention. |
| 34 | Reliable voice lifecycle/handoff | Added pause/resume, bidirectional ephemeral text/voice history transfer, request and TTS cancellation/generation guards, and stale-reply suppression. |
| 35 | Microphone/transcript/text fallback | Retained microphone picker/permission retry; added visible transcript, editable text question and text handoff; short answers such as “no” and “yes” are accepted. |
| 36 | Pace/detail/pronunciation | Added bounded speaking pace, concise/detailed answers, and a pronunciation hint. Michael's existing pinned professional clone/model remain unchanged. |

## Validation

- `npm run test:portfolio`: 10 passing tests covering split SSE/UTF-8/EOF, short speech, invalid dates, public-only evidence, private context routes, opt-in memory and clear epoch, handoff, resume fallback/order, input/filter accessibility semantics, and GitHub image normalization.
- `npm run test:rizz`: 10 existing tests pass.
- `npx tsc --noEmit`: passed repeatedly through the final functional changes.
- `npm run build -- --webpack`: full production build passed with isolated test MongoDB (`mdcran_portfolio_review`), including TypeScript, all 46 static-generation tasks, and build tracing. An earlier compile-only build also passed.
- Touched-file ESLint: six pre-existing errors (independently reproduced by linting the HEAD versions of the same four files) in admin dashboard effects, ChatPanel's Typewriter ref, GlobalChrome's language effect, and ProjectDetail's decorative random value. New modules are lint-clean. Existing warnings remain in the large legacy files.
- Parent browser checks against isolated MongoDB confirmed filters/search with refresh, selectable architecture, printable resume, mobile keyboard menu, and preferences/clear UI. Browser findings corrected: GitHub screenshot crashes, mobile header overlap, and stale same-page filters.
- Parent isolated-Mongo integration test inserted 25 current-epoch turns and an old-epoch record, verified the latest 20 returned in chronological order, and verified missing/new clear epochs returned no history; fixtures were cleaned.

## Verification limits

Real voice synthesis/recognition, live AI answers, and provider interruption behavior require configured provider credentials and microphone testing. The implementation agent did not use production credentials or write production data. The parent agent owns final deployment/browser verification, commit, and deployment.
