# Setup, the first hour

Follow this top to bottom and you end with the product running on your machine:
the API on `http://localhost:3000`, the React app on `http://localhost:5173`,
a migrated database, and a scan you can watch stream tile by tile.

Two independent npm packages, no workspace and no root install:

| Folder | What it is | Dev port |
|---|---|---|
| `backend/` | Node 20, TypeScript, Fastify 4, Socket.IO, BullMQ, Drizzle, PostgreSQL | 3000 |
| `frontend-jsx/` | React 18, Vite 5, React Router 6. The founder console lives inside it at `src/admin/` | 5173 |

Commands are written for a POSIX shell, so Git Bash or WSL on Windows. In
PowerShell, `curl` is an alias for `Invoke-WebRequest` and behaves differently,
so type `curl.exe` there.

---

## 1. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20 or newer | `backend/package.json` declares `engines.node >=20.0.0`. `frontend-jsx/package.json` declares no `engines` field at all, so nothing enforces a version there. Use the same Node 20 for both. |
| npm | whatever ships with Node 20 | No workspace tricks, plain `npm install` in each folder. |
| PostgreSQL | 16 | The working database was verified on 16.6. |
| Redis | 7 | Optional in development. Read step 4 before you decide. |
| Docker Desktop | current | Optional, but `backend/docker-compose.yml` gives you both Postgres and Redis in one command. |
| git | current | See step 2. The repository may not have history yet. |

Check what you have:

```bash
node -v      # expect v20.x or newer
npm -v
docker -v    # only if you are taking the Docker route
```

---

## 2. Get the code

If you were given a git remote:

```bash
git clone <remote> naam-dekho
cd naam-dekho
```

If you were given a zip, unzip it and work inside the folder. Two things to know
in that case. The repository was not under version control while it was being
built, so there may be no commit history to read. And a zip ignores
`.gitignore`, so it will contain `backend/.env` with real API keys in it. If you
received one, say so to whoever sent it, because those keys should then be
rotated.

The tree you should see at the root: `backend/`, `frontend-jsx/`, `docs/`.

---

## 3. Start Postgres and Redis

The quickest route, from inside `backend/`:

```bash
cd backend
docker compose up -d
docker compose ps      # both services should report healthy
```

That brings up two containers, `naamdekho-postgres` (Postgres 16 alpine, port
5432) and `naamdekho-redis` (Redis 7 alpine, port 6379). The development
username, password and database name are in `backend/docker-compose.yml`, and
the `DATABASE_URL` line in `backend/.env.example` already matches them, so you
can copy that line across unchanged.

If you would rather use a Postgres you already have, create a database and a
user, then put your own connection string in `DATABASE_URL` in step 6. Nothing
in the schema needs a superuser. `gen_random_uuid()` is built into Postgres 13
and later, so no extension has to be installed.

---

## 4. Decide about Redis

Redis is optional in development and required in production. `NODE_ENV` is the
switch, and it is currently `development`.

When `NODE_ENV=development` and a service is unreachable, the backend degrades
instead of refusing to start:

| Missing | What happens in development |
|---|---|
| Redis | Scans run inline inside the API process rather than through the BullMQ queue, and tiles stream straight to Socket.IO using its in-memory adapter. The rate limiter falls back to an in-process store, so limits are per process and not shared. `npm run dev:worker` has no queue to read and is pointless. The cache becomes a `Map` in memory. |
| Postgres | Scans, users and results live in a per-process memory store and vanish on restart. The corpus cannot be read, so the verified Devanagari spellings are not loaded and every script falls back to transliteration. |
| Both | Both of the above. You can still search a name and watch the tiles arrive, which is the point of the mode. |

When `NODE_ENV=production` none of that applies. The health probe short circuits
to "everything is healthy" and a missing service fails loudly, which is what you
want in production.

Two details that will otherwise cost you ten minutes:

- `REDIS_URL` must still be present and must parse as a URL, even when Redis is
  not running. The config check validates the string, not a connection. Leave
  the example value in place.
- The health probe runs once at startup and is memoised. Starting Postgres or
  Redis after the API is already up does not promote it out of degraded mode.
  Restart the API.

For your first run, start both services. Degraded mode is a fallback worth
knowing about, not a way to work.

---

## 5. Install dependencies

Two installs, one per package:

```bash
cd backend         && npm install
cd ../frontend-jsx && npm install
```

---

## 6. Create `backend/.env`

```bash
cd backend
cp .env.example .env
```

`backend/src/config.ts` validates the environment with zod at import time. If
anything below is missing or malformed, the process prints `Invalid environment
variables` with the offending field names and exits 1, before the server binds a
port.

### Required to boot

| Variable | Rule |
|---|---|
| `DATABASE_URL` | Must parse as a URL. The example value matches `docker-compose.yml`. |
| `REDIS_URL` | Must parse as a URL, even with no Redis running. |
| `JWT_SECRET` | At least 16 characters. |

Change `JWT_SECRET` to a long random string now. The placeholder in
`.env.example` is long enough to satisfy the length check, so nothing stops the
server booting with it. That is a known gap, recorded in the security notes, and
not a licence to leave it as it is.

### Has a default, safe to leave alone

`NODE_ENV` (development), `PORT` (3000), `HOST` (0.0.0.0), `LOG_LEVEL` (info),
`JWT_EXPIRES_IN` (30d), `FRONTEND_ORIGIN` (defaults to `http://localhost:5173`,
and the example file already lists the dev origin plus the two production ones,
comma separated), `R2_BUCKET`, `PAYTM_WEBSITE`, `PAYTM_INDUSTRY_TYPE`,
`PAYTM_CHANNEL_ID`.

### Unlocks something optional

These are read straight from `process.env`, are not validated by the config
schema, and **none of them are in `.env.example`**. If you need one, add the
line yourself.

| Variable | What it unlocks | Without it |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Google sign-in. Must be the same client id you give the frontend in step 7. | `POST /v1/auth/google` returns 503 `google_not_configured`. Since `POST /v1/scan` requires a signed-in user, nobody can run a scan from the UI. |
| `ADMIN_EMAILS` | Comma separated Google addresses allowed into `/admin`. | Every console route returns 503 `admin_not_configured`. |
| `ADMIN_PHONES` | Legacy, still read so an account created under the old phone sign-in is not locked out. | Nothing. Sign-in has been Google only since 6 August 2026. |
| `ADMIN_API_PASSWORD` | The second password on the console API keys screen, separate from being an admin. | That screen stays locked and tells you to set it. |
| `GEMINI_API_KEY` | The certificate essay and the sandhi splitter in `src/lib/sandhi.ts`. | Nothing fails. The essay falls back to plain deterministic prose and sandhi returns null. |
| `SCRAPING_BEE_API_KEY` | The social checks that need a real browser. | Those checks report as unavailable rather than failing the scan. |
| `SCRAPINGBEE_SOCIAL` | `off`, `paid` or `all`, deciding which scans may spend ScrapingBee credits. | Defaults to `paid`, meaning deep searches only. |
| `YOUTUBE_API_KEY` | The YouTube handle check inside the social scanner. | That one check is skipped. |
| `SITE_ORIGIN` | The absolute origin written into the generated SEO pages and `sitemap.xml`. | Defaults to `https://naamdekho.net`. Set it before any production page build. |
| `TRUST_PROXY_HOPS` | How many proxy hops Fastify believes when reading the client IP. 0 for direct, 1 for one nginx, 2 for a CDN in front of nginx. | Defaults to 1. |
| `BHASHINI_USER_ID`, `BHASHINI_ULCA_API_KEY`, `BHASHINI_API_KEY`, `BHASHINI_INFERENCE_KEY`, `BHASHINI_PIPELINE_ID` | `npm run check:bhashini` only. | That script has nothing to talk to. |

Connector keys that are in `.env.example` and all optional: `GITHUB_TOKEN`
(raises the GitHub rate limit), `GOOGLE_CSE_API_KEY`, `GOOGLE_CSE_ID`,
`BRAVE_SEARCH_API_KEY`, `SERPAPI_KEY`, `TWO_CAPTCHA_KEY`, `GODADDY_API_KEY`,
`GODADDY_API_SECRET`.

### Entries in `.env.example` that do nothing today

| Variable | Why |
|---|---|
| `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`, `MSG91_SENDER_ID` | Phone OTP sign-in was removed on 6 August 2026. No code sends SMS any more. |
| `RAZORPAY_*`, `PAYTM_*` | Payments are not integrated. The Razorpay route handlers and signature checks exist, but every key is blank and no payment has ever been taken. This is the last planned piece of work. |
| `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | Declared in `config.ts` and read nowhere else under `src/`. Unverified whether any deployment script uses them, confirm before relying on this. |

Never commit `.env`. `backend/.gitignore` already excludes it.

---

## 7. Create `frontend-jsx/.env`

The frontend needs exactly one variable, `VITE_GOOGLE_CLIENT_ID`. Only names
prefixed `VITE_` reach the browser, which also means anything in this file is
public. No secret belongs here.

```bash
cd frontend-jsx
cp .env.example .env
```

`frontend-jsx/.env.example` was added during the handover and documents this one
variable. If you are looking at an older copy of the repository it will not be
there, in which case create `frontend-jsx/.env` yourself with a single line:

```
VITE_GOOGLE_CLIENT_ID=
```

Get the value from Google Cloud Console, APIs and Services, Credentials, as an
OAuth 2.0 Client ID of type "Web application", and add `http://localhost:5173`
to its authorised JavaScript origins. Put the same value in `GOOGLE_CLIENT_ID`
in `backend/.env`. The backend verifies the token server side against Google
public keys, so a mismatch between the two shows up as a sign-in that appears to
work and then quietly does nothing.

Without it the app still runs. The sign-in page renders a panel telling you the
client id is missing, and you cannot sign in, which means you cannot run a scan
through the UI. Step 11 gives you a way to exercise the scanner without it.

The API origin is **not** configurable. Eight files each declare their own
`const API_ORIGIN = import.meta.env.DEV ? 'http://localhost:3000' : ''`, so the
API is assumed to be on port 3000 in development and same origin in production.

---

## 8. Run the migrations

From `backend/`, with Postgres up:

```bash
npm run db:migrate
```

This applies the six SQL files in `backend/drizzle/` and, on an empty database,
produces nine tables:

```
agency_leads   api_calls   audit_log   billing_events   corpus_names
scan_results   scans       settings    users
```

Confirm:

```bash
docker exec -it naamdekho-postgres psql -U naamdekho -d naamdekho -c "\dt"
```

Do **not** run `npm run db:generate` as part of setup. You do not need it to
boot, and it currently fails. See troubleshooting.

---

## 9. Load the name corpus

The migration creates `corpus_names` empty. The real content is not in the
repository: 536 published names, of which 260 carry a meaning that the public
pages print and 210 carry a verified Devanagari spelling, live only in the
founder database.

**Ask for a `pg_dump` before you need it.** There is no seed script, and there
is no exported copy anywhere in the tree.

Restoring depends on the dump format, so check what you were sent first. For a
plain SQL dump:

```bash
docker exec -i naamdekho-postgres psql -U naamdekho -d naamdekho < naamdekho.sql
```

For a custom format dump, use `pg_restore` against the same container.

The other route in is `POST /v1/admin/corpus/import`, which takes up to 1000
entries at a time and upserts them by slug. It requires you to be signed in with
Google as an address listed in `ADMIN_EMAILS`, so it is only useful once step 7
is done.

If you skip this step:

| Area | Behaviour with an empty corpus |
|---|---|
| The app | Boots and works. Scans run, tiles stream, certificates render. |
| Devanagari | Nothing is loaded at startup, so every name falls back to transliteration. Roman spelling does not record vowel length, so Ram renders as रम rather than राम. That error propagates: every other Indian script on the site is derived from the Devanagari, so one wrong vowel is wrong in all ten. |
| `/admin/corpus` | An empty review queue. |
| `npm run build:names` | Dangerous. See the warning below. |

**Do not run `npm run build:names` without the populated database.** The builder
falls back to a built-in 50 name corpus when the database is unreachable or
`corpus_names` is empty, so the 697 pre-rendered files under
`frontend-jsx/public/` collapse to roughly 50 and `sitemap.xml` is rewritten to
match. Those files are tracked, so the damage shows up as a very large diff. If
it happens, restore them with git rather than trying to rebuild them.

---

## 10. Start it

Three terminals, all from the repository root.

```bash
# terminal 1, the API
cd backend && npm run dev

# terminal 2, the queue worker (skip this if you are running without Redis)
cd backend && npm run dev:worker

# terminal 3, the React app
cd frontend-jsx && npm run dev
```

`npm run dev` in `backend/` prints a short banner when `NODE_ENV=development`
listing the REST, WebSocket and health URLs, and reminds you to start the
worker. If the corpus loaded it also logs `Loaded N verified Devanagari
spellings.` If Postgres or Redis is missing it logs `DEV DEGRADED MODE` and
names which one.

Vite opens on `http://localhost:5173` and proxies `/v1` to port 3000. It also
serves everything in `frontend-jsx/public/`, so the pre-rendered SEO pages are
browsable locally at their real paths.

---

## 11. Verify it worked

| Check | Command or URL | Expected |
|---|---|---|
| API alive | `curl http://localhost:3000/v1/healthz` | `{"ok":true}` |
| API ready | `curl http://localhost:3000/v1/readyz` | `{"ok":true,"ts":...}` |
| Prices come from the database | `curl http://localhost:3000/v1/pricing` | JSON with a `pricing` object and `"preview":false` |
| Check toggles readable | `curl http://localhost:3000/v1/checks/disabled` | `{"disabled":[]}` or a list of check ids |
| Migrations applied | `docker exec -it naamdekho-postgres psql -U naamdekho -d naamdekho -c "\dt"` | the nine tables from step 8 |
| App renders | open `http://localhost:5173` | the home page with the search box |
| Static SEO pages served | open `http://localhost:5173/n/aarav.html` | a full name page, served from a plain HTML file rather than React |
| Scanner works end to end | `cd backend && npx tsx scripts/smoke-scan.ts Vyana` | tiles printed one per line with timings, then a score out of 100 |

The smoke scan is the useful one before Google sign-in is configured. It calls
the orchestrator directly, needs no HTTP server and no Postgres, and works with
or without Redis. Any name can be passed as the argument.

Once sign-in works, the full path is: sign in at `/sign-in`, search a name on
the home page, and watch the tiles arrive over the WebSocket. If your address is
in `ADMIN_EMAILS`, the console is at `/admin`.

---

## 12. Optional, worth doing once

```bash
cd backend
npm test           # vitest, 60 tests across 3 files, passes
npm run typecheck  # tsc --noEmit, clean

cd ../frontend-jsx
npm run lint       # clean
```

---

## Troubleshooting

| Symptom | Cause | What to do |
|---|---|---|
| `npm run build` in `frontend-jsx` fails on `check-legal.cjs` | Working as designed. `prebuild` refuses to build a deployable bundle while `src/legal/privacy.js` still holds three placeholders: the CIN, the registered office address with PIN code, and the named Grievance Officer required by IT Rules 2011 Rule 5(9). A privacy policy that reads "to be filled" is worse than no policy at all. | Do not remove the check. `npm run dev` is unaffected, and `npx vite build` still succeeds if you genuinely need a bundle before the legal details arrive. Filling in the three values is what unblocks the real build. |
| `npm run build` fails on `check-scan-reset.cjs` | Also by design. It fails the build if any of seven certificate state fields stops being cleared when a new scan starts. It exists because certificates were once generated in the wrong child name: the "Which name did you finally choose?" field survived a new search and `generateFive()` reads it first. | Fix the reset, do not weaken the check. |
| `npm run lint` in `backend` fails with `'eslint' is not recognized` | The script is in `package.json` but eslint is not installed in `backend/`. The backend has never been linted. | Nothing to do at setup time. `npm run typecheck` is the check that works. Installing eslint and a config is open work. |
| `npm run db:generate` fails with an esbuild spawn error | drizzle-kit cannot spawn its esbuild binary. The binary is present, so this looks like a local install artefact rather than a repository problem. Migration 0005 was hand written in the existing SQL format because of it. | You do not need this command to run the product. Try a clean `rm -rf node_modules && npm install` first. `npm run db:migrate` is unaffected and works. `npm run db:studio` uses the same tool, so expect the same failure there. Unverified, confirm before relying on it. |
| `npm run build:names` produced about 50 pages instead of 697 | It ran without a reachable database, or against an empty `corpus_names`, and used the built-in 50 name fallback corpus. `sitemap.xml` was rewritten to match. | Restore `frontend-jsx/public/` and `sitemap.xml` from git, load the corpus (step 9), then run it again. Run it from `backend/`, because the output path is resolved relative to the working directory. |
| Server exits immediately with `Invalid environment variables` | zod rejected `backend/.env`, and the message names the fields. | Usually `JWT_SECRET` under 16 characters, or a `DATABASE_URL` or `REDIS_URL` that does not parse as a URL. `REDIS_URL` is required even when Redis is not running. |
| `DEV DEGRADED MODE` in the log although Docker is up | The health probe runs once at startup and is memoised, and the containers were not ready when the API started. | Restart the API. `docker compose ps` should show both healthy first. |
| Sign-in page says Google sign-in is not configured | `VITE_GOOGLE_CLIENT_ID` is missing from `frontend-jsx/.env`. | Step 7. Restart the Vite dev server after editing `.env`, since Vite reads it at startup. |
| `POST /v1/auth/google` returns 503 `google_not_configured` | `GOOGLE_CLIENT_ID` is missing from `backend/.env`. | Step 6. Same value as the frontend. Restart the API. |
| Signed in, but `/admin` returns 503 `admin_not_configured` | `ADMIN_EMAILS` is empty. | Add your Google address to `ADMIN_EMAILS` in `backend/.env` and restart. |
| `/admin` returns 403 and names an account you did not expect | You are signed in with a different Google account from the one on the list. The response names it deliberately, because the account chooser silently picking the wrong one is exactly how this wasted a day before. | Sign out, pick the right account, or add that address to `ADMIN_EMAILS`. |
| A scan returns 401 `sign_in_required` | Scans require a signed-in user. There is no anonymous scan path and no dev bypass. | Configure Google sign-in, or use `npx tsx scripts/smoke-scan.ts <name>` to exercise the scanner directly. |
| Certificate essays read flat, or the sandhi split is empty | `GEMINI_API_KEY` is not set. Everything degrades rather than failing: the essay falls back to plain prose and sandhi returns null. | Set the key if you need the model path. Nothing else on the certificate depends on it. The numerology wheel, nakshatra, transliteration, layout and logo are all deterministic TypeScript. |
| Certificate typefaces look wrong | Typefaces load from `fonts.googleapis.com` at render time. With no outbound internet the sheet still renders, in Georgia or a generic serif. | Expected offline. Not a bug. |
| Names render with the wrong vowels, for example रम rather than राम | The verified Devanagari lexicon did not load, so the transliterator is guessing. Roman spelling does not record vowel length. | Check that the corpus is loaded and that the API logged `Loaded N verified Devanagari spellings.` at startup. `registerNameSpellings()` in `src/lib/transliterate.ts` is called from `src/server.ts` and from the page build. |

---

## Command reference

Every command below exists in the relevant `package.json`. The ones that do not
currently work are marked.

### `backend/`

| Command | What it does |
|---|---|
| `npm run dev` | API server with watch, via tsx |
| `npm run dev:worker` | BullMQ scan worker with watch. Needs Redis. |
| `npm run build` | `tsc -p tsconfig.json`. Compiles clean. |
| `npm start` | Runs the compiled `dist/server.js` |
| `npm run start:worker` | Runs the compiled worker |
| `npm run db:migrate` | Applies `backend/drizzle/*.sql`. Works. |
| `npm run db:generate` | **Broken locally.** drizzle-kit fails with an esbuild spawn error. |
| `npm run db:studio` | drizzle-kit studio. Same tool as above, so expect the same failure. Unverified. |
| `npm run typecheck` | `tsc --noEmit`. Clean. |
| `npm test` | vitest, 60 tests in 3 files. Passes. |
| `npm run lint` | **Broken.** eslint is not installed in `backend/`. |
| `npm run build:names` | Rebuilds the static SEO pages. Read step 9 first. |
| `npm run build:logo` | Rebuilds the logo asset |
| `npm run check:bhashini` | Connectivity check for the Bhashini API. Needs the `BHASHINI_*` variables. |
| `npx tsx scripts/smoke-scan.ts <name>` | Runs a real free tier business scan through the orchestrator. No server needed. |

### `frontend-jsx/`

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on 5173, proxying `/v1` to port 3000 |
| `npm run build` | **Fails by design** while the legal placeholders are unfilled. `prebuild` runs both gate scripts. |
| `npx vite build` | The same build without the gates. Succeeds. Use it only when you know why you are skipping them. |
| `npm run preview` | Serves a built `dist/` |
| `npm run lint` | eslint. Clean. |
| `npm run check:legal` | Runs the legal placeholder gate on its own |
| `npm run check:scan-reset` | Runs the certificate state reset gate on its own |
