# Naam Dekho — Go-To-Market Checklist
### Every account, API key, and webhook needed to take the product to market
Updated: 3 August 2026

> **Two-minute settings job (no signup, no cost).** Open `backend/.env` and fill:
> - `ADMIN_EMAILS=` the Google address(es) you sign in with, comma-separated
>   (currently `naamdekho.global@gmail.com` — the ONLY admin, per founder instruction 4 Aug 2026). Turns on the founder's console at
>   `/admin`. Blank = console disabled. **Restart the backend after changing it** —
>   `.env` is read once at startup.
>   *If you have more than one Google account in the same browser, list all of them.*
>   *Chrome's account chooser can silently pick the wrong one, and the console then*
>   *correctly refuses you. Since 4 Aug 2026 the error names the account it saw.*
>   *When the signed-in account is an admin, a "Console" link appears in the nav —*
>   *if you cannot see that link, you are signed in as the wrong account.*
>   (`ADMIN_PHONES` still works for accounts created under the old OTP login.)
> - `SITE_ORIGIN=https://naamdekho.net` — then run `npm run build:names` so the
>   50 name pages and the sitemap point at the real domain instead of localhost.
>
> - `TRUST_PROXY_HOPS=` how many reverse proxies sit in front of the API.
>   **Get this right or the rate limit stops working.** One nginx on the box = `1`
>   (the default). Cloudflare in front of nginx = `2`. Node exposed straight to
>   the internet = `0`. Setting it too high lets anyone forge the header and take
>   unlimited free searches, which costs you money on every outbound API call.
>
> Neither needs an account. Everything else on this page does.

Everything below is written for a non-coder. For each item: what it is, where to
get it, what it costs, and what breaks without it. Items marked 🔴 block launch;
🟡 improves quality but can follow after launch; 🟢 free and quick.

---

## 1. MONEY — payment gateways (🔴 blocks revenue)

| What | Where | Cost | What I need from you |
|---|---|---|---|
| **Razorpay** (primary gateway) | razorpay.com/signup → complete KYC (company PAN, bank account, GST number) | Free signup; ~2% per transaction | Key ID + Key Secret (test mode first, live after KYC) → `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` |
| **Razorpay webhook** | Razorpay dashboard → Settings → Webhooks | Free | Point it at `https://api.naamdekho.in/v1/billing/razorpay-webhook`, subscribe to events `payment.captured` and `payment.failed`, and give me the Webhook Secret → `RAZORPAY_WEBHOOK_SECRET`. **This is how we know a customer actually paid — without it, payments succeed but credits are never granted.** |
| **Paytm** (automatic fallback) | business.paytm.com → merchant account (sandbox first) | Free signup; ~2%/txn | Merchant ID + Merchant Key → `PAYTM_MERCHANT_ID`, `PAYTM_MERCHANT_KEY`. Callback URL to register: `https://api.naamdekho.in/v1/billing/paytm-callback` |

*Note: KYC approval at both gateways takes 2–7 working days — start this first.*

## 2. SIGN-IN — Google Sign-In (🔴 blocks real sign-ins)

**Phone OTP has been removed (4 Aug 2026).** Sign-in is Google only now — which
also means **MSG91 and the ~₹5,900 DLT registration are no longer needed**. That
was the single most expensive item on this list and it is gone.

| What | Where | Cost | What I need from you |
|---|---|---|---|
| **Google OAuth Client ID** | console.cloud.google.com → APIs & Services → Credentials → *Create OAuth client ID* → **Web application**. Under *Authorised JavaScript origins* add `http://localhost:5173` and `https://naamdekho.net` | **Free** — no billing account required | Just the **Client ID** (it ends in `.apps.googleusercontent.com`). **Do not send me the client secret** — this flow does not use one, and it should stay secret. |

Where it goes once you have it:
- `backend/.env` → `GOOGLE_CLIENT_ID=...`
- `frontend-jsx/.env` → `VITE_GOOGLE_CLIENT_ID=...` (same value; it is public by
  design and ships inside the page — the security lives on the server)

The code is complete and the verification is real, not a stub: the token is
checked against Google's public signing keys server-side. Four forged tokens
were tested and all four rejected.

## 3. FREE-TIER CHECK QUALITY (🟢 all free, ~30 minutes total)

| What | Where | Free limit | Unlocks |
|---|---|---|---|
| ~~Google Custom Search~~ **DEAD END — do not pursue.** Google closed this API to new customers (full shutdown 1 Jan 2027); new projects get a permanent 403 no matter what. | — | — | — |
| **Brave Search API** key (the replacement) | brave.com/search/api → sign up → free plan → copy API key → add to `backend/.env` as `BRAVE_SEARCH_API_KEY` | 2,000 searches/month free | The "Web search" tile — already wired, activates the moment the key exists |
| **YouTube Data API** key | Same Google Cloud console | 10,000 lookups/day | More reliable YouTube handle checks |
| **GitHub token** | github.com → Settings → Developer settings → Personal access token (no scopes needed) | 5,000 checks/hour | Higher GitHub check limits |
| **Bhashini** keys ✅ *code fully built & tested — only your 5-min registration is left* | 1. Register: https://bhashini.gov.in/ulca/user/register 2. Verify the email (check spam) 3. Log in → **My Profile** → **Generate** 4. Copy **User ID** and **ULCA API Key** into `backend/.env` as `BHASHINI_USER_ID` and `BHASHINI_ULCA_API_KEY` 5. Confirm with `npm run check:bhashini` | Free (Government of India; max 5 keys per account) | The name written in **10 Indian scripts** — Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia. Verified 3 Aug 2026 that all 10 are live on the platform. Until then the in-house Devanagari engine runs and is credited as such |
| *(optional)* **Google Cloud Translation** | Same Google console | 500K chars/month free | Rare-language fallback |

## 3b. DONE — no action needed

| What | Status |
|---|---|
| **ScrapingBee ✅** | Key supplied 3 Aug 2026 and wired. Amazon India brand check is LIVE. Costs 1 credit per paid search; the free trial covers ~1,000 searches. Flipkart blocks proxies even on the premium tier, so that tile honestly says "check it yourself" with a link rather than guessing. |

## 4. THE HARD PAID CHECKS (🔴 for the ₹50 product's legal checks)

| What | Where | Cost | Unlocks |
|---|---|---|---|
| **2Captcha** | 2captcha.com | ~$3 per 1,000 solves (₹250) | MCA21 + IP India Trademark scrapers (they show CAPTCHAs) → `CAPTCHA_2CAPTCHA_KEY`. *Note: I still have to build the scrapers themselves once this key exists — that's the biggest remaining build job (~1–2 sessions).* |
| **ScrapingBee** | scrapingbee.com | $49/month (~₹4,100) | Amazon India + Flipkart brand checks, AND fixes the Instagram/Facebook "will retry" tiles → `SCRAPING_BEE_API_KEY` |

## 5. AI (🟡 quality upgrade)

| What | Where | Cost | Unlocks |
|---|---|---|---|

## 6. INFRASTRUCTURE TO ACTUALLY LAUNCH (🔴)

| What | Where | Cost | Why |
|---|---|---|---|
| **Docker Desktop** (your laptop, still pending) | docker.com | Free | Local database — accounts/credits currently reset when the backend restarts |
| **Python 3.11** (your laptop) | python.org | Free | Turns the working report page into stored PDF files |
| **Domain** naamdekho.in | Any registrar (GoDaddy/Namecheap/Cloudflare) | ~₹700/yr | The address customers visit |
| **A server in India** | AWS Mumbai (ap-south-1) or GCP Mumbai — India region is REQUIRED by our DPDP data-residency promise | ~₹2,000–5,000/mo to start | Runs the backend + database + Redis in production |
| **File storage** | Cloudflare R2 (r2.cloudflarestorage.com) or AWS S3 | ~free at our volume | Stores generated PDFs → `R2_*` keys |
| **HTTPS certificate** | Free via Cloudflare or Let's Encrypt | Free | Required (and promised in our security policy) |
| **Transactional email** | Resend.com / Amazon SES / Postmark | ~free at our volume | GST invoices must be emailed within 60 minutes of payment (our own policy FR-5.4.6). *The invoice email code is not built yet — small job once the account exists.* |
| *(recommended)* **Sentry** | sentry.io | Free tier | Tells us when customers hit errors |
| *(optional at launch)* **PostHog** | posthog.com | Free tier | Product analytics (funnels, conversion) |

## 7. WEBHOOKS SUMMARY — things that call US (need the public server first)

1. `POST /v1/billing/razorpay-webhook` ← Razorpay, on every payment (signature-verified; secret required)
2. `POST /v1/billing/paytm-callback` ← Paytm, after checkout (checksum-verified)
3. *(optional)* MSG91 delivery reports — can add later

Both endpoints are already built and verify signatures — a payment notification
with a bad signature is rejected (that's the protection against fake "I paid" calls).

## 8. WHAT REMAINS TO BUILD (my side, in order)

1. Razorpay/Paytm frontend checkout + credit granting on webhook (block 9 — LAST per your instruction; ~2–3 hrs once keys exist)
2. Real MCA21 / IP India / GST scrapers (needs 2Captcha key; the hardest job, ~1–2 sessions; until then clearly-labelled practice data)
3. Amazon/Flipkart via ScrapingBee + Instagram/Facebook fix (needs ScrapingBee key; ~half a session)
4. Stored PDF files + R2 upload (needs Python + R2 keys; report page already works)
5. Invoice emails (needs email account; small)
6. Production deployment + database migration + smoke tests (needs the server; ~1 session)

## 9. ROUGH MONTHLY RUNNING COST AT LAUNCH

| Item | ₹/month |
|---|---|
| ScrapingBee | ~4,100 |
| 2Captcha (at ~1,000 paid scans) | ~2,500 |
| Server + database | ~3,000 |
| SMS beyond free tier (at ~50 signups/day) | ~600 |
| Domain/storage/email/certs | ~200 |
| **Total** | **~₹10,500/month** (≈ 210 Deep Searches to break even) |
