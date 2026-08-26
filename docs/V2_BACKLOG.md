# Version 2 backlog — decided, deferred

Things the founder has seen, considered, and consciously postponed. Not
forgotten, not silently dropped. Revisit when v1 is live and earning.

---

## Developer / package-name checks
**Decision: not now — keep for v2** (3 Aug 2026)

Three free, reliable, official APIs:

| Check | Source | Why it matters |
|---|---|---|
| npm package name | registry.npmjs.org | Every tech startup eventually publishes JS code |
| PyPI package name | pypi.org | Same, for Python |
| GitHub **organisation** | api.github.com | We check the *username* today; startups register *orgs*, a separate namespace |

- Cost: ₹0 forever. No keys, no accounts.
- Build effort: roughly an hour — the scanner pattern already exists.
- **The catch that caused the deferral:** it takes business mode from 26 to 29
  checks, so "26 checks" has to change in the hero, pricing page, How-it-works
  and the PRD. That copy churn was not worth it right now.
- If we do this in v2, consider switching the copy to a form that does not need
  updating every time we add a check.

## Bhashini (Government of India language platform)
**Decision: optional upgrade, not a blocker** (3 Aug 2026)

The client is fully built and tested (`src/lib/bhashini.ts`, `npm run
check:bhashini`). It stays inert until the founder registers at
https://bhashini.gov.in/ulca/user/register and adds two values to `.env`.

It is no longer required: our own offline engine now renders all 10 scripts
with no key, no network and no cost. Bhashini would only be an accuracy
upgrade on the romanised→Devanagari step. Register only if that step proves
weak in real use.

## Rejected outright (do not revisit without new information)

- **Telegram / Reddit / Substack / Bluesky / Medium handle checks** — founder's
  call, 3 Aug 2026: Indian startups do not evaluate these when naming.
- **Google Input Tools transliteration** — works well and needs no key, but it
  is an undocumented internal endpoint whose official version Google shut down
  in 2011. Unsafe to build a paid product on.
- **Aksharamukha** — AGPL-3.0. Its network clause would legally require us to
  publish Naam Dekho's source. Hard no for a commercial product.
