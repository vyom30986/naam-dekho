import { RULING_PLANET, chaldean } from "../lib/numerology.js";
import { normaliseName } from "../lib/normalise.js";
import { SCRIPT_TARGETS, devanagariToScripts, romanToDevanagari } from "../lib/transliterate.js";
import { NAKSHATRAS, RASHI_NAMES } from "../scanners/astro.js";
import { TLDS } from "../scanners/domain.js";
import { slugify } from "../scripts/name-corpus.js";
import { ctaBlock, esc, renderSeoPage, seoSlug } from "./shell.js";
import type { SeoCtx, SeoDoc } from "./shell.js";

/**
 * The cross-linking spine: /explore/ and one index per cluster.
 *
 * Every other cluster in this directory publishes pages that link sideways to
 * their own siblings and down to the /n/ name pages, and almost none of them
 * has anything linking IN. A cluster reachable only from itself is a set of
 * orphans: the crawler finds it late or not at all, none of the pages
 * accumulate internal links, and none of them rank. These six pages are the
 * inbound half — one entry point per cluster, and one page above them all that
 * carries the whole surface.
 *
 * They are index pages, which is the shape rule 2 exists to be suspicious of.
 * So none of them is only a list of links: the nakshatra index carries the
 * full 108-syllable lookup, the rashi index the sign-by-sign pada spans, the
 * domain index the fourteen prices compared against each other, the script
 * index the corpus measured through the transliteration engine, and the name
 * index the letter and origin distributions. Every one of those is computed
 * here at build time from the same data the live product runs on. If a page
 * would have been a heading over a link grid it is not emitted at all — see
 * the guards in buildHubPages().
 *
 * ── TWO DEVIATIONS FROM THE BRIEF, BOTH DELIBERATE ───────────────────
 *
 * 1. There is NO /trademark-class/index.html here. seo/trademark.ts already
 *    emits one at exactly that path, all 45 class pages name it as their
 *    breadcrumb parent, and seo/domains.ts has been linking to it from
 *    fourteen pages. Emitting a second SeoDoc on the same path would make the
 *    file that the build writes last the one that wins — a coin toss between a
 *    thorough hub and a thinner copy of it. This file links that hub instead.
 *
 * 2. The script pages are at /script/<language>.html, not /script/<code>.html.
 *    seo/scripts.ts files each page under the slugified name of the script's
 *    most-spoken language (`seoSlug(ordered[0].name)`), because "write my name
 *    in Punjabi" is the query and "gurmukhi" is not. /script/ta.html does not
 *    exist and never did; /script/tamil.html does. It also emits nine pages,
 *    not ten: Hindi and Marathi share Devanagari and share one page.
 */

type CorpusEntry = SeoCtx["corpus"][number];

/* ══════════════════════════════════════════════════════════════════════
 * MIRRORED PUBLISH RULES — READ BEFORE CHANGING A THRESHOLD ANYWHERE
 *
 * This file links to pages that eight other builders decide whether to emit.
 * It cannot import them: they are separate cluster modules, and importing one
 * would fix the build order between them for no benefit. So every rule that
 * decides whether a sibling page exists is reproduced below, and a hub link is
 * only ever rendered for a page the reproduced rule says will be there.
 *
 * A hub that links a page the build never wrote is an internal 404 on the one
 * page whose entire job is to be the site's map, and it is worse than not
 * linking at all — the crawler follows it, gets nothing, and reads the map as
 * unreliable. That is the failure this block exists to prevent.
 *
 * THE COUPLING, EXPLICITLY. If any of these move in their own file, they must
 * move here in the same commit:
 *
 *   seo/letters.ts      MIN_NAMES 12, MIN_GENDER_NAMES 12,
 *                       GENDER_DUPLICATE_SHARE 0.8    → LETTER_*
 *   seo/meanings.ts     MIN_NAMES 6, MAX_SUBSET_SHARE 0.8, and the whole
 *                       theme engine — STOPWORDS, WORD_FAMILIES,
 *                       DEITY_LABELS, singular(), readPhrases(), termsOf()
 *                                                     → THEME_* and the block
 *                                                       marked THEME ENGINE
 *   seo/nakshatra.ts    MIN_NAMES 1                   → NAK_MIN_NAMES
 *   seo/rashi.ts        MIN_CORPUS_NAMES 6            → RASHI_MIN_NAMES
 *   seo/numerology.ts   MIN_CORPUS_NAMES 5            → NUMBER_MIN_NAMES
 *   seo/scripts.ts      MIN_NAMES 25, SPEAKERS        → SCRIPT_MIN_NAMES,
 *                                                       SPEAKERS
 *   seo/domains.ts      isPublishable() over PROFILES → PROFILED_TLDS
 *   seo/trademark.ts    isPublishable() over the 45   → not mirrored; this
 *                                                       file links only the
 *                                                       class hub, which
 *                                                       ships whenever any
 *                                                       class page does
 *
 * The theme engine is the expensive one and it is copied rather than
 * approximated on purpose. An approximation would be right most of the time,
 * and the times it was wrong would be silent 404s discoverable only in Search
 * Console weeks later. A verbatim copy is wrong only when somebody edits one
 * copy, which is a thing a reviewer can see in a diff.
 * ══════════════════════════════════════════════════════════════════════ */

const LETTER_MIN_NAMES = 12;
const LETTER_MIN_GENDER_NAMES = 12;
const LETTER_GENDER_DUPLICATE_SHARE = 0.8;
const THEME_MIN_NAMES = 6;
const THEME_MAX_SUBSET_SHARE = 0.8;
const NAK_MIN_NAMES = 1;
const RASHI_MIN_NAMES = 6;
const NUMBER_MIN_NAMES = 5;
const SCRIPT_MIN_NAMES = 25;

/**
 * The endings seo/domains.ts has written a profile for.
 *
 * That cluster's threshold is a completeness test over a hand-written table
 * this file cannot see — an ending publishes when somebody has decided who it
 * suits, who it does not, and what question it raises. All fourteen currently
 * in TLDS clear it. Adding a fifteenth to TLDS is a one-line edit and it will
 * appear in the price table below on the next build, correctly priced and
 * unlinked, until it is added here and profiled there.
 */
const PROFILED_TLDS = new Set([
  "com", "in", "co.in", "org", "net", "io", "ai", "co", "dev", "app", "store", "shop", "tech", "xyz",
]);

/**
 * First-language speakers in India, Census of India 2011 — the table
 * seo/scripts.ts orders each script's languages with.
 *
 * Copied because the ORDER decides the URL: a script page is filed under its
 * most-spoken language, so Devanagari is /script/hindi.html rather than
 * /script/marathi.html. Getting the order wrong here would not produce a
 * wrong-looking page, it would produce a link to a file that does not exist.
 */
const SPEAKERS: Record<string, number> = {
  Hindi: 528347193,
  Bengali: 97237669,
  Marathi: 83026680,
  Telugu: 81127740,
  Tamil: 69026881,
  Gujarati: 55492554,
  Kannada: 43706512,
  Odia: 37521324,
  Malayalam: 34838819,
  Punjabi: 33124726,
};

// ── Paths ───────────────────────────────────────────────────────────────

const EXPLORE_PATH = "/explore/index.html";
const NAK_INDEX_PATH = "/nakshatra/index.html";
const RASHI_INDEX_PATH = "/rashi/index.html";
const DOMAIN_INDEX_PATH = "/domains/index.html";
const SCRIPT_INDEX_PATH = "/script/index.html";
const NAMES_INDEX_PATH = "/names/index.html";

/** Owned by other clusters. Both ship whenever any page of theirs does. */
const NUMEROLOGY_HUB = "/numerology/index.html";
const TRADEMARK_HUB = "/trademark-class/index.html";
/** Written by scripts/build-name-pages.ts, which lists every published name. */
const NAME_INDEX = "/n/";

const letterPath = (letter: string) => `/names/starting-with-${letter.toLowerCase()}.html`;
const genderLetterPath = (gender: string, letter: string) =>
  `/names/${gender}-starting-with-${letter.toLowerCase()}.html`;
const themePath = (slug: string) => `/names/meaning-${slug}.html`;
const nakshatraPath = (name: string) => `/nakshatra/${seoSlug(name)}.html`;
const rashiPath = (key: string) => `/rashi/${key}.html`;
const numberPath = (root: number) => `/numerology/number-${root}.html`;
const domainPath = (tld: string) => `/domains/${seoSlug(tld)}.html`;
const scriptPath = (slug: string) => `/script/${slug}.html`;
const namePath = (name: string) => `/n/${slugify(name)}.html`;

// ── Small formatting helpers ────────────────────────────────────────────

/* Copied into each cluster file rather than lifted into shell.ts, which is the
   shared contract and not ours to extend. */
const inr = (n: number) => n.toLocaleString("en-IN");
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

function joinList(items: string[], conjunction: "and" | "or"): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} ${conjunction} ${items[items.length - 1]}`;
}
const joinAnd = (items: string[]) => joinList(items, "and");

/** table.data does not style links, so cell links carry the accent inline. */
const cellLink = (href: string, text: string) =>
  `<a href="${href}" style="color:var(--accent);text-decoration:none">${esc(text)}</a>`;

interface GridItem {
  href: string;
  label: string;
  /** The count or gloss under the label — what makes a link grid readable. */
  sub?: string;
}

const gridLinks = (items: GridItem[]) =>
  items
    .map(
      (i) =>
        `        <a href="${i.href}">${esc(i.label)}${
          i.sub ? `<br /><span style="color:var(--ink-3);font-size:12px">${esc(i.sub)}</span>` : ""
        }</a>`,
    )
    .join("\n");

interface Faq {
  q: string;
  a: string;
}

/* Rendered once from one array so the visible answers and the FAQPage markup
   cannot say different things — the mismatch structured-data validators
   actually penalise. */
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

const itemListLd = (name: string, items: Array<{ name: string; url: string }>) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name,
  numberOfItems: items.length,
  itemListElement: items.map((it, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: it.name,
    url: it.url,
  })),
});

// ── The chakra, read the way every cluster reads it ──────────────────────

/**
 * Mirrors normaliseSyllables() in scanners/astro.ts, which does not export it.
 * seo/nakshatra.ts, seo/rashi.ts, seo/numerology.ts and seo/scripts.ts all
 * carry the same copy for the same reason: a name counted under Krittika here
 * and under Rohini on its own page is a contradiction a reader will find.
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

interface PadaCell {
  /** Position in the 108, so the sidereal arc is arithmetic rather than a table. */
  index: number;
  nakshatra: number;
  pada: number;
  syllable: string;
  rashi: string;
}

const ALL_PADAS: PadaCell[] = NAKSHATRAS.flatMap((nk, n) =>
  nk.padas.map((p, i) => ({
    index: n * 4 + i,
    nakshatra: n,
    pada: i + 1,
    syllable: p.syl,
    rashi: p.rashi,
  })),
);

/** Longest prefix first, so "chha" beats "cha" beats "ch" — the rule
 *  scanRashi() applies, and a syllable under two stars returns both. */
function cellsFor(name: string): PadaCell[] {
  const n = normaliseSyllables(name);
  if (!n) return [];
  for (let len = 4; len >= 1; len--) {
    const prefix = n.slice(0, len);
    const hits = ALL_PADAS.filter((c) => c.syllable === prefix);
    if (hits.length > 0) return hits;
  }
  return [];
}

/** 360° / 27 = exactly 800 arc-minutes, so every boundary is a whole minute. */
const NAK_ARC_MINUTES = 800;
const PADA_ARC_MINUTES = NAK_ARC_MINUTES / 4;

const arc = (minutes: number) =>
  `${Math.floor(minutes / 60)}°${String(Math.round(minutes) % 60).padStart(2, "0")}′`;
const spanOf = (fromIndex: number, toIndex: number) =>
  `${arc(fromIndex * PADA_ARC_MINUTES)} – ${arc((toIndex + 1) * PADA_ARC_MINUTES)}`;

/** "Mesha (Aries)" → the two names people search with. */
function splitLabel(label: string): { sanskrit: string; western: string } {
  const m = /^(.+?)\s*\((.+)\)$/.exec(label);
  return { sanskrit: m?.[1] ?? label, western: m?.[2] ?? "" };
}

// ══════════════════════════════════════════════════════════════════════
// THEME ENGINE — a verbatim mirror of seo/meanings.ts
//
// Everything from here to the end of themesOf() decides which
// /names/meaning-<theme>.html pages exist. It is a copy, and it is a copy of
// judgement tables rather than of a formula, so it cannot be rederived: if
// WORD_FAMILIES gains an entry there and not here, the two files disagree
// about how many names carry a theme, and this file links a page the build
// skipped. Diff the two blocks when either changes.
// ══════════════════════════════════════════════════════════════════════

const STOPWORDS = new Set([
  "the", "and", "or", "but", "for", "with", "from", "who", "whom", "whose", "which", "that",
  "this", "these", "those", "there", "her", "his", "hers", "its", "their", "one", "also",
  "very", "most", "more", "much", "such", "other", "another", "something", "someone",
  "thing", "part", "portion", "piece", "name", "named", "called", "meaning", "means",
  "form", "aspect", "epithet", "lord", "goddess", "devi", "shri", "sri", "bhagwan",
  "son", "daughter", "child", "born", "full", "used", "given", "said", "known", "person",
  "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth",
]);

const WORD_FAMILIES: Record<string, string[]> = {
  light: [
    "bright", "brightness", "brilliant", "brilliance", "radiant", "radiance", "shining",
    "shine", "glow", "glowing", "gleam", "luminous", "lustre", "luster", "illumination",
    "illuminating", "ray", "beam", "dazzling",
  ],
  sun: ["sunlight", "sunshine", "solar", "surya", "ravi"],
  moon: ["moonlight", "lunar", "chandra"],
  star: ["stellar", "constellation"],
  sky: ["heaven", "heavenly", "celestial", "firmament"],
  earth: ["land", "soil", "prithvi"],
  ocean: ["sea", "samudra"],
  river: ["stream", "brook"],
  mountain: ["summit"],
  fire: ["flame", "blaze", "agni"],
  wind: ["breeze", "vayu"],
  dawn: ["sunrise", "daybreak", "usha"],
  flower: ["blossom", "bloom", "blooming"],
  lotus: ["kamal", "padma"],
  gold: ["golden", "gilded"],
  jewel: ["gem", "gemstone"],
  peace: ["peaceful", "calm", "calmness", "tranquil", "tranquillity", "tranquility", "serene", "serenity", "shanti"],
  bravery: ["brave", "courage", "courageous", "valour", "valor", "valiant", "fearless", "gallant", "bold"],
  strength: ["strong", "power", "powerful", "mighty", "might", "vigour", "vigor"],
  victory: ["victorious", "victor", "triumph", "triumphant", "conquering", "conqueror", "winner", "jaya"],
  wisdom: ["wise", "sagacity", "prudence", "prudent"],
  knowledge: ["learning", "learned", "veda", "scholar", "erudition", "intellect"],
  truth: ["true", "truthful", "honest", "honesty", "satya"],
  prosperity: ["prosperous", "wealth", "wealthy", "riches", "rich", "fortune", "fortunate", "affluence", "opulence"],
  beauty: ["beautiful", "lovely", "loveliness", "handsome", "charming", "pretty"],
  grace: ["graceful", "gracious", "elegance", "elegant", "poise"],
  beloved: ["love", "loved", "dear", "darling", "affection", "priya"],
  devotion: ["devotee", "devoted", "worship", "worshipped", "worshipper", "adored", "adoration", "bhakti"],
  joy: ["joyful", "happiness", "happy", "bliss", "blissful", "delight", "delighted", "cheerful", "ananda", "anand"],
  purity: ["pure", "pristine", "untainted"],
  holy: ["sacred", "hallowed", "blessed"],
  god: ["divine", "godly", "almighty"],
  life: ["alive", "living", "lively", "vitality", "vital"],
  eternal: ["eternity", "everlasting", "immortal", "immortality", "timeless", "constant", "unchanging", "perpetual"],
  unique: ["unequalled", "unparalleled", "incomparable", "matchless", "rare"],
  new: ["fresh", "novel"],
  young: ["youth", "youthful"],
  king: ["monarch", "emperor", "ruler", "sovereign", "raja"],
  queen: ["empress", "rani"],
  warrior: ["soldier", "fighter"],
  poetry: ["poem", "poet", "verse"],
  song: ["music", "musical", "melody", "singer", "singing", "tune", "raga"],
  speech: ["voice", "eloquence"],
  gift: ["blessing", "boon", "gifted"],
  protector: ["protection", "protects", "guardian", "defender"],
  kindness: ["kind", "benevolent", "benevolence", "compassion", "compassionate", "merciful", "mercy"],
  desire: ["desires", "desired", "wish", "longing"],
  shiva: ["shiv", "mahadev", "mahadeva", "shankara"],
  vishnu: ["narayana", "narayan"],
  ganesha: ["ganesh", "ganapati", "vinayaka"],
  lakshmi: ["laxmi"],
  saraswati: ["sarasvati"],
  parvati: ["gauri"],
};

const CANONICAL: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const [canonical, variants] of Object.entries(WORD_FAMILIES)) {
    m[canonical] = canonical;
    for (const v of variants) m[v] = canonical;
  }
  return m;
})();

const DEITY_LABELS: Record<string, string> = {
  shiva: "Lord Shiva",
  vishnu: "Lord Vishnu",
  krishna: "Lord Krishna",
  rama: "Lord Rama",
  ganesha: "Lord Ganesha",
  hanuman: "Lord Hanuman",
  indra: "Lord Indra",
  brahma: "Lord Brahma",
  murugan: "Lord Murugan",
  kartikeya: "Lord Kartikeya",
  lakshmi: "Goddess Lakshmi",
  saraswati: "Goddess Saraswati",
  durga: "Goddess Durga",
  parvati: "Goddess Parvati",
  kali: "Goddess Kali",
  radha: "Radha",
  sita: "Sita",
};

const singular = (w: string) =>
  w.length > 3 && w.endsWith("s") && !/(ss|us|is|as|os)$/.test(w) ? w.slice(0, -1) : w;

function termsOf(phrase: string): Set<string> {
  const out = new Set<string>();
  for (const raw of phrase.toLowerCase().split(/[^a-z]+/)) {
    const word = singular(raw);
    if (word.length < 3 || STOPWORDS.has(word)) continue;
    out.add(CANONICAL[word] ?? word);
  }
  return out;
}

function themeTermsOf(meaning: string): Set<string> {
  const terms = new Set<string>();
  for (const raw of meaning.split(/[;,/()]+/)) {
    const text = raw.trim().replace(/\s+/g, " ").replace(/\.$/, "");
    const phraseTerms = termsOf(raw);
    if (text.length === 0 || phraseTerms.size === 0) continue;
    for (const t of phraseTerms) terms.add(t);
  }
  return terms;
}

interface Theme {
  term: string;
  slug: string;
  /** What the theme page calls itself: "light", or "Lord Shiva". */
  label: string;
  names: CorpusEntry[];
}

/** The published theme set, by seo/meanings.ts's own two passes. */
function themesOf(corpus: CorpusEntry[]): Theme[] {
  const byTerm = new Map<string, CorpusEntry[]>();
  for (const entry of corpus) {
    const meaning = entry.meaning?.trim();
    if (!meaning) continue;
    for (const term of themeTermsOf(meaning)) {
      const list = byTerm.get(term) ?? [];
      list.push(entry);
      byTerm.set(term, list);
    }
  }

  const candidates: Theme[] = [...byTerm.entries()]
    .filter(([, list]) => list.length >= THEME_MIN_NAMES)
    .map(([term, list]) => ({
      term,
      slug: seoSlug(term),
      label: DEITY_LABELS[term] ?? term,
      names: [...list].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => b.names.length - a.names.length || a.term.localeCompare(b.term));

  const kept: Theme[] = [];
  for (const theme of candidates) {
    const mine = new Set(theme.names.map((n) => n.name));
    const swallowed = kept.some((bigger) => {
      const shared = bigger.names.filter((n) => mine.has(n.name)).length;
      return shared / mine.size >= THEME_MAX_SUBSET_SHARE;
    });
    if (!swallowed) kept.push(theme);
  }

  return kept.sort((a, b) => a.label.localeCompare(b.label));
}

// ══════════════════════════════════════════════════════════════════════
// One read of the corpus, shared by all six pages
// ══════════════════════════════════════════════════════════════════════

interface LetterStat {
  letter: string;
  total: number;
  boy: number;
  girl: number;
  unisex: number;
  page: boolean;
  boyPage: boolean;
  girlPage: boolean;
}

interface StarStat {
  index: number;
  name: string;
  symbol: string;
  syllables: string[];
  /** Consecutive padas sharing a sign — fourteen stars sit in one, thirteen straddle. */
  runs: Array<{ rashi: string; padas: number[] }>;
  names: number;
  page: boolean;
}

interface SignStat {
  key: string;
  label: string;
  sanskrit: string;
  western: string;
  cells: PadaCell[];
  syllables: string[];
  names: number;
  page: boolean;
}

interface EndingStat {
  tld: string;
  label: string;
  priceInr: number;
  rank: number;
  page: boolean;
}

interface ScriptStat {
  script: string;
  langs: string[];
  /** The conversion is keyed on the most-spoken language, and so is the URL. */
  code: string;
  slug: string;
  speakers: number;
  rendered: number;
  dropped: number;
  page: boolean;
}

interface NumberStat {
  root: number;
  planet: string;
  glyph: string;
  names: number;
  page: boolean;
}

interface Reading {
  corpus: CorpusEntry[];
  withMeaning: number;
  genders: { boy: number; girl: number; unisex: number; unknown: number };
  origins: Array<{ origin: string; names: number }>;
  letters: LetterStat[];
  themes: Theme[];
  stars: StarStat[];
  signs: SignStat[];
  /** Chakra syllable → published names opening on it, for the syllable index. */
  syllables: Map<string, number>;
  numbers: NumberStat[];
  endings: EndingStat[];
  scripts: ScriptStat[];
  /** Corpus names that produce a Devanagari form at all — the transliteration
   *  pivot, and the denominator every script figure is measured against. */
  devaNames: number;
  /** Shortest name rendering in every published script, for the worked demo. */
  demo: { name: string; deva: string; byScript: Map<string, string> } | null;
  /** DNS label lengths, for the domain index. */
  labelLengths: Array<{ length: number; names: number }>;
  labelNames: number;
  siteOrigin: string;
}

function readCorpus(ctx: SeoCtx): Reading {
  const corpus = ctx.corpus;

  // ── Letters, by seo/letters.ts's rule ────────────────────────────
  const buckets = new Map<string, CorpusEntry[]>();
  for (const entry of corpus) {
    const first = entry.name.trim().charAt(0).toUpperCase();
    if (!/^[A-Z]$/.test(first)) continue;
    buckets.set(first, [...(buckets.get(first) ?? []), entry]);
  }
  const letters: LetterStat[] = [...buckets.entries()]
    .map(([letter, names]) => {
      const boy = names.filter((n) => n.gender === "boy").length;
      const girl = names.filter((n) => n.gender === "girl").length;
      const page = names.length >= LETTER_MIN_NAMES;
      const genderPage = (count: number) =>
        page &&
        count >= LETTER_MIN_GENDER_NAMES &&
        count / names.length <= LETTER_GENDER_DUPLICATE_SHARE;
      return {
        letter,
        total: names.length,
        boy,
        girl,
        unisex: names.filter((n) => n.gender === "unisex").length,
        page,
        boyPage: genderPage(boy),
        girlPage: genderPage(girl),
      };
    })
    .sort((a, b) => a.letter.localeCompare(b.letter));

  // ── Chakra, by seo/nakshatra.ts's and seo/rashi.ts's rules ───────
  const starNames = new Array<number>(NAKSHATRAS.length).fill(0);
  const signNames = new Map<string, number>();
  const syllableNames = new Map<string, number>();
  for (const entry of corpus) {
    const cells = cellsFor(entry.name);
    const stars = new Set(cells.map((c) => c.nakshatra));
    for (const s of stars) starNames[s] += 1;
    for (const label of new Set(cells.map((c) => c.rashi))) {
      signNames.set(label, (signNames.get(label) ?? 0) + 1);
    }
    for (const syl of new Set(cells.map((c) => c.syllable))) {
      syllableNames.set(syl, (syllableNames.get(syl) ?? 0) + 1);
    }
  }

  const stars: StarStat[] = NAKSHATRAS.map((nk, index) => {
    const runs: Array<{ rashi: string; padas: number[] }> = [];
    nk.padas.forEach((p, i) => {
      const last = runs[runs.length - 1];
      if (last && last.rashi === p.rashi) last.padas.push(i + 1);
      else runs.push({ rashi: p.rashi, padas: [i + 1] });
    });
    return {
      index,
      name: nk.name,
      symbol: nk.symbol,
      syllables: nk.padas.map((p) => cap(p.syl)),
      runs,
      names: starNames[index],
      page: starNames[index] >= NAK_MIN_NAMES,
    };
  });

  const signs: SignStat[] = (Object.keys(RASHI_NAMES) as Array<keyof typeof RASHI_NAMES>).map(
    (key) => {
      const label = RASHI_NAMES[key];
      const { sanskrit, western } = splitLabel(label);
      const cells = ALL_PADAS.filter((c) => c.rashi === label);
      const names = signNames.get(label) ?? 0;
      return {
        key,
        label,
        sanskrit,
        western,
        cells,
        syllables: [...new Set(cells.map((c) => cap(c.syllable)))],
        names,
        page: names >= RASHI_MIN_NAMES,
      };
    },
  );

  // ── Chaldean roots, by seo/numerology.ts's rule ──────────────────
  const rootNames = new Map<number, number>();
  for (const entry of corpus) {
    const root = chaldean(entry.name).root;
    rootNames.set(root, (rootNames.get(root) ?? 0) + 1);
  }
  const numbers: NumberStat[] = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((root) => ({
    root,
    planet: RULING_PLANET[root]?.name ?? "",
    glyph: RULING_PLANET[root]?.glyph ?? "",
    names: rootNames.get(root) ?? 0,
    page: (rootNames.get(root) ?? 0) >= NUMBER_MIN_NAMES,
  }));

  // ── Endings ──────────────────────────────────────────────────────
  const byPrice = [...TLDS].sort((a, b) => a.priceInr - b.priceInr || a.tld.localeCompare(b.tld));
  const endings: EndingStat[] = TLDS.map((t) => ({
    tld: t.tld,
    label: `.${t.tld}`,
    priceInr: t.priceInr,
    rank: byPrice.filter((o) => o.priceInr < t.priceInr).length + 1,
    page: PROFILED_TLDS.has(t.tld),
  }));

  // ── Scripts, by seo/scripts.ts's rule ────────────────────────────
  const source = corpus
    .map((entry) => ({ entry, deva: romanToDevanagari(entry.name) }))
    .filter((d) => d.deva.length > 0);

  // One conversion per distinct Devanagari form, shared by all nine scripts —
  // the corpus repeats spellings and the converter is the expensive part.
  const cache = new Map<string, Map<string, string>>();
  const renderAll = (deva: string): Map<string, string> => {
    let hit = cache.get(deva);
    if (!hit) {
      hit = new Map(devanagariToScripts(deva).map((s) => [s.code, s.text]));
      cache.set(deva, hit);
    }
    return hit;
  };

  const groups = new Map<string, Array<{ code: string; name: string }>>();
  for (const t of SCRIPT_TARGETS) {
    groups.set(t.script, [...(groups.get(t.script) ?? []), { code: t.code, name: t.name }]);
  }

  const scripts: ScriptStat[] = [...groups.entries()].map(([script, langs]) => {
    const ordered = [...langs].sort((a, b) => (SPEAKERS[b.name] ?? 0) - (SPEAKERS[a.name] ?? 0));
    const code = ordered[0].code;
    const rendered = source.filter((d) => renderAll(d.deva).has(code)).length;
    return {
      script,
      langs: ordered.map((l) => l.name),
      code,
      slug: seoSlug(ordered[0].name),
      speakers: ordered.reduce((sum, l) => sum + (SPEAKERS[l.name] ?? 0), 0),
      rendered,
      dropped: source.length - rendered,
      page: rendered >= SCRIPT_MIN_NAMES,
    };
  });

  // The worked example: shortest name that every published script can write,
  // ties alphabetical, so a rebuild on the same corpus never quietly swaps it.
  const publishedCodes = scripts.filter((s) => s.page).map((s) => s.code);
  const complete = source
    .filter((d) => publishedCodes.every((c) => renderAll(d.deva).has(c)))
    .sort((a, b) => a.entry.name.length - b.entry.name.length || a.entry.name.localeCompare(b.entry.name));
  const pick = complete[0];
  const demo = pick
    ? {
        name: pick.entry.name,
        deva: pick.deva,
        byScript: new Map<string, string>(
          scripts
            .filter((s) => renderAll(pick.deva).has(s.code))
            .map((s): [string, string] => [s.script, renderAll(pick.deva).get(s.code) ?? ""]),
        ),
      }
    : null;

  // ── DNS labels, the string the live domain check actually queries ─
  const lengths = new Map<number, number>();
  let labelNames = 0;
  for (const entry of corpus) {
    try {
      const label = normaliseName(entry.name).alnumLower;
      if (label.length < 3) continue;
      labelNames += 1;
      lengths.set(label.length, (lengths.get(label.length) ?? 0) + 1);
    } catch {
      // A name the normaliser rejects cannot be checked live either, so it is
      // not counted here — the figures on the page are what the check would do.
    }
  }
  const labelLengths = [...lengths.entries()]
    .map(([length, names]) => ({ length, names }))
    .sort((a, b) => a.length - b.length);

  // ── Corpus shape ─────────────────────────────────────────────────
  const originCounts = new Map<string, number>();
  for (const entry of corpus) {
    if (!entry.origin) continue;
    originCounts.set(entry.origin, (originCounts.get(entry.origin) ?? 0) + 1);
  }

  return {
    corpus,
    withMeaning: corpus.filter((e) => e.meaning).length,
    genders: {
      boy: corpus.filter((e) => e.gender === "boy").length,
      girl: corpus.filter((e) => e.gender === "girl").length,
      unisex: corpus.filter((e) => e.gender === "unisex").length,
      unknown: corpus.filter((e) => !e.gender).length,
    },
    origins: [...originCounts.entries()]
      .map(([origin, names]) => ({ origin, names }))
      .sort((a, b) => b.names - a.names || a.origin.localeCompare(b.origin)),
    letters,
    themes: themesOf(corpus),
    stars,
    signs,
    syllables: syllableNames,
    numbers,
    endings,
    scripts,
    devaNames: source.length,
    demo,
    labelLengths,
    labelNames,
    siteOrigin: ctx.siteOrigin,
  };
}

/** Names spread evenly across the corpus, so the sample is not all A's. */
function sampleNames(corpus: CorpusEntry[], count: number): CorpusEntry[] {
  if (corpus.length <= count) return [...corpus];
  const step = corpus.length / count;
  return Array.from({ length: count }, (_, i) => corpus[Math.floor(i * step)]);
}

// ══════════════════════════════════════════════════════════════════════
// /explore/index.html — the one page that carries the whole surface
// ══════════════════════════════════════════════════════════════════════

function renderExplore(r: Reading): SeoDoc {
  const letterPages = r.letters.filter((l) => l.page);
  const genderPages = r.letters.reduce((n, l) => n + (l.boyPage ? 1 : 0) + (l.girlPage ? 1 : 0), 0);
  const starPages = r.stars.filter((s) => s.page);
  const signPages = r.signs.filter((s) => s.page);
  const numberPages = r.numbers.filter((n) => n.page);
  const scriptPages = r.scripts.filter((s) => s.page);
  const endingPages = r.endings.filter((e) => e.page);

  /* The count column is only filled where this file can compute it. The
     trademark cluster is decided by a completeness test over a table that
     lives in seo/trademark.ts, so a number here would be a guess printed as a
     fact — the one thing these pages are not allowed to do. */
  const rows: Array<{ what: string; answers: string; pattern: string; built: string }> = [
    {
      what: "Name pages",
      answers: "What does this name mean, what is its number, how is it written",
      pattern: "/n/&lt;name&gt;.html",
      built: `${inr(r.corpus.length)} ${plural(r.corpus.length, "page", "pages")}`,
    },
    {
      what: "Names by letter",
      answers: "Baby names starting with a given letter, for a boy or a girl",
      pattern: "/names/starting-with-&lt;letter&gt;.html",
      built: `${inr(letterPages.length)} + ${inr(genderPages)} gendered`,
    },
    {
      what: "Names by meaning",
      answers: "Names that mean light, victory, peace — or that name a deity",
      pattern: "/names/meaning-&lt;theme&gt;.html",
      built: `${inr(r.themes.length)} ${plural(r.themes.length, "theme", "themes")}`,
    },
    {
      what: "Nakshatra",
      answers: "The namkaran syllable a family has been given, and names that fit it",
      pattern: "/nakshatra/&lt;star&gt;.html",
      built: `${inr(starPages.length)} of ${inr(NAKSHATRAS.length)}`,
    },
    {
      what: "Rashi",
      answers: "Names under a moon sign, and which stars feed it",
      pattern: "/rashi/&lt;sign&gt;.html",
      built: `${inr(signPages.length)} of ${inr(r.signs.length)}`,
    },
    {
      what: "Numerology",
      answers: "What a Chaldean root number is read as, and which names carry it",
      pattern: "/numerology/number-&lt;1–9&gt;.html",
      built: `${inr(numberPages.length)} + the index`,
    },
    {
      what: "Scripts",
      answers: "Your name written in Tamil, Bengali, Gurmukhi and six more",
      pattern: "/script/&lt;language&gt;.html",
      built: `${inr(scriptPages.length)} of ${inr(r.scripts.length)}`,
    },
    {
      what: "Domain endings",
      answers: "What .in, .com or .ai costs, and who each ending suits",
      pattern: "/domains/&lt;ending&gt;.html",
      built: `${inr(endingPages.length)} ${plural(endingPages.length, "ending", "endings")}`,
    },
    {
      what: "Trademark classes",
      answers: "Which of the 45 Nice classes a business files in",
      pattern: "/trademark-class/&lt;1–45&gt;.html",
      built: "One per class, plus the class index",
    },
  ];

  const clusterRows = rows
    .map(
      (row) => `        <tr>
          <td><strong>${esc(row.what)}</strong></td>
          <td>${esc(row.answers)}</td>
          <td style="font-family:'JetBrains Mono',monospace;font-size:11.5px">${row.pattern}</td>
          <td>${esc(row.built)}</td>
        </tr>`,
    )
    .join("\n");

  const sections: string[] = [];

  sections.push(`  <section class="hub-sec">
    <h2>Every published name</h2>
    <p class="sub">${inr(r.corpus.length)} ${plural(r.corpus.length, "name", "names")}, one page each.</p>
    <div class="prose">
      <p>A name page carries the name written across the Indian scripts that can hold it, its Chaldean compound and root numbers with the ruling planet, the birth star traditionally linked to its first sound, the short forms a family is likely to land on, and a pronunciation reading. A meaning appears only where we have verified one — ${inr(r.withMeaning)} of the ${inr(r.corpus.length)} carry one today, and the rest render without that block rather than with a guess.</p>
    </div>
    <div class="related">
        <a href="${NAME_INDEX}">The full name index — every ${inr(r.corpus.length)} names</a>
        <a href="${NAMES_INDEX_PATH}">Names grouped by letter and meaning</a>
    </div>
    <div class="grid-links" style="margin-top:12px">
${gridLinks(sampleNames(r.corpus, 12).map((e) => ({ href: namePath(e.name), label: e.name, sub: e.meaning ? e.meaning.split(";")[0] : undefined })))}
    </div>
  </section>`);

  if (letterPages.length) {
    sections.push(`  <section class="hub-sec">
    <h2>Names by letter</h2>
    <p class="sub">${inr(letterPages.length)} ${plural(letterPages.length, "letter", "letters")} with enough published names to make a page.</p>
    <div class="prose">
      <p>The highest-volume query family in this market and the most contested: every name site publishes all 26 letters, most of them the same scraped list. These pages publish fewer letters and put three things on each that a scraped list does not have — the Devanagari spelling from our own transliteration engine, the Chaldean root of every name, and the chakra syllable each name's opening sound belongs to. A letter appears once ${inr(LETTER_MIN_NAMES)} published names begin with it.</p>
    </div>
    <div class="grid-links">
${gridLinks(letterPages.map((l) => ({ href: letterPath(l.letter), label: l.letter, sub: `${inr(l.total)} ${plural(l.total, "name", "names")}` })))}
    </div>
  </section>`);
  }

  if (r.themes.length) {
    sections.push(`  <section class="hub-sec">
    <h2>Names by meaning</h2>
    <p class="sub">${inr(r.themes.length)} ${plural(r.themes.length, "theme", "themes")}, grouped from verified meanings only.</p>
    <div class="prose">
      <p>For the parent who has decided what the name should say and not yet which name says it. Only names carrying a verified meaning are grouped at all, the grouping is ours and the wording is the source's, and every theme page prints each name's recorded meaning verbatim beside it so the grouping can be checked rather than taken on trust.</p>
    </div>
    <div class="grid-links">
${gridLinks(r.themes.map((t) => ({ href: themePath(t.slug), label: cap(t.label), sub: `${inr(t.names.length)} ${plural(t.names.length, "name", "names")}` })))}
    </div>
  </section>`);
  }

  if (starPages.length) {
    sections.push(`  <section class="hub-sec">
    <h2>Nakshatra — the birth stars</h2>
    <p class="sub">${inr(starPages.length)} of the ${inr(NAKSHATRAS.length)} stars carry published names.</p>
    <div class="prose">
      <p>A family comes back from the namkaran with a syllable rather than a name — “start it with Chu” — because the pandit reads the Moon's position from the janam kundli, which fixes the birth star and the quarter of it the Moon occupied. Each of those quarters carries one syllable. These pages run that table backwards, listing the published names that begin with each star's four syllables; the index below has all ${inr(ALL_PADAS.length)} syllables in one place.</p>
    </div>
    <div class="related">
        <a href="${NAK_INDEX_PATH}">All ${inr(NAKSHATRAS.length)} nakshatras and their syllables</a>
    </div>
    <div class="grid-links" style="margin-top:12px">
${gridLinks(starPages.map((s) => ({ href: nakshatraPath(s.name), label: s.name, sub: s.syllables.join(" · ") })))}
    </div>
  </section>`);
  }

  if (signPages.length) {
    sections.push(`  <section class="hub-sec">
    <h2>Rashi — the moon signs</h2>
    <p class="sub">${inr(signPages.length)} of ${inr(r.signs.length)} signs carry published names.</p>
    <div class="prose">
      <p>Each sign takes two and a quarter nakshatras, which is nine padas and nine syllables. A rashi page lists the published names whose opening sound falls in one of those nine, the stars that feed the sign, and how the names spread across the Chaldean roots.</p>
    </div>
    <div class="related">
        <a href="${RASHI_INDEX_PATH}">All ${inr(r.signs.length)} signs, with their Western equivalents</a>
    </div>
    <div class="grid-links" style="margin-top:12px">
${gridLinks(signPages.map((s) => ({ href: rashiPath(s.key), label: s.sanskrit, sub: s.western ? `${s.western} · ${inr(s.names)} ${plural(s.names, "name", "names")}` : `${inr(s.names)} names` })))}
    </div>
  </section>`);
  }

  if (numberPages.length) {
    sections.push(`  <section class="hub-sec">
    <h2>Chaldean numerology</h2>
    <p class="sub">${inr(numberPages.length)} of the nine root numbers carry enough published names for a page.</p>
    <div class="prose">
      <p>The Chaldean system gives each letter a value by its sound rather than its position in the alphabet, and omits nine from the letter map entirely. A name's letters are totalled to a compound number, which is read on its own, and then reduced to a root of one to nine, which carries the ruling planet. These pages set out both readings, the letter values they come from, and the published names that reduce to each root.</p>
    </div>
    <div class="related">
        <a href="${NUMEROLOGY_HUB}">The numerology index — all nine numbers and every letter value</a>
    </div>
    <div class="grid-links" style="margin-top:12px">
${gridLinks(numberPages.map((n) => ({ href: numberPath(n.root), label: `Number ${n.root}`, sub: `${n.glyph} ${n.planet} · ${inr(n.names)} ${plural(n.names, "name", "names")}` })))}
    </div>
  </section>`);
  }

  if (scriptPages.length) {
    sections.push(`  <section class="hub-sec">
    <h2>Your name in Indian scripts</h2>
    <p class="sub">${inr(scriptPages.length)} ${plural(scriptPages.length, "script", "scripts")}, ${inr(r.scripts.reduce((n, s) => n + s.langs.length, 0))} languages.</p>
    <div class="prose">
      <p>A romanised name is converted to Devanagari first and then out to each target script, which is why every one of these pages also says what its script cannot keep: where a conversion would leak raw Devanagari the rendering is dropped rather than shown broken, and the letters a script writes with one character where Devanagari uses two are listed and counted. Hindi and Marathi share Devanagari and share one page.</p>
    </div>
    <div class="related">
        <a href="${SCRIPT_INDEX_PATH}">All ${inr(r.scripts.length)} scripts, measured against the corpus</a>
    </div>
    <div class="grid-links" style="margin-top:12px">
${gridLinks(scriptPages.map((s) => ({ href: scriptPath(s.slug), label: s.script, sub: `${s.langs.join(", ")} · ${inr(s.rendered)} names` })))}
    </div>
  </section>`);
  }

  if (endingPages.length) {
    sections.push(`  <section class="hub-sec">
    <h2>Domain endings</h2>
    <p class="sub">${inr(endingPages.length)} endings, priced and compared.</p>
    <div class="prose">
      <p>The founder half of the product. A page per ending carries its indicative first-year price in rupees from the same table the live check prices its tiles from, who the ending suits and who it does not, and the mechanics of the availability lookup itself.</p>
    </div>
    <div class="related">
        <a href="${DOMAIN_INDEX_PATH}">All ${inr(endingPages.length)} endings, first-year price side by side</a>
    </div>
    <div class="grid-links" style="margin-top:12px">
${gridLinks(endingPages.map((e) => ({ href: domainPath(e.tld), label: e.label, sub: `₹${inr(e.priceInr)} first year` })))}
    </div>
  </section>`);
  }

  sections.push(`  <section class="hub-sec">
    <h2>Trademark classes</h2>
    <p class="sub">The 45 Nice classes, one page each, behind their own index.</p>
    <div class="prose">
      <p>Goods are classes 1 to 34 and services 35 to 45, and a registration covers only the classes it names — which is how the same word belongs to a shoe company and a software company at once. Most businesses sit in two or three classes and file one. The class index asks what you supply rather than what industry you are in, and routes from there to the class pages; it is the way into that cluster, so this page links it rather than all 45.</p>
    </div>
    <div class="related">
        <a href="${TRADEMARK_HUB}">Which trademark class is my business in?</a>
    </div>
  </section>`);

  const body = `  <h1>Everything Naam Dekho publishes</h1>
  <p class="lede">One page per question, each built from the same engines the live check runs on: the numerology reading, the transliteration pipeline, the Avakahada chakra and our own priced table of domain endings.</p>
  <p class="lede">Below: what each set of pages answers, and links into all of them.</p>

  <div class="tags">
    <span class="tag">${inr(r.corpus.length)} name pages</span>
    <span class="tag">${inr(r.withMeaning)} verified meanings</span>
    <span class="tag">${inr(NAKSHATRAS.length)} nakshatras · ${inr(r.signs.length)} rashis</span>
    <span class="tag">${inr(r.endings.length)} domain endings</span>
  </div>

  <section>
    <h2>What is on this site</h2>
    <p class="sub">Counted from this build, not from a plan.</p>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>Pages</th><th>What they answer</th><th>Address</th><th>In this build</th></tr></thead>
        <tbody>
${clusterRows}
        </tbody>
      </table>
    </div>
    <p class="note">A page appears here only once it has something on it. Every cluster sets a bar — enough published names, or a profile somebody has actually written — and a letter, star, sign or theme below its bar is not published as a stub. The counts are recomputed on every build, so pages appear as the corpus grows rather than when somebody remembers to switch them on.</p>
  </section>

${sections.join("\n\n")}

  <section class="prose">
    <h2>How these pages are made</h2>
    <p>They are static HTML files. No script has to run for the words to be there, nothing is fetched to render them, and they serve the same bytes to a crawler as to a person — showing a search engine something a reader does not get is cloaking, and it is the one technique that reliably removes a domain from the index.</p>
    <p>What is on them is computed rather than written. The numerology is our Chaldean engine, the scripts come out of the transliteration pipeline, the birth-star readings come from the same 27-fold division of the ecliptic the live calculator uses, and the rupee prices are the table the domain tiles price from. Where we do not hold something — a name's meaning, most often — the block is left out rather than filled with a plausible sentence.</p>
    <p class="note">Traditional readings on these pages are cultural reference, not advice. The janam kundli is the authority for a birth star, a registrar's checkout page is the authority for what a domain costs, and the trademark register is the authority for what is registered.</p>
  </section>

${ctaBlock(
  "Check a name across everything at once",
  "One search runs the domain endings, the social handles, the marketplace listings and the company register together, and reads the numerology and the scripts while it goes.",
)}`;

  const listed: Array<{ name: string; url: string }> = [
    { name: "Every published name", url: `${r.siteOrigin}${NAME_INDEX}` },
    { name: "Names by letter and meaning", url: `${r.siteOrigin}${NAMES_INDEX_PATH}` },
    { name: "All 27 nakshatras", url: `${r.siteOrigin}${NAK_INDEX_PATH}` },
    { name: "All 12 rashis", url: `${r.siteOrigin}${RASHI_INDEX_PATH}` },
    { name: "Chaldean numerology", url: `${r.siteOrigin}${NUMEROLOGY_HUB}` },
    { name: "Indian scripts", url: `${r.siteOrigin}${SCRIPT_INDEX_PATH}` },
    { name: "Domain endings and prices", url: `${r.siteOrigin}${DOMAIN_INDEX_PATH}` },
    { name: "Trademark classes", url: `${r.siteOrigin}${TRADEMARK_HUB}` },
  ];

  return {
    path: EXPLORE_PATH,
    html: renderSeoPage({
      title: "Everything Naam Dekho publishes — names, stars, numbers, scripts, domains | Naam Dekho",
      metaDesc: `Every page on this site and what it answers: ${inr(r.corpus.length)} name pages, the ${inr(NAKSHATRAS.length)} nakshatras, the ${inr(r.signs.length)} rashis, Chaldean numerology, ${inr(r.scripts.length)} Indian scripts, ${inr(r.endings.length)} domain endings and the 45 trademark classes.`,
      path: EXPLORE_PATH,
      siteOrigin: r.siteOrigin,
      crumbs: [{ label: "Home", href: "/" }, { label: "Explore" }],
      jsonLd: [itemListLd("Everything Naam Dekho publishes", listed)],
      body,
    }),
    /* Below every cluster index deliberately. Nobody searches for a table of
       contents; this page exists so the crawler reaches all of them from one
       hop and so the app has something to link if the founder ever wants it. */
    priority: "0.6",
    changefreq: "monthly",
  };
}

// ══════════════════════════════════════════════════════════════════════
// /nakshatra/index.html
// ══════════════════════════════════════════════════════════════════════

function renderNakshatraIndex(r: Reading): SeoDoc {
  const published = r.stars.filter((s) => s.page);
  const straddling = r.stars.filter((s) => s.runs.length > 1).length;

  const starRows = r.stars
    .map((s) => {
      const first = s.index * 4;
      const nameCell = s.page
        ? cellLink(nakshatraPath(s.name), s.name)
        : `${esc(s.name)}`;
      return `        <tr>
          <td class="num">${s.index + 1}</td>
          <td><strong>${nameCell}</strong> ${esc(s.symbol)}</td>
          <td class="num">${esc(spanOf(first, first + 3))}</td>
          <td>${s.syllables.map((x) => `<strong>${esc(x)}</strong>`).join(" · ")}</td>
          <td>${esc(joinAnd(s.runs.map((run) => splitLabel(run.rashi).sanskrit)))}</td>
          <td class="num">${s.names > 0 ? inr(s.names) : "—"}</td>
        </tr>`;
    })
    .join("\n");

  // Sorted by syllable rather than by star: a family arrives here holding a
  // sound, not a star name, and this is the only table on the site that goes
  // in that direction.
  const syllableRows = [...ALL_PADAS]
    .sort((a, b) => a.syllable.localeCompare(b.syllable) || a.index - b.index)
    .map((c) => {
      const star = r.stars[c.nakshatra];
      const names = r.syllables.get(c.syllable) ?? 0;
      return `        <tr>
          <td><strong>${esc(cap(c.syllable))}</strong></td>
          <td>${star.page ? cellLink(nakshatraPath(star.name), star.name) : esc(star.name)}</td>
          <td class="num">${c.pada}</td>
          <td>${esc(splitLabel(c.rashi).sanskrit)}</td>
          <td class="num">${esc(spanOf(c.index, c.index))}</td>
          <td class="num">${names > 0 ? inr(names) : "—"}</td>
        </tr>`;
    })
    .join("\n");

  const faqs: Faq[] = [
    {
      q: "How many nakshatras are there, and what is a pada?",
      a: `Twenty-seven, dividing the sidereal zodiac into equal arcs of ${arc(NAK_ARC_MINUTES)} each. Every one is quartered further into four padas of ${arc(PADA_ARC_MINUTES)}, which makes ${inr(ALL_PADAS.length)} padas in all, and each pada carries one syllable. A pada is roughly six hours of the Moon's motion, which is why a recorded birth time changes the answer so often.`,
    },
    {
      q: "I was given a syllable at the namkaran. Which star is it from?",
      a: `Look it up in the syllable index on this page: all ${inr(ALL_PADAS.length)} are listed alphabetically with the star, the pada and the moon sign each belongs to. The star pages then list the published names beginning with that sound. A handful of syllables appear under more than one pada, and where that happens both are listed rather than one being picked.`,
    },
    {
      q: "Can this page tell me my child's nakshatra?",
      a: "No, and nothing that starts from the name can. The birth star comes from where the Moon actually was at birth, which needs the birth date and ideally the birth time. Enter those in the name check and we compute the Moon's position; these pages run the table the other way, from a sound to the stars that carry it, which is the direction that helps once a name is already in mind.",
    },
    {
      q: "Why do some stars list no names?",
      a: `Because no published name in our corpus begins with any of their four syllables yet. The count is recomputed on every build, so a star gets its page the moment the corpus covers one of its sounds. Our matching also folds long vowels onto short ones — Aarav and Arav both read as “A” — so a pada written with a doubled vowel can only be reached by a spelling we do not currently publish.`,
    },
  ];

  const body = `  <h1>All ${inr(NAKSHATRAS.length)} nakshatras and their pada syllables</h1>
  <p class="lede">The ${inr(ALL_PADAS.length)} syllables of the Avakahada chakra, the star and quarter each one belongs to, and the moon sign it feeds — the table a family is read from at a namkaran.</p>

  <div class="tags">
    <span class="tag">${inr(NAKSHATRAS.length)} stars · ${inr(ALL_PADAS.length)} padas</span>
    <span class="tag">${esc(arc(NAK_ARC_MINUTES))} each</span>
    <span class="tag">${inr(straddling)} cross a sign boundary</span>
    <span class="tag">${inr(published.length)} with published names</span>
  </div>

  <section>
    <h2>The ${inr(NAKSHATRAS.length)} stars in ecliptic order</h2>
    <p class="sub">Sidereal arcs measured from the Lahiri zero point — the frame the birth-date calculator reports in.</p>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>#</th><th>Nakshatra</th><th>Sidereal arc</th><th>Pada syllables</th><th>Rashi</th><th>Names</th></tr></thead>
        <tbody>
${starRows}
        </tbody>
      </table>
    </div>
    <p class="note">${inr(straddling)} of the ${inr(NAKSHATRAS.length)} cross a sign boundary partway through, so their padas do not all share a moon sign. A star with no name count has no page yet: the bar for publishing one is a single published name beginning with one of its syllables, and it is recounted on every build.</p>
  </section>

  <section class="prose">
    <h2>Why a pandit gives you a letter rather than a name</h2>
    <p>The Moon crosses the whole zodiac in about twenty-seven days, which is where the twenty-seven stars come from: one for each day of that circuit, each ${esc(arc(NAK_ARC_MINUTES))} wide. At a namkaran the pandit reads the Moon's longitude at the moment of birth from the janam kundli, which fixes the star and then, more finely, which quarter of it the Moon occupied. That quarter is the pada, and each pada carries a syllable the child's name traditionally begins with.</p>
    <p>The convention is practical as much as it is astrological. A syllable is a constraint a whole family can work inside — grandparents, parents and a priest can agree on “it starts with Chu” long before they agree on a name — and it keeps the name tied to the chart rather than to fashion, which is the point of the ceremony. It is a convention rather than a rule: a name outside the four syllables is not an incorrect name.</p>
  </section>

  <section>
    <h2>Every syllable, alphabetically</h2>
    <p class="sub">All ${inr(ALL_PADAS.length)} pada syllables with the star, quarter, moon sign and arc each belongs to, and how many published names begin with it.</p>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>Syllable</th><th>Nakshatra</th><th>Pada</th><th>Rashi</th><th>Arc</th><th>Names</th></tr></thead>
        <tbody>
${syllableRows}
        </tbody>
      </table>
    </div>
    <p class="note">Name counts match a name to a syllable by its longest opening prefix, so “Chha” wins over “Cha” over “Ch”, and long vowels are folded onto short ones before matching. That is the same lookup the live rashi tile runs, which is why a name shown under a star here reads the same on its own page.</p>
  </section>

  <section class="prose">
    <h2>Questions families ask</h2>
${faqHtml(faqs)}
  </section>

${ctaBlock(
  "Know the birth date? Then you do not need this table.",
  "Enter the date and, if you have it, the time — we compute the Moon's actual position and give you the star and the pada rather than reading it back from a name.",
)}

${
  published.length
    ? `  <section>
    <h2>Star pages</h2>
    <p class="sub">Each lists the published names under its four padas, with Devanagari, Chaldean root and the sign each pada feeds.</p>
    <div class="grid-links">
${gridLinks(published.map((s) => ({ href: nakshatraPath(s.name), label: s.name, sub: `${s.syllables.join(" · ")} · ${inr(s.names)} ${plural(s.names, "name", "names")}` })))}
    </div>
  </section>

`
    : ""
}  <section>
    <h2>Elsewhere on the site</h2>
    <p class="sub">The same chakra read by sign, and the other things we compute about a name.</p>
    <div class="related">
        <a href="${RASHI_INDEX_PATH}">The ${inr(r.signs.length)} rashis and their syllables</a>
        <a href="${NUMEROLOGY_HUB}">Chaldean numerology</a>
        <a href="${NAMES_INDEX_PATH}">Names by letter and meaning</a>
        <a href="${NAME_INDEX}">All ${inr(r.corpus.length)} published names</a>
        <a href="${EXPLORE_PATH}">Everything we publish</a>
    </div>
  </section>`;

  return {
    path: NAK_INDEX_PATH,
    html: renderSeoPage({
      title: `All 27 nakshatras and their pada syllables — the Avakahada chakra | Naam Dekho`,
      metaDesc: `The ${inr(ALL_PADAS.length)} namkaran syllables of the ${inr(NAKSHATRAS.length)} nakshatras, each with its pada, moon sign and sidereal arc, plus how many published Indian names begin with it.`,
      path: NAK_INDEX_PATH,
      siteOrigin: r.siteOrigin,
      crumbs: [
        { label: "Home", href: "/" },
        { label: "Explore", href: EXPLORE_PATH },
        { label: "Nakshatras" },
      ],
      jsonLd: [
        faqLd(faqs),
        itemListLd(
          "Nakshatra name pages",
          published.map((s) => ({ name: `${s.name} nakshatra`, url: `${r.siteOrigin}${nakshatraPath(s.name)}` })),
        ),
      ],
      body,
    }),
    priority: "0.7",
    changefreq: "monthly",
  };
}

// ══════════════════════════════════════════════════════════════════════
// /rashi/index.html
// ══════════════════════════════════════════════════════════════════════

function renderRashiIndex(r: Reading): SeoDoc {
  const published = r.signs.filter((s) => s.page);

  const signRows = r.signs
    .map((s) => {
      const indices = s.cells.map((c) => c.index);
      const from = Math.min(...indices);
      const to = Math.max(...indices);
      const stars: Array<{ name: string; padas: number[] }> = [];
      for (const c of s.cells) {
        const star = r.stars[c.nakshatra];
        const last = stars[stars.length - 1];
        if (last && last.name === star.name) last.padas.push(c.pada);
        else stars.push({ name: star.name, padas: [c.pada] });
      }
      return `        <tr>
          <td><strong>${s.page ? cellLink(rashiPath(s.key), s.sanskrit) : esc(s.sanskrit)}</strong></td>
          <td>${esc(s.western)}</td>
          <td class="num">${esc(spanOf(from, to))}</td>
          <td>${esc(stars.map((st) => `${st.name}${st.padas.length < 4 ? ` (${st.padas.length === 1 ? "pada" : "padas"} ${st.padas.join(", ")})` : ""}`).join(", "))}</td>
          <td>${s.syllables.map((x) => esc(x)).join(" · ")}</td>
          <td class="num">${s.names > 0 ? inr(s.names) : "—"}</td>
        </tr>`;
    })
    .join("\n");

  const padasPerSign = r.signs[0]?.cells.length ?? 0;

  const faqs: Faq[] = [
    {
      q: "Is a rashi the same as a star sign?",
      a: "They share the twelve names and very little else. A rashi in Indian astrology is read from the Moon and measured on the sidereal zodiac, which is tied to the stars; a Western sun sign is read from the Sun and measured on the tropical zodiac, which is tied to the equinox. The two frames have drifted about twenty-four degrees apart, so the sign in the bracket is the constellation the Indian sign shares its name with, not a translation of one reading into the other. Most people's rashi and their sun sign are different signs.",
    },
    {
      q: "How can a name have a rashi at all?",
      a: `Through the Avakahada chakra. Each of the ${inr(ALL_PADAS.length)} pada syllables belongs to a moon sign, so a name's opening sound points back at one. That is a reverse lookup and this site says so on every page that uses it: traditionally the chart comes first and the syllable is derived from it, not the other way round. What the lookup is genuinely good for is checking a name you already like against a syllable you were already given.`,
    },
    {
      q: `How many syllables does each sign have?`,
      a: `${inr(padasPerSign)}. Each sign takes two and a quarter nakshatras — nine padas of ${arc(PADA_ARC_MINUTES)} each, which comes to the ${arc(padasPerSign * PADA_ARC_MINUTES)} of a sign. That is why some stars appear under two signs in the table above: the boundary falls partway through them.`,
    },
    {
      q: "Why does a name sometimes appear under two signs?",
      a: "Because a few syllables sit under more than one pada in the chakra, and where they do we list every match rather than choosing one. The live check behaves the same way. It is also why a name page can name two possible stars.",
    },
  ];

  const body = `  <h1>The ${inr(r.signs.length)} rashis, and what each is called in English</h1>
  <p class="lede">Every moon sign with the nakshatras and pada syllables it takes in, its sidereal arc, and how many published names begin with one of its sounds.</p>

  <div class="tags">
    <span class="tag">${inr(r.signs.length)} signs</span>
    <span class="tag">${inr(padasPerSign)} syllables each</span>
    <span class="tag">${esc(arc(padasPerSign * PADA_ARC_MINUTES))} per sign</span>
    <span class="tag">${inr(published.length)} with published names</span>
  </div>

  <section>
    <h2>All ${inr(r.signs.length)} signs</h2>
    <p class="sub">In zodiac order. Arcs are sidereal, measured from the Lahiri zero point.</p>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>Rashi</th><th>Western name</th><th>Sidereal arc</th><th>Nakshatras</th><th>Chakra syllables</th><th>Names</th></tr></thead>
        <tbody>
${signRows}
        </tbody>
      </table>
    </div>
    <p class="note">A sign without a name count has no page in this build. The bar is ${inr(RASHI_MIN_NAMES)} published names whose opening sound falls in the sign — below that the page would be the nine-pada grid and little else, and the nakshatra pages already carry that grid in more detail.</p>
  </section>

  <section class="prose">
    <h2>Moon sign, not sun sign</h2>
    <p>The word rashi usually means the moon sign — the sign the Moon occupied at birth. It is the one a pandit works from at a namkaran, and it is why the nakshatra and the rashi are two readings of the same fact: the Moon's longitude fixes the star, and the star's position fixes the sign.</p>
    <p>The English name in the second column is the constellation the sign is named after, not an equivalent reading. Indian astrology measures on the sidereal zodiac, anchored to the fixed stars; Western astrology measures on the tropical zodiac, anchored to the equinox. The two were aligned roughly seventeen centuries ago and have separated by about twenty-four degrees since, which is enough to move most people one sign. Somebody who is Vrishabha here is often Gemini in a magazine column, and neither is a mistake — they are answers to different questions.</p>
    <p class="note">These are traditional readings, offered as cultural reference. A chart cast from the actual birth details is the authority, and a name is not made better or worse by which sign it points at.</p>
  </section>

  <section class="prose">
    <h2>How a sign is worked out from a name here</h2>
    <p>The chakra is a table of ${inr(ALL_PADAS.length)} syllables. We take the name's opening sound, match it by longest prefix — “Chha” before “Cha” before “Ch” — and read off the pada, the star and the sign that syllable belongs to. Long vowels are folded onto short ones first, so Aarav and Arav land in the same place. That is exactly the lookup the live rashi tile runs, and it is why a name listed under a sign here reads the same on its own name page.</p>
    <p>What it cannot do is tell you a child's sign. Only the birth details can, because only they say where the Moon was.</p>
  </section>

  <section class="prose">
    <h2>Questions families ask</h2>
${faqHtml(faqs)}
  </section>

${ctaBlock(
  "Have the birth date rather than the syllable?",
  "The check computes the Moon's position from the date, and the time if you have it, instead of reading a sign back from a name.",
)}

${
  published.length
    ? `  <section>
    <h2>Sign pages</h2>
    <p class="sub">Each lists the published names under the sign's ${inr(padasPerSign)} syllables, the stars that feed it, and how the names spread across the Chaldean roots.</p>
    <div class="grid-links">
${gridLinks(published.map((s) => ({ href: rashiPath(s.key), label: s.sanskrit, sub: `${s.western} · ${inr(s.names)} ${plural(s.names, "name", "names")}` })))}
    </div>
  </section>

`
    : ""
}  <section>
    <h2>Elsewhere on the site</h2>
    <p class="sub">The same chakra read by star, and the other readings we compute.</p>
    <div class="related">
        <a href="${NAK_INDEX_PATH}">All ${inr(NAKSHATRAS.length)} nakshatras and their ${inr(ALL_PADAS.length)} syllables</a>
        <a href="${NUMEROLOGY_HUB}">Chaldean numerology</a>
        <a href="${NAMES_INDEX_PATH}">Names by letter and meaning</a>
        <a href="${NAME_INDEX}">All ${inr(r.corpus.length)} published names</a>
        <a href="${EXPLORE_PATH}">Everything we publish</a>
    </div>
  </section>`;

  return {
    path: RASHI_INDEX_PATH,
    html: renderSeoPage({
      title: `The 12 rashis and their Western equivalents — syllables, stars and arcs | Naam Dekho`,
      metaDesc: `Every rashi with the English sign it is named after, the nakshatras and ${inr(padasPerSign)} chakra syllables it takes in, and how many published Indian names begin with one of its sounds.`,
      path: RASHI_INDEX_PATH,
      siteOrigin: r.siteOrigin,
      crumbs: [
        { label: "Home", href: "/" },
        { label: "Explore", href: EXPLORE_PATH },
        { label: "Rashis" },
      ],
      jsonLd: [
        faqLd(faqs),
        itemListLd(
          "Rashi name pages",
          published.map((s) => ({ name: `${s.label} baby names`, url: `${r.siteOrigin}${rashiPath(s.key)}` })),
        ),
      ],
      body,
    }),
    priority: "0.7",
    changefreq: "monthly",
  };
}

// ══════════════════════════════════════════════════════════════════════
// /domains/index.html
// ══════════════════════════════════════════════════════════════════════

function renderDomainIndex(r: Reading): SeoDoc {
  const byPrice = [...r.endings].sort((a, b) => a.priceInr - b.priceInr || a.tld.localeCompare(b.tld));
  const cheapest = byPrice[0];
  const dearest = byPrice[byPrice.length - 1];
  const com = r.endings.find((e) => e.tld === "com");
  const total = r.endings.reduce((sum, e) => sum + e.priceInr, 0);
  const median = byPrice[Math.floor(byPrice.length / 2)];

  const priceRows = byPrice
    .map((e) => {
      const multiple = e.priceInr / cheapest.priceInr;
      const vsCom = com ? e.priceInr - com.priceInr : 0;
      return `        <tr>
          <td><strong>${e.page ? cellLink(domainPath(e.tld), e.label) : esc(e.label)}</strong></td>
          <td class="num">₹${inr(e.priceInr)}</td>
          <td class="num">${e.rank}</td>
          <td class="num">${multiple < 1.05 ? "—" : `${multiple.toFixed(1)}×`}</td>
          <td class="num">${
            !com || e.tld === "com"
              ? "—"
              : vsCom === 0
                ? "same"
                : `${vsCom > 0 ? "+" : "−"}₹${inr(Math.abs(vsCom))}`
          }</td>
        </tr>`;
    })
    .join("\n");

  const bands = [
    { label: `Under ₹1,000`, test: (n: number) => n < 1000 },
    { label: `₹1,000 to ₹2,999`, test: (n: number) => n >= 1000 && n < 3000 },
    { label: `₹3,000 to ₹9,999`, test: (n: number) => n >= 3000 && n < 10000 },
    { label: `₹10,000 and above`, test: (n: number) => n >= 10000 },
  ]
    .map((b) => ({ ...b, endings: byPrice.filter((e) => b.test(e.priceInr)) }))
    .filter((b) => b.endings.length > 0);

  const bandRows = bands
    .map(
      (b) => `        <tr>
          <td><strong>${esc(b.label)}</strong></td>
          <td class="num">${inr(b.endings.length)}</td>
          <td>${b.endings.map((e) => esc(e.label)).join(", ")}</td>
        </tr>`,
    )
    .join("\n");

  const lengthRows = r.labelLengths
    .map(
      (l) => `        <tr>
          <td class="num">${l.length}</td>
          <td class="num">${inr(l.names)}</td>
          <td class="num">${((l.names / Math.max(r.labelNames, 1)) * 100).toFixed(1)}%</td>
        </tr>`,
    )
    .join("\n");

  const faqs: Faq[] = [
    {
      q: "Are these the prices I will actually pay?",
      a: `No. They are indicative rupee figures carried in our own table so the endings can be compared against each other, and they are first-year prices — most registrars discount the first year and charge more at renewal. Treat them as the shape of the market and the registrar's checkout page as the number you pay. A domain is also a rental rather than a purchase: you pay it every year for as long as the brand exists.`,
    },
    {
      q: "What does the availability check actually do?",
      a: "It queries RDAP, the structured JSON service that replaced WHOIS, once per ending. A 404 means nothing is registered and the address is free; a 200 comes back with the registration's own dates. When a lookup fails or times out the ending is reported as unchecked, never as available — availability is the answer somebody spends money on, so it has to come from a real response.",
    },
    {
      q: `What would one name cost across every ending?`,
      a: `₹${inr(total)} for the first year at these indicative prices, across all ${inr(r.endings.length)} endings — from ₹${inr(cheapest.priceInr)} for ${cheapest.label} to ₹${inr(dearest.priceInr)} for ${dearest.label}. Almost nobody should do that. The usual pattern is one primary address and one or two defensive registrations in the endings a customer is most likely to mistype.`,
    },
    {
      q: "Does owning the domain mean I own the name?",
      a: "No. A domain is a rental from a registrar; a trademark is a right granted on a register, in named classes, after examination. They are unrelated systems and each can be held by a different party. Working out which of the 45 classes your business files in is the other half of the job, and it is the one that decides whether anybody can stop you trading under the name.",
    },
  ];

  const body = `  <h1>Domain endings and what they cost in India</h1>
  <p class="lede">The ${inr(r.endings.length)} endings the check runs on every name, with the indicative first-year price of each, compared against each other rather than quoted from a registrar.</p>

  <div class="tags">
    <span class="tag">${inr(r.endings.length)} endings</span>
    <span class="tag">₹${inr(cheapest.priceInr)} to ₹${inr(dearest.priceInr)}</span>
    <span class="tag">Median ₹${inr(median.priceInr)}</span>
    <span class="tag">${inr(Math.round(dearest.priceInr / cheapest.priceInr))}× spread</span>
  </div>

  <section>
    <h2>All ${inr(r.endings.length)} endings, cheapest first</h2>
    <p class="sub">Indicative first-year prices, from the same table the live check prices its tiles from.</p>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>Ending</th><th>First year</th><th>Rank</th><th>× cheapest</th><th>vs ${com ? esc(com.label) : "—"}</th></tr></thead>
        <tbody>
${priceRows}
        </tbody>
      </table>
    </div>
    <p class="note">These are indicative and first-year. Renewal rates are set by the registrar, not by us, and are usually higher than the first year — check the renewal price on the registrar's own page before committing a brand to an ending.</p>
  </section>

  <section>
    <h2>The four price bands</h2>
    <p class="sub">The same ${inr(r.endings.length)} endings grouped, because the gap between them is what decides most shortlists.</p>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>Band</th><th>Endings</th><th>Which</th></tr></thead>
        <tbody>
${bandRows}
        </tbody>
      </table>
    </div>
    <div class="cards" style="margin-top:14px">
      <div class="card">
        <div class="k">All ${inr(r.endings.length)}, first year</div>
        <div class="v">₹${inr(total)}</div>
        <div class="n">What one name would cost in every ending at once</div>
      </div>
      <div class="card">
        <div class="k">Cheapest</div>
        <div class="v" style="font-size:24px">${esc(cheapest.label)}</div>
        <div class="n">₹${inr(cheapest.priceInr)} for the first year</div>
      </div>
      <div class="card">
        <div class="k">Dearest</div>
        <div class="v" style="font-size:24px">${esc(dearest.label)}</div>
        <div class="n">₹${inr(dearest.priceInr)}, ${(dearest.priceInr / cheapest.priceInr).toFixed(0)} times the cheapest</div>
      </div>
    </div>
  </section>

  <section class="prose">
    <h2>What the check does per ending</h2>
    <p>Each ending is one RDAP lookup against the name's DNS label, run in parallel with the rest and reported as its own tile. RDAP returns 404 when nothing is registered, which is the only thing we read as available, and 200 with the registration's dates when something is. A lookup that fails is reported as unchecked rather than free, because a false “available” is the one error on this page that costs somebody money.</p>
    <p>The label itself is not the name as typed. It is normalised first — Unicode composed, lowercased, and stripped to letters and digits — because that is the only string DNS can hold. Two names that look different on a certificate can normalise to the same address, and that is worth knowing before a logo is drawn.</p>
  </section>

${
  r.labelNames > 0
    ? `  <section>
    <h2>How long our published names are as addresses</h2>
    <p class="sub">${inr(r.labelNames)} of the ${inr(r.corpus.length)} published names produce a usable DNS label. Length after normalisation, which is what a registrar sees.</p>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>Characters</th><th>Names</th><th>Share</th></tr></thead>
        <tbody>
${lengthRows}
        </tbody>
      </table>
    </div>
    <p class="note">Counted, not asserted: this is the distribution of our own corpus after the product's normaliser has run, and it says nothing about which of those addresses are free. Only a live lookup can say that.</p>
  </section>

`
    : ""
}  <section class="prose">
    <h2>Questions founders ask</h2>
${faqHtml(faqs)}
  </section>

${ctaBlock(
  "See which endings are actually free",
  `One search runs all ${inr(r.endings.length)} endings at once, alongside the social handles, the marketplace listings and the company register.`,
)}

  <section>
    <h2>Every ending in detail</h2>
    <p class="sub">Who each one suits, who it does not, and what it costs.</p>
    <div class="grid-links">
${gridLinks(byPrice.filter((e) => e.page).map((e) => ({ href: domainPath(e.tld), label: e.label, sub: `₹${inr(e.priceInr)} first year` })))}
    </div>
  </section>

  <section>
    <h2>The other half of the name check</h2>
    <p class="sub">A domain is not a right in the name. These are.</p>
    <div class="related">
        <a href="${TRADEMARK_HUB}">Which trademark class is my business in?</a>
        <a href="${NUMEROLOGY_HUB}">What the numbers in a name are read as</a>
        <a href="${NAME_INDEX}">The published name corpus — ${inr(r.corpus.length)} names</a>
        <a href="${EXPLORE_PATH}">Everything we publish</a>
    </div>
  </section>`;

  return {
    path: DOMAIN_INDEX_PATH,
    html: renderSeoPage({
      title: `Domain prices in India — all ${inr(r.endings.length)} endings compared, first year in ₹ | Naam Dekho`,
      metaDesc: `Indicative first-year prices for ${inr(r.endings.length)} domain endings, from ₹${inr(cheapest.priceInr)} for ${cheapest.label} to ₹${inr(dearest.priceInr)} for ${dearest.label}, ranked and compared — plus how the availability check works.`,
      path: DOMAIN_INDEX_PATH,
      siteOrigin: r.siteOrigin,
      crumbs: [
        { label: "Home", href: "/" },
        { label: "Explore", href: EXPLORE_PATH },
        { label: "Domain endings" },
      ],
      jsonLd: [
        faqLd(faqs),
        itemListLd(
          "Domain endings and first-year prices",
          byPrice
            .filter((e) => e.page)
            .map((e) => ({ name: `${e.label} domain price in India`, url: `${r.siteOrigin}${domainPath(e.tld)}` })),
        ),
      ],
      body,
    }),
    priority: "0.7",
    changefreq: "monthly",
  };
}

// ══════════════════════════════════════════════════════════════════════
// /script/index.html
// ══════════════════════════════════════════════════════════════════════

function renderScriptIndex(r: Reading): SeoDoc {
  const published = r.scripts.filter((s) => s.page);
  const languages = r.scripts.reduce((n, s) => n + s.langs.length, 0);
  const shared = r.scripts.filter((s) => s.langs.length > 1);

  const scriptRows = [...r.scripts]
    .sort((a, b) => b.speakers - a.speakers)
    .map(
      (s) => `        <tr>
          <td><strong>${s.page ? cellLink(scriptPath(s.slug), s.script) : esc(s.script)}</strong></td>
          <td>${esc(s.langs.join(", "))}</td>
          <td class="num">${(s.speakers / 1e7).toFixed(1)} crore</td>
          <td class="num">${inr(s.rendered)}</td>
          <td class="num">${s.dropped > 0 ? inr(s.dropped) : "—"}</td>
        </tr>`,
    )
    .join("\n");

  const demoCards = r.demo
    ? [...r.demo.byScript.entries()]
        .map(
          ([script, text]) => `      <div class="script">
        <div class="script-lang">${esc(script)}</div>
        <div class="script-text" style="font-family:${script === "Devanagari" ? "'Noto Sans Devanagari',serif" : "serif"}">${esc(text)}</div>
      </div>`,
        )
        .join("\n")
    : "";

  const faqs: Faq[] = [
    {
      q: `Why ${inr(r.scripts.length)} pages for ${inr(languages)} languages?`,
      a: `Because a script is not a language. ${joinAnd(shared.map((s) => `${s.langs.join(" and ")} are written in ${s.script}`))}, so those languages share a page and a rendering — the letters are the same letters. Each page is filed under the language most people search with, which is why the ${shared.map((s) => s.script).join(" and ")} ${plural(shared.length, "page is", "pages are")} named for a language rather than for the script.`,
    },
    {
      q: "Why is a name sometimes missing from a script?",
      a: "Because the conversion could not be done honestly. Some scripts have no letter for a sound Devanagari distinguishes, and when a conversion leaves raw Devanagari characters standing in the output we drop that rendering instead of publishing a word with a foreign letter in the middle of it. A page that says “here is your name in Tamil” without saying what Tamil cannot keep is selling a certainty the engine does not have.",
    },
    {
      q: "How is the conversion done?",
      a: `The romanised spelling is read into Devanagari first, and every other script is converted out of that. Devanagari is the pivot because it is the script the transliteration rules are best defined for, and it is why the first step is the one that loses the most: several romanised spellings can land on the same Devanagari form. ${inr(r.devaNames)} of the ${inr(r.corpus.length)} published names produce a Devanagari form at all, and each script page shows what its own step then keeps and loses.`,
    },
    {
      q: "Can I use these spellings on a certificate or a passport?",
      a: "They are a computed rendering, not an official spelling. Whoever issues the document decides how a name is written on it, and families often have a spelling they have used for generations that a converter will not reproduce. Take these as a starting point and a check — particularly for a script nobody in the family reads — rather than as an authority.",
    },
  ];

  const body = `  <h1>Your name in ${inr(r.scripts.length)} Indian scripts</h1>
  <p class="lede">${inr(r.scripts.length)} scripts, ${inr(languages)} languages, and what our transliteration engine can and cannot keep when it moves a name between them.</p>

  <div class="tags">
    <span class="tag">${inr(r.scripts.length)} scripts · ${inr(languages)} languages</span>
    <span class="tag">${inr(r.devaNames)} names converted</span>
    <span class="tag">${inr(published.length)} with a page</span>
  </div>

${
  r.demo
    ? `  <section>
    <h2>One name, every script</h2>
    <p class="sub">${esc(r.demo.name)} — the shortest published name every script here can write, so nothing below is a special case.</p>
    <div class="scripts">
${demoCards}
    </div>
    <p class="note">Rendered by the same engine the live check runs, at build time. The romanised spelling goes to Devanagari first and out to the rest from there.</p>
  </section>

`
    : ""
}  <section>
    <h2>The ${inr(r.scripts.length)} scripts</h2>
    <p class="sub">Speaker figures are first-language speakers in India, Census of India 2011, summed across the languages that share the script.</p>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>Script</th><th>Languages</th><th>Speakers</th><th>Names rendered</th><th>Dropped</th></tr></thead>
        <tbody>
${scriptRows}
        </tbody>
      </table>
    </div>
    <p class="note">“Dropped” is the count of published names this script could not write without leaving a Devanagari character standing in the output. It is measured by running the corpus through the engine at build time, not estimated. A script publishes a page once ${inr(SCRIPT_MIN_NAMES)} names render in it — below that the worked table, which is the reason to visit, is not yet a table.</p>
  </section>

  <section class="prose">
    <h2>What a transliteration can and cannot do</h2>
    <p>Indian scripts are not alphabets swapped one for one. They are abugidas built on the same broad inventory of sounds, but the inventories differ: Tamil does not separate the voiced and unvoiced stops the way Devanagari does, Gurmukhi has no ष and writes श with a nukta instead, and several scripts have no independent letter for a vowel another script writes plainly. A converter that pushes through those gaps produces a word that looks right to somebody who does not read the script and wrong to everybody who does.</p>
    <p>So the engine carries an explicit rule: where a conversion leaves Devanagari characters in the output, the rendering is dropped rather than displayed. The counts in the table above are that rule, applied to our own corpus and reported. Each script's page goes further and lists the Devanagari letters that script writes with a single letter of its own, with the number of published names each merge touches.</p>
    <p class="note">A name is written the way its family writes it. This is a computed spelling offered as a starting point, not a correction of one.</p>
  </section>

  <section class="prose">
    <h2>Questions people ask</h2>
${faqHtml(faqs)}
  </section>

${ctaBlock(
  "Write any name, not just a published one",
  "The check renders a name across every script it can hold, alongside its numerology, its birth star and where the name is already taken online.",
)}

${
  published.length
    ? `  <section>
    <h2>Script pages</h2>
    <p class="sub">Each carries the corpus written out in that script, the letters those names need, and what the conversion cannot keep.</p>
    <div class="grid-links">
${gridLinks(published.map((s) => ({ href: scriptPath(s.slug), label: s.script, sub: `${s.langs.join(", ")} · ${inr(s.rendered)} names` })))}
    </div>
  </section>

`
    : ""
}  <section>
    <h2>Elsewhere on the site</h2>
    <p class="sub">The other things we compute about a name.</p>
    <div class="related">
        <a href="${NAMES_INDEX_PATH}">Names by letter and meaning</a>
        <a href="${NAK_INDEX_PATH}">The ${inr(NAKSHATRAS.length)} nakshatras and their syllables</a>
        <a href="${NUMEROLOGY_HUB}">Chaldean numerology</a>
        <a href="${NAME_INDEX}">All ${inr(r.corpus.length)} published names</a>
        <a href="${EXPLORE_PATH}">Everything we publish</a>
    </div>
  </section>`;

  return {
    path: SCRIPT_INDEX_PATH,
    html: renderSeoPage({
      title: `Write your name in ${inr(r.scripts.length)} Indian scripts — what converts and what does not | Naam Dekho`,
      metaDesc: `${inr(r.scripts.length)} Indian scripts across ${inr(languages)} languages, with the number of published names each one can write, the names it cannot, and one name rendered in all of them.`,
      path: SCRIPT_INDEX_PATH,
      siteOrigin: r.siteOrigin,
      crumbs: [
        { label: "Home", href: "/" },
        { label: "Explore", href: EXPLORE_PATH },
        { label: "Indian scripts" },
      ],
      jsonLd: [
        faqLd(faqs),
        itemListLd(
          "Indian script pages",
          published.map((s) => ({ name: `Names in ${s.script}`, url: `${r.siteOrigin}${scriptPath(s.slug)}` })),
        ),
      ],
      body,
    }),
    priority: "0.7",
    changefreq: "monthly",
  };
}

// ══════════════════════════════════════════════════════════════════════
// /names/index.html
// ══════════════════════════════════════════════════════════════════════

function renderNamesIndex(r: Reading): SeoDoc {
  const letterPages = r.letters.filter((l) => l.page);
  const withGender = r.genders.boy + r.genders.girl + r.genders.unisex;

  const letterRows = r.letters
    .map((l) => {
      const pages = [
        l.page ? cellLink(letterPath(l.letter), "all") : "",
        l.boyPage ? cellLink(genderLetterPath("boy", l.letter), "boys'") : "",
        l.girlPage ? cellLink(genderLetterPath("girl", l.letter), "girls'") : "",
      ].filter(Boolean);
      return `        <tr>
          <td><strong>${esc(l.letter)}</strong></td>
          <td class="num">${inr(l.total)}</td>
          <td class="num">${l.boy > 0 ? inr(l.boy) : "—"}</td>
          <td class="num">${l.girl > 0 ? inr(l.girl) : "—"}</td>
          <td class="num">${l.unisex > 0 ? inr(l.unisex) : "—"}</td>
          <td>${pages.length ? pages.join(" · ") : "—"}</td>
        </tr>`;
    })
    .join("\n");

  const themeRows = r.themes
    .map((t) => {
      const sample = t.names.slice(0, 6).map((n) => cellLink(namePath(n.name), n.name)).join(", ");
      const rest = t.names.length - Math.min(t.names.length, 6);
      return `        <tr>
          <td><strong>${cellLink(themePath(t.slug), cap(t.label))}</strong></td>
          <td class="num">${inr(t.names.length)}</td>
          <td>${sample}${rest > 0 ? ` and ${inr(rest)} more` : ""}</td>
        </tr>`;
    })
    .join("\n");

  const originRows = r.origins
    .slice(0, 10)
    .map(
      (o) => `        <tr>
          <td><strong>${esc(o.origin)}</strong></td>
          <td class="num">${inr(o.names)}</td>
          <td class="num">${((o.names / Math.max(r.corpus.length, 1)) * 100).toFixed(1)}%</td>
        </tr>`,
    )
    .join("\n");

  const faqs: Faq[] = [
    {
      q: "Why does a letter in the table have no page?",
      a: `Because fewer than ${inr(LETTER_MIN_NAMES)} published names begin with it. A letter page's substance is three computed tables — the names, how they spread across the Chaldean roots, and the chakra syllables they open on — and below about a dozen names the structure outweighs the content and the page becomes a template with a letter swapped in. The names themselves are not hidden: every one has its own page and the full index lists all of them.`,
    },
    {
      q: "Where do the meanings come from?",
      a: `From sources we have checked, recorded against the name, and cited on its page. ${inr(r.withMeaning)} of the ${inr(r.corpus.length)} published names carry a verified meaning today. A name without one renders without a meaning block rather than with a plausible sentence, and it is not grouped into a theme at all — which is why the theme pages can print each name's recorded meaning verbatim beside it.`,
    },
    {
      q: "How are the meaning groups decided?",
      a: "The grouping is ours and the wording is the source's. Meanings are split into the separate readings they carry, reduced to their content words, and folded together only through a table of word families somebody has confirmed — so “peaceful” and “calm” are one theme and “delight” is not filed under “light”. Every theme page prints the source phrasings that put each name there, so the grouping can be inspected rather than trusted.",
    },
    {
      q: "Is every published name on this page?",
      a: `No. This page is the groupings — by letter, by gender, by meaning. The full alphabetical list of all ${inr(r.corpus.length)} names is the name index, and every name there has a page of its own with its scripts, its numbers and its birth star.`,
    },
  ];

  const body = `  <h1>Indian baby names, grouped</h1>
  <p class="lede">${inr(r.corpus.length)} published names sorted the two ways parents actually search: by the letter they start with, and by what they mean.</p>

  <div class="tags">
    <span class="tag">${inr(r.corpus.length)} names</span>
    <span class="tag">${inr(r.withMeaning)} verified meanings</span>
    <span class="tag">${inr(letterPages.length)} letter ${plural(letterPages.length, "page", "pages")}</span>
    <span class="tag">${inr(r.themes.length)} meaning ${plural(r.themes.length, "theme", "themes")}</span>
  </div>

  <section>
    <h2>By first letter</h2>
    <p class="sub">Every letter the corpus covers, with what it holds. A gendered page appears only where that half of the letter stands on its own.</p>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>Letter</th><th>Names</th><th>Boys</th><th>Girls</th><th>Unisex</th><th>Pages</th></tr></thead>
        <tbody>
${letterRows}
        </tbody>
      </table>
    </div>
    <p class="note">A letter needs ${inr(LETTER_MIN_NAMES)} published names for a page, and a gendered page needs ${inr(LETTER_MIN_GENDER_NAMES)} of its own without being most of the letter — a boys' page that is four names in five of the letter page is the letter page with a different heading, and two URLs carrying the same list compete with each other. Counts are recomputed on every build.</p>
  </section>

${
  r.themes.length
    ? `  <section>
    <h2>By meaning</h2>
    <p class="sub">Themes grouped from verified meanings only. ${inr(r.themes.length)} ${plural(r.themes.length, "theme has", "themes have")} enough names to carry a page.</p>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>Theme</th><th>Names</th><th>Some of them</th></tr></thead>
        <tbody>
${themeRows}
        </tbody>
      </table>
    </div>
    <p class="note">Themes overlap on purpose: a name recorded as “the first rays of the sun” belongs under both light and sun, and both pages list it. What is not published is a theme that is almost entirely another theme's list, because two pages carrying the same names compete with each other and neither wins.</p>
  </section>

`
    : ""
}${
    r.origins.length
      ? `  <section>
    <h2>Where the names come from</h2>
    <p class="sub">Recorded origins across the ${inr(r.corpus.length)} published names.</p>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>Origin</th><th>Names</th><th>Share</th></tr></thead>
        <tbody>
${originRows}
        </tbody>
      </table>
    </div>
  </section>

`
      : ""
  }  <section>
    <h2>How the corpus is put together</h2>
    <div class="prose">
      <p>Every name here is published deliberately rather than scraped into a list. ${inr(withGender)} of the ${inr(r.corpus.length)} carry a recorded gender and ${inr(r.withMeaning)} carry a meaning we have verified against a source we can cite. A meaning we have not verified is not printed anywhere on this site — not as a guess, not as “meaning unknown”, and not as a group a name gets filed under. It is the single rule the whole product rests on, and it is the reason these pages can be shorter than a name mill's and still be worth more.</p>
      <p>What each name page adds is computed rather than collected: the name written across the Indian scripts that can hold it, its Chaldean compound and root numbers with the ruling planet, the birth star traditionally linked to its first sound, the short forms a family is likely to land on, and a pronunciation reading. All of it comes from the same engines the live check runs, so a page cannot drift away from what the product says.</p>
    </div>
  </section>

  <section class="prose">
    <h2>Questions parents ask</h2>
${faqHtml(faqs)}
  </section>

${ctaBlock(
  "Thinking of a name for a business too?",
  "Run a live check across domains, social handles, marketplaces, the company register and all 45 trademark classes.",
)}

${
  letterPages.length
    ? `  <section>
    <h2>Letter pages</h2>
    <div class="grid-links">
${gridLinks(letterPages.map((l) => ({ href: letterPath(l.letter), label: l.letter, sub: `${inr(l.total)} ${plural(l.total, "name", "names")}` })))}
    </div>
  </section>

`
    : ""
}${
    r.themes.length
      ? `  <section>
    <h2>Meaning pages</h2>
    <div class="grid-links">
${gridLinks(r.themes.map((t) => ({ href: themePath(t.slug), label: cap(t.label), sub: `${inr(t.names.length)} ${plural(t.names.length, "name", "names")}` })))}
    </div>
  </section>

`
      : ""
  }  <section>
    <h2>The other ways in</h2>
    <p class="sub">The same names read by star, by sign and by number.</p>
    <div class="related">
        <a href="${NAME_INDEX}">All ${inr(r.corpus.length)} names, alphabetically</a>
        <a href="${NAK_INDEX_PATH}">By nakshatra — the ${inr(ALL_PADAS.length)} namkaran syllables</a>
        <a href="${RASHI_INDEX_PATH}">By rashi — the ${inr(r.signs.length)} moon signs</a>
        <a href="${NUMEROLOGY_HUB}">By Chaldean number</a>
        <a href="${SCRIPT_INDEX_PATH}">In ${inr(r.scripts.length)} Indian scripts</a>
        <a href="${EXPLORE_PATH}">Everything we publish</a>
    </div>
  </section>`;

  const listed = [
    ...letterPages.map((l) => ({
      name: `Indian baby names starting with ${l.letter}`,
      url: `${r.siteOrigin}${letterPath(l.letter)}`,
    })),
    ...r.themes.map((t) => ({
      name: `Indian baby names meaning ${t.label}`,
      url: `${r.siteOrigin}${themePath(t.slug)}`,
    })),
  ];

  return {
    path: NAMES_INDEX_PATH,
    html: renderSeoPage({
      title: `Indian baby names by letter and by meaning — ${inr(r.corpus.length)} published names | Naam Dekho`,
      metaDesc: `${inr(r.corpus.length)} published Indian names grouped by first letter and by verified meaning: ${inr(letterPages.length)} letter ${plural(letterPages.length, "page", "pages")}, ${inr(r.themes.length)} meaning ${plural(r.themes.length, "page", "pages")}, and the gender split of every letter in the corpus.`,
      path: NAMES_INDEX_PATH,
      siteOrigin: r.siteOrigin,
      crumbs: [
        { label: "Home", href: "/" },
        { label: "Explore", href: EXPLORE_PATH },
        { label: "Baby names" },
      ],
      jsonLd: [faqLd(faqs), itemListLd("Indian baby name groups", listed)],
      body,
    }),
    priority: "0.7",
    changefreq: "monthly",
  };
}

// ══════════════════════════════════════════════════════════════════════
// Entry point
// ══════════════════════════════════════════════════════════════════════

/**
 * Builds the hub spine.
 *
 * RULE 2 THRESHOLD — a cluster index ships only when the cluster it indexes has
 * at least one published page, plus (for /names/) a corpus to describe. The bar
 * is deliberately different in kind from the other clusters' bars: those decide
 * whether a page has enough of its own content, and every page here does — the
 * chakra tables, the price comparison and the script measurements are on these
 * pages whatever the corpus holds. What an index cannot survive is having
 * nothing to index. A page headed "Star pages" over an empty grid is the
 * hollow doorway rule 2 is about, and it is also a promise the title breaks.
 *
 * /explore/ then ships whenever any cluster index does, and never otherwise.
 * That is not a preference, it is what keeps the breadcrumbs honest: every
 * index below names /explore/ as its parent, so the two can only ship together.
 */
export function buildHubPages(ctx: SeoCtx): SeoDoc[] {
  const r = readCorpus(ctx);

  const docs: SeoDoc[] = [];

  if (r.stars.some((s) => s.page)) docs.push(renderNakshatraIndex(r));
  if (r.signs.some((s) => s.page)) docs.push(renderRashiIndex(r));
  if (r.endings.some((e) => e.page)) docs.push(renderDomainIndex(r));
  if (r.scripts.some((s) => s.page)) docs.push(renderScriptIndex(r));
  if (r.corpus.length > 0 && (r.letters.some((l) => l.page) || r.themes.length > 0)) {
    docs.push(renderNamesIndex(r));
  }

  if (docs.length === 0) return [];
  return [renderExplore(r), ...docs];
}
