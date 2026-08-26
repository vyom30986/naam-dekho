# The Shortlist of Five — certificate design

**Date:** 22 August 2026
**Status:** approved by the founder, not yet implemented
**Price:** 1,000 tokens (`pricing.addons.shortlist`, already defined)
**Kill switch:** `complete-set` (already in `FEATURE_IDS`; nothing reads it yet)

---

## 1. What this is

A two-page PDF that records how a family named their child: the name
they finally chose, everything behind it, and the four or five names they had
been considering.

The founder's framing, which the whole design serves:

> The certificate is like a flourish. Usually, people like to flex how they
> named their child: what were the potential names they were looking for? Why
> did they leave that name and everything? Because in India, the naming
> ceremony is very, very big.

It is **not** a decision aid. It is retrospective — it presupposes a decision
already made, and it celebrates it. That distinction decides every layout
question below: there is no scorecard, no ranking, and no winner badge, because
by the time this document exists the winner is simply the name on page one.

### The one rule about the names that were dropped

**The certificate never says why a name was set aside.** Founder's decision, 22
Aug 2026. We do not know the family's real reasons, and guessing at them in
print — "did not carry the star's syllable" — would put words in their mouth at
a ceremony. The dropped names appear with their meanings and their readings, in
the parent's order, and nothing more.

### The one rule about unfortunate meanings

**The certificate says nothing about them and shows only the good meanings.**
Founder's decision, 22 Aug 2026, taken with the risk stated: when the final name
differs from the name that was searched, it will never have been through the
seven-language landmine dictionary, so the family may never have been told at
all.

This is the same good-parts-only rule the single-name certificate already
follows, and it is why the certificate is sold behind the naming report rather
than on its own.

The rule does not license hiding the check. Step 2 of the flow runs the full
baby check set on the final name because page 1 needs its meaning, numerology
and birth star; those results render on screen the way any other check does.
What the rule governs is the **printed sheet**, which stays positive.

---

## 2. The flow

Entered from the shortlist tile (`b-alt`) on a paid baby scan, which is already
live as of 22 Aug 2026.

```
  [ Create the certificate of five — 1,000 tokens ]
              │
              ▼
  ① Which name did you finally choose?
      pre-filled with the searched name
      ┌───────────────────────────────────────┐
      │  Is this the one?     ● Aarav         │
      │  Or the name you chose: [___________] │
      └───────────────────────────────────────┘
      if changed → run the baby checks on it (page 1 needs the data)
              │
              ▼
  ② The names you considered
      ┌───────────────────────────────────────┐
      │  ○ I'll type them  (4–5 fields)       │
      │  ○ Suggest names closer to this       │
      │      from the date of birth, the      │
      │      nakshatra, the numerology, and   │
      │      the first akshar if you have one │
      └───────────────────────────────────────┘
              │
              ▼
  ③ Edit anything
      every name in a text field, ours or theirs,
      because the AI's suggestions may not be wanted
              │
              ▼
  ④ Generate → debit 1,000 → render on screen → Download as PDF
```

### Step 1 — the final name

Pre-filled with the searched name because it usually *is* the chosen one. If the
parent types a different name it is normalised and checked exactly like a
searched name: `scanLinguistic`, `scanNumerology`, `scanRashi`, `scanNicknames`,
`scanPronunciation`. Without that run there is no meaning, no root and no birth
star to print.

### Step 2 — the considered names

Two doors, mirroring the shortlist tile that already exists:

- **Their own.** Four or five text fields. Fewer is fine — a family that
  considered two names gets two on the certificate, not two padded out with our
  inventions.
- **Ours.** `suggestBabyNames()` in `lib/baby-alternatives.ts`, which already
  takes the birth-star syllables, the nakshatra, the Chaldean root, the gender
  and the sibling name.

**New input: the first akshar.** In practice the starting syllable is often
given by a pandit rather than derived from a table. Today the only source is our
own Avakahada reverse lookup. The parent may type the akshar they were given,
and it takes precedence over the derived syllables when generating.

*Open placement question, resolved:* the akshar input lives in **this flow**,
not in the search form. The search form already asks for date of birth, time,
gender and a sibling's name, and a fifth optional field there would tax every
free search for the benefit of one paid document.

### Step 3 — editing

Every name is editable before generation, whoever produced it. A name the parent
edits is re-verified before it reaches the sheet, so an edited name cannot
arrive on the certificate with the previous name's meaning attached to it.

### Step 4 — generation

Debit 1,000 tokens through the same path the Deep Search uses, then render. The
document is generated fresh from stored data on every request and never stored
as a file, exactly like the single-name certificate.

---

## 3. The document

A4 portrait, the same paper, palette, type and geometry as the single-name
certificate, so the two read as one family of objects. Reused wholesale from
`src/pdf/certificate.ts`: the sheet shell, the dashed inner border, the sparkle
layer, the nine-wedge wheel, the `.facts` row, and the embedded logo from
`src/brand/logo.ts`.

### Page 1 · The name

A title page. The name, the passage, the wheel, and the three facts.

| Element | Source |
|---|---|
| The chosen name, large, with Devanagari beneath | `certificate-data.ts` |
| **A passage of about 150 words** | new `certificateEssay()`, verified meanings only |
| The nine-wedge numerology wheel — root, compound, ruling planet | `chaldean()` |
| Born under — nakshatra, symbol, rashi, pada, **first akshar** | `scanRashi` detail |
| Said as, and the short forms it will take at home | `scanPronunciation`, `scanNicknames` |

### Page 2 · Across India, and the names considered

The ten scripts, set large and properly — not the small pill row page 1 of the
single-name certificate uses. Beneath them a per-language reading: the language,
the name in its own script, and the meaning.

**Only languages with a good meaning appear.** That is what makes the page's
premise — "and all of them are good" — a true statement rather than a claim.

**The per-language table was cut, 22 Aug 2026.** Drawing it exposed the flaw the
founder named: for a name like Aarav the meaning is the same everywhere, so the
table printed four rows all saying "peaceful" in slightly different words. In
its place:

- a pull-quote of the shared meaning — *"Peaceful, and calm."* — and beneath it,
  in small caps, the languages that agree;
- a language earns its own line only when its meaning genuinely **differs**.

The paragraph on page 1 now does the work the table was failing to do, which was
the founder's instruction: not to show how the meaning holds or shifts across
languages, but to say it beautifully.

**Settled by drawing it, 22 Aug 2026.** The first draft was three pages and the
content did not fill them — page 2 was 45% empty even for Aarav, a well-known
name with five confirmed languages, and most names carry three or four. The
founder chose two pages over adding written material to fill a third.

So page 2 carries the scripts, the language readings AND the names considered.
It fits, but only just: the cards, the table rows and the script tiles are all
set tighter than page 1's. A sixth considered name would not fit, which is why
five is a hard cap rather than a convention.

### On page 2 · The reading in full

Three cards carrying figures the engines already compute and which neither
certificate has ever printed: the **compound number** and what it signifies (not
just the root it reduces to), how **easily the name is said** out of ten, and the
**pada** with its ruling lord. Added 22 Aug 2026, after the founder observed that
the draft was showing far less than the backend knows.

### On page 2, below a rule · The names we considered

The four or five, in the parent's order, each with:

- the name and its Devanagari
- its meaning, where one is confirmed
- its Chaldean root and ruling planet
- whether it carried the birth star's syllable

No reasons. No ranking. No winner marked — the winner had page one.

Closing line and the mark, bottom right.

The page is full at five names. There is no room for a sixth.

---

## 4. What has to be built underneath

| # | Work | Why it blocks |
|---|---|---|
| 1 | **Persist the shortlist and the final name** | Nothing remembers them today. The response is recomputed per request and the frontend holds it only in React `altData`, which `startScan` wipes. A PDF "regarding those five names" cannot exist until they are stored. A `scan_results` row under tile id `b-alt` needs no migration — `detail` is already `jsonb`. |
| 2 | **Check the final name** when it differs from the searched one | Page 1 has no content otherwise. |
| 3 | **`certificateEssay()`** — a ~150-word passage, distinct from the 2–3 sentence `certificateProse()` the single-name certificate uses. Must be told the child's gender, or told to stay neutral: the first live run wrote "his" unprompted. |
| 3b | **The certificate renderer** — a two-page sibling of `certificate.ts` | The document itself. |
| 4 | **Ownership check** on the alternatives and certificate routes | `POST /scans/:id/alternatives` never reads `req.userId`; anyone holding a scan id can call it. Harmless while free — it is a way to spend someone else's tokens the moment a 1,000-token button attaches. **Must land before the debit does.** |
| 5 | **Read the `complete-set` flag**, and give it an admin route | `setDisabledFeatures()` has no callers and `admin.ts` has no features endpoint, so the founder can switch off individual scanners but not this. A live AI feature on a paid page with no kill switch. |
| 6 | **The first-akshar input** | New field, new precedence rule in `suggestBabyNames`. |

### Not in scope

- Persisting `gender` on the scan record. The UI sends it, `submitSchema`
  strips it, and the shortlist call now carries it directly instead. Making the
  scan itself remember it needs a migration and buys this document nothing.
- Storing the PDF as a file. Both certificates are rendered HTML the browser
  prints, which is why no renderer is installed on the server.
- Razorpay. Tokens are internal until it is connected; this document is
  purchasable only in the sense that the balance moves.

---

## 5. Failure modes

| When | What the parent sees |
|---|---|
| Fewer than four good-meaning languages | A two-page document. No empty page, no apology. |
| The suggestion generator returns nothing (Gemini down or rate-limited) | "We could not put five together just now. Nothing was charged — try again, or enter your own." The debit happens at generation, not at suggestion. |
| The parent enters only two considered names | Two on page 3. Never padded. |
| The final name cannot be normalised | The field rejects it inline, before any charge. |
| `complete-set` switched off | 503 `feature_off`, the same shape the keepsake route already returns. |

---

## 6. Testing

- **The good-parts rule holds.** Given a name with a `bad` landmine grade in one
  language, the rendered sheet contains neither that language nor that meaning.
- **No reason ever reaches the sheet.** Given dropped names, the HTML contains
  no "because", no "dropped", no "instead of".
- **Page 2 never overflows.** Five considered names plus ten scripts plus six
  language rows still fit inside 297mm. This is the tightest constraint in the
  document and the one a careless copy change will break first.
- **An edited name is re-verified.** Changing a name after generation of the
  suggestions changes the meaning printed beside it.
- **The debit is once.** Two rapid clicks on Generate debit 1,000 once.
- **Ownership.** A scan id belonging to another user returns 403, not a document.
