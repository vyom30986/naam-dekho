import type { TileResult } from "../lib/types.js";
import { chaldean } from "../lib/numerology.js";
import { nakshatraAt } from "../lib/moon.js";

/**
 * Baby-mode cultural computations — all in-house, zero external calls:
 *   b-rashi  Rashi + Nakshatra from the name's first syllable (Avakahada chakra)
 *   b-nick   Nickname / short-form suggestions
 *   b-sib    Sibling name harmony (only meaningful when a sibling name is given)
 *
 * All three are status "info": they are traditional / advisory readings, so
 * they never count toward the clear/conflict verdict (same rule as GST).
 *
 * Honesty note on b-rashi: the authoritative rashi comes from the birth
 * chart (janam kundli), not the name. The Avakahada chakra runs the OTHER
 * way — pandits use it to pick a starting syllable from the birth nakshatra.
 * We present the reverse lookup exactly as that: "this syllable traditionally
 * belongs to X nakshatra", listing every match when a syllable appears under
 * more than one star.
 */

// ── Avakahada chakra: 27 nakshatras, 4 pada syllables each ──────────
// Rashi per pada follows the standard 2¼-nakshatra-per-rashi division.
interface Pada { syl: string; rashi: string }
export interface Nakshatra { name: string; symbol: string; padas: Pada[] }

export const RASHI_NAMES = {
  mesha: "Mesha (Aries)", vrishabha: "Vrishabha (Taurus)", mithuna: "Mithuna (Gemini)",
  karka: "Karka (Cancer)", simha: "Simha (Leo)", kanya: "Kanya (Virgo)",
  tula: "Tula (Libra)", vrishchika: "Vrishchika (Scorpio)", dhanu: "Dhanu (Sagittarius)",
  makara: "Makara (Capricorn)", kumbha: "Kumbha (Aquarius)", meena: "Meena (Pisces)",
};

// The 27 nakshatras below were written against a short local alias, and the
// SEO pages need the map by a name that means something outside this file.
// Aliasing keeps both without touching 27 call sites.
const R = RASHI_NAMES;

export const NAKSHATRAS: Nakshatra[] = [
  { name: "Ashwini", symbol: "🐎", padas: [{ syl: "chu", rashi: R.mesha }, { syl: "che", rashi: R.mesha }, { syl: "cho", rashi: R.mesha }, { syl: "la", rashi: R.mesha }] },
  { name: "Bharani", symbol: "🌺", padas: [{ syl: "li", rashi: R.mesha }, { syl: "lu", rashi: R.mesha }, { syl: "le", rashi: R.mesha }, { syl: "lo", rashi: R.mesha }] },
  { name: "Krittika", symbol: "🔥", padas: [{ syl: "a", rashi: R.mesha }, { syl: "i", rashi: R.vrishabha }, { syl: "u", rashi: R.vrishabha }, { syl: "e", rashi: R.vrishabha }] },
  { name: "Rohini", symbol: "🌙", padas: [{ syl: "o", rashi: R.vrishabha }, { syl: "va", rashi: R.vrishabha }, { syl: "vi", rashi: R.vrishabha }, { syl: "vu", rashi: R.vrishabha }] },
  { name: "Mrigashira", symbol: "🦌", padas: [{ syl: "ve", rashi: R.vrishabha }, { syl: "vo", rashi: R.vrishabha }, { syl: "ka", rashi: R.mithuna }, { syl: "ki", rashi: R.mithuna }] },
  { name: "Ardra", symbol: "💧", padas: [{ syl: "ku", rashi: R.mithuna }, { syl: "gha", rashi: R.mithuna }, { syl: "nga", rashi: R.mithuna }, { syl: "chha", rashi: R.mithuna }] },
  { name: "Punarvasu", symbol: "🏹", padas: [{ syl: "ke", rashi: R.mithuna }, { syl: "ko", rashi: R.mithuna }, { syl: "ha", rashi: R.mithuna }, { syl: "hi", rashi: R.karka }] },
  { name: "Pushya", symbol: "🪷", padas: [{ syl: "hu", rashi: R.karka }, { syl: "he", rashi: R.karka }, { syl: "ho", rashi: R.karka }, { syl: "da", rashi: R.karka }] },
  { name: "Ashlesha", symbol: "🐍", padas: [{ syl: "di", rashi: R.karka }, { syl: "du", rashi: R.karka }, { syl: "de", rashi: R.karka }, { syl: "do", rashi: R.karka }] },
  { name: "Magha", symbol: "👑", padas: [{ syl: "ma", rashi: R.simha }, { syl: "mi", rashi: R.simha }, { syl: "mu", rashi: R.simha }, { syl: "me", rashi: R.simha }] },
  { name: "Purva Phalguni", symbol: "🛏️", padas: [{ syl: "mo", rashi: R.simha }, { syl: "ta", rashi: R.simha }, { syl: "ti", rashi: R.simha }, { syl: "tu", rashi: R.simha }] },
  { name: "Uttara Phalguni", symbol: "🌞", padas: [{ syl: "te", rashi: R.simha }, { syl: "to", rashi: R.kanya }, { syl: "pa", rashi: R.kanya }, { syl: "pi", rashi: R.kanya }] },
  { name: "Hasta", symbol: "✋", padas: [{ syl: "pu", rashi: R.kanya }, { syl: "sha", rashi: R.kanya }, { syl: "na", rashi: R.kanya }, { syl: "tha", rashi: R.kanya }] },
  { name: "Chitra", symbol: "💎", padas: [{ syl: "pe", rashi: R.kanya }, { syl: "po", rashi: R.kanya }, { syl: "ra", rashi: R.tula }, { syl: "ri", rashi: R.tula }] },
  { name: "Swati", symbol: "🌬️", padas: [{ syl: "ru", rashi: R.tula }, { syl: "re", rashi: R.tula }, { syl: "ro", rashi: R.tula }, { syl: "taa", rashi: R.tula }] },
  { name: "Vishakha", symbol: "🌳", padas: [{ syl: "tee", rashi: R.tula }, { syl: "too", rashi: R.tula }, { syl: "tay", rashi: R.tula }, { syl: "tho", rashi: R.vrishchika }] },
  { name: "Anuradha", symbol: "🪔", padas: [{ syl: "naa", rashi: R.vrishchika }, { syl: "ni", rashi: R.vrishchika }, { syl: "nu", rashi: R.vrishchika }, { syl: "ne", rashi: R.vrishchika }] },
  { name: "Jyeshtha", symbol: "☂️", padas: [{ syl: "no", rashi: R.vrishchika }, { syl: "ya", rashi: R.vrishchika }, { syl: "yi", rashi: R.vrishchika }, { syl: "yu", rashi: R.vrishchika }] },
  { name: "Mula", symbol: "🌿", padas: [{ syl: "ye", rashi: R.dhanu }, { syl: "yo", rashi: R.dhanu }, { syl: "bha", rashi: R.dhanu }, { syl: "bhi", rashi: R.dhanu }] },
  { name: "Purva Ashadha", symbol: "🌊", padas: [{ syl: "bhu", rashi: R.dhanu }, { syl: "dha", rashi: R.dhanu }, { syl: "pha", rashi: R.dhanu }, { syl: "dhaa", rashi: R.dhanu }] },
  { name: "Uttara Ashadha", symbol: "🐘", padas: [{ syl: "bhe", rashi: R.dhanu }, { syl: "bho", rashi: R.makara }, { syl: "ja", rashi: R.makara }, { syl: "ji", rashi: R.makara }] },
  { name: "Shravana", symbol: "👂", padas: [{ syl: "khi", rashi: R.makara }, { syl: "khu", rashi: R.makara }, { syl: "khe", rashi: R.makara }, { syl: "kho", rashi: R.makara }] },
  { name: "Dhanishta", symbol: "🥁", padas: [{ syl: "ga", rashi: R.makara }, { syl: "gi", rashi: R.makara }, { syl: "gu", rashi: R.kumbha }, { syl: "ge", rashi: R.kumbha }] },
  { name: "Shatabhisha", symbol: "⭕", padas: [{ syl: "go", rashi: R.kumbha }, { syl: "sa", rashi: R.kumbha }, { syl: "si", rashi: R.kumbha }, { syl: "su", rashi: R.kumbha }] },
  { name: "Purva Bhadrapada", symbol: "⚔️", padas: [{ syl: "se", rashi: R.kumbha }, { syl: "so", rashi: R.kumbha }, { syl: "daa", rashi: R.kumbha }, { syl: "dee", rashi: R.meena }] },
  { name: "Uttara Bhadrapada", symbol: "🐉", padas: [{ syl: "doo", rashi: R.meena }, { syl: "thaa", rashi: R.meena }, { syl: "jha", rashi: R.meena }, { syl: "gya", rashi: R.meena }] },
  { name: "Revati", symbol: "🐟", padas: [{ syl: "day", rashi: R.meena }, { syl: "doh", rashi: R.meena }, { syl: "cha", rashi: R.meena }, { syl: "chi", rashi: R.meena }] },
];

/** Normalise romanised spelling so long vowels match (Aarav → arav). */
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

interface RashiMatch { nakshatra: string; symbol: string; pada: number; rashi: string; syllable: string }

function lookupSyllable(name: string): RashiMatch[] {
  const n = normaliseSyllables(name);
  if (!n) return [];
  // Longest prefix first (4 → 1 chars) so "chha" wins over "cha" over "ch"
  for (let len = 4; len >= 1; len--) {
    const prefix = n.slice(0, len);
    const matches: RashiMatch[] = [];
    for (const nk of NAKSHATRAS) {
      nk.padas.forEach((p, i) => {
        if (p.syl === prefix) {
          matches.push({ nakshatra: nk.name, symbol: nk.symbol, pada: i + 1, rashi: p.rashi, syllable: prefix });
        }
      });
    }
    if (matches.length > 0) return matches;
  }
  return [];
}

/**
 * The real namkaran calculation, when the birth details are known.
 *
 * A pandit works FORWARDS: the Moon's position at birth gives the nakshatra,
 * and the nakshatra's pada gives the syllables the name should begin with.
 * With a birth date we can do exactly that, then tell the family whether the
 * name they are considering matches.
 *
 * The time is optional because many parents do not have it to hand. The Moon
 * crosses roughly one nakshatra per day, so without a time the answer can
 * straddle two — in which case we say so and name both, rather than picking
 * one and sounding certain.
 */
function fromBirth(name: string, birthDate: string, birthTime?: string) {
  // Read as India Standard Time — the overwhelming majority of our users,
  // and a stated assumption beats a silent one.
  const time = birthTime && /^\d{2}:\d{2}$/.test(birthTime) ? birthTime : null;
  const at = new Date(`${birthDate}T${time ?? "12:00"}:00+05:30`);
  if (Number.isNaN(at.getTime())) return null;

  const here = nakshatraAt(at);
  const nak = NAKSHATRAS[here.index];
  if (!nak) return null;

  // With no birth time, check the whole day: if the Moon changes nakshatra
  // during it, both are possible and the family needs to know that.
  let alsoPossible: string | null = null;
  if (!time) {
    const dayStart = nakshatraAt(new Date(`${birthDate}T00:00:00+05:30`));
    const dayEnd = nakshatraAt(new Date(`${birthDate}T23:59:00+05:30`));
    if (dayStart.index !== dayEnd.index) {
      const other = dayStart.index === here.index ? dayEnd.index : dayStart.index;
      alsoPossible = NAKSHATRAS[other]?.name ?? null;
    }
  }

  const pada = nak.padas[here.pada - 1];
  const syllables = nak.padas.map((p) => p.syl);
  const first = normaliseSyllables(name);
  // Longest syllable first, so "chha" wins over "cha".
  const matched = [...syllables].sort((a, b) => b.length - a.length).find((s) => first.startsWith(s));

  return {
    nakshatra: nak.name,
    symbol: nak.symbol,
    pada: here.pada,
    rashi: pada?.rashi ?? null,
    syllables,
    matched: matched ?? null,
    longitude: Number(here.longitude.toFixed(2)),
    timeGiven: time !== null,
    alsoPossible,
  };
}

export function scanRashi(name: string, birthDate?: string, birthTime?: string): TileResult {
  const start = Date.now();

  // ── With a birth date, run the chakra the way a pandit does ──
  if (birthDate) {
    const b = fromBirth(name, birthDate, birthTime);
    if (b) {
      const caution = b.alsoPossible
        ? ` The Moon changed star that day — a birth time would settle whether it was ${b.nakshatra} or ${b.alsoPossible}.`
        : "";
      const display = name.trim();
      return {
        tileId: "b-rashi",
        category: "astrology",
        status: "info",
        summary: b.matched
          ? `Born under ${b.symbol} ${b.nakshatra} · ${b.rashi} — "${display}" begins with "${b.matched}", a traditional syllable for this star`
          : `Born under ${b.symbol} ${b.nakshatra} · ${b.rashi} — tradition suggests starting with ${b.syllables.join(", ")}`,
        detail: {
          fromBirthChart: true,
          birthDate,
          birthTime: b.timeGiven ? birthTime : null,
          nakshatra: b.nakshatra,
          symbol: b.symbol,
          pada: b.pada,
          rashi: b.rashi,
          suggestedSyllables: b.syllables,
          matched: b.matched,
          alsoPossible: b.alsoPossible,
          moonLongitude: b.longitude,
          note:
            (b.timeGiven
              ? "Calculated from the Moon's position at the birth time given, Lahiri ayanamsa."
              : "Calculated for midday on the birth date, Lahiri ayanamsa — add a birth time for an exact reading.") +
            caution +
            " A matching syllable is a tradition, not a rule — many families choose the name they love regardless.",
        },
        source: "Avakahada chakra + Moon position",
        latencyMs: Date.now() - start,
      };
    }
  }

  const matches = lookupSyllable(name);

  if (matches.length === 0) {
    return {
      tileId: "b-rashi",
      category: "astrology",
      status: "info",
      summary: "This starting sound has no direct Avakahada chakra entry — a janam-kundli reading is the way to go",
      detail: { note: "Traditional syllable tables cover Sanskrit-origin sounds; some modern spellings fall outside them." },
      source: "Avakahada chakra",
      latencyMs: Date.now() - start,
    };
  }

  const primary = matches[0];
  const alternates = matches.slice(1);
  return {
    tileId: "b-rashi",
    category: "astrology",
    status: "info",
    // The summary used to read `"Aa" → ♈ Ashwini nakshatra · Mesha`, which a
    // parent glancing at the tile reads as their baby's star sign — the caveat
    // was true but buried in the note below (founder, 6 Aug 2026). It now says
    // what this is in the first seven words, before any star is named.
    summary:
      `Read from the name, not from a birth chart — "${primary.syllable[0].toUpperCase()}${primary.syllable.slice(1)}" ` +
      `is a syllable of ${primary.symbol} ${primary.nakshatra} · ${primary.rashi}. ` +
      `Enter the date of birth for your child's actual star.`,
    detail: {
      fromBirthChart: false,
      needsBirthDate: true,
      nakshatra: primary.nakshatra,
      pada: primary.pada,
      rashi: primary.rashi,
      syllable: primary.syllable,
      alternates: alternates.map((a) => `${a.nakshatra} (pada ${a.pada}) · ${a.rashi}`),
      note:
        "The traditional table, read in reverse. A pandit derives the SYLLABLE from the birth nakshatra — never " +
        "the nakshatra from the name. Without a date of birth this tells you which star the sound belongs to; it " +
        "tells you nothing about your child. Give the date and we calculate the Moon's actual position instead.",
    },
    source: "Avakahada chakra",
    latencyMs: Date.now() - start,
  };
}

// ── Nicknames ───────────────────────────────────────────────────────
const VOWELS = new Set(["a", "e", "i", "o", "u"]);

/** Split a romanised name into rough syllable chunks (consonant-cluster + vowel-run). */
function roughSyllables(name: string): string[] {
  const n = name.toLowerCase().replace(/[^a-z]/g, "");
  const out: string[] = [];
  let cur = "";
  let seenVowel = false;
  for (const ch of n) {
    if (VOWELS.has(ch)) {
      cur += ch;
      seenVowel = true;
    } else {
      if (seenVowel) {
        out.push(cur);
        cur = ch;
        seenVowel = false;
      } else {
        cur += ch;
      }
    }
  }
  if (cur) out.push(cur);
  return out;
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/**
 * Nickname stem: leading consonants + first vowel run + up to 2 following
 * consonants (stopping before the next vowel). Aarav → "aar", Anaya → "an",
 * Krishna → "krish", Meera → "meer".
 */
function nicknameStem(n: string): string {
  let i = 0;
  while (i < n.length && !VOWELS.has(n[i])) i++;          // leading consonants
  while (i < n.length && VOWELS.has(n[i])) i++;           // first vowel run
  let cons = 0;
  while (i < n.length && !VOWELS.has(n[i]) && cons < 2) { i++; cons++; } // ≤2 trailing consonants
  return i < n.length ? n.slice(0, i) : ""; // if we consumed the whole name there is nothing to shorten
}

export function scanNicknames(name: string): TileResult {
  const start = Date.now();
  const clean = (name.trim().split(/\s+/)[0] ?? "").toLowerCase().replace(/[^a-z]/g, "");
  const nicks = new Set<string>();

  const stem = nicknameStem(clean);
  if (stem.length >= 2) {
    // Classic Indian diminutives — Aaru, Aari, Anu-Anu
    nicks.add(cap(stem + "u"));
    nicks.add(cap(stem + "i"));
    if (stem.length === 2) nicks.add(cap(stem + "u") + "-" + cap(stem + "u"));
  }
  nicks.delete(cap(clean)); // a "nickname" identical to the name is not one

  const list = [...nicks].slice(0, 5);
  return {
    tileId: "b-nick",
    category: "linguistic",
    status: "info",
    summary: list.length > 0
      ? `Everyday short forms: ${list.join(", ")}`
      : "Name is already short and sweet — no obvious short forms",
    detail: { nicknames: list, note: "Generated from common Indian diminutive patterns — how the name is likely to be shortened at home and in school." },
    source: "in-house engine",
    latencyMs: Date.now() - start,
  };
}

// ── Sibling harmony ─────────────────────────────────────────────────
export function scanSiblingHarmony(name: string, sibling?: string): TileResult {
  const start = Date.now();
  const a = name.trim();
  const b = (sibling ?? "").trim();

  if (!b) {
    return {
      tileId: "b-sib",
      category: "linguistic",
      status: "info",
      summary: "Add a sibling's name in the search box option to compare how the two names sound together",
      detail: { note: "Optional check — fill the sibling field to run it." },
      source: "in-house engine",
      latencyMs: Date.now() - start,
    };
  }

  const an = a.toLowerCase().replace(/[^a-z]/g, "");
  const bn = b.toLowerCase().replace(/[^a-z]/g, "");
  const sylA = roughSyllables(an).length;
  const sylB = roughSyllables(bn).length;
  const sameStart = an[0] === bn[0];
  const sameEnding = an.slice(-2) === bn.slice(-2) && an !== bn;
  const numA = chaldean(a);
  const numB = chaldean(b);

  const points: string[] = [];
  if (sameStart) points.push(`both start with "${a[0].toUpperCase()}" — a matched pair`);
  if (sameEnding) points.push(`shared "-${an.slice(-2)}" ending — they rhyme when called together`);
  if (Math.abs(sylA - sylB) <= 1) points.push("similar length — neither name overshadows the other");
  else points.push(`different rhythms (${sylA} vs ${sylB} syllables) — distinct, easy to tell apart when called`);
  points.push(`Chaldean roots ${numA.root} and ${numB.root}${numA.root === numB.root ? " — identical vibration" : ""}`);

  const harmonious = sameStart || sameEnding || Math.abs(sylA - sylB) <= 1;
  return {
    tileId: "b-sib",
    category: "linguistic",
    status: "info",
    summary: `${cap(a)} + ${cap(b)}: ${harmonious ? "a harmonious pair" : "distinct but compatible"} — ${points[0]}`,
    detail: { comparison: points, siblingName: cap(b), note: "Sound-pattern comparison — alliteration, rhyme, rhythm and numerology roots." },
    source: "in-house engine",
    latencyMs: Date.now() - start,
  };
}
