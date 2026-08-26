# Naam Dekho

Naam Dekho checks one name, for a company or for a child, against domain
availability, social handles, marketplaces, the company and trademark
registers, its linguistic meaning across Indian languages, and Chaldean
numerology. A single search returns a single scored report, and for baby names
a printable certificate. This file orients you, the detail is in `docs/`.

## Read this before you debug the build

`npm run build` in `frontend-jsx/` **fails on purpose**. Its `prebuild` step
runs two gates, and the first one fails today.

| Gate | Script | Stops the build when |
|---|---|---|
| Legal | `scripts/check-legal.cjs` | `src/legal/privacy.js` still holds placeholders. Three are outstanding: the CIN, the registered office address with PIN, and the named Grievance Officer required by IT Rules 2011 Rule 5(9). |
| Scan reset | `scripts/check-scan-reset.cjs` | any of seven certificate state fields stops being cleared when a new scan starts. |

Neither gate touches `npm run dev`, so day to day work is unaffected. Do not
delete them. The reset gate exists because the "Which name did you finally
choose?" field once survived a new search, and `generateFive()` reads it first,
so certificates were generated in the wrong child's name.

`npx vite build` runs the same Vite build without the gates and succeeds. Use
it to look at built output locally, never to ship. `.github/workflows/ci.yml`
runs `npm run build` for the frontend, so that job stays red until the legal
placeholders are filled in.

## Repository layout

| Path | What is in it |
|---|---|
| `backend/` | Node 20+, TypeScript, Fastify 4, Socket.IO, BullMQ, Drizzle ORM, PostgreSQL 16. Its own npm package. |
| `backend/src/api/` | HTTP routes: `scan`, `auth`, `admin`, `billing`, `pricing`, `agency`. |
| `backend/src/scanners/` | One file per check family: domain, social, marketplace, brand, legal, astro, linguistic. |
| `backend/src/seo/` | Static page cluster builders. All implement one contract from `shell.ts`. |
| `backend/src/lib/` | Shared logic: numerology, transliteration, sandhi, meanings, Gemini, scoring. |
| `backend/drizzle/`, `backend/__tests__/` | SQL migrations applied by `npm run db:migrate`, and the Vitest suite, which needs no database. |
| `frontend-jsx/` | React 18, Vite 5, React Router 6, Tailwind. Its own npm package. |
| `frontend-jsx/src/admin/` | The founder console. Lives inside the customer app, routed under `/admin`. |
| `frontend-jsx/public/` | 697 generated static SEO pages plus `sitemap.xml`. Generated, not hand edited. |
| `frontend-jsx/scripts/`, `docs/` | The two build gates above, and the handover documents. |
| repo root | Loose `.html`, `.docx` and build scripts from the pre-React era, kept for reference. The root `package.json` only carries `docx` for those document builders. It is not the app and has no working `test` script. |

There is no npm workspace. Install inside each package you work on.

## Prerequisites

| Need | Version | Notes |
|---|---|---|
| Node | 20 or newer | `backend/package.json` sets `engines.node >=20.0.0`. |
| PostgreSQL | 16 | `backend/docker-compose.yml` brings up `postgres:16-alpine`. Verified against 16.6. |
| Redis | 7, optional | The backend runs without it in a degraded mode. Same compose file. Docker is needed only for these two containers. |
| `GEMINI_API_KEY` | optional | Without it nothing fails: the certificate essay falls back to plain prose and sandhi returns `null`. |

## Getting a dev environment up

```bash
cd backend
cp .env.example .env      # skip if .env is already there, it holds live keys
npm install
docker compose up -d      # postgres on 5432, redis on 6379
npm run db:migrate        # 9 tables on an empty database
npm run dev               # API on http://localhost:3000
```

In a second terminal:

```bash
cd frontend-jsx
cp .env.example .env      # VITE_GOOGLE_CLIENT_ID, added during this handover
npm install
npm run dev               # http://localhost:5173, /v1 proxied to :3000
```

The BullMQ worker is a separate process, `npm run dev:worker` in `backend/`.
Whether a scan completes without it is unverified, confirm before relying on it.

A fresh database gives you an empty corpus. The 536 published names and the
697 static pages are data, not code, so ask the founder for a database dump
before you go anywhere near the corpus or the SEO build.

## Commands, and which of them work

### backend/

| Command | Does | Status |
|---|---|---|
| `npm run dev` | Watches and runs `src/server.ts` | Works |
| `npm run dev:worker` | Watches and runs the queue worker | Unverified |
| `npm run build` | `tsc -p tsconfig.json`, emits `dist/` | Compiles clean |
| `npm run typecheck` | The same compile with `--noEmit` | Works, CI runs it |
| `npm test` | `vitest run`, 60 tests in 3 files | Passes |
| `npm run db:migrate` | Applies `drizzle/` | Clean on an empty database |
| `npm run build:names` | Regenerates the static SEO pages | Works, but read the warning below |
| `npm run enrich:meanings -- --dry` | Looks up meanings and Devanagari spellings for names that have none | Works. Needs `GEMINI_API_KEY`. Writes nothing without `--write` |
| `npm run db:generate` | `drizzle-kit generate` | **Broken.** esbuild spawn error on the founder's machine. The binary is there, so this looks like a local install artefact rather than a repo fault. Try a fresh `npm install`. Migration 0005 was hand written in the project's SQL format because of it. |
| `npm run lint` | `eslint src` | **Broken.** The script exists but eslint is not installed in `backend/`. It fails with "'eslint' is not recognized". |
| `npm run db:studio`, `npm run build:logo`, `npm run check:bhashini` | Drizzle Studio, logo rebuild, Bhashini probe | Unverified, confirm before relying on these |

Warning on `build:names`: run it without a database and it regenerates from a
built in 50 name fallback corpus. The 697 pages collapse to about 50 and
`sitemap.xml` is rewritten to match. Get the database first.

### frontend-jsx/

| Command | Does | Status |
|---|---|---|
| `npm run dev` | Vite on 5173, proxying `/v1` to `:3000` | Works |
| `npm run lint` | `eslint src` | Clean |
| `npx vite build` | Production bundle, gates skipped | Succeeds |
| `npm run build` | The same build behind both gates | **Fails by design.** See the top of this file. |
| `npm run check:legal` | The legal gate on its own | Fails today, which is the point |
| `npm run check:scan-reset`, `npm run preview` | The reset gate on its own, and serving `dist/` | Unverified, confirm before relying on these |

## Settled decisions, so nobody reopens them

- The palette is closed: `--accent`, `--accent-2`, `--gold`, and the softs
  `--blush`, `--lilac`, `--powder`. No new hues. `--accent` `#B8501C` measures
  3.98:1 on the cream page, under the 4.5 AA floor, and the founder has decided
  it stays. That is a recorded exception, not an oversight.
- Payments are not integrated. Every Razorpay variable is blank. It is the last
  planned piece of work.
- Certificates make one Gemini call each, for the essay only. The numerology
  wheel, nakshatra, transliteration and layout are deterministic TypeScript.
  No other model is called anywhere in the product. Startup name
  alternatives are generated in-house and cost nothing to run.
- The repository is private, on GitHub, and `.gitignore` excludes every
  `.env`. `backend/.env` holds 28 real secrets and must never be committed
  or zipped — a zip ignores `.gitignore` and carries them with it.

## Read next

The handover documents live in `docs/`. If one of them is missing from your
copy it did not survive the export, so ask the founder for it rather than
assuming the subject was never written up.

| Document | Read it for |
|---|---|
| `docs/EXPORT-CHECKLIST.md` | What must happen before the repo changes hands: the 28 keys in `backend/.env`, putting it under git, and why a zip carries secrets that a git hand over does not. |
| `docs/KNOWN-ISSUES.md` | The outstanding security work and everything that is broken or still stubbed. Read it before you plan a sprint. |
| `docs/SEO-PAGES.md` | How the 697 static pages are built, the cluster contract in `backend/src/seo/shell.ts`, and the fallback corpus trap. |
| `docs/ADMIN-ACCESS.md` | Who can open the founder console, how to let a developer in, and why the owner account cannot be removed from inside it. |

Older documents at the root are kept for history and are not maintained. Where
they disagree with `docs/`, `docs/` is right.

| Document | Still useful for | Caution |
|---|---|---|
| `backend/STUBBED.md` | What returns placeholder data and why | August 2026, mostly current |
| `docs/GO_LIVE_CHECKLIST.md` | Accounts, keys and webhooks needed to launch | August 2026 |
| `docs/FRONTEND_LOCKED.md` | The signed off UI, changes need the founder | August 2026 |
| `docs/V2_BACKLOG.md` | Deliberately deferred work | August 2026 |
| `docs/SEO_PLAYBOOK.md` | The original 50 page pilot | Superseded by `docs/SEO-PAGES.md` |
| `backend/README.md` | The May 2026 shape of the project | Predates the React frontend and describes OTP auth and Paytm. `HANDOFF.md` was removed in the same pass, along with the static prototype it told you to open. |
