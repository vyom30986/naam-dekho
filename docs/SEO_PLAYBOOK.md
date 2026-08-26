# Name pages — the SEO pilot

*Built 3 August 2026. 50 pages live in the build.*

## What was built

`/n/` — an index linking every name
`/n/aarav.html` … 50 individual name pages

Each page is a **static HTML file**, not a React route. That is deliberate: a
file that already contains its content in the markup gets indexed reliably,
while a page that has to run JavaScript first is a gamble. These also cost
nothing to serve and cannot break when the app changes.

## Why these pages should rank

The pSEO trap is publishing thousands of near-identical pages with a city or
name swapped in. Google calls that thin content and penalises it.

Every one of these pages carries data **we compute ourselves**:

- the name written across 10 Indian scripts (our transliteration engine)
- its Chaldean compound and root number, ruling planet, and favourable fields
- the nakshatra and rashi its first syllable maps to (Avakahada chakra)
- the short forms the name naturally takes (our nickname engine)
- a pronunciation reading, Indian and non-Indian

No competitor can copy that from a public dataset, because it does not exist
in one. That is the whole strategy.

## Deliberately NOT done

- **No fake meanings.** Where we do not genuinely know a name's meaning, the
  meaning line does not render. A template that invents etymology to fill a
  gap is exactly how a site loses trust.
- **No scale yet.** 50 pages, not 5,000. Publish, watch, then scale.

## What happens next — the honest sequence

1. **Deploy.** The pages ship inside the normal frontend build (`dist/n/`).
   Set `SITE_ORIGIN` in `backend/.env` to `https://naamdekho.net` first, then
   run `npm run build:names` so the sitemap and canonicals point at the real
   domain rather than localhost.
2. **Submit** `https://naamdekho.net/sitemap.xml` in Google Search Console.
3. **Wait 4–6 weeks.** Indexing is slow for a new domain. Do not add pages
   during this window — it muddies the signal.
4. **Read the result** in Search Console: how many of the 50 got indexed, what
   queries they surfaced for, and the click-through rate.
5. **Then decide.** If pages are indexing and earning impressions, scale to
   500 using the most-searched names from the admin console — real demand data
   beats guessing. If they are not indexing, the format needs fixing first,
   and adding more pages would only multiply the problem.

## Adding more names

Edit `backend/src/scripts/name-corpus.ts`, then:

```bash
npm run build:names
```

That regenerates every page, the `/n/` index, `sitemap.xml` and `robots.txt`.

## A caution worth repeating

The founder's original instinct was "backlink a million names". Publishing a
million pages would almost certainly trigger a thin-content penalty and could
deindex the whole domain — including the pages that actually sell. 50 → 500 →
5,000, each step gated on evidence from the previous one, is slower and far
more likely to work.
