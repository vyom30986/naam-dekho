# Baby naming — Certificates

*Design agreed with the founder, 6 August 2026.*

Replaces the "Keepsakes" section in baby mode with **Certificates**: a single-page
certificate that ships with the naming report, and a premium tier that adds five
verified alternative names.

## Why

Section 07 is titled "Keepsakes" and its description promises "a beautiful PDF for
the family" — singular. Underneath it sit two equally-weighted tiles selling two
different products at 300 and 1,000 tokens. The heading, the description and the
contents disagree with each other, and nothing signals that one tier is the better
one. The founder's words: *"0.7 and this are not complementing each other."*

## The ladder

| Step | Tokens | ₹ | What the parent gets |
|---|---|---|---|
| Standard search | 25 | 2.50 | the free checks, on screen |
| **Naming Report** | **300** | **30** | every check on screen **+ the single-page certificate** |
| **The Complete Set** | **1,000** | **100** | all of the above **+ five verified alternative names** |

Rupee figures are at the ₹50 / 500-token pack rate (₹0.10 per token).

Two rules, both from the founder:

1. **Either/or.** A parent chooses the Naming Report or the Complete Set. Nobody
   pays 300 and then 1,000 for overlapping things.
2. **Never pay twice.** A parent who has already bought the 300-token report and
   later wants the alternatives pays **the difference — 700 tokens, not 1,000**.
   Charging 1,000 would cost them 1,300 for what another parent gets for 1,000.

## What the certificate contains (300)

One document, two artboards, as today: A4 portrait for printing and framing, and a
1080×1080 square for sharing.

- The child's name, large, in English and Devanagari
- Date of birth, when the parent gave one
- A short write-up: what the name means, in the languages where it means something good
- Birth star and rashi — only when a date of birth was given (see *Open questions* below)
- The Chaldean numerology line
- A thank-you note to the family

### The good-parts-only rule

The certificate shows **only** favourable meanings. No conflicts, no warnings, no
"we could not check". This is correct — a certificate is made for a naming ceremony,
not a verdict — **but it is only honest because of where it sits in the flow.**

The parent has already read the full report, which shows everything including any
unfortunate meaning, before the certificate exists. The certificate is a celebration
of a decision already made with complete information.

**This is a load-bearing constraint, not a preference.** A certificate must never be
obtainable without the report that precedes it. See *Products to retire*.

## What the Complete Set adds (1,000)

Everything in the certificate, plus five alternative names.

The existing interactive flow is **kept**: the parent either asks us to suggest five,
or supplies up to five of their own (`MAX_OWN_NAMES`) for verification. Each name is
checked live and shown on screen. The PDF is the keepsake, not the gate.

The PDF then gives each of the five its own page:

- the name in English and Devanagari
- its meaning, where it has a good one
- pronunciation
- how it sits with the birth star, when a date of birth was given
- whether the matching handles are free

## The page

`SECTIONS.baby` entry `num: '07'` changes from `title: 'Keepsakes'` to
`title: 'Certificates'`, and its description names both products instead of promising
one PDF.

The two equal tiles become two unequal blocks:

- **Left — the certificate.** An ordinary white card, badged *Included with your report*.
  It is no longer something to buy.
- **Right — the Complete Set.** A visibly premium block: the deeper tan ground, a gold
  hairline, terracotta accent, more vertical presence, and the five-name promise stated
  in full.

**Palette constraint (standing founder instruction):** no new hues. Only `--accent`,
`--accent-2`, `--gold` and the tan backgrounds already in `:root`. Depth comes from
`color-mix()` against those tokens, never from a new colour.

## Changes by file

### Backend

| File | Change |
|---|---|
| `src/lib/settings.ts` | Remove `addons.keepsake`. Keep `addons.shortlist: 1000`. Add `addons.shortlistUpgrade: 700` for the never-pay-twice path. |
| `src/lib/products.ts` | Retire the `keepsake` product (₹29 standalone). Keep `shortlist`. |
| `src/api/scan.ts` | `GET /scans/:id/keepsake` no longer charges; it requires the scan's tier to be `deep` or better. Add the 700-token upgrade path to `POST /scans/:id/alternatives` for a scan already at `deep`. |
| `src/pdf/keepsake.ts` | Add the write-up, the good-meanings-only language block, and the thank-you note. Drop the stale "₹29" from the file comment. |
| `src/pdf/` (new) | `shortlist.ts` — the Complete Set document: the certificate pages, then one page per alternative. |

### Frontend

| File | Change |
|---|---|
| `src/pages/Home.jsx` | `SECTIONS.baby` 07: retitle to *Certificates*, rewrite the description. `b-kp` becomes an included card; `b-alt` becomes the premium block. |
| `src/index.css` | A `.premium-block` treatment built from the existing tokens. |
| `src/pages/Pricing.jsx` | Reflect the new ladder — the certificate is included, not sold. |

## Products to retire

`PRODUCTS.keepsake` in `products.ts` sells a standalone certificate for ₹29 with no
report attached. Under this design that is a route to a certificate without the report
behind it, which breaks the good-parts-only rule above. **It must be removed, not just
hidden.**

`addons.keepsake` in `settings.ts` becomes unreachable for the same reason and is
removed with it.

## Testing

- A scan at `standard` tier cannot fetch a certificate — 402 or 403, never a PDF.
- A scan at `deep` tier fetches its certificate without any further charge.
- A `deep` scan upgrading to alternatives is charged 700, not 1,000.
- A fresh purchase of the Complete Set is charged 1,000.
- The certificate contains no `bad` or `neutral` sentiment strings, and no
  "could not check" text, for a name that has an unfortunate meaning — verified
  against a name known to trip the landmine dictionary.
- The token spend stays atomic: the existing single-`UPDATE`-with-`WHERE tokens >= cost`
  pattern is used for the upgrade too, so a double-click cannot charge twice.

## Settled since first draft

**Date of birth — optional, and never printed.** The founder considered making it
mandatory and decided against it (6 Aug 2026): *"we should add those features, not keep
them mandatory."* A search runs on the name alone. Where a date IS given it is used to
compute the birth star and then discarded &mdash; it is not a column in `scans` and must
not become one. The certificate prints the birth star ("Born under Uttara Ashadha ·
Makara"), never the date. This keeps the name-plus-exact-date identity pair out of every
permanent artefact.

**Gender — optional, and transient.** New field in baby mode, values `boy` | `girl` |
`unisex` to match the vocabulary already used by `corpus_names.gender`. Its purpose is to
make the five alternative suggestions relevant. Passed per request rather than stored on
the scan, for the same reason as the date.

**The meaning paragraph — Gemini writes, our dictionary decides.** Gemini is given the
meanings that already passed verification and asked to compose them into prose. It is
forbidden to introduce a meaning it was not given. Where there are no verified meanings it
is not called at all and a fixed sentence is used instead. The AI never invents and never
writes the fallback.

**Delivery — print-ready HTML, not a rendered PDF.** No HTML-to-PDF renderer is installed
and none is being added. The certificate is served as HTML with print styles; the customer
uses their browser to save or print it, which produces an identical result because it is
the same rendering engine. A consequence worth keeping on purpose: the certificate is
regenerated from the name on each request and never stored, so no file containing a
child's name accumulates anywhere.

## Notes

The `outputs/` tree is not a git repository, so this spec is written to disk but not
committed. The founder controls all git operations.
