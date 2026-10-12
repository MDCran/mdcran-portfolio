# Portfolio application

The Next.js application behind [Michael Cran's portfolio](https://mdcran.com/). See the [repository overview](../README.md) for screenshots, source navigation, and verification notes.

## Getting started

Run these commands from `web/` after configuring your development MongoDB connection below:

```bash
npm ci
npm run dev
```

Open [http://localhost:4000](http://localhost:4000). The development script uses webpack and port 4000. The home page is [src/app/page.tsx](src/app/page.tsx).

## Environment variables

Create a git-ignored `.env.local` in this directory. Use your own development database and credentials; the deployed portfolio's data and service access are not included.

```dotenv
# Database (required for content-backed pages)
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=mdcran_dev

# Admin authentication
JWT_SECRET=replace-with-a-unique-development-secret
ADMIN_PASSWORD_HASH=replace-with-your-password-hash
# ADMIN_PASSWORD is also supported; prefer a hash.

# Optional Anthropic chat
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=

# Optional providers used when ANTHROPIC_API_KEY is absent
OPENAI_API_KEY=
OPENAI_MODEL=
OPENROUTER_API_KEY=
OPENROUTER_MODEL=

# Optional ElevenLabs voice services
ELEVENLABS_API_KEY=
ELEVENLABS_STT_MODEL=scribe_v1

# Optional GitHub contributions display
GITHUB_TOKEN=
GITHUB_USERNAME=mdcran

# Optional LogoKit browser-visible publishable token
NEXT_PUBLIC_LOGOKIT_TOKEN=
```

Keep secrets out of Git. Values prefixed with `NEXT_PUBLIC_` are exposed to the browser and must not contain private credentials. Production admin authentication requires an explicitly configured `JWT_SECRET`.

### Chat and voice behavior

When `ANTHROPIC_API_KEY` is set, [the chat route](src/app/api/chat/route.ts) uses Anthropic and its model fallback chain. If that key is absent, configured OpenAI is tried before OpenRouter. An Anthropic error does not switch to those other providers. With no provider key, chat returns a not-configured response.

Chat can emit interface directives for navigation, highlighting, and focus. Review the application source when extending that behavior.

[Voice mode](src/components/chat/VoiceMode.tsx) uses browser speech recognition where supported, or a recording path that tries local transcription before the server transcription fallback. Availability depends on the browser, microphone permission, and configured services.

The [speech-to-text route](src/app/api/voice/stt/route.ts) uses `ELEVENLABS_STT_MODEL`, defaulting to `scribe_v1`. The [text-to-speech route](src/app/api/voice/tts/route.ts) pins its voice and model in source; `ELEVENLABS_VOICE_ID` and `ELEVENLABS_MODEL` do not configure that route. Reusing it requires a voice you are authorized to use and corresponding service access.

## Development checks

```bash
npm run lint
npm run test:rizz
npm run build
```

`test:rizz` is a focused test file, not a full application test suite. Optional integrations require their own configuration and runtime verification. See the root [quality and security notes](../README.md#quality-and-security-checks) for the actual CI coverage.

## Framework references

Originally bootstrapped with [create-next-app](https://nextjs.org/docs/app/api-reference/cli/create-next-app). The application uses [next/font](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) and Geist.

- [Next.js documentation](https://nextjs.org/docs)
- [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying)
