# My Day: working rules for Claude Code

Personal web app for one user (Juan), installed on his iPhone home screen. It turns Google
Calendar, Gmail, typed and spoken input into one daily plan placed around his energy and
priorities. Full spec: `docs/SPEC.md`. Design reference: the canvas
[My Day: home screen explorations](https://claude.ai/artifact/EkCWebA7XSC2d12np4firf),
pages "R2 minimal calm" (Today) and "App screens" (everything else).

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 App Router, TypeScript, Turbopack |
| UI | Tailwind v4, palette as `@theme` tokens in `src/app/globals.css`, Roboto 300 and 400 only |
| Home-screen app | `src/app/manifest.ts`, `public/sw.js`, display standalone, icons from `public/icon.svg` |
| Auth | Auth.js (next-auth v5) Google provider, one allowed email, JWT sessions, no DB adapter |
| Database | Postgres, Prisma 7 with the `@prisma/adapter-pg` driver adapter |
| Hosting | Railway: web service + Postgres (worker service from milestone 2) |
| AI | Mistral behind `src/lib/ai` (milestone 5), never called directly from features |
| Tests | `node --test` now; Vitest for the scheduler and parsers from milestone 3, Playwright later |

## Commands

```bash
pnpm db:up          # local Postgres in Docker (host port 5433, see docker-compose.yml)
pnpm dev            # dev server on http://localhost:3000
pnpm build          # production build, also type checks
pnpm lint
pnpm test           # node --test over src/**/*.test.ts
pnpm db:migrate     # prisma migrate dev
pnpm db:studio
pnpm icons          # regenerate the PNG icons from public/icon.svg
```

Host port 5432 is taken by another project, so local Postgres listens on **5433**.
Prisma reads `DATABASE_URL` from `.env.local` through `prisma7.config.ts`.

## Environment

`.env.example` lists every variable. Local values live in `.env.local` (never committed);
production values are Railway variables, with `DATABASE_URL` referencing the Postgres service.
`TOKEN_ENCRYPTION_KEY` and `AUTH_SECRET` are 32 random bytes, base64 (`openssl rand -base64 32`).

## Working rules

- One branch and one pull request per milestone; Juan reviews and merges. Never merge yourself.
- Do not start the next milestone until Juan asks.
- Ask Juan for any value you need (API keys, calendar names, times) instead of inventing one.
- Tests for the scheduler and the extraction parser before UI work on them.
- Secrets never leave `.env.local` and Railway: never log them, never commit them, never send
  the refresh token to the browser.
- Only `ALLOWED_EMAIL` may sign in; every API route checks the session.
- Google scope limits: Calendar create-only (no edits, no deletes), Gmail read-only, never send mail.
- Email text goes to Mistral only for extraction; store the fields plus a quote of at most
  200 characters, never full bodies. Audio is discarded right after transcription.
- Keep the AI provider behind `src/lib/ai` so models can change without touching features.
- Scheduling stays plain TypeScript, a pure function `plan(day, items, settings, rules)`.
- Build and lint after each step; fix errors before reporting done.

## Design rules

- Roboto 300 for headlines and numbers, Roboto 400 for body. No other font, no other weights.
- Tokens only, from `globals.css`: `navy #243A63` text, `muted #56647D`, `sky #D5E1F5`,
  `surface #F4F7FC`, `line #E3EBF8`, `divider #EAF0FA`, `mid #8AA9DE`, `accent #4A6FAE`,
  `peak #A3BDE8`. Cards: white, 1px `line` border, radius 22px. Pills: fully rounded.
- Calm by design: few elements, generous spacing, no badges or streaks that pull you back in,
  nothing that grabs attention. Touch targets at least 44px.
- Reuse existing components and tokens before adding new ones.

## Layout

```
src/app/            layout, globals.css, manifest.ts, page.tsx (Today), signin/, api/auth/
src/components/     shared UI
src/lib/            prisma.ts, crypto.ts (AES-256-GCM for the refresh token)
src/generated/      Prisma client, generated, not committed
prisma/             schema.prisma and migrations
docs/SPEC.md        the build spec, the source of truth
```

## Milestones

1. **Skeleton** — done: Next.js, Tailwind tokens, Roboto, manifest and service worker, Prisma
   with the full data model, Auth.js Google sign-in limited to one email, empty Today screen,
   Railway config.
2. Calendar sync with a worker service. 3. Manual input and scheduler. 4. Settings and
   onboarding. 5. Gmail and Review with Mistral. 6. Rules. 7. Notifications and the day loop.
8. Insights and hardening. See `docs/SPEC.md` for each one's "done when".
