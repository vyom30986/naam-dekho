# Export checklist

What to do before handing this repository to the engineering team. Written
after auditing the folder as a fresh clone would see it, so the findings below
were measured rather than assumed.

Work through it in order. Steps 1 and 2 are the ones that matter.

## 1. Decide about the API keys, before anything else

`backend/.env` holds **28 real values**. Among them:

| Variable | What it opens |
|---|---|
| `JWT_SECRET` | Signs every session token. Anyone holding it can mint a session for any account, including an admin one. |
| `DATABASE_URL` | Full database credentials. |
| `ADMIN_API_PASSWORD` | The founder console's second password. |
| `GEMINI_API_KEY` | Billable. |
| `GITHUB_TOKEN` | Scope depends on how it was issued. Check it. |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Object storage, read and write. |
| `GOOGLE_CSE_API_KEY`, `SCRAPING_BEE_API_KEY`, `TWO_CAPTCHA_KEY` | Billable third party quota. |

`.gitignore` excludes `.env`, and the push was checked rather than trusted:
all 951 committed files were scanned against the live values in `backend/.env`
and none of them appears. Only `backend/.env.example` and
`frontend-jsx/.env.example` are in the repository, and both carry names
without values.

A **zip** of this folder is a different matter. A zip ignores `.gitignore`
entirely and carries every `.env` with it. If a zip has already gone out,
treat every key above as disclosed and rotate it.

`JWT_SECRET` deserves a separate note: rotating it signs every existing
session out, which is harmless today with four accounts and worth doing
before launch.

Two things were tidied on the way in, and neither was a live credential.
`backend/.env.example` shipped a real-looking 48 character `JWT_SECRET`, not
the live one, now replaced with the `openssl rand -hex 32` command that
generates a real one. And `drizzle.config.ts` hardcoded a fallback database
URL, which meant a missing `DATABASE_URL` would quietly connect somewhere
plausible instead of failing; it now throws.

## 2. Version control, done

The repository is `vyom30986/naam-dekho`, **private**, first commit pushed on
26 August 2026. 951 files, about 25 MB, against roughly 350 MB had
`node_modules` gone in.

One thing worth passing to anyone who clones it. `git add` failed the first
time with *Filename too long*: this project sat about 180 characters deep and
Windows caps paths at 260. `core.longpaths true` is set in the repository
config, but tell the team to clone somewhere short, like `C:\dev\naam-dekho`,
or they will hit the same wall.
## 3. Dead weight, already removed

This was done on 26 August 2026, before the first push. Recorded here so
nobody goes looking for something that was deliberately taken out.

**Removed.** `admin/`, a static HTML prototype of the console, superseded by
`frontend-jsx/src/admin/*.jsx` and referenced by nothing. The eleven loose
`.html` files at the root, the same prototype of the customer site, none of
which referenced the app source. `HANDOFF.md`, dated 16 May 2026, which told
the reader to open those dead files. Three zips of the same prototypes. The
scratch files `test2.txt`, `test_write.txt` and `python_test.txt`. Two
setup notes for an AI coding tool, which the engineering team has no use for.

**Moved, not deleted.** The business and legal documents (PRD, copyright
filing, dev documentation, legal policies, the 62-check and free-versus-paid
workbooks, the connector catalogues) are in `docs/reference/`. The scripts
that generate them, and the small `package.json` that only existed to run
them, are in `docs/reference/build-scripts/`. The archived static site,
previously the confusingly named `docs legacy-html/`, is now
`docs/reference/legacy-html/`. The planning notes are in `docs/`.

The root now holds `README.md`, `.gitignore` and the source folders. It went
from 45 loose files to two.

## 4. Tell the team the three things that will confuse them on day one

All three are covered in `docs/`, but they are worth saying in the handover
message itself, because each one looks like a broken repository.

1. **`npm run build` in `frontend-jsx` fails on purpose.** A prebuild gate stops
   it while `src/legal/privacy.js` still holds three placeholders: the CIN, the
   registered office address with PIN, and the named Grievance Officer required
   by IT Rules 2011 Rule 5(9). `npm run dev` is unaffected. Fill those three in
   and the build passes.
2. **`npm run lint` in `backend` does not work.** The script is there, eslint is
   not installed. `npm run typecheck` and `npm test` both work.
3. **Do not run `npm run build:names` without the database.** With an empty one
   it falls back to a built in 50 name corpus, so 697 pre-rendered SEO pages
   collapse to about 50 and `sitemap.xml` is rewritten to match. See
   `docs/SEO-PAGES.md`.

## 5. The corpus ships with the code

It used to be true that the corpus lived only in the founder database and
had to be sent separately. It no longer is. `backend/seed/corpus_names.sql`
is in the repository and `npm run db:seed` loads it.

536 names, 519 with a meaning, 210 with a Devanagari spelling that was
verified rather than guessed. That last number is the one that matters:
without it the transliterator falls back to guessing vowel length, which is
wrong for roughly 63% of names, and Ram renders as रम rather than राम.

Only the corpus is exported. Customer data — 7 accounts and 164 scans on
the founder machine — is deliberately left out, so nobody receives personal
data they have no reason to hold.

## 6. What is verified working, so they know the baseline

Each of these was run, not assumed:

| Check | Result |
|---|---|
| `backend`: `npx tsc -p tsconfig.json` | compiles clean |
| `backend`: `npm test` | 60 tests pass in 3 files |
| `backend`: `npm run db:migrate` on an **empty** database | clean, produces all 9 tables |
| `frontend-jsx`: `npm run lint` | clean |
| `frontend-jsx`: `npx vite build` | succeeds |

`docs/KNOWN-ISSUES.md` carries the rest, including the outstanding security
work. Point the team at that file early. It is the one that tells them what
they are actually inheriting.
