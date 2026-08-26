import { chaldean } from "../lib/numerology.js";
import { nameInAllScripts } from "../lib/transliterate.js";
import { scanRashi, scanNicknames } from "../scanners/astro.js";
import { scanPronunciation } from "../scanners/linguistic.js";
import { certificateProse, geminiReadings } from "../lib/gemini.js";
import { LANDMINES } from "../lib/landmines-data.js";
import { lookupMeaning } from "../lib/meanings.js";

/**
 * Everything the certificate sheet needs, in one shape.
 *
 * Kept apart from the rendering so keepsake.ts is about layout and nothing
 * else. Every value is recomputed from the name rather than read back from a
 * stored scan, which means a certificate is always complete even if a check was
 * slow or a source was down on the day the search ran.
 *
 * Note what is NOT on this type: the date of birth. It goes into
 * buildCertificateData and does not come out — only the birth star derived from
 * it. That is deliberate. A child's full name beside their exact date of birth
 * is the most useful identity pair there is, and a certificate is a permanent
 * document; the star is a roughly thirteen-day window and carries the meaning
 * families actually care about.
 */
export interface CertificateData {
  name: string;
  devanagari: string;
  scripts: Array<{ name: string; text: string }>;
  /** Two or three sentences. Never empty. */
  prose: string;
  root: number;
  compound: number;
  planet: { name: string; glyph: string } | null;
  /** "Kav·ya" */
  saidAs: string;
  syllables: number;
  /** At most two, may be empty. */
  shortForms: string[];
  birthStar: { nakshatra: string; symbol: string; rashi: string } | null;
  issuedAt: Date;
}

export async function buildCertificateData(input: {
  name: string;
  /** Optional. Used to compute the star, then discarded — never returned. */
  birthDate?: string;
  issuedAt?: Date;
}): Promise<CertificateData> {
  const name = input.name.trim();
  const letters = name.replace(/[^A-Za-z]/g, "") || name;
  const lower = letters.toLowerCase();

  const num = chaldean(letters) as { root: number; compound: number; planet?: { name: string; glyph: string } };
  const offline = nameInAllScripts(name) as {
    devanagari: string;
    scripts: Array<{ code: string; name: string; text: string }>;
  };
  const pron = scanPronunciation(letters).detail as { pretty?: string; syllables?: number };
  const nick = scanNicknames(name).detail as { nicknames?: string[] };

  /*
   * What may reach the certificate, in order of authority.
   *
   * Only GOOD meanings, always. The unfortunate ones were the entire point of
   * the report the parent already read; repeating them on a naming-day keepsake
   * would be cruel and pointless, because the decision has been made by the
   * time this page exists.
   *
   * 1. Our sourced dictionary — a meaning with a citation behind it.
   * 2. The landmine dictionary's good entries — hand-verified.
   * 3. Gemini, but ONLY where at least two languages independently return a
   *    good meaning.
   *
   * That third rule replaces "verified entries only", which was the original
   * design and which running it proved unusable: the sourced dictionary holds a
   * handful of names and the landmine data carries good meanings in only two of
   * seven languages, so a real Sanskrit name like Kavya was being printed as
   * "a made name that belongs to no dictionary". Wrong, on a certificate, is
   * worse than cautious.
   *
   * Cross-language agreement is a genuine test rather than a shrug. A name that
   * is really a word reads the same across related languages — Kavya returns
   * poetry in ten. An invented one returns nothing at all: the invented names
   * Zerofluke and Blorptrix were checked against this model and came back empty
   * in every language. One lone language is the shape a hallucination takes, so
   * one is not enough.
   */
  const sourced = await lookupMeaning(name);
  const fromDictionary = Object.entries(LANDMINES).flatMap(([language, entries]) =>
    entries
      .filter(
        (e) =>
          e.sentiment === "good" &&
          (e.whole ? lower === e.pattern.toLowerCase() : lower.includes(e.pattern.toLowerCase())),
      )
      .map((e) => ({ language, meaning: e.meaning, sentiment: "good" as const })),
  );

  let verified: Array<{ language: string; meaning: string; sentiment: "good" | "neutral" | "bad" }> = [
    ...(sourced?.meaning
      ? [{ language: sourced.origin ?? "Sanskrit", meaning: sourced.meaning, sentiment: "good" as const }]
      : []),
    ...fromDictionary,
  ];

  if (verified.length === 0) {
    const ai = (await geminiReadings(letters)).filter((r) => r.sentiment === "good");
    if (ai.length >= 2) verified = ai;
  }

  let birthStar: CertificateData["birthStar"] = null;
  if (input.birthDate) {
    const d = scanRashi(name, input.birthDate).detail as {
      fromBirthChart?: boolean;
      nakshatra?: string;
      symbol?: string;
      rashi?: string;
    };
    if (d.fromBirthChart && d.nakshatra && d.rashi) {
      birthStar = { nakshatra: d.nakshatra, symbol: d.symbol ?? "", rashi: d.rashi };
    }
  }

  return {
    name,
    devanagari: offline.devanagari,
    scripts: offline.scripts.map((s) => ({ name: s.name, text: s.text })),
    prose: await certificateProse(name, verified),
    root: num.root,
    compound: num.compound,
    planet: num.planet ?? null,
    saidAs: (pron.pretty ?? name).replace(/-/g, "·"),
    syllables: pron.syllables ?? 0,
    shortForms: (nick.nicknames ?? []).slice(0, 2),
    birthStar,
    issuedAt: input.issuedAt ?? new Date(),
  };
}
