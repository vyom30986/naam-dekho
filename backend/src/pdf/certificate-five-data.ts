/**
 * Everything the two-page shortlist certificate prints.
 *
 * The chosen name is checked here rather than read off the scan, because the
 * name a family finally settles on is often not the one they searched. Where it
 * is the same name, the checks come back from cache and cost nothing.
 *
 * Two rules from the founder govern what comes out of this file, and both are
 * about what the printed sheet may say:
 *
 *   1. Only good meanings appear. A language whose reading is unfortunate is
 *      omitted — not softened, not footnoted, omitted.
 *   2. Nothing is invented to fill a gap. Where we have no confirmed meaning we
 *      print no meaning.
 */
import { chaldean } from "../lib/numerology.js";
import { normaliseName } from "../lib/normalise.js";
import { nameInAllScripts } from "../lib/transliterate.js";
import { scanRashi, scanNicknames } from "../scanners/astro.js";
import { scanPronunciation, scanLinguistic } from "../scanners/linguistic.js";
import { certificateEssay } from "../lib/certificate-essay.js";
import { sandhiVichched } from "../lib/sandhi.js";
import type { GeminiReading } from "../lib/gemini.js";

export interface ConsideredName {
  name: string;
  devanagari: string;
  meaning: string | null;
  /** Which birth-star syllable it begins with, when it does. */
  startsWith: string | null;
  root: number;
  planet: string | null;
}

export interface FiveCertificateData {
  name: string;
  devanagari: string;
  scripts: Array<{ name: string; text: string }>;
  /** The ~150-word passage. */
  essay: string;
  /** The reading every listed language agrees on, when they do agree. */
  agreed: { meaning: string; languages: string[] } | null;
  /** Languages whose reading genuinely differs from the agreed one. */
  differing: Array<{ language: string; script: string; meaning: string }>;
  root: number;
  compound: number;
  planet: { name: string; glyph: string } | null;
  saidAs: string | null;
  syllables: number | null;
  pronScore: number | null;
  pronEase: string | null;
  shortForms: string[];
  birthStar: {
    nakshatra: string;
    symbol: string;
    rashi: string;
    pada: number | null;
    firstAkshar: string | null;
  } | null;
  considered: ConsideredName[];
  issuedAt: Date;
}

export interface FiveCertificateInput {
  /** The name the family finally chose. */
  name: string;
  gender?: string;
  birthDate?: string;
  birthTime?: string;
  /** Given by a pandit, when the family has one. Overrides our derived syllable. */
  firstAkshar?: string;
  /** The names they considered, in THEIR order — never re-sorted. */
  considered: Array<{ name: string; meaning?: string | null; startsWith?: string | null }>;
}

/** Rows the landmine scanner returns, as far as this file cares. */
interface LangRow {
  language: string;
  grade: string;
  meaning: string | null;
}

export async function buildFiveCertificateData(
  input: FiveCertificateInput,
): Promise<FiveCertificateData> {
  const n = normaliseName(input.name);
  const offline = nameInAllScripts(n.letters);
  const num = chaldean(n.letters);

  const [tiles, pron, rashiTile, nickTile] = await Promise.all([
    scanLinguistic(n.letters, "baby", input.name),
    Promise.resolve(scanPronunciation(n.letters)),
    Promise.resolve(scanRashi(input.name, input.birthDate, input.birthTime)),
    Promise.resolve(scanNicknames(input.name)),
  ]);

  const rows =
    ((tiles.find((t) => t.tileId === "lin-land")?.detail as { languages?: LangRow[] })?.languages) ??
    [];

  /*
   * Good meanings only. `grade === "bad"` never reaches the sheet, by the
   * founder's decision of 22 Aug 2026 — the search already reported it, and
   * this document celebrates a name the family has already chosen.
   */
  const usable = rows.filter(
    (r) => r.meaning && r.meaning.trim().length > 0 && r.grade !== "bad" && r.grade !== "unchecked",
  );

  /*
   * Grouping, which is what replaced the per-language table. For a name like
   * Aarav every language returns the same reading, and four rows saying
   * "peaceful" in slightly different words is worse than one line saying it
   * once. Readings are compared on a normalised form so that "peaceful and
   * calm" and "Peaceful and calm." count as the same answer.
   */
  const norm = (s: string) =>
    s.trim().toLowerCase().replace(/[.;,]+/g, " ").replace(/\s+/g, " ").trim();

  /*
   * Two readings count as the same answer when one contains the other:
   * "peaceful", "peaceful and calm" and "peaceful or calm" are one reading in
   * three phrasings, and splitting them reproduced the very repetition the
   * table was cut for — a pull-quote over two languages and a table listing a
   * third that said the same thing.
   */
  const same = (a: string, b: string) => a === b || a.includes(b) || b.includes(a);

  const clusters: Array<{ phrasings: string[]; languages: string[] }> = [];
  for (const r of usable) {
    const k = norm(r.meaning as string);
    const hit = clusters.find((c) => c.phrasings.some((p) => same(p, k)));
    if (hit) {
      hit.phrasings.push(k);
      hit.languages.push(r.language);
    } else {
      clusters.push({ phrasings: [k], languages: [r.language] });
    }
  }

  // The biggest cluster is the shared reading. Its shortest phrasing makes the
  // cleanest pull-quote — "peaceful" reads better on a certificate than
  // "peaceful and calm, a gentle sound".
  const biggest = clusters.reduce<typeof clusters[number] | null>(
    (best, c) => (c.languages.length >= 2 && c.languages.length > (best?.languages.length ?? 1) ? c : best),
    null,
  );
  const agreed: FiveCertificateData["agreed"] = biggest
    ? {
        meaning: [...biggest.phrasings].sort((a, b) => a.length - b.length)[0],
        languages: biggest.languages,
      }
    : null;

  const scriptOf = (language: string) =>
    offline.scripts.find((s) => s.name.toLowerCase().startsWith(language.slice(0, 4).toLowerCase()))
      ?.text ?? offline.devanagari;

  const differing = usable
    .filter((r) => !biggest || !biggest.languages.includes(r.language))
    .map((r) => ({
      language: r.language,
      script: scriptOf(r.language),
      meaning: (r.meaning as string).trim(),
    }));

  /* Take the name apart before writing about it. A name no language
     recognises whole may still divide — Rivaan is रि + वान — and without
     this the certificate called such names invented. */
  const sandhi = await sandhiVichched(n.capitalised);

  const essay = await certificateEssay({
    name: n.capitalised,
    gender: input.gender,
    sandhi,
    readings: usable.map(
      (r): GeminiReading => ({
        language: r.language,
        meaning: r.meaning as string,
        sentiment: "good",
      }),
    ),
  });

  const rd = rashiTile.detail as {
    nakshatra?: string;
    symbol?: string;
    rashi?: string;
    pada?: number;
    suggestedSyllables?: string[];
    matched?: string;
  };
  const pd = pron.detail as {
    pretty?: string;
    syllables?: number;
    score?: number;
    indianEase?: string;
  };

  return {
    name: n.capitalised,
    devanagari: offline.devanagari,
    scripts: offline.scripts.map((s) => ({ name: s.name, text: s.text })),
    essay,
    agreed,
    differing,
    root: num.root,
    compound: num.compound,
    planet: num.planet ?? null,
    saidAs: pd?.pretty ?? null,
    syllables: pd?.syllables ?? null,
    pronScore: pd?.score ?? null,
    pronEase: pd?.indianEase ?? null,
    shortForms: ((nickTile.detail as { nicknames?: string[] })?.nicknames ?? []).slice(0, 3),
    birthStar: rd?.nakshatra
      ? {
          nakshatra: rd.nakshatra,
          symbol: rd.symbol ?? "",
          rashi: rd.rashi ?? "",
          pada: rd.pada ?? null,
          // What the pandit gave wins over what our table derived.
          firstAkshar: input.firstAkshar?.trim() || rd.matched || rd.suggestedSyllables?.[0] || null,
        }
      : null,
    considered: input.considered.slice(0, 5).map((c) => {
      const cn = normaliseName(c.name);
      const cnum = chaldean(cn.letters);
      return {
        name: cn.capitalised,
        devanagari: nameInAllScripts(cn.letters).devanagari,
        meaning: c.meaning?.trim() || null,
        startsWith: c.startsWith ?? null,
        root: cnum.root,
        planet: cnum.planet?.name ?? null,
      };
    }),
    issuedAt: new Date(),
  };
}
