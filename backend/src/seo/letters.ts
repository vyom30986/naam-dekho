import { CHALDEAN_MAP, INDUSTRY_FIT, RULING_PLANET, chaldean } from "../lib/numerology.js";
import { romanToDevanagari } from "../lib/transliterate.js";
import { NAKSHATRAS, RASHI_NAMES } from "../scanners/astro.js";
import { slugify } from "../scripts/name-corpus.js";
import { ctaBlock, esc, renderSeoPage, seoSlug, type SeoCtx, type SeoDoc } from "./shell.js";

/**
 * The letter cluster — /names/starting-with-<letter>.html, and the gendered
 * variants /names/<gender>-starting-with-<letter>.html where the corpus can
 * actually carry one.
 *
 * "Baby names starting with A" is the highest-volume query family in this
 * market and also the most contested: every name-mill site publishes all 26
 * letters, most of them padded with the same scraped list. The only way in is
 * to publish fewer letters and put something on each page that the mills do
 * not have — the Devanagari spelling from our transliteration engine, the
 * Chaldean root of every name, and the Avakahada syllable each name's opening
 * sound belongs to. All three are computed here at build time from the same
 * engines the live product runs, so the page cannot drift away from the app.
 *
 * A meaning is printed only where the corpus carries a verified one. The
 * column is dropped entirely when no name in the group has one, rather than
 * rendered full of dashes.
 */

type CorpusEntry = SeoCtx["corpus"][number];
type Gendered = "boy" | "girl";

const GENDERS: Gendered[] = ["boy", "girl"];

/**
 * RULE 2 THRESHOLDS — the reasoning, since these three numbers decide how
 * many pages this cluster is allowed to emit.
 *
 * MIN_NAMES = 12. A letter page's spine is three computed tables: the names,
 * the Chaldean root distribution, and the chakra syllables. The root table can
 * hold nine rows and the syllable table anything up to a dozen, so below about
 * twelve names the structure outweighs the content and the page becomes a
 * template with a letter swapped in — the exact doorway pattern Google's
 * helpful-content system demotes, and the reason a mill site publishing "names
 * starting with X" with four entries ranks for nothing. Twelve also keeps the
 * title honest: "42 names starting with A" is a promise the page keeps, "6
 * names starting with Q" is a page a parent bounces off in two seconds. With
 * the current corpus this drops the tail letters — Q, X, Z, W and usually F —
 * and that is the intended outcome, not a shortfall. Every letter publishes
 * itself the moment the corpus reaches the bar, because the count is recounted
 * on every build.
 *
 * MIN_GENDER_NAMES = 12, applied independently to each gendered variant. The
 * gendered page is a strict subset of its parent, so it has to stand on its own
 * listing; a boys' page with seven names is the parent page minus content.
 *
 * GENDER_DUPLICATE_SHARE = 0.8. The other failure mode for a subset page: when
 * four names in five under a letter are boys' names, the boys' page IS the
 * letter page with a different <h1> and two girls' rows missing. Two URLs
 * carrying the same list compete with each other and neither wins, so above
 * this share the gendered variant is skipped and the letter page takes the
 * query alone.
 */
const MIN_NAMES = 12;
const MIN_GENDER_NAMES = 12;
const GENDER_DUPLICATE_SHARE = 0.8;

/**
 * Rows in one table before it stops being something a person reads. Nothing is
 * lost past the cap — every name has its own /n/ page and the /n/ index lists
 * all of them — so the overflow note points there rather than paginating.
 */
const MAX_ROWS_PER_GROUP = 40;

/** Chips in the closing name-page block. Enough to feed the /n/ pages, not so
 *  many that the block becomes the page. */
const MAX_SAMPLE_LINKS = 12;

/**
 * Cross-cluster paths, written once. The nakshatra, rashi and numerology
 * conventions are the ones rashi.ts and nakshatra.ts already use — repeated
 * here rather than re-invented, so a convention change is one edit per file
 * instead of thirty scattered string literals.
 *
 * Links inside this cluster are checked against what the build actually emits
 * (see buildLetterPages). Links out to the other clusters are not, because
 * their thresholds live in their own files; this cluster follows the same
 * all-or-nothing convention the sibling clusters already use between
 * themselves, so a star or a sign that drops below its threshold is a gap they
 * share rather than one this file invents.
 */
const letterPath = (letter: string) => `/names/starting-with-${letter.toLowerCase()}.html`;
const genderPath = (gender: Gendered, letter: string) =>
  `/names/${gender}-starting-with-${letter.toLowerCase()}.html`;
const nakshatraPath = (name: string) => `/nakshatra/${seoSlug(name)}.html`;
const numerologyPath = (root: number) => `/numerology/number-${root}.html`;
const namePath = (name: string) => `/n/${slugify(name)}.html`;

/** "Mesha (Aries)" → "mesha", so this cluster and the rashi cluster cannot end
 *  up on two different URLs for the same sign. */
const RASHI_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(RASHI_NAMES).map(([key, label]) => [label, key]),
);
const rashiPath = (label: string) => `/rashi/${RASHI_SLUG[label] ?? seoSlug(label)}.html`;
const rashiShort = (label: string) => label.split(" (")[0];

const inr = (n: number) => n.toLocaleString("en-IN");
const capFirst = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

const listJoin = (parts: string[], conjunction: "and" | "or" = "and") =>
  parts.length <= 1
    ? (parts[0] ?? "")
    : `${parts.slice(0, -1).join(", ")} ${conjunction} ${parts[parts.length - 1]}`;

/** table.data does not style links, so cell links carry the accent inline. */
const cellLink = (href: string, text: string) =>
  `<a href="${href}" style="color:var(--accent);text-decoration:none">${esc(text)}</a>`;

const GENDER_LABEL: Record<Gendered, { adjective: string; possessive: string; heading: string }> = {
  boy: { adjective: "boys'", possessive: "boy", heading: "Baby boy names" },
  girl: { adjective: "girls'", possessive: "girl", heading: "Baby girl names" },
};

// ── The Avakahada chakra, read the same way the live tile reads it ──────

interface PadaCell {
  nakshatra: string;
  symbol: string;
  /** 1-based, as a pandit counts them. */
  pada: number;
  syllable: string;
  /** Full label, e.g. "Mesha (Aries)" — the join key back to RASHI_NAMES. */
  rashi: string;
}

const ALL_PADAS: PadaCell[] = NAKSHATRAS.flatMap((nk) =>
  nk.padas.map((p, i) => ({
    nakshatra: nk.name,
    symbol: nk.symbol,
    pada: i + 1,
    syllable: p.syl,
    rashi: p.rashi,
  })),
);

/**
 * Mirrors normaliseSyllables() in scanners/astro.ts. Duplicated rather than
 * imported because astro.ts keeps it private, and the two must not disagree:
 * a name shown under Krittika here and under Bharani on the app is the kind of
 * quiet contradiction that costs more trust than this page earns.
 */
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

/** Longest prefix first, so "chha" beats "cha" beats "ch" — the rule the live
 *  lookup applies, and a syllable under two stars returns both. */
function chakraMatches(name: string): PadaCell[] {
  const n = normaliseSyllables(name);
  if (!n) return [];
  for (let len = 4; len >= 1; len--) {
    const hits = ALL_PADAS.filter((c) => c.syllable === n.slice(0, len));
    if (hits.length > 0) return hits;
  }
  return [];
}

// ── One corpus entry, with everything this cluster computes about it ────

interface LetterName {
  entry: CorpusEntry;
  root: number;
  compound: number;
  devanagari: string;
  /** First Devanagari akshara — "" when the name does not transliterate. */
  initial: string;
  /** The chakra syllable the name opens on, "" when the table has no match. */
  syllable: string;
  cells: PadaCell[];
}

interface LetterGroup {
  letter: string;
  names: LetterName[];
  byGender: Record<Gendered, LetterName[]>;
  unisex: LetterName[];
}

function readName(entry: CorpusEntry): LetterName {
  const num = chaldean(entry.name);
  const devanagari = romanToDevanagari(entry.name);
  const cells = chakraMatches(entry.name);
  return {
    entry,
    root: num.root,
    compound: num.compound,
    devanagari,
    // Array.from, not [0] — a UTF-16 index would split a surrogate pair, and
    // the akshara is what we are counting, not the code unit.
    initial: Array.from(devanagari)[0] ?? "",
    syllable: cells[0]?.syllable ?? "",
    cells,
  };
}

/** A–Z only. A name opening on a digit or a non-Latin character has no letter
 *  page to belong to, and inventing a bucket for it would put it on a page no
 *  one searches for. */
function firstLetter(name: string): string | null {
  const c = name.trim().charAt(0).toUpperCase();
  return /^[A-Z]$/.test(c) ? c : null;
}

// ── Shared page furniture ───────────────────────────────────────────────

/**
 * The names table. Every column is conditional on the rows carrying something
 * in it: a gender column on a single-gender group, or a root column inside a
 * root group, is a constant repeated forty times, and a meaning column over
 * names we have not verified is forty dashes. Both read as missing data.
 */
function namesTable(rows: LetterName[], overflowNote: string): string {
  const shown = rows.slice(0, MAX_ROWS_PER_GROUP);
  const mixedGender = new Set(shown.map((r) => r.entry.gender ?? "")).size > 1;
  const mixedRoot = new Set(shown.map((r) => r.root)).size > 1;
  const anyMeaning = shown.some((r) => r.entry.meaning);

  const head = [
    "Name",
    "Devanagari",
    ...(mixedGender ? ["Gender"] : []),
    mixedRoot ? "Chaldean root" : "Compound number",
    ...(anyMeaning ? ["Meaning"] : []),
  ]
    .map((h) => `<th>${esc(h)}</th>`)
    .join("");

  const body = shown
    .map((r) => {
      const planet = RULING_PLANET[r.root];
      const numeric = mixedRoot
        ? `${r.root}${planet ? ` <span style="color:var(--ink-3)">${esc(planet.glyph)} ${esc(planet.name)}</span>` : ""}`
        : String(r.compound);
      return `          <tr>
            <td>${cellLink(namePath(r.entry.name), r.entry.name)}</td>
            <td style="font-family:'Noto Sans Devanagari',serif;font-size:18px">${esc(r.devanagari)}</td>${
              mixedGender ? `\n            <td>${esc(capFirst(r.entry.gender ?? "—"))}</td>` : ""
            }
            <td class="num">${numeric}</td>${anyMeaning ? `\n            <td>${r.entry.meaning ? esc(r.entry.meaning) : "—"}</td>` : ""}
          </tr>`;
    })
    .join("\n");

  return `    <div class="table-scroll">
      <table class="data">
        <thead><tr>${head}</tr></thead>
        <tbody>
${body}
        </tbody>
      </table>
    </div>${rows.length > shown.length ? `\n    <p class="sub" style="margin-top:12px">Showing the first ${inr(shown.length)} of ${inr(rows.length)}, alphabetically. ${overflowNote}</p>` : ""}`;
}

/** Rendered only when the group actually contains an unverified meaning — on a
 *  fully verified group the caveat would be noise. */
function meaningNote(rows: LetterName[]): string {
  const anyMeaning = rows.some((r) => r.entry.meaning);
  const anyBlank = rows.some((r) => !r.entry.meaning);
  return anyMeaning && anyBlank
    ? `\n    <p class="note">A blank meaning is one we have not verified against a citable source. We would rather leave the cell empty than fill it with a plausible guess.</p>`
    : "";
}

/** Root distribution — counted across the whole group, not just the rows the
 *  table caps at, because it is a statement about the letter. */
function rootTable(rows: LetterName[]): { html: string; roots: number[] } {
  const counts = new Map<number, number>();
  for (const r of rows) counts.set(r.root, (counts.get(r.root) ?? 0) + 1);

  const ordered = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  const body = ordered
    .map(([root, count]) => {
      const planet = RULING_PLANET[root];
      const fit = INDUSTRY_FIT[root]?.good.slice(0, 3).join(", ") ?? "";
      return `          <tr>
            <td>${cellLink(numerologyPath(root), `Root ${root}`)}</td>
            <td>${planet ? `${esc(planet.glyph)} ${esc(planet.name)}` : "—"}</td>
            <td class="num">${inr(count)}</td>
            <td>${esc(fit)}</td>
          </tr>`;
    })
    .join("\n");

  return {
    roots: [...counts.keys()].sort((a, b) => a - b),
    html: `    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>Root</th><th>Ruling planet</th><th>Names</th><th>Fields traditionally favoured</th></tr></thead>
        <tbody>
${body}
        </tbody>
      </table>
    </div>`,
  };
}

interface SyllableRow {
  syllable: string;
  count: number;
  cells: PadaCell[];
}

function syllableRows(rows: LetterName[]): SyllableRow[] {
  const byS = new Map<string, SyllableRow>();
  for (const r of rows) {
    if (!r.syllable) continue;
    const existing = byS.get(r.syllable);
    if (existing) existing.count += 1;
    else byS.set(r.syllable, { syllable: r.syllable, count: 1, cells: r.cells });
  }
  return [...byS.values()].sort((a, b) => b.count - a.count || a.syllable.localeCompare(b.syllable));
}

function chakraSection(letter: string, rows: LetterName[], syls: SyllableRow[]): string {
  const unmatched = rows.filter((r) => !r.syllable).length;
  const body = syls
    .map(
      (s) => `          <tr>
            <td><strong>${esc(capFirst(s.syllable))}</strong></td>
            <td class="num">${inr(s.count)}</td>
            <td>${s.cells.map((c) => `${esc(c.symbol)} ${cellLink(nakshatraPath(c.nakshatra), c.nakshatra)} · pada ${c.pada}`).join("<br />")}</td>
            <td>${[...new Set(s.cells.map((c) => c.rashi))].map((r) => cellLink(rashiPath(r), rashiShort(r))).join(", ")}</td>
          </tr>`,
    )
    .join("\n");

  return `  <section>
    <h2>Where names starting with ${esc(letter)} sit in the Avakahada chakra</h2>
    <p class="sub">The chakra is a table of 108 syllables, not of letters — it is the opening sound that places a name, so one letter can spread across several birth stars.</p>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>Opening syllable</th><th>Names</th><th>Nakshatra</th><th>Rashi</th></tr></thead>
        <tbody>
${body}
        </tbody>
      </table>
    </div>${
      unmatched > 0
        ? `\n    <p class="sub" style="margin-top:12px">${inr(unmatched)} further ${plural(unmatched, "name", "names")} beginning with ${esc(letter)} ${plural(unmatched, "opens", "open")} on a sound the 108 syllables do not carry, so ${plural(unmatched, "it is", "they are")} not in this table.</p>`
        : ""
    }
    <p class="note">Traditionally the table runs the other way: a pandit reads the birth star and pada from the janam kundli and hands the family a syllable to start the name with. The birth chart is the authority, not the name. This is the reverse lookup, useful once you already have a name in mind.</p>
  </section>`;
}

/** Distinct Devanagari openings, e.g. अ and आ under A. Only worth a section
 *  when the letter genuinely splits — a single akshara is a tag, not a table. */
function initialBadges(rows: LetterName[]): Array<{ akshara: string; count: number }> {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!r.initial) continue;
    counts.set(r.initial, (counts.get(r.initial) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([akshara, count]) => ({ akshara, count }))
    .sort((a, b) => b.count - a.count || a.akshara.localeCompare(b.akshara));
}

function initialsSection(letter: string, initials: Array<{ akshara: string; count: number }>): string {
  const badges = initials
    .map(
      (i) =>
        `      <span class="syl" style="font-family:'Noto Sans Devanagari',Fraunces,serif">${esc(i.akshara)}<small>${inr(i.count)} ${plural(i.count, "name", "names")}</small></span>`,
    )
    .join("\n");

  return `  <section>
    <h2>${esc(letter)} in Devanagari</h2>
    <p class="sub">Roman spelling hides the vowel length that Devanagari writes out. Our transliteration engine opens these names on ${inr(initials.length)} different aksharas.</p>
    <div class="syls">
${badges}
    </div>
  </section>`;
}

/** The name-page chips. Verified meanings first, because those are the pages a
 *  reader following "what does it mean" is actually looking for. */
function sampleLinks(rows: LetterName[]): string {
  const ordered = [...rows.filter((r) => r.entry.meaning), ...rows.filter((r) => !r.entry.meaning)].slice(
    0,
    MAX_SAMPLE_LINKS,
  );
  return [
    ...ordered.map((r) => `      <a href="${namePath(r.entry.name)}">${esc(r.entry.name)}</a>`),
    `      <a href="/n/">All published names</a>`,
  ].join("\n");
}

function faqSection(heading: string, faqs: Array<{ q: string; a: string }>): string {
  const html = faqs
    .map(
      (f) => `    <h3 style="font-family:Fraunces,serif;font-size:19px;font-weight:500;margin:22px 0 2px">${esc(f.q)}</h3>
    <p>${esc(f.a)}</p>`,
    )
    .join("\n");
  return `  <section class="prose">
    <h2>${esc(heading)}</h2>
${html}
  </section>`;
}

/**
 * Previous and next published letters. The alphabet does not wrap — A has no
 * predecessor — so unlike the ecliptic walk in the nakshatra cluster this stops
 * at the ends rather than looping round to Z.
 */
function neighbours(groups: LetterGroup[], letter: string): { prev?: LetterGroup; next?: LetterGroup } {
  const i = groups.findIndex((g) => g.letter === letter);
  return { prev: groups[i - 1], next: groups[i + 1] };
}

function letterGridLinks(groups: LetterGroup[], current: string): string {
  return groups
    .filter((g) => g.letter !== current)
    .map(
      (g) =>
        `      <a href="${letterPath(g.letter)}">${esc(g.letter)}<br /><span style="color:var(--ink-3);font-size:12px">${inr(g.names.length)} ${plural(g.names.length, "name", "names")}</span></a>`,
    )
    .join("\n");
}

/**
 * One closing hub rather than five separate link sections. Five <h2>s over five
 * chip rows reads as padding even when every link is real, and a block whose
 * chips came out empty — the single-letter build, a letter with no gendered
 * variant — drops out instead of leaving a heading over nothing.
 *
 * Labels may carry markup, so they are passed in already escaped.
 */
function hubSection(blocks: Array<{ label: string; html: string; grid?: boolean }>): string {
  const filled = blocks.filter((b) => b.html.trim().length > 0);
  if (filled.length === 0) return "";
  const rendered = filled
    .map(
      (b, i) => `    <p class="sub"${i > 0 ? ` style="margin-top:24px"` : ""}>${b.label}</p>
    <div class="${b.grid ? "grid-links" : "related"}">
${b.html}
    </div>`,
    )
    .join("\n");

  return `  <section class="hub-sec">
    <h2>Where to go next</h2>
${rendered}
  </section>`;
}

function itemListLd(name: string, rows: LetterName[], siteOrigin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: rows.length,
    itemListElement: rows.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: r.entry.name,
      url: `${siteOrigin}${namePath(r.entry.name)}`,
    })),
  };
}

function faqLd(faqs: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

// ── The letter page ─────────────────────────────────────────────────────

function renderLetterPage(
  g: LetterGroup,
  groups: LetterGroup[],
  genderPublished: Set<string>,
  siteOrigin: string,
): SeoDoc {
  const { letter } = g;
  const path = letterPath(letter);
  const total = g.names.length;
  const boys = g.byGender.boy;
  const girls = g.byGender.girl;
  const verified = g.names.filter((r) => r.entry.meaning);
  const initials = initialBadges(g.names);
  const syls = syllableRows(g.names);
  const { html: rootHtml, roots } = rootTable(g.names);

  const genderCounts = [
    boys.length ? `${inr(boys.length)} boys'` : "",
    girls.length ? `${inr(girls.length)} girls'` : "",
    g.unisex.length ? `${inr(g.unisex.length)} unisex` : "",
  ].filter(Boolean);

  // The title says "meanings" only when the page carries some — a title that
  // promises a meaning column the page does not have is the small lie the whole
  // product exists not to tell.
  const title = verified.length
    ? `Baby names starting with ${letter} — ${inr(total)} Indian names with meanings, Devanagari and numerology | Naam Dekho`
    : `Baby names starting with ${letter} — ${inr(total)} Indian names with Devanagari and Chaldean numerology | Naam Dekho`;

  const metaDesc =
    `${inr(total)} published Indian names beginning with ${letter}` +
    `${genderCounts.length ? ` (${listJoin(genderCounts)})` : ""}, each with its Devanagari spelling, ` +
    `its Chaldean root number and the nakshatra syllable its first sound belongs to` +
    `${
      verified.length === 0
        ? "."
        : verified.length === total
          ? `. Every meaning shown is verified against a citable source.`
          : `. Meanings shown for the ${inr(verified.length)} of them we have verified.`
    }`;

  // ── Name groups. Gender is the split a parent scanning a letter actually
  //    wants; the root split is the gendered pages' spine, so the two page
  //    types never present the same list the same way. ──────────────────
  const genderSections = (
    [
      { rows: boys, label: "Boys' names", gender: "boy" as Gendered },
      { rows: girls, label: "Girls' names", gender: "girl" as Gendered },
    ] as const
  )
    .filter((s) => s.rows.length > 0)
    .map((s) => {
      // The gendered page caps each of its root groups at the same number, so
      // it only shows the whole list when no single root runs past the cap.
      // Promising "all 51 are over there" when the other page also truncates
      // would be a small lie in a link label.
      const genderedShowsAll = [...new Set(s.rows.map((r) => r.root))].every(
        (root) => s.rows.filter((r) => r.root === root).length <= MAX_ROWS_PER_GROUP,
      );
      const overflow = genderPublished.has(`${s.gender}:${letter}`)
        ? `${genderedShowsAll ? `All ${inr(s.rows.length)} are` : `More of them are`} on the <a href="${genderPath(s.gender, letter)}">${GENDER_LABEL[s.gender].adjective} names starting with ${esc(letter)}</a> page, grouped by Chaldean root.`
        : `The <a href="/n/">full name index</a> carries the rest.`;
      return `    <h3 id="${s.gender}" style="font-family:Fraunces,serif;font-size:20px;font-weight:500;margin:28px 0 4px">${esc(s.label)} starting with ${esc(letter)}</h3>
    <p class="sub">${inr(s.rows.length)} ${plural(s.rows.length, "name", "names")}, alphabetically.</p>
${namesTable(s.rows, overflow)}`;
    })
    .join("\n");

  const unisexSection = g.unisex.length
    ? `    <h3 id="unisex" style="font-family:Fraunces,serif;font-size:20px;font-weight:500;margin:28px 0 4px">Unisex names starting with ${esc(letter)}</h3>
    <p class="sub">${inr(g.unisex.length)} ${plural(g.unisex.length, "name", "names")} the corpus records as used for either.</p>
${namesTable(g.unisex, `The <a href="/n/">full name index</a> carries the rest.`)}`
    : "";

  const letterValue = CHALDEAN_MAP[letter];

  const faqs: Array<{ q: string; a: string }> = [
    {
      q: `How many Indian baby names starting with ${letter} does Naam Dekho publish?`,
      a:
        `${inr(total)}${genderCounts.length ? ` — ${listJoin(genderCounts)}` : ""}. ` +
        `Each has its own page carrying the name in ten Indian scripts, its Chaldean reading and its short forms. ` +
        `The list is what our corpus actually holds and it grows as the corpus does; nothing is padded to make the letter look fuller.`,
    },
    {
      q: `Which nakshatra do names starting with ${letter} belong to?`,
      a: syls.length
        ? `The letter does not decide it — the opening sound does. Names on this page open on ${listJoin(syls.slice(0, 8).map((s) => capFirst(s.syllable)))}` +
          `${syls.length > 8 ? ` and ${inr(syls.length - 8)} more` : ""}, which the Avakahada chakra places in ` +
          `${listJoin([...new Set(syls.flatMap((s) => s.cells.map((c) => c.nakshatra)))].slice(0, 6))}` +
          `. A child's actual birth star comes from the Moon's position in the janam kundli, not from the spelling of a name.`
        : `None of the names on this page open on one of the chakra's 108 syllables, so the table places none of them. A child's birth star comes from the Moon's position in the janam kundli in any case, not from the spelling of a name.`,
    },
    {
      q: `Do all names starting with ${letter} share the same numerology number?`,
      a:
        `No. Chaldean numerology values every letter of the spelling, not just the first` +
        `${letterValue ? `: ${letter} is worth ${letterValue}, and the rest of the name decides the total` : ""}. ` +
        `The ${inr(total)} names here fall across ${inr(roots.length)} different root ${plural(roots.length, "number", "numbers")} — ${listJoin(roots.map(String))} — ` +
        `so two names beginning with ${letter} can carry completely different readings.`,
    },
    ...(initials.length > 1
      ? [
          {
            q: `How is a name starting with ${letter} written in Hindi?`,
            a:
              `Not always the same way. These names open on ${inr(initials.length)} different Devanagari aksharas — ` +
              `${listJoin(initials.map((i) => `${i.akshara} (${inr(i.count)})`))} — because Devanagari writes the vowel length that roman spelling only hints at. ` +
              `Every name page shows the full spelling in Hindi, Marathi, Bengali, Tamil, Telugu, Gujarati, Kannada, Malayalam, Punjabi and Odia.`,
          },
        ]
      : []),
  ];

  // ── Internal links ──────────────────────────────────────────────────
  const { prev, next } = neighbours(groups, letter);
  const neighbourChips = [
    prev ? `      <a href="${letterPath(prev.letter)}">← Names starting with ${esc(prev.letter)}</a>` : "",
    next ? `      <a href="${letterPath(next.letter)}">Names starting with ${esc(next.letter)} →</a>` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const genderChips = GENDERS.filter((gender) => genderPublished.has(`${gender}:${letter}`))
    .map(
      (gender) =>
        `      <a href="${genderPath(gender, letter)}">${esc(GENDER_LABEL[gender].heading)} starting with ${esc(letter)}<br /><span style="color:var(--ink-3);font-size:12px">${inr(g.byGender[gender].length)} ${plural(g.byGender[gender].length, "name", "names")}</span></a>`,
    )
    .join("\n");

  const rootChips = roots
    .map(
      (root) =>
        `      <a href="${numerologyPath(root)}">Root ${root}${RULING_PLANET[root] ? ` · ${esc(RULING_PLANET[root].name)}` : ""}</a>`,
    )
    .join("\n");

  const hub = hubSection([
    {
      label: `The same letter split by gender — each page groups its names by Chaldean root`,
      html: genderChips,
      grid: true,
    },
    { label: `The letters either side of ${esc(letter)}`, html: neighbourChips },
    {
      label: `Every letter we publish. A letter gets a page once the corpus carries ${inr(MIN_NAMES)} names under it; until then its names sit in the <a href="/n/">full index</a>`,
      html: letterGridLinks(groups, letter),
      grid: true,
    },
    { label: `The ${inr(roots.length)} Chaldean root ${plural(roots.length, "number", "numbers")} these names carry`, html: rootChips },
    {
      label: `Name pages — the name in ten Indian scripts, its full Chaldean reading, the birth star its first sound belongs to, and the short forms families use`,
      html: sampleLinks(g.names),
    },
  ]);

  const body = `  <h1>Indian baby names starting with ${esc(letter)}</h1>
  <p class="lede">We publish ${inr(total)} ${plural(total, "name", "names")} beginning with ${esc(letter)}${genderCounts.length ? ` — ${esc(listJoin(genderCounts))}` : ""}. Every one is listed with the Devanagari spelling our transliteration engine produces and the Chaldean root number of its full spelling${verified.length ? `, and with its meaning where we have verified one against a citable source` : ""}.</p>
  <p class="lede">Below the lists: how these names distribute across the Chaldean root numbers, and which nakshatra syllables their opening sounds belong to.</p>

  <div class="tags">
    <span class="tag">${inr(total)} names</span>
${genderCounts.map((c) => `    <span class="tag">${esc(c)}</span>`).join("\n")}
    <span class="tag">${inr(roots.length)} root ${plural(roots.length, "number", "numbers")}</span>${verified.length ? `\n    <span class="tag">${inr(verified.length)} verified meanings</span>` : ""}
  </div>

${initials.length > 1 ? `${initialsSection(letter, initials)}\n\n` : ""}  <section>
    <h2>The ${inr(total)} names</h2>
    <p class="sub">Devanagari from our transliteration engine; the number is the Chaldean reduction of the spelling shown.</p>
${genderSections}${unisexSection ? `\n${unisexSection}` : ""}${meaningNote(g.names)}
  </section>

  <section>
    <h2>Chaldean root numbers under ${esc(letter)}</h2>
    <p class="sub">Every name above reduced by the Chaldean method — how the letter actually distributes, counted rather than asserted.</p>
${rootHtml}
  </section>

${syls.length ? `${chakraSection(letter, g.names, syls)}\n\n` : ""}${faqSection(`Questions parents ask about names starting with ${letter}`, faqs)}

${ctaBlock(
  `Thinking of one of these names for a business too?`,
  `Run a live check across domains, social handles, marketplaces, the MCA company register and all 45 trademark classes.`,
)}

${hub}`;

  return {
    path,
    html: renderSeoPage({
      title,
      metaDesc,
      path,
      siteOrigin,
      // No /names/ index is written, so the parent crumb is the /n/ index —
      // which does exist and does list every name on this page. A breadcrumb
      // must never point at a URL the build did not produce.
      crumbs: [
        { label: "Home", href: "/" },
        { label: "Baby names", href: "/n/" },
        { label: `Starting with ${letter}` },
      ],
      jsonLd: [
        faqLd(faqs),
        // Only the names a reader can actually see — an ItemList claiming rows
        // the table capped away is a structured-data mismatch.
        itemListLd(
          `Indian baby names starting with ${letter}`,
          [...boys.slice(0, MAX_ROWS_PER_GROUP), ...girls.slice(0, MAX_ROWS_PER_GROUP), ...g.unisex.slice(0, MAX_ROWS_PER_GROUP)],
          siteOrigin,
        ),
      ],
      body,
    }),
    priority: "0.8",
    changefreq: "monthly",
  };
}

// ── The gendered variant ────────────────────────────────────────────────

function renderGenderPage(
  g: LetterGroup,
  gender: Gendered,
  groups: LetterGroup[],
  genderPublished: Set<string>,
  siteOrigin: string,
): SeoDoc {
  const { letter } = g;
  const path = genderPath(gender, letter);
  const rows = g.byGender[gender];
  const label = GENDER_LABEL[gender];
  const other = gender === "boy" ? "girl" : "boy";
  const verified = rows.filter((r) => r.entry.meaning);
  const syls = syllableRows(rows);
  const { html: rootHtml, roots } = rootTable(rows);

  const title = verified.length
    ? `${label.heading} starting with ${letter} — ${inr(rows.length)} names with meanings, Devanagari and numerology | Naam Dekho`
    : `${label.heading} starting with ${letter} — ${inr(rows.length)} names with Devanagari and Chaldean numerology | Naam Dekho`;

  const metaDesc =
    `${inr(rows.length)} published ${label.adjective} names beginning with ${letter}, grouped by Chaldean root number ` +
    `and listed with their Devanagari spellings` +
    `${verified.length ? ` and the ${inr(verified.length)} meanings we have verified` : ""}.`;

  /**
   * The root grouping is deliberate. This page is a subset of the letter page,
   * which already lists these names alphabetically under a "Boys' names"
   * heading — reprinting that same list under a different <h1> would be two
   * URLs competing on identical content. Grouped by root, the subset answers a
   * question the parent page cannot: which of these names carry which reading.
   */
  const rootGroups = roots
    .map((root) => {
      const inRoot = rows.filter((r) => r.root === root);
      const planet = RULING_PLANET[root];
      const fit = INDUSTRY_FIT[root]?.good.slice(0, 4).join(", ") ?? "";
      return `    <h3 id="root-${root}" style="font-family:Fraunces,serif;font-size:20px;font-weight:500;margin:28px 0 4px">Root ${root}${planet ? ` — ${esc(planet.glyph)} ${esc(planet.name)}` : ""}</h3>
    <p class="sub">${inr(inRoot.length)} ${plural(inRoot.length, "name", "names")}${fit ? ` · traditionally favoured for ${esc(fit)}` : ""} · <a href="${numerologyPath(root)}">what root ${root} means</a></p>
${namesTable(inRoot, `The <a href="/n/">full name index</a> carries the rest.`)}`;
    })
    .join("\n");

  const unisexLine = g.unisex.length
    ? `A further ${inr(g.unisex.length)} ${plural(g.unisex.length, "name", "names")} beginning with ${letter} are recorded as unisex and are listed on the letter page rather than here.`
    : "";

  const faqs: Array<{ q: string; a: string }> = [
    {
      q: `How many ${label.adjective} names starting with ${letter} are on this page?`,
      a:
        `${inr(rows.length)}, out of ${inr(g.names.length)} published names beginning with ${letter}. ` +
        `The gender is the one our corpus records for the name in common Indian usage, not a rule about who may carry it. ` +
        `${unisexLine}`.trim(),
    },
    {
      q: `Which numerology numbers do these names carry?`,
      a:
        `${roots.length === 9 ? `All nine Chaldean roots are represented — ${listJoin(roots.map(String))}` : `They fall across ${inr(roots.length)} of the nine Chaldean roots — ${listJoin(roots.map(String))}`}. ` +
        `The root is the reduction of the whole spelling, so it changes with the spelling: a name written with a doubled vowel and the same name without one can reduce differently, ` +
        `which is worth checking before the spelling goes on a birth certificate.`,
    },
    ...(syls.length
      ? [
          {
            q: `Does a ${label.possessive}'s name have to start with the birth-star syllable?`,
            a:
              `It is a convention, not a rule. The pandit reads the Moon's nakshatra and pada from the janam kundli and gives the family a syllable; plenty of families treat it as a shortlist and plenty choose the name they love regardless. ` +
              `The names here open on ${listJoin(syls.slice(0, 6).map((s) => capFirst(s.syllable)))}${syls.length > 6 ? ` and ${inr(syls.length - 6)} more` : ""}, and the table below shows which star each of those sounds belongs to.`,
          },
        ]
      : []),
  ];

  // ── Internal links ──────────────────────────────────────────────────
  // Neighbouring letters point at the same-gender page when one was published
  // and at the letter page when it was not, so a reader following the row never
  // lands on a URL this build did not write.
  const { prev, next } = neighbours(groups, letter);
  const neighbourChip = (n: LetterGroup | undefined, arrow: "prev" | "next") => {
    if (!n) return "";
    const hasGendered = genderPublished.has(`${gender}:${n.letter}`);
    const href = hasGendered ? genderPath(gender, n.letter) : letterPath(n.letter);
    const text = hasGendered
      ? `${label.heading} starting with ${n.letter}`
      : `Names starting with ${n.letter}`;
    return arrow === "prev"
      ? `      <a href="${href}">← ${esc(text)}</a>`
      : `      <a href="${href}">${esc(text)} →</a>`;
  };
  const neighbourChips = [neighbourChip(prev, "prev"), neighbourChip(next, "next")]
    .filter(Boolean)
    .join("\n");

  const otherGenderChip = genderPublished.has(`${other}:${letter}`)
    ? `\n      <a href="${genderPath(other, letter)}">${esc(GENDER_LABEL[other].heading)} starting with ${esc(letter)} · ${inr(g.byGender[other].length)}</a>`
    : "";

  const hub = hubSection([
    {
      label: `The rest of the letter`,
      html: `      <a href="${letterPath(letter)}">All ${inr(g.names.length)} names starting with ${esc(letter)}</a>${otherGenderChip}`,
    },
    { label: `The letters either side of ${esc(letter)}`, html: neighbourChips },
    {
      label: `Every letter we publish. A letter gets a page once the corpus carries ${inr(MIN_NAMES)} names under it; until then its names sit in the <a href="/n/">full index</a>`,
      html: letterGridLinks(groups, letter),
      grid: true,
    },
    {
      label: `Name pages — the name in ten Indian scripts, its full Chaldean reading, the birth star its first sound belongs to, and the short forms families use`,
      html: sampleLinks(rows),
    },
  ]);

  const body = `  <h1>${esc(label.heading)} starting with ${esc(letter)}</h1>
  <p class="lede">${inr(rows.length)} of the ${inr(g.names.length)} names we publish under ${esc(letter)} are recorded as ${esc(label.adjective)} names. They are grouped below by Chaldean root number, with the Devanagari spelling our transliteration engine produces for each${verified.length ? ` and the meaning where we have verified one` : ""}.</p>
  <p class="lede">The full letter — ${esc(listJoin([label.adjective, GENDER_LABEL[other].adjective, ...(g.unisex.length ? ["unisex"] : [])]))} together — is on <a href="${letterPath(letter)}">names starting with ${esc(letter)}</a>.</p>

  <div class="tags">
    <span class="tag">${inr(rows.length)} ${esc(label.adjective)} names</span>
    <span class="tag">${inr(roots.length)} root ${plural(roots.length, "number", "numbers")}</span>${syls.length ? `\n    <span class="tag">${inr(syls.length)} chakra ${plural(syls.length, "syllable", "syllables")}</span>` : ""}${verified.length ? `\n    <span class="tag">${inr(verified.length)} verified meanings</span>` : ""}
  </div>

  <section>
    <h2>${inr(rows.length)} ${esc(label.adjective)} names, by Chaldean root</h2>
    <p class="sub">The root number is the Chaldean reduction of the whole spelling — the same calculation the live check runs, applied to the spelling shown.</p>
${rootGroups}${meaningNote(rows)}
  </section>

  <section>
    <h2>How the roots distribute</h2>
    <p class="sub">Counted across all ${inr(rows.length)} names on this page.</p>
${rootHtml}
  </section>

${syls.length ? `${chakraSection(letter, rows, syls)}\n\n` : ""}${faqSection(`Questions parents ask`, faqs)}

${ctaBlock(
  `Using the name for a business as well?`,
  `Run a live check across domains, social handles, marketplaces, the MCA company register and all 45 trademark classes.`,
)}

${hub}`;

  return {
    path,
    html: renderSeoPage({
      title,
      metaDesc,
      path,
      siteOrigin,
      crumbs: [
        { label: "Home", href: "/" },
        { label: "Baby names", href: "/n/" },
        { label: `Starting with ${letter}`, href: letterPath(letter) },
        { label: label.heading },
      ],
      jsonLd: [
        faqLd(faqs),
        itemListLd(
          `${label.heading} starting with ${letter}`,
          roots.flatMap((root) => rows.filter((r) => r.root === root).slice(0, MAX_ROWS_PER_GROUP)),
          siteOrigin,
        ),
      ],
      body,
    }),
    // Lower than the letter page: this is the subset, and the letter page is
    // the canonical entry point for everything under it.
    priority: "0.7",
    changefreq: "monthly",
  };
}

// ── Entry point ─────────────────────────────────────────────────────────

/**
 * Two passes, deliberately. Which letters and which gendered variants clear the
 * thresholds has to be known before any page renders, because every page links
 * to its neighbours — linking a letter the build then skipped would put an
 * internal 404 on every page in the cluster.
 */
export function buildLetterPages(ctx: SeoCtx): SeoDoc[] {
  const buckets = new Map<string, LetterName[]>();
  for (const entry of ctx.corpus) {
    const letter = firstLetter(entry.name);
    if (!letter) continue;
    const list = buckets.get(letter) ?? [];
    list.push(readName(entry));
    buckets.set(letter, list);
  }

  const groups: LetterGroup[] = [...buckets.entries()]
    .map(([letter, names]) => ({
      letter,
      names,
      byGender: {
        boy: names.filter((n) => n.entry.gender === "boy"),
        girl: names.filter((n) => n.entry.gender === "girl"),
      },
      unisex: names.filter((n) => n.entry.gender === "unisex"),
    }))
    .filter((g) => g.names.length >= MIN_NAMES)
    .sort((a, b) => a.letter.localeCompare(b.letter));

  if (groups.length === 0) return [];

  const genderPublished = new Set<string>();
  for (const g of groups) {
    for (const gender of GENDERS) {
      const rows = g.byGender[gender];
      if (rows.length < MIN_GENDER_NAMES) continue;
      if (rows.length / g.names.length > GENDER_DUPLICATE_SHARE) continue;
      genderPublished.add(`${gender}:${g.letter}`);
    }
  }

  const docs: SeoDoc[] = [];
  for (const g of groups) {
    docs.push(renderLetterPage(g, groups, genderPublished, ctx.siteOrigin));
    for (const gender of GENDERS) {
      if (genderPublished.has(`${gender}:${g.letter}`)) {
        docs.push(renderGenderPage(g, gender, groups, genderPublished, ctx.siteOrigin));
      }
    }
  }
  return docs;
}
