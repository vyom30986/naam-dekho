import { chaldean } from "../lib/numerology.js";
import { romanToDevanagari } from "../lib/transliterate.js";
import { NAKSHATRAS, RASHI_NAMES, type Nakshatra } from "../scanners/astro.js";
import { slugify } from "../scripts/name-corpus.js";
import { ctaBlock, esc, renderSeoPage, seoSlug } from "./shell.js";
import type { SeoCtx, SeoDoc } from "./shell.js";

/**
 * The nakshatra cluster — one page per birth star at /nakshatra/<slug>.html.
 *
 * The search this serves is narrow and very high intent: a family has come
 * back from the namkaran with a syllable ("start the name with 'Chu'") and
 * wants names that fit. So the page leads with the four pada syllables, then
 * spends the rest of its length on the only thing that actually helps — the
 * published names that begin with them, grouped by the pada they belong to.
 *
 * Every fact here is either read straight out of NAKSHATRAS or computed from
 * the same 27-fold division of the ecliptic that lib/moon.ts uses for the
 * live birth-star calculation. Nothing is authored. Where the corpus has no
 * name for a pada the page says so, because "no published name starts with
 * dhaa" is true and useful, and a padded list would not be.
 */

type CorpusEntry = SeoCtx["corpus"][number];

/**
 * RULE 2 THRESHOLD — a nakshatra is published only once the corpus carries
 * at least this many names beginning with one of its four syllables.
 *
 * The tempting alternative is to emit all 27 regardless, on the grounds that
 * the pada table and the arc figures are unique per star. They are, but they
 * are also four rows and two numbers; twenty-seven pages differing only in
 * those, sharing the same explanatory paragraph, is precisely the doorway set
 * Google's helpful-content system is built to catch. It would also break
 * rule 4: a page titled "<star> nakshatra baby names" that lists no names has
 * promised something it does not contain.
 *
 * The bar was eight on that reasoning. Measuring the output moved it. Render
 * the set and count words: the thinnest page at eight was 1,002 words, and the
 * thinnest with no bar at all was 1,028. So the name list is not what makes
 * these pages substantial — the padas, the sidereal arcs, the rashi spans and
 * the namkaran explanation are, and those differ per star whatever the corpus
 * holds. Eight was costing eight pages and buying nothing measurable.
 *
 * What survives is the honesty point, and the counts bear it out: two stars,
 * Vishakha and Uttara Bhadrapada, match no published name at all. A page
 * titled "<star> nakshatra baby names" listing none has promised something it
 * does not contain. So the bar is one real name rather than none. It is
 * recomputed every build, so those two publish themselves the moment the
 * corpus covers their syllables.
 */
const MIN_NAMES = 1;

/**
 * A pada listing longer than this stops being a list and starts being a data
 * dump — the pada structure the page exists to explain disappears under it.
 * Names past the cap are not orphaned: each has its own /n/ page, and the
 * /n/ index links every one of them.
 */
const MAX_ROWS_PER_PADA = 40;

/** 360° / 27 = exactly 800 arc-minutes, so every boundary lands on a whole minute. */
const NAK_ARC_MINUTES = 800;
const PADA_ARC_MINUTES = NAK_ARC_MINUTES / 4;

const inr = (n: number) => n.toLocaleString("en-IN");
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** "Mesha (Aries)" → "mesha". The reverse of RASHI_NAMES, so the two clusters
 *  cannot drift onto different URLs for the same sign. */
const RASHI_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(RASHI_NAMES).map(([key, label]) => [label, key]),
);

const rashiHref = (label: string) => `/rashi/${RASHI_SLUG[label] ?? seoSlug(label)}.html`;
/** "Mesha (Aries)" → "Mesha"; the English gloss is kept for the first mention only. */
const rashiShort = (label: string) => label.split(" (")[0];

/**
 * Mirrors normaliseSyllables() in scanners/astro.ts. It is duplicated rather
 * than imported because astro.ts does not export it, and this cluster must not
 * disagree with the live tile: a family that reads "Aarav belongs to Krittika"
 * here and runs the check on the app has to get the same answer.
 */
function normalise(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .replace(/aa/g, "a")
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/ii/g, "i")
    .replace(/uu/g, "u");
}

interface PadaRef {
  nak: number;
  pada: number;
}

/** syllable → the pada(s) that carry it. All 108 are distinct today; the list
 *  form is kept so a future duplicate lists the name under both stars rather
 *  than silently picking one, which is what scanRashi() already does. */
const BY_SYLLABLE = new Map<string, PadaRef[]>();
for (const [nak, nk] of NAKSHATRAS.entries()) {
  nk.padas.forEach((p, pada) => {
    const list = BY_SYLLABLE.get(p.syl) ?? [];
    list.push({ nak, pada });
    BY_SYLLABLE.set(p.syl, list);
  });
}
const LONGEST_SYLLABLE = Math.max(...[...BY_SYLLABLE.keys()].map((s) => s.length));

/** Longest prefix first, so "chha" wins over "cha" — the rule the chakra
 *  lookup in astro.ts applies, reproduced exactly. */
function padasFor(name: string): PadaRef[] {
  const n = normalise(name);
  if (!n) return [];
  for (let len = Math.min(LONGEST_SYLLABLE, n.length); len >= 1; len--) {
    const hit = BY_SYLLABLE.get(n.slice(0, len));
    if (hit) return hit;
  }
  return [];
}

/** Sidereal arc as degrees and minutes, measured from the Lahiri zero point —
 *  the same frame the birth-date calculator reports its longitude in. */
function arc(minutes: number): string {
  return `${Math.floor(minutes / 60)}°${String(minutes % 60).padStart(2, "0")}′`;
}

function nakArc(index: number): string {
  return `${arc(index * NAK_ARC_MINUTES)} – ${arc((index + 1) * NAK_ARC_MINUTES)}`;
}

function padaArc(index: number, pada: number): string {
  const start = index * NAK_ARC_MINUTES + pada * PADA_ARC_MINUTES;
  return `${arc(start)} – ${arc(start + PADA_ARC_MINUTES)}`;
}

/** Consecutive padas sharing a rashi, in pada order. Fourteen nakshatras sit
 *  inside one sign and thirteen straddle a boundary; the copy has to say which. */
function rashiRuns(nak: Nakshatra): Array<{ rashi: string; padas: number[] }> {
  const runs: Array<{ rashi: string; padas: number[] }> = [];
  nak.padas.forEach((p, i) => {
    const last = runs[runs.length - 1];
    if (last && last.rashi === p.rashi) last.padas.push(i + 1);
    else runs.push({ rashi: p.rashi, padas: [i + 1] });
  });
  return runs;
}

function padaPhrase(padas: number[]): string {
  if (padas.length === 1) return `pada ${padas[0]}`;
  if (padas.length === 2) return `padas ${padas[0]} and ${padas[1]}`;
  return `padas ${padas[0]}–${padas[padas.length - 1]}`;
}

function joinList(items: string[], conjunction: "and" | "or"): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} ${conjunction} ${items[items.length - 1]}`;
}
const joinAnd = (items: string[]) => joinList(items, "and");
const joinOr = (items: string[]) => joinList(items, "or");

/** Eight of the 27 begin with a vowel — Ashwini, Ardra, Uttara Ashadha — so the
 *  article has to be chosen, not hardcoded. */
const article = (word: string) => (/^[aeiou]/i.test(word) ? "an" : "a");

/**
 * One pada's names. Gender and meaning become columns only when at least one
 * row has them — an empty column reads as missing data, and a meaning we have
 * not verified is never printed at all.
 */
function namesTable(entries: CorpusEntry[], syllable: string): string {
  const shown = entries.slice(0, MAX_ROWS_PER_PADA);
  const withGender = shown.some((e) => e.gender);
  const withMeaning = shown.some((e) => e.meaning);

  const head = [
    "Name",
    "In Devanagari",
    ...(withGender ? ["Gender"] : []),
    "Chaldean root",
    ...(withMeaning ? ["Meaning"] : []),
  ]
    .map((h) => `<th>${esc(h)}</th>`)
    .join("");

  const rows = shown
    .map((e) => {
      const num = chaldean(e.name);
      // .deva is the page-heading treatment — far too large for a table cell,
      // so the script font is set on the cell itself rather than added to the
      // shared stylesheet.
      const deva = `<td style="font-family:'Noto Sans Devanagari',serif;font-size:17px">${esc(romanToDevanagari(e.name))}</td>`;
      return `        <tr>
          <td><a href="/n/${slugify(e.name)}.html">${esc(e.name)}</a></td>
          ${deva}
          ${withGender ? `<td>${esc(e.gender ?? "—")}</td>` : ""}
          <td class="num">${num.root} · ${esc(num.planet.name)}</td>
          ${withMeaning ? `<td>${e.meaning ? esc(e.meaning) : "—"}</td>` : ""}
        </tr>`;
    })
    .join("\n");

  const overflow =
    entries.length > shown.length
      ? `    <p class="sub" style="margin-top:10px">Showing ${inr(shown.length)} of ${inr(entries.length)} published names beginning with “${esc(cap(syllable))}”. The rest are on the <a href="/n/">full name index</a>.</p>`
      : "";

  return `    <div class="table-scroll">
      <table class="data">
        <thead><tr>${head}</tr></thead>
        <tbody>
${rows}
        </tbody>
      </table>
    </div>
${overflow}`;
}

/**
 * Builds the nakshatra cluster.
 *
 * Two passes on purpose: the published set has to be known before any page is
 * rendered, because the previous/next links walk the ecliptic and must skip
 * the stars that fell below MIN_NAMES. Linking a neighbour the build never
 * wrote would put a 404 on all 27 pages.
 */
export function buildNakshatraPages(ctx: SeoCtx): SeoDoc[] {
  const byPada: CorpusEntry[][][] = NAKSHATRAS.map(() => [[], [], [], []]);
  for (const entry of ctx.corpus) {
    for (const hit of padasFor(entry.name)) byPada[hit.nak][hit.pada].push(entry);
  }

  const total = (index: number) => byPada[index].reduce((sum, list) => sum + list.length, 0);
  const published = NAKSHATRAS.map((_, i) => i).filter((i) => total(i) >= MIN_NAMES);
  if (published.length === 0) return [];

  const slugOf = (index: number) => seoSlug(NAKSHATRAS[index].name);
  const hrefOf = (index: number) => `/nakshatra/${slugOf(index)}.html`;

  /** Walk the 27 in ecliptic order, stopping at the first published star. */
  const step = (from: number, delta: number): number | null => {
    const len = NAKSHATRAS.length;
    for (let n = 1; n < len; n++) {
      const i = (((from + delta * n) % len) + len) % len;
      if (published.includes(i)) return i;
    }
    return null;
  };

  return published.map((index) => {
    const nak = NAKSHATRAS[index];
    const slug = slugOf(index);
    const count = total(index);
    const syllables = nak.padas.map((p) => cap(p.syl));
    const runs = rashiRuns(nak);
    const straddles = runs.length > 1;

    // Kept as a subject-less clause so it can follow either the star's name or
    // a pronoun; the FAQ answer already names the star in its first sentence.
    const spanClause = straddles
      ? `crosses a sign boundary: ${joinAnd(runs.map((r) => `${padaPhrase(r.padas)} ${r.padas.length === 1 ? "falls" : "fall"} in ${rashiShort(r.rashi)}`))}.`
      : `sits wholly inside ${runs[0].rashi}, so all four padas share one moon sign.`;
    const spanSentence = `${nak.name} ${spanClause}`;

    const title = `${nak.name} nakshatra baby names — padas ${syllables.join(", ")} | Naam Dekho`;
    // "one of them", not "those syllables" — on the stars where a pada has no
    // published name the stronger phrasing would be a promise the page breaks.
    const metaDesc = `${nak.name}'s four padas begin with ${joinAnd(syllables)} (${runs.map((r) => rashiShort(r.rashi)).join(", ")}). ${inr(count)} published names that start with one of them, listed with pada, Devanagari and Chaldean root.`;

    // ── Syllable badges ────────────────────────────────────────────
    const badges = nak.padas
      .map(
        (p, i) =>
          `      <span class="syl">${esc(cap(p.syl))}<small>Pada ${i + 1} · ${esc(rashiShort(p.rashi))}</small></span>`,
      )
      .join("\n");

    // ── Pada table ─────────────────────────────────────────────────
    const padaRows = nak.padas
      .map((p, i) => {
        const n = byPada[index][i].length;
        return `        <tr>
          <td class="num">${i + 1}</td>
          <td><strong>${esc(cap(p.syl))}</strong></td>
          <td><a href="${rashiHref(p.rashi)}">${esc(p.rashi)}</a></td>
          <td class="num">${esc(padaArc(index, i))}</td>
          <td class="num">${n > 0 ? `<a href="#pada-${i + 1}">${inr(n)}</a>` : "—"}</td>
        </tr>`;
      })
      .join("\n");

    const emptyPadas = nak.padas.filter((p, i) => byPada[index][i].length === 0);
    // A pada written with a doubled vowel can never be matched, because the
    // matcher folds long vowels onto short ones before comparing. Saying so is
    // better than leaving a reader to wonder whether the corpus is broken.
    const longVowelEmpties = emptyPadas.filter((p) => normalise(p.syl) !== p.syl);
    const emptyNote = emptyPadas.length
      ? `    <p class="note">No published name in our corpus begins with ${joinOr(emptyPadas.map((p) => `“${cap(p.syl)}”`))}.${
          longVowelEmpties.length
            ? ` Our matching folds long vowels onto short ones — Aarav and Arav both read as “A” — so ${joinOr(longVowelEmpties.map((p) => `“${cap(p.syl)}”`))} can only ever be reached by a spelling we do not currently publish.`
            : ""
        }</p>`
      : "";

    // ── Names, grouped by pada ─────────────────────────────────────
    const groups = nak.padas
      .map((p, i) => {
        const entries = byPada[index][i];
        if (entries.length === 0) return "";
        return `    <h3 id="pada-${i + 1}" style="font-family:Fraunces,serif;font-size:19px;font-weight:500;margin:26px 0 4px">Pada ${i + 1} — names beginning with “${esc(cap(p.syl))}”</h3>
    <p class="sub">${esc(padaArc(index, i))} · ${esc(p.rashi)} · ${inr(entries.length)} ${entries.length === 1 ? "name" : "names"}</p>
${namesTable(entries, p.syl)}`;
      })
      .filter(Boolean)
      .join("\n");

    // ── FAQ: rendered once, from one array, so the visible answers and the
    //    FAQPage markup cannot say different things. ─────────────────
    const faqs = [
      {
        q: `Which letter should a baby born under ${nak.name} nakshatra be named with?`,
        a:
          `${nak.name} has four padas and each carries one syllable: ${nak.padas.map((p, i) => `pada ${i + 1} is ${cap(p.syl)}`).join(", ")}. ` +
          `The pada the Moon was in at birth picks one of the four. A pada is ${arc(PADA_ARC_MINUTES)} of the ecliptic — roughly six hours of the Moon's motion — so without a recorded birth time the pada is often uncertain, and families then choose from all four syllables.`,
      },
      {
        q: `Which rashi does ${nak.name} nakshatra belong to?`,
        a: `${nak.name} spans ${nakArc(index)} of the sidereal zodiac. It ${spanClause}`,
      },
      {
        q: `Does the name have to start with the pada syllable?`,
        a: `No. It is a convention, not a rule. The janam kundli is the authority for the birth star; the syllable is what the tradition derives from it, and plenty of families use it as a shortlist rather than a constraint. A name outside these four syllables is not an incorrect name.`,
      },
      {
        q: `How many names on this page begin with ${article(nak.name)} ${nak.name} syllable?`,
        a: `${inr(count)}, out of the names Naam Dekho publishes. Each one is listed under the pada whose syllable it starts with, with its Devanagari spelling and its Chaldean root number. The list grows as the corpus does.`,
      },
    ];

    const faqHtml = faqs
      .map(
        (f) => `    <h3 style="font-family:Fraunces,serif;font-size:18px;font-weight:500;margin:22px 0 2px">${esc(f.q)}</h3>
    <p>${esc(f.a)}</p>`,
      )
      .join("\n");

    // ── Internal links ─────────────────────────────────────────────
    const prev = step(index, -1);
    const next = step(index, 1);
    const neighbours = [
      prev !== null
        ? `<a href="${hrefOf(prev)}">← ${esc(NAKSHATRAS[prev].name)} · ${esc(nakArc(prev))}</a>`
        : "",
      next !== null
        ? `<a href="${hrefOf(next)}">${esc(NAKSHATRAS[next].name)} · ${esc(nakArc(next))} →</a>`
        : "",
    ]
      .filter(Boolean)
      .join("\n        ");

    const siblings = published
      .filter((i) => i !== index)
      .map(
        (i) =>
          `<a href="${hrefOf(i)}">${esc(NAKSHATRAS[i].name)}<br /><span style="color:var(--ink-3);font-size:12px">${esc(NAKSHATRAS[i].padas.map((p) => cap(p.syl)).join(" · "))}</span></a>`,
      )
      .join("\n        ");

    const rashiLinks = runs
      .map((r) => `<a href="${rashiHref(r.rashi)}">${esc(r.rashi)} names</a>`)
      .join("\n        ");

    // A handful of the listed names, linked as pages rather than table cells,
    // so the cluster feeds the /n/ pages from the body copy too.
    const sampleNames = nak.padas
      .flatMap((_, i) => byPada[index][i].slice(0, 3))
      .slice(0, 9)
      .map((e) => `<a href="/n/${slugify(e.name)}.html">${esc(e.name)}</a>`)
      .join("\n        ");

    const body = `  <h1>${esc(nak.name)} nakshatra</h1>
  <p class="lede">${esc(nak.symbol)} The four padas of ${esc(nak.name)} start with ${esc(joinAnd(syllables))}. Below are the ${inr(count)} published names that begin with one of them, grouped by the pada each one belongs to.</p>

  <div class="tags">
    <span class="tag">Nakshatra ${index + 1} of 27</span>
    <span class="tag">${esc(nakArc(index))}</span>
    <span class="tag">${esc(runs.map((r) => rashiShort(r.rashi)).join(" + "))}</span>
    <span class="tag">${inr(count)} names</span>
  </div>

  <section>
    <h2>The four pada syllables</h2>
    <p class="sub">The sound a family is given at the namkaran, one per quarter of the star.</p>
    <div class="syls">
${badges}
    </div>
  </section>

  <section>
    <h2>Padas, signs and arcs</h2>
    <p class="sub">Each pada is a quarter of ${esc(nak.name)} — ${esc(arc(PADA_ARC_MINUTES))} of sidereal longitude.</p>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>Pada</th><th>Syllable</th><th>Rashi</th><th>Sidereal arc</th><th>Names here</th></tr></thead>
        <tbody>
${padaRows}
        </tbody>
      </table>
    </div>
${emptyNote}
  </section>

  <section class="prose">
    <h2>Why a pandit gives you a letter, not a name</h2>
    <p>At a namkaran the family is usually handed a syllable and left to find the name themselves. The pandit reads the Moon's position from the janam kundli, which fixes the birth nakshatra and then, more finely, which quarter of it the Moon occupied. Those quarters are the padas: ${esc(arc(PADA_ARC_MINUTES))} of sky each, ${esc(nak.name)}'s four running from ${esc(nakArc(index))}. Each pada carries one syllable, and the child's name traditionally begins with it. ${esc(spanSentence)}</p>
    <p>The convention is old and practical. A syllable is a constraint the whole family can work inside — grandparents, parents and a priest can all agree on “start with ${esc(syllables[0])}” long before anyone agrees on a name. It also keeps the name tied to the chart rather than to fashion, which is the point of the ceremony.</p>
    <p class="note">This page runs the table backwards, which is the direction that helps once you already have a name in mind: it lists published names that start with ${esc(nak.name)}'s syllables. It cannot tell you a child's nakshatra — only the birth date, and ideally the birth time, can do that. Enter them on the <a href="/">name check</a> and we calculate the Moon's actual position instead of reading the name.</p>
  </section>

  <section>
    <h2>${inr(count)} names under ${esc(nak.name)}</h2>
    <p class="sub">Chaldean root numbers and Devanagari spellings are computed by our own engines. A meaning is shown only where we have verified one.</p>
${groups}
  </section>

  <section class="prose">
    <h2>Questions families ask</h2>
${faqHtml}
  </section>

${ctaBlock(
  `Using one of these names for a business too?`,
  `Run a live check across domains, social handles, marketplaces, the MCA company register and all 45 trademark classes.`,
)}

${
  // A heading over an empty chip row is the hollow block rule 2 is about. On a
  // one-star build there is no neighbour to point at, so the section goes.
  neighbours
    ? `  <section>
    <h2>Along the ecliptic</h2>
    <p class="sub">The stars either side of ${esc(nak.name)}.</p>
    <div class="related">
        ${neighbours}
    </div>
  </section>
`
    : ""
}
  <section>
    <h2>${esc(rashiShort(runs[0].rashi))} and the other nakshatras</h2>
    <p class="sub">${esc(straddles ? `${nak.name} is shared between two signs, so both listings include it.` : `Every nakshatra in ${rashiShort(runs[0].rashi)} feeds the same moon sign.`)}</p>
    <div class="related">
        ${rashiLinks}
        <a href="/n/">All published names</a>
    </div>
  </section>

${
  siblings
    ? `  <section>
    <h2>Other nakshatras</h2>
    <p class="sub">Each with its four pada syllables.</p>
    <div class="grid-links">
        ${siblings}
    </div>
  </section>
`
    : ""
}
  <section>
    <h2>Name pages from this star</h2>
    <p class="sub">Each one carries the name in ten Indian scripts, its numerology and its short forms.</p>
    <div class="related">
        ${sampleNames}
    </div>
  </section>`;

    const listed = nak.padas.flatMap((_, i) => byPada[index][i].slice(0, MAX_ROWS_PER_PADA));

    const jsonLd = [
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `Baby names beginning with ${article(nak.name)} ${nak.name} nakshatra pada syllable`,
        numberOfItems: listed.length,
        itemListElement: listed.map((e, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: e.name,
          url: `${ctx.siteOrigin}/n/${slugify(e.name)}.html`,
        })),
      },
    ];

    return {
      path: `/nakshatra/${slug}.html`,
      html: renderSeoPage({
        title,
        metaDesc,
        path: `/nakshatra/${slug}.html`,
        siteOrigin: ctx.siteOrigin,
        // The cluster deliberately ships no /nakshatra/ index — a breadcrumb
        // must never point at a page the build does not write, so the parent
        // is the name index, which does exist and does list every name here.
        crumbs: [
          { label: "Home", href: "/" },
          { label: "Names", href: "/n/" },
          { label: `${nak.name} nakshatra` },
        ],
        jsonLd,
        body,
      }),
      priority: "0.8",
      changefreq: "monthly",
    };
  });
}
