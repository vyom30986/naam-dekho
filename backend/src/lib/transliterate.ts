import Sanscript from "@indic-transliteration/sanscript";

/**
 * Name transliteration — romanised input → Devanagari → the other Indian scripts.
 *
 * Runs fully offline. No API key, no account, no network, no per-search cost.
 *
 * Two stages:
 *   1. romanToDevanagari()  — in-house syllable engine (the hard half; no free
 *                             library does romanised→Devanagari acceptably)
 *   2. devanagariToScripts() — @indic-transliteration/sanscript (MIT), which is
 *                              accurate for Brahmic→Brahmic conversion
 *
 * HONESTY RULE: Tamil and Gurmukhi lack some sounds Devanagari has (notably
 * ऋ and ष). Where sanscript cannot represent them it leaks raw Devanagari
 * characters into the output. We repair what we can, and if a script still
 * contains foreign characters we DROP it rather than display broken text.
 */

// ── Stage 1: romanised → Devanagari ──────────────────────────────────

const INDEPENDENT_VOWELS: Record<string, string> = {
  a: "अ", aa: "आ", i: "इ", ii: "ई", u: "उ", uu: "ऊ",
  e: "ए", ai: "ऐ", o: "ओ", au: "औ", ri: "ऋ",
};

const VOWEL_SIGNS: Record<string, string> = {
  a: "", // inherent — a bare consonant already carries it
  aa: "ा", i: "ि", ii: "ी", u: "ु", uu: "ू",
  e: "े", ai: "ै", o: "ो", au: "ौ", ri: "ृ",
};

/** Longest-first so "aa" beats "a" and "ai" beats "a". */
const VOWEL_TOKENS = ["aai", "aa", "ai", "au", "ee", "ii", "oo", "uu", "a", "e", "i", "o", "u"];

/** Normalise romanisation variants onto our canonical vowel keys. */
const VOWEL_ALIAS: Record<string, string> = { ee: "ii", oo: "uu", aai: "aa" };

const CONSONANTS: Record<string, string> = {
  // aspirated / digraphs first — the tokenizer tries longest match
  ksh: "क्ष", gy: "ज्ञ", jn: "ज्ञ", chh: "छ", sch: "श",
  kh: "ख", gh: "घ", ch: "च", jh: "झ", th: "थ", dh: "ध",
  ph: "फ", bh: "भ", sh: "श",
  // NOTE: "ng"/"ny" are deliberately NOT digraphs here. In romanised Indian
  // names they are almost always n + g / n + y (Ananya, Ganga), not ङ/ञ.
  k: "क", g: "ग", c: "क", j: "ज", t: "त", d: "द",
  n: "न", p: "प", f: "फ", b: "ब", m: "म", y: "य",
  r: "र", l: "ल", v: "व", w: "व", s: "स", h: "ह",
  z: "ज", x: "क्स", q: "क",
};

const CONSONANT_TOKENS = Object.keys(CONSONANTS).sort((a, b) => b.length - a.length);
const VIRAMA = "्";
const ANUSVARA = "ं";

/**
 * Stops and sibilants. A nasal before one of these is written as anusvara in
 * standard Hindi — संजय, not सन्जय. Semivowels (y/r/l/v) are excluded, which
 * is why Ananya stays अनन्या.
 */
const STOPS = new Set([
  "k", "kh", "g", "gh", "c", "ch", "chh", "j", "jh",
  "t", "th", "d", "dh", "p", "ph", "f", "b", "bh",
  "s", "sh", "ksh",
]);

/**
 * Names where the plain rules cannot recover the original sound — chiefly
 * the vocalic ऋ, which romanises as "ri"/"ru" and is unrecoverable otherwise.
 * Small and high-frequency by design; not a substitute for the engine.
 */
const EXCEPTIONS: Record<string, string> = {
  krishna: "कृष्ण", krishn: "कृष्ण", krish: "कृष", lakshmi: "लक्ष्मी",
  rishi: "ऋषि", rishabh: "ऋषभ", vrinda: "वृंदा", prithvi: "पृथ्वी",
  mrinal: "मृणाल", tripti: "तृप्ति", brijesh: "बृजेश", hrithik: "ऋतिक",
  shri: "श्री", sri: "श्री", vishnu: "विष्णु", ganesh: "गणेश",
};

type Token = { type: "C" | "V"; key: string };

function tokenize(word: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < word.length) {
    let matched = false;

    // Consonants take priority so "sh" is not read as "s" + "h"
    for (const c of CONSONANT_TOKENS) {
      if (word.startsWith(c, i)) {
        tokens.push({ type: "C", key: c });
        i += c.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    for (const v of VOWEL_TOKENS) {
      if (word.startsWith(v, i)) {
        tokens.push({ type: "V", key: VOWEL_ALIAS[v] ?? v });
        i += v.length;
        matched = true;
        break;
      }
    }
    if (!matched) i++; // unknown character — skip rather than emit garbage
  }
  return tokens;
}

function transliterateWord(raw: string): string {
  const word = raw.toLowerCase().replace(/[^a-z]/g, "");
  if (!word) return "";
  if (EXCEPTIONS[word]) return EXCEPTIONS[word];

  // A trailing lone "a" in a romanised Indian name is nearly always the long
  // ā (Priya → प्रिया, Ananya → अनन्या), so lengthen it before tokenizing.
  let prepared = word;
  if (/[^aeiou]a$/.test(prepared) && (prepared.match(/[aeiou]/g)?.length ?? 0) >= 2) {
    prepared = prepared.slice(0, -1) + "aa";
  }

  const tokens = tokenize(prepared);
  let out = "";
  let pendingConsonant = false; // a consonant was emitted and still needs its vowel
  let lastWasVowel = false;

  for (let idx = 0; idx < tokens.length; idx++) {
    const t = tokens[idx];
    if (t.type === "C") {
      // Nasal + stop mid-word collapses to anusvara on the previous syllable.
      const next = tokens[idx + 1];
      if (
        (t.key === "n" || t.key === "m") &&
        !pendingConsonant &&
        out.length > 0 &&
        next?.type === "C" &&
        STOPS.has(next.key)
      ) {
        out += ANUSVARA;
        lastWasVowel = false;
        continue;
      }
      if (pendingConsonant) out += VIRAMA; // join into a conjunct cluster
      out += CONSONANTS[t.key];
      pendingConsonant = true;
      lastWasVowel = false;
    } else {
      if (pendingConsonant) {
        out += VOWEL_SIGNS[t.key] ?? "";
        pendingConsonant = false;
      } else if (lastWasVowel) {
        // vowel directly after a vowel — insert the य glide, as in Meridian → …डियन
        out += "य" + (VOWEL_SIGNS[t.key] ?? "");
      } else {
        out += INDEPENDENT_VOWELS[t.key] ?? "";
      }
      lastWasVowel = true;
    }
  }
  return out;
}

/**
 * Spellings we have verified, consulted before the engine runs.
 *
 * Roman spelling does not record vowel length, so it cannot be transliterated
 * back reliably. The engine renders Rahul as रहुल rather than राहुल, Ram as रम
 * rather than राम, Ritu as रितु rather than ऋतु. Measured against spellings
 * corroborated by a Wiktionary entry at that exact form, 108 of 210 corpus
 * names came out wrong — and since every other Indian script here is derived
 * from the Devanagari, one wrong vowel was wrong in all ten.
 *
 * No amount of rule-tuning fixes that: "Ram" carries no mark saying which of
 * its vowels is long. It needs a lexicon, so this is one. It starts empty,
 * which keeps this module free of any dependency on the database.
 */
const KNOWN_SPELLINGS = new Map<string, string>();

/**
 * Teach the transliterator the spellings we have verified. Called once by the
 * page build and once at server start; calling it again is safe and later
 * entries win. Returns how many were accepted.
 */
export function registerNameSpellings(entries: Iterable<readonly [string, string]>): number {
  let n = 0;
  for (const [roman, devanagari] of entries) {
    const key = roman.trim().toLowerCase();
    if (!key || !devanagari) continue;
    KNOWN_SPELLINGS.set(key, devanagari);
    n++;
  }
  return n;
}

/** Romanised name → Devanagari. Handles multi-word names. */
export function romanToDevanagari(name: string): string {
  const known = KNOWN_SPELLINGS.get(name.trim().toLowerCase());
  if (known) return known;
  return name
    .trim()
    .split(/\s+/)
    .map(transliterateWord)
    .filter(Boolean)
    .join(" ");
}

// ── Stage 2: Devanagari → the other Indian scripts ───────────────────

export interface ScriptRendering {
  code: string;
  name: string;
  script: string;
  text: string;
}

export const SCRIPT_TARGETS: Array<{ code: string; name: string; script: string; sanscript: string }> = [
  { code: "hi", name: "Hindi", script: "Devanagari", sanscript: "devanagari" },
  { code: "mr", name: "Marathi", script: "Devanagari", sanscript: "devanagari" },
  { code: "bn", name: "Bengali", script: "Bengali", sanscript: "bengali" },
  { code: "ta", name: "Tamil", script: "Tamil", sanscript: "tamil" },
  { code: "te", name: "Telugu", script: "Telugu", sanscript: "telugu" },
  { code: "gu", name: "Gujarati", script: "Gujarati", sanscript: "gujarati" },
  { code: "kn", name: "Kannada", script: "Kannada", sanscript: "kannada" },
  { code: "ml", name: "Malayalam", script: "Malayalam", sanscript: "malayalam" },
  { code: "pa", name: "Punjabi", script: "Gurmukhi", sanscript: "gurmukhi" },
  { code: "or", name: "Odia", script: "Odia", sanscript: "oriya" },
];

const DEVANAGARI_RANGE = /[ऀ-ॿ]/;

/**
 * Repair the artifacts sanscript emits for scripts with a smaller phoneme
 * inventory. Each mapping is the conventional native spelling, not a guess:
 * Punjabi really does write कृष्ण as ਕ੍ਰਿਸ਼ਨ and ष as ਸ਼.
 */
const GURMUKHI_REPAIRS: Array<[RegExp, string]> = [
  [/ृ/g, "ਿ"], // vocalic-r sign → short i (Punjabi writes कृष्ण as ਕ੍ਰਿਸ਼ਨ)
  [/ऋ/g, "ਰਿ"], // ऋ → ਰਿ
  [/[षश]/g, "ਸ਼"], // ष / श → ਸ਼ (Gurmukhi has neither)
];

const TAMIL_REPAIRS: Array<[RegExp, string]> = [
  [/[ʼ‘’']/g, ""], // modifier apostrophe used for voiced stops
  [/[²³⁴]/g, ""], // Grantha superscript notation
];

function repair(text: string, sanscriptTarget: string): string {
  let out = text;
  if (sanscriptTarget === "gurmukhi") for (const [re, to] of GURMUKHI_REPAIRS) out = out.replace(re, to);
  if (sanscriptTarget === "tamil") for (const [re, to] of TAMIL_REPAIRS) out = out.replace(re, to);
  return out.normalize("NFC");
}

/**
 * Render Devanagari into every target script. A script is OMITTED (not faked)
 * when conversion leaves characters that do not belong to it.
 */
export function devanagariToScripts(deva: string): ScriptRendering[] {
  if (!deva) return [];
  const out: ScriptRendering[] = [];

  for (const target of SCRIPT_TARGETS) {
    if (target.sanscript === "devanagari") {
      out.push({ code: target.code, name: target.name, script: target.script, text: deva });
      continue;
    }
    try {
      const converted = repair(Sanscript.t(deva, "devanagari", target.sanscript), target.sanscript);
      // Any surviving Devanagari means the script cannot express this name.
      if (!converted || DEVANAGARI_RANGE.test(converted)) continue;
      out.push({ code: target.code, name: target.name, script: target.script, text: converted });
    } catch {
      continue;
    }
  }
  return out;
}

/** Full pipeline: romanised name → every script we can render honestly. */
export function nameInAllScripts(name: string): { devanagari: string; scripts: ScriptRendering[] } {
  const devanagari = romanToDevanagari(name);
  return { devanagari, scripts: devanagariToScripts(devanagari) };
}
