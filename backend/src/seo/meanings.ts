import { INDUSTRY_FIT, RULING_PLANET, chaldean } from "../lib/numerology.js";
import { romanToDevanagari } from "../lib/transliterate.js";
import { slugify } from "../scripts/name-corpus.js";
import { ctaBlock, esc, renderSeoPage, seoSlug, type SeoCtx, type SeoDoc } from "./shell.js";

/**
 * The meaning cluster — /names/meaning-<theme>.html.
 *
 * "Baby names meaning light", "names meaning victory": the query family a
 * parent uses when they have decided what they want the name to say and not
 * yet which name says it. Every mill site answers it with a scraped list. The
 * two things we can put on the page that they cannot are the corpus's own
 * verified meanings, printed in full and verbatim beside each name, and the
 * Chaldean reading of every name computed here at build time by the same
 * engine the live product runs.
 *
 * Only names carrying a verified meaning are clustered at all. A name whose
 * meaning we have not confirmed is not listed with a blank cell and is not
 * guessed at — it simply is not in this cluster. That is the same rule the
 * name pages and the certificate follow, and it is the reason the meaning
 * column here can be trusted end to end.
 *
 * What is ours and what is the source's: the grouping is ours, the wording is
 * the source's. Every page says so in as many words, and prints each name's
 * own recorded meaning next to it so a reader can check the grouping rather
 * than take it on trust.
 */

type CorpusEntry = SeoCtx["corpus"][number];

/**
 * RULE 2 THRESHOLDS — the two numbers that decide how many pages this cluster
 * is allowed to emit, and why they are what they are.
 *
 * MIN_NAMES = 10. The page's spine is a table where every row carries a
 * different sentence of verified meaning, so a row here is worth more than a
 * row on a letter page (name, Devanagari, number) and the bar can sit below
 * letters.ts's twelve. It cannot sit much below: the wordings table, the root
 * distribution and the origins table all describe how the theme spreads, and
 * across fewer than about ten names they stop describing a spread and start
 * reporting single rows — "1 name, root 5" repeated. Ten also keeps the title
 * honest, because the title states the count: "12 names meaning light" is a
 * promise the page keeps, "4 names meaning light" is a page a parent leaves in
 * two seconds and Google reads as a doorway. Themes below the bar are not
 * published anywhere; their names still carry their meanings on their own /n/
 * pages, which is where a reader who wants them should land.
 *
 * MAX_SUBSET_SHARE = 0.8, the same share letters.ts uses to suppress a gendered
 * page that has become its parent. Meaning themes genuinely overlap — a name
 * reading "the first rays of the sun" is under both light and sun, and both
 * pages deserve to exist — but when four names in five under the smaller theme
 * are already on the larger one, the smaller page is the larger page's list
 * with a different <h1>. Two URLs carrying the same names compete with each
 * other and neither wins, so the smaller theme yields and the larger takes the
 * query.
 *
 * Both are recomputed every build, so a theme publishes itself the moment the
 * corpus reaches the bar and withdraws itself if a corpus edit takes it below.
 *
 * LOWERED TO SIX, 23 Aug 2026. The reasoning above is kept because it is why
 * this is not lower still. What it could not know was the count: at ten,
 * exactly ONE theme cleared the bar. Measured on the same corpus — 8 gave 5
 * pages, 6 gave 10, 5 gave 15, 4 gave 23 — and the thinnest page at six was
 * 981 words against 1,043 at eight, so the distribution tables are not what
 * carries these pages either.
 *
 * Six is where the title stays honest: "6 names meaning light" is a short list
 * but it is a list. Four is where it stops being one, which is why this did
 * not go to the bottom of the measured range.
 *
 * The bar should stop mattering on its own. Only 260 of 536 names carry a
 * verified meaning today; 259 more are proposals waiting in the console's
 * review queue. As those are approved the themes thicken, and since the count
 * is recomputed every build, the pages improve without anyone editing this.
 */
const MIN_NAMES = 6;
const MAX_SUBSET_SHARE = 0.8;

/**
 * Rows in the names table before it stops being something a person reads.
 * Nothing is lost past the cap — every name has its own /n/ page and the /n/
 * index lists all of them — so the overflow note points there rather than
 * paginating a page whose value is the whole list read at once.
 */
const MAX_ROWS = 40;

/** Names named inside one wording row or one overlap row before it wraps. */
const MAX_NAMES_INLINE = 8;

/**
 * The publish rules of the clusters this one links to, recomputed here.
 *
 * Duplicated rather than imported, for the reason numerology.ts duplicates the
 * nakshatra bar: a cluster builder is handed the corpus and nothing else, so
 * the only way to know whether /names/starting-with-q.html will exist in this
 * build is to apply the rule that decides it. Linking a page the build then
 * skipped would put an internal 404 on every page in this cluster. If either
 * bar moves, it moves in two files — a cost paid once, against a broken link
 * on every page of the cluster.
 */
const LETTER_PAGE_MIN_NAMES = 12;
const NUMBER_PAGE_MIN_NAMES = 5;

const letterPath = (letter: string) => `/names/starting-with-${letter.toLowerCase()}.html`;
const numberPath = (root: number) => `/numerology/number-${root}.html`;
const themePath = (slug: string) => `/names/meaning-${slug}.html`;
const namePath = (name: string) => `/n/${slugify(name)}.html`;

/* A name with no A–Z letters totals zero and reduces to zero, which is not a
   root number in this system and has no page — the bound is here rather than
   at each call site so no link can slip past it. */
const hasNumberPage = (root: number, published: Set<number>) =>
  root >= 1 && root <= 9 && published.has(root);

/* Small formatting helpers. Copied into each cluster file rather than lifted
   into shell.ts, which is the shared contract and not ours to extend. */
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

// ── Reading a meaning ───────────────────────────────────────────────────

/**
 * Words that carry no theme of their own.
 *
 * Structural prose ("a name of", "one who", "part of"), the honorifics that
 * precede a deity's name, and the ordinals that count Vedas and avatars. Every
 * one of them would otherwise become a theme: with "name" left in, the corpus's
 * single largest cluster is /names/meaning-name.html, which is not a page.
 *
 * "Lord", "Goddess" and "Devi" are here because in this corpus they are titles
 * attached to a name — "a name of Lord Shiva" is about Shiva, not about
 * lordship. "God" is not here, because it appears as the referent itself —
 * "gift of God", "part of God" — and names meaning God is a theme a parent
 * actually searches for.
 */
const STOPWORDS = new Set([
  "the", "and", "or", "but", "for", "with", "from", "who", "whom", "whose", "which", "that",
  "this", "these", "those", "there", "her", "his", "hers", "its", "their", "one", "also",
  "very", "most", "more", "much", "such", "other", "another", "something", "someone",
  "thing", "part", "portion", "piece", "name", "named", "called", "meaning", "means",
  "form", "aspect", "epithet", "lord", "goddess", "devi", "shri", "sri", "bhagwan",
  "son", "daughter", "child", "born", "full", "used", "given", "said", "known", "person",
  "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth",
]);

/**
 * Word families — the table that makes "peaceful" and "calm" one theme.
 *
 * Written in the spirit of INDUSTRY_SYNONYMS in lib/numerology.ts: only
 * mappings we are sure of, each entry a claim a person can check. A rule-based
 * stemmer was the obvious alternative and is the wrong tool here — it folds
 * "delight" into "light" and "holy" into "hol", and a name filed under a theme
 * it does not belong to is exactly the invented fact this product exists to
 * avoid. A table can only merge words a human has confirmed belong together;
 * anything not in it stands as its own theme and is dropped by the threshold
 * if too few names carry it.
 *
 * Each variant appears in exactly one family. The key is the label the page
 * prints, so it is chosen to read after "Indian baby names meaning —".
 */
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
  // Deity spellings, folded so one god does not end up with two pages.
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

/**
 * Themes that are a deity rather than a quality, and how each is titled.
 *
 * The page has to read right in both cases. "Indian baby names meaning light"
 * is how a parent says it; "Indian baby names meaning Shiva" is not, and the
 * query they actually type is "baby names for Lord Shiva". Same URL pattern,
 * same page, two sentence templates — see themeVoice().
 */
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

/**
 * Regular plurals only, so "rays" and "ray" are one word.
 *
 * The exceptions matter more than the rule: "goddess", "lotus" and "ojas" all
 * end in s and none of them is a plural, so anything ending -ss, -us, -is, -as
 * or -os is left exactly as it was written.
 */
const singular = (w: string) =>
  w.length > 3 && w.endsWith("s") && !/(ss|us|is|as|os)$/.test(w) ? w.slice(0, -1) : w;

/** The content words of one phrase, canonicalised. */
function termsOf(phrase: string): Set<string> {
  const out = new Set<string>();
  for (const raw of phrase.toLowerCase().split(/[^a-z]+/)) {
    const word = singular(raw);
    if (word.length < 3 || STOPWORDS.has(word)) continue;
    out.add(CANONICAL[word] ?? word);
  }
  return out;
}

interface Phrase {
  /** Verbatim, as the source wrote it. Printed; never rewritten. */
  text: string;
  terms: Set<string>;
}

/**
 * A meaning, split on punctuation into the separate readings it carries.
 *
 * "bright, shining; the Mahabharata hero" is three readings, and only the
 * first two are about brightness. Splitting is what keeps the third off the
 * light page while keeping the whole sentence printed beside the name.
 * Conjunctions are deliberately NOT split on — "peaceful and calm" stays one
 * phrase, and containment folds it into "peaceful" below.
 */
function readPhrases(meaning: string): Phrase[] {
  return meaning
    .split(/[;,/()]+/)
    .map((raw) => ({ text: raw.trim().replace(/\s+/g, " ").replace(/\.$/, ""), terms: termsOf(raw) }))
    .filter((p) => p.text.length > 0 && p.terms.size > 0);
}

/**
 * Containment, the rule certificate-five-data.ts folds phrasings with.
 *
 * The certificate compares whole strings with includes(), which is safe there
 * because both sides are readings of the same name. Across a corpus it is not:
 * "delight".includes("light") would file a name meaning delight under names
 * meaning light. So containment is tested over word sets rather than
 * characters — "peaceful" is contained in "peaceful and calm", and neither
 * contains the other for "light" and "delight".
 */
const containedIn = (inner: Set<string>, outer: Set<string>) => [...inner].every((t) => outer.has(t));

// ── One corpus entry, with everything this cluster computes about it ────

interface ThemeName {
  entry: CorpusEntry;
  /** Always present: a name with no verified meaning never becomes a ThemeName. */
  meaning: string;
  phrases: Phrase[];
  /** Every theme this name belongs to. */
  terms: Set<string>;
  root: number;
  compound: number;
  devanagari: string;
  /** A–Z, or "" when the name does not open on a Latin letter. */
  letter: string;
}

function readName(entry: CorpusEntry): ThemeName | null {
  const meaning = entry.meaning?.trim();
  if (!meaning) return null;

  const phrases = readPhrases(meaning);
  // A meaning made entirely of structural words — "one of the names" — carries
  // no theme. It belongs on no page rather than on the nearest one.
  if (phrases.length === 0) return null;

  const num = chaldean(entry.name);
  const first = entry.name.trim().charAt(0).toUpperCase();

  return {
    entry,
    meaning,
    phrases,
    terms: new Set(phrases.flatMap((p) => [...p.terms])),
    root: num.root,
    compound: num.compound,
    devanagari: romanToDevanagari(entry.name),
    letter: /^[A-Z]$/.test(first) ? first : "",
  };
}

interface Theme {
  term: string;
  slug: string;
  /** What the page calls it: "light", or "Lord Shiva". */
  label: string;
  kind: "concept" | "deity";
  /** Alphabetical, so the table and the ItemList agree on order. */
  names: ThemeName[];
}

interface ThemeVoice {
  h1: string;
  title: string;
  /** Mid-sentence: "names meaning light" / "names that refer to Lord Shiva". */
  clause: string;
  /** What being on this page means, for the FAQ and the grouping note. */
  membership: string;
}

function themeVoice(theme: Theme): ThemeVoice {
  const n = inr(theme.names.length);
  if (theme.kind === "deity") {
    return {
      h1: `Indian baby names that refer to ${theme.label}`,
      title: `Indian baby names for ${theme.label} — ${n} names, each with its verified meaning | Naam Dekho`,
      clause: `names that refer to ${theme.label}`,
      membership: `its verified meaning names ${theme.label}`,
    };
  }
  return {
    h1: `Indian baby names meaning ${theme.label}`,
    title: `Baby names meaning ${theme.label} — ${n} Indian names, each with its verified meaning | Naam Dekho`,
    clause: `names meaning ${theme.label}`,
    membership: `its verified meaning carries ${theme.label} or a word we have confirmed says the same thing`,
  };
}

// ── Wordings: the same containment fold, applied within a theme ─────────

interface Wording {
  /** The shortest verbatim form recorded for this phrasing. */
  label: string;
  /** The same phrasing as other sources punctuated or capitalised it. */
  also: string[];
  names: ThemeName[];
}

/** Case, articles and spacing are not different wordings. Everything past
 *  them is, and is kept. */
const phrasingKey = (text: string) =>
  text.toLowerCase().replace(/^(the|a|an)\s+/, "").replace(/\s+/g, " ").trim();

/**
 * How the theme is actually worded across the names that carry it.
 *
 * This is the page's honesty exhibit and its most obviously uncopyable table:
 * it shows which source words put each name here, so a reader who doubts the
 * grouping can inspect it rather than argue with a list.
 *
 * The row is the distinct phrasing, NOT the folded reading. Containment — the
 * certificate's rule, and the rule that made this a theme in the first place —
 * is what decides that "light", "a ray of light" and "the first rays of the
 * sun" all belong on this page. Applied again here it would fold all three
 * into one row, because "light" is contained in each, and the table's whole
 * job is to show that they are three different sentences. The certificate
 * folds because repetition is noise when you are answering "what does this
 * name mean"; the question here is "how do the sources word it", where the
 * differences are the answer.
 */
function wordings(theme: Theme): Wording[] {
  const themeTerms = new Set([theme.term]);
  const rows = new Map<string, { texts: Set<string>; names: ThemeName[] }>();

  for (const name of theme.names) {
    for (const phrase of name.phrases) {
      if (!containedIn(themeTerms, phrase.terms)) continue;
      const key = phrasingKey(phrase.text);
      const row = rows.get(key) ?? { texts: new Set<string>(), names: [] };
      row.texts.add(phrase.text);
      if (!row.names.includes(name)) row.names.push(name);
      rows.set(key, row);
    }
  }

  return [...rows.values()]
    .map((r) => {
      const texts = [...r.texts].sort((a, b) => a.length - b.length || a.localeCompare(b));
      return { label: texts[0], also: texts.slice(1), names: r.names };
    })
    .sort((a, b) => b.names.length - a.names.length || a.label.localeCompare(b.label));
}

// ── Page furniture ──────────────────────────────────────────────────────

function nameChips(names: ThemeName[], limit = MAX_NAMES_INLINE): string {
  const shown = names.slice(0, limit);
  const rest = names.length - shown.length;
  return (
    shown.map((n) => cellLink(namePath(n.entry.name), n.entry.name)).join(", ") +
    (rest > 0 ? ` and ${inr(rest)} more` : "")
  );
}

/**
 * The names table. The gender column appears only where the theme actually
 * mixes genders — a column reading "Boy" forty times is a constant, not
 * information — and the meaning column is never conditional, because it is the
 * reason the page exists.
 */
function namesTable(names: ThemeName[]): string {
  const shown = names.slice(0, MAX_ROWS);
  const mixedGender = new Set(shown.map((n) => n.entry.gender ?? "")).size > 1;

  const head = ["Name", "Devanagari", ...(mixedGender ? ["Gender"] : []), "Chaldean root", "Meaning as recorded"]
    .map((h) => `<th>${esc(h)}</th>`)
    .join("");

  const body = shown
    .map((n) => {
      const planet = RULING_PLANET[n.root];
      return `          <tr>
            <td>${cellLink(namePath(n.entry.name), n.entry.name)}</td>
            <td style="font-family:'Noto Sans Devanagari',serif;font-size:18px">${esc(n.devanagari)}</td>${
              mixedGender ? `\n            <td>${esc(capFirst(n.entry.gender ?? "—"))}</td>` : ""
            }
            <td class="num">${n.root}${planet ? ` <span style="color:var(--ink-3)">${esc(planet.glyph)} ${esc(planet.name)}</span>` : ""}</td>
            <td>${esc(n.meaning)}</td>
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
    </div>${
      names.length > shown.length
        ? `\n    <p class="sub" style="margin-top:12px">Showing the first ${inr(shown.length)} of ${inr(names.length)}, alphabetically. The <a href="/n/">full name index</a> carries the rest, each with the same reading in longer form.</p>`
        : ""
    }`;
}

function wordingsSection(theme: Theme, voice: ThemeVoice, rows: Wording[]): string {
  const body = rows
    .map(
      (w) => `          <tr>
            <td><strong>${esc(w.label)}</strong>${w.also.length ? `<br /><span style="color:var(--ink-3);font-size:12.5px">also written as ${esc(w.also.slice(0, 3).join("; "))}${w.also.length > 3 ? ` and ${inr(w.also.length - 3)} more` : ""}</span>` : ""}</td>
            <td class="num">${inr(w.names.length)}</td>
            <td>${nameChips(w.names)}</td>
          </tr>`,
    )
    .join("\n");

  return `  <section>
    <h2>How ${esc(voice.clause)} are actually worded</h2>
    <p class="sub">Our sources do not all say it the same way. Every distinct wording behind this page, counted — the grouping is ours, the words are theirs.</p>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>Wording</th><th>Names</th><th>Which names</th></tr></thead>
        <tbody>
${body}
        </tbody>
      </table>
    </div>
    <p class="note">A reading joins this theme when its words contain the theme's word, which is why "peaceful" and "peaceful and calm" are one theme and two wordings — the theme is the same, the sentence is not, and both are shown. Nothing is reworded to fit: the full meaning recorded for each name is printed against it in the table above.</p>
  </section>`;
}

/** Root distribution, counted across every name in the theme rather than the
 *  rows the table caps at — it is a statement about the theme, not the page.
 *  A root is linked only where the numerology cluster will have published its
 *  page; the rest are printed plain rather than as an internal 404. */
function rootTable(names: ThemeName[], publishedRoots: Set<number>): { html: string; roots: number[] } {
  const counts = new Map<number, number>();
  for (const n of names) counts.set(n.root, (counts.get(n.root) ?? 0) + 1);

  const ordered = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  const body = ordered
    .map(([root, count]) => {
      const planet = RULING_PLANET[root];
      const fit = INDUSTRY_FIT[root]?.good.slice(0, 3).join(", ") ?? "";
      const label = hasNumberPage(root, publishedRoots)
        ? cellLink(numberPath(root), `Root ${root}`)
        : `Root ${root}`;
      return `          <tr>
            <td>${label}</td>
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

interface OriginRow {
  origin: string;
  names: ThemeName[];
}

function originRows(names: ThemeName[]): OriginRow[] {
  const byOrigin = new Map<string, ThemeName[]>();
  for (const n of names) {
    const origin = n.entry.origin?.trim();
    if (!origin) continue;
    const list = byOrigin.get(origin) ?? [];
    list.push(n);
    byOrigin.set(origin, list);
  }
  return [...byOrigin.entries()]
    .map(([origin, list]) => ({ origin, names: list }))
    .sort((a, b) => b.names.length - a.names.length || a.origin.localeCompare(b.origin));
}

function originsSection(voice: ThemeVoice, rows: OriginRow[], total: number): string {
  const counted = rows.reduce((sum, r) => sum + r.names.length, 0);
  const body = rows
    .map(
      (r) => `          <tr>
            <td><strong>${esc(r.origin)}</strong></td>
            <td class="num">${inr(r.names.length)}</td>
            <td>${nameChips(r.names, 6)}</td>
          </tr>`,
    )
    .join("\n");

  return `  <section>
    <h2>Where ${esc(voice.clause)} come from</h2>
    <p class="sub">The language each name is recorded as coming from, counted across ${inr(counted)} of the ${inr(total)} names here.</p>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>Origin</th><th>Names</th><th>Which names</th></tr></thead>
        <tbody>
${body}
        </tbody>
      </table>
    </div>${
      counted < total
        ? `\n    <p class="sub" style="margin-top:12px">The remaining ${inr(total - counted)} ${plural(total - counted, "name has", "names have")} no origin recorded in our corpus, so ${plural(total - counted, "it is", "they are")} not counted above.</p>`
        : ""
    }
  </section>`;
}

interface OverlapRow {
  theme: Theme;
  shared: ThemeName[];
}

/**
 * Themes these names also carry.
 *
 * A meaning is rarely one word — "the first rays of the sun" is light and sun
 * both — and this table is what turns that into a route between the two pages
 * instead of a duplication between them. Single-name overlaps are dropped:
 * one shared name is a coincidence, and a row per coincidence buries the real
 * neighbours.
 */
function overlapRows(theme: Theme, published: Theme[]): OverlapRow[] {
  const mine = new Set(theme.names.map((n) => n.entry.name));
  return published
    .filter((t) => t.term !== theme.term)
    .map((t) => ({ theme: t, shared: t.names.filter((n) => mine.has(n.entry.name)) }))
    .filter((r) => r.shared.length >= 2)
    .sort((a, b) => b.shared.length - a.shared.length || a.theme.label.localeCompare(b.theme.label))
    .slice(0, 8);
}

function overlapSection(rows: OverlapRow[]): string {
  const body = rows
    .map(
      (r) => `          <tr>
            <td>${cellLink(themePath(r.theme.slug), capFirst(r.theme.label))}</td>
            <td class="num">${inr(r.shared.length)}</td>
            <td>${nameChips(r.shared)}</td>
          </tr>`,
    )
    .join("\n");

  return `  <section>
    <h2>Other themes these names carry</h2>
    <p class="sub">A meaning is seldom one word. These are the other themes the names on this page also belong to, counted by how many names they share with it.</p>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>Also means</th><th>Shared names</th><th>Which names</th></tr></thead>
        <tbody>
${body}
        </tbody>
      </table>
    </div>
  </section>`;
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
 * One closing hub rather than four link sections, as in the letter cluster: a
 * block whose chips came out empty drops out instead of leaving a heading over
 * nothing. Labels may carry markup, so they arrive already escaped.
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

function itemListLd(name: string, names: ThemeName[], siteOrigin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: names.length,
    itemListElement: names.map((n, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: n.entry.name,
      url: `${siteOrigin}${namePath(n.entry.name)}`,
      // The meaning is the item's whole point here, and it is verbatim from the
      // corpus — an assistant quoting this JSON quotes what the page shows.
      description: n.meaning,
    })),
  };
}

// ── The theme page ──────────────────────────────────────────────────────

function renderThemePage(
  theme: Theme,
  published: Theme[],
  publishedLetters: Map<string, number>,
  publishedRoots: Set<number>,
  siteOrigin: string,
): SeoDoc {
  const path = themePath(theme.slug);
  const voice = themeVoice(theme);
  const total = theme.names.length;
  const words = wordings(theme);
  const origins = originRows(theme.names);
  const overlaps = overlapRows(theme, published);
  const { html: rootHtml, roots } = rootTable(theme.names, publishedRoots);
  const shown = theme.names.slice(0, MAX_ROWS);

  const genderCounts = (["boy", "girl", "unisex"] as const)
    .map((g) => ({ g, n: theme.names.filter((n) => n.entry.gender === g).length }))
    .filter((c) => c.n > 0)
    .map((c) => `${inr(c.n)} ${c.g === "unisex" ? "unisex" : c.g === "boy" ? "boys'" : "girls'"}`);

  // Only the source words that genuinely occur, so the page never claims to
  // group a synonym no name on it actually uses.
  const found = [
    ...new Set(
      theme.names.flatMap((n) =>
        n.phrases
          .filter((p) => p.terms.has(theme.term))
          .flatMap((p) =>
            p.text
              .toLowerCase()
              .split(/[^a-z]+/)
              .filter((w) => (CANONICAL[singular(w)] ?? singular(w)) === theme.term),
          ),
      ),
    ),
  ].sort();
  const variants = found.length ? found : [theme.term];

  const letters = [...new Set(theme.names.map((n) => n.letter))]
    .filter((l) => l && publishedLetters.has(l))
    .sort();

  const sampleNames = theme.names.slice(0, 3).map((n) => n.entry.name);

  const metaDesc =
    theme.kind === "deity"
      ? `${inr(total)} published Indian names whose verified meaning names ${theme.label} — ${listJoin(sampleNames)} among them — each listed with its full recorded meaning, its Devanagari spelling and its Chaldean root number.`
      : `${inr(total)} published Indian names whose verified meaning carries ${theme.label} — ${listJoin(sampleNames)} among them — each listed with the full meaning our corpus records, its Devanagari spelling and its Chaldean root number.`;

  const faqs: Array<{ q: string; a: string }> = [
    {
      q: `How were these ${inr(total)} names grouped under ${theme.label}?`,
      a:
        `By reading the meanings, not by tagging the names. Each verified meaning is split on its punctuation into the separate readings it carries, ` +
        `and a name joins this page when one of those readings uses ${listJoin(variants.map((v) => `"${v}"`), "or")}. ` +
        `A reading counts when its words contain the theme's word, so a name recorded as "peaceful" and one recorded as "peaceful and calm" both belong on a page about peace. ` +
        `The grouping is ours; the wording is our sources', and every name's own sentence is printed beside it so you can check the grouping rather than trust it.`,
    },
    {
      q: `Do all ${inr(total)} of these names mean exactly ${theme.label}?`,
      a:
        `No, and the table says so name by name. Most carry a second reading as well — ${
          overlaps.length
            ? `${inr(overlaps.length)} other ${plural(overlaps.length, "theme", "themes")} on this site share names with this one: ${listJoin(overlaps.slice(0, 4).map((o) => o.theme.label))}${overlaps.length > 4 ? ", among others" : ""}`
            : `a name that means only one thing is rare`
        }. ` +
        `${shown[0].entry.name}, for instance, is recorded as "${shown[0].meaning}". ` +
        `A name belongs here because one of its verified readings is about ${theme.label}, not because that is all it says.`,
    },
    {
      q: `Which Chaldean numerology numbers do ${voice.clause} carry?`,
      a:
        `${roots.length === 9 ? `All nine roots are represented` : `They fall across ${inr(roots.length)} of the nine Chaldean roots — ${listJoin(roots.map(String))}`}. ` +
        `The root is the reduction of the whole spelling and has nothing to do with the meaning, which is why a single theme spreads across the numbers: ` +
        `two names that mean the same thing can read completely differently, and the spelling you register decides which. ` +
        `The numbers are computed here by the same engine the live check runs.`,
    },
    {
      q: `Why are some names missing from this page?`,
      a:
        `Because we have not verified their meaning. A name enters this cluster only once its meaning is confirmed against a citable source; ` +
        `until then it keeps its own page, with the sections we can compute, and no meaning printed at all. ` +
        `We would rather publish a shorter list than fill it with plausible guesses, which is the whole reason this page can be read as evidence.`,
    },
  ];

  // ── Internal links ────────────────────────────────────────────────────
  const themeChips = published
    .filter((t) => t.term !== theme.term)
    .map(
      (t) =>
        `      <a href="${themePath(t.slug)}">${esc(capFirst(t.label))}<br /><span style="color:var(--ink-3);font-size:12px">${inr(t.names.length)} ${plural(t.names.length, "name", "names")}</span></a>`,
    )
    .join("\n");

  const letterChips = letters
    .map(
      (l) =>
        `      <a href="${letterPath(l)}">Names starting with ${esc(l)}<br /><span style="color:var(--ink-3);font-size:12px">${inr(publishedLetters.get(l) ?? 0)} published</span></a>`,
    )
    .join("\n");

  const rootChips = roots
    .filter((r) => hasNumberPage(r, publishedRoots))
    .map(
      (r) =>
        `      <a href="${numberPath(r)}">Root ${r}${RULING_PLANET[r] ? ` · ${esc(RULING_PLANET[r].name)}` : ""}</a>`,
    )
    .join("\n");

  const nameChipLinks = [
    ...theme.names
      .slice(0, 12)
      .map((n) => `      <a href="${namePath(n.entry.name)}">${esc(n.entry.name)}</a>`),
    `      <a href="/n/">All published names</a>`,
  ].join("\n");

  const hub = hubSection([
    {
      label: `Every meaning we publish a page for. A theme gets one once ${inr(MIN_NAMES)} names in the corpus share it; until then its names sit in the <a href="/n/">full index</a>`,
      html: themeChips,
      grid: true,
    },
    {
      label: `The letters these names begin with`,
      html: letterChips,
      grid: true,
    },
    {
      label: `The Chaldean root ${plural(roots.length, "number", "numbers")} these names carry`,
      html: rootChips,
    },
    {
      label: `Name pages — the name in ten Indian scripts, its full Chaldean reading, the birth star its first sound belongs to, and the short forms families use`,
      html: nameChipLinks,
    },
  ]);

  const body = `  <h1>${esc(voice.h1)}</h1>
  <p class="lede">We publish ${inr(total)} ${plural(total, "name", "names")} whose meaning we have verified and which ${plural(total, "carries", "carry")} this reading${genderCounts.length ? ` — ${esc(listJoin(genderCounts))}` : ""}. Each is listed below with the meaning our corpus records for it, word for word, alongside the Devanagari spelling our transliteration engine produces and the Chaldean root number of its full spelling.</p>
  <p class="lede">Names whose meaning we have not confirmed are not on this page. They are not listed with an empty column and they are not guessed at — the meanings here are the whole point of the page, so every one of them is a meaning we can stand behind.</p>

  <div class="tags">
    <span class="tag">${inr(total)} names</span>
${genderCounts.map((c) => `    <span class="tag">${esc(c)}</span>`).join("\n")}
    <span class="tag">${inr(words.length)} distinct ${plural(words.length, "wording", "wordings")}</span>
    <span class="tag">${inr(roots.length)} root ${plural(roots.length, "number", "numbers")}</span>
  </div>

  <section>
    <h2>The ${inr(total)} names</h2>
    <p class="sub">Alphabetical. The meaning column is verbatim from our corpus — nothing is shortened to fit the theme, and nothing is added to it.</p>
${namesTable(theme.names)}
  </section>

${wordingsSection(theme, voice, words)}

  <section>
    <h2>Chaldean roots across ${esc(voice.clause)}</h2>
    <p class="sub">Every name above reduced by the Chaldean method — how the theme actually distributes, counted rather than asserted.</p>
${rootHtml}
    <p class="note">The meaning and the number are independent readings of the same name. Nothing in the Chaldean method looks at what a name means, which is why a theme spreads across the roots instead of clustering on one.</p>
  </section>

${origins.length > 1 ? `${originsSection(voice, origins, total)}\n\n` : ""}${overlaps.length ? `${overlapSection(overlaps)}\n\n` : ""}${faqSection(`Questions parents ask about ${voice.clause}`, faqs)}

${ctaBlock(
  `Thinking of one of these names for a business too?`,
  `Run a live check across domains, social handles, marketplaces, the MCA company register and all 45 trademark classes.`,
)}

${hub}`;

  return {
    path,
    html: renderSeoPage({
      title: voice.title,
      metaDesc,
      path,
      siteOrigin,
      crumbs: [
        { label: "Home", href: "/" },
        { label: "Baby names", href: "/n/" },
        { label: capFirst(voice.clause) },
      ],
      jsonLd: [
        faqLd(faqs),
        // Only the names a reader can actually see — an ItemList claiming rows
        // the table capped away is a structured-data mismatch.
        itemListLd(voice.h1, shown, siteOrigin),
      ],
      body,
    }),
    priority: "0.8",
    changefreq: "monthly",
  };
}

// ── Entry point ─────────────────────────────────────────────────────────

/**
 * Two passes, deliberately. Which themes clear the thresholds has to be known
 * before any page renders, because every page links to every sibling theme and
 * names them in its overlap table — linking a theme the build then dropped
 * would put an internal 404 on every page in the cluster.
 */
export function buildMeaningPages(ctx: SeoCtx): SeoDoc[] {
  const names = ctx.corpus.map(readName).filter((n): n is ThemeName => n !== null);
  if (names.length === 0) return [];

  const byTerm = new Map<string, ThemeName[]>();
  for (const name of names) {
    for (const term of name.terms) {
      const list = byTerm.get(term) ?? [];
      list.push(name);
      byTerm.set(term, list);
    }
  }

  const candidates: Theme[] = [...byTerm.entries()]
    .filter(([, list]) => list.length >= MIN_NAMES)
    .map(([term, list]) => ({
      term,
      slug: seoSlug(term),
      label: DEITY_LABELS[term] ?? term,
      kind: DEITY_LABELS[term] ? ("deity" as const) : ("concept" as const),
      names: [...list].sort((a, b) => a.entry.name.localeCompare(b.entry.name)),
    }))
    // Largest first, so the subsumption pass below always keeps the theme with
    // the fuller list and drops the one that is mostly a copy of it.
    .sort((a, b) => b.names.length - a.names.length || a.term.localeCompare(b.term));

  const kept: Theme[] = [];
  for (const theme of candidates) {
    const mine = new Set(theme.names.map((n) => n.entry.name));
    const swallowed = kept.some((bigger) => {
      const shared = bigger.names.filter((n) => mine.has(n.entry.name)).length;
      return shared / mine.size >= MAX_SUBSET_SHARE;
    });
    if (!swallowed) kept.push(theme);
  }

  if (kept.length === 0) return [];

  // Alphabetical from here on: the sibling grid on every page is read as a
  // list, and a list ordered by size changes under the reader whenever the
  // corpus does.
  const published = [...kept].sort((a, b) => a.label.localeCompare(b.label));

  /*
   * Which letter and number pages this build will contain, by the rules those
   * clusters publish on. Counted over the whole corpus, not over the names
   * with meanings, because that is what the other two builders count.
   */
  const letterTotals = new Map<string, number>();
  for (const entry of ctx.corpus) {
    const first = entry.name.trim().charAt(0).toUpperCase();
    if (!/^[A-Z]$/.test(first)) continue;
    letterTotals.set(first, (letterTotals.get(first) ?? 0) + 1);
  }
  const publishedLetters = new Map(
    [...letterTotals.entries()].filter(([, n]) => n >= LETTER_PAGE_MIN_NAMES),
  );

  const rootTotals = new Map<number, number>();
  for (const entry of ctx.corpus) {
    const root = chaldean(entry.name).root;
    rootTotals.set(root, (rootTotals.get(root) ?? 0) + 1);
  }
  const publishedRoots = new Set(
    [...rootTotals.entries()].filter(([, n]) => n >= NUMBER_PAGE_MIN_NAMES).map(([root]) => root),
  );

  return published.map((theme) =>
    renderThemePage(theme, published, publishedLetters, publishedRoots, ctx.siteOrigin),
  );
}
