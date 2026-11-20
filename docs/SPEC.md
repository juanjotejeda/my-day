# My Day: build spec v1

Nov 20, 2026 · @Juan Tejeda

## Goal and scope

My Day v1 is a personal web app, installed on Juan's iPhone home screen, that turns Google Calendar, Gmail, typed and spoken input into one daily plan placed around his energy and priorities. It serves one user, reads Gmail, reads Google Calendar and adds the events Juan creates in My Day, and exists to test whether Juan prefers it over assembling the day from separate apps, with learnings feeding Attena.

In v1:

- Today screen with the Now and Priority views, energy strip, add bar (text and voice), adjust sheet
- Onboarding, Review queue, item detail, Tomorrow, end-of-day review, Insights
- Settings: rhythm and energy, work and focus, priorities and protected time, notifications, sources, learned rules, privacy, profile
- Google Calendar (read, and create new events) and read-only Gmail, extraction with Mistral, deterministic scheduling, web push

Out of v1: sending email, editing or deleting existing calendar events, Telegram, WhatsApp, Big Five, multiple users, native iOS build.

Design reference: the canvas [My Day: home screen explorations](https://claude.ai/artifact/EkCWebA7XSC2d12np4firf), pages R2 minimal calm (Today) and App screens (all other screens). Style: Roboto 300 and 400 only, palette built on #D5E1F5, navy #243A63 text.

## Decisions

| Topic | Decision | Why |
| --- | --- | --- |
| Hosting | Railway (Hobby plan), one project: web app, worker, Postgres | Fastest path, already used for the dashboard and FocusFlow. STRATO VPS stays an option once the experiment proves itself |
| Domain | Subdomain on the STRATO domain pointed at Railway, e.g. myday.yourdomain.de | Keeps the domain at STRATO, no server work |
| App type | Home-screen web app (PWA). TestFlight later only if a hard limit appears | Home-screen icon, full screen and web push without Apple review or Xcode |
| AI provider | Mistral: chat with JSON schema output for extraction, Voxtral for voice transcription | Same European provider direction as Attena, so learnings transfer |
| Google access | Calendar: read all events and create new ones (calendar.events); never edit or delete existing events. Gmail: read-only (gmail.readonly) | Juan chose Calendar write access in v1; email is never sent |
| Scheduling | Plain TypeScript rules, no AI | Predictable, testable, explainable |
| Users | One allowed Google account | Personal experiment |

## Setup checklist

Juan does these by hand before or during milestone 1; everything else Claude Code builds.

- [ ] GitHub: create the private repo my-day
- [ ] Railway: Hobby plan, new project my-day with three services: web (Next.js), worker (sync and notifications), Postgres
- [ ] STRATO DNS: CNAME myday → the Railway domain shown in the web service settings; add the custom domain in Railway, HTTPS is automatic
- [ ] Google Cloud: new project My Day; enable Google Calendar API and Gmail API
- [ ] Google consent screen: External; app name My Day; scopes openid, email, profile, calendar.events, gmail.readonly; add a privacy policy URL (a page in the app is enough)
- [ ] Google consent screen: press Publish app so the status is In production. Testing mode expires refresh tokens after 7 days
- [ ] Google credentials: OAuth client ID, type Web application; redirect URIs for localhost and the production domain
- [ ] First sign-in: accept the unverified app warning (Advanced, then continue). Fine for under 100 users; verification only matters if My Day gets other users
- [ ] Mistral: create an API key in Mistral AI Studio; set a monthly spend limit
- [ ] Web push: generate VAPID keys once (npx web-push generate-vapid-keys)
- [ ] Railway variables: DATABASE\_URL, AUTH\_SECRET, GOOGLE\_CLIENT\_ID, GOOGLE\_CLIENT\_SECRET, ALLOWED\_EMAIL, TOKEN\_ENCRYPTION\_KEY, MISTRAL\_API\_KEY, VAPID\_PUBLIC\_KEY, VAPID\_PRIVATE\_KEY, APP\_URL, TZ=Europe/Berlin
- [ ] iPhone: open the app in Safari, Share, Add to Home Screen, open from the icon, allow notifications

## Architecture and stack

One Railway project holds the web app, a background worker and Postgres; the phone talks only to the web app.

&#91;embedded content: architecture · 3 Railway services, 3 outside services\]

The web app serves screens and handles input; the worker syncs Google, runs the scheduler and sends push; both read and write Postgres.

| Layer | Choice |
| --- | --- |
| Framework | Next.js (App Router) with TypeScript, server actions and API routes |
| UI | Tailwind with the palette as tokens, Roboto 300 and 400, components rebuilt from the canvas |
| Home-screen app | Web app manifest, icons, service worker (next-pwa or a hand-written worker), display standalone |
| Auth | Auth.js with Google provider, one allowed email |
| Database | Postgres on Railway, Prisma ORM and migrations |
| Validation | Zod for settings, API input and AI output |
| Google | googleapis npm package, Calendar v3 and Gmail v1 |
| AI | @mistralai/mistralai SDK behind lib/ai |
| Jobs | Worker service with node-cron |
| Push | web-push npm library, VAPID |
| Tests | Vitest for scheduler and parsers, Playwright for key flows |

## Data model

One items table holds every kind of entry, so Today, Priority, Tomorrow and Insights read from one place. Every item keeps its source and a link back.

| Table | Key fields | Notes |
| --- | --- | --- |
| users | id, email, name, timezone, locale, created\_at | One row in v1; sign-in refused for any other email |
| settings | user\_id, rhythm (wake, bed, chronotype, peak\_start, dip, second\_wind, learn\_from\_corrections), work (days, start, end, hard\_stop, lunch\_start, lunch\_len), focus (block\_len, break\_len, max\_focus\_h, buffer\_min, meeting\_warn), priorities (clash\_order, vip\_people, topics, ignore\_topics, urgency rules), protected (list of recurring blocks), notifications (times, toggles, quiet hours) | JSON columns validated with Zod; every change writes a settings\_history row |
| sources | id, user\_id, kind (google), encrypted\_refresh\_token, scopes, calendar\_ids, calendar\_sync\_token, gmail\_history\_id, last\_sync\_at, last\_error | Tokens encrypted with AES-256-GCM |
| items | id, user\_id, type (calendar, appointment, reminder, task), title, start, end, fixed, flexible\_duration, rank (must, should, could, protected, later), important, category (work, personal), effort (deep, light, meeting, errand, break), status (planned, done, moved, dropped), day, source\_kind (calendar, gmail, manual, voice), source\_ref, source\_url, source\_quote, reason, created\_at, updated\_at | Calendar rows are upserted by source\_ref; flexible rows get start and end from the scheduler |
| candidates | id, user\_id, gmail\_message\_id, thread\_id, from, subject, received\_at, quote, extracted (JSON), confidence, state (open, accepted, dismissed) | The Review queue; an accepted candidate creates an item |
| corrections | id, user\_id, item\_id, kind (tomorrow, important, more\_time, category, done, moved\_time, dismissed), before, after, created\_at | Raw feedback, the input for rules |
| rules | id, user\_id, text, kind, params (JSON), origin (stated, learned, suggested), evidence\_count, active | Read by the scheduler; shown in Learned rules |
| day\_reviews | id, user\_id, date, done\_count, planned\_count, feeling, plan\_right, carry\_over (JSON) | From the end-of-day screen; feeds Insights |
| push\_subscriptions | id, user\_id, endpoint, keys, created\_at | One per installed device |
| events\_log | id, user\_id, kind, payload, created\_at | Plan accepted, screen opened, sync errors: the raw data for the evaluation |

## Google integration and sync

Sign-in and data access use one Google consent with offline access; the worker keeps Calendar and Gmail in step every 5 minutes.

Sign-in

- Auth.js with the Google provider, access\_type offline, prompt consent on first sign-in so a refresh token is issued
- Only ALLOWED\_EMAIL may sign in; the refresh token goes encrypted into sources
- On invalid\_grant: mark the source as disconnected, show the Connection lost screen, offer Reconnect

Calendar

- First sync: events from 14 days back to 30 days ahead for the calendars ticked in Sources; store the nextSyncToken
- Every 5 minutes: events.list with syncToken, upsert changed events into items (type calendar, fixed true), delete cancelled ones
- On 410 Gone: drop the token and run a full sync
- All-day events become a day banner, not a block. Write: the add bar's Calendar type calls events.insert on the chosen calendar and stores the event id; nothing else writes to Google

Gmail

- First run: messages from the last 14 days (setting: 7, 14 or 30) in the inbox, plus sent mail when that toggle is on; store the latest historyId
- Every 5 minutes: history.list from the stored historyId for messagesAdded; on 404, fall back to a dated search
- Skip by rules before any AI call: newsletters (List-Unsubscribe header), promotions category, ignored senders and topics, messages already processed
- Send only plain text of the newest message in a thread, trimmed of quoted replies and signatures, max 6,000 characters
- Store the extracted fields and a quote of at most 200 characters; never the full body

Worker

- A separate Railway service running a loop with node-cron: sync every 5 minutes, scheduler run after each sync, notification jobs at the times set
- Backoff on Google 429 and 5xx; every error goes to sources.last\_error and events\_log

## Email extraction with Mistral

Mistral reads each new email once and returns a fixed JSON structure; nothing it finds enters the plan until Juan accepts it in Review.

- Endpoint: Mistral chat completions with response\_format json\_schema ([custom structured outputs](https://docs.mistral.ai/capabilities/structured-output/custom_structured_output/)); start with mistral-small-latest, move up a model only if the accuracy measure in Insights stays low
- Wrapper: one module, lib/ai/extract.ts, so the provider stays swappable
- Prompt inputs: today's date and timezone, Juan's name and addresses, VIP people, topics, the email (from, to, date, subject, trimmed text)
- Rules in the prompt: extract only what Juan must do or attend; a promise Juan made counts; a request to someone else does not; no item when nothing is asked
- Validate the response with Zod; on failure retry once, then mark the message as skipped
- Dedupe: same thread and similar title within 7 days = update the open candidate, not a new one

Response schema:

```json
{
  "items": [
    {
      "kind": "task | appointment | reminder | later",
      "title": "short imperative, max 60 characters",
      "due": "ISO date or null",
      "start": "ISO datetime or null",
      "duration_min": "number or null",
      "person": "who asked or is involved",
      "quote": "the exact line it came from, max 200 characters",
      "promise_by_me": "boolean",
      "confidence": "0 to 1"
    }
  ]
}
```

Review queue

- Each candidate shows type, title, sender, subject, date, quote, the suggested slot from the scheduler, Add to plan, Not a task, Open in Gmail
- Add creates an item with source\_kind gmail and source\_url to the message; Not a task logs a dismissal correction
- Auto-add toggle: candidates from VIP people with confidence 0.8 or more skip Review
- Below confidence 0.4: hidden behind a Show low-confidence link

## Text and voice input

The add bar stays pinned on Today; typed and spoken input end in the same review form before anything is added.

Text

- Form fields: type (Calendar, Appointment, Reminder, Task), what, Today or Tomorrow, time for timed types, 15, 30 or 60 min for tasks
- Calendar type creates the event in Google Calendar and stores the returned event id; the next sync keeps both in step
- Free text typed into the field without opening the form goes through the same parser as voice

Voice

- Record in the app with MediaRecorder (audio/mp4 on iPhone), max 30 seconds, upload to /api/voice
- Server sends the audio to the Mistral transcription endpoint ([Voxtral Mini Transcribe](https://docs.mistral.ai/studio-api/audio/speech_to_text/offline_transcription), model voxtral-mini-latest) with context bias for VIP names
- Transcript goes to a parse call (Mistral chat, JSON schema): type, title, day, time, duration
- The app opens the review form prefilled; Juan confirms with Add to my day
- Do not use the browser speech API: it is unreliable inside a home-screen app on iPhone
- Audio is discarded after transcription

Placement after Add

- Task: the scheduler places it in the next free slot that fits its length and effort; the toast names the time
- Appointment or reminder: fixed at the given time; a clash shows a warning in the toast and on both items
- Tomorrow: stored with day = tomorrow, shown under Later until the next day

## Scheduling rules

The scheduler is a pure function, plan(day, items, settings, rules) → placements with a reason each, so it runs the same in tests, in the worker and after every edit.

Energy curve

- Built from settings: peak window start (3 hours long), dip after lunch, second wind, bedtime; values 0 to 1 per 15 minutes
- Levels: low below 0.4, steady 0.4 to 0.7, peak 0.7 and above; the strip, item labels and placement all read the same levels
- With learn\_from\_corrections on: when Juan moves deep work 3 times to the same other window, propose a peak shift as a suggested rule

Placement order

1. Block the frame: before wake, the hour before bed, outside working hours for work items, weekends when protected, lunch
2. Place fixed items: calendar events, appointments, reminders, protected time (exercise, family dinner)
3. Add buffers around meetings (setting: 0, 5, 10 or 15 min)
4. Rank flexible items: must before should before could; inside a rank, important first, then earliest due date, then VIP person, then clash order (family, clients, team, admin)
5. Split tasks longer than the focus block into blocks with the break length between
6. Place each flexible block in the best free slot today: deep work in peak, meetings and calls in steady, light tasks and errands in low; ties go to the earliest slot
7. Apply active rules (extra minutes, category fixes, preferred days) before placing
8. What does not fit moves to Later with the reason “no free slot today” and raises the overload flag on Priority

After every run

- Each placement stores a one-line reason built from the step that placed it, e.g. “Placed in your peak focus hours, before the client call at 11:30”
- Items marked done or manually moved stay where Juan put them; the scheduler fills around them
- Load bar: fixed minutes plus flexible minutes against working time; over capacity shows the overflow

Corrections to rules

- Every adjust action writes a correction
- A rule is suggested after 3 or more of the same correction on similar items (same sender, topic or effort); Juan accepts it in Learned rules
- Stated rules (from settings or Juan's words) apply at once

## Screens and acceptance criteria

Each screen matches its canvas artboard; a screen is done when every check in its row passes on Juan's iPhone from the home-screen icon.

| Screen | Canvas artboard | Done when |
| --- | --- | --- |
| Today, Now view | R2 Minimal calm · Now | Big date, now and work-end times; energy strip with fixed solid and flexible dashed blocks; Now card with progress and reason; Next 3; Rest of today and Later fold; add bar pinned on scroll |
| Today, Priority view | R2 Minimal calm · Priority | Toggle switches without reload; load bar matches the scheduler; Must, Should, Could from item ranks; tick marks an item done and persists |
| Adjust sheet | both Today artboards | Move to tomorrow, More important, 30 more minutes, Personal or work each write a correction, re-run the plan and show a toast; calendar items say they are fixed |
| Add bar | both Today artboards | Typed and spoken items reach the review form; Add places the item and names the slot |
| Onboarding | App screens · O1 to O7 | Google consent works; every answer saves to settings; O7 shows the real first day |
| Review | D1 | Real candidates with quote and suggested slot; Add and Not a task persist; badge count on the bottom bar matches |
| Item detail | D2 | Source email link opens the right Gmail message; history lists real corrections |
| Tomorrow | D3 | Plan for the next day from the same scheduler; Monday preview on weekends |
| End of day | D4 | Carry-over choices move items; feeling and plan answers save to day\_reviews |
| Insights | D5 | All five measures computed from events\_log, items, candidates and day\_reviews for the current week |
| Empty day and connection lost | X1, X2 | Shown from real state: no items, or source disconnected |
| Settings hub and sub-screens | S0 to S8 | Every control saves; each change re-runs the plan; the What this changes text matches the rules section |
| Learned rules | S6 | Lists stated, learned and suggested rules; toggles and Make it a rule persist |
| Privacy and data | S7 | Export downloads JSON of all tables; Delete removes all rows and signs out |

## Notifications

Web push to the home-screen app, sent by the worker; iPhone shows them only for an app opened from the home-screen icon with permission granted (iOS 16.4 or later).

| Notification | Default | Content |
| --- | --- | --- |
| Morning overview | 07:30 | Meetings count, first fixed item, Must count, review count |
| Before fixed events | 10 min before | Title, time, place or link |
| Plan tomorrow | 20:30 | First fixed item tomorrow and items carried over |
| Close the day | 30 min after work ends | Done count and a link to the end-of-day review |
| New email items | Batched into the next overview | Count only; Right away sends one per candidate |

- Quiet hours and focus blocks suppress everything except fixed events inside the lead time
- Implementation: VAPID keys, the web-push npm library, a service worker with push and notificationclick handlers that open the right screen
- Permission is asked from a button in Notifications settings, never on first load

## Security, privacy and data retention

One user, read-only Gmail, Calendar writes limited to new events, encrypted tokens and no full email bodies at rest.

- Sign-in limited to ALLOWED\_EMAIL; every API route checks the session
- Google refresh token encrypted with AES-256-GCM (TOKEN\_ENCRYPTION\_KEY); never logged, never sent to the browser
- All secrets in Railway variables; .env files in .gitignore; Claude Code never commits secrets
- HTTPS only through Railway; secure, httpOnly, sameSite cookies
- Email text goes to Mistral only for extraction; store fields and a quote of at most 200 characters; quotes and history deleted after the retention setting (7, 30 or 90 days, default 30)
- Audio deleted right after transcription
- Nightly Postgres backup (pg\_dump to a Railway volume or object storage), 14 days kept
- Export (JSON of all tables) and Delete all data in Privacy settings
- Google API Limited Use: data from Calendar and Gmail serves My Day features only; no analytics, no training

## Build milestones for Claude Code

Eight milestones, each ending in something Juan uses on his phone; milestones 1 to 3 already give a working daily app without Gmail.

1. Skeleton: repo, Next.js with TypeScript, Tailwind tokens for the palette, Roboto, manifest and service worker, Prisma with Postgres, Auth.js Google sign-in limited to one email, deploy to Railway on the subdomain. Done when the app installs on the iPhone and shows an empty Today after sign-in
2. Calendar: sources table, encrypted token, worker service, calendar sync with sync tokens, Today strip and lists from real events. Done when a new event in Google Calendar shows within 5 minutes
3. Manual input and scheduler: add bar (text first, then voice with Voxtral), scheduler v1 with energy curve and placement order, adjust sheet with corrections. Done when an added task lands in a sensible free slot with a reason
4. Settings and onboarding: all settings screens, onboarding O1 to O7, plan re-runs on change. Done when changing the peak window moves deep work
5. Gmail and Review: Gmail sync, pre-filters, Mistral extraction, candidates, Review screen, item detail with source link. Done when a real email with a request appears in Review with its quote
6. Rules: Learned rules screen, suggestions from repeated corrections, rules applied in the scheduler. Done when a third identical correction proposes a rule
7. Notifications and day loop: web push, morning overview, plan tomorrow, close the day, end-of-day review, Tomorrow screen. Done when all four notifications arrive on the iPhone
8. Insights and hardening: events\_log measures, Insights screen, backups, export and delete, error states. Done when Insights shows a full real week

Working rules for Claude Code

- One branch and pull request per milestone; Juan reviews and merges
- Tests for the scheduler and the extraction parser before UI work on them
- Seed script with the sample day from the canvas for local work
- Keep the AI provider behind lib/ai so Mistral models can change without touching features

## Running costs and open questions

Expected running cost is the Railway plan plus small Mistral usage; Apple only if TestFlight becomes necessary.

| Item | Cost | Note |
| --- | --- | --- |
| Railway Hobby | $5 per month, includes $5 of usage | Web, worker and Postgres for one user; watch usage in the first week ([pricing](https://docs.railway.com/pricing/plans)) |
| Mistral chat (extraction, parsing) | Per token, see the pricing page | Pre-filters keep calls low; set a spend limit |
| Mistral Voxtral transcription | $0.003 per audio minute | Short voice notes ([announcement](https://mistral.ai/news/voxtral-transcribe-2)) |
| Google APIs | Free within quota |  |
| Apple Developer Program | $99 per year | Only for the TestFlight path |

Open questions

- [x] Calendar write access in v1: yes, create events only
- [x] Sent mail: included, to catch promises Juan made
- [x] Retention: 30 days
- [ ] Calendars: which ones exactly (names as in Google Calendar), and does Cal.com write its bookings into Google Calendar?
- [ ] Gmail: inbox plus sent (default), or all mail including archived?
- [ ] Energy: real peak window and dip times to seed the curve

Sources: [Mistral custom structured outputs](https://docs.mistral.ai/capabilities/structured-output/custom_structured_output/) · [Mistral offline transcription](https://docs.mistral.ai/studio-api/audio/speech_to_text/offline_transcription) · [Voxtral Transcribe 2](https://mistral.ai/news/voxtral-transcribe-2) · [Railway plans](https://docs.railway.com/pricing/plans) · [Google unverified apps (Workspace Admin Help)](https://support.google.com/a/answer/9352843) · [Google OAuth publishing status and user caps](https://support.google.com/cloud/answer/15549945) · [Apple: web push in web apps](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers)
