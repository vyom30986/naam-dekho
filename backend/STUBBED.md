# STUBBED.md — what is not real yet, and why

Updated: 3 August 2026 (sample-data purge session)

Every item below currently returns placeholder or partial data. Nothing here
is silently faked — each one is clearly marked in the code and in the API
responses ("pending" status or a "stub: true" note in the tile detail).

| # | What is stubbed | Why | What you must provide to unstub | What it returns meanwhile |
|---|-----------------|-----|--------------------------------|---------------------------|
| 1 | MCA21 Company Register check | Needs a CAPTCHA-solving account + real scraper work (block 5) | 2captcha.com account key (~$3/1000 solves) → put in `.env` as `CAPTCHA_2CAPTCHA_KEY` | In development: a realistic practice answer (same name always gives the same answer). In production: "pending" |
| 2 | IP India Trademark check (45 classes) | Same as above — CAPTCHA on every request | Same 2Captcha key | Same as above |
| 3 | GST trade-name check | Real scraper lands in block 5 | Nothing from you — pure build work | An honest informational tile: it explains that GST trade names are not exclusive and links to the official gst.gov.in search. It never claims "found" or "not found", and never shows as a red conflict (your rule) |
| 4 | ~~Amazon India Brand check~~ **LIVE 3 Aug 2026.** ScrapingBee key supplied and wired. Searches amazon.in, reads product titles from `<h2 aria-label>`, and flags the brand only when titles *lead* with the name (so "Ira" does not match "Admira"). Verified: "boAt" → 5 listings, conflict; a nonsense name → clear. **Costs 1 credit per check** at `render_js=false`, cached 24h | — | — | — |
| 5 | Flipkart Brand check | **Flipkart blocks proxied requests** — verified 3 Aug 2026 at both standard and premium-proxy tiers, both returned "Access Denied". The page does contain 2–3 product names, but they come from a "popular products" widget, not the search results, so reading a verdict from them would be inventing one | Nothing available today. Would need a residential/stealth proxy tier, and even that is unproven | Honest "Flipkart blocks automated checks — open the search to see for yourself" with a one-tap link. Never a guessed verdict |
| 6 | Google Search (SERP) check | Needs a free Google key | Free key from Google Cloud Console → `GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_ID` | "Configure key to enable" |
| 7 | ~~Meaning in 10 languages~~ **RESOLVED 3 Aug 2026** — the name is now written in all 10 Indian scripts by our own offline engine (`src/lib/transliterate.ts` + `@indic-transliteration/sanscript`, MIT). No key, no account, no network, no cost. Bhashini is now an optional accuracy upgrade only, not a requirement — details kept below for reference. NOTE: this replaced an engine that was producing genuine gibberish (Priya → परइयअ); see the entry in the fixed-list below | — | — | — |
| 7b | *(reference)* Bhashini upgrade path | The full Bhashini client is **built and tested**; the Government platform requires an account to issue an inference key, and only the account holder can register (verified 3 Aug 2026: service discovery is open, but inference returns HTTP 403 `{"detail":"Not authenticated"}`) | Free 5-min registration at https://bhashini.gov.in/ulca/user/register → paste `BHASHINI_USER_ID` + `BHASHINI_ULCA_API_KEY` into `.env`, then run `npm run check:bhashini` | Works today from an in-house seed dictionary + Devanagari transliteration. The tile is credited `internal://lingo` and never claims Bhashini unless Bhashini actually answered |
| 8 | OTP text messages | Needs an MSG91 account | Free msg91.com account (25 texts/day) → `MSG91_AUTH_KEY` + `MSG91_TEMPLATE_ID` | In development the 6-digit code is shown ON the sign-in page itself (clearly labelled "Development mode"). This on-screen display switches off automatically the moment MSG91 keys are configured, and never happens in production |
| 9 | PDF evidence report — as a stored FILE | The report itself now WORKS as a beautiful print-ready page (open it from the unlocked PDF tile, then browser Print → Save as PDF). Converting it into a stored, downloadable .pdf file needs Python + WeasyPrint installed | Install Python 3.11 from python.org | The live report page |
| 10 | PDF file storage | Needs cloud storage credentials | Cloudflare R2 (or AWS S3) keys → `R2_*` in `.env` | Report served live from the API instead |
| 11 | ~~Auto-generated alternative names — AI quality~~ **RESOLVED** | The feature WORKS: names come from an in-house pattern engine and each one is re-verified against real domain + social checks before being shown (FR-5.6.3, currently at free-check depth). The paid model that once sat in front of it was removed on 26 Aug 2026, so there is nothing left to buy here | — | In-house generation, no model cost |
| 12 | Paytm payment fallback | Production signature helper deliberately deferred; Razorpay is primary | Decision to enable + Paytm sandbox creds | Razorpay-only until then |
| 13 | ~~Whole database layer~~ **RESOLVED** — a real PostgreSQL 16.6 database now runs directly on this machine (no Docker; portable install at C:\Users\vyoma\naamdekho-pg, auto-starts on Windows login). Accounts, credits and scan history are permanent. Docker Desktop kept crashing on this machine (its AI component bug) and is no longer needed for local development — it can be uninstalled. Redis remains optional locally (in-memory fallbacks cover it); production will use managed Postgres + Redis in the cloud | — | — | — |
| 14 | Instagram & Facebook checks | Meta shows a login-wall to automated visitors from ordinary internet connections, so the truth can't be determined | A rotating-proxy service (same ScrapingBee account as #4 can cover this) — or accept "will retry" until then | Honest "platform blocked automated check, will retry" — never a false conflict (PRD rule R-4). The other 4 social checks (X, YouTube, LinkedIn, WhatsApp) work and were verified both directions |

## Built 3 August 2026 (founder-approved batch)

| Feature | State | What it needs from you |
|---|---|---|
| **Keepsake certificate ₹29** | **Built & verified.** `GET /v1/scans/:id/keepsake` renders an A4 print sheet *and* a 1080×1080 Instagram square in one page. Shows the name in 10 scripts, Chaldean reading, nakshatra + rashi, nicknames and pronunciation. Optional `?bornOn=` prints a birth line. Gated to paid scans (free returns 402), same rule as the evidence report | Nothing to build — but it cannot be *sold* until Razorpay is connected |
| **Founder's console** | **Built & verified** at `/admin`. Signups, searches, credits outstanding, mode split, average verdict, a 14-day bar chart, most-searched names, and the last 50 searches | Add your phone number to `ADMIN_PHONES` in `.env` (comma separated, exactly as you sign in) and restart. Blank = console disabled |
| **SEO plumbing** | **Built & verified.** Per-route titles/descriptions/canonicals/Open Graph, Organization + WebSite JSON-LD on the homepage, `sitemap.xml` (59 URLs), `robots.txt`. `/account` and `/admin` carry `noindex` | Set `SITE_ORIGIN` in `.env` before the production build so the sitemap points at the real domain |
| **Name pages (pSEO pilot)** | **Built & verified.** 50 static HTML pages + an index at `/n/`. Each carries that name's own transliteration across 10 scripts, Chaldean reading, nakshatra, nicknames and pronunciation — proprietary computed data, not a scraped list. Regenerate with `npm run build:names` | Nothing. Watch indexing for 4-6 weeks before scaling past 50 |
| **Automatic test runs (CI)** | **Written** at `.github/workflows/ci.yml` — typecheck + tests on the backend, production build on the frontend, on every push | The code is not in a git repository yet. CI starts working the moment you push it to GitHub |

Revenue is deliberately NOT estimated anywhere on the admin console. Until
Razorpay is live there are no payments, and a made-up number on a dashboard is
worse than no number at all.

## SECURITY — paywall bypass found and closed (3 Aug 2026)

**Severity: critical (revenue). Never exposed to the public — the site has not
been deployed. Found by an internal audit, not by a customer.**

`POST /v1/scan` accepts a `tier` field from the client with five allowed values.
The credit gate asked `tier === "deep"`, but everything downstream asked
`tier !== "free"`. The two disagreed on three values, so:

```
curl -X POST /v1/scan -d '{"name":"X","mode":"business","tier":"shortlist"}'
```

with **no account and no credit** returned the full 26-check paid scan, and
because the scan row was then stamped with a non-free tier, `/report`,
`/keepsake` and `/alternatives` all returned 200 instead of 402. Every ₹50
premium check, plus the ₹29 keepsake, obtainable for ₹0.

**Fixed** by routing every tier decision through one predicate,
`isPaidTier()` in `src/lib/types.ts`. A new tier added to `ScanTier` now
defaults to PAID — it fails closed. Guarded by three regression tests.

Verified after the fix: `shortlist` / `keepsake` / `agency` / `deep` all return
401 without auth; a free scan still returns 22 tiles and 402 on all three
premium endpoints; a signed-in paid scan still returns 26 tiles and 200 on the
report. 12 anonymous paid-tier rows in the local database — all from the audit's
own probes, all named "Bypasstest"/"Probeagency" etc. — were deleted so the
admin console figures stay honest.

### Second finding: rate limiting was bypassable (same audit)

The server ran with `trustProxy: true`, which trusts the **entire**
`X-Forwarded-For` chain — including whatever the caller invents. Since the rate
limiter keys on `req.ip`, rotating that one header gave unlimited free scans,
defeating PRD rule R-6 (30 searches per IP per hour). Every free scan makes real
outbound calls, so this was an open-ended cost and scraping vector.

Measured before the fix: same forged IP `29 → 28`, switch forged IP → back to
`29`. A fresh budget per header value.

**Fixed** — `trustProxy` is now a hop count from `TRUST_PROXY_HOPS` (default 1),
so only the hop *our own* infrastructure adds is believed.

Verified both modes:
- `TRUST_PROXY_HOPS=1` (behind nginx): three different forged entries with the
  same nginx-appended IP → `29 → 28 → 27`. Forged part correctly ignored.
- `TRUST_PROXY_HOPS=0` (exposed directly): header ignored entirely, all spoofed
  values share the socket-address bucket → `29 → 28 → 27`.

**This setting must match the real deployment.** Setting it higher than the
actual number of proxies silently re-opens the hole — each extra hop is one more
forgeable entry. One nginx on the DigitalOcean box = `1`. Cloudflare in front of
nginx = `2`. No proxy at all = `0`.

**Still worth doing (design, not a hole):** the client should not name its own
tier at all. Today `tier` is an assertion the server now charges for; it should
be derived server-side from the payment record. Related: `keepsake` and
`shortlist` are ₹29 and ₹99 products but currently consume one ₹50 credit,
because per-product billing does not exist until Razorpay is connected. Worth
settling before those two go on sale.

## ScrapingBee — what it actually costs us (measured, 3 Aug 2026)

The key is live. Measured properly rather than assumed: a clean 3-request test
moved the counter by exactly 3, so **one Amazon check = 1 credit**.

| | |
|---|---|
| Cost per paid Deep Search | **1 credit** (Amazon only; Flipkart makes no request) |
| Repeat search, same name | **0** — cached 24 hours |
| Free trial | 1,000 credits/month ≈ **1,000 paid searches** |
| Paid plan (~$49/mo) | 250,000 credits ≈ 250,000 paid searches |

At ₹50 a search, the trial alone covers ~₹50,000 of Deep Searches. The
marketplace check is a rounding error in unit economics.

**Do not switch on `premium_proxy` to "improve" this.** It costs 25× and was
tested — it did not unblock Flipkart. `render_js=true` costs 5× and is not
needed: Amazon returns full search HTML without it. The reasoning is written
into `src/lib/scrapingbee.ts` beside the code.

Instagram and Facebook were listed as possible ScrapingBee beneficiaries (row
14). Not attempted yet — Amazon was the paid-tier priority. Worth testing on
the same key, since it costs 1 credit to find out.

## Removed 4 Aug 2026 — founder's call, no longer part of the product

| Check | Why it went |
|---|---|
| **Copyright Office** | Copyright does not protect brand names in India (Supreme Court, *Krishika Lulla* 2016). A hit implied a block that does not legally exist; a miss implied clearance copyright never granted. Never built. |
| **GST trade-name** | Trade names are not exclusive under GST, so it could never be a blocker — it was context dressed up as a check. |
| **WhatsApp Business** | `wa.me` is a deeplink shortener for phone numbers. It returned the identical page for every input, so the tile was fabricating a verdict. No public WhatsApp directory exists to replace it, at any price. |
| **Flipkart brand** | Flipkart blocks proxied requests at every tier tested, including premium. Only a "popular products" widget came back, never the search results. |

Business checks: **26 → 23** (free 22 → 20, paid extras 6 → 5). Copy updated
across the hero, How-it-works and the catalogue comment.

## Sign-in moved to Google (4 Aug 2026)

Phone OTP is gone. `POST /v1/auth/google` takes the Google ID token and verifies
it **server-side against Google's public signing keys** before trusting a single
claim in it:

- RS256 only — `alg:none` and HMAC-confusion attacks refused outright
- `aud` must equal our own client id, so a token minted for another app cannot
  be replayed against us
- `iss` must be Google; `exp` enforced with zero clock tolerance
- `email_verified` required — an unverified address proves nothing

Signing keys are cached for an hour and re-fetched on an unknown key id, so
Google's key rotations cannot lock users out.

**Adversarially tested, all four rejected:** a token signed with an attacker's
own RSA key, `alg:none` with no signature, an HS256 token, and a malformed
string. Google's live key set was separately confirmed reachable and usable, so
the acceptance path is real too — not just the rejection path.

**Knock-on saving: MSG91 and the ~₹5,900 DLT registration are no longer needed.**

Still required from the founder: a Google OAuth **Client ID** (free, no billing
account). Until it is set, the sign-in page says so plainly instead of showing a
dead button, and the endpoint returns 503 rather than pretending.

## Also fixed this session (not stubs, for the record)
- Backend previously checked the OLD 62-source list (RBI, SEBI, FSSAI, DPIIT,
  Copyright, Threads, Telegram, Pinterest, Trends, Crunchbase, Reddit...).
  Trimmed to exactly the 26 checks in the PRD; removed sources are noted in
  code comments as Phase 2/3 per PRD §11.
- Free searches no longer run the paid checks at all (cost control per PRD §5.2).
- Result IDs now match the frontend tile IDs one-to-one (e.g. `soc-ig`,
  `leg-mca`), so frontend↔backend wiring in block 8 is a straight mapping.
- GST is now informational-only and can never show as a red conflict.
- A broken installer in one build tool was worked around (dependency override
  + scripts skipped at install; verified the tools run).
- ALL sample/demo data removed from the app (3 Aug 2026). The site now opens on
  a clean search page — no pre-filled "12/22 parameters" report. Results only
  ever come from a real scan; errors show an honest message instead of fake
  tiles. The practice answers for MCA21/Trademark (dev only) now say
  "(practice data, real registry check coming soon)" right in the tile. The
  baby-mode Gmail tile was removed — there is no honest way to check Gmail
  availability without trying to register.
- New features added with founder approval (3 Aug 2026), all zero-cost and
  fully live: domains now also probe .co, .dev and .xyz inside the existing
  grouped tiles (business stays "26 checks"); baby mode grew from 8 to 11
  checks — Rashi & Nakshatra by the traditional Avakahada chakra (honest
  "info" tile, clearly noting the birth chart is authoritative), nickname /
  short-form suggestions, and sibling name harmony (with an optional sibling
  input on the baby search page). None of these count toward clear/conflict.
- **Transliteration rewritten (3 Aug 2026).** The old engine emitted standalone
  vowel letters instead of vowel signs, so it produced unreadable output for
  every name: Priya → परइयअ, Rohit → रओहइत, Meridian → मएरइदइअन. This was live
  in the product. The new engine is syllable-based with conjuncts and anusvara
  and scores 18/20 exact against real Indian names (the 2 misses are vowel-length
  variants that are genuinely ambiguous from Roman spelling, e.g. अंजलि vs अंजली —
  both readable, neither wrong). It then renders 9 further scripts via sanscript.
  Where a script cannot express a sound (Tamil and Gurmukhi lack ऋ and ष), the
  output is repaired if possible and the script is DROPPED if not — never shown
  broken. Verified: 180/180 renderings clean, zero character leaks.
- **Removed a fake "IPA" field** from the pronunciation tile. It was inserting
  dots into the spelling and labelling the result IPA. It was never displayed on
  screen, but it should not have existed. We have no pronunciation dictionary,
  so we now say nothing rather than imply one.
- **Tile `source` and `action_url` are now persisted and returned** by the scan
  API (migration `0001_tile_source_columns`), so the evidence report can credit
  every check by name and link to where the user can verify it.
- Bhashini client built (3 Aug 2026) at `src/lib/bhashini.ts`, wired into the
  `lin-mean` tile. Service discovery against the real Government endpoint is
  verified live and needs no credentials — all 10 languages we promise are
  confirmed available via `ai4bharat/indicxlit--cpu-fsv2`. The compute call is
  authenticated-only, so the founder must register (see row 7). Run
  `npm run check:bhashini` to confirm once the keys are in. If Bhashini is
  absent or fails, the tile silently falls back to the in-house engine and is
  credited honestly — it never fabricates a script or claims a source it did
  not use.
