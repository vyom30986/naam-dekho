import { romanToDevanagari } from "./transliterate.js";

/**
 * Input normalisation — converts a raw user-supplied name into a canonical
 * form used by every downstream scanner.
 */

export interface NormalisedName {
  raw: string;
  trimmed: string;
  lower: string;
  alnumLower: string;
  capitalised: string;
  letters: string;
  phoneticKey: string;
  devanagari: string;
}

/**
 * Invisible characters that change how a string COMPARES without changing how
 * it LOOKS. Left in, they silently split one name into two:
 *   - U+200B..U+200D  zero-width space / non-joiner / joiner
 *   - U+FEFF          byte-order mark (arrives via copy-paste from Word)
 *   - U+200E, U+200F  bidi marks
 *   - U+00AD          soft hyphen
 *
 * ZWJ/ZWNJ genuinely matter *inside* Indic script (they control conjunct
 * formation), so they are stripped only from the comparison keys, never from
 * the text we display back to the user.
 */
// Written as escapes on purpose — as literal characters these are invisible in
// the source and the next person to edit this file would delete them by accident.
const INVISIBLES = /[\u200B-\u200F\u00AD\uFEFF]/g;

export function normaliseName(raw: string): NormalisedName {
  if (typeof raw !== "string") throw new Error("name must be a string");

  // Unicode NFC first, before anything measures or compares this string.
  //
  // Without it, क़ (U+0958) and क + ़ (U+0915 U+093C) are visually identical
  // but unequal, as are a typed "Café" and one pasted from Word. Two users
  // searching the same name would get different cache keys and different scan
  // rows — and one of them could be told a taken name is free.
  //
  // Node ships full ICU, so this needs no dependency.
  const trimmed = raw.normalize("NFC").replace(INVISIBLES, "").trim();
  if (trimmed.length === 0) throw new Error("name is empty");
  if (trimmed.length > 64) throw new Error("name must be 64 characters or fewer");

  const lower = trimmed.toLowerCase();
  const alnumLower = lower.replace(/[^a-z0-9]/g, "");
  const capitalised = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  const letters = trimmed.replace(/[^A-Za-z]/g, "").toUpperCase();

  return {
    raw,
    trimmed,
    lower,
    alnumLower,
    capitalised,
    letters,
    phoneticKey: phoneticKey(letters),
    devanagari: romanToDevanagari(letters),
  };
}

/**
 * Very simple metaphone-style phonetic key, tuned for Indic phonemes.
 * Not perfect — good enough for "did the user type something similar to
 * what's in the MCA register" matching. Replace with a proper library
 * (e.g. natural.Metaphone) when stability matters.
 */
export function phoneticKey(letters: string): string {
  if (!letters) return "";
  let s = letters.toUpperCase();
  // Common Indic substitutions
  const subs: Array<[RegExp, string]> = [
    [/PH/g, "F"],
    [/CH/g, "C"],
    [/SH/g, "S"],
    [/TH/g, "T"],
    [/CK/g, "K"],
    [/Q/g, "K"],
    [/X/g, "KS"],
    [/Z/g, "S"],
    [/[AEIOUY]+/g, "A"], // collapse vowels
    [/(.)\1+/g, "$1"], // collapse double letters
  ];
  for (const [re, rep] of subs) s = s.replace(re, rep);
  return s;
}
