import {
  COMPOUND_MEANINGS,
  INDUSTRY_FIT,
  LUCKY_DOB_SUMS,
  RULING_PLANET,
  chaldean,
} from "../lib/numerology.js";
import { romanToDevanagari } from "../lib/transliterate.js";
import { NAKSHATRAS } from "../scanners/astro.js";
import { slugify } from "../scripts/name-corpus.js";
import { ctaBlock, esc, renderSeoPage, seoSlug } from "./shell.js";
import type { SeoCtx, SeoDoc } from "./shell.js";

/**
 * The numerology cluster — one page per Chaldean root number at
 * /numerology/number-<n>.html, plus the hub at /numerology/index.html.
 *
 * These pages are the only place on the site where the engine behind a whole
 * tile of the report is written out in full: the letter values, the compound
 * readings, the industry table and the date table printed here are the actual
 * constants lib/numerology.ts computes on, not a paraphrase of them. A reader
 * can reproduce every number we publish with a pen. That is the argument the
 * product rests on — the reading is arithmetic over a fixed table, so it is
 * checkable, and anything not checkable does not go on the page.
 *
 * The corpus sections are recomputed with chaldean() on every build, so a name
 * added to the corpus files itself under the right root without an edit here,
 * and can never be listed under a number the live scan disagrees with.
 */

type CorpusEntry = SeoCtx["corpus"][number];

/**
 * RULE 2 THRESHOLD — a number page publishes only once the corpus carries at
 * least this many names whose Chaldean root is that number.
 *
 * The template is not the thin part here, which is why the bar is lower than
 * the nakshatra cluster's. The ruling planet, the two or three compound
 * readings, the six industry judgements and the dozen-odd harmonious dates all
 * differ across the nine, and they are precisely what "Chaldean numerology 5
 * meaning" is asking for. What a small corpus costs is the half of the page
 * that cannot be copied out of a reference book: the published names that
 * genuinely add to the number, and the worked example drawn from them. Below
 * five names the example is not a choice but the only candidate, the
 * Pythagorean-agreement figure is a coin toss reported as a finding, and the
 * names table is shorter than the compound table sitting above it. At that
 * point the page is a signpost to the hub, and the hub is where the reader
 * should have landed in the first place.
 *
 * Recomputed every build, so a number publishes itself the moment the corpus
 * reaches the bar; nothing has to be remembered and switched on.
 */
const MIN_CORPUS_NAMES = 5;

/**
 * Rows before the names table stops being something a person reads. Names past
 * the cap are not orphaned — each has its own /n/ page and the /n/ index links
 * every one of them.
 */
const MAX_NAME_ROWS = 60;

/**
 * Mirrors MIN_NAMES in seo/nakshatra.ts. Duplicated because that cluster owns
 * its own publication rule and does not export it, and this cluster must not
 * link a star page the build never wrote. If the two ever drift, this cluster
 * links fewer stars than exist, which is a smaller failure than a 404 on nine
 * pages.
 */
const NAK_MIN_NAMES = 1;

const inr = (n: number) => n.toLocaleString("en-IN");

const ROOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

const numberPath = (root: number) => `/numerology/number-${root}.html`;
const HUB_PATH = "/numerology/index.html";
const nakshatraPath = (name: string) => `/nakshatra/${seoSlug(name)}.html`;

/** Prose lists — "media, trade and transit", not a CSV. */
const listJoin = (parts: string[], conjunction: "and" | "or" = "and") =>
  parts.length <= 1
    ? (parts[0] ?? "")
    : `${parts.slice(0, -1).join(", ")} ${conjunction} ${parts[parts.length - 1]}`;

/**
 * Table labels dropped into the middle of a sentence.
 *
 * A blanket toLowerCase() turns "SaaS / Tech" into "saas / tech" and "Royal
 * Star of the Lion" into something that no longer looks like the name of a
 * reading. So a label is lowered only when its capitals are nothing more than
 * a sentence-initial capital; anything carrying internal capitals is left as
 * its table wrote it.
 */
function softLower(label: string): string {
  const sentenceCased = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
  return label === sentenceCased ? label.toLowerCase() : label;
}

/**
 * The same reduction chaldean() applies, needed here for totals that never
 * pass through a name — compound numbers read off the table, and dates.
 */
function digitRoot(n: number): number {
  let r = n;
  while (r > 9) {
    r = r
      .toString()
      .split("")
      .reduce((a, b) => a + Number(b), 0);
  }
  return r;
}

/** Every step of the reduction, spelled out, so the page can show its working
 *  rather than assert a result. A long name can need two passes (99 → 18 → 9). */
function reductionChain(compound: number): string[] {
  const steps: string[] = [];
  let n = compound;
  while (n > 9) {
    const digits = n.toString().split("");
    const next = digits.reduce((a, b) => a + Number(b), 0);
    steps.push(`${n} → ${digits.join(" + ")} = ${next}`);
    n = next;
  }
  return steps;
}

/** Totals the tradition documents, read off the table rather than hardcoded as
 *  10–34, so a new entry in COMPOUND_MEANINGS appears without an edit here. */
const DOCUMENTED_COMPOUNDS = Object.keys(COMPOUND_MEANINGS)
  .map(Number)
  .sort((a, b) => a - b);
const LOWEST_DOCUMENTED = DOCUMENTED_COMPOUNDS[0];
const HIGHEST_DOCUMENTED = DOCUMENTED_COMPOUNDS[DOCUMENTED_COMPOUNDS.length - 1];

const compoundsForRoot = (root: number) => DOCUMENTED_COMPOUNDS.filter((c) => digitRoot(c) === root);

/** "Wheel of Fortune — honour, will-power…" → "Wheel of Fortune". The full line
 *  is prose; a table cell needs the name of the reading only. */
const compoundHead = (compound: number) => (COMPOUND_MEANINGS[compound] ?? "").split(" — ")[0];

/** Dates of the month whose digits reduce to `sum`. February and the 31-day
 *  months differ in length, but the reduction is on the date alone, so 1–31 is
 *  the complete set. */
const datesReducingTo = (sum: number) =>
  Array.from({ length: 31 }, (_, i) => i + 1).filter((d) => digitRoot(d) === sum);

/**
 * The Pythagorean letter values — A=1 through I=9, then round again.
 *
 * This is the one table on these pages that the product does not compute with,
 * and it lives here rather than in lib/numerology.ts for exactly that reason:
 * nothing in the scan may accidentally read from it. It is here because the
 * commonest question a reader arrives with is why a different calculator gave
 * their name a different number, and that question cannot be answered honestly
 * without showing the other system's arithmetic beside ours.
 */
const PYTHAGOREAN_MAP: Record<string, number> = (() => {
  const m: Record<string, number> = {};
  const fill = (chars: string, digit: number) => {
    for (const c of chars) m[c] = digit;
  };
  fill("AJS", 1);
  fill("BKT", 2);
  fill("CLU", 3);
  fill("DMV", 4);
  fill("ENW", 5);
  fill("FOX", 6);
  fill("GPY", 7);
  fill("HQZ", 8);
  fill("IR", 9);
  return m;
})();

function pythagorean(name: string): { letters: string[]; digits: number[]; compound: number; root: number } {
  const letters = name.toUpperCase().replace(/[^A-Z]/g, "").split("");
  const digits = letters.map((c) => PYTHAGOREAN_MAP[c] ?? 0);
  const compound = digits.reduce((a, b) => a + b, 0);
  return { letters, digits, compound, root: digitRoot(compound) };
}

/** Letters the two systems value differently — computed, not counted by hand,
 *  so the figure on the hub cannot go stale if either table is corrected. */
const DIVERGENT_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  .split("")
  .filter((c) => chaldean(c).compound !== PYTHAGOREAN_MAP[c]);

// ── Avakahada chakra matching ────────────────────────────────────────
// Repeated from scanners/astro.ts, which keeps its lookup private. It is here
// only to decide which nakshatra pages exist and how many of this root's names
// sit under each; a name's star is still whatever the live tile says, because
// this is the same longest-prefix rule over the same table.

function normaliseSyllables(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .replace(/aa/g, "a")
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/ii/g, "i")
    .replace(/uu/g, "u");
}

const SYLLABLE_TO_STARS = new Map<string, string[]>();
for (const nk of NAKSHATRAS) {
  for (const p of nk.padas) {
    const list = SYLLABLE_TO_STARS.get(p.syl) ?? [];
    if (!list.includes(nk.name)) list.push(nk.name);
    SYLLABLE_TO_STARS.set(p.syl, list);
  }
}
const LONGEST_SYLLABLE = Math.max(...[...SYLLABLE_TO_STARS.keys()].map((s) => s.length));

/** Longest prefix first — "chha" beats "cha" beats "ch", the rule the chakra
 *  lookup applies. A syllable under two stars returns both. */
function starsFor(name: string): string[] {
  const n = normaliseSyllables(name);
  if (!n) return [];
  for (let len = Math.min(LONGEST_SYLLABLE, n.length); len >= 1; len--) {
    const hit = SYLLABLE_TO_STARS.get(n.slice(0, len));
    if (hit) return hit;
  }
  return [];
}

// ── One corpus name, read by both systems ────────────────────────────

interface Row {
  entry: CorpusEntry;
  letters: string[];
  digits: number[];
  compound: number;
  root: number;
  pythRoot: number;
}

function readRow(entry: CorpusEntry): Row {
  const c = chaldean(entry.name);
  return {
    entry,
    letters: c.letters,
    digits: c.digits,
    compound: c.compound,
    root: c.root,
    pythRoot: pythagorean(entry.name).root,
  };
}

/**
 * The name the worked example is built from: the shortest whose letters total
 * two digits, so the sum and the reduction both have something to show. Ties
 * break alphabetically, so the same corpus always produces the same example
 * and a rebuild never silently rewrites the page.
 */
function pickExample(rows: Row[]): Row | undefined {
  const byLength = [...rows].sort(
    (a, b) => a.entry.name.length - b.entry.name.length || a.entry.name.localeCompare(b.entry.name),
  );
  return byLength.find((r) => r.compound > 9) ?? byLength[0];
}

/** Letter badges carrying each letter's Chaldean value. */
function letterBadges(row: Row): string {
  return row.letters
    .map((l, i) => `      <span class="syl">${esc(l)}<small>${row.digits[i] ?? 0}</small></span>`)
    .join("\n");
}

/** Arithmetic set in the mono face. Wrapped because a long name overflows on a
 *  phone, and a sum that scrolls is better than a sum that is cut off. */
const monoLine = (text: string) =>
  `    <p style="font-family:'JetBrains Mono',monospace;font-size:13.5px;color:var(--ink-2);margin:0 0 4px;overflow-x:auto">${text}</p>`;

/** .fit is green by definition, and the unfavourable list needs the opposite
 *  reading. shell.ts is shared, so the one-off palette sits on the element —
 *  an inline declaration outranks the class rule, layout and all. */
const avoidPill = (text: string) =>
  `<span style="background:#FBEDE7;color:#9A3B12">${esc(text)}</span>`;

/**
 * How many of a page's names the two systems agree on, in English.
 *
 * "0 come out as 5" and "7 of the 7" are the readings a small root actually
 * produces, and both read as a template that has not been finished.
 */
function agreementSentence(count: number, agree: number, root: number): string {
  if (agree === 0) {
    return `Not one of the ${inr(count)} names on this page comes out as ${root} in the Pythagorean system.`;
  }
  if (agree === count) {
    return `Every one of the ${inr(count)} names on this page happens to come out as ${root} in the Pythagorean system as well.`;
  }
  return `Of the ${inr(count)} names on this page, ${inr(agree)} come out as ${root} in the Pythagorean system too and ${inr(count - agree)} land somewhere else.`;
}

/** Links inside table cells, which table.data deliberately does not style. */
const cellLink = (href: string, text: string) =>
  `<a href="${href}" style="color:var(--accent);text-decoration:none">${esc(text)}</a>`;

const devaCell = (name: string) =>
  `<td style="font-family:'Noto Sans Devanagari',serif;font-size:17px">${esc(romanToDevanagari(name))}</td>`;

/**
 * The names table. Gender and meaning become columns only when at least one
 * row has them — an empty column reads as missing data, and a meaning we have
 * not verified is never printed at all.
 */
function namesTable(rows: Row[], root: number): string {
  const shown = rows.slice(0, MAX_NAME_ROWS);
  const withGender = shown.some((r) => r.entry.gender);
  const withMeaning = shown.some((r) => r.entry.meaning);

  const head = [
    "Name",
    "In Devanagari",
    ...(withGender ? ["Gender"] : []),
    "Letters total",
    "Compound reading",
    ...(withMeaning ? ["Meaning"] : []),
  ]
    .map((h) => `<th>${esc(h)}</th>`)
    .join("");

  const body = shown
    .map((r) => {
      const reading = compoundHead(r.compound);
      return `        <tr>
          <td>${cellLink(`/n/${slugify(r.entry.name)}.html`, r.entry.name)}</td>
          ${devaCell(r.entry.name)}
          ${withGender ? `<td>${esc(r.entry.gender ?? "—")}</td>` : ""}
          <td class="num">${r.compound}</td>
          <td>${reading ? esc(reading) : "—"}</td>
          ${withMeaning ? `<td>${r.entry.meaning ? esc(r.entry.meaning) : "—"}</td>` : ""}
        </tr>`;
    })
    .join("\n");

  const overflow =
    rows.length > shown.length
      ? `    <p class="sub" style="margin-top:10px">Showing ${inr(shown.length)} of the ${inr(rows.length)} published names that reduce to ${root}. The rest are on the <a href="/n/">full name index</a>.</p>`
      : "";

  return `    <div class="table-scroll">
      <table class="data">
        <thead><tr>${head}</tr></thead>
        <tbody>
${body}
        </tbody>
      </table>
    </div>
${overflow}`;
}

/** Visible answers and FAQPage markup are rendered from one array, so they
 *  cannot end up saying different things. */
interface Faq {
  q: string;
  a: string;
}

const faqHtml = (faqs: Faq[]) =>
  faqs
    .map(
      (f) => `    <h3 style="font-family:Fraunces,serif;font-size:18px;font-weight:500;margin:22px 0 2px">${esc(f.q)}</h3>
    <p>${esc(f.a)}</p>`,
    )
    .join("\n");

const faqLd = (faqs: Faq[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
});

// ── One number page ──────────────────────────────────────────────────

function renderNumberPage(
  root: number,
  rows: Row[],
  byRoot: Map<number, Row[]>,
  published: number[],
  publishedStars: Set<string>,
  ctx: SeoCtx,
): SeoDoc {
  const planet = RULING_PLANET[root];
  const fit = INDUSTRY_FIT[root];
  const luckySums = LUCKY_DOB_SUMS[root] ?? [];
  const compounds = compoundsForRoot(root);
  const count = rows.length;
  const corpusTotal = ctx.corpus.length;
  const share = corpusTotal > 0 ? Math.round((count / corpusTotal) * 100) : 0;
  const path = numberPath(root);

  const example = pickExample(rows);
  const agree = rows.filter((r) => r.pythRoot === root).length;

  // Names sitting on a compound the tradition documents, so the page can say
  // how much of its own list the compound table above actually covers.
  const documented = rows.filter((r) => DOCUMENTED_COMPOUNDS.includes(r.compound)).length;

  const title = `Chaldean numerology number ${root} — ${planet.name}, compound numbers and ${inr(count)} names | Naam Dekho`;
  const metaDesc = `Name number ${root} in Chaldean numerology is ruled by ${planet.name} ${planet.glyph}. Its compound totals are ${compounds.join(", ")}, it traditionally favours ${listJoin(fit.good.slice(0, 3).map(softLower))}, and ${inr(count)} published names add to it — each with the letter-by-letter sum you can check yourself.`;

  // ── Compound table ──────────────────────────────────────────────
  const compoundRows = compounds
    .map((c) => {
      const here = rows.filter((r) => r.compound === c).length;
      return `        <tr>
          <td class="num"><strong>${c}</strong></td>
          <td>${esc(COMPOUND_MEANINGS[c])}</td>
          <td class="num">${here > 0 ? inr(here) : "—"}</td>
        </tr>`;
    })
    .join("\n");

  // Short names total less than the lowest documented compound and long ones
  // pass the highest; both read by the root alone, which is what chaldean()
  // already falls back to. Saying so stops a reader hunting for a row that was
  // never there.
  const undocumented = count - documented;
  const compoundNote =
    undocumented > 0
      ? `    <p class="note">${inr(undocumented)} of the ${inr(count)} names below ${undocumented === 1 ? "sits" : "sit"} outside this table — ${undocumented === 1 ? "its letters total" : "their letters total"} under ${LOWEST_DOCUMENTED} or over ${HIGHEST_DOCUMENTED}, the range the Chaldean compound readings cover. ${undocumented === 1 ? "That name is" : "Those names are"} read by the root number alone, and the “compound reading” column is left empty rather than filled with the nearest thing.</p>`
      : "";

  // ── Dates ───────────────────────────────────────────────────────
  const dateRows = luckySums
    .map((s) => {
      const dates = datesReducingTo(s);
      return `        <tr>
          <td class="num"><strong>${s}</strong>${s === root ? ` <span style="color:var(--ink-3);font-weight:400">· the number’s own</span>` : ""}</td>
          <td class="num">${dates.join(", ")}</td>
          <td class="num">${dates.length}</td>
        </tr>`;
    })
    .join("\n");
  const allLuckyDates = luckySums.flatMap((s) => datesReducingTo(s)).sort((a, b) => a - b);

  // ── Worked example ──────────────────────────────────────────────
  const exampleSection = example
    ? (() => {
        const n = example.entry.name;
        const sum = example.letters
          .map((l, i) => `${l}(${example.digits[i] ?? 0})`)
          .join(" + ");
        const chain = reductionChain(example.compound);
        const pyth = pythagorean(n);
        const pythSum = pyth.letters.map((l, i) => `${l}(${pyth.digits[i] ?? 0})`).join(" + ");
        const pythChain = reductionChain(pyth.compound);
        return `  <section>
    <h2>Worked example — ${esc(n)}</h2>
    <p class="sub">Every letter, its Chaldean value, and the two steps that get to ${root}. Check it against the <a href="${HUB_PATH}#letters">letter table</a>.</p>
    <div class="syls">
${letterBadges(example)}
    </div>
${monoLine(`${esc(sum)} = ${example.compound}`)}
${chain.map((s) => monoLine(esc(s))).join("\n")}
${chain.length === 0 ? monoLine(`${example.compound} is already a single digit — the compound and the root are the same number.`) : ""}
    <p style="margin-top:14px">${esc(n)} therefore carries root ${root}, and a live check reads it under ${esc(planet.glyph)} ${esc(planet.name)}. Its own page — <a href="/n/${slugify(n)}.html">${esc(n)}</a> — carries the same number alongside the name in ten scripts.</p>
    <p class="note">The same name in the Pythagorean system: ${esc(pythSum)} = ${pyth.compound}${pythChain.length ? `, ${esc(pythChain.map((s) => s.replace(/^\d+ → /, "")).join(", then "))}` : ""} → root ${pyth.root}. ${
      pyth.root === root
        ? "The two systems happen to agree on this name. They often do not — the section below explains why."
        : `The two systems disagree on this name, which is the usual outcome and not an error in either. The section below explains where they part company.`
    }</p>
  </section>`;
      })()
    : "";

  // ── Birth stars behind these names ──────────────────────────────
  const starCounts = new Map<string, number>();
  for (const r of rows) {
    for (const star of starsFor(r.entry.name)) {
      if (!publishedStars.has(star)) continue;
      starCounts.set(star, (starCounts.get(star) ?? 0) + 1);
    }
  }
  const starChips = [...starCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([star, n]) => `<a href="${nakshatraPath(star)}">${esc(star)} · ${inr(n)}</a>`)
    .join("\n        ");

  // ── Siblings ────────────────────────────────────────────────────
  const siblings = published
    .filter((r) => r !== root)
    .map(
      (r) =>
        `<a href="${numberPath(r)}">Number ${r}<br /><span style="color:var(--ink-3);font-size:12px">${esc(RULING_PLANET[r].glyph)} ${esc(RULING_PLANET[r].name)} · ${inr((byRoot.get(r) ?? []).length)} names</span></a>`,
    )
    .join("\n        ");

  const sampleNames = rows
    .slice(0, 9)
    .map((r) => `<a href="/n/${slugify(r.entry.name)}.html">${esc(r.entry.name)}</a>`)
    .join("\n        ");

  // Uranus and Neptune are in the table for 4 and 7. Printing the table we
  // actually compute from, and naming the oddity, is better than quietly
  // swapping in a classical planet to make the set look older than it is.
  const modernPlanetNote =
    planet.name === "Uranus" || planet.name === "Neptune"
      ? `    <p class="note">${planet.name} is not a planet any Babylonian astronomer could see — it was found with a telescope. The rulerships in general use today are not identical to the ancient ones, and the table above is the one our engine computes from, printed as it stands rather than tidied to look older than it is.</p>`
      : "";

  const faqs: Faq[] = [
    {
      q: `What does name number ${root} mean in Chaldean numerology?`,
      a: `${root} is the root of any name whose letter values total ${root}, or total a number that reduces to ${root}. Chaldean tradition places it under ${planet.name} ${planet.glyph}. The detail sits in the compound total before it is reduced: ${listJoin(compounds.map((c) => `${c} is read as ${softLower(compoundHead(c))}`))}. Of the ${inr(corpusTotal)} names Naam Dekho publishes, ${inr(count)} come out as root ${root}.`,
    },
    {
      q: `Which planet rules number ${root}?`,
      a: `${planet.name}, written ${planet.glyph}. Chaldean numerology assigns one of nine planetary rulers to each root, and that assignment is the whole of what the "planet" means here — it is not read from a birth chart and has nothing to do with where ${planet.name} actually was when anyone was born. A rashi comes from the Moon's position; a root number comes from the spelling of the name.`,
    },
    {
      q: `Is name number ${root} good for a business?`,
      a: `The tradition marks ${listJoin(fit.good.map(softLower))} favourable for root ${root}, and ${listJoin(fit.avoid.map(softLower), "or")} unfavourable. In a live check this is one tile of many, and it is deliberately weak: numerology can return "favourable" or "not traditionally favoured", never a conflict, so it can nudge a score and can never fail a name. A trademark already registered in your class, or a domain someone else owns, is what actually stops a name.`,
    },
    {
      q: `Which birth dates suit name number ${root}?`,
      a: `Root ${root} is traditionally read as harmonious with dates whose digits reduce to ${listJoin(luckySums.map(String), "or")} — that is ${inr(allLuckyDates.length)} dates of the month: ${allLuckyDates.join(", ")}. The date is reduced exactly the way the name is: 23 becomes 2 + 3 = 5. Only the day of the month is used, so the month and year do not change the answer.`,
    },
    {
      q: `Why does another calculator give my name a different number?`,
      a: `Almost always because it uses the Pythagorean system rather than the Chaldean one. Pythagorean numbers the alphabet straight through — A is 1, B is 2, on to I at 9, then it starts again — while Chaldean assigns values by sound and never uses 9 at all, treating it as sacred. ${DIVERGENT_LETTERS.length} of the 26 letters are valued differently by the two systems, so the totals rarely match, and a name that is ${root} here can be almost anything elsewhere. Naam Dekho computes Chaldean only, and publishes every letter value on the numerology index so you can work out which system any number came from.`,
    },
  ];

  const body = `  <h1>Chaldean numerology number ${root}</h1>
  <div class="deva">${esc(planet.glyph)} ${esc(planet.name)}</div>
  <p class="lede">A name's root number is the sum of its letters, reduced to a single digit. Root ${root} is the answer for ${inr(count)} of the ${inr(corpusTotal)} names we publish — ${share}% of the corpus — and this page shows the arithmetic, the compound readings, the fields the tradition marks favourable, and every one of those names.</p>

  <div class="tags">
    <span class="tag">Ruling planet ${esc(planet.name)}</span>
    <span class="tag">Compound ${compounds.join(" · ")}</span>
    <span class="tag">${inr(count)} names</span>
    <span class="tag">${inr(allLuckyDates.length)} harmonious dates</span>
  </div>

  <section>
    <h2>The reading at a glance</h2>
    <p class="sub">Read straight out of the table our scan computes from.</p>
    <div class="cards">
      <div class="card">
        <div class="k">Root number</div>
        <div class="v">${root}</div>
        <div class="n">Ruling planet ${esc(planet.glyph)} ${esc(planet.name)}</div>
      </div>
      <div class="card">
        <div class="k">Compound totals</div>
        <div class="v" style="font-size:24px">${compounds.join(" · ")}</div>
        <div class="n">The documented two-digit sums that reduce to ${root}</div>
      </div>
      <div class="card">
        <div class="k">Names in our corpus</div>
        <div class="v">${inr(count)}</div>
        <div class="n">${share}% of ${inr(corpusTotal)} published names</div>
      </div>
    </div>
${modernPlanetNote}
  </section>

  <section>
    <h2>What the compound number adds</h2>
    <p class="sub">Chaldean keeps the two-digit total as well as the single digit, and reads the two differently — the root describes the name, the compound describes how it is likely to go.</p>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>Compound</th><th>Traditional reading</th><th>Names here</th></tr></thead>
        <tbody>
${compoundRows}
        </tbody>
      </table>
    </div>
${compoundNote}
  </section>

  <section>
    <h2>Fields traditionally read as favourable</h2>
    <p class="sub">The lists a live check compares a founder's stated industry against.</p>
    <div class="fit">${fit.good.map((g) => `<span>${esc(g)}</span>`).join("")}</div>
    <p class="sub" style="margin-top:16px">And the fields the same tradition marks against root ${root}:</p>
    <div class="fit">${fit.avoid.map(avoidPill).join("")}</div>
    <p class="note">Type an industry into the name check and we match your own words against these lists — “fintech” is read against banking, “edtech” against education — and report favourable, neutral, or not traditionally favoured. An industry we cannot map honestly comes back neutral rather than guessed at. This tile can lower a score; it can never register a conflict, because a root number is a cultural reading and a registered trademark is a fact.</p>
  </section>

  <section>
    <h2>Dates that harmonise with root ${root}</h2>
    <p class="sub">Reduce the day of the month the same way you reduce the name.</p>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>Date sum</th><th>Dates of the month</th><th>How many</th></tr></thead>
        <tbody>
${dateRows}
        </tbody>
      </table>
    </div>
    <p class="note">Traditionally this runs as a check on a name already chosen, not as a reason to choose a birth date. Only the day is used — the month and the year do not enter the sum.</p>
  </section>

${exampleSection}

  <section>
    <h2>${inr(count)} published names with root ${root}</h2>
    <p class="sub">Every one recomputed with the same function the live scan calls. Devanagari is transliterated by our own engine; a meaning appears only where we have verified one.</p>
${namesTable(rows, root)}
  </section>

  <section class="prose">
    <h2>Chaldean and Pythagorean are not the same system</h2>
    <p>The two systems in common use disagree on ${DIVERGENT_LETTERS.length} of the 26 letters, which is why a name that reads as ${root} here can read as something else on another site. Pythagorean numbers the alphabet in order — A is 1, B is 2, up to I at 9, then J starts again at 1. Chaldean does not follow the alphabet at all: it groups letters by sound, so A, I, J, Q and Y share the value 1, and it never assigns 9 to any letter, that number being held back as sacred. A 9 can only ever arrive in a Chaldean reading through reduction, never from a single letter.</p>
    <p>They also stop in different places. Chaldean holds on to the compound total and reads it — ${listJoin(compounds.map((c) => `${c} as ${softLower(compoundHead(c))}`))} — and only then reduces to the root, so the reading has two layers. Pythagorean reduces straight to one digit, singling out 11, 22 and 33 as master numbers that are left unreduced. And Chaldean is applied to the name as it is actually used and spoken, which is why we compute it on the spelling you type; Pythagorean practice is usually to use the full name as recorded at birth.</p>
    <p>${esc(agreementSentence(count, agree, root))} Neither system is a correction of the other. Naam Dekho computes Chaldean only, and prints every letter value on the <a href="${HUB_PATH}#letters">numerology index</a> so you can always tell which system a number came from.</p>
  </section>

  <section class="prose">
    <h2>Questions people ask</h2>
${faqHtml(faqs)}
  </section>

${ctaBlock(
  `Checking a name for a company, not a child?`,
  `The root number is one tile. The check also runs domains, social handles, marketplaces, the MCA company register and all 45 trademark classes.`,
)}

${
  starChips
    ? `  <section>
    <h2>Birth stars behind these names</h2>
    <p class="sub">Where the names on this page fall in the Avakahada chakra, counted by first syllable. The root number comes from every letter; the nakshatra comes from the first sound alone, so the two are independent readings of the same name.</p>
    <div class="related">
        ${starChips}
    </div>
  </section>
`
    : ""
}${
    siblings
      ? `  <section>
    <h2>The other root numbers</h2>
    <p class="sub">Each with its ruling planet and the names our corpus files under it.</p>
    <div class="grid-links">
        ${siblings}
    </div>
  </section>
`
      : ""
  }
  <section>
    <h2>Name pages with root ${root}</h2>
    <p class="sub">Each carries the name in ten Indian scripts, its numerology, its birth star and its short forms.</p>
    <div class="related">
        ${sampleNames}
        <a href="${HUB_PATH}">All nine numbers</a>
        <a href="/n/">All published names</a>
    </div>
  </section>`;

  const listed = rows.slice(0, MAX_NAME_ROWS);

  const jsonLd = [
    faqLd(faqs),
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `Names with Chaldean root number ${root}`,
      numberOfItems: listed.length,
      itemListElement: listed.map((r, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: r.entry.name,
        url: `${ctx.siteOrigin}/n/${slugify(r.entry.name)}.html`,
      })),
    },
  ];

  return {
    path,
    html: renderSeoPage({
      title,
      metaDesc,
      path,
      siteOrigin: ctx.siteOrigin,
      crumbs: [
        { label: "Home", href: "/" },
        { label: "Numerology", href: HUB_PATH },
        { label: `Number ${root}` },
      ],
      jsonLd,
      body,
    }),
    priority: "0.8",
    changefreq: "monthly",
  };
}

// ── The hub ──────────────────────────────────────────────────────────

function renderHub(
  byRoot: Map<number, Row[]>,
  published: number[],
  publishedStars: Set<string>,
  ctx: SeoCtx,
): SeoDoc {
  const corpusTotal = ctx.corpus.length;
  const allRows = [...byRoot.values()].flat();

  // The letter table, grouped by the value the Chaldean system gives — read
  // back out of chaldean() one letter at a time rather than re-declaring the
  // map, so this page cannot print values the engine does not use.
  const byValue = new Map<number, string[]>();
  for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    const v = chaldean(letter).compound;
    byValue.set(v, [...(byValue.get(v) ?? []), letter]);
  }
  const letterRows = [...byValue.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([value, letters]) => {
      const pythSame = letters.filter((l) => PYTHAGOREAN_MAP[l] === value);
      return `        <tr>
          <td class="num"><strong>${value}</strong></td>
          <td style="letter-spacing:.12em">${letters.join(" ")}</td>
          <td class="num">${pythSame.length > 0 ? pythSame.join(" ") : "—"}</td>
        </tr>`;
    })
    .join("\n");

  const rootRows = ROOTS.map((root) => {
    const rows = byRoot.get(root) ?? [];
    const planet = RULING_PLANET[root];
    const fit = INDUSTRY_FIT[root];
    const isPublished = published.includes(root);
    const label = isPublished ? cellLink(numberPath(root), `Number ${root}`) : `Number ${root}`;
    return `        <tr>
          <td class="num"><strong>${label}</strong></td>
          <td>${esc(planet.glyph)} ${esc(planet.name)}</td>
          <td class="num">${compoundsForRoot(root).join(", ")}</td>
          <td>${esc(fit.good.slice(0, 3).join(", "))}</td>
          <td class="num">${inr(rows.length)}</td>
        </tr>`;
  }).join("\n");

  const compoundRows = DOCUMENTED_COMPOUNDS.map((c) => {
    const root = digitRoot(c);
    const here = allRows.filter((r) => r.compound === c).length;
    return `        <tr>
          <td class="num"><strong>${c}</strong></td>
          <td class="num">${published.includes(root) ? cellLink(numberPath(root), String(root)) : root}</td>
          <td>${esc(COMPOUND_MEANINGS[c])}</td>
          <td class="num">${here > 0 ? inr(here) : "—"}</td>
        </tr>`;
  }).join("\n");

  const unpublished = ROOTS.filter((r) => !published.includes(r));
  const unpublishedNote = unpublished.length
    ? `    <p class="note">${listJoin(unpublished.map((r) => `Number ${r}`))} ${unpublished.length === 1 ? "has" : "have"} no page of ${unpublished.length === 1 ? "its" : "their"} own yet. A root gets one once at least ${MIN_CORPUS_NAMES} published names reduce to it — until then the tables on this page carry its planet, its compound readings and the fields it favours, and a page of its own would mostly repeat them.</p>`
    : "";

  const example = pickExample(allRows);
  const exampleSection = example
    ? (() => {
        const n = example.entry.name;
        const sum = example.letters.map((l, i) => `${l}(${example.digits[i] ?? 0})`).join(" + ");
        const chain = reductionChain(example.compound);
        return `  <section>
    <h2>How the number is worked out</h2>
    <p class="sub">Take every letter, look up its value, add, reduce. ${esc(n)}, one of the published names:</p>
    <div class="syls">
${letterBadges(example)}
    </div>
${monoLine(`${esc(sum)} = ${example.compound}`)}
${chain.map((s) => monoLine(esc(s))).join("\n")}
    <p style="margin-top:14px">${esc(n)} therefore carries root ${example.root}${published.includes(example.root) ? ` — ${cellLink(numberPath(example.root), `number ${example.root}`)}, ruled by ${esc(RULING_PLANET[example.root].glyph)} ${esc(RULING_PLANET[example.root].name)}` : ""}. Nothing else goes into it: not the birth date, not the gender, not the meaning. Spaces and punctuation are dropped, and the name is read as you write it.</p>
  </section>`;
      })()
    : "";

  const starChips = [...publishedStars]
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 12)
    .map((s) => `<a href="${nakshatraPath(s)}">${esc(s)}</a>`)
    .join("\n        ");

  const title = `Chaldean name numerology — all nine root numbers, their planets and letter values | Naam Dekho`;
  const metaDesc = `The full Chaldean table: what each letter is worth, the nine root numbers with their ruling planets, the compound readings from ${LOWEST_DOCUMENTED} to ${HIGHEST_DOCUMENTED}, and how ${inr(corpusTotal)} published Indian names distribute across them.`;

  const body = `  <h1>Chaldean name numerology</h1>
  <p class="lede">Nine root numbers, one ruling planet each, and a letter table that has nothing to do with the order of the alphabet. This is the whole system our name check computes with, written out — the letter values, the compound readings, and where ${inr(corpusTotal)} published Indian names actually land.</p>

  <div class="tags">
    <span class="tag">9 root numbers</span>
    <span class="tag">26 letters, 8 values</span>
    <span class="tag">${DOCUMENTED_COMPOUNDS.length} compound readings</span>
    <span class="tag">${inr(corpusTotal)} names counted</span>
  </div>

  <section>
    <h2>The nine root numbers</h2>
    <p class="sub">Ruling planet, the compound totals that reduce to each, and the fields the tradition marks favourable.</p>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>Root</th><th>Ruling planet</th><th>Compound totals</th><th>Traditionally favours</th><th>Names in corpus</th></tr></thead>
        <tbody>
${rootRows}
        </tbody>
      </table>
    </div>
${unpublishedNote}
    <p class="note">Two of the nine rulers, Uranus and Neptune, are planets no ancient astronomer could see — they were found with telescopes. The set of rulerships in common use today is not the ancient one, and we print the table our engine computes from rather than a tidied version of it.</p>
  </section>

  <section id="letters">
    <h2>What each letter is worth</h2>
    <p class="sub">Grouped by value. The third column shows which of those letters the Pythagorean system happens to give the same number.</p>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>Value</th><th>Chaldean letters</th><th>Same in Pythagorean</th></tr></thead>
        <tbody>
${letterRows}
        </tbody>
      </table>
    </div>
    <p class="note">There is no row for 9. Chaldean treats it as sacred and gives it to no letter, so a 9 can only arrive through reduction. ${DIVERGENT_LETTERS.length} of the 26 letters are valued differently by the two systems, which is why a name can read as one number here and another elsewhere.</p>
  </section>

${exampleSection}

  <section>
    <h2>The compound readings</h2>
    <p class="sub">Chaldean reads the two-digit total before reducing it. These are the ${DOCUMENTED_COMPOUNDS.length} totals the tradition documents, from ${LOWEST_DOCUMENTED} to ${HIGHEST_DOCUMENTED}.</p>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>Compound</th><th>Reduces to</th><th>Traditional reading</th><th>Names in corpus</th></tr></thead>
        <tbody>
${compoundRows}
        </tbody>
      </table>
    </div>
    <p class="note">A short name can total less than ${LOWEST_DOCUMENTED} and a long one more than ${HIGHEST_DOCUMENTED}. Both are read by the root alone — there is no reading here to give them, so none is invented.</p>
  </section>

  <section class="prose">
    <h2>What a root number is and is not</h2>
    <p>It is arithmetic over a fixed table. Every value on this page can be checked with a pen, and that is deliberate: a reading nobody can reproduce is an opinion with a number attached. Whether the tradition means anything is a separate question, and not one a name checker gets to answer for you.</p>
    <p>What it is not is a verdict. In a live check the numerology tile can read favourable, neutral, or not traditionally favoured for the industry you type — and that last one lowers a score without ever becoming a conflict. The things that can genuinely stop a name are elsewhere in the report: a trademark already registered in your class, a company on the MCA register with your name, a domain someone else owns. We keep the cultural readings and the hard facts in different columns on purpose.</p>
  </section>

${ctaBlock(
  `Run a name through all of it`,
  `Root number, birth star, ten scripts, domains, social handles, marketplaces, the MCA register and all 45 trademark classes.`,
)}

${
  starChips
    ? `  <section>
    <h2>The other traditional reading</h2>
    <p class="sub">A root number comes from every letter of a name. A nakshatra comes from the first sound alone, and is the one a pandit gives at the namkaran.</p>
    <div class="related">
        ${starChips}
    </div>
  </section>
`
    : ""
}  <section>
    <h2>Every published name</h2>
    <p class="sub">Each with its own root number, birth star, short forms and ten scripts.</p>
    <div class="related">
        <a href="/n/">The full name index</a>
    </div>
  </section>`;

  return {
    path: HUB_PATH,
    html: renderSeoPage({
      title,
      metaDesc,
      path: HUB_PATH,
      siteOrigin: ctx.siteOrigin,
      crumbs: [
        { label: "Home", href: "/" },
        { label: "Names", href: "/n/" },
        { label: "Numerology" },
      ],
      // A listing of the nine, so ItemList; the reference tables are the page's
      // substance but they are not a question-and-answer format, and marking
      // them up as one to win an FAQ rich result is the kind of thing that gets
      // structured data ignored site-wide.
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Chaldean numerology root numbers",
          numberOfItems: published.length,
          itemListElement: published.map((root, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: `Chaldean numerology number ${root} — ${RULING_PLANET[root].name}`,
            url: `${ctx.siteOrigin}${numberPath(root)}`,
          })),
        },
      ],
      body,
    }),
    // Below the number pages on purpose: the hub is how a reader gets to them
    // and how the crawler finds them, but "Chaldean numerology 5 meaning" is
    // answered by a number page, not by a table of contents.
    priority: "0.7",
    changefreq: "monthly",
  };
}

/**
 * Builds the numerology cluster.
 *
 * The corpus is read once and every name is scored by both systems up front,
 * because the pages need each other's counts — the sibling links carry the
 * name totals, and the hub's table has a row for a number that may not have
 * published. Rendering in one pass would mean either recomputing chaldean()
 * for the whole corpus nine times or linking pages the build never wrote.
 */
export function buildNumerologyPages(ctx: SeoCtx): SeoDoc[] {
  const byRoot = new Map<number, Row[]>(ROOTS.map((r) => [r, []] as [number, Row[]]));
  for (const entry of ctx.corpus) {
    const row = readRow(entry);
    // A name with no A–Z letters totals zero and reduces to zero, which is not
    // a root number in this system. It belongs on no page rather than on the
    // nearest one.
    byRoot.get(row.root)?.push(row);
  }
  for (const rows of byRoot.values()) {
    rows.sort((a, b) => a.entry.name.localeCompare(b.entry.name));
  }

  const published = ROOTS.filter((r) => (byRoot.get(r) ?? []).length >= MIN_CORPUS_NAMES);
  if (published.length === 0) return [];

  // Which nakshatra pages this build can safely link, by the rule that cluster
  // publishes on — a star needs NAK_MIN_NAMES corpus names across its four
  // padas. Computed once; every page links from the same set.
  const starTotals = new Map<string, number>();
  for (const entry of ctx.corpus) {
    for (const star of starsFor(entry.name)) {
      starTotals.set(star, (starTotals.get(star) ?? 0) + 1);
    }
  }
  const publishedStars = new Set(
    [...starTotals.entries()].filter(([, n]) => n >= NAK_MIN_NAMES).map(([star]) => star),
  );

  const pages = published.map((root) =>
    renderNumberPage(root, byRoot.get(root) ?? [], byRoot, [...published], publishedStars, ctx),
  );

  // The hub ships whenever any number page does, never conditionally: every
  // number page names it as its breadcrumb parent and links the letter table
  // on it, so a build that emitted the numbers without the hub would put a
  // 404 in the breadcrumb of each. It is also the least thin page here — the
  // 26 letter values and the full compound table live on it and nowhere else.
  return [...pages, renderHub(byRoot, [...published], publishedStars, ctx)];
}
