# mdcran-portfolio

[![Security checks](https://github.com/MDCran/mdcran-portfolio/actions/workflows/security-checks.yml/badge.svg)](https://github.com/MDCran/mdcran-portfolio/actions/workflows/security-checks.yml) [![CodeQL](https://github.com/MDCran/mdcran-portfolio/actions/workflows/codeql.yml/badge.svg)](https://github.com/MDCran/mdcran-portfolio/actions/workflows/codeql.yml)
The Next.js application behind [mdcran.com](https://mdcran.com), built and maintained by Michael Cran. It brings portfolio content, a professional resume, AI chat and voice integrations, and operational tools into one web application.

[Engineering overview](https://mdcran.com/engineering) · [Live site](https://mdcran.com) · [Resume](https://mdcran.com/resume)

## Engineering overview

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS, and Framer Motion.
- **Data:** MongoDB-backed portfolio content, resume data, and application records.
- **Integrations:** server-side streaming AI chat, speech endpoints, GitHub activity, and contact/booking workflows.
- **Assets:** Cloudflare R2 through the S3-compatible SDK, with a separate CDN domain.
- **Delivery:** Vercel hosting and GitHub Actions security workflows.

## Review the source

| Area | Entry point |
| --- | --- |
| Server-rendered engineering overview | [web/src/app/engineering/page.tsx](web/src/app/engineering/page.tsx) |
| Interactive portfolio and resume | [web/src/components](web/src/components) |
| API routes and service integrations | [web/src/app/api](web/src/app/api) |
| Content access and persistence | [web/src/lib/db.ts](web/src/lib/db.ts) |
| Asset storage | [web/src/lib/r2.ts](web/src/lib/r2.ts) |
| Security workflows | [.github/workflows](.github/workflows) |

## Local development

Use Node.js 24 and npm. From the `web` directory, install dependencies with `npm ci`, configure a git-ignored `.env.local`, and start the application with `npm run dev`. The development server runs at `http://localhost:4000`.

`MONGODB_URI` is required for content access. Integration-specific environment variables and setup details are listed in [web/README.md](web/README.md). Supply your own credentials; production secrets and customer data are excluded from the repository. Use an isolated development database for local work.

Run `npm run build` for a production build and `npx tsc --noEmit` for TypeScript verification. The public engineering page links to separate repositories for Coretex, Core AI, and Health Tracker.

## App screenshots

These captures show the portfolio running across its main public experiences.

### Home

![mdcran portfolio home page](docs/screenshots/home.png)

### Featured work

![mdcran portfolio featured work grid](docs/screenshots/featured-work.png)

### Clients

![mdcran portfolio clients directory](docs/screenshots/clients.png)

### Article

![mdcran portfolio article page](docs/screenshots/article.png)

### Theme variant

![mdcran portfolio green theme variant](docs/screenshots/theme-variant.png)
