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
| Hosting | Railway: web service, worker service and Postgres, declared in `.railway/railway.ts` |
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
pnpm worker         # the sync worker loop (needs APP_URL and WORKER_SECRET)
```

Trigger a sync by hand while the dev server runs:

```bash
curl -X POST -H "x-worker-secret: $(grep '^WORKER_SECRET=' .env.local | cut -d'\"' -f2)" \
  http://localhost:3000/api/sync
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
- Railway configuration lives in `.railway/railway.ts` (Infrastructure as Code; `railway.json`
  is gone and stops being read on 2026-12-01). Change a service there, then
  `railway config plan` and `railway config apply`. Variables stay unmanaged: they live in
  Railway, never in the repo.
- Settings fields are declared once in `src/lib/settings-spec.ts` and rendered by
  `SettingsFields`, which both the settings screens and the onboarding steps use, so an answer
  given in onboarding is the same saved setting.
- Settings save through `saveSection` in `src/lib/settings.ts`: Zod-validated, merged into the
  JSON column, with a `settings_history` row per change. Never write those columns directly.
- `GET /api/sync` with the worker secret reports the commit, the day as the screens see it and
  every settings value: use it to tell a stale screen from empty data.
- A module that a `node --test` file imports uses relative imports with the `.ts`
  extension (`../day.ts`); Node cannot resolve the `@/` alias. App-only modules use `@/`.
- Delete removes only what My Day created: typed or spoken items, and events it inserted into
  Google Calendar, which it also deletes there. Ownership is `items.createdHere` plus the
  "Added in My Day" marker on the Google event. Everything else answers "Delete this in Google
  Calendar". The rule is pure and tested in `lib/plan/deletable.ts`.
- Only the composer's Calendar button may create a Google Calendar event. A line of text or a
  voice note never writes to Google, and the model is never allowed to choose that type.
- The model may not invent a time: a draft's time comes from the deterministic parser, and a
  timed type without a time becomes a task.
- A quote shown to Juan is always a line the email really contains: `bestQuote` keeps an exact
  copy, recovers the closest real line from a paraphrase, and otherwise shows none.
- Pre-filters run before every AI call, so a newsletter never reaches the model, and an
  `ignore_sender` rule joins them.
- A rule is proposed, never imposed: a suggestion is stored inactive and changes nothing until
  Juan accepts it in Learned rules. Rules Juan asked for by name are seeded as `origin: stated`
  by `ensureStatedRules`, so they are visible and switchable rather than hidden in the code.
- Auto-add stays off: every candidate goes through Review.
- Never widen the Google scopes to make an API call work. `calendar.events` cannot list the
  calendar list, so the sync reads the calendars in `sources.calendarIds`, default `primary`.

## Screens first

`docs/design/` holds the 24 approved screen designs plus a README that explains the
`.dc.html` format. They are the source of truth for layout, colour, type, spacing, copy and
interactions. Where a design and `docs/SPEC.md` disagree on how a screen looks, the design
wins; on data, behaviour or security, the spec wins (so S7's "OpenAI" and "STRATO" read as
Mistral and Railway in the app).

All 24 screens are built. Real synced calendar events fill Today; everywhere else the
design's sample content stands in until its milestone lands. The sample data lives in
`src/lib/plan/sample.ts` and `src/lib/plan/sample-screens.ts`, nowhere else, so replacing it
is a per-screen job.

| Screen | Route |
| --- | --- |
| Today, Now and Priority | `/` |
| Add by text (for a phone shortcut) | `POST /api/add` with `{ text }` |
| Add by voice | `POST /api/voice` with an audio file |
| Review | `/review`, candidates from Gmail |
| Review | `/review` |
| Item detail | `/item/[id]` |
| Tomorrow, End of day | `/tomorrow`, `/end-of-day` |
| Insights | `/insights` |
| Empty day, Connection lost | `/empty-day`, `/connection-lost` |
| Onboarding O1 to O7 | `/onboarding`, `/onboarding/connect` … `/onboarding/ready` |
| Settings S0 to S8 | `/settings`, `/settings/rhythm` … `/settings/profile` |
| Privacy policy (public) | `/privacy` |

Shared UI lives in `src/components/ui.tsx` (cards, rows, chips, headers, links) and
`src/components/controls.tsx` (switch, choice pills, range, time). Reuse them before writing
new markup. The settings screens are driven by data: add a field to `src/lib/settings-spec.ts`
and `SettingsScreen` renders and saves it.

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
src/app/            layout, globals.css, manifest.ts, page.tsx (Today), signin/, api/
src/components/     shared UI
src/lib/            prisma.ts, crypto.ts, day.ts, today.ts, settings*.ts
src/lib/plan/       types, energy curve, formatting, view maths, sample data, db conversion
src/lib/google/     client.ts, calendar-sync.ts, map-event.ts (+ tests)
worker/             index.mjs, the worker service: node-cron calling /api/sync
src/generated/      Prisma client, generated, not committed
prisma/             schema.prisma and migrations
docs/SPEC.md        the build spec, the source of truth
```

## Milestones

1. **Skeleton** — done: Next.js, Tailwind tokens, Roboto, manifest and service worker, Prisma
   with the full data model, Auth.js Google sign-in limited to one email, empty Today screen,
   Railway config.
2. **Calendar** — done: encrypted-token Google client, calendar sync with sync tokens and a
   dated window fallback, `/api/sync`, the worker service, Today strip and lists from real
   events, Connection lost banner.
3. **Manual input and scheduler** — done: `lib/scheduler/plan.ts` is the pure scheduler,
   `lib/parse/input.ts` the deterministic parser, `lib/ai/parse.ts` the Mistral parse,
   `/api/voice` the Voxtral path, `lib/plan/add.ts` the add and correction writes, and
   `lib/plan/run.ts` runs the plan and stores each placement with its reason. Corrections
   persist to the corrections table. 4. Settings and onboarding (screens and persistence
   exist; the scheduler already reads rhythm, work, focus and priorities). 5. **Gmail and Review** — done: `lib/google/gmail-sync.ts` syncs with a history token and falls
   back to a dated search, `lib/parse/email.ts` strips quoted replies and signatures and filters
   newsletters, promotions and ignored topics before any AI call, `lib/ai/extract.ts` asks
   Mistral for the fixed JSON shape and validates it with Zod, and `lib/plan/candidates.ts`
   turns candidates into items. Review and item detail read real data. 6. **Rules** — done: `lib/rules/suggest.ts` turns three of the same correction on similar items
   into a proposal, `lib/rules/store.ts` writes and reads them, the Learned rules screen accepts,
   declines, toggles and resets, and accepting one re-plans at once. Rules apply in the scheduler
   (extra minutes, category, rank) and in Review (ignored senders, priority people). 7. **Notifications and the day loop** — done: `lib/push/due.ts` decides what is due,
   `lib/push/send.ts` sends it with VAPID, the service worker shows it and opens the right
   screen, the permission button sits in Notifications settings, and the worker runs it after
   every sync. End of day saves to `day_reviews` and carries items over; Tomorrow runs the
   scheduler for the next day.
8. **Insights and hardening** — done: `lib/insights/week.ts` computes the five measures from
   the week's own rows, Insights reads them, the trust answer saves with the ratings, export
   covers every table, Delete removes every row and signs out, Today shows the empty-day state
   and redirects to Connection lost when Google drops.

Backups: the worker writes the whole database as JSON to `BACKUP_DIR` at 03:30 and keeps 14
days. The volume is not created yet, so set it up once:

```bash
railway volume add --service worker --mount-path /data
railway variables --service worker --set "BACKUP_DIR=/data"
```

Railway's own point-in-time recovery is the stronger option (`railway postgres pitr enable`),
but it needs a bucket wired and may cost; that is Juan's call.
