# Standalone admin component audit

Date: 2026-10-23

## Implemented fixes

- Booking and Discord settings now expose failed initial loads with retry, check saves, preserve drafts after failures, and adopt confirmed server configuration. Invalid timezone drafts no longer crash booking rendering. Loading booking settings no longer silently removes expired blackouts.
- Rizz settings accept the dashboard's shared save callback, preventing independent writes from bypassing its version and autosave handling. The parent integration loads site content before editing these settings.
- Session commands and identity device mutations check server responses, prevent concurrent commands, release busy state on failure, and distinguish a committed command from a failed follow-up refresh. Identity detail loads are cancelled when the selected identity changes.
- Identity tracking links preserve existing query strings and fragments, encode the identity value, and reject external destinations.
- Cross-device candidates now report load/config/action failures, preserve failed config drafts, and use an explicit retryable save control. Keyboard range changes save on blur.
- Saved campaign links now check create/update/delete responses, retain failed drafts, cancel obsolete reads before mutations, and report clipboard failures.
- Asset replacement uploads check responses, release pending state on failure, and distinguish an uploaded file from a failed preview refresh. A Refresh details control recovers without repeating the upload. Asset totals expose refresh errors.
- Analytics and tap charts distinguish loading/empty/error states and offer retry. The heatmap layout stacks at narrow widths.
- AI Studio clamps model selection after configuration changes and marks cancelled empty results instead of leaving them waiting indefinitely.
- Content Studio permits publish/restore of a saved revision even when unrelated draft JSON is invalid, and requires an explicit refresh after version conflicts.
- Discord test channel allowlist now includes the existing Cross-Device Links and Returning Named Visitors controls.

## Reviewed without requiring changes

PublishingStudio, ContentHealth, OperationsCenter, BackupManager, AssetUsage, and R2ImagePickerModal were inspected for checked response handling and recovery paths. This is a source review, not proof that every provider integration is configured or operational.

## Validation

- Full TypeScript check passed after these changes.
- Targeted ESLint passed with no findings for all 14 changed standalone components, the mutation helper, Discord route, and admin client tests.
- All 10 admin client tests passed. Added tests cover rejected writes, accepted writes followed by failed reads without repeating the command, timezone draft boundaries, and identity URL query/fragment/origin handling.
- Changed tracked files were decoded as UTF-8. BookingAdmin and IdentityDetail were repaired after an intermediate Windows encoding/newline issue; their final contents use valid UTF-8 and ordinary line endings.

## Boundaries

No production data was changed. No provider, AI, Discord, upload, destructive session, or identity mutation was executed during this audit. Tests use deterministic local mocks/helpers; browser appearance and real integration verification are handled separately by the parent task. The dashboard workspace, navigation, authentication, and API validation are owned by parallel work and are not claimed as reviewed here.
