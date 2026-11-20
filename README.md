# My Day

A personal daily-plan web app for one user, installed on the iPhone home screen. It turns
Google Calendar, Gmail, typed and spoken input into one plan placed around energy and
priorities.

- Spec: [`docs/SPEC.md`](docs/SPEC.md)
- Working rules and commands: [`CLAUDE.md`](CLAUDE.md)

## Getting started

```bash
cp .env.example .env.local   # fill in the Google client, ALLOWED_EMAIL and the two keys
pnpm install
pnpm db:up                   # Postgres in Docker on port 5433
pnpm db:migrate
pnpm dev                     # http://localhost:3000
```
