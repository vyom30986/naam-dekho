# Naam Dekho — Backend

Node.js API for the Naam Dekho platform: name search, live result streaming,
Google sign-in, credits, the certificate builder, the SEO page build, and the
founder console.

> **Rewritten 27 August 2026.** The previous version dated from May 2026 and
> described a product that no longer exists — phone OTP sign-in over MSG91, and
> a static HTML front end (`index.html`, `pricing.html`) that has since been
> deleted in favour of `../frontend-jsx`. If you have that version open,
> discard it.

Full documentation is in [`../docs/`](../docs). Start with
[`../README.md`](../README.md), then [`../docs/SETUP.md`](../docs/SETUP.md) to
get running, and read [`../docs/KNOWN-ISSUES.md`](../docs/KNOWN-ISSUES.md)
before planning any work.

## Stack

- **Node.js 20** + **TypeScript 5**
- **Fastify 4** — HTTP server. Fastify 4 is past end of life; the upgrade is
  tracked in `../docs/KNOWN-ISSUES.md`.
- **Socket.IO 4** — streams each check to the browser as it finishes
- **BullMQ 5** + Redis — the scan queue. Redis is optional in development.
- **PostgreSQL 16** + **Drizzle ORM**
- **Gemini** (`gemini-flash-lite-latest`) — the only model the product calls,
  for the certificate essay and the sandhi split. Everything else on a
  certificate is deterministic TypeScript.

## Quick start

```bash
npm install
cp .env.example .env     # fill DATABASE_URL and JWT_SECRET at minimum
npm run db:migrate       # creates the tables
npm run db:seed          # loads the 536-name corpus
npm run dev              # API on the port in .env
```

`npm run dev:worker` starts the BullMQ worker as a separate process. Whether a
scan completes without it is unverified — confirm before relying on it.

`docker-compose.yml` boots Postgres and Redis if you would rather not install
them locally.

## Authentication

**Google sign-in only.** `POST /auth/google` exchanges a Google credential for a
session JWT.

Phone OTP was removed on 6 August 2026. `src/auth/otp.ts` still exists because
`verifyJwt()` lives there and validates the sessions Google issues — the file
name is a leftover, not a sign OTP is coming back. `requestOtp()` and
`verifyOtp()` in that file are unreachable. The comment block at
`src/api/auth.ts:155` explains why they were kept rather than deleted.

## Payments

**Not integrated.** Razorpay is the intended primary gateway and all three
`RAZORPAY_*` variables are blank. A Paytm fallback exists in
`src/payments/paytm.ts` with a development-grade checksum and is deliberately
deferred. This is the last planned piece of work before launch.

## What works with no API keys at all

Domains via RDAP; social handle probes (Instagram, X, YouTube, LinkedIn,
Facebook, Threads, Telegram, Pinterest); GitHub org availability; Apple App
Store via the iTunes Search API; the Wikipedia concept check; the Shopify
subdomain probe; the Chaldean numerology engine; transliteration and the
landmines dictionary; the pronunciation analyser; verdict scoring and the
WebSocket stream; and agency lead submission with rate limiting.

`STUBBED.md` in this folder lists every feature that is deliberately incomplete
and exactly what each one needs to become real. Read it before you assume
something is broken.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | API with reload |
| `npm run dev:worker` | BullMQ scan worker |
| `npm run db:migrate` | Applies `drizzle/*.sql`. Clean on an empty database. |
| `npm run db:seed` | Loads `seed/corpus_names.sql`. Safe to re-run. |
| `npm test` | Vitest. 60 tests, needs no database. |
| `npm run typecheck` | `tsc --noEmit`. Clean. |
| `npm run build:names` | Builds the ~697 static SEO pages. **Needs a seeded database** — see `../docs/SEO-PAGES.md`. |
| `npm run enrich:meanings` | Fills missing corpus meanings from cited sources. |
| `npm run lint` | **Does not work.** The script is here, eslint is not installed. |

## Where things live

| Path | Contents |
|---|---|
| `src/api/` | Route handlers, one file per area |
| `src/scanners/` | The individual checks (domains, social, legal, marketplace, …) |
| `src/lib/` | Certificate, numerology, nakshatra, sandhi, transliteration |
| `src/db/` | Drizzle schema, migration runner, corpus seeder |
| `src/queue/` | BullMQ producer and worker |
| `src/scripts/` | One-off and build-time scripts |
| `drizzle/` | SQL migrations, applied in order |
| `seed/` | The name corpus. Product data, no customer data. |
| `__tests__/` | Vitest suite and shared factories |
