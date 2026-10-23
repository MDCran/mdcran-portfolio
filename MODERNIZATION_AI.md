# AI, chat, voice, and testing workspace modernization

Implemented in the shared review checkout on 2026-10-23. Parent agent owns dashboard integration, full build, commit, and deployment. No live model comparison or speech synthesis was run by this implementation agent, and no production database records were changed.

## Delivered

| Recommendation | Implemented behavior |
|---|---|
| 17 — Stronger retrieval | `assistant-evidence.ts` ranks public CMS records with explicit synonyms for AI/LLMs, full-stack, mobile, infrastructure, recruiting, and architecture. Exact query terms outweigh expansions; ties are stable. Project ranking includes curated implementation skills. No private repository retrieval or unnecessary embedding service was added. |
| 18 — Supporting evidence | Server builds its source catalog from public projects/articles, resume sections, and curated/published source URLs. Final SSE events contain only cited links that match that catalog. Text chat and voice transcript display expandable source cards. Cards validate source membership, not whether every generated claim is entailed; the model must still acknowledge missing evidence. CoreTV platform/private implementation versus public contracts remains explicit. |
| 19 — Structured actions | Anthropic tools and OpenAI-compatible function calls now carry navigation, highlights, themes, project cards, and text size. Server validation restricts destinations to known public routes and project IDs; client validation rejects malformed, external, private, and unsupported actions. Actions execute only after request cancellation guards. Legacy markers remain for other existing capabilities such as contact/booking forms, tours, cursor gestures, and identity flows. The shared fallback SSE decoder handles split UTF-8, JSON, and EOF frames. |
| 20 — Streaming speech | TTS uses ElevenLabs' documented `/stream` endpoint. Voice mode incrementally appends MPEG to MediaSource on supported browsers, with the original full-buffer decode/native-audio fallback on unsupported browsers. Audio graphs preserve the existing barge-in meter. Request abort, pause, close, and clear stop streaming playback. The professional clone `EgUcxulGJojl01KsxgA1` and `eleven_multilingual_v2` remain pinned. No replacement voice or model is introduced. |
| 21 — Microphone testing | Voice controls include a separate local test screen with device selection, input level meter, a five-second recording, playback, delete, and permission guidance. Starting it pauses the conversation. Test audio stays in browser memory and is never sent to STT or stored on the server. Streams, timers, and recording URLs are cleaned up. |
| 22 — Regression evaluation | Thirteen deterministic tests cover synonym relevance, exact public source matches, rejected private/external/unknown actions, opt-in memory editing/deletion, audio fallback body preservation, early audio cancellation cleanup, and scenario coverage. The reviewable evaluation dataset includes recruiter questions, missing qualifications, citations, CoreTV public/private scope, actions, prompt injection, and physical interruption checks. |
| 23 — Model/cost/health controls | An authenticated comparison path only accepts configured provider/model pairs. Provider attempts record first-token time, total time, success/error category, and Anthropic usage where available. Daily MongoDB reservations are atomic across instances, count failed/cancelled attempts, and guard each provider attempt. The normal TTS route has an additional daily character cap. The workspace shows usage and recent fallback/model health. No automatic benchmark or unverified “best model” claim is made. |
| 24 — Visible editable memory | Preferences now show saved device topics, allow editing, adding, and deleting them, and retain the six-topic bound. Editing rotates the recall epoch, clears active conversation/handoff, and prevents prior server history from silently restoring removed topics. Memory remains off by default. The UI explains that operational/security logs are separate from optional conversational recall. |
| 31 — Admin AI workspace | `AIStudio.tsx` compares two configured models/prompt variants, previews validated actions without executing them, inspects supporting sources, records good/bad answer feedback and review notes, displays recent provider health, and has an explicit speech first-byte timing test. Opening the workspace makes no provider call. |

## Integration

Embed the default export from `web/src/components/admin/AIStudio.tsx` in the authenticated dashboard; it takes no props. It uses authenticated `GET/POST /api/admin/ai-studio`. Comparisons use `/api/chat` with an `adminComparison` object; the server separately authenticates it and rejects models absent from its configured list. Comparisons bypass the public per-IP chat limit but still consume the global daily reservation budget. Returned site actions are reviewed as JSON and never dispatched from the admin workspace.

Optional server configuration:

- `AI_DAILY_TOKEN_CAP`: defaults to **5,000,000 conservative reservation units per UTC day**. Units count UTF-8 text input bytes, tool overhead, a conservative image allowance, and maximum output tokens. These are upper-bound budgeting units rather than actual provider token totals or a dollar invoice. Review this default against expected traffic before rollout; large system prompts consume reservations quickly.
- `AI_DAILY_VOICE_CHAR_CAP`: defaults to **100,000 characters per UTC day** on `/api/voice/tts`, in addition to its existing per-IP limit. Existing cached tours/farewell endpoints retain their current behavior.
- `ANTHROPIC_VOICE_MODEL`: optional; retains the existing `claude-haiku-4-5-20251001` default. Existing `ANTHROPIC_MODEL`, `OPENAI_MODEL`, and `OPENROUTER_MODEL` configuration remains authoritative. Model comparisons use those configured defaults, not invented API identifiers.

New MongoDB collections: `assistant_budget`, `assistant_voice_budget`, `assistant_health`, and `assistant_feedback`. Health entries carry a 30-day expiry; the authenticated workspace initializes the TTL index. Feedback is deliberately retained for admin review. No changes to `db.ts` were required.

## Validation

- `npx tsx --test scripts/assistant-modernization.test.ts scripts/portfolio-experience.test.tsx`: **23 passed** (13 new + 10 baseline).
- Targeted ESLint: new modules and API routes pass. `ChatPanel.tsx` has four pre-existing warnings (unused state and effect/callback dependency warnings), with **no errors** after repairing its Typewriter component's render-time ref write and synchronous effect reset. VoiceMode and the new microphone component pass.
- Full `npx tsc --noEmit`: **passed** after the concurrent integration fixes.
- The streaming endpoint and pinned model parameters were checked against [ElevenLabs' streaming API](https://elevenlabs.io/docs/api-reference/text-to-speech/stream); that documentation states `language_code` overrides are unsupported for multilingual_v2, so translated text drives language selection. Structured tool handling follows [Anthropic's tool-use documentation](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview).

## Review limits

No paid provider calls, production data changes, full production build, or deployment were performed by this agent. Provider answer quality, actual comparative timings, physical microphone/device switching, and mid-speech interruption still need an explicit review session. MSE support varies by browser; unsupported browsers retain full-buffer speech playback. Streaming captions use estimated word timing, not forced alignment. Speech begins once answer text is ready and audio bytes arrive; sentence-by-sentence overlapping LLM/TTS generation is not implemented. Source cards are catalog validation, not automated factual entailment scoring. The spend controls are conservative input/output reservations and character caps; they are not provider-billing reconciliation or hard dollar limits.


## Critical integration review follow-up

- Raised the default reservation cap from 500,000 to 5,000,000. The existing system-prompt source block alone is about 44,418 UTF-8 bytes before CMS/history, so the earlier default could block normal traffic after only a handful of answers. The explicit environment override and atomic admission control remain.
- Both incoming request aborts and downstream response-body cancellation now abort upstream generation. Anthropic automatic SDK retries are disabled so the explicit, reserved fallback chain is the sole retry layer. TTS body relay cancellation explicitly aborts the fetch.
- Reviewed the actual server recall query: it requires the exact `memoryEpoch` in addition to serial/session and cutoff. Topic edits rotate that epoch and clear handoffs; storage-event subscriptions now also clear stale text/voice history in other tabs. Operational logs are not represented as physically deleted.
- MSE setup failure can fall back only while the response body remains unread. Once audio consumption/playback starts, an error stops the stream and reports unavailable; it never replays the entire reply. Tests exercise setup fallback and an error after audio starts.
- Expanded structured navigation to existing gallery/terminal/status/CoreTV routes and public client/employer records. Compatibility markers now pass a bounded known-action validator; malformed paths, selectors, slider values, themes, and form payloads are removed. Existing legitimate tours, gestures, and editable cards remain supported. All delayed legacy callbacks now check the active request/epoch before firing, and automatic markdown navigation rejects private/external destinations.
- Chat configuration PUT preserves `_version`, maps concurrent-save errors to HTTP409, and returns the fresh saved configuration. Dashboard must adopt that returned version after saving.
- Read-only AdminWorkspace review reported direct site-content PUT/status-check bypasses and unchecked identity mutations to the parent; the parent reported correcting those paths.
- Follow-up checks: 23 tests pass; full TypeScript passes; targeted lint has zero errors (four inherited ChatPanel warnings). No paid provider calls were made.


## Dashboard AI save audit

- Both chat-configuration save buttons share the checked admin save boundary, preserve and adopt returned `_version`, retain errors visibly, and preserve newer input typed while a request is in flight. They no longer perform a second GET that could race another editor. Chat rate-limit clear actions are checked and update the list only after success.
- AI routing-condition save/delete now check HTTP/network failures, release busy state in `finally`, retain failed edit forms, display errors inside the modal, and offer initial-load retry. Successful saves adopt the server-returned condition; original creation dates are preserved on edits.
- AIStudio catches feedback transport errors, preserves notes, prevents overlapping feedback actions, shows saved answer text, exposes a configuration refresh/retry, and explains missing provider configuration. Its initial comparison selects different configured models when available. It rejects private page context before initiating a test and guards old voice-test completion from clearing a new operation's busy state.
- Full TypeScript passes. No live provider calls were made during this audit.

## Deterministic microphone and cancellation follow-up

- Extracted the actual MicrophoneTest browser-resource lifecycle into `microphone-test-session.ts`, shared by the UI and simulated-device tests. Permission rejection from an old attempt cannot stop a newer input; late permission grants stop their tracks; pending AudioContext resume, device scans, frame callbacks and recorder callbacks cannot revive a stopped/unmounted session.
- Device changes refresh the selector. Removing the selected microphone stops its capture, resets selection to System default and gives clear recovery guidance. Enumeration failure does not block an otherwise working meter. Recording failures are visible and release resources; stop/unmount cancel timers, detach recorder listeners, stop tracks, close audio context and pause local playback. Delete/unmount revoke recording URLs.
- VoiceMode now checks cancellation after enumeration and audio-context resume. Input switch/pause/close aborts pending server transcription, discards late local/server transcript results, clears queued speech-recognition sends and prevents old recognition callbacks from restarting capture.
- Streaming speech cancellation clears event handlers and ignores queued start/progress callbacks, preventing a cancelled reply from updating playback state.
- Validation: 23 assistant tests pass (10 new microphone/playback cases), full TypeScript passes, targeted lint passes. These are deterministic simulations of browser permission/device/audio APIs, not tests of a physical microphone, real browser permission prompts, actual speakers, codec compatibility, live speech recognition or provider latency. No microphone access or provider calls were made.

- Independent review follow-up: old VoiceMode recorder data callbacks are guarded and detached; microphone setup failures immediately release acquired resources; intentional speech aborts suppress unavailable/error and deferred start actions; default-device track ending stops the test with recovery guidance (covered by an added simulation).

## Main voice input follow-up

- Browser SpeechRecognition now uses the chosen conversation language. Network, service, permission and startup failures switch once to the existing recorder/local-Whisper path instead of silently looping. Normal silence can restart recognition with a short backoff; pause/close cancels queued restarts and ignores stale transcripts. An explicitly selected microphone continues to use getUserMedia with its exact device ID and recorder transcription, since browser SpeechRecognition cannot reliably target that device.
- Main voice capture now observes ended tracks, releases resources and offers retry/another input. The selector remains available with one input or a stale selection so System default is reachable. Resuming the conversation explicitly stops the local microphone test before reacquiring input. Starting a mic test clears the interrupted send guard.
- Recorded utterances own their chunks, cap capture at 30 seconds and preserve short valid audio rather than dropping recordings below an arbitrary 2KB. Recorder construction/start failures show recovery guidance. Local successful silence never triggers paid fallback; failures use checked server transcription, whose HTTP/malformed-response errors are visible rather than silently treated as silence. Cancelled local work cannot trigger an old server request or send an old transcript.
- Server STT now rejects empty/oversized clips, propagates request cancellation, times out upstream work after 25 seconds, and returns controlled errors for transport/malformed responses. The configured STT model and pinned TTS voice/model remain unchanged.
- All chat-component and voice-route lint findings were fixed without rule suppression: external-store snapshots for browser capabilities/rate-limit state, proper callback dependencies, reusable tour invalidation and unused-state/import removal.
- Validation: 30 assistant regression tests pass, including 7 new main-voice tests using simulated recognizers/recorders/transcription responses. Owned lint passes with zero warnings. Physical audio, browser speech-service availability, recognition quality and live providers remain untested here; initial local Whisper download can take time and codec/service support varies by browser.
- Reference checks: https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognitionErrorEvent/error and https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/ended_event (service-error recovery and track-ended lifecycle semantics).

## Browser permission waiting state

- Main voice mode and the local microphone test now explicitly say when getUserMedia is waiting for permission, explain where to choose Allow/check site settings, and offer cancellation. Main voice cancellation pauses input, with Resume microphone available to retry; the test returns to Enable microphone after cancellation.
- Waiting is a real pending state, not a fabricated timeout or denial. It clears on success/error/cancel. A late grant from a cancelled attempt stops its tracks and cannot clear or reactivate a newer attempt. Added a deterministic pending/cancel/retry regression; 31 assistant tests pass and TypeScript/owned lint pass.
- Parent browser verification reached getUserMedia pending with permission state prompt. The automated browser exposed no permission prompt and did not support Browser.setPermission; no permissions were bypassed. A physical microphone/permission-completed speech round trip is still unverified.
- Final browser cancellation follow-up: permission guidance is rendered outside AnimatePresence, so an exit animation cannot retain a stale waiting/cancel notice. Cancel, Pause, microphone-test start and Close explicitly clear pending state; Resume starts the capture effect again with a new request.
