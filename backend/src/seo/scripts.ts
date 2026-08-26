import { NAKSHATRAS } from "../scanners/astro.js";
import { SCRIPT_TARGETS, devanagariToScripts, romanToDevanagari } from "../lib/transliterate.js";
import { slugify } from "../scripts/name-corpus.js";
import { ctaBlock, esc, renderSeoPage, seoSlug } from "./shell.js";
import type { SeoCtx, SeoDoc } from "./shell.js";

/**
 * The script cluster — "write my name in Tamil", "name in Bengali script".
 *
 * This is the thinnest cluster by nature: the query wants one string back. So
 * the page is built around the one thing that cannot be faked and cannot be
 * copied off a public dataset — the published corpus actually run through our
 * transliteration pipeline, name by name, in this script, next to the
 * Devanagari it was converted from.
 *
 * Everything else on the page is computed from that same pass:
 *   · which letters of this script the corpus actually uses, and how often
 *   · which Devanagari letters this script writes with a single letter, and
 *     therefore which distinct names it spells identically
 *   · which names the pipeline refuses to render at all
 *
 * That last group is the point of the cluster. lib/transliterate.ts carries an
 * explicit HONESTY RULE: Tamil and Gurmukhi lack sounds Devanagari has, and
 * where a conversion leaks raw Devanagari the script is DROPPED rather than
 * displayed broken. A page that says "here is your name in Tamil" without
 * saying what Tamil cannot keep is selling a certainty the engine does not
 * have. The merge tables below are that admission, and they are measured
 * rather than asserted — every claim is read back out of the engine's own
 * output at build time, so it cannot drift away from what the product does.
 */

type CorpusEntry = SeoCtx["corpus"][number];

/**
 * RULE 2 THRESHOLD — a script publishes only once MIN_NAMES corpus names
 * render in it.
 *
 * The spine of one of these pages is the worked table. Strip it out and what
 * is left is a paragraph on where the script is used, a letter inventory and
 * the conversion caveats — real, but the same shape on all nine pages, which
 * is a doorway set. The tables are what differ, and a table needs rows before
 * it is a table. Twenty-five is where the letter-frequency column stops being
 * noise: below that most letters occur once or twice and the "names using it"
 * count says nothing.
 *
 * It is deliberately a floor on RENDERED names, not corpus size. A script that
 * drops most of what it is given has not earned a page for that corpus however
 * large the corpus is.
 */
const MIN_NAMES = 25;

/**
 * Rows in the worked table. The table is the reason to visit, so it is much
 * longer than the 40 the other clusters use for a supporting list — but past
 * roughly this point a reader is scrolling rather than reading, and the page
 * weight starts to matter on a phone. Names past the cap are not orphaned:
 * every one has its own /n/ page and the /n/ index lists all of them.
 */
const MAX_ROWS = 120;

/** Merge and collision tables are evidence, not listings — enough rows to
 *  believe the claim, not the full set. */
const MAX_COLLISION_GROUPS = 25;
const MAX_AMBIGUITY_GROUPS = 12;

/** Sample chips under the H1 and in the closing link block. */
const HERO_SAMPLES = 6;
const MAX_SAMPLE_LINKS = 12;

/**
 * Mirrors MIN_NAMES in seo/nakshatra.ts. Duplicated rather than imported for
 * the same reason numerology.ts duplicates it: this cluster must not link a
 * star page that build never wrote, and importing a constant across cluster
 * files would make one cluster's threshold change silently break another's.
 */
const NAK_MIN_NAMES = 1;

/** Independent vowels अ–औ and consonants क–ह. Excludes the vowel signs, the
 *  virama and the anusvara, which have no standalone reading. */
const DEVA_BASE = /[अ-ह]/;

/**
 * True when a rendering of one Devanagari letter needed a vowel sign or a
 * virama — which is to say the target script had no letter of its own and
 * spelled the sound out instead. Every Indic block is 128-aligned, so the low
 * seven bits give the offset within whichever block the character came from,
 * and 0x3E–0x4D is the vowel-sign-and-virama span in all of them.
 *
 * The nukta at offset 0x3C is deliberately outside that range: ਸ਼ is a letter
 * Gurmukhi genuinely has, written with a nukta, not a sound it lacks.
 */
const spellsOut = (text: string) =>
  [...text].some((ch) => {
    const offset = ch.codePointAt(0)! & 0x7f;
    return offset >= 0x3e && offset <= 0x4d;
  });

const inr = (n: number) => n.toLocaleString("en-IN");
const namePath = (name: string) => `/n/${slugify(name)}.html`;
const scriptPath = (slug: string) => `/script/${slug}.html`;

function joinList(items: string[], conjunction: "and" | "or"): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} ${conjunction} ${items[items.length - 1]}`;
}
const joinAnd = (items: string[]) => joinList(items, "and");
const joinOr = (items: string[]) => joinList(items, "or");

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * Fraunces and Inter carry no Indic glyphs, so a browser falls back per
 * character anyway — but naming a Devanagari face first on a Tamil cell asks
 * for a font that cannot serve it. Devanagari gets the face the name pages
 * already load; everything else asks for the system's own.
 */
const scriptFont = (script: string) =>
  script === "Devanagari" ? `'Noto Sans Devanagari',serif` : "serif";

/**
 * First-language speakers in India, Census of India 2011.
 *
 * Kept as the published counts rather than a rounded phrase so the crore
 * figure on the page is derived, not typed — a hand-rounded number is the
 * kind of small error nobody catches and every reader who knows the census
 * does. Only the ten languages this product renders are listed.
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

/** Where each language is spoken and what standing it has. Constitutional and
 *  census facts only — nothing here is a characterisation. */
const WHERE: Record<string, string> = {
  Hindi:
    "official language of the Union alongside English, and the state language of Uttar Pradesh, Bihar, Madhya Pradesh, Rajasthan, Haryana, Himachal Pradesh, Uttarakhand, Jharkhand, Chhattisgarh and Delhi",
  Marathi: "state language of Maharashtra",
  Bengali: "official in West Bengal and Tripura, and in the Barak Valley of Assam",
  Tamil: "official in Tamil Nadu and Puducherry, and a national language of Sri Lanka and Singapore",
  Telugu: "official in Andhra Pradesh and Telangana, and in Yanam",
  Gujarati: "official in Gujarat, and in Dadra & Nagar Haveli and Daman & Diu",
  Kannada: "official in Karnataka",
  Malayalam: "official in Kerala and Lakshadweep, and in Mahé",
  Punjabi: "official in Punjab",
  Odia: "official in Odisha",
};

interface ScriptNote {
  /** Other languages written in the same script. */
  alsoWrites?: string;
  /** Standing conferred on the language, with the year it was conferred. */
  status?: string;
  /** Something the reader could otherwise get wrong about this script. */
  caveat?: string;
}

const SCRIPT_NOTES: Record<string, ScriptNote> = {
  Devanagari: {
    alsoWrites: "Sanskrit, Nepali, Konkani, Maithili, Dogri and Bodo are all written in Devanagari.",
    caveat:
      "Marathi also uses ळ, a retroflex L that Hindi does not have. Our engine writes standard Devanagari and never produces it, so a Marathi name that needs ळ is one this pipeline cannot spell.",
  },
  Bengali: {
    alsoWrites:
      "Assamese and Manipuri are written in the same script family, each with a few letters of its own.",
    caveat: "Bengali is also the national language of Bangladesh.",
  },
  Tamil: { status: "Declared a classical language of India in 2004." },
  Telugu: { status: "Declared a classical language of India in 2008." },
  Kannada: { status: "Declared a classical language of India in 2008." },
  Malayalam: { status: "Declared a classical language of India in 2013." },
  Odia: { status: "Declared a classical language of India in 2014." },
  Gujarati: {},
  Gurmukhi: {
    alsoWrites: "Gurmukhi is the script of the Guru Granth Sahib.",
    caveat:
      "Punjabi in Pakistan is written in Shahmukhi, a Perso-Arabic script that runs right to left. This page produces Gurmukhi only.",
  },
};

// ── Nakshatra cross-links ────────────────────────────────────────────
// Reproduced from scanners/astro.ts, which does not export the matcher. The
// rule is the same longest-prefix lookup over the same Avakahada table, so a
// name linked to a star here reaches the same star the live tile reports.

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

function starsFor(name: string): string[] {
  const n = normaliseSyllables(name);
  if (!n) return [];
  for (let len = Math.min(LONGEST_SYLLABLE, n.length); len >= 1; len--) {
    const hit = SYLLABLE_TO_STARS.get(n.slice(0, len));
    if (hit) return hit;
  }
  return [];
}

// ── The per-script measurements ──────────────────────────────────────

interface Row {
  entry: CorpusEntry;
  deva: string;
  /** The name in this script. */
  text: string;
}

/** A group of distinct Devanagari spellings this script writes identically. */
interface Collision {
  text: string;
  members: Array<{ entry: CorpusEntry; deva: string }>;
}

/** Devanagari letters this script writes with one and the same letter. */
interface Merge {
  target: string;
  sources: string[];
  /** Published names carrying at least one of the merged letters. */
  names: number;
}

interface ScriptReading {
  /** SCRIPT_TARGETS entries sharing this script, most-spoken language first. */
  langs: Array<{ code: string; name: string; script: string }>;
  script: string;
  slug: string;
  rows: Row[];
  /** Names whose Devanagari this script cannot express at all. */
  dropped: Array<{ entry: CorpusEntry; deva: string }>;
  /** Base letter → how many published names are written with it. */
  letters: Array<{ deva: string; text: string; names: number }>;
  /** Letters the script has no letter of its own for, and spells out instead. */
  standIns: Array<{ deva: string; text: string; names: number }>;
  merges: Merge[];
  collisions: Collision[];
  /** Mean characters per name in this script, and in the roman spelling. */
  avgChars: number;
  avgRoman: number;
}

/**
 * The names shown in the worked table, spread across the alphabet.
 *
 * Taking the first MAX_ROWS of a corpus sorted by name gives a table that
 * stops somewhere in the B's, which reads as a truncated database rather than
 * a sample and makes the page useless to anyone whose name starts late in the
 * alphabet. A fixed stride keeps the same names on every script page, so the
 * nine tables can be read against each other, and keeps them ordered.
 */
function spread<T>(items: T[], limit: number): T[] {
  if (items.length <= limit) return items;
  const step = items.length / limit;
  const out: T[] = [];
  for (let i = 0; i < limit; i++) out.push(items[Math.floor(i * step)]);
  return out;
}

// ── Page sections ────────────────────────────────────────────────────

/**
 * The worked table. The Devanagari column is dropped on the Devanagari page,
 * where it would repeat the column beside it; the meaning column appears only
 * when a shown row actually has a verified meaning, because an all-dash column
 * reads as data we have lost rather than data we never claimed.
 */
function namesTable(reading: ScriptReading, shown: Row[]): string {
  const isPivot = reading.script === "Devanagari";
  const withMeaning = shown.some((r) => r.entry.meaning);
  const font = scriptFont(reading.script);

  const head = [
    "Name",
    `In ${reading.script}`,
    ...(isPivot ? [] : ["Devanagari"]),
    ...(withMeaning ? ["Meaning"] : []),
  ]
    .map((h) => `<th>${esc(h)}</th>`)
    .join("");

  const rows = shown
    .map(
      (r) => `        <tr>
          <td><a href="${namePath(r.entry.name)}">${esc(r.entry.name)}</a></td>
          <td style="font-family:${font};font-size:18px">${esc(r.text)}</td>
          ${isPivot ? "" : `<td style="font-family:'Noto Sans Devanagari',serif;font-size:17px">${esc(r.deva)}</td>`}
          ${withMeaning ? `<td>${r.entry.meaning ? esc(r.entry.meaning) : "—"}</td>` : ""}
        </tr>`,
    )
    .join("\n");

  const overflow =
    reading.rows.length > shown.length
      ? `    <p class="sub" style="margin-top:10px">Showing ${inr(shown.length)} of the ${inr(reading.rows.length)} published names that render in ${esc(reading.script)}, spread across the alphabet. The rest are on the <a href="/n/">full name index</a>, each with its own page carrying the same ten scripts.</p>`
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

/** Where the script is used. Two languages on the Devanagari page, one on the
 *  rest, so it is a table rather than a sentence. */
function whereSection(reading: ScriptReading): string {
  const note = SCRIPT_NOTES[reading.script] ?? {};
  const rows = reading.langs
    .map((l) => {
      const n = SPEAKERS[l.name];
      return `        <tr>
          <td><strong>${esc(l.name)}</strong></td>
          <td class="num">${n ? `${(n / 1e7).toFixed(1)} crore` : "—"}</td>
          <td>${esc(WHERE[l.name] ?? "—")}</td>
        </tr>`;
    })
    .join("\n");

  const extras = [note.alsoWrites, note.status].filter(Boolean) as string[];

  return `  <section>
    <h2>Who writes in ${esc(reading.script)}</h2>
    <p class="sub">First-language speakers in India, Census of India 2011.</p>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>Language</th><th>Speakers in India</th><th>Where it is official</th></tr></thead>
        <tbody>
${rows}
        </tbody>
      </table>
    </div>
${extras.length ? `    <p class="sub" style="margin-top:12px">${extras.map(esc).join(" ")}</p>` : ""}
${note.caveat ? `    <p class="note">${esc(note.caveat)}</p>` : ""}
  </section>`;
}

/** The letters of this script that the published names actually need. */
function lettersSection(reading: ScriptReading): string {
  const isPivot = reading.script === "Devanagari";
  const font = scriptFont(reading.script);
  const rows = reading.letters
    .map(
      (l) => `        <tr>
          <td style="font-family:${font};font-size:19px">${esc(l.text)}</td>
          ${isPivot ? "" : `<td style="font-family:'Noto Sans Devanagari',serif;font-size:18px">${esc(l.deva)}</td>`}
          <td class="num">${inr(l.names)}</td>
        </tr>`,
    )
    .join("\n");

  return `  <section>
    <h2>The ${inr(reading.letters.length)} letters these names need</h2>
    <p class="sub">Counted over every published name, not over the script — ${esc(reading.script)} has more letters than this. Commonest first.</p>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>Letter</th>${isPivot ? "" : `<th>Devanagari</th>`}<th>Names using it</th></tr></thead>
        <tbody>
${rows}
        </tbody>
      </table>
    </div>
    <p class="sub" style="margin-top:10px">Vowel signs, the virama and the anusvara are left out: they are marks on a letter rather than letters, and counting them would put the same handful at the top of every script's list.</p>
  </section>`;
}

/**
 * What this script cannot keep. The section every page in this cluster exists
 * to carry, and the only one whose absence would make the rest a sales pitch.
 */
function limitsSection(reading: ScriptReading): string {
  const font = scriptFont(reading.script);

  const mergeTable = reading.merges.length
    ? `    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>Devanagari letters</th><th>All written</th><th>Names affected</th></tr></thead>
        <tbody>
${reading.merges
  .map(
    (m) => `        <tr>
          <td style="font-family:'Noto Sans Devanagari',serif;font-size:18px">${esc(m.sources.join("  "))}</td>
          <td style="font-family:${font};font-size:19px">${esc(m.target)}</td>
          <td class="num">${inr(m.names)}</td>
        </tr>`,
  )
  .join("\n")}
        </tbody>
      </table>
    </div>`
    : "";

  // The case lib/transliterate.ts names in its honesty rule: Tamil and
  // Gurmukhi have no ऋ, so it comes out as a consonant carrying a vowel sign.
  // Measured rather than asserted, so a future repair table changes the page.
  const standInTable = reading.standIns.length
    ? `    <h3 style="font-family:Fraunces,serif;font-size:19px;font-weight:500;margin:26px 0 4px">Sounds ${esc(reading.script)} has no letter for</h3>
    <p class="sub">${inr(reading.standIns.length)} Devanagari ${plural(reading.standIns.length, "letter has", "letters have")} no ${esc(reading.script)} letter of its own. What comes out is the nearest spelling the script can build — a consonant carrying a vowel sign — which reads correctly aloud but is not a letter-for-letter match.</p>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>Devanagari</th><th>Written in ${esc(reading.script)} as</th><th>Names affected</th></tr></thead>
        <tbody>
${reading.standIns
  .map(
    (s) => `        <tr>
          <td style="font-family:'Noto Sans Devanagari',serif;font-size:18px">${esc(s.deva)}</td>
          <td style="font-family:${font};font-size:19px">${esc(s.text)}</td>
          <td class="num">${inr(s.names)}</td>
        </tr>`,
  )
  .join("\n")}
        </tbody>
      </table>
    </div>`
    : "";

  const shownCollisions = reading.collisions.slice(0, MAX_COLLISION_GROUPS);
  const collisionTable = shownCollisions.length
    ? `    <h3 style="font-family:Fraunces,serif;font-size:19px;font-weight:500;margin:26px 0 4px">Names ${esc(reading.script)} spells the same way</h3>
    <p class="sub">Different names in Devanagari, one spelling here. ${inr(reading.collisions.length)} such ${plural(reading.collisions.length, "group", "groups")} across the published corpus${reading.collisions.length > shownCollisions.length ? `; the first ${inr(shownCollisions.length)} are listed` : ""}.</p>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>Names</th><th>In ${esc(reading.script)}</th><th>In Devanagari</th></tr></thead>
        <tbody>
${shownCollisions
  .map(
    (c) => `        <tr>
          <td>${c.members.map((m) => `<a href="${namePath(m.entry.name)}">${esc(m.entry.name)}</a>`).join(" · ")}</td>
          <td style="font-family:${font};font-size:18px">${esc(c.text)}</td>
          <td style="font-family:'Noto Sans Devanagari',serif;font-size:17px">${esc(c.members.map((m) => m.deva).join(" · "))}</td>
        </tr>`,
  )
  .join("\n")}
        </tbody>
      </table>
    </div>`
    : "";

  const droppedBlock = reading.dropped.length
    ? `    <h3 style="font-family:Fraunces,serif;font-size:19px;font-weight:500;margin:26px 0 4px">Names we will not render in ${esc(reading.script)}</h3>
    <p class="sub">${inr(reading.dropped.length)} published ${plural(reading.dropped.length, "name", "names")}. The conversion left Devanagari characters behind, which means the script has no letter for a sound in the name. We drop the rendering rather than print something that is not ${esc(reading.script)}.</p>
    <div class="related">
        ${reading.dropped
          .slice(0, MAX_SAMPLE_LINKS)
          .map((d) => `<a href="${namePath(d.entry.name)}">${esc(d.entry.name)} · ${esc(d.deva)}</a>`)
          .join("\n        ")}
    </div>`
    : "";

  // Devanagari is where the conversion arrives, not where it goes: the second
  // stage is an identity there, so "what the script cannot keep" would be a
  // question about nothing. The honest version names the stage that did act.
  const isPivot = reading.script === "Devanagari";

  // With no merges, no collisions and no drops there is nothing to hedge, and
  // saying so plainly is the finding — not an apology for an empty section.
  const clean =
    !reading.merges.length &&
    !reading.collisions.length &&
    !reading.dropped.length &&
    !reading.standIns.length
      ? isPivot
        ? `    <p>Devanagari is the pivot every other script is converted from, so there is no second stage here to lose anything: these are the spellings our engine produced, unaltered. Everything that can be wrong on this page was decided when the romanised name was read, which is the section below — and it is the same first stage behind all ten scripts.</p>`
        : `    <p>Every Devanagari letter these names are built from has its own letter in ${esc(reading.script)}. No two distinct spellings collapse onto one, and no published name is dropped. Whatever ambiguity survives into a ${esc(reading.script)} spelling came in with the romanised name, before this stage — the section below is about that.</p>`
      : "";

  const mergeLede = reading.merges.length
    ? `    <p>${esc(reading.script)} has a smaller consonant inventory than Devanagari, and ${reading.merges.length === 1 ? "one set of letters lands" : `${inr(reading.merges.length)} sets of letters land`} on a single letter here. This is the script working correctly, not a conversion fault — but it does mean a ${esc(reading.script)} spelling carries less information than the Devanagari it came from, and cannot always be read back.</p>`
    : "";

  return `  <section class="prose">
    <h2>${esc(isPivot ? "Where a Devanagari spelling can still be wrong" : `What ${reading.script} cannot keep`)}</h2>
${clean}${mergeLede}
${mergeTable}
${standInTable}
${collisionTable}
${droppedBlock}
  </section>`;
}

/** Stage-1 loss: distinct romanised spellings that reach the same Devanagari.
 *  Identical on every page, because it happens before the script is chosen —
 *  which is exactly the point the copy makes. */
function ambiguitySection(
  reading: ScriptReading,
  ambiguities: Collision[],
  totalNames: number,
): string {
  const isPivot = reading.script === "Devanagari";
  const shown = ambiguities.slice(0, MAX_AMBIGUITY_GROUPS);
  const table = shown.length
    ? `    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>Romanised spellings</th><th>All reach</th>${isPivot ? "" : `<th>In ${esc(reading.script)}</th>`}</tr></thead>
        <tbody>
${shown
  .map(
    (c) => `        <tr>
          <td>${c.members.map((m) => `<a href="${namePath(m.entry.name)}">${esc(m.entry.name)}</a>`).join(" · ")}</td>
          <td style="font-family:'Noto Sans Devanagari',serif;font-size:18px">${esc(c.text)}</td>
          ${isPivot ? "" : `<td style="font-family:${scriptFont(reading.script)};font-size:18px">${esc(reading.rows.find((r) => r.deva === c.text)?.text ?? "—")}</td>`}
        </tr>`,
  )
  .join("\n")}
        </tbody>
      </table>
    </div>`
    : "";

  return `  <section class="prose">
    <h2>How the conversion works, and where it loses</h2>
    <p>${
      isPivot
        ? `There are two stages, and this page only uses the first. The romanised name becomes Devanagari through our own syllable engine — no free library does romanised-to-Devanagari acceptably, so we wrote one. The second stage, Devanagari into the other eight scripts, is <span style="font-family:'JetBrains Mono',monospace;font-size:12.5px">@indic-transliteration/sanscript</span>, and it does not run here. Everything is offline. There is no API behind it, which is why every published name could be rendered rather than a sample.`
        : `There are two stages. First the romanised name becomes Devanagari, using our own syllable engine — no free library does romanised-to-Devanagari acceptably, so we wrote one. Then Devanagari becomes ${esc(reading.script)} through the Brahmic-to-Brahmic conversion in <span style="font-family:'JetBrains Mono',monospace;font-size:12.5px">@indic-transliteration/sanscript</span>, which is accurate because the two scripts descend from the same system. Everything runs offline. There is no API behind it, which is why every name on this page could be rendered rather than a sample.`
    }</p>
    <p>${esc(isPivot ? "That first stage is where the guessing lives" : "The second stage is the well-behaved one. The first is where the guessing lives")}, and it guesses because a romanised Indian name genuinely underdetermines its spelling. “Rita” is रीता for one family and ऋता for another, and nothing in the four letters says which. A trailing lone “a” is read as the long ā, because Priya is प्रिया far more often than प्रिय. A nasal before a stop is written as anusvara — संजय, not सन्जय — but not before y, r, l or v, which is why Ananya stays अनन्या. Each of those is a rule that is usually right and sometimes wrong.</p>
${
  shown.length
    ? `    <p>Across ${inr(totalNames)} published names, ${inr(ambiguities.length)} ${plural(ambiguities.length, "group of romanised spellings arrives", "groups of romanised spellings arrive")} at one Devanagari spelling${isPivot ? "" : `, and therefore at one ${esc(reading.script)} spelling. This happens before any script is chosen, so it is not something ${esc(reading.script)} did`}.</p>
${table}`
    : `    <p>Across ${inr(totalNames)} published names no two romanised spellings happen to arrive at the same Devanagari, so nothing on this page is ambiguous for that reason. That is a fact about this corpus rather than about the engine — publish Preethi alongside Preeti and the two will meet.</p>`
}
    <p class="note">If a spelling here is not the one your family uses, your family is the authority and we are not. The pipeline reconstructs a likely Devanagari form from roman letters; it does not know your name. Take the spelling as a starting point for the certificate or the invitation, and correct it.</p>
  </section>`;
}

// ── The builder ──────────────────────────────────────────────────────

/**
 * Builds the script cluster.
 *
 * One page per SCRIPT, not per language. SCRIPT_TARGETS lists ten languages
 * but only nine scripts: Hindi and Marathi are both Devanagari, and the engine
 * returns byte-identical output for them. Publishing both would put two pages
 * on the site whose worked table — the whole reason either page exists — is
 * the same file twice. That is the near-duplicate Google folds, and it would
 * cost the surviving page rather than earn a second one. The Devanagari page
 * therefore carries both languages, names both in its title, and says plainly
 * that the spellings read the same in each.
 *
 * The corpus is measured once, in a single pass over every name, before any
 * page renders. The pages need each other's counts for the sibling links, and
 * the merge and collision tables are read back out of the same pass rather
 * than asserted, so nothing on a page can disagree with what the engine did.
 */
export function buildScriptPages(ctx: SeoCtx): SeoDoc[] {
  // Distinct scripts, in SCRIPT_TARGETS order, each carrying its languages.
  const groups = new Map<string, ScriptReading["langs"]>();
  for (const t of SCRIPT_TARGETS) {
    const list = groups.get(t.script) ?? [];
    list.push({ code: t.code, name: t.name, script: t.script });
    groups.set(t.script, list);
  }

  // One conversion per distinct Devanagari form, shared by all nine scripts.
  const cache = new Map<string, Map<string, string>>();
  const renderAll = (deva: string): Map<string, string> => {
    let hit = cache.get(deva);
    if (!hit) {
      hit = new Map(devanagariToScripts(deva).map((s) => [s.code, s.text]));
      cache.set(deva, hit);
    }
    return hit;
  };

  const source = ctx.corpus
    .map((entry) => ({ entry, deva: romanToDevanagari(entry.name) }))
    .filter((d) => d.deva.length > 0);
  if (source.length === 0) return [];

  // Stage-1 loss, computed once: distinct romanised names on one Devanagari.
  const byDeva = new Map<string, Array<{ entry: CorpusEntry; deva: string }>>();
  for (const d of source) {
    const list = byDeva.get(d.deva) ?? [];
    list.push(d);
    byDeva.set(d.deva, list);
  }
  const ambiguities: Collision[] = [...byDeva.entries()]
    .filter(([, members]) => new Set(members.map((m) => m.entry.name.toLowerCase())).size > 1)
    .map(([text, members]) => ({ text, members }))
    .sort((a, b) => b.members.length - a.members.length);

  // The base letters the corpus actually produces, and how many names use each.
  const letterNames = new Map<string, number>();
  for (const d of source) {
    for (const ch of new Set(d.deva)) {
      if (DEVA_BASE.test(ch)) letterNames.set(ch, (letterNames.get(ch) ?? 0) + 1);
    }
  }
  const baseLetters = [...letterNames.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );

  // Which nakshatra pages this build will actually write, by that cluster's
  // own rule. Linking a star the build skipped would put a 404 on nine pages.
  const starTotals = new Map<string, number>();
  for (const entry of ctx.corpus) {
    for (const star of starsFor(entry.name)) {
      starTotals.set(star, (starTotals.get(star) ?? 0) + 1);
    }
  }
  const publishedStars = new Set(
    [...starTotals.entries()].filter(([, n]) => n >= NAK_MIN_NAMES).map(([star]) => star),
  );

  // ── Measure every script ───────────────────────────────────────────
  const readings: ScriptReading[] = [];
  for (const [script, langs] of groups) {
    // The page is filed under the most-spoken language of the script, which is
    // also the word people search with — "write my name in Punjabi", not "in
    // Gurmukhi". Ordering the languages the same way puts it first in the copy.
    const ordered = [...langs].sort((a, b) => (SPEAKERS[b.name] ?? 0) - (SPEAKERS[a.name] ?? 0));
    const code = ordered[0].code;

    const rows: Row[] = [];
    const dropped: Array<{ entry: CorpusEntry; deva: string }> = [];
    let chars = 0;
    let roman = 0;
    for (const d of source) {
      const text = renderAll(d.deva).get(code);
      if (!text) {
        dropped.push(d);
        continue;
      }
      rows.push({ entry: d.entry, deva: d.deva, text });
      chars += text.replace(/\s/g, "").length;
      roman += d.entry.name.replace(/[^A-Za-z]/g, "").length;
    }
    if (rows.length < MIN_NAMES) continue;

    const letters = baseLetters
      .map(([deva, names]) => ({ deva, names, text: renderAll(deva).get(code) }))
      .filter((l): l is { deva: string; names: number; text: string } => Boolean(l.text));

    // Devanagari letters this script writes with one letter. Read out of the
    // engine's own output, so it stays true if the repair tables change.
    const merges: Merge[] = [];
    const byTarget = new Map<string, string[]>();
    for (const l of letters) {
      const list = byTarget.get(l.text) ?? [];
      list.push(l.deva);
      byTarget.set(l.text, list);
    }
    for (const [target, sources] of byTarget) {
      if (sources.length < 2) continue;
      const affected = source.filter((d) => sources.some((s) => d.deva.includes(s))).length;
      merges.push({ target, sources, names: affected });
    }
    merges.sort((a, b) => b.names - a.names || b.sources.length - a.sources.length);

    // Names this script spells identically. Compared on distinct Devanagari so
    // the stage-1 duplicates above are not counted twice, here as if the
    // script had caused them.
    const byText = new Map<string, Map<string, { entry: CorpusEntry; deva: string }>>();
    for (const r of rows) {
      const group = byText.get(r.text) ?? new Map();
      if (!group.has(r.deva)) group.set(r.deva, { entry: r.entry, deva: r.deva });
      byText.set(r.text, group);
    }
    const collisions: Collision[] = [...byText.entries()]
      .filter(([, group]) => group.size > 1)
      .map(([text, group]) => ({ text, members: [...group.values()] }))
      .sort((a, b) => b.members.length - a.members.length);

    readings.push({
      langs: ordered,
      script,
      slug: seoSlug(ordered[0].name),
      rows,
      dropped,
      letters,
      standIns: letters.filter((l) => spellsOut(l.text)),
      merges,
      collisions,
      avgChars: chars / rows.length,
      avgRoman: roman / rows.length,
    });
  }

  if (readings.length === 0) return [];

  // ── Render ─────────────────────────────────────────────────────────
  return readings.map((reading) => {
    const shown = spread(reading.rows, MAX_ROWS);
    const langNames = reading.langs.map((l) => l.name);
    const primary = langNames[0];
    const shared = langNames.length > 1;
    const font = scriptFont(reading.script);
    const isPivot = reading.script === "Devanagari";

    const title = `Write your name in ${shared ? joinAnd(langNames) : primary} — ${inr(shown.length)} Indian names in ${reading.script} script | Naam Dekho`;
    const metaDesc = `${inr(shown.length)} published Indian names written out in ${reading.script}${isPivot ? "" : ", each beside the Devanagari it was converted from"}. Includes the letters these names need${reading.merges.length ? `, the ${inr(reading.merges.length)} ${plural(reading.merges.length, "set", "sets")} of Devanagari letters ${reading.script} writes with one letter` : ""} and where the conversion ${isPivot ? "has to guess" : "cannot keep a distinction"}.`;

    // ── Hero ─────────────────────────────────────────────────────────
    const hero = spread(reading.rows, HERO_SAMPLES)
      .map(
        (r) =>
          `      <span class="syl" style="font-family:${font}">${esc(r.text)}<small>${esc(r.entry.name)}</small></span>`,
      )
      .join("\n");

    const lede = shared
      ? `${joinAnd(langNames)} are written in the same script. Below are ${inr(shown.length)} published Indian names in ${reading.script}, each spelling identical in ${joinAnd(langNames)}, computed by our own transliteration engine rather than copied from a list.`
      : `${inr(shown.length)} published Indian names written out in ${reading.script}, each one beside the Devanagari it was converted from. Computed by our own transliteration engine, offline, name by name.`;

    // ── Stat cards ───────────────────────────────────────────────────
    const cards = [
      {
        k: "Names rendered",
        v: inr(reading.rows.length),
        n: `of ${inr(source.length)} published names${reading.dropped.length ? `; ${inr(reading.dropped.length)} dropped rather than faked` : ", with none dropped"}`,
      },
      {
        k: `${reading.script} letters used`,
        v: inr(reading.letters.length),
        n: "distinct base letters across the whole corpus",
      },
      {
        k: "Characters per name",
        v: reading.avgChars.toFixed(1),
        n: `against ${reading.avgRoman.toFixed(1)} roman letters`,
      },
      {
        k: "Spellings shared",
        v: inr(reading.collisions.length),
        n: reading.collisions.length
          ? `${plural(reading.collisions.length, "group", "groups")} of distinct names written the same way`
          : "no two distinct names collapse onto one",
      },
    ]
      .map(
        (c) => `      <div class="card">
        <div class="k">${esc(c.k)}</div>
        <div class="v">${esc(c.v)}</div>
        <div class="n">${esc(c.n)}</div>
      </div>`,
      )
      .join("\n");

    // ── FAQ: one array, rendered as prose and as FAQPage markup, so the
    //    visible answers and the structured data cannot diverge. ───────
    const faqs = [
      {
        q: `How do I write my name in ${primary}?`,
        a:
          `The table on this page carries ${inr(shown.length)} published names already written out in ${reading.script}. ` +
          `If a name is not among them, the check on the home page runs the same two-stage conversion on any name you type: the romanised spelling becomes Devanagari through our own syllable engine, and the Devanagari becomes ${reading.script}. ` +
          `It runs offline and returns all ten Indian scripts at once, not just this one.`,
      },
      {
        q: `Is this the spelling a ${primary} speaker would use?`,
        a:
          reading.merges.length || reading.standIns.length
            ? `Usually, with the caveats this page is explicit about. ` +
              `${reading.merges.length ? `${reading.script} writes ${reading.merges.map((m) => `${joinAnd(m.sources)} as ${m.target}`).join("; ")}. A spelling here therefore carries less information than the Devanagari behind it. ` : ""}` +
              `${reading.standIns.length ? `${joinAnd(reading.standIns.map((s) => s.deva))} ${plural(reading.standIns.length, "has", "have")} no ${reading.script} letter at all, and ${plural(reading.standIns.length, "comes", "come")} out spelled as ${joinAnd(reading.standIns.map((s) => s.text))}. ` : ""}` +
              `${reading.collisions.length ? `Across the published corpus that makes ${inr(reading.collisions.length)} ${plural(reading.collisions.length, "group", "groups")} of distinct names come out identical. ` : ""}` +
              `Where the conversion cannot represent a sound at all we drop the rendering rather than print broken text.`
            : isPivot
            ? `This is the spelling our engine produced, and Devanagari is where it stops rather than a script it was converted into, so nothing was lost on the way. What can still be wrong is the reading it chose: a romanised name does not fully determine its Devanagari, and the engine picks the likelier form. Your family's spelling is the authority and ours is a draft.`
            : `Every Devanagari letter these names use has its own letter in ${reading.script}, and no published name is dropped, so nothing is lost at that stage. What can still be wrong is the Devanagari itself — a romanised name does not fully determine its spelling, and the engine picks the likelier reading. Your family's spelling is the authority.`,
      },
      {
        q: `Which languages are written in the ${reading.script} script?`,
        a:
          reading.langs
            .map((l) => {
              const n = SPEAKERS[l.name];
              return `${l.name}${n ? ` (about ${(n / 1e7).toFixed(1)} crore first-language speakers in India at the 2011 census, ${WHERE[l.name] ?? ""})` : ""}`;
            })
            .join("; ") +
          `. ${SCRIPT_NOTES[reading.script]?.alsoWrites ?? ""} ${SCRIPT_NOTES[reading.script]?.status ?? ""}`.trimEnd(),
      },
      {
        q: `Why does a name here look different from the way my family writes it?`,
        a:
          `Because the conversion starts from roman letters, and roman letters lose the distinctions Devanagari makes. “Rita” is रीता in one family and ऋता in another, and the spelling cannot tell you which. ` +
          `${ambiguities.length ? `In this corpus ${inr(ambiguities.length)} ${plural(ambiguities.length, "group of romanised spellings arrives", "groups of romanised spellings arrive")} at the same Devanagari for exactly that reason. ` : ""}` +
          `We publish the likelier reading and say so. For a certificate or an invitation, treat it as a draft your family corrects.`,
      },
    ];

    const faqHtml = faqs
      .map(
        (f) => `    <h3 style="font-family:Fraunces,serif;font-size:18px;font-weight:500;margin:22px 0 2px">${esc(f.q)}</h3>
    <p>${esc(f.a)}</p>`,
      )
      .join("\n");

    // ── Internal links ───────────────────────────────────────────────
    const siblings = readings
      .filter((o) => o.slug !== reading.slug)
      .map(
        (o) =>
          `<a href="${scriptPath(o.slug)}">${esc(o.langs.map((l) => l.name).join(" & "))}<br /><span style="color:var(--ink-3);font-size:12px">${esc(o.script)} · ${inr(o.rows.length)} names</span></a>`,
      )
      .join("\n        ");

    const sampleNames = spread(reading.rows, MAX_SAMPLE_LINKS)
      .map(
        (r) =>
          `<a href="${namePath(r.entry.name)}">${esc(r.entry.name)} <span style="font-family:${font}">${esc(r.text)}</span></a>`,
      )
      .join("\n        ");

    const starChips = [
      ...new Set(
        spread(reading.rows, MAX_SAMPLE_LINKS)
          .flatMap((r) => starsFor(r.entry.name))
          .filter((s) => publishedStars.has(s)),
      ),
    ]
      .slice(0, MAX_SAMPLE_LINKS)
      .map((s) => `<a href="/nakshatra/${seoSlug(s)}.html">${esc(s)} names</a>`)
      .join("\n        ");

    const body = `  <h1>Your name in ${esc(reading.script)}</h1>
  <p class="lede">${esc(lede)}</p>

  <div class="syls" style="margin:18px 0 10px">
${hero}
  </div>

  <div class="tags">
    <span class="tag">${esc(reading.script)} script</span>
    ${reading.langs.map((l) => `<span class="tag">${esc(l.name)}</span>`).join("\n    ")}
    <span class="tag">${inr(reading.rows.length)} names rendered</span>
  </div>

  <section>
    <h2>Measured over the whole corpus</h2>
    <p class="sub">Not over the sample below — every published name was converted, and these are the counts that came back.</p>
    <div class="cards">
${cards}
    </div>
  </section>

  <section>
    <h2>${inr(shown.length)} names in ${esc(reading.script)}</h2>
    <p class="sub">${esc(isPivot ? "Each name as our engine writes it in Devanagari. Every spelling reads the same in Hindi and in Marathi." : `Each name in ${reading.script}, beside the Devanagari it was converted from. A meaning is shown only where we have verified one.`)}</p>
${namesTable(reading, shown)}
  </section>

${whereSection(reading)}

${lettersSection(reading)}

${limitsSection(reading)}

${ambiguitySection(reading, ambiguities, source.length)}

  <section class="prose">
    <h2>Questions people ask</h2>
${faqHtml}
  </section>

${ctaBlock(
  `Using one of these names for a business?`,
  `Run a live check across domains, social handles, marketplaces, the MCA company register and all 45 trademark classes.`,
)}

  <section>
    <h2>The same names in the other ${inr(readings.length - 1)} scripts</h2>
    <p class="sub">Same corpus, same pipeline, one page each.</p>
    <div class="grid-links">
        ${siblings}
    </div>
  </section>

  <section>
    <h2>Name pages from this table</h2>
    <p class="sub">Each carries the name in all ten scripts at once, with its numerology, birth star and short forms.</p>
    <div class="related">
        ${sampleNames}
        <a href="/n/">All published names</a>
    </div>
  </section>

${
  // Absent only on a build whose corpus reaches no star at all; a heading over
  // an empty chip row is the hollow block rule 2 is about.
  starChips
    ? `  <section>
    <h2>Birth stars behind these names</h2>
    <p class="sub">A script comes from the whole name. A nakshatra comes from its first sound alone — the syllable a pandit gives at the namkaran.</p>
    <div class="related">
        ${starChips}
    </div>
  </section>`
    : ""
}`;

    const path = scriptPath(reading.slug);

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
        name: `Indian names written in ${reading.script} script`,
        numberOfItems: shown.length,
        itemListElement: shown.map((r, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: r.entry.name,
          alternateName: r.text,
          url: `${ctx.siteOrigin}${namePath(r.entry.name)}`,
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
        // No /script/ index ships, so the parent is the name index — a
        // breadcrumb must never point at a page the build does not write, and
        // /n/ does list every name in the table above.
        crumbs: [
          { label: "Home", href: "/" },
          { label: "Names", href: "/n/" },
          { label: `${reading.script} script` },
        ],
        jsonLd,
        body,
      }),
      // Below the name pages and the nakshatra cluster. These rank for a
      // narrow query and answer it in one table; they are not the pages the
      // site most wants crawled first.
      priority: "0.7",
      changefreq: "monthly",
    };
  });
}
