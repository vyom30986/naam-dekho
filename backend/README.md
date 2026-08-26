# Naam Dekho — Backend

Production Node.js backend for the Naam Dekho platform. Powers the existing HTML front-end (`index.html`, `pricing.html`, `sign-in.html`, etc.) end-to-end: search submission, live result streaming, OTP auth, payments via Razorpay + Paytm, agency leads.

## Stack

- **Node.js 20** + **TypeScript 5**
- **Fastify 4** — HTTP server (REST API)
- **Socket.IO 4** + Redis adapter — WebSocket result streaming
- **BullMQ 5** + Redis — task queue for scans
- **PostgreSQL 16** + Drizzle ORM
- **Razorpay** (primary) + **Paytm** (fallback) — payments with automatic switcher
- **MSG91** — phone OTP via SMS

## Quick start (local development)

```bash
# 1. Boot Postgres and Redis
docker compose up -d

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env — minimum required: DATABASE_URL, REDIS_URL, JWT_SECRET

# 4. Generate and apply Drizzle migrations
npm run db:generate
npm run db:migrate

# 5. Start the API server (terminal 1)
npm run dev

# 6. Start the queue worker (terminal 2)
npm run dev:worker
```

The server listens on `http://localhost:3000`. Point your `index.html` `fetch` calls at `http://localhost:3000/v1/scan` and the WebSocket at `ws://localhost:3000/v1/stream?scanId=<id>`.

## What works out of the box (no API keys needed)

- ✅ Domains via RDAP (`rdap.org` — free, no key)
- ✅ Social handles via public URL probes (Instagram, X, YouTube, LinkedIn, Facebook, Threads, Telegram, Pinterest)
- ✅ GitHub org availability (uses an optional `GITHUB_TOKEN` for higher rate limit)
- ✅ Apple App Store via iTunes Search API (free, public)
- ✅ Wikipedia concept-page check (free, no key)
- ✅ Shopify subdomain probe (DNS only)
- ✅ Chaldean numerology engine (pure compute)
- ✅ Linguistic analysis (transliteration + curated landmines dictionary — seed data, expand)
- ✅ Pronunciation analyser (Baby mode)
- ✅ OTP sign-in (logs OTP to console if MSG91 not configured — fine for dev)
- ✅ Verdict scoring + WebSocket streaming
- ✅ Razorpay + Paytm payment intent creation (returns 500 in dev without keys, which is correct behaviour)
- ✅ Agency lead form submission with rate-limiting

## What's stubbed (real integration is one function-body replacement)

- 🚧 **Legal & Regulatory scrapers** (MCA21, IP India, Copyright, GST, DPIIT, FSSAI, RBI, SEBI, IRDAI). In `NODE_ENV=development` they return deterministic mock results so the front-end renders correctly. Replace each `stubLegal(...)` call body in `src/scanners/legal.ts` with a real Playwright flow.
- 🚧 **Google Play scraper** — wire `google-play-scraper` npm package into `src/scanners/marketplace.ts`.
- 🚧 **Google SERP** — works if you set `GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_ID`. Otherwise returns "pending".
- 🚧 **Amazon / Flipkart Brand Registry** — requires ScrapingBee or Bright Data.
- 🚧 **PDF generation** — `src/pdf/generate.ts` returns a placeholder. Real implementation should call a sidecar Python service (WeasyPrint for business-mode, ReportLab for baby-mode).
- 🚧 **Paytm checksum** — uses HMAC-SHA256 as a development simplification. For production, install `paytmchecksum` npm package and replace `paytmChecksum()` in `src/payments/paytm.ts`.

## File layout

```
src/
├── server.ts                  Main entry — Fastify + Socket.IO
├── config.ts                  Zod-validated env vars
├── logger.ts                  Pino logger (pretty in dev)
├── db/
│   ├── schema.ts              Full Drizzle schema (users, scans, scan_results, billing_events, agency_leads)
│   ├── index.ts               Drizzle Postgres client
│   └── migrate.ts             Migration runner
├── cache/redis.ts             ioredis + cache + token-bucket rate limit
├── queue/
│   ├── index.ts               BullMQ producer
│   └── worker.ts              Standalone worker — `npm run dev:worker`
├── ws/server.ts               Socket.IO setup with Redis adapter + reconnect replay
├── api/
│   ├── index.ts               Router + auth-decorator hook
│   ├── scan.ts                POST /scan, GET /scans/:id, GET /scans/:id/pdf
│   ├── auth.ts                POST /auth/request-otp, /auth/verify-otp
│   ├── billing.ts             POST /billing/checkout, webhooks
│   └── agency.ts              POST /agency-leads
├── auth/otp.ts                OTP generation, verify, JWT signing
├── payments/
│   ├── razorpay.ts            Razorpay client + signature verification
│   ├── paytm.ts               Paytm txnToken initiation + verification
│   └── index.ts               Health-based gateway switcher (primary→fallback at 5% error or 10s latency)
├── pdf/generate.ts            PDF gen stub
├── lib/
│   ├── types.ts               Shared domain types
│   ├── normalise.ts           Input normalisation + transliteration
│   ├── numerology.ts          Full Chaldean engine
│   ├── scoring.ts             Verdict-scoring rubric
│   └── products.ts            Pricing catalogue
└── scanners/
    ├── index.ts               Orchestrator — fans out to all scanner families
    ├── legal.ts               Stubbed (Playwright + CAPTCHA needed)
    ├── domain.ts              ✅ Working — RDAP
    ├── social.ts              ✅ Working — URL probes + GitHub API
    ├── marketplace.ts         ✅ Apple/Shopify working; Play/Amazon/Flipkart stubbed
    ├── brand.ts               ✅ Wikipedia working; SerpAPI/Crunchbase stubbed
    └── linguistic.ts          ✅ Full — transliteration + landmines + numerology + pronunciation
```

## API surface

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/v1/scan` | Submit a name for scanning |
| `GET`  | `/v1/scans/:id` | Fetch consolidated result |
| `GET`  | `/v1/scans/:id/pdf` | 302 to a signed PDF URL (paid tiers) |
| `WS`   | `/v1/stream?scanId=…` | Live result stream |
| `POST` | `/v1/auth/request-otp` | Send OTP to phone |
| `POST` | `/v1/auth/verify-otp` | Exchange OTP for JWT |
| `POST` | `/v1/billing/checkout` | Create payment intent |
| `POST` | `/v1/billing/razorpay-verify` | Verify handler-success signature |
| `POST` | `/v1/billing/razorpay-webhook` | Razorpay webhook |
| `POST` | `/v1/billing/paytm-callback` | Paytm return-URL callback |
| `POST` | `/v1/agency-leads` | Agency contact form |
| `GET`  | `/v1/healthz`, `/v1/readyz` | Probes |

## WebSocket events

Server emits the following on `scan:<scan_id>`:

| Event | Payload |
|-------|---------|
| `scan_started` | `{ scanId, totalTiles, etaSeconds }` |
| `result_event` | `{ tileId, category, status, summary, detail, latencyMs }` |
| `progress` | `{ completed, total }` |
| `hud_update` | `{ verdictScore, clear, conflict, warn, pending }` |
| `verdict_complete` | full ScanVerdict |
| `tile_error` | `{ tileId, errorCode, retry }` |
| `scan_failed` | `{ reason, retryable }` |

## Pricing catalogue

All prices in paise (inclusive of GST). Defined in `src/lib/products.ts`:

| Code | Name | Amount |
|------|------|--------|
| `deep-scan` | Deep Legal Scan | ₹49 (4,900 paise) |
| `keepsake` | Keepsake PDF | ₹29 (2,900 paise) |
| `shortlist` | Shortlist of Five | ₹99 (9,900 paise) |
| `founder-pro` | Founder Pro (monthly) | ₹499 (49,900 paise) |

## Razorpay → Paytm fallback

Implemented in `src/payments/index.ts`. Behaviour:

1. Every checkout calls `selectGateway()`.
2. If a failover flag in Redis is active, Paytm is selected.
3. Otherwise we ping Razorpay; on failure we check Paytm and set a 30-minute failover flag.
4. Every successful/failed transaction calls `recordGatewayOutcome()`, which maintains 1-minute buckets of stats.
5. If the last 5 minutes show ≥20 transactions and >5% error rate on Razorpay, the failover flag is set automatically.
6. After 30 minutes of stable Razorpay, the flag expires and new checkouts return to Razorpay.

## Tests

Not included in this scaffold. Recommended:

```
__tests__/lib/numerology.test.ts        — known-good Chaldean reductions
__tests__/lib/scoring.test.ts            — rubric edge cases
__tests__/scanners/domain.test.ts        — mocked RDAP responses
__tests__/api/scan.test.ts               — integration via supertest
__tests__/payments/switcher.test.ts      — failover state machine
```

Recommended runner: **Vitest**.

## Production checklist

- [ ] Configure `JWT_SECRET` (long, random)
- [ ] Configure `MSG91_AUTH_KEY` + `MSG91_TEMPLATE_ID`
- [ ] Configure `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` + `RAZORPAY_WEBHOOK_SECRET`
- [ ] Configure `PAYTM_MERCHANT_ID` + `PAYTM_MERCHANT_KEY`
- [ ] Configure R2/S3 credentials for PDF storage
- [ ] Replace Paytm HMAC-SHA256 placeholder with `paytmchecksum` package
- [ ] Implement Playwright + CAPTCHA flow for `src/scanners/legal.ts`
- [ ] Implement PDF templates (WeasyPrint or ReportLab sidecar)
- [ ] Set up Sentry + Grafana Loki + Prometheus
- [ ] Tighten CORS `FRONTEND_ORIGIN` to production domain only
- [ ] Enable Cloudflare WAF in front of `api.naamdekho.in`
- [ ] Migrate from console-OTP logging to a real SMS sender
- [ ] Add tests
- [ ] Add CI (GitHub Actions: lint, typecheck, test, build, deploy)

## Quick smoke test

```bash
# Submit a scan
curl -X POST http://localhost:3000/v1/scan \
  -H "Content-Type: application/json" \
  -d '{"name":"Vyana","mode":"business","tier":"free"}'

# Response includes a scan_id. Then in another shell, watch the stream:
# (npx wscat -c 'ws://localhost:3000/v1/stream?scanId=scn_…')
```

You should see tiles arriving in real-time: domains via RDAP, social via URL probes, Wikipedia, Apple App Store, the Chaldean reading — and mocked-but-realistic data for the Legal scanners.

That's it. Edit, extend, ship.
