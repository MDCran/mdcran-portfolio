This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started!

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment Variables

Create a `.env.local` file (git-ignored) with the keys you need:

```bash
# Database
MONGODB_URI=...
MONGODB_DB=...

# Admin auth
JWT_SECRET=...
ADMIN_PASSWORD_HASH=...   # or ADMIN_PASSWORD

# AI chat assistant — Claude (Anthropic) is primary; OpenRouter/OpenAI are fallbacks
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-4-7    # optional; e.g. claude-haiku-4-5 for a faster/cheaper widget
OPENROUTER_API_KEY=...             # fallback (defaults to a Claude model)
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet  # optional fallback model
OPENAI_API_KEY=sk-...              # optional fallback
OPENAI_MODEL=gpt-4o-mini           # optional fallback model

# ElevenLabs voice (TTS replies + microphone speech-to-text)
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...            # optional, defaults to the "Rachel" voice
ELEVENLABS_MODEL=eleven_turbo_v2_5 # optional TTS model
ELEVENLABS_STT_MODEL=scribe_v1     # optional STT model

# GitHub contributions calendar (home "By the Numbers" section)
GITHUB_TOKEN=ghp_...               # PAT with read access to contributions
GITHUB_USERNAME=mdcran             # optional, defaults to mdcran
```

The chat tries Claude (Anthropic SDK, streaming + prompt caching) first, then
OpenRouter, then OpenAI. If none are set it returns a "not configured" response.
The assistant can also drive the UI — it emits invisible directives that the
frontend executes: navigate, highlight, zoom-and-focus, glassmorphism emphasize,
and reset. The voice controls (speaker toggle, mic, and the full **Voice mode**
overlay with the audio-reactive circle + live transcription) only appear when
`ELEVENLABS_API_KEY` is configured. Live voice transcription uses the browser's
SpeechRecognition API (Chrome/Edge/Safari); replies are spoken via ElevenLabs.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
