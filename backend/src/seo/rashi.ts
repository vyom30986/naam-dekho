import { RULING_PLANET, INDUSTRY_FIT, chaldean } from "../lib/numerology.js";
import { NAKSHATRAS, RASHI_NAMES } from "../scanners/astro.js";
import { romanToDevanagari } from "../lib/transliterate.js";
import { julianDay, lahiriAyanamsa } from "../lib/moon.js";
import { slugify } from "../scripts/name-corpus.js";
import { esc, seoSlug, renderSeoPage, ctaBlock, type SeoCtx, type SeoDoc } from "./shell.js";

/**
 * The rashi cluster — one page per moon sign, /rashi/<key>.html.
 *
 * Two queries share one page: "Mesha rashi baby names" and "Aries baby names
 * in Hindi". They are the same question asked in two vocabularies, so the page
 * names the Western sign and then says plainly where the two systems part
 * company — which is the answer a parent comparing a newspaper sun sign with a
 * pandit's reading actually needs.
 *
 * Nothing here is a hand-written list. A rashi is defined by the padas that
 * fall inside it, so the syllables, the nakshatras and the names are all
 * derived from NAKSHATRAS at build time; if a pada's rashi is ever corrected
 * in astro.ts, these twelve pages follow it without an edit.
 */

/**
 * Below this many corpus names a rashi page is not emitted.
 *
 * The page's title promises names for the sign, and with fewer than six the
 * names table is not a table — what would be left is the nine-pada grid, and
 * the three nakshatra pages this page links to already carry that in more
 * detail. A doorway page pointing at better pages is worth less than nothing.
 * With the built-in fallback corpus this cluster therefore emits fewer than
 * twelve pages; that is intended — pages appear as the corpus grows.
 */
const MIN_CORPUS_NAMES = 6;

/* Mirrors MIN_NAMES in seo/nakshatra.ts. Kept as a named constant rather
   than a bare 1 so the coupling is greppable from both sides. */
const NAKSHATRA_MIN_NAMES = 1;

/** Rows in the names table before it stops being something a person reads. */
const MAX_NAME_ROWS = 48;

/**
 * Cross-cluster paths. Written once so a convention change is one edit rather
 * than thirty string literals scattered through the template.
 */
const nakshatraPath = (name: string) => `/nakshatra/${seoSlug(name)}.html`;
const numerologyPath = (root: number) => `/numerology/number-${root}.html`;
const rashiPath = (key: string) => `/rashi/${key}.html`;

/** Insertion order in RASHI_NAMES is zodiac order — the neighbours depend on it. */
type RashiKey = keyof typeof RASHI_NAMES;
const RASHI_KEYS = Object.keys(RASHI_NAMES) as RashiKey[];

interface PadaCell {
  nakshatra: string;
  symbol: string;
  /** 1-based, as a pandit counts them. */
  pada: number;
  syllable: string;
  /** The full label, e.g. "Mesha (Aries)" — the join key back to RASHI_NAMES. */
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

const num = (v: number) => v.toLocaleString("en-IN");
const capFirst = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Prose lists, not comma-separated data — "Ashwini, Bharani and Krittika". */
const listJoin = (parts: string[]) =>
  parts.length <= 1 ? (parts[0] ?? "") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;

/** Links inside table cells, which table.data does not style. */
const cellLink = (href: string, text: string) =>
  `<a href="${href}" style="color:var(--accent);text-decoration:none">${esc(text)}</a>`;

/**
 * The spelling normalisation scanRashi uses, repeated rather than imported —
 * its lookup is private to astro.ts. It must stay in step: a name shown under
 * Mesha here and under Vrishabha on its own /n/ page is the kind of quiet
 * contradiction that costs more trust than the page earns.
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

/**
 * Every chakra entry a name's opening sound matches. Longest prefix first, so
 * "chha" beats "cha" beats "ch" — and a syllable that sits under two stars
 * returns both, exactly as the tile does.
 */
function chakraMatches(name: string): PadaCell[] {
  const n = normaliseSyllables(name);
  if (!n) return [];
  for (let len = 4; len >= 1; len--) {
    const prefix = n.slice(0, len);
    const hits = ALL_PADAS.filter((c) => c.syllable === prefix);
    if (hits.length > 0) return hits;
  }
  return [];
}

/** "Mesha (Aries)" → the two names people search with. */
function splitLabel(label: string): { sanskrit: string; western: string } {
  const m = /^(.+?)\s*\((.+)\)$/.exec(label);
  return { sanskrit: m?.[1] ?? label, western: m?.[2] ?? "" };
}

function padaPhrase(padas: number[]): string {
  if (padas.length === 4) return "all four padas";
  if (padas.length === 1) return `pada ${padas[0]}`;
  return `padas ${listJoin(padas.map(String))}`;
}

interface RashiName {
  name: string;
  gender?: "boy" | "girl" | "unisex";
  origin?: string;
  meaning?: string;
  /** The syllable of THIS rashi the name matched on. */
  syllable: string;
  root: number;
}

interface RashiGroup {
  key: RashiKey;
  label: string;
  sanskrit: string;
  western: string;
  cells: PadaCell[];
  names: RashiName[];
}

export function buildRashiPages(ctx: SeoCtx): SeoDoc[] {
  // One pass over the corpus; all twelve pages read the same lookup.
  const matched = ctx.corpus.map((entry) => ({ entry, cells: chakraMatches(entry.name) }));

  const groups: RashiGroup[] = RASHI_KEYS.map((key) => {
    const label = RASHI_NAMES[key];
    const { sanskrit, western } = splitLabel(label);
    const names: RashiName[] = [];
    for (const m of matched) {
      const cell = m.cells.find((c) => c.rashi === label);
      if (!cell) continue;
      names.push({ ...m.entry, syllable: cell.syllable, root: chaldean(m.entry.name).root });
    }
    return { key, label, sanskrit, western, cells: ALL_PADAS.filter((c) => c.rashi === label), names };
  });

  // Resolved before rendering so no page can link to a sibling that the
  // threshold dropped — an internal 404 is worse than a missing link.
  const emitted = new Set(groups.filter((g) => g.names.length >= MIN_CORPUS_NAMES).map((g) => g.key));

  /*
   * The same guard, for the cluster next door. Every rashi page links the
   * three nakshatras that span it, and seo/nakshatra.ts drops any star that
   * no corpus name reaches — today Vishakha and Uttara Bhadrapada. Linking
   * them anyway put two 404s on the Tula and Vrishchika pages.
   *
   * The test is nakshatra.ts's MIN_NAMES = 1 applied to the same chakra
   * match this file already ran over the whole corpus, so the two cannot
   * disagree about a given star without disagreeing about a given name.
   */
  const starNameCount = new Map<string, number>();
  for (const m of matched) {
    for (const star of new Set(m.cells.map((c) => c.nakshatra))) {
      starNameCount.set(star, (starNameCount.get(star) ?? 0) + 1);
    }
  }
  const starPublished = new Set(
    [...starNameCount.entries()].filter(([, n]) => n >= NAKSHATRA_MIN_NAMES).map(([star]) => star),
  );

  return groups
    .filter((g) => emitted.has(g.key))
    .map((g) => renderRashiPage(g, groups, emitted, starPublished, ctx.siteOrigin));
}

function renderRashiPage(
  g: RashiGroup,
  all: RashiGroup[],
  emitted: Set<RashiKey>,
  starPublished: Set<string>,
  siteOrigin: string,
): SeoDoc {
  const path = rashiPath(g.key);
  const syllables = [...new Set(g.cells.map((c) => c.syllable))];
  const shown = g.names.slice(0, MAX_NAME_ROWS);
  const truncated = g.names.length > shown.length;

  // Nakshatras in zodiac order, each with the padas it contributes here.
  const byNakshatra: Array<{ name: string; symbol: string; padas: number[] }> = [];
  for (const c of g.cells) {
    const last = byNakshatra[byNakshatra.length - 1];
    if (last && last.name === c.nakshatra) last.padas.push(c.pada);
    else byNakshatra.push({ name: c.nakshatra, symbol: c.symbol, padas: [c.pada] });
  }

  const namesPerSyllable = new Map<string, number>();
  for (const n of g.names) namesPerSyllable.set(n.syllable, (namesPerSyllable.get(n.syllable) ?? 0) + 1);

  const idx = RASHI_KEYS.indexOf(g.key);
  const prev = all[(idx + RASHI_KEYS.length - 1) % RASHI_KEYS.length];
  const next = all[(idx + 1) % RASHI_KEYS.length];

  const title =
    `${g.sanskrit} rashi${g.western ? ` (${g.western})` : ""} baby names — ` +
    `${num(syllables.length)} chakra syllables and ${num(g.names.length)} names | Naam Dekho`;

  const nakList = listJoin(byNakshatra.map((n) => n.name));
  const metaDesc =
    `${g.sanskrit} rashi covers nine padas of ${nakList}. Every starting syllable the Avakahada chakra ` +
    `gives ${g.sanskrit}${g.western ? ` — the sign the Western zodiac calls ${g.western}` : ""} — plus ` +
    `${num(g.names.length)} names that begin with them, each with its Devanagari spelling and Chaldean root number.`;

  // ── Syllable badges ────────────────────────────────────────────────
  const sylBadges = g.cells
    .map(
      (c) =>
        `      <div class="syl">${esc(capFirst(c.syllable))}<small>${esc(c.nakshatra)} · pada ${c.pada}</small></div>`,
    )
    .join("\n");

  // ── Pada table ─────────────────────────────────────────────────────
  const padaRows = g.cells
    .map(
      (c) => `          <tr>
            <td>${esc(c.symbol)} ${starPublished.has(c.nakshatra) ? cellLink(nakshatraPath(c.nakshatra), c.nakshatra) : esc(c.nakshatra)}</td>
            <td class="num">${c.pada}</td>
            <td>${esc(capFirst(c.syllable))}</td>
            <td class="num">${num(namesPerSyllable.get(c.syllable) ?? 0)}</td>
          </tr>`,
    )
    .join("\n");

  // ── Names table ────────────────────────────────────────────────────
  const anyMeaning = shown.some((n) => n.meaning);
  const anyBlankMeaning = anyMeaning && shown.some((n) => !n.meaning);
  const nameRows = shown
    .map((n) => {
      const planet = RULING_PLANET[n.root];
      const deva = romanToDevanagari(n.name);
      return `          <tr>
            <td>${cellLink(`/n/${slugify(n.name)}.html`, n.name)}</td>
            <td style="font-family:'Noto Sans Devanagari',serif;font-size:18px">${esc(deva)}</td>
            <td>${esc(capFirst(n.syllable))}</td>
            <td class="num">${n.root}${planet ? ` <span style="color:var(--ink-3)">${esc(planet.glyph)}</span>` : ""}</td>${
              anyMeaning ? `\n            <td>${esc(n.meaning ?? "")}</td>` : ""
            }
          </tr>`;
    })
    .join("\n");

  // ── Root-number distribution ───────────────────────────────────────
  const rootCounts = new Map<number, number>();
  for (const n of g.names) rootCounts.set(n.root, (rootCounts.get(n.root) ?? 0) + 1);
  const rootRows = [...rootCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .map(([root, count]) => {
      const planet = RULING_PLANET[root];
      const fit = INDUSTRY_FIT[root]?.good.slice(0, 3).join(", ") ?? "";
      return `          <tr>
            <td>${cellLink(numerologyPath(root), `Root ${root}`)}</td>
            <td>${planet ? `${esc(planet.glyph)} ${esc(planet.name)}` : "—"}</td>
            <td class="num">${num(count)}</td>
            <td>${esc(fit)}</td>
          </tr>`;
    })
    .join("\n");

  // ── FAQ ────────────────────────────────────────────────────────────
  // Sidereal minus tropical, from the product's own ayanamsa function, so the
  // gap between the two zodiacs is a computed figure rather than a rounded
  // number copied off a forum.
  const ayanamsa = lahiriAyanamsa(julianDay(new Date())).toFixed(1);

  const faqs: Array<{ q: string; a: string }> = [
    {
      q: `Which nakshatras come under ${g.sanskrit} rashi?`,
      a:
        `${listJoin(byNakshatra.map((n) => `${n.name} (${padaPhrase(n.padas)})`))}. ` +
        `A rashi spans 30° and a nakshatra 13°20′, so every rashi works out to two and a quarter ` +
        `nakshatras — nine padas in all.`,
    },
    {
      q: `Which letters should a ${g.sanskrit} baby's name start with?`,
      a:
        `By the Avakahada chakra: ${listJoin(syllables.map(capFirst))}. All ${num(syllables.length)} belong ` +
        `to the rashi; the pada the child was actually born in narrows it to a single sound, and that comes ` +
        `from the birth chart, not from this list.`,
    },
    ...(g.western
      ? [
          {
            q: `Is ${g.sanskrit} rashi the same as ${g.western}?`,
            a:
              `They name the same 30° of the zodiac, and ${g.sanskrit} is normally translated as ${g.western}. ` +
              `They are not interchangeable in practice. Rashi in the Indian tradition is the Moon's sign measured ` +
              `against the fixed stars (Lahiri ayanamsa); a Western sun sign is the Sun's position measured against ` +
              `the equinox. The two zodiacs currently sit about ${ayanamsa}° apart, so a baby who is ${g.western} by ` +
              `the newspaper column is very often not ${g.sanskrit} rashi at all.`,
          },
        ]
      : []),
    {
      q: `Does the name decide the rashi?`,
      a:
        `No — the birth chart does. The chakra runs the other way: a pandit reads the Moon's nakshatra and pada ` +
        `from the janam kundli and hands the family a syllable to start the name with. Read in reverse, as this ` +
        `page reads it, a syllable tells you which star the sound belongs to and nothing about your child.`,
    },
    {
      q: `Must the name follow the rashi syllable?`,
      a:
        `It is a tradition, not a rule. Plenty of families take the syllable as a shortlist and plenty choose the ` +
        `name they love regardless; both are ordinary. Where it does matter is the namkaran ceremony, which is why ` +
        `the sound usually comes from the pandit before the shortlist is drawn up.`,
    },
  ];

  const faqHtml = faqs
    .map(
      (f) => `    <h3 style="font-family:Fraunces,serif;font-size:19px;font-weight:500;margin:22px 0 2px">${esc(f.q)}</h3>
    <p>${esc(f.a)}</p>`,
    )
    .join("\n");

  // ── Internal links ─────────────────────────────────────────────────
  const nakshatraLinks = byNakshatra
    .filter((n) => starPublished.has(n.name))
    .map(
      (n) =>
        `      <a href="${nakshatraPath(n.name)}">${esc(n.symbol)} ${esc(n.name)} — ${esc(padaPhrase(n.padas))}</a>`,
    )
    .join("\n");

  const siblingLinks = all
    .filter((o) => o.key !== g.key && emitted.has(o.key))
    .map((o) => `      <a href="${rashiPath(o.key)}">${esc(o.label)}</a>`)
    .join("\n");

  const rootPills = [...rootCounts.keys()]
    .sort((a, b) => a - b)
    .map(
      (root) =>
        `      <a href="${numerologyPath(root)}">Root ${root}${RULING_PLANET[root] ? ` · ${esc(RULING_PLANET[root].name)}` : ""}</a>`,
    )
    .join("\n");

  const neighbourLine = [prev, next]
    .map((o) => (emitted.has(o.key) ? `<a href="${rashiPath(o.key)}">${esc(o.sanskrit)}</a>` : esc(o.sanskrit)))
    .join(" before it, ");

  const body = `
  <h1>${esc(g.sanskrit)} rashi baby names</h1>
  <p class="lede">Nine padas of the Avakahada chakra fall in <strong>${esc(g.sanskrit)}</strong>${
    g.western ? `, the moon sign the Western zodiac calls ${esc(g.western)}` : ""
  }. They come from ${esc(nakList)}, and between them they give ${num(syllables.length)} sounds a name may begin with.</p>
  <p class="lede">Below: every one of those syllables with the nakshatra and pada it belongs to, and the ${num(g.names.length)} names in our corpus that begin with them — each written in Devanagari and reduced to its Chaldean root number.</p>

  <div class="tags">
    <span class="tag">${num(g.cells.length)} padas</span>
    <span class="tag">${num(byNakshatra.length)} nakshatras</span>
    <span class="tag">${num(syllables.length)} syllables</span>
    <span class="tag">${num(g.names.length)} names</span>
  </div>

  <section>
    <h2>The ${num(syllables.length)} syllables ${esc(g.sanskrit)} gives a name</h2>
    <p class="sub">One per pada. A pandit reads the pada from the birth chart and hands the family the sound — this is the whole set for the rashi.</p>
    <div class="syls">
${sylBadges}
    </div>
  </section>

  <section>
    <h2>The nakshatra padas that make up ${esc(g.sanskrit)}</h2>
    <p class="sub">A rashi spans 30° and a nakshatra 13°20′, so the two never divide evenly: every rashi is exactly two and a quarter nakshatras.</p>
    <div class="table-scroll">
      <table class="data">
        <thead>
          <tr><th>Nakshatra</th><th>Pada</th><th>Syllable</th><th>Names in our corpus</th></tr>
        </thead>
        <tbody>
${padaRows}
        </tbody>
      </table>
    </div>
    <p class="note">Traditionally this table runs the other way: the janam kundli gives the birth star, the birth star gives the syllable, and the syllable gives the name. The birth chart is the authority, not the name. We show the reverse lookup for reference.</p>
  </section>

  <section>
    <h2>${num(g.names.length)} names that begin with a ${esc(g.sanskrit)} syllable</h2>
    <p class="sub">Devanagari from our transliteration engine; the root number is the Chaldean reduction of the spelling shown.</p>
    <div class="table-scroll">
      <table class="data">
        <thead>
          <tr><th>Name</th><th>Devanagari</th><th>Syllable</th><th>Chaldean root</th>${anyMeaning ? "<th>Meaning</th>" : ""}</tr>
        </thead>
        <tbody>
${nameRows}
        </tbody>
      </table>
    </div>${
      truncated
        ? `\n    <p class="sub" style="margin-top:12px">Showing the first ${num(shown.length)} of ${num(g.names.length)}, alphabetically. <a href="/n/">The full name index</a> carries the rest.</p>`
        : ""
    }${
      anyBlankMeaning
        ? `\n    <p class="note">A blank meaning is a meaning we have not verified. We would rather leave the cell empty than fill it with a plausible guess.</p>`
        : ""
    }
  </section>

  <section>
    <h2>Chaldean root numbers across these names</h2>
    <p class="sub">Every name above reduced by the Chaldean method — how ${esc(g.sanskrit)} actually distributes, counted rather than asserted.</p>
    <div class="table-scroll">
      <table class="data">
        <thead>
          <tr><th>Root</th><th>Ruling planet</th><th>Names</th><th>Fields traditionally favoured</th></tr>
        </thead>
        <tbody>
${rootRows}
        </tbody>
      </table>
    </div>
  </section>

  <section class="prose">
    <h2>Questions parents ask about ${esc(g.sanskrit)}</h2>
${faqHtml}
  </section>

${ctaBlock(
  `Have a name in mind for a ${g.sanskrit} baby?`,
  "Enter the date of birth and we compute the Moon's actual nakshatra and pada, instead of reading it backwards from the name.",
)}

  <section class="hub-sec">
    <h2>Where to go next</h2>
    <p class="sub">The ${num(byNakshatra.length)} nakshatras that fall in ${esc(g.sanskrit)}</p>
    <div class="grid-links">
${nakshatraLinks}
    </div>

    <p class="sub" style="margin-top:24px">The other rashis — ${neighbourLine} after it in the zodiac</p>
    <div class="grid-links">
${siblingLinks}
    </div>

    <p class="sub" style="margin-top:24px">The root numbers these names carry</p>
    <div class="related">
${rootPills}
    </div>
  </section>
`;

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  // Only the names actually printed on the page — an ItemList that claims rows
  // a reader cannot see is a structured-data mismatch.
  const listLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${g.sanskrit} rashi baby names`,
    numberOfItems: shown.length,
    itemListElement: shown.map((n, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: n.name,
      url: `${siteOrigin}/n/${slugify(n.name)}.html`,
    })),
  };

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
        { label: `${g.sanskrit} rashi` },
      ],
      jsonLd: [faqLd, listLd],
      body,
    }),
    priority: "0.8",
    changefreq: "monthly",
  };
}
