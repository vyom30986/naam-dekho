# Content and models

Where a name's meaning comes from, which parts of the product a model wrote, and
the rules that decide what is allowed onto a page. Read this before you touch
anything in `backend/src/lib/` that produces a meaning, and before you add or
approve a name in the corpus.

One sentence carries the rest of the document: **a meaning is printed publicly
only when it is verified AND a source is named.** Several pieces of code exist
only to hold that line, and a few of them look like over-engineering until you
know what they are protecting. Most of what follows is that explanation.

Related reading: `docs/ARCHITECTURE.md` section 6 (the transliteration seam) and
section 7 (caching), and `docs/KNOWN-ISSUES.md` items G1, G2, G6 and G8.

---

## 1. The corpus table

`corpus_names`, defined at `backend/src/db/schema.ts:203`. One row per name we
publish a page for. It is the only place name content lives; the console edits
it, the live scan reads it at boot, and the static page build reads it again.

| Column | Type | What it holds |
|---|---|---|
| `slug` | text, primary key | Lowercased name with non-alphanumerics collapsed to `-`. The `/n/<slug>.html` filename |
| `name` | text, not null | The name as it is displayed |
| `gender` | text | `boy`, `girl`, `unisex`, or null |
| `origin` | text | Free text, for example `Sanskrit`, `Persian/Arabic` |
| `meaning` | text | The gloss. Present does NOT mean printable, see `verified` |
| `native_spelling` | text | A verified Devanagari spelling. Section 4 explains why this column exists |
| `meaning_source` | text | Who says so, for example `en.wiktionary.org`. This is the line the public page prints as its authority |
| `meaning_url` | text | Where a reader can go and check it |
| `verified` | boolean, default false | A human has read the gloss and stands behind it |
| `published` | boolean, default false | The name gets a page at all |
| `created_at`, `updated_at` | timestamptz | |

### The four states a row can be in

Counts are for the 536 published names as the corpus stands today.

| State | Test | Count | What the public sees |
|---|---|---|---|
| Verified, sourced | `meaning` set, `verified` true, `meaning_source` set | 260 | The meaning, with its source cited and linked where a URL exists |
| Awaiting review | `meaning` set, `verified` false | 259 | Nothing. The page renders without a meaning block |
| Nothing recorded | `meaning` null | 17 | Nothing, same as above |
| Unpublished | `published` false | not part of the 536 | No page at all |

The 260 verified meanings split into 210 sourced from `en.wiktionary.org` with a
clickable URL, and 50 older entries credited as `Naam Dekho editorial`. The three
published states add up: 260 + 259 + 17 = 536.

Separately, 210 rows carry a verified `native_spelling` and 326 do not. That is a
different axis from the meaning states, and a different piece of work.

---

## 2. The rule: verified and sourced, or it is not printed

This is enforced in three places rather than trusted once. If you are changing
any of them, change all three or you have opened a hole.

| Where | Code | What it does |
|---|---|---|
| The write | `backend/src/api/admin.ts:673`, marked `HONESTY GATE` | `PUT /admin/corpus/:slug` returns 400 `verified_needs_source` if `verified` is true and a meaning is present but `meaning_source` is empty |
| The read, at page build | `backend/src/scripts/build-name-pages.ts:60` | `meaning: r.verified && r.meaning ? r.meaning : undefined`. The source and URL are gated on the same condition, so an unverified row reaches the renderer with no meaning at all rather than with a meaning the renderer has to remember to suppress |
| The console | `frontend-jsx/src/admin/CorpusPage.jsx`, `needsSource()` | The same refusal, applied at typing time so the founder finds out before saving |

What "not printed" means in practice, because it is stricter than it sounds. An
unverified meaning is not shown as a guess, not shown as "meaning unknown", not
shown as an empty cell in a table, and the name is not filed into a meaning theme
at all. `backend/src/seo/meanings.ts` clusters only names carrying a verified
meaning, which is why the theme pages can print each name's recorded meaning
verbatim beside it and invite the reader to check the grouping. `letters.ts`
prints a blank cell and a note explaining that a blank is a meaning we have not
verified.

The reason for the strictness is competitive as much as ethical. The astrology
mills answer every query with a confident sentence. A shorter page that is right
is the only thing we have that they do not.

---

## 3. The review queue at `/admin/corpus`

`frontend-jsx/src/admin/CorpusPage.jsx`, backed by the routes at
`backend/src/api/admin.ts:649` onward.

The page lands on the **Needs review** filter when anything is waiting, and shows
four views: All, Needs review, Verified, No meaning. The counts are computed over
the whole corpus and never over the search box, so narrowing the search does not
make the queue look finished.

Which pile a row is in is derived from the data, not from the source string:

```js
const stateOf = (n) => (!n.meaning ? 'none' : n.verified ? 'verified' : 'review')
```

That matters. The batch job that loaded the proposals wrote a marker into
`meaning_source`, the constant `PROPOSAL_SOURCE` in `CorpusPage.jsx`, whose value
is the literal `Gemini proposal — needs review`. Filtering on that string would
have missed any row a human half edited by hand. The rule underneath is the
public page's rule: any unverified meaning is waiting for a human, whatever wrote
it.

| Action | What it writes | Why |
|---|---|---|
| **Approve** | `verified: true`, `meaning_source: "Naam Dekho editorial"` | A human has now read the gloss, so the row carries a human's authority. The proposal label must not survive approval, or a row ends up verified while still citing "needs review" as its source, and that sentence gets read as a citation months later |
| **Reject** | `meaning`, `meaning_source`, `meaning_url` all null, `verified: false` | Empties the meaning rather than flagging it. "No meaning yet" is a state the public page already handles honestly, and a kept-but-wrong gloss is one careless tick away from being printed. `published` is deliberately left alone, so the page stays up and simply stops claiming to know the meaning |
| **Edit** | Whatever the form holds | The full row is rewritten. See the note on `native_spelling` in section 4 |
| **Delete** | Removes the row | Behind a confirm dialog, and the only red button on the screen |

Approve and Reject have no confirm dialog. That is intentional: clearing this
queue is a few hundred clicks in one sitting, the queue's proposals were never
visible to a customer, and a confirm on every click makes a queue of hundreds
unusable. The screen is also built to hold still between clicks. Only the row
being written is disabled, the list is patched in place rather than unmounted,
and success is silent so nothing shifts under the cursor. Failures still speak
up.

Every write goes through `audit()` and lands in `audit_log` as `corpus.update`,
`corpus.create`, `corpus.delete` or `corpus.import`, with the before and after
values.

### Approving does not republish the static pages

Approving changes the database. The live scan surfaces pick that up on the next
server start, and the 697 static HTML files under `frontend-jsx/public/` do not
change at all until somebody runs the page build:

```
cd backend
npm run build:names
```

**That command must have the database.** Without one it silently falls back to a
built-in 50 name corpus and the 697 pages collapse to about 50, taking the
sitemap with them. `docs/KNOWN-ISSUES.md` G7 covers the hazard in full.

One stale string to be aware of: after a save the console says "Regenerate pages
from the Test menu when you are done editing." There is no build button in the
Test menu. Grepping `frontend-jsx/src/admin/` finds no route or control that
triggers `build:names`; the SEO page reports build state and tells you to re-run
the build yourself. Treat the toast as a reminder to run the command, and correct
the string when you are next in that file.

---

## 4. The verified Devanagari spelling, and why transliteration alone is not enough

Roman spelling does not record vowel length. "Ram" carries no mark saying which
of its vowels is long, so a rule engine writes **रम** where a Hindi reader writes
**राम**, and **रितु** where they write **ऋतु**. To a Hindi reader that is not a
near miss, it is a different word. The fallback is wrong for roughly 63% of
names, and no amount of rule tuning fixes it, because the information genuinely
is not in the input. `backend/src/lib/transliterate.ts:164` records the
measurement behind that claim.

So there is a lexicon. `corpus_names.native_spelling` holds the verified
spellings, and `registerNameSpellings()` at `backend/src/lib/transliterate.ts:185`
loads them into a module-level map that `romanToDevanagari()` consults before it
does any work. The map starts empty, which is what keeps the transliteration
module free of any dependency on the database.

It is loaded in exactly two places:

| Caller | Line | When |
|---|---|---|
| `backend/src/server.ts` | 36 | At server start, wrapped in a try/catch so an un-migrated database degrades to transliteration instead of stopping the boot |
| `backend/src/scripts/build-name-pages.ts` | 76 | Before any page renders |

**The blast radius is wider than it looks.** Every other Indian script on the site
is derived from the Devanagari form. One wrong vowel there is wrong in all ten
scripts, on the live scan tile, on the static name page, and on the certificate a
family frames. Both call sites must run before anything renders, which is why
they sit where they do.

326 names still have no entry and fall back to the engine. Closing that gap is
lexicographic work, one name at a time. Do not attempt to close it by improving
the transliterator.

**A gap to know about before you plan that work:** the console cannot currently
write this column. The zod schema `corpusEntry` at `backend/src/api/admin.ts:656`
does not include `nativeSpelling`, and `CorpusPage.jsx`'s `payload()` does not
send it. The good news is that the update is an `onConflictDoUpdate` whose `set`
is spread from the parsed body, so editing a name in the console does not wipe an
existing spelling. But you will need either a new field on both sides or a bulk
import path before anyone can enter the remaining 326.

---

## 5. The meaning pipeline

Two different things share the word "meaning" and it is worth separating them.

**At scan time**, `backend/src/lib/meanings.ts` answers "what does this name
mean" for any name a customer types, including names that are not in the corpus.
`lookupMeaning()` tries two layers in order:

1. `VERIFIED_MEANINGS` in `backend/src/lib/meanings-data.ts`, a small offline
   dataset. It currently holds four in-house Sanskrit entries. Every entry
   carries its source, and the file's stated rule is that an empty dataset is
   better than a wrong one.
2. A live Wiktionary lookup against the REST definition API, cached 30 days under
   `cache:meaning:<name>`.

When neither knows, the answer is `null` and the tile says so.

The Wiktionary lookup is fussier than a naive fetch, and the fussiness is the
point:

| Rule | Code | Why |
|---|---|---|
| Try both casings | `for (const t of [title, title.toLowerCase()])` | Wiktionary titles are case-sensitive. The given name sits at `Kavya`, the Indic common noun at `kavya`, and the noun is where the actual meaning lives |
| Prefer an origin-language section | `MEANING_SECTIONS`, `meanings.ts:37` | A gloss in the Hindi, Sanskrit, Tamil, Persian and similar sections is a real meaning. The English section usually only says "a male given name" |
| Reject boilerplate | `BOILERPLATE`, `meanings.ts:42` | "A male given name" is not a meaning |
| Accept an English line only when it states a meaning | Pass 2 | "A female given name transferred from the place name", the Irish Tara, passed a looser filter during testing. A line about a different bearer of the name is worse than no line |
| 404 is cached, anything else throws | `meanings.ts` | A definitive miss must be remembered or every meaningless name refetches forever. A transient failure must never be cached, or a flaky minute hides a name's meaning for 30 days |

**At corpus-building time**, a separate batch pass produced the 210 Wiktionary
meanings and the 210 verified spellings now in the table. Its division of labour
was: Gemini for the **native spelling only**, Wiktionary for the **citable
meaning**, and a cross check between them before anything was written.

The cross check rejects a gloss that is not the name's sense. Wiktionary will
happily return a definition for a page that shares the name's spelling without
being about the name. The worked case: **Ashok** glosses on Wiktionary as the
ashoka tree, which is a real word and the wrong claim to print on a page about
the name, whose sense is "without sorrow". That gloss was rejected by the cross
check rather than imported. Names that failed the check either kept an older
editorial meaning or went into the queue as a proposal.

The batch job is committed, at `backend/src/scripts/enrich-meanings.ts`:

```bash
npm run enrich:meanings -- --dry --limit=20     # look before you leap
npm run enrich:meanings -- --write              # apply
npm run enrich:meanings -- --write --redo       # also redo rows it filled before
```

It does exactly what this section describes: one Gemini call per batch of 20 for
the Devanagari spelling, one Wiktionary request per name for a citable meaning
at that spelling, then a cross check that rejects a gloss which is not the
name's sense. Verified rows get `meaningSource = en.wiktionary.org` plus a URL
and a stored `native_spelling`. Everything else lands unverified in the review
queue, so a human still approves it.

Two flags worth knowing. `--dry` writes nothing and is the default; you have to
ask for `--write`. `--redo` re-processes rows the script itself filled before,
identified by the source string it stamps, and never touches the older
`Naam Dekho editorial` entries or anything a human has approved. That escape
hatch exists because a bad run is otherwise permanent: without it the selection
is "rows with no meaning", which after one run is empty.

A rerun over the full corpus takes some minutes and is polite to both services.
Free tier Gemini keys will earn a 429 under it; the script retries and a name
that still fails is simply left for the next run rather than being cached as
"no meaning".

---

## 6. The models

Two providers appear in the codebase. Only one of them is doing anything today.

| Model | Where | What it does | Cache key | TTL | Without the key |
|---|---|---|---|---|---|
| `gemini-flash-lite-latest` | `lib/gemini.ts:126` `geminiReadings()` | Per-language readings of a name across 11 languages, for the landmine tile | `cache:gemini-meaning:<name>` | 180 days | Returns `[]`, reported as "not checked" |
| same | `lib/gemini.ts:203` `certificateProse()` | Two or three sentences for the one page keepsake | `cache:cert-prose:<name>` | 180 days | Deterministic prose from the same verified meanings |
| same | `lib/certificate-essay.ts:136` `certificateEssay()` | The roughly 150 word passage on the Shortlist of Five | `cache:cert-essay:v2:<name>:<gender>` | 180 days | `plainEssay()`, deterministic |
| same | `lib/sandhi.ts:117` `sandhiVichched()` | संधि विच्छेद. See section 7 | `cache:sandhi:<roman>` | 180 days | Returns `null` |
| same | `lib/gemini.ts:404` `compoundParts()` | The older roman-letter splitter, still used by `nameBreakdown()` | `cache:compound:<word>` | 180 days | Returns `[]` |

The endpoint, model id, 6 second timeout and language list are all at the top of
`backend/src/lib/gemini.ts`. Changing the model is a one line edit there.

Two behaviours of `postGemini()` are worth knowing before you debug a slow scan.
Only 429 and 503 are retried, three attempts with jittered backoff, because a
free-tier key earns a 429 easily whenever a shortlist reads several names at
once, and reporting that to a customer as "no meaning we could confirm" is a
different claim and a false one. A timeout is not retried: it has already spent
the budget and the scan has a deadline.

One stale comment to correct while you are in that file. The header of
`gemini.ts` says the tile shows Gemini rows "separately from the verified
dictionary". Since the founder's 6 Aug 2026 change the readings sit inside the
per-language rows instead, badged rather than separated. The safeguard is intact,
it just works differently than the comment describes. See rule 6 in section 8.

### Certificates

There are two, and they carry different amounts of model output.

| Certificate | Route | Model text |
|---|---|---|
| Keepsake, one page | `GET /v1/scans/:id/keepsake` | `certificateProse()`, two or three sentences |
| Shortlist of Five, two pages | `POST /v1/scans/:id/certificate-five` | `certificateEssay()`, one call for the roughly 150 word essay |

Everything else on both sheets is deterministic TypeScript with no model
involved: the numerology wheel, the nakshatra and rashi reading, the
transliteration into ten scripts, the short forms, the pronunciation reading, the
layout and the logo. The logo is embedded as a base64 data URI, so no asset file
is needed. Typefaces load from `fonts.googleapis.com` at render time; with no
outbound internet the sheet still renders, in Georgia or a generic serif.

The Shortlist route also calls `sandhiVichched()` just before writing the essay,
at `backend/src/pdf/certificate-five-data.ts:170`. In the ordinary flow that
answer is already cached, because the landmine tile asked for the same name
during the scan. It is a fresh call when the parent picks a name they did not
search, which the route explicitly allows: the name travels in the request body
rather than being read back from the scan, because the chosen name may be one
they have just typed.

One point of vocabulary, because it trips people up. The keepsake costs 300
tokens and the Shortlist of Five costs 1,000, but those are the product's
**internal credit unit** from `backend/src/lib/tokens.ts`, where 1 token is ₹0.10.
They have nothing to do with model tokens, and since 4 August 2026 the compiled
numbers are only defaults, with live pricing held in the `settings` table and
editable from the console. The model's own output limits are set per call in
`generationConfig`: `maxOutputTokens: 500` for the essay, `220` for the prose.

### Gemini is the only model called

Startup name alternatives used to sit behind a second, paid model API with
an in-house heuristic as its fallback. The key was never set, so the
heuristic was the only path that ever ran. The integration and its
dependency were removed on 26 August 2026, so there is no dormant bill
waiting for somebody to add a key later.

`generateAlternatives()` now calls `heuristicCandidates()` directly and
reports `source: "heuristic"`, so the customer is never told a machine
chose the names when it did not.

### The cost shape

The billable unit is **one call per unique name per 180 days**, on Google's
cheapest tier. Two consequences worth holding on to:

- Cost scales with unique names, not with searches. The hundredth search for
  Aarav costs nothing.
- It scales with unique **words**, not unique inputs. `nameReadings()` asks about
  each word of a two-word name separately, so "Dev Vyom" is two lookups and each
  is reusable by anyone who searches either half.

The console's own cost panel records Gemini at ₹0 per call, on the basis of a
free tier of 1,500 requests per day on Flash Lite and 45,000 per month
(`backend/src/lib/api-usage.ts:60`). That figure is an assumption written into
the code, not an invoice. **Check Google's current pricing page before you rely
on any number here or in the console.** The file says as much itself: the panel
counts our own calls and multiplies by a published rate, which is accurate for
volume and approximate for money.

You do not need to estimate volume. `recordApiCall()` writes one row per outbound
call into `api_calls`, per provider and per operation, with no request content
stored. That table is the honest answer to "how much are we actually calling
this".

---

## 7. Sandhi: `backend/src/lib/sandhi.ts`

The file performs संधि विच्छेद. It converts the name to Devanagari, asks whether
Hindi or Sanskrit already carries it as a single dictionary word, and if not
recovers the parts, names the rule that joined them, and gives each part its own
meaning. It is used by the certificate essay and by the landmine tile.

### Why it replaced the old splitter

`compoundParts()` in `gemini.ts` asked, in English, of a roman string: "is this a
compound? if unsure reply NONE". Three things were wrong with that.

1. **Wrong script.** Sandhi is a property of the Devanagari form, not of a Latin
   transcription of it. "Rivaan" carries no information about which vowel is
   long. रिवान does.
2. **Wrong question.** A compound is not two substrings pushed together. In
   sandhi the join *changes the sounds*, so no amount of slicing the surface form
   recovers the parts. Undoing that is what विच्छेद means, and it has to be asked
   for by name.
3. **Biased toward silence.** "If unsure, reply NONE" is the right instinct
   applied at the wrong level. Applied to the whole question it meant real names
   came back as nothing. Rivaan returned NONE, and the certificate then told a
   family their son's name "belongs to no dictionary".

That last one is why this file exists. The honesty rule belongs on each **part**,
not on the attempt.

### Worked examples

| Name | Reading | What it shows |
|---|---|---|
| Rivaan | रिवान is रि + वान | A name no dictionary carries whole, which still divides into parts that each mean something. Before this, the certificate called it a made name |
| Devendra | देवेन्द्र is देव + इन्द्र, by गुण संधि (अ + इ → ए) | The join changed the sounds, so the parts are not visible in the spelling. The letters इ and अ are simply not there any more in देवेन्द्र. Slicing the surface form can never recover this |
| Divyom | दिव्योम is दिव्य + ओम् | The same shape, and the case that motivated the earlier breakdown work |

### The rule that keeps it honest

**Every part must carry its own dictionary meaning, or the whole answer is
discarded.** In code, at `sandhi.ts`:

- parts are filtered to those with both a Devanagari form and a non-empty meaning
- `complete` is true only when nothing was filtered out
- an answer is accepted only when `complete` is true and at least two parts
  survive
- anything else returns the `{ none: true }` sentinel, and the caller gets `null`

The prompt carries the same constraints: the parts must actually recombine into
the Devanagari form under the rule named, do not pad, `composed` must follow from
the parts, and the model is explicitly forbidden to describe a name as
meaningless, modern or invented, because that is not what is being asked and not
its conclusion to draw.

`null` from this function means **"we do not know"**. It must never be rendered as
"this name has no meaning". `plainEssay()` in `certificate-essay.ts` is the
reference wording for that distinction: when nothing was found it says the name
did not turn up in the dictionaries we read and did not divide into parts we
could vouch for, and that this is the honest limit of our checking rather than a
verdict on the name.

### One sentence, two surfaces

`sandhiSentence()` at `sandhi.ts:204` turns a reading into the single line that
gets printed. It lives there, rather than at each call site, so the certificate
and the tile cannot describe the same name differently. The certificate saying a
name was invented while the tile beside it showed the split is exactly the bug
this file was written for.

The tile bridge is `sandhiBreakdown()` at
`backend/src/scanners/linguistic.ts:460`, which maps a `SandhiReading` onto the
`NameBreakdown` shape the tile renders, carrying the rule along with the parts
because the rule is the evidence for the split. It is bridged in the scanner
rather than in `gemini.ts` because `sandhi.ts` already imports from `gemini.ts`
and the other direction would close an import cycle.

### Known limitation

The call is not fully deterministic between runs, even at `temperature: 0` with a
strict `responseSchema`, and the answer is then fixed for 180 days by the cache.
Two clean installs can permanently disagree about the same name. Do not treat
that as a cache bug and shorten the TTL; the long TTL is protecting something
else. `docs/KNOWN-ISSUES.md` G6 sets out the two candidate fixes and asks that
the approach be agreed before anyone implements one.

---

## 8. The honesty rules

These are the product's position, not house style. Each one is enforced somewhere
in code, and each one is small enough for a well meaning change to delete by
accident.

1. **A meaning is printed publicly only when it is verified and a source is
   named.** Enforced at the API write, at the page build, and in the console.
2. **An unverified meaning is invisible to customers.** Not a guess, not "meaning
   unknown", not a blank cell in a table, and not grouped into a theme.
3. **The grouping is ours, the wording is the source's.** Theme pages say so and
   print each name's recorded meaning verbatim so the grouping can be checked.
4. **"We do not know" is never rendered as "this name has no meaning."** Say what
   we checked, not what the name is.
5. **A model may be the writer, never the source.** The certificate prompts are
   handed only meanings that already passed our checks and are told they may not
   add one. A certificate carries no "AI reading" label and is kept for twenty
   years, so the safety has to sit in the prompt.
6. **Machine readings are labelled as machine readings everywhere else.** On the
   landmine tile our hand-verified dictionary always wins, a Gemini reading only
   fills a silence, and where it does the row is badged through `meaningSource`.
   The tile's headline claims a good meaning only where our own dictionary says
   so; an AI reading shows in its row but never writes the summary line.
7. **A part without its own meaning invalidates the whole split.** Per part, not
   per attempt. See section 7.
8. **Every claimed root is verified independently before it is shown.** The
   splitter proposes, `geminiReadings()` decides, and fewer than two survivors
   means no breakdown at all.
9. **Never guess a pronoun on a certificate.** If the gender is not known the
   prompt forbids he, she, him, her, his and hers outright. A guessed pronoun on
   something printed and framed is a real mistake.
10. **A failed lookup throws, it never returns a miss.** A rate limit cached as
    an answer becomes "this name has no meaning" for six months. A definitive
    miss is cached as a sentinel; a transient failure is not cached at all.
11. **A degraded check reports itself as not checked, never as clear.** Absent is
    not the same as clean, and the tiles say which.
12. **Rejecting a bad gloss empties it rather than flagging it.** A kept-but-wrong
    meaning is one careless tick away from being printed.
