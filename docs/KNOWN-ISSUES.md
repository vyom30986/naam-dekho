# Known Issues

The honest state of the Naam Dekho codebase as at 26 August 2026.

Nothing here is softened. Everything in the Security and Broken sections is a
real defect that will cost you time or money if you meet it by surprise. The
Deliberate section is the more important half: it lists things that look like
bugs, are not, and will come back if somebody "tidies" them.

Every claim below is marked with how it was established.

| Marking | Meaning |
|---|---|
| Confirmed | Read in the source during this handover, file and line named |
| Verified by running | Established by executing the command, not by reading it |
| Reported, unconfirmed | Carried over from an earlier audit, not reproducible from the current source |

Read `docs/SETUP.md` first if you have not run the project yet. This document
assumes you have.

---

## 1. Security

All six items below are outstanding. None has a fix in the codebase. They are
ordered by how much damage they do if exploited, not by how hard they are to fix.

| ID | Issue | Where | Status |
|---|---|---|---|
| S1 | Scan routes accept a scan id and never check it belongs to the caller | `backend/src/api/scan.ts` | Confirmed |
| S2 | Socket.IO handshake is not authenticated | `backend/src/ws/server.ts:33` | Confirmed |
| S3 | The live API keys password is four digits | `backend/.env`, `ADMIN_API_PASSWORD` | Confirmed, with an important correction |
| S4 | A placeholder `JWT_SECRET` is accepted at boot | `backend/src/config.ts:13` | Confirmed |
| S5 | No session revocation. `jwt_version` exists and is never read | `backend/src/db/schema.ts:65` | Confirmed |
| S6 | Fastify 4 is end of life and no dependency auditing runs | `backend/package.json`, `.github/workflows/ci.yml` | Confirmed |

### S1. Scan routes with no ownership check

A scan id is not a secret. It is returned in the `POST /v1/scan` response body
and it travels in the URL of every route below, so it lands in browser history,
in server access logs, and in any referrer header the page leaks.

Three routes were confirmed to read a scan by id and never compare it to the
caller. The regex on `:id` validates the shape only.

| Route | Line | What somebody holding a scan id gets |
|---|---|---|
| `GET /v1/scans/:id` | `scan.ts:151` | The full scan: the name searched, the verdict, every tile including the unfavourable ones |
| `GET /v1/scans/:id/keepsake` | `scan.ts:227` | The rendered keepsake certificate, which prints the child's name |
| `POST /v1/scans/:id/alternatives` | `scan.ts:418` | Five generated alternative names, on somebody else's paid scan |

`POST /v1/scans/:id/certificate-five` (`scan.ts:293`) is the exception. It does
check, at `scan.ts:348`:

```ts
const caller = (req as { userId?: string }).userId;
if (owner && owner !== caller) return reply.code(403).send({ error: "not_your_scan" });
```

The source carries a comment on the alternatives route acknowledging the gap and
arguing it is survivable while that route is free. That reasoning covers the cost,
not the privacy. A baby name search is one of the more personal things a family
will type into a website, and `GET /v1/scans/:id` hands the whole thing over.

The earlier audit counted four routes. Three are confirmed above. The fourth is
most probably the Socket.IO stream, which also accepts a scan id and also
performs no ownership check, and which is filed separately as S2. If the exact
count matters to you, check the original audit rather than assuming.

**Suggested fix.** Lift the two lines from `certificate-five` into a shared
helper and call it from all three routes. Anonymous scans have a NULL
`scans.user_id` and must stay reachable by id, otherwise a customer who has not
signed in loses their own result. That is why the `if (owner && ...)` shape is
the right one to copy. Expect the frontend to need no change.

### S2. The Socket.IO handshake is not authenticated

`backend/src/ws/server.ts:33`. On connection the server reads
`socket.handshake.query.scanId`, tests it against `/^scn_[0-9A-Z]{26}$/`, and if
the shape matches it joins the client to the `scan:<id>` room and replays every
event buffered for that scan. There is no token, no cookie, no user lookup.

**Risk.** Anybody holding a scan id watches that scan happen live, tile by tile,
including the replay of events emitted before they connected. It is S1 in real
time.

**Suggested fix.** Pass the session JWT in `auth` on the client handshake, verify
it in an `io.use()` middleware, and apply the same ownership rule as S1.
Anonymous scans still need to work, so the middleware must permit a connection
with no token when the scan has no owner.

### S3. The live API keys password is four digits

This one has changed since the audit and the correction matters, so read it
carefully before acting on it.

**The audit said:** a four digit literal in `src/api/admin.ts`.

**What is actually in the source now:** no literal. The check lives in
`backend/src/lib/api-keys.ts:96`, reads `ADMIN_API_PASSWORD` from the
environment, and compares with `timingSafeEqual`. The change endpoint at
`admin.ts:607` now requires at least 12 characters, rejects an all digit value,
and rejects a short list of obvious passwords. `POST /admin/api-keys/unlock` is
rate limited to 10 attempts per 10 minutes. That is a reasonable set of controls.

**Why the issue is still live:** the rule is enforced only when the password is
changed. Nothing validates the value already sitting in the environment. The
value currently in `backend/.env` is four characters, all digits, and would be
rejected outright by the rule this same codebase enforces on a change. The value
is not printed here. A code comment at `admin.ts:616` records how it got there.

That password guards the screen that displays and rewrites API keys, including
the payment keys once Razorpay is wired in.

**Suggested fix.** Two parts, and do both. Change the value. Then apply the same
validator at boot in `config.ts`, so a weak value that predates the rule cannot
survive simply by never being touched.

### S4. A placeholder `JWT_SECRET` is accepted at boot

`backend/src/config.ts:13` enforces `z.string().min(16)` and nothing else.

`backend/.env.example:14` ships this value:

```
JWT_SECRET=change-me-in-production-use-a-long-random-string
```

That string is 48 characters, so it satisfies the rule. Copy `.env.example` to
`.env` on a production box, start the server, and it boots happily with a signing
key that is published in the repository. Anybody can then mint a valid session for
any user id.

The value in the founder's `backend/.env` today is 64 characters and is not the
placeholder, so this is a trap laid for the next deployment rather than a live
breach.

**Suggested fix.** In `config.ts`, refuse to start when `NODE_ENV === "production"`
and `JWT_SECRET` matches the example value or contains "change-me". A denylist of
one string is enough. Raise the floor to 32 characters while you are there.

### S5. No session revocation

`backend/src/db/schema.ts:65` declares the column:

```ts
jwtVersion: integer("jwt_version").notNull().default(1),
```

Nothing reads it. The only verification path is `verifyJwt` in
`backend/src/auth/otp.ts:24`, called from the `preHandler` hook in
`backend/src/api/index.ts:18`, and it does `jwt.verify` and nothing more. There
is no database lookup, no denylist, no version comparison.

**Risk.** Tokens are issued with `JWT_EXPIRES_IN` defaulting to `30d`. A leaked
token is valid for up to thirty days and there is no way to cut it off. Signing
out, changing a password, and removing an admin from `ADMIN_EMAILS` all leave
existing tokens working. Rotating `JWT_SECRET` is the only lever, and it signs
every user out at once.

**Suggested fix.** Put `jwtVersion` in the token payload at issue time in
`backend/src/auth/google.ts:170`, compare it against the user row on verify, and
increment the column to revoke. The column is already there and already migrated,
so this is a small change with no schema work.

### S6. Fastify 4 is end of life and nothing audits dependencies

`backend/package.json` pins `"fastify": "^4.27.0"`. The v4 line no longer
receives security fixes. `@fastify/cors`, `@fastify/helmet` and
`@fastify/rate-limit` are all pinned to their v4 compatible majors, so they move
together.

`.github/workflows/ci.yml` runs a typecheck, vitest, the frontend lint and the
frontend build. There is no `npm audit` step, no Dependabot configuration, and no
Renovate configuration. `.github/` contains exactly one file.

**Suggested fix.** Add `npm audit --audit-level=high` to both CI jobs, and add
`.github/dependabot.yml` for the two npm ecosystems. Schedule the Fastify 5
upgrade as its own piece of work rather than folding it into a feature branch.
The plugin majors move with it, and `@fastify/rate-limit` is load bearing on the
routes that cost money.

### One stale comment worth correcting

`backend/src/api/admin.ts:38` says "Every route is read-only. Nothing here can
modify or delete data." That is no longer true. The same file contains
`PUT /admin/corpus/:slug`, `DELETE /admin/corpus/:slug`,
`POST /admin/corpus/import`, the pricing publish routes, and `writeEnvKey`, which
rewrites `backend/.env` on disk. This is not a vulnerability, the routes are all
behind `requireAdmin`, but the comment will mislead the next person who reads the
file looking for the write surface. Fix the comment.

---

## 2. Broken

Things that do not work. Nothing in this section is intentional.

| ID | What | Status |
|---|---|---|
| B1 | `npm run lint` in `backend/` | Verified by running |
| B2 | `npm run db:generate` in `backend/` | Verified by running |
| B3 | The repo is not under version control | Confirmed |
| B4 | The frontend CI job fails | Confirmed, and it is a consequence of D1 |

### B1. `npm run lint` in backend does not work

`backend/package.json` defines `"lint": "eslint src --ext .ts"`, but eslint is
not in `backend/devDependencies` and is not installed. Running it produces:

```
'eslint' is not recognized
```

The script exists and does not work. Do not print it in a runbook as though it
does. `npm run typecheck` and `npx tsc -p tsconfig.json` both work and are what
CI actually runs.

`frontend-jsx` is unaffected. Its `npm run lint` is clean and eslint is properly
declared there.

**Suggested fix.** Either install eslint plus the `@typescript-eslint` packages
in the backend and get the tree clean, or delete the script. A script that fails
on invocation is worse than no script, because it teaches people to ignore red
output.

### B2. `npm run db:generate` fails

`drizzle-kit generate` fails with an esbuild spawn error on the founder's
machine. The esbuild binary is present, so this looks like a local install
artefact rather than a defect in the repo. `backend/package.json` carries an
`overrides` block pinning esbuild for `@esbuild-kit/core-utils`, and CI installs
with `--ignore-scripts`, which skips the esbuild postinstall. One of those is the
likely cause.

Consequence for you: migration `0005` was written by hand in the project's
existing SQL format, because the generator could not produce it. If you add a
migration and `db:generate` still fails, follow the same pattern rather than
fighting the tool at the wrong moment.

`npm run db:migrate` is unaffected and works. Verified by running: on an empty
database it completes cleanly and produces nine tables (`agency_leads`,
`api_calls`, `audit_log`, `billing_events`, `corpus_names`, `scan_results`,
`scans`, `settings`, `users`).

**Suggested fix.** Try a clean `npm install` in `backend/` on your own machine
first, without `--ignore-scripts`. This may simply not reproduce for you. Confirm
that before you spend time on it.

### B3. There is no git repository

There is no `.git` directory anywhere in the tree. No history, no branches, no
remote, and no record of why anything is the way it is beyond the comments in the
source and these documents.

This is the first thing to fix, before you change a line.

Two related notes, and the second corrects a stale statement you may have been
given:

- `backend/.gitignore` has existed since May 2026 and is minimal but correct.
- The handover brief states there is no `.gitignore` at the root or in
  `frontend-jsx/`, and no `frontend-jsx/.env.example`. That was true until 26
  August 2026. All three files now exist, written during handover preparation.
  None of them has ever been exercised against a real repository, because there
  still is not one. Read them before your first commit rather than trusting them.

The root `.gitignore` excludes `node_modules/`, `dist/`, and every `.env`. It
deliberately does **not** exclude `frontend-jsx/public/`. See D6 for why.

**Before the first commit**, run `git status` and confirm that `backend/.env` is
not in the list. That file holds 28 real values including `JWT_SECRET`,
`DATABASE_URL`, `GEMINI_API_KEY`, `ADMIN_API_PASSWORD`, `GITHUB_TOKEN` and the R2
storage credentials. Committing it publishes all of them, and a force push does
not un-publish anything a mirror has already fetched.

### B4. The frontend CI job fails today

`.github/workflows/ci.yml` runs `npm run build` in the frontend job. That
triggers `prebuild`, which runs `scripts/check-legal.cjs`, which fails by design
while the legal placeholders are unfilled. See D1.

So the frontend CI job is red, and will stay red until the CIN, the registered
office address with PIN, and the named Grievance Officer are filled in.

This is a real operational fact even though the cause is deliberate. Do not "fix"
it by removing the gate. Either fill in the legal details, or split the job so
lint and `npx vite build` run separately from the gate and the gate reports its
own status. `npx vite build` on its own succeeds. Verified by running.

The backend CI job passes: typecheck is clean and `npm test` passes with 60 tests
across 3 files.

---

## 3. Deliberate. Do not "fix" these

Everything in this section looks like a defect and is not. Each has a reason, and
in most cases the reason is a specific incident. Read the reason before you touch
it.

| ID | Looks like | Actually is |
|---|---|---|
| D1 | The frontend build is broken | A legal gate holding the build until the company details are real |
| D2 | An odd extra prebuild script | A guard against printing a certificate in the wrong child's name |
| D3 | A `throw` where a `return` would do | The fix for a rate limit being cached as a permanent answer for 180 days |
| D4 | An accessibility failure nobody has fixed | An accepted exception, decided by the founder |
| D5 | Certificates ignore dark mode | Correct. They are printed |
| D6 | Generated files committed to the repo | They cannot currently be regenerated without a database dump |

### D1. `npm run build` in frontend-jsx fails by design

`frontend-jsx/package.json` wires `prebuild` to `node scripts/check-legal.cjs &&
node scripts/check-scan-reset.cjs`. The legal check scans `src/legal/*.js` and
fails the build while three things are still missing: the CIN, the full
registered office address with PIN, and the named Grievance Officer required by
IT Rules 2011 Rule 5(9).

It also refuses a set of details that were wrong once and must not creep back:
the entity is Beyond Quantum Technologies Private Limited and not "Naam Dekho
Technologies", the registered office is in Lucknow and not Bangalore, the contact
address is the published gmail address and not an `@naamdekho.in` one, and Paytm
is not a payment processor for this platform.

`npm run dev` is unaffected. The gate can never block day to day work, only the
act of shipping. Publishing a privacy policy that reads "[To be filled by the
Company]" is worse than publishing none: it is a document the company cannot rely
on and an opposing lawyer can wave about.

**To build the frontend while the details are still pending**, run
`npx vite build`, which skips the npm lifecycle hook. That is a deliberate escape
hatch for development, not a way to ship.

**Do not** delete the prebuild hook, and do not fill the placeholders with
plausible looking invented values. Get the real ones from the founder.

### D2. The scan reset guard

`frontend-jsx/scripts/check-scan-reset.cjs`, the second half of `prebuild`. It
reads `src/pages/Home.jsx` and fails the build if `startScan()` stops clearing any
of seven pieces of certificate state: `finalName`, `firstAkshar`, `fiveHtml`,
`fiveState`, `fiveError`, `certHtml`, `certState`.

It exists because of a real incident. `startScan()` cleared the scan result state
but not the certificate state, which was added later. `finalName`, the "Which name
did you finally choose?" box, therefore survived every new search, and
`generateFive()` reads it first (`Home.jsx:535`):

```js
const chosen = (finalName || displayName || name).trim()
```

One name typed into that box was then printed on every certificate generated
afterwards, for every name searched thereafter, for the rest of the session. A
certificate in the wrong child's name is the worst thing this product can
produce.

The check reads source text rather than rendering the component. That is
deliberate: the alternative is a React test harness this project does not
otherwise need, and a shallow check that catches the exact regression is worth
more than a thorough one nobody maintains.

**If you add a field to `generateFive()`'s request body that is backed by
component state, add it to `MUST_RESET` in that script.** That is the whole
maintenance burden.

### D3. Cached model calls throw, they never return a miss

In `backend/src/lib/gemini.ts:420` and `backend/src/lib/sandhi.ts:145` you will
find this shape inside a `withCache` loader:

```ts
if (!res.ok) throw new Error(`gemini_${res.status}`);
```

Returning an empty string or a null there would be tidier and would be a serious
bug. `withCache` (`backend/src/cache/redis.ts`) writes whatever the loader
returns, and the TTL on these keys is 180 days. So a returned miss caches a
transient rate limit as the permanent answer "this name does not split", for six
months. That is exactly what happened: Divyom stopped splitting into Divya and Om
after one bad minute, and the certificate began describing real names as invented.

Throwing propagates the failure, nothing is written to the cache, and the next
request retries.

**The rule, for any new cached model call:** on a failed response, throw. Never
return a value that means "no result" from inside a `withCache` loader. A genuine
negative answer from the model may be cached. A failure to reach the model may
not.

### D4. `--accent` measures 3.98:1 and stays

The brand accent `--accent: #B8501C` measures 3.98:1 against the cream page
background, below the 4.5:1 WCAG AA floor for body text.

The founder has decided it stays. This is a recorded accepted exception, not an
oversight, and it has already been raised and closed more than once. Do not
re-raise it and do not "improve" it in passing.

The rest of the palette is locked to the same short list. No new hues.

| Token | Value |
|---|---|
| `--accent` | `#B8501C` |
| `--accent-2` | `#7A2E0E` |
| `--gold` | `#E8C76A` |
| `--blush` | `#E7B4C2` |
| `--lilac` | `#C3B6DE` |
| `--powder` | `#A5C4DD` |

Dark mode is complete and token based, with three theme states that must be kept
in step: bare `:root` for light, a `prefers-color-scheme: dark` block guarded with
`:not([data-theme="light"])`, and an explicit `:root[data-theme="dark"]` block. If
you add a token, add it to all three.

### D5. Certificates render light in both themes

Neither `backend/src/pdf/certificate.ts` nor
`backend/src/pdf/certificate-five.ts` contains a `prefers-color-scheme` block, a
`data-theme` hook, or a `color-scheme` declaration. Confirmed by reading both
files.

That is correct. These documents are printed and framed. A dark certificate is a
page of wasted toner. They are the one surface in the product that ignores the
theme, on purpose.

Two related properties of the certificate renderers, so you do not mistake those
for defects either:

- The logo is embedded as a base64 data URI. There is no asset file to ship and
  no path to get wrong.
- Typefaces load from `fonts.googleapis.com` at render time. With no outbound
  internet the sheet still renders, in Georgia or a generic serif. The fallback
  stacks in the source are there for exactly that case.

### D6. `frontend-jsx/public/` is tracked even though it is generated

697 HTML files and `sitemap.xml` live under `frontend-jsx/public/`, all produced
by `npm run build:names` in `backend/`. They are committed anyway, and the root
`.gitignore` says so in a comment.

The reason is G7. Until the team has a database dump, running the generator
destroys them. Those files are currently the artefact.

Once you hold a corpus dump and can regenerate reliably, revisit this. Not before.

---

## 4. Gaps and deferred work

Incomplete rather than broken. None of this stops the product running.

| ID | Gap | Size |
|---|---|---|
| G1 | 326 names have no verified Devanagari spelling | Large, and it is content work, not code |
| G2 | 259 proposed meanings are waiting for review | Founder time, roughly |
| G3 | 17 names have no meaning at all | Small |
| G4 | Razorpay is not integrated | The last planned piece of engineering |
| G5 | `NODE_ENV` is still `development` | Small, but it gates a deployment |
| G6 | The sandhi split is not deterministic between runs | Design question, not a quick fix |
| G7 | `build:names` without a database destroys 697 pages | A hazard, not a gap. Read it anyway |
| G8 | ~~Second model vendor configured but unused~~ **RESOLVED — removed** | None |

### G1. 326 names fall back to transliteration

`corpus_names` holds 536 published names. 210 rows carry
`corpus_names.native_spelling`, a verified Devanagari spelling. The other 326 do
not, and the site falls back to transliterating the roman spelling.

That fallback is wrong for roughly 63% of names, because roman spelling does not
record vowel length. On screen it looks like this: **Ram** renders as **रम**
rather than **राम**, unless the lexicon has the correct spelling. To a Hindi
reader that is not a near miss, it is a different word.

The blast radius is wider than it looks. `registerNameSpellings()` in
`backend/src/lib/transliterate.ts:185` loads that lexicon, and it is called in two
places: at server start (`backend/src/server.ts:36`) and by the page build
(`backend/src/scripts/build-name-pages.ts:76`). Every Indian script on the site is
derived from the Devanagari form, so one wrong vowel there is wrong in all ten
scripts, on the live site and on the static pages alike.

**What closing this looks like:** verified spellings for the remaining 326 names,
entered into `corpus_names.native_spelling`. This is lexicographic work. Do not
close it by improving the transliterator, because the information genuinely is not
in the input.

### G2. 259 meanings await review

Of the 536 published names, 260 have a verified meaning that the public pages
print: 210 sourced from en.wiktionary.org with a clickable URL, and 50 older
"Naam Dekho editorial" entries.

A further 259 carry an unverified Gemini proposal. These are held back from
publication and sit in the console's review queue at `/admin/corpus`. The
supporting routes are in `backend/src/api/admin.ts` from line 491.

The hold back is correct. An unsourced meaning printed as fact on a name page is
the kind of error that ends up screenshotted. They publish when a human approves
them, not before.

### G3. 17 names have nothing

17 of the 536 have neither a verified meaning nor a proposal. They render without
a meaning section. Smallest of the three content gaps and the easiest to close.

### G4. Razorpay is not integrated

15 of the 43 variables in `backend/.env` are blank or placeholders, and all three
Razorpay ones are empty: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
`RAZORPAY_WEBHOOK_SECRET`. `backend/src/config.ts` marks all three `.optional()`,
so the server starts without them.

Payments are not integrated. This is the last planned piece of work, and it is
known and scheduled rather than forgotten.

Note the ordering dependency with S3: the API keys screen that will hold the
payment keys is currently behind a four digit password. Fix S3 before you put a
live payment secret behind it.

The token economy that payments will feed already exists and works. `spendAddon`
and `refundAddon` are used by `POST /v1/scans/:id/certificate-five` in
`backend/src/api/scan.ts`, which debits before rendering and refunds if the render
fails.

### G5. `NODE_ENV` is still `development`

`backend/.env:2` reads `NODE_ENV=development`, and so does
`backend/.env.example:2`. `backend/src/config.ts` exports `isProd` and `isDev`
from it.

Before any deployment, audit every use of `isDev` and `isProd` in the backend and
confirm each one behaves correctly when the flag flips. The degraded mode paths in
particular, `stackHealth()`, `devScanGet()`, the in-memory Socket.IO adapter, and
the in-memory cache and rate limiter in `backend/src/cache/redis.ts`, all exist so
the stack runs without Postgres or Redis. They are the right behaviour in
development and the wrong behaviour in production, where a missing database should
be a loud failure and not a silent fallback to an in-memory store.

### G6. The sandhi split is not deterministic between runs

`backend/src/lib/sandhi.ts` performs संधि विच्छेद. It converts the name to
Devanagari, asks whether it is a single dictionary word, and if not recovers the
parts and names the sandhi rule that joined them. It is used by the certificate
essay and by the landmine tile.

It replaced an earlier splitter that asked the question in roman letters and was
biased toward answering NONE, which is how a real name like Rivaan came back as
having no meaning and the certificate called it "a made name".

The remaining problem: the call is not fully deterministic between runs. The
request already sets `temperature: 0` and a strict `responseSchema`, so the
variation is in the model rather than in the settings. The result is cached for
180 days under `cache:sandhi:<roman>`, so **whichever answer arrives first is
fixed for six months.** Two clean installs can therefore disagree permanently
about the same name.

**Do not** treat this as a cache bug and shorten the TTL. The long TTL is
deliberate and D3 explains what the cache is protecting against. The fix is
upstream: either accept only answers that clear a confidence bar before they are
cached, or promote confirmed splits into the corpus so the model stops being asked
at all. Agree the approach before implementing one.

### G7. Never run `build:names` without the database

This is a hazard rather than a gap, and it is the most expensive mistake available
in this repo, so it is repeated here.

`npm run build:names` in `backend/` regenerates 697 static HTML files under
`frontend-jsx/public/` plus `sitemap.xml`, which lists 705 URLs. The extra 8 are
React routes.

| Cluster | Pages |
|---|---|
| `/n/` name pages | 537 |
| `/trademark-class/` | 46 |
| `/names/` | 39 |
| `/nakshatra/` | 26 |
| `/domains/` | 15 |
| `/rashi/` | 13 |
| `/numerology/` | 10 |
| `/script/` | 10 |
| `/explore/` | 1 |

Run it **without** a reachable database and it falls back to a built-in 50 name
corpus. 697 pages collapse to about 50, and the sitemap is rewritten to match.
Since there is no version control (B3), there is nothing to restore from.

Get the database, or a dump of it, before you run that command.

The build system itself is in good order. Cluster builders live in
`backend/src/seo/*.ts` and all implement the same contract from
`backend/src/seo/shell.ts` (`SeoCtx` in, `SeoDoc[]` out), so adding a cluster is
one new file plus one line in `build-name-pages.ts`. Each cluster applies a
minimum content threshold and recomputes it every build, so pages publish
themselves as the corpus grows. The build prints a warning if any cluster links to
a page that was not emitted, because an internal 404 arriving from your own
sitemap is worse than a missing link.

### G8. Second model vendor — resolved by removal

Startup name alternatives used to call a second, paid model API, falling
back to an in-house heuristic when its key was absent. The key was never
set, so the heuristic was the only path that ever ran. On 26 August 2026
the integration and its dependency were removed rather than left as a
dormant bill. `generateAlternatives()` now calls the heuristic directly.

Worth knowing when you read the model cost picture, because the rest of it is
Gemini. The certificates use `gemini-flash-lite-latest`, one call per certificate,
for the roughly 150 word essay only, cached 180 days under
`cache:cert-essay:v2:<name>:<gender>`. Everything else on the sheet, the numerology
wheel, the nakshatra, the transliteration, the layout and the logo, is
deterministic TypeScript with no model involved.

With no `GEMINI_API_KEY` everything degrades rather than failing: the essay falls
back to plain prose and sandhi returns null.

---

## 5. Accepted exceptions

Closed decisions. They have been raised, considered, and settled. Do not reopen
them without talking to the founder first.

| Decision | Where | Why it is closed |
|---|---|---|
| `--accent` stays at `#B8501C` despite measuring 3.98:1 | Design tokens | Founder decision. Already raised more than once |
| Certificates ignore the theme and always render light | `backend/src/pdf/certificate*.ts` | They are printed |
| The legal gate stays wired to `prebuild` | `frontend-jsx/package.json` | A wrong privacy policy is worse than a late one |
| The scan reset guard stays, shallow as it is | `frontend-jsx/scripts/check-scan-reset.cjs` | It catches the exact regression that occurred |
| `frontend-jsx/public/` stays tracked | Root `.gitignore` | Cannot be regenerated without a corpus dump. Revisit once you have one |
| Cached model calls throw rather than return a miss | `gemini.ts`, `sandhi.ts` | A returned miss poisons a 180 day cache |

---

## 6. Suggested order of work

Not a schedule, just the order that avoids doing anything twice.

| Step | Why in this position |
|---|---|
| 1. `git init`, check `git status`, commit (B3) | Everything after this is reversible. Nothing before it is |
| 2. Fix S1 and S2 together | Same ownership rule, same helper, one review |
| 3. Change the `ADMIN_API_PASSWORD` value and add the boot checks (S3, S4) | Both are `config.ts` work, and G4 depends on S3 |
| 4. Get a database dump from the founder | Unblocks G7 and removes the largest footgun in the repo |
| 5. Fill in the legal details (D1) | Turns CI green and unblocks a real build |
| 6. S5, S6, then B1 | Real, but not urgent |
| 7. Razorpay (G4) | Last, and only once S3 is done |

Content work (G1, G2, G3) runs in parallel and does not block any of the above.
