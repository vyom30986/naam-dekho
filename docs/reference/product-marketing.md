# Product Marketing Context — Naam Dekho

*Last updated: 3 August 2026 · Drafted from the codebase, PRD v2, and live competitor research. **Founder review needed** — sections marked ⚠️ are my inference, not your stated position.*

---

## Product Overview

**One-liner:** One search tells you whether a name is actually free — legally, digitally, and culturally — across India.

**What it does:** Runs 26 checks in parallel against Indian legal registries (MCA21, IP India trademark, GST), every major domain ending, social handles, app stores and marketplaces, brand/search collision, and a linguistic layer that catches what a name means in 10 Indian languages. Returns a verdict in ~90 seconds, an evidence report for your lawyer, and five verified alternatives when your first choice is blocked.

**Product category:** Name verification / brand-availability search. Customers currently find this shelf by searching *"company name check India"*, *"trademark search"*, *"is this username taken"*, or *"baby name meaning"* — four different shelves, which is a positioning problem (see Risks).

**Product type:** Self-serve web app, freemium, no login required for the free tier.

**Business model:**
- Free forever: 22 checks, unlimited searches
- ₹50: Deep Search — adds MCA21, IP India TM (45 classes), Amazon, Flipkart, evidence PDF, 5 verified alternatives
- ₹500: 12 credits, 90-day expiry (₹42/search)
- Parents: ₹29 Keepsake PDF · ₹99 Shortlist of Five
- Agencies: from ₹9,999/month (Phase 2)
- ~₹5–7 variable cost per paid search → ~86% gross margin

---

## Target Audience

**Two distinct markets sharing one engine:**

| | Founder | Parent |
|---|---|---|
| Who | 25–40, incorporating a Pvt Ltd or LLP | 25–45, namkaran within 10–45 days |
| Trigger | About to file with MCA21 or buy a domain | Ceremony date approaching |
| Emotion | Fear of a ₹2L rebrand or a legal notice | Fear of getting a permanent decision wrong |
| Willingness to pay | High — ₹50 is <1% of incorporation cost | Moderate — emotional, not rational |
| Frequency | 1–5 names, once in a company's life | 5–20 names, once or twice in a life |

**Jobs to be done:**
1. *"Tell me before I spend money whether this name will blow up in my face."*
2. *"Give me something I can forward to my CA/lawyer/family that settles the argument."*
3. *"If this name is dead, give me one that isn't — without starting over."*

⚠️ **Both markets are one-time-purchase.** Neither persona has a reason to come back next month. This is the single most important commercial fact about the product (see Risks).

---

## Problems & Pain Points

**Core problem:** Verification is scattered across a dozen government portals and platforms that don't talk to each other. Founders reportedly spend 2–3 hours across 10–15 tabs and still miss things — most commonly a trademark filed in a class they didn't think to check.

**Why alternatives fall short:**
- Government portals (mca.gov.in, IP India) are free but slow, ugly, CAPTCHA-gated, and check one thing each
- Global tools (Namechk, KnowEm) check 100–500 handles but know nothing about Indian law
- Legal marketplaces (Vakilsearch, IndiaFilings) check Indian law free — but as a lead magnet for a ₹6,000–20,000 filing package, so the "advice" has a sales motive
- Nobody at all checks what the name *means* in Bengali or Tamil

**What it costs them:** A rebrand after incorporation runs ₹1–3L (new filings, domain buyback, reprinting, lost SEO). A trademark objection can cost more.

**Emotional tension:** *"I've already told everyone the name."* Founders and parents both fall in love with a name before they check it — so the real product is permission to keep it, or a soft landing if they can't.

---

## Competitive Landscape

### Direct — global name aggregators
**Namechk** (free, 100+ platforms, 30+ TLDs) · **KnowEm** (500+ networks, USPTO trademark, paid registration service) · **Namecheckr** (free, social-focused)
→ *Fall short:* zero Indian legal coverage, zero linguistic/cultural layer, US-centric trademark data. **But they are free and broader than us on handles** — we cannot win on breadth of social checks.

### Direct — Indian legal marketplaces ⚠️ **the real threat**
**Vakilsearch**, **IndiaFilings**, **Company Vakil**, **QuickCompany**
→ All four offer **free MCA21 company-name search and free IP India trademark search** — the exact two checks behind our ₹50 paywall. They give it away to capture leads for incorporation and TM filing.
→ *Fall short:* the search is bait, not the product — results push you into a sales funnel; no domains, no handles, no linguistic layer; no consolidated evidence report.

### Secondary — the government itself
mca.gov.in name search, tmrsearch.ipindia.gov.in — free, authoritative, and painful.
→ *Fall short:* one check each, CAPTCHAs, no interpretation, no record you can hand to anyone.

### Indirect
The CA or company secretary who "will check for you" · the family WhatsApp group · a pandit for the baby name · simply not checking and hoping.

---

## Differentiation

**What genuinely nobody else has:**
1. **The linguistic landmine layer** — meaning across 10 Indian languages + a curated 7-language negative-connotation dictionary. No competitor on earth ships this.
2. **Chaldean numerology** — culturally load-bearing for a large share of Indian founders and nearly all namkaran decisions. Zero Western competitors would ever build it.
3. **Legal + digital + cultural in one verdict** — Vakilsearch has legal, Namechk has digital, nobody has all three plus culture.
4. **No conflict of interest** — we don't sell incorporation, so the verdict has no upsell attached.
5. **Baby-name mode** — an entire second market with no incumbent doing verification at all.

**What is NOT a differentiator (be honest in copy):** access to MCA21 or trademark data. It's public and free. We sell *aggregation, interpretation, and honesty* — not exclusive data.

---

## ⚠️ Strategic Risks — read this section twice

**1. The ₹50 tier is paywalled on the wrong things.**
MCA21 and IP India are the headline paid features, and Vakilsearch gives both away free. A price-aware founder who discovers that will feel cheated. Meanwhile the genuinely unique assets — the linguistic landmine layer and numerology — are currently **free**. The value ladder is upside down.
*Options:* keep legal checks free as the hook and charge for the **evidence report + verified alternatives + bundle** (the things with real marginal cost and real convenience value); or charge for depth (all 45 TM classes, historical filings) while showing a basic legal result free.

**2. Both personas are one-time buyers.** No natural repeat purchase → CAC must be recovered on a single ₹50 transaction. At the PRD's ₹120 CAC target, a single ₹50 sale is loss-making; the ₹500 bundle and the agency tier are not optional extras, they're the actual business.

**3. Category confusion.** "Startup name checker" and "baby name checker" are different SEO universes, different ad accounts, different landing pages. Running both from one homepage will underperform both. The mode switcher is elegant product design and probably poor go-to-market.

**4. Free tier is generous to a fault.** 22 checks free, unlimited, no login. The conversion trigger is thin: a founder who sees .com taken and handles free may simply leave satisfied.

**⭐ The overlooked asset:** Baby-name mode has **no free competitor at all**. Parents cannot get "what does this name mean in Bengali, and is it unfortunate" anywhere. It's emotional, deadline-driven (namkaran date), shareable (keepsake PDF → WhatsApp → family), and has no Vakilsearch giving it away. It may be the stronger business even though the PRD treats it as secondary.

---

## Objections

| Objection | Response |
|---|---|
| *"MCA and trademark search are free on the government site."* | True — and they take two hours across two portals with CAPTCHAs, cover one thing each, and give you nothing to hand your lawyer. We do 26 checks in 90 seconds with an evidence trail. |
| *"Vakilsearch checks my name free."* | They do — to sell you a ₹15,000 incorporation package. We have nothing else to sell you, so the verdict is the product, not the bait. |
| *"How do I know your data is current?"* | Every finding carries the source link and a timestamp. Where a source is down, we say "pending" instead of guessing. |
| *"₹50 for a search?"* | It's under 1% of what incorporation costs, and roughly 0.03% of what a rebrand costs. |

**Anti-persona:** Businesses that don't need a distinctive name (local services, B2B contract manufacturers); anyone who has already incorporated (too late to matter); people wanting legal advice rather than a signal — we are explicitly not a law firm.

---

## Switching Dynamics (JTBD Four Forces)

- **Push:** Ten browser tabs, government CAPTCHAs, the nagging fear of the one class they didn't check.
- **Pull:** One box, 90 seconds, a verdict — plus alternatives when the answer is bad.
- **Habit:** "My CA will handle it" · "I'll just Google it" · "the pandit decides the name."
- **Anxiety:** *"Is this as reliable as the government site?"* — which is why every tile showing its source link matters more than it seems, and why honest "pending" beats a confident guess.

---

## Customer Language

**Use:** *name check · already taken · trademark conflict · before you file · rebrand cost · what it means in [language] · namkaran · shubh · handle available*
**Avoid:** *SaaS · platform · connector · scan tier · API · verdict score* (internal words that mean nothing to a founder), and never *"legal advice"* or *"guaranteed"* — both are legally dangerous.

**Verbatim phrases worth testing in copy:** *"poora desh, ek check"* (already in your hero — strong), *"before you file"*, *"the name they'll carry for life."*

⚠️ **No real customer language captured yet** — this section is inferred from the PRD. Ten founder interviews and five parent interviews would replace guesses with quotes and is the highest-leverage marketing work available right now.

---

## Brand Voice

**Tone:** Warm, plain-spoken, quietly authoritative. Indian without being kitsch.
**Style:** Direct sentences, no jargon, honest about limits. Hinglish used sparingly for warmth, never for cuteness.
**Personality:** Trustworthy · Thorough · Unpretentious · Culturally fluent · Calm
**Design language already committed:** warm paper (#FAF8F3), rust accent (#B8501C), editorial serif (Fraunces), Devanagari alongside Latin — evokes an Indian paper document, not sterile SaaS. This is a genuine asset; competitors all look like generic tools.

---

## Proof Points

**Available today:** 26 checks · ~90-second verdict · ~₹0 cost per free search · 10-language meaning check · 7-language landmine dictionary · every finding source-linked and timestamped.
**Not available yet:** customers, testimonials, logos, case studies, conversion data.
**First proof to manufacture:** a public "names we saved people from" post — anonymised real conflicts the tool caught. Costs nothing, proves everything.

---

## Goals

**Business goal (PRD):** ₹5L monthly gross revenue by end of Q2; 5,000 weekly active searches; 4% free→paid conversion; 30% bundle attach.
**Key conversion action:** Free search → "Unlock for ₹50".
**Current metrics:** none — pre-launch, zero users.

⚠️ **Reality check on 4% conversion:** that's a healthy freemium rate for a product with a strong paywall. With 22 free checks and the paid checks available free elsewhere, 1–2% is the more honest planning assumption. Build the model at 1.5% and be delighted at 4%.

---

## Recommended next moves (my view, not yet your decision)

1. **Talk to 10 founders and 5 parents before launch.** Every ⚠️ in this document dissolves with real interviews.
2. **Re-examine the paywall line** — consider free legal basics, paid evidence report + alternatives + depth.
3. **Split the landing pages** — `/startup-name-check` and `/baby-name-check` as separate SEO entrances, one shared engine behind them.
4. **Treat baby mode as a co-equal business**, not Phase 2 — it's the half with no free competitor.
5. **Lead with what only you have:** "the only name check that tells you what it means in Bengali."

---

### Sources
- [Vakilsearch — free MCA company name search](https://company.vakilsearch.com/) · [Vakilsearch trademark search](https://trademarks.vakilsearch.com/)
- [IndiaFilings — free trademark search](https://www.indiafilings.com/trademark/search)
- [Company Vakil — free ROC + TM search](https://www.companyvakil.com/) · [QuickCompany](https://www.quickcompany.in/trademarks)
- [Namechk](https://namechk.com/) · [KnowEm](https://knowem.com/) · [Namecheckr](https://www.namecheckr.com/)
