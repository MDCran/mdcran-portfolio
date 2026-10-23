# Backend modernization implementation

Implemented in the shared portfolio checkout; no production data, outbound messages, commits or deployments were performed by this implementation agent.

## Scope and completion

Backend recommendations 9–16 and backend support for admin/publication recommendations 27–30 and 32 are implemented as the capabilities below. The parent checklist owns the final numbering across all 32 recommendations.

- **Validated writes and concurrency:** server-side structural/content validation, stable identifiers, bounded payloads, safe URL schemes, explicit optimistic versions, atomic group saves and explicit deletion. Legacy whole-array PUT routes now upsert without inferring deletion from omission. They return fresh records; clients must retain `_version`. Database replacement via delete/insert is confined to atomic restore transactions.
- **Drafts, review and audit:** authenticated per-record detail, draft-only storage, explicit publish, compact revision history and revision restore. Each mutation captures its version, time, action and prior content inside the same transaction. Draft content never enters public collections. Authenticated preview API has no-store/noindex headers. Existing single-featured-article behavior is preserved.
- **Independent scheduled campaigns:** cron endpoint, bounded batches, atomic campaign leases, per-recipient durable checkpoints, consent recheck and provider timeouts. Email includes stable provider idempotency keys. Reads no longer send. Uncertain provider outcomes are retained for explicit human verification; they are never automatically resent. Existing sent-recipient history is imported into checkpoints.
- **Backup safety:** snapshot-consistent export fails on read errors, format checksum verification, validated staging, dry-run record counts and empty-collection warnings, expiring one-use plans, stale-plan detection, atomic all-collection restoration and a pre-restore recovery snapshot. Restores advance record versions, including deleted-record tombstones. Recovery snapshots are downloadable for a new dry-run/restore.
- **Operations:** persisted operation run IDs, timing, status and bounded history for campaign jobs, cleanup, metrics audit and restores. Registered safe retry dispatch; restore retries require another reviewed plan. Uncertain delivery resolution records the admin-confirmed outcome without sending.
- **Pagination:** bounded cursor/search APIs for content, drafts, identities, contacts, campaigns, rizz and conversation records. Identities list and target picker use server search; identity detail loads the newest 50 messages with older-message pagination. Message queries include identity/serial scope and compound indexes.
- **Asset safety:** used-by traversal includes nested published content and drafts; encoded/inline asset references are recognized. Existing R2 delete refuses referenced assets and returns their locations. Existing reference-aware rename remains available.
- **Publication freshness:** successful published saves, group saves and restores invalidate the `public-content` cache tag. Profile publication uses the same database sources; admin reads remain uncached.

## API contracts

All `/api/admin/*` endpoints below require the existing authenticated admin session.

### Content

- `GET /api/admin/content?collection=projects&id=...` → `{record,version,draft,history}`. History is bounded to 50 compact entries; restore loads the full stored revision server-side.
- Without `id`, accepts `limit` (1–100), `cursor`, `q`, `drafts=true` → `{records,nextCursor}`. Draft-only new records appear in draft search.
- `POST /api/admin/content` accepts `{collection,id,action,expectedVersion,record?,revisionId?}`; actions: `save`, `draft`, `publish`, `delete`, `restore`. Returns `{record,version}`. Stale edits return409; invalid content422.
- `PUT /api/admin/content` accepts `{groups:[{collection,records,deleted?:[{id,expectedVersion}]}]}`. Saves/deletes commit together; returns `{groups:[{collection,records}]}`. `_position` controls ordering. Omitted records are preserved.
- Collections: projects, articles, clients, experiences, educations, skills, certifications, awards, clubs, contacts, campaigns, rizz, skillCategories, resumeProfile, siteContent, chatConfig.
- Identifiers: ordinary `id`; skills use `name`; resumeProfile uses `profile`; chatConfig uses `config`; siteContent uses existing `site-content`.
- `GET /api/admin/content/preview?collection=...&id=...` → `{record,version,isDraft}`. This is an authenticated data preview, not a publicly accessible preview link.

### Backups

- `GET /api/admin/db-backup` downloads format-v2 JSON. `?snapshotId=...` downloads the corresponding pre-restore recovery snapshot.
- `POST {action:'dry-run',backup}` → `{planId,expiresAt,collections:[{collection,current,incoming}],warnings,requiresConfirmation:true}`.
- `POST {action:'restore',planId}` → `{success:true,snapshotId,message}`. Plans expire after30 minutes; changed source data requires a fresh dry-run. Raw legacy destructive POST payloads are rejected.

### Operations and delivery

- `GET /api/admin/operations` → `{runs,deliveries,summary}`. Runs have `runId`, `job`, `status`, `startedAt`, and optional finishedAt/durationMs/result/error. Deliveries contains unresolved uncertain outcomes.
- `POST {action:'retry',runId}` reruns only an allowed failed job: campaigns, cleanup or project-metrics.
- `POST {action:'resolve-delivery',campaignId,contactId,outcome:'sent'|'not-sent'}` records verified provider outcome. It does not send; resume is an explicit campaign action.
- `GET|POST /api/cron/campaigns`: CRON_SECRET bearer or authenticated admin; bounded worker run with telemetry. Parent owns deployment schedule configuration.

### Pagination and assets

- `GET /api/admin/records?collection=...&limit=30&cursor=...&q=...` → `{records,nextCursor}`. Collections: contacts,campaigns,identities,rizz,aiConversations,aiMessages. Messages optionally filter by conversationId.
- `GET /api/admin/identities/:id/messages?cursor=...` → `{messages,nextCursor}`; messages are chronological within each page, newest page first. Identity detail includes messagesNextCursor.
- `GET /api/admin/r2/usage?key=...` → `{key,references:[{collection,id,title,fields}],canDelete}`. R2 DELETE returns409 and this usage payload if references exist.

## Validation

Run `node node_modules/tsx/dist/cli.mjs --test scripts/backend-modernization.test.ts` from web/. The test creates a unique `mdcran_modernization_test_*` database on a loopback replica set, mocks all campaign delivery, and drops only that exact test database afterward. It refuses non-loopback Mongo URIs. Optional `TEST_MONGODB_URI` controls the local test connection; no .env is loaded.

Ten integration tests currently pass: invalid schema/duplicate IDs; concurrent version conflict; group rollback and explicit deletion; submitted-record response isolation and stale unchanged-version rejection; draft isolation/publish/restore; stale backup plan/checksum/recovery/tombstones; rollback after an earlier collection replacement; concurrent campaign claims/uncertain delivery/consent; stable pagination/nested draft asset usage; bounded identity history/isolation. Re-run after final integration changes.

## Deployment and practical limits

- MongoDB must support multi-document transactions (Atlas or a replica set). No unsafe standalone fallback exists. Tests used the isolated `mdcranReview` replica set on127.0.0.1:27028.
- Provider acceptance followed by a network/process failure cannot be proven exactly once for SMS. Such rows remain uncertain and require provider verification; email also has provider idempotency protection. No live delivery was tested.
- Restore plans expire; recovery snapshots currently remain until deliberately managed. They may include sensitive existing backup collections and are available only through authenticated admin endpoints.
- Search is bounded literal substring matching rather than an Atlas Search dependency. Identity/history UIs now paginate; some legacy main-dashboard data loading remains parent-owned.
- Asset usage checks cover database content and drafts, not every manually hardcoded source-code URL or arbitrary third-party reference. Delete checking is conservative; concurrent new references between check and object deletion remain an operational edge case.
- Backup restores validate and commit atomically; very large datasets remain subject to platform request and MongoDB transaction limits. No production restore was run.

## Recovery UI and scheduling integration

BackupManager now retains the post-restore snapshot ID, offers immediate recovery download, lists the latest recovery snapshots, and supports inspecting an older snapshot through the same dry-run and explicit restore-confirmation workflow. OperationsCenter lists uncertain delivery outcomes and requires both an explicit provider outcome and confirmation that the matching provider record was checked; recording the result never sends a message. Campaign job retry separately confirms that due deliveries may be sent.

The production Vercel Hobby plan permits daily cron frequency. Parent integration provides a daily Vercel fallback and a GitHub Actions schedule every15 minutes (best effort; GitHub scheduling is not an exact-time guarantee), with a scoped campaign cron token. No worker was manually invoked against production during implementation.

Final autosave review fixed failed resume fetch initialization, retries targeting unrelated operations, saved-state reporting for queued edits, and edits reverted while a previous save is in flight. Group responses now return only submitted records read inside the committed transaction snapshot, preventing unseen external records or post-commit versions from silently becoming the editor baseline.
