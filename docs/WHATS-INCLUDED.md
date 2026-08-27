# What is in this repository, and what will not work

Read this first. It is the honest inventory: what you are getting, what runs
today, and what is deliberately broken or missing. Everything below was checked
on 27 August 2026 by running it, not by reading the code.

---

## 1. What you are getting

919 files, about 41 MB with `node_modules` excluded.

| Area | Contents |
|---|---|
| `backend/src/` | 80 files — Fastify API, scanners, certificate and numerology engines, queue, admin |
| `frontend-jsx/src/` | 40 files — React 18 + Vite app, customer site and founder console |
| `frontend-jsx/public/` | **697 pre-built SEO pages** plus `sitemap.xml` and `robots.txt` |
| `backend/drizzle/` | 7 SQL migrations and their journal |
| `backend/seed/` | The name corpus — 536 names, one file |
| `backend/__tests__/` | 3 files, 60 tests, no database required |
| `docs/` | 15 handover documents plus 39 files of background reference |
| `diagrams/` | 8 architecture diagrams |
| `.github/workflows/ci.yml` | CI — typecheck and tests on the backend, lint on the frontend |

The 697 static pages are already built and committed, so you can see the SEO
output without running anything.

### The name corpus ships with the code

`backend/seed/corpus_names.sql` holds **536 names, 519 with a meaning, 210 with
a Devanagari spelling that was verified rather than transliterated**. Load it
with `npm run db:seed`.

That 210 is the number that matters. Without it the transliterator guesses vowel
length, which is wrong for roughly 63% of names — Ram comes out as रम instead of
राम. This data cannot be regenerated from the code, which is why it is in the
repository rather than something you have to ask for.

---

## 2. Getting it running

```bash
cd backend
npm install
cp .env.example .env     # fill DATABASE_URL and JWT_SECRET at minimum
npm run db:migrate       # creates 10 tables
npm run db:seed          # loads the 536 names
npm run dev
```

```bash
cd frontend-jsx
npm install
cp .env.example .env     # needs VITE_GOOGLE_CLIENT_ID
npm run dev
```

**Use Node 20.** `package.json` says `>=20.0.0`, CI runs 20, and at least one
tool breaks on Node 24 — see §4.

**On Windows, clone somewhere short** such as `C:\dev\naam-dekho`. Paths in this
project run about 180 characters deep and Windows caps them at 260. `git clone`
fails with *Filename too long* otherwise. `core.longpaths true` helps.

---

## 3. What is verified working

Each of these was run, not assumed.

| Check | Result |
|---|---|
| `backend` — `npx tsc -p tsconfig.json` | clean |
| `backend` — `npm test` | 60 tests pass, 3 files |
| `backend` — `npm run db:migrate` on an **empty** database | clean, creates 10 tables |
| `backend` — `npm run db:seed`, run twice | 536 / 519 / 210 both times, idempotent |
| `frontend-jsx` — `npm run lint` | clean |
| `frontend-jsx` — the prebuild gate | fires correctly and exits 1 |

---

## 4. What will NOT work, and why

Nothing here is a surprise to us. Each one is deliberate, documented, or
diagnosed.

### Deliberate

| Thing | What happens | Why |
|---|---|---|
| `frontend-jsx` — `npm run build` | **Fails, exit 1.** Prints exactly which placeholders are unfilled. | A gate blocks the build while `src/legal/privacy.js` still has three placeholders: the CIN, the registered office address with PIN, and the named Grievance Officer required by IT Rules 2011 Rule 5(9). Publishing a privacy policy without these is a legal problem, so the build refuses. Fill them and it passes. `npm run dev` is unaffected. |
| Payments | Checkout returns 500 | Razorpay is not integrated. All three `RAZORPAY_*` variables are blank. This is the last planned piece of work. |
| Legal and regulatory scrapers | Return mock data in `NODE_ENV=development` | MCA21, IP India, Copyright, GST, DPIIT, FSSAI, RBI, SEBI, IRDAI. Each is a `stubLegal(...)` call waiting for a real Playwright flow. See `backend/STUBBED.md`. |
| PDF **file** generation | Returns a placeholder | The report renders as a print-ready page (browser Print → Save as PDF). Producing a stored `.pdf` needs Python and WeasyPrint. |

### Broken, with a cause

| Thing | What happens | Cause and workaround |
|---|---|---|
| `backend` — `npm run lint` | Fails immediately | The script exists, **eslint is not installed**. Either add it or ignore the script. `npm run typecheck` and `npm test` both work. |
| `backend` — `npm run db:generate` and `npm run db:studio` | **Fail, exit 1**, no files written | drizzle-kit 0.21.4 bundles esbuild 0.19.12, which looks for its binary at a nested path while npm hoists it to the top level, then dies with `ENOENT`. Setting `ESBUILD_BINARY_PATH` gets past that and hits a second failure, so the binary looks incompatible with **Node 24** on this machine. **Untested on Node 20** — try that first. Migrations 0005 and 0006 were hand-written in the existing SQL format because of this, which is a perfectly good fallback. `npm run db:migrate` is unaffected and works. |

### Hazards — these do damage if you run them at the wrong time

| Thing | What happens |
|---|---|
| `npm run build:names` **before** `npm run db:seed` | It falls back to a built-in 50-name list, so the 697 pre-built pages are **overwritten** with about 50 and `sitemap.xml` is rewritten to match. Seed first. See `docs/SEO-PAGES.md`. |

### Needs credentials you do not have yet

None of these are code problems. `backend/.env.example` documents **32
variables**; `frontend-jsx/.env.example` documents one.

| Blocked by | Effect until set |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` and its backend counterpart | **Google sign-in does not work.** It is the only auth method — phone OTP was removed on 6 August 2026. |
| `GEMINI_API_KEY` | Certificates still generate but degrade: the essay falls back to plain prose and the sandhi split returns `null`. Nothing crashes. |
| `DATABASE_URL` | Scans and users live in a per-process memory store and vanish on restart. The corpus cannot be read. |
| Redis | Optional in development. |
| `SCRAPING_BEE_API_KEY`, `GOOGLE_CSE_API_KEY`, `TWO_CAPTCHA_KEY` | Those specific checks return "pending" rather than failing. |
| Bhashini keys | `npm run check:bhashini` has nothing to talk to. The code is built and tested; only the registration is outstanding. |

---

## 5. Links and references

**Internal documentation links: all correct.** Every markdown link and every
backticked file path across all 19 markdown files was resolved against the file
list. Nothing dangles.

Four references look broken to an automated checker but are correct as written,
so do not "fix" them:

- `.github/dependabot.yml` in `KNOWN-ISSUES.md` — a file we **recommend you
  create**, not one that exists.
- `src/pdf/shortlist.ts` in the certificate design note — marked `(new)`, a file
  **to be written**.
- `HANDOFF.md`, mentioned twice — a stale May 2026 document that was
  **deliberately deleted**. Both mentions describe its removal.

**Three external links are not resolving**, all inside
`docs/reference/product-marketing.md`, all competitor sites listed for
positioning. None is used by any code:

| URL | Status |
|---|---|
| `https://knowem.com/` | no response at all |
| `https://namechk.com/` | 403 |
| `https://www.namecheckr.com/` | 503 |

The 403 and 503 are probably bot-blocking rather than dead sites; they were
tried with a normal browser user-agent and behaved the same.

**One reference in the repo is stale in a way worth knowing about:**
`backend/README.md` was rewritten on 27 August 2026. The previous version
described phone OTP sign-in over MSG91 and a static HTML front end, both long
gone. If you have an older copy of this repository, discard that file.

---

## 6. What is deliberately NOT in the repository

- **No `.env` files.** `backend/.env` holds 28 real secrets on the founder's
  machine. Only the two `.env.example` files ship, and both carry variable names
  with no values.
- **No customer data.** There are 7 real accounts and 164 scans on the founder's
  machine. None of it is here. Only the corpus was exported — names, meanings
  and citations.
- **No `node_modules`.** About 350 MB, hence the 41 MB repository.

---

## 7. Read next, in this order

| Document | What it gives you |
|---|---|
| `README.md` | Orientation and the closed design palette |
| `docs/SETUP.md` | Step-by-step local setup, every environment variable explained |
| `docs/KNOWN-ISSUES.md` | **Read before planning a sprint.** The outstanding security work — routes missing ownership checks, an unauthenticated Socket.IO handshake, no session revocation, and Fastify 4 being past end of life. |
| `backend/STUBBED.md` | Every deliberately incomplete feature and exactly what it needs |
| `docs/ARCHITECTURE.md` | How a scan flows through the system |
| `docs/SEO-PAGES.md` | How the 697 pages are generated |
| `docs/CONTENT-AND-MODELS.md` | What Gemini writes, what is deterministic TypeScript, and the cost shape |
| `docs/ADMIN-ACCESS.md` | The founder console and how admin access is granted |

One note on `KNOWN-ISSUES.md`: it is unusually blunt about this codebase's
weaknesses. That is intentional. Assume it is describing real problems rather
than hedging.
