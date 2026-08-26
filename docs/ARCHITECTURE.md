# Naam Dekho architecture

This document explains how the pieces fit together, and, more usefully, where
the seams are: the places where a change in one file shows up somewhere you
were not looking. Read it before you change anything that crosses a boundary.

Everything here was checked against the code in this repository. Where a thing
is uncertain it says so.

## 1. The shape of the system

Two deployable things and one offline build.

| Piece | What it is | Entry point |
|---|---|---|
| API server | Fastify 4 + Socket.IO on one HTTP port | `backend/src/server.ts` |
| Scan worker | BullMQ consumer, separate process | `backend/src/queue/worker.ts` |
| Frontend | React 18 + Vite 5 SPA, plus the founder console at `/admin` | `frontend-jsx/src/main.jsx` |
| Static SEO build | Offline script that writes HTML files into the frontend's `public/` | `backend/src/scripts/build-name-pages.ts` |

Stores: PostgreSQL 16.6 (required in production), Redis (queue, cache,
rate limits, Socket.IO adapter). Redis is optional in development, and the
system degrades rather than failing. See section 10.

```
 browser                     API process                    worker process
 ───────                     ───────────                    ──────────────
 Home.jsx
  search box
    │  POST /v1/scan  (Bearer JWT)
    ├──────────────────────► api/scan.ts
    │                          normaliseName()
    │                          planScan()  -> total_tiles
    │                          spendTokens()   (atomic UPDATE)
    │                          INSERT scans
    │                          enqueueScan() ──────────────► BullMQ "scan"
    │  ◄── { scan_id, ... }                                    │
    │                                                          ▼
    │  io(API_ORIGIN, path /v1/stream, query scanId)        runScan()
    ├──────────────────────► ws/server.ts                    │ 7-8 scanner
    │                          socket.join(scan:<id>)        │ families in
    │                          replay ws:scan:<id>           │ parallel
    │                                                        │
    │                        subClient "scan-events" ◄───────┤ publishEvent()
    │  ◄── result_event  (one per tile, as it lands)         │ per tile
    │  ◄── verdict_complete                                  ▼
    │                                                     scoreScan()
    │                                                     UPDATE scans
    │                                                     INSERT scan_results
```

When Redis is unavailable in development the queue hop is skipped entirely and
`devRunScanInline()` in `backend/src/lib/devstack.ts` runs the same `runScan()`
inside the API process, emitting to the same Socket.IO room. The event contract
is identical, which is the point: the frontend cannot tell which path ran.

## 2. Repository layout

| Path | Contains |
|---|---|
| `backend/src/api/` | Fastify route modules, registered under `/v1` by `api/index.ts` |
| `backend/src/scanners/` | The checks. One file per family, all returning `TileResult[]` |
| `backend/src/lib/` | Domain logic with no HTTP in it: tokens, settings, transliteration, meanings, sandhi, numerology, Gemini client |
| `backend/src/cache/redis.ts` | The three Redis connections, `withCache`, the token bucket, and the in-memory dev fallback |
| `backend/src/queue/` | BullMQ queue definition and the standalone worker |
| `backend/src/ws/server.ts` | Socket.IO setup, room joining, reconnect replay |
| `backend/src/db/` | Drizzle schema, migration runner |
| `backend/src/pdf/` | Certificate data builders and HTML renderers, plus the name-page renderer |
| `backend/src/seo/` | One file per SEO cluster, all implementing the `shell.ts` contract |
| `backend/src/scripts/` | Offline builds: name pages, logo, Bhashini probe |
| `frontend-jsx/src/pages/Home.jsx` | The whole customer product: search, tiles, certificates. 2,297 lines |
| `frontend-jsx/src/admin/` | The founder console, its own shell and its own CSS |
| `frontend-jsx/public/` | 697 generated static HTML files plus `sitemap.xml` and `robots.txt`. Generated, not hand written |

## 3. A scan, end to end

### 3.1 The request

`handleSearch()` in `frontend-jsx/src/pages/Home.jsx` posts to `POST /v1/scan`
with `{ name, mode, tier }` and, in baby mode, optional `siblingName`,
`birthDate`, `birthTime`. The bearer token is read from
`localStorage.nd_token`.

`api/scan.ts` then, in order:

1. Validates the body with zod. Anything unrecognised is stripped, not
   rejected.
2. Normalises the name through `normaliseName()`
   (`backend/src/lib/normalise.ts`). This does NFC normalisation and strips
   invisible characters before anything compares or caches on the string. Two
   users typing the same name must produce the same cache key.
3. Calls `planScan(mode, tier)` for `total_tiles` and an ETA.
4. Requires a signed-in user. There is no anonymous path any more:
   no `userId` gives 401.
5. Calls `refreshPricing()` then `spendTokens()`. Tokens are debited BEFORE
   any work starts. Insufficient balance gives 402 with the shortfall.
6. Inserts the `scans` row, enqueues the job, and returns `scan_id`.

The response also carries a `websocket_url`, which the frontend ignores. It
builds its own connection from `API_ORIGIN` instead. If you ever change the
stream path, change it in `backend/src/ws/server.ts` and in `Home.jsx`, because
that field is decoration today.

### 3.2 The scanners running in parallel

`runScan()` in `backend/src/scanners/index.ts` is the orchestrator. It builds an
array of promises, one per scanner FAMILY (not per tile), and awaits them all.
Each family resolves to an array of tiles, and each tile is emitted through the
`emit` callback the caller supplied as soon as its family resolves.

Two consequences worth knowing:

* Tiles arrive in family-sized bursts, not one at a time. All fourteen domain
  tiles land together, because `scanDomains()` does its own `Promise.all`
  internally and resolves once.
* A family that throws is logged and dropped. The other families still finish
  and the verdict is still produced. There is no partial-failure event.

Checks the founder has switched off in the console are filtered here, by tile
id, and are omitted entirely: never emitted, never added to the tile list, and
therefore never scored. That is deliberate. A switched-off registry check must
not appear as a row about our plumbing in the middle of a paid answer.

### 3.3 Results streaming over Socket.IO

The worker publishes each tile twice: once onto a Redis list
`ws:scan:<scanId>` (a 300-entry ring buffer, 600 second expiry) and once onto
the `scan-events` pub/sub channel. The API process subscribes to that channel
and re-emits into the `scan:<scanId>` room.

That indirection exists so the worker does not need to know which API instance
holds the customer's socket. The ring buffer exists so a client that connects
after the scan started, or reconnects mid-scan, gets everything it missed:
`io.on("connection")` replays the whole list before returning.

Events on the wire (`WSServerEvent` in `backend/src/lib/types.ts`):

| Event | Emitted by | Consumed by the customer page |
|---|---|---|
| `result_event` | worker and inline runner, per tile | Yes |
| `verdict_complete` | worker and inline runner, once | Yes |
| `progress` | worker and inline runner, per tile | No |
| `scan_failed` | worker and inline runner, on throw | Yes |
| `scan_started`, `hud_update`, `tile_error` | Nothing emits these today | No |

`Home.jsx` listens for exactly three of them. Progress is derived from the
tiles it has actually received, not from the `progress` event, which is just as
well: the worker sends `{ completed, total: 0 }`, with the total hardcoded to
zero. The inline runner sends the real total. If you decide to use `progress`,
fix the worker first.

### 3.4 Tiles filling in

Every arriving tile is stored in a `results` map keyed by tile id, and each
catalogue entry renders from `tileState(check)`:

* a result exists for this key, render it
* no scan has run, render the check's own description (`check.what`)
* a scan is running, render "Checking…"
* the scan finished and no result arrived, render "Source not yet connected"

That last line is the one you will see when the id agreement in section 4
breaks. It does not mean the backend failed. It usually means nothing ever
mapped to that key.

Unlocking a Deep Search or a Shortlist does not enrich the scan you already
have. `handleUnlock()` and `handleShortlist()` call `startScan()` again with a
new tier, which is a new scan id, a new token debit and a fresh set of tiles.
The previous results are discarded.

## 4. The scanner layer

All scanners live in `backend/src/scanners/` and share one shape:

```ts
(args) => Promise<TileResult[]>          // or a synchronous TileResult
```

`TileResult` is `{ tileId, category, status, summary, detail?, latencyMs?,
source?, actionUrl? }`. `status` is one of `ok`, `no`, `warn`, `info`,
`pending`, `error`.

| File | Tiles | Source | Notes |
|---|---|---|---|
| `domain.ts` | 14, one per ending, `dom-com` through `dom-xyz` | rdap.org | RDAP, no key needed. A failed lookup returns `pending`, never "available". Prices in the `TLDS` table are indicative INR, not live registrar quotes |
| `social.ts` | 5: `soc-ig`, `soc-x`, `soc-yt`, `soc-li`, `soc-fb` | direct URL probes | Instagram and Facebook serve a login wall to bots, so those two inspect the page body and can honestly return "cannot tell". YouTube uses the Data API when `YOUTUBE_API_KEY` is set, else a URL probe |
| `marketplace.ts` | 5 free (`mp-apple`, `mp-play`, `mp-ph`, `mp-shop`, `mp-gh`) plus `mp-amzn` on paid | iTunes Search API, google-play-scraper, HTTP probes, GitHub REST, ScrapingBee | Amazon runs through ScrapingBee at the 1-credit setting |
| `brand.ts` | 2: `br-wiki`, `br-cse` | MediaWiki API, Brave Search | Brave is primary; Google CSE is a fallback for grandfathered accounts. With neither key, `br-cse` is a `pending` tile |
| `legal.ts` | 2 paid: `leg-mca`, `leg-tm` | mca.gov.in, ipindia.gov.in | STUBBED. See the warning below |
| `linguistic.ts` | `lin-mean`, `lin-land`, plus exported `scanPronunciation` (`lin-pron`) and `scanNumerology` (`lin-num`) | in-house engines, Bhashini, Wiktionary, Gemini | The heaviest file. See sections 5 and 6 |
| `astro.ts` | 3 baby-only: `b-rashi`, `b-nick`, `b-sib` | in-house, Avakahada chakra table | All three are status `info`, so they never count for or against the verdict |

### The legal scanners are practice data outside production

`backend/src/scanners/legal.ts` sets `DEV_MOCK = process.env.NODE_ENV !==
"production"`. When that is true, `leg-mca` and `leg-tm` return a
deterministic pseudo-random verdict derived from a hash of the name. The tile
text says "practice data, real registry check coming soon", but the status pill
is a real `ok` or `no`, and `scoring.ts` treats those two ids as CRITICAL,
scoring a conflict at -1.5 instead of -0.5.

`NODE_ENV` is currently `development`. So on the founder's machine a Deep
Search verdict is partly driven by a hash. In production with no scraper keys
both tiles are `pending`, which is honest but means the paid tier's headline
checks do not yet run at all. Neither MCA21 nor IP India has a public API;
`backend/STUBBED.md` records what a real implementation needs.

### Adding a scanner

1. Write the function in `backend/src/scanners/`, returning `TileResult[]`.
2. Push it into the right `tasks` array in `scanners/index.ts`.
3. Update the tile count in `planScan()` in the same file. It is hand
   maintained and does drift: the comment beside `scanSocial` in the business
   branch still says "6 tiles" although the scanner returns 5. The totals
   themselves (30, 33, 12) are correct today.
4. Add the id to `CATALOGUE` in `Home.jsx`, and to `CHECKS` in
   `frontend-jsx/src/admin/ChecksPage.jsx`. Section 5 explains why all three.

## 5. The tile contract, and where it leaks

This is the seam that breaks most quietly, because nothing fails loudly. A tile
id must agree in **three** places:

| Place | What it is | File |
|---|---|---|
| Emitter | `tileId` on the `TileResult` | `backend/src/scanners/*.ts` |
| Renderer | the `key` on a `CATALOGUE` entry | `frontend-jsx/src/pages/Home.jsx` |
| Kill switch | the id in the `CHECKS` list | `frontend-jsx/src/admin/ChecksPage.jsx` |

A mismatch does not throw. The tile simply never fills in, and after the scan
completes it reads "Source not yet connected".

### Baby mode remaps through BABY_ID_MAP

Baby mode reuses backend checks under different catalogue keys, because a
parent should not be reading a row labelled "Landmine dictionary" the way a
founder does. The map lives at the top of `Home.jsx`:

```js
const BABY_ID_MAP = {
  'lin-mean': 'b-mean', 'lin-land': 'b-land', 'lin-pron': 'b-pron',
  'lin-num': 'b-num', 'soc-ig': 'b-ig', 'soc-yt': 'b-yt', 'soc-fb': 'b-fb',
}
```

and is applied on arrival:

```js
const key = mode === 'baby' ? (BABY_ID_MAP[tile.tileId] ?? tile.tileId) : tile.tileId
```

Anything not in the map keeps its backend id, and if no catalogue entry has
that key the tile is stored and never rendered. Two things follow that you
should know before you touch this.

**`soc-x` and `soc-li` are computed and thrown away in baby mode.** The baby
branch of `runScan()` calls `scanSocial()`, which always returns all five
handles. `BABY_ID_MAP` covers Instagram, YouTube and Facebook only, and
`CATALOGUE.baby` has no `soc-x` or `soc-li` entry, so the X and LinkedIn
results land in the results map under keys nothing renders. That is the same
bug the `b-fb` catalogue comment describes having fixed for Facebook. Adding
the two map entries and two catalogue entries costs no new scan work.
`planScan()` already counts them: baby mode reports 12 tiles and can display
10.

**The disabled-checks fetch applies the map in both modes.** In `Home.jsx`:

```js
const keys = (d.disabled ?? []).map(id => BABY_ID_MAP[id] ?? id)
setDisabledChecks(new Set(keys))
```

This effect runs once on mount, with no dependency on `mode`. So if the founder
switches off `soc-ig`, the frontend records `b-ig` as disabled. In baby mode
that is right. In business mode the catalogue key is `soc-ig`, which is not in
the set, so the Instagram tile is still laid out, the backend correctly omits
the result, and the customer is left with a tile that never fills in. The map
should be applied only when `mode === 'baby'`.

### The admin check list has drifted

`ChecksPage.jsx` predates the one-tile-per-ending change of 4 August 2026. It
still lists bundled domain rows (`dom-org` labelled ".org/.net/.io/.ai/.co/.dev",
`dom-app` labelled ".app/.store/.shop/.tech/.xyz") and two ids no scanner has
ever emitted, `soc-wa` and `mp-flip`. Toggling `dom-org` today switches off the
.org tile and nothing else. The baby-only checks `b-rashi`, `b-nick` and `b-sib`
are not listed at all, so they cannot be switched off.

The file's header comment also says a disabled check still shows a tile marked
"temporarily switched off". That stopped being true on 6 August 2026; the tile
is now omitted entirely, in both the orchestrator and the layout.

### Verdict scoring reads tiles, not the catalogue

`scoreScan()` in `backend/src/lib/scoring.ts` scores whatever tiles the engine
produced: `ok` +1.0, `warn` +0.3, `no` -0.5 (or -1.5 for `leg-mca` and
`leg-tm`), `info` and `pending` and `error` excluded from the denominator. The
result is damped by the share of tiles that answered at all.

The customer page does NOT display that verdict's counts. It recomputes clear,
conflict, warn and unknown from the tiles it is actually rendering, because the
engine counts checks the current mode never shows. Only `verdict.score` is taken
from the engine, and it is shown as an approximate percentage. If you change the
rubric, both surfaces move, and the SEO pages do not (they never see a verdict).

## 6. The transliteration seam

**Read this before touching anything under `backend/src/lib/transliterate.ts`.**

Every Devanagari character anywhere in this product comes out of one function,
`romanToDevanagari()`. Every other Indian script is then derived from that
Devanagari output by `devanagariToScripts()`, which drives
`@indic-transliteration/sanscript`. There is no independent path to Tamil or
Bengali or Gujarati. One wrong vowel in the Devanagari is wrong in all ten
scripts, on every surface, at once.

The surfaces, all of them:

| Caller | File | What it produces |
|---|---|---|
| `normaliseName()` | `lib/normalise.ts` | the `devanagari` field on every normalised name |
| `scanLinguistic()` | `scanners/linguistic.ts` | the `lin-mean` / `b-mean` script grid |
| `sandhiVichched()` | `lib/sandhi.ts` | the Devanagari the sandhi prompt asks about |
| `buildCertificateData()` | `pdf/certificate-data.ts` | the keepsake certificate |
| `buildFiveCertificateData()` | `pdf/certificate-five-data.ts` | the Shortlist of Five, chosen name and all five considered names |
| `renderNamePage()` | `pdf/name-page.ts` | all 537 static `/n/` pages |
| six cluster builders | `seo/hub.ts`, `letters.ts`, `meanings.ts`, `nakshatra.ts`, `numerology.ts`, `rashi.ts`, `scripts.ts` | the Devanagari column on every cluster page |

### Why the engine alone is not enough

Roman spelling does not record vowel length. "Ram" carries no mark saying which
vowel is long, so the rule engine writes रम where a Hindi reader writes राम,
and रितु where they write ऋतु. Measured against spellings corroborated by a
Wiktionary entry at that exact form, 108 of 210 corpus names came out wrong.
No amount of rule tuning fixes this; the information is not in the input.

So there is a lexicon. `registerNameSpellings()` loads verified pairs into a
module-level map, and `romanToDevanagari()` consults it before doing any work:

```ts
export function romanToDevanagari(name: string): string {
  const known = KNOWN_SPELLINGS.get(name.trim().toLowerCase());
  if (known) return known;
  return name.trim().split(/\s+/).map(transliterateWord).filter(Boolean).join(" ");
}
```

The map starts empty, which keeps the module free of any database dependency.
It is filled in exactly two places:

* `backend/src/server.ts`, at boot, from `corpus_names.native_spelling`.
* `backend/src/scripts/build-name-pages.ts`, before any page renders, from the
  same column.

210 corpus rows carry a verified `native_spelling`. 326 do not and fall back to
the engine, which is wrong for roughly 63% of names. That is the honest state:
the lexicon is the fix, and it is 210 names deep.

### What this means in practice

* **The lexicon is loaded once, at boot.** Editing `native_spelling` in the
  console at `/admin/corpus` does not change a running server. Restart it. This
  is unlike the pricing and check-toggle settings, which have a 30 second
  cache.
* **If the database is unreachable at boot, the load is skipped** with a
  warning, and the whole site silently drops to engine-only transliteration.
  The scan still runs. Nothing on the page says the spellings are missing.
* **The offline page build teaches the same lexicon separately.** If you run
  `npm run build:names` without the database, it also loses the lexicon, on top
  of losing the corpus. See section 9.
* **The certificate is the highest-stakes consumer.** It is a document a family
  prints and frames. A wrong vowel there is not a cosmetic bug.

### Scripts are dropped, never faked

Tamil and Gurmukhi lack sounds Devanagari has, notably ऋ and ष. Where sanscript
cannot represent them it leaks raw Devanagari characters into its output.
`devanagariToScripts()` repairs the known cases (a small table per script) and
then, if any Devanagari character still survives in the output, **omits that
script entirely** rather than display broken text. So the number of scripts on a
tile varies by name, and a missing script is a deliberate answer, not a
rendering failure. `seo/scripts.ts` counts these drops at build time and
publishes a script's page only once at least 25 corpus names render in it.

## 7. The caching layer

`backend/src/cache/redis.ts` holds three ioredis connections by convention:
`redis` for general cache and rate limits, `pubClient` for Socket.IO publishing
and BullMQ, and `subClient` (a duplicate) for subscribing. Pub/sub needs its own
connection; do not collapse them.

`withCache(key, ttlSeconds, loader)` is the only cache helper anything should
use:

```ts
export async function withCache<T>(key, ttlSeconds, loader): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;
  const value = await loader();
  await cacheSet(key, value, ttlSeconds);
  return value;
}
```

### The rule: a failed lookup must THROW, not return

This has bitten the codebase more than once, and the comments saying so are
still in place. Read them before you "simplify" any of these.

`withCache` caches whatever the loader RETURNS. If your loader catches an error
and returns a fallback, that fallback is now the answer for the whole TTL. With
TTLs of 30 to 180 days on the meaning lookups, one rate-limited minute becomes
six months of a name having no meaning.

The three places that got this right, and why:

**`lib/sandhi.ts`**, cache key `cache:sandhi:<name>`, TTL 180 days:

```ts
// Thrown, not returned. Returning a miss here would cache a rate limit
// as the permanent answer "this name does not split" for 180 days.
if (!res.ok) throw new Error(`gemini_${res.status}`);
```

**`lib/meanings.ts`**, cache key `cache:meaning:<name>`, TTL 30 days. A 404 from
Wiktionary is a definitive miss and is cached as the sentinel `{ none: true }`,
because `withCache` treats `null` as a cache miss and would refetch forever.
Any other non-OK status throws:

```ts
if (res.status === 404) continue;              // definitive, try the other casing
if (!res.ok) throw new Error(`wiktionary_${res.status}`);  // transient, do not cache
```

**`lib/certificate-essay.ts`**, cache key
`cache:cert-essay:v2:<name>:<gender>`, TTL 180 days:

```ts
if (!res.ok) throw new Error(`gemini_${res.status}`); // thrown, so a bad minute is not cached
```

The outer `try/catch` around each of these turns the throw into a graceful "we
do not know" for this one request. The next request retries. That is the whole
pattern: **throw inside the loader, catch outside `withCache`.**

Note the `:v2:` in the essay key. Changing a prompt or an output shape without
bumping a key version leaves months of stale answers in place.

### The in-memory development fallback

`redisAvailable()` pings Redis once, memoised for the process lifetime. In
production it short-circuits to `true` and a Redis outage fails loudly, which
is correct. In development, a failed ping switches `cacheGet`, `cacheSet` and
`tryTake` to per-process `Map`s.

Consequences of the fallback, all of them acceptable in development and none of
them in production:

* Rate limits are per process, so they are not really rate limits.
* Nothing is shared between the API and worker processes.
* The cache is lost on restart, so the first scan after a restart pays full
  price at every provider.

### Cache keys and TTLs in use

| Key prefix | TTL | Set by |
|---|---|---|
| `cache:rdap:<domain>` | 5 min | `scanners/domain.ts` |
| `cache:url-probe:<url>`, `cache:meta-probe:[px:]<url>` | 30 min | `scanners/social.ts` |
| `cache:youtube:<handle>` | 30 min | `scanners/social.ts` |
| `cache:github:<handle>` | 30 min | `scanners/marketplace.ts` |
| `cache:itunes:<name>`, `cache:gplay:<name>`, `cache:ph:<slug>` | 12 h | `scanners/marketplace.ts` |
| `cache:amzn:<name>`, `cache:wikipedia:<name>` | 24 h | `scanners/marketplace.ts`, `scanners/brand.ts` |
| `cache:meaning:<name>` | 30 days | `lib/meanings.ts` |
| `cache:gemini-meaning:<name>`, `cache:compound:<word>`, `cache:cert-prose:<name>`, `cache:sandhi:<name>`, `cache:cert-essay:v2:<name>:<gender>`, `cache:baby-shortlist:<key>` | 180 days | `lib/gemini.ts`, `lib/sandhi.ts`, `lib/certificate-essay.ts`, `lib/baby-alternatives.ts` |

The meta-probe key deliberately varies on whether the proxy was allowed, so a
"could not tell" learnt without ScrapingBee does not shadow the real answer we
can get with it.

### The other rate limiter

`tryTake(bucket, capacity, refillPerSec)` is a Lua token bucket in Redis,
separate from the Fastify per-IP rate limit. It throttles US outbound, per
provider, so a burst of scans does not get the product banned from rdap.org or
GitHub. Every scanner takes from a bucket before its network call.

## 8. Tokens and pricing

One currency, one balance per user, no expiry. `users.tokens`, integer.

| Purchase | Tokens | Where the default lives |
|---|---|---|
| Signup gift | 500, once | `DEFAULT_PRICING.signupBonus` |
| Business Standard search | 50 | `costs.business.standard` |
| Business Deep Search | 350 | `costs.business.deep` |
| Baby name search | 25 | `costs.baby.standard` |
| Baby full naming report | 300 | `costs.baby.deep` |
| Keepsake add-on | 300 | `addons.keepsake` |
| Shortlist of Five add-on | 1,000 | `addons.shortlist` |
| Packs | ₹50 buys 500 tokens, ₹500 buys 5,000 | `packs` |

One token is ₹0.10. The defaults are compiled into
`backend/src/lib/settings.ts` as `DEFAULT_PRICING` and are the permanent
fallback: a missing or malformed `settings` row falls back to them rather than
taking pricing to zero.

Live pricing is a draft/publish flow in the `settings` table, key `pricing`,
edited at `/admin/pricing`. The site reads only `published`, through
`getPricing()`, cached 30 seconds. `spendTokens()` calls `refreshPricing()`
before every charge, so a publish takes effect within that window.

### Three things about this that are load bearing

**The spend is one atomic statement.** `spendTokens()` and `spendAddon()` both
do a single `UPDATE ... SET tokens = tokens - cost WHERE id = ? AND tokens >=
cost` and check `returning()`. Two requests racing for the last 350 tokens
cannot both succeed. Splitting this into a read and a write would double-spend.

**Unknown tiers fail closed, upward.** `tokenCost()` looks in
`costs[mode][tier]`, then in `addons[tier]`, and if neither knows, returns
`maxCost()`, the most expensive SEARCH on the site. `isPaidTier()` in
`lib/types.ts` returns `true` for anything that is not `"standard"`. Both
default a new tier to premium and to the maximum price. That is on purpose: a
gate keyed on one tier name while everything downstream keyed on another gave
the whole paid product away for ₹0 on 3 August 2026.

**Add-ons must not go through `spendTokens()`.** There is no `shortlist` under
`costs`, so the lookup would miss, fall to `maxCost()`, and bill a 1,000-token
document at 350. Use `spendAddon()`.

The Shortlist certificate is the only route that refunds: it debits before
rendering, because the render is where the money goes (a Gemini passage and a
full check of the chosen name), and calls `refundAddon()` if the render throws.
A scan bought at the `shortlist` tier is not charged again, because that tier
already includes the sheet.

Payments are not integrated. `backend/src/payments/` and `api/billing.ts` exist,
all fifteen Razorpay variables in `.env` are blank or placeholders, and the
admin dashboard prints "No payments taken yet." That is the last planned piece
of work.

## 9. The static SEO build

This is a separate, offline pipeline. It shares the backend's libraries but
runs nothing at request time and produces plain HTML files.

```
npm run build:names            # from backend/
```

It reads published rows from `corpus_names`, teaches the transliterator their
verified spellings, renders 537 name pages plus an index into
`frontend-jsx/public/n/`, asks nine cluster builders for their documents, writes
those, then writes `sitemap.xml` and `robots.txt`.

| Directory | Files | Builder |
|---|---|---|
| `/n/` | 537 | `pdf/name-page.ts` |
| `/nakshatra/` | 26 | `seo/nakshatra.ts` |
| `/rashi/` | 13 | `seo/rashi.ts` |
| `/numerology/` | 10 | `seo/numerology.ts` |
| `/names/` | 39 | `seo/letters.ts` and `seo/meanings.ts` |
| `/domains/` | 15 | `seo/domains.ts` |
| `/trademark-class/` | 46 | `seo/trademark.ts` |
| `/script/` | 10 | `seo/scripts.ts` |
| `/explore/` | 1 | `seo/hub.ts` |

697 files in total. `sitemap.xml` lists 705 URLs: the 697 files plus the 8
React routes that should be indexed.

### Warning: never run this without the database

`loadCorpus()` falls back to the built-in 50-name list in
`backend/src/scripts/name-corpus.ts` when the database is unreachable OR when
`corpus_names` returns zero published rows. It prints a warning and carries on.
The build then overwrites all 697 files with about 50, rewrites `sitemap.xml`
to match, and the deleted pages are simply gone.

Get the database up, or a dump of it, before you run `build:names`. There is no
confirmation prompt.

### The cluster contract

Every builder in `backend/src/seo/` implements the same signature from
`seo/shell.ts`:

```ts
(ctx: SeoCtx) => SeoDoc[]
```

`SeoCtx` is `{ siteOrigin, corpus }`. `SeoDoc` is `{ path, html, priority,
changefreq }`. The build script only writes files and emits sitemap entries; it
knows nothing about what a cluster is. Adding one is a new file plus one import
and one array entry in `build-name-pages.ts`.

Page chrome comes from `renderSeoPage()` in `shell.ts`, which emits the
breadcrumb twice, once as clickable text and once as `BreadcrumbList` JSON-LD,
generated from the same array so they cannot disagree.

### Thresholds recompute every build

Each cluster applies a minimum-content threshold, so pages publish themselves as
the corpus grows and un-publish if it shrinks. The values are duplicated in
`seo/hub.ts` (which needs to know which links to draw) and in each builder:

| Cluster | Bar | Constant in hub.ts |
|---|---|---|
| Letters | 12 published names starting with it | `LETTER_MIN_NAMES` |
| Letters, by gender | 12 | `LETTER_MIN_GENDER_NAMES` |
| Meaning themes | 6 | `THEME_MIN_NAMES` |
| Nakshatra | 1 | `NAK_MIN_NAMES` |
| Rashi | 6 | `RASHI_MIN_NAMES` |
| Numerology | 5 | `NUMBER_MIN_NAMES` |
| Script | 25 names that render in it | `SCRIPT_MIN_NAMES` |

Because those numbers live in two files, the build has a guard: after all
clusters return, it scans every emitted document for `href="/....html"` links
and reports any that point at a page nobody emitted. An internal 404 coming out
of your own sitemap is worse than a missing link, and Search Console tells you
about it three weeks late.

### Why these are files and not React routes

They exist to be crawled. A file that already contains its content in the
markup is indexed reliably; a client-rendered route is not. They are unlinked
from the app's navigation, and they serve the same bytes to every visitor,
crawler or person. Do not add crawler detection: that is cloaking, and it is the
one technique that reliably removes a domain from the index.

They also do not use `frontend-jsx/src/index.css`. `PAGE_CSS` in `shell.ts` is
inline, self-contained, and light-only. That is deliberate, and it means the
palette exists in two places (section 12).

## 10. Degraded mode

`stackHealth()` in `backend/src/lib/devstack.ts` probes Postgres and Redis once
per process and memoises the answer. **Outside development it short-circuits to
"all healthy" and never probes**, so missing infrastructure fails loudly in
production, as it should.

In development:

| Missing | What happens |
|---|---|
| Redis only | `POST /v1/scan` runs the scan inline via `devRunScanInline()` and streams over the in-memory Socket.IO adapter. The scan row and the tiles are still written to Postgres, so history survives a restart. The response carries `inline: true` |
| Postgres only | Users, scans and tiles live in per-process `Map`s in `devstack.ts`, capped at 500 scans. `GET /v1/scans/:id` answers with `degraded: true` |
| Both | Both of the above. Nothing is persisted |
| Postgres at boot | The verified spelling lexicon is not loaded. See section 6 |

The probe is memoised for the process lifetime, so starting Docker after the
server is already up does not promote it out of degraded mode. Restart the
server.

## 11. The admin console and how it is gated

The console is a React route tree at `/admin` with its own shell
(`frontend-jsx/src/admin/AdminShell.jsx`), deliberately not the customer layout:
dark, mono, no marketing chrome, so the founder always knows which world they
are standing in.

### Layer one: who you are

Every `/v1/admin/*` route begins with `await requireAdmin(req)`. That helper:

1. requires a `userId`, decorated onto the request by the optional-auth
   `preHandler` in `api/index.ts` from a valid bearer JWT,
2. reads `ADMIN_EMAILS` (comma separated) and `ADMIN_PHONES` from the
   environment. An empty list gives 503 `admin_not_configured`, not open access,
3. loads that user's email and phone and checks membership,
4. on refusal returns 403 with `signed_in_as`, so a founder with two Google
   accounts can see which one the chooser silently picked.

There is no separate admin password for this layer. You sign in with Google as
normal. The frontend gate in `AdminShell.jsx` is only a convenience: it calls
`adminApi.stats()` on mount and shows "Not your console" on a 403. It is not
the security boundary. The server is.

### Layer two: the API keys screen

Being an admin is not enough to reach `/admin/api`. A stolen laptop or a
forgotten open tab already gets someone the console; it must not also get them
the key that moves money. So `backend/src/lib/api-keys.ts` adds:

* **A second password**, `ADMIN_API_PASSWORD`, held in `backend/.env` and
  compared with `timingSafeEqual`. Not set means the screen cannot be
  unlocked at all.
* **A 15 minute unlock token**, HMAC-signed with `JWT_SECRET`, returned by
  `POST /v1/admin/api-keys/unlock` and passed back in an `X-Api-Unlock` header.
  The frontend holds it in a module variable, never `localStorage`, and throws
  it away on entering and leaving the screen.
* **Write-only keys.** `maskKey()` shows `sk_live_...a7f9` and nothing more.
  You can replace a key; you can never read one back.
* **A managed allowlist.** `writeEnvKey()` refuses any name not in
  `MANAGED_KEYS` or `ALSO_WRITABLE`. It rewrites one line of `.env` in place so
  comments and ordering survive, sets `process.env` for anything read at call
  time, and the console says plainly that a restart is needed for the rest.

Changing the second password requires either the current password or a Google
credential issued in the last 300 seconds. A session alone is deliberately not
enough, since a session alone is what this password defends against. The new
value must be at least 12 characters, not all digits, at least five distinct
characters, and not on a short obvious-password list.

Note the shape of that rule: **it applies only when the password is changed
through the console.** A value already sitting in `.env` is never validated, at
boot or anywhere else. The security audit item recording a weak unlock password
is still open for that reason. Check the current `.env` value before you rely
on this layer.

### Audit

Every admin mutation writes an `audit_log` row through `audit()`, before the
change is reported as successful, so an edit that cannot be recorded does not
happen. Append-only: nothing in the code updates or deletes a row. Failed
unlock attempts are recorded too. Passwords and key values never are.

### What the console can change, and how fast

| Screen | Writes to | Reaches the site |
|---|---|---|
| Pricing | `settings` key `pricing`, draft then publish | within 30 s (`getPricing` cache) |
| Checks | `settings` key `scanners` | within 30 s (`disabledScanners` cache) |
| Features | `settings` key `features` | within 30 s (`disabledFeatures` cache) |
| Name pages | `corpus_names` | only after `npm run build:names`, and only after a server restart for `native_spelling` |
| API keys | `backend/.env` | immediately for `process.env` readers, otherwise after a restart |
| Tokens | `users.tokens` | immediately |

The check list is also public, at `GET /v1/checks/disabled`, deliberately: the
customer page needs it before a scan runs so a switched-off check is left out of
the layout rather than appearing as a tile that never fills in. It exposes only
internal check ids.

Features are a separate list from checks on purpose. A check is a question we
answer about a name; a feature is something we sell. Switching off
`certificate` or `complete-set` makes the certificate routes answer 503.
Sharing one list would mean a mis-click could stop a purchase while meaning to
hide a row.

## 12. Smaller seams worth knowing

**Certificates recompute, they do not read back.** Both
`pdf/certificate-data.ts` and `pdf/certificate-five-data.ts` recompute
everything from the name rather than reading the stored scan tiles, so a
certificate is complete even if a source was down on the day of the search. The
consequence: a change to `scanPronunciation`, `chaldean` or `scanRashi` changes
what a reissued certificate says, and it will not match the report the customer
already read.

**The Shortlist takes its name from the request body, the keepsake from the
scan.** `POST /v1/scans/:id/certificate-five` reads the chosen name from the
body, because the family may settle on a name they never searched.
`GET /v1/scans/:id/keepsake` reads it from the scan row. Only the first
verifies scan ownership.

**Certificate state must be cleared on a new scan, and the build enforces it.**
`frontend-jsx/scripts/check-scan-reset.cjs` reads `Home.jsx` and fails the build
if `startScan()` stops clearing any of seven certificate fields. It exists
because `finalName` once survived a new search and `generateFive()` reads it
first, so one name typed into that box was printed on every certificate for the
rest of the session. It is a source-text check rather than a rendering test, on
purpose, and it catches exactly that regression.

**`frontend-jsx` has no working `npm run build`.** `prebuild` runs
`scripts/check-legal.cjs`, which stops the build while `src/legal/privacy.js`
still holds three placeholders: the CIN, the registered office address with PIN,
and the named Grievance Officer required by IT Rules 2011 Rule 5(9). This is
intentional, not a bug. `npm run dev` is unaffected, and `npx vite build`
bypasses the gate if you genuinely need a bundle before the legal details land.

**Models and spend.** Gemini `gemini-flash-lite-latest` is the only model in the
live path. The certificate makes ONE call, for the roughly 150-word essay;
everything else on the sheet is deterministic TypeScript. `postGemini()` retries
only 429 and 503, with jitter, and never a timeout. Startup name alternatives
are generated in-house by `backend/src/lib/alternatives.ts`, which calls no
model at all and so cannot fail on a rate limit or a bill. With no
`GEMINI_API_KEY` everything degrades rather than failing: the essay falls
back to plain prose and sandhi returns `null`.

**ScrapingBee cost discipline.** `render_js=false` is 1 credit,
`premium_proxy=true` is 25. Amazon India returns unblocked HTML at 1 credit, so
we pay 1. `SCRAPINGBEE_SOCIAL` gates the Meta probes: `off`, `paid` (Deep
Searches only, the default) or `all`. Switching it to `all` spends a credit on
every free search.

**`gender` is silently dropped by `POST /v1/scan`.** The frontend sends it in
baby mode, `submitSchema` does not declare it, and zod strips unknown keys. That
is why `POST /v1/scans/:id/alternatives` reads gender from its own request body
and notes that the scan does not persist it.

**Three modules in `backend/src/pdf/` are not imported by anything.**
`generate.ts` (a PDF stub that returns a fake object key and a fake pre-signed
URL), `report.ts`, and `keepsake.ts` (an older standalone renderer superseded by
`certificate.ts` plus `certificate-data.ts`). Do not wire `generate.ts` up
expecting it to work; there is no PDF generation in this product. Certificates
are HTML that the browser prints.

**Certificate typography loads from `fonts.googleapis.com` at render time.**
With no outbound internet the sheet still renders, in Georgia or a generic
serif. The logo does not have this problem: it is a base64 data URI in
`backend/src/brand/logo-data.ts`, generated by `npm run build:logo`, with a
SHA-256 that a test checks against the source file.

**Design tokens exist in two places.** The app's palette lives in
`frontend-jsx/src/index.css` with three theme states that must be kept in step:
bare `:root` for light, a `prefers-color-scheme: dark` block guarded with
`:not([data-theme="light"])`, and an explicit `:root[data-theme="dark"]` block.
The static SEO pages use `PAGE_CSS` in `backend/src/seo/shell.ts`, which
hardcodes `--accent:#B8501C` and is light-only by design. The palette is locked:
`--accent` `#B8501C`, `--accent-2` `#7A2E0E`, `--gold` `#E8C76A`, and the baby
softs `--blush` `#E7B4C2`, `--lilac` `#C3B6DE`, `--powder` `#A5C4DD`. No new
hues. `--accent` measures 3.98:1 on the cream page, below the 4.5 AA floor; the
founder has decided it stays. That is an accepted exception, recorded here so it
is not re-raised.

## 13. Commands

Checked against `backend/package.json` and `frontend-jsx/package.json`.

**backend/**

| Command | State |
|---|---|
| `npm run dev` | API server, tsx watch |
| `npm run dev:worker` | Scan worker, tsx watch |
| `npm run build` / `npm run typecheck` | Works. `npx tsc -p tsconfig.json` compiles clean |
| `npm start` / `npm run start:worker` | Runs the compiled `dist/` output |
| `npm test` | Works. 60 tests in 3 files under `backend/__tests__/` (vitest) |
| `npm run db:migrate` | Works. On an empty database it produces 9 tables: `agency_leads`, `api_calls`, `audit_log`, `billing_events`, `corpus_names`, `scan_results`, `scans`, `settings`, `users` |
| `npm run build:names` | Works. Read the warning in section 9 first |
| `npm run build:logo` | Regenerates `brand/logo-data.ts` from `assets/brand/` |
| `npm run check:bhashini` | Probes the Bhashini credentials |
| `npm run db:studio` | Drizzle Studio. Unverified, confirm before relying on this |
| `npm run db:generate` | **Broken on the founder's machine.** drizzle-kit fails with an esbuild spawn error. The esbuild binary is present, so this looks like a local install artefact rather than a repo problem; a fresh `npm install` may fix it. Migration `0005_native_spelling.sql` was hand written in the project's existing SQL format because of this. `db:migrate` itself works |
| `npm run lint` | **Broken.** The script exists but eslint is not installed in `backend/`. It fails with "'eslint' is not recognized" |

**frontend-jsx/**

| Command | State |
|---|---|
| `npm run dev` | Vite dev server on 5173, proxying `/v1` to `localhost:3000`. Note that Socket.IO does not use the proxy: `Home.jsx` talks to `http://localhost:3000` directly in dev |
| `npm run lint` | Clean |
| `npm run build` | **Fails by design** while the legal placeholders are unfilled. See section 12 |
| `npx vite build` | Succeeds, bypassing `prebuild` |
| `npm run check:legal`, `npm run check:scan-reset` | The two prebuild gates, runnable on their own |

## 14. Two things about the repository itself

**It is not under version control.** There is no git repository, no `.gitignore`
at the root and none in `frontend-jsx/` (`backend/` has one). Initialising git
should be the first thing an engineering team does, and the `.gitignore` files
need writing before the first commit, because `backend/.env` currently holds 28
real values including `JWT_SECRET`, `DATABASE_URL`, `GEMINI_API_KEY`,
`ADMIN_API_PASSWORD`, `GITHUB_TOKEN` and R2 storage credentials.

**Environment files.** `backend/.env.example` exists and is the reference.
`frontend-jsx` has NO `.env.example`, although it needs `VITE_GOOGLE_CLIENT_ID`
for Google sign-in (`src/pages/SignIn.jsx` and `src/admin/ApiPage.jsx`). Fifteen
backend variables are blank or placeholders, including all the Razorpay ones.
`NODE_ENV` is currently `development`, which matters more than it sounds: see
section 4 on the legal scanners, and section 10 on degraded mode.

## 15. Known security work, all still outstanding

From an earlier audit. Listed here because each one crosses an architectural
boundary described above, not to duplicate the security document.

| Item | Where |
|---|---|
| Four routes accept a scan id and never check the scan belongs to the caller: `GET /scans/:id`, the keepsake route, and `POST /alternatives`. Only `certificate-five` verifies ownership | `backend/src/api/scan.ts` |
| The admin unlock password is a 4 digit literal | `backend/src/api/admin.ts` and the current `.env` value. See section 11 |
| A placeholder `JWT_SECRET` is not rejected at boot. `config.ts` enforces a 16 character minimum and nothing more | `backend/src/config.ts` |
| The Socket.IO handshake is not authenticated. Any client that knows a scan id can join its room and read its tiles | `backend/src/ws/server.ts` |
| No session revocation. `users.jwtVersion` exists in the schema, defaults to 1, and `verifyJwt()` never reads it | `backend/src/db/schema.ts`, `backend/src/auth/otp.ts` |
| Fastify 4 is end of life, and no dependency auditing is configured | `backend/package.json` |
