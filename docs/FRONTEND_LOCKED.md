# Frontend — locked

*Signed off 3 August 2026.* This is the approved UI. Treat changes to the
layout below as requiring the founder's say-so, the same as pricing or copy.

---

## What "locked" means

The structure below matches the original naamdekho.net screens and has been
approved. Do not restructure it while fixing something else — that is exactly
how the landing page got flattened once already.

**Page order (both modes), always present:**

1. Mode tabs — Startup / Business · Baby Name
2. Hero — eyebrow, headline, description
3. Search box (+ optional sibling field in baby mode)
4. Hint strip · credits strip
5. **Summary strip — 4 boxes.** Verdict · Legal risk · Brand surface · Chaldean number
6. Unlock banner *(only after a scan)*
7. Filter tabs with per-family counts
8. Numbered sections with tiles — 01…08 business, 01…07 baby
9. Trademark class-wise table, inside section 01 *(business only)*
10. CTA strip

**The rule that made the mess, written down:**
The summary strip and every tile are ALWAYS rendered. Before a search they show
`—` and describe what each check does. They are never hidden, and they never
show a number for a name nobody typed. Removing fake data means emptying the
values, not deleting the layout.

**Paid tiles are open, not blurred** *(founder decision, 3 Aug 2026)*
The 6 premium checks are fully readable while locked: name, what the check does,
and the source are all visible. Only the RESULT is withheld, shown as a masked
row reading "Result ▨▨▨▨ · runs on the Deep Search". They are never blurred and
never covered by an overlay — a buyer should see exactly what ₹50 buys before
paying. The paywall is enforced on the server (the premium checks are simply not
run on a free scan), so the open tile has no result to leak.

## Guards now in place

| Guard | Catches |
|---|---|
| `npm run lint` (ESLint + react-hooks) | components declared inside render, setState-in-effect, use-before-declare, dead variables |
| `npm run build` | JSX structure errors, broken imports |
| CI runs both on every push | regressions before they reach the founder |

## Bugs fixed at lock-in (3 Aug 2026)

1. **`Metric` was declared inside `Admin`'s render.** React treated it as a new
   component type every render and remounted all 10 metric tiles each time.
   Moved to module scope.
2. **`startScan` was called before its declaration** in the `?q=` effect — a
   temporal-dead-zone hazard that happened to work only because effects run
   after the function body. The effect now sits after the declaration and is
   guarded by a ref so an incoming link can never scan twice.
3. **`setName` inside an effect** to seed the search box from `?q=`. The state
   is now seeded directly in `useState`, removing a render cascade.
4. **`Chaldean reading for ""`** — empty quotes rendered before a search.
5. **Fake "IPA" field** removed from the pronunciation data (it was a
   syllable-split of the spelling, not phonetic notation).
6. **Dead `MODES.hint` strings** that were maintained but never rendered.
7. **Devanagari gibberish** — Priya rendered as परइयअ. Engine rewritten; see
   `backend/STUBBED.md`.

Verified at lock-in: lint 0 problems · production build clean · both modes
scan correctly · `?q=` deep links run once and prefill · all 8 legal/marketing
routes 200 · mobile 375px has no horizontal overflow · 0 console errors
across a full navigation sweep.

## Known differences from the old naamdekho.net — deliberate

| Old site | Now | Why |
|---|---|---|
| "62 PLATFORMS" | "26 CHECKS" | PRD v2. The product genuinely runs 26. |
| "₹49" | "₹50" | PRD v2. |
| Legal risk: "Moderate" on a free search | "Unknown" | MCA21 and trademark are Deep Search checks. The old site asserted a risk level it had not checked. |
| Report pre-filled with "Vyana" | Blank until you search | Founder instruction, 3 Aug 2026. |

## Rules learned the hard way

**Renaming a value that crosses the API boundary is not a rename until every
sender is changed.** On 4 Aug 2026 the scan tier `free` became `standard` in
the database, the zod schema, the token table and the pricing page — but not in
the two `startScan()` calls on the home page. Every Standard search on the site
returned HTTP 400. Deep Search still worked, which is why it went unnoticed.
Tier strings now live in named constants (`TIER_STANDARD`, `TIER_DEEP`) at the
top of `Home.jsx`, beside a comment naming the backend files they must match.

**"Could not reach" and "was refused" are different failures.** The same
incident showed a network-error message for a request the server answered in
one millisecond, and the evening was spent looking for a connection fault that
did not exist. `scanErrorMessage()` in `Home.jsx` maps the status code; never
collapse a rejection and a timeout into one sentence.

**One copy of the token balance.** The nav, the footer and the search page read
`useMe()`. Anything that spends tokens calls `refreshMe()`, so the balance in
the corner is never one search out of date.
