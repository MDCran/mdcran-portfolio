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

# LogoKit — brand logos for the home page AI tools / tech stack grids
NEXT_PUBLIC_LOGOKIT_TOKEN=pk_...   # publishable key from logokit.com, safe client-side
```

The chat tries Claude (Anthropic SDK, streaming + prompt caching) first, then
OpenRouter, then OpenAI. If none are set it returns a "not configured" response.
The assistant can also drive the UI — it emits invisible directives that the
frontend executes: navigate, highlight, zoom-and-focus, glassmorphism emphasize,
and reset. The voice controls (speaker toggle, mic, and the full **Voice mode**
overlay with the audio-reactive circle + live transcription) only appear when
`ELEVENLABS_API_KEY` is configured. Live voice transcription uses the browser's
SpeechRecognition API (Chrome/Edge/Safari); replies are spoken via ElevenLabs.

## Terminal

Open `/terminal` and press **Turn On TV**. `help` lists the supported commands.

- Browse: `ls`, `pwd`, `cd engineering`, `cd ..`, `home`, `projects`, `articles`, `clients`, `featured`, `about`, `resume`.
- Find content: `search "Coretex"`, then `select 1` or the result number. `open "Portfolio Website"` opens a title directly; `nano` aliases `open`.
- Contact: `contact` starts a draft. Fill it with `set name "Jane Doe"`, `set email jane@example.com`, `set subject "Project inquiry"`, and `set message "Your message"`. `send` submits; `cancel` discards. `subscribe` and `unsubscribe` also support drafts. Direct arguments remain supported as described by `help`.
- Integrations: `spotify`, `visitors`, `browse example.com`; `browse` again closes the browser. Sites that block embedding must be opened using the external link.
- AI: `ask What is Coretex?` or `ai What AI projects has Michael built?` streams the portfolio assistant's answer with source links. Follow-ups retain context for this terminal session. `stop` or Ctrl+C cancels; `ai clear` resets the AI conversation. AI output never executes terminal commands.
- Modes: `mode ai` accepts natural-language questions without a prefix. `mode agent` also lets the assistant open published project evidence and resume sections, with a visual pointer. `mode shell` returns to commands. `/help` works in every mode. Agent actions are limited to loaded public content; they do not submit forms, browse arbitrary URLs, or control the operating system.
- Resume: `resume` pulls the full published timeline, education, skills, certifications, and awards. Narrow it with `resume summary`, `resume experience`, `resume education`, or `resume skills`. `resume download` offers the configured PDF when available and a print/save-PDF view.
- Recruiters: `recruiter` shows the quick command guide. `recruiter projects React` and `recruiter skills AI` find engineering evidence. `recruiter fit <role or job description>` asks the assistant to compare published evidence and identify gaps. `recruiter contact` opens contact/resume links without sending anything.
- Guided tour: `tour`, `tour next`, `tour back`, and `tour stop`, or the visible Back/Next buttons. `highlight <phrase>` marks displayed text; `highlight clear` resets it. `cursor on|off` controls the assistant pointer.
- Workspace: `window float` opens a resizable window; drag its lower-right handle or focus the handle and use arrow keys. `window size 1000 700`, `window max`, `window reset`, and `window crt` also work. Small screens use the window layout automatically.
- Personality: `pet cat|bot|crab|off` chooses an animated terminal companion; click it to say hello. `animations scan|type|off` changes text reveals. Both preferences persist locally; reduced-motion settings take precedence over animation.
- Audio: `togglemusic` and `togglekeystrokeclicks` toggle the soundtrack and typing/output clicks independently. Both accept `on` or `off`, and save the preference on this device when storage is available.
- Games: `snake` and `pacman`; use arrows/WASD or the on-screen controls. P/Space pauses, and switching away pauses automatically. Escape leaves the game first. Pac-Man preserves score and remaining lives between cleared levels, speeds up each round, and saves its best score. Snake includes powerups, increasing speed, a saved best score, and a full-board finish.
- Utilities: `reload` retries or refreshes portfolio data, `clear` clears output, `togglebackground` changes the backdrop, `exit` powers off.

The command field focuses after startup. Typing while viewing output returns focus to it; selecting text or using other controls keeps their normal behavior. Unfinished input survives focus changes. Tab accepts a displayed completion, otherwise moves through controls. Up/Down navigates command history, or numbered results when the command input is empty. Quote command arguments containing spaces; unclosed quotes are rejected before submission. Natural-language AI questions do not require quoting.

Search ranks exact titles first, matches multiple words, and includes project notes, tags, related clients, articles and videos. Click a result, select it with arrows/Enter, or type its number.

Run `npm run test:terminal` for parser, navigation, submission, AI streaming/cancellation, search, browser-address and game-board regression tests. Submission tests use mocked responses and never send real messages.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
