import type { TileResult, TileStatus } from "../lib/types.js";
import { chaldean, isIndustryFavourable } from "../lib/numerology.js";
import { nameInAllScripts } from "../lib/transliterate.js";
import { transliterateAll } from "../lib/bhashini.js";
import { lookupMeaning } from "../lib/meanings.js";
import { LANDMINES, type Sentiment } from "../lib/landmines-data.js";
import { nameReadings, isGeminiConfigured } from "../lib/gemini.js";
import type { NameBreakdown } from "../lib/gemini.js";
import { sandhiVichched } from "../lib/sandhi.js";

/**
 * Linguistic scanners — 4 checks of the 26-check portfolio:
 *   lin-mean  Meaning across 10 Indian languages   (Bhashini when key set;
 *             in-house transliteration + seed dictionary otherwise)
 *   lin-land  Landmine dictionary (7 languages)     (curated in-house data)
 *   lin-pron  Pronunciation ease score              (in-house heuristics)
 *   lin-num   Chaldean numerology                   (in-house engine)
 */

/**
 * Landmine rules, compiled once from the verified dictionary in
 * lib/landmines-data.ts. Patterns are matched as plain substrings on the
 * lowercased name — deliberately not regex, so a data entry can never become
 * an accidental wildcard that flags every name in the country.
 */
const LANG_LANDMINES: Record<
  string,
  Array<{ pattern: string; whole: boolean; sentiment: Sentiment; note: string }>
> = Object.fromEntries(
  Object.entries(LANDMINES).map(([lang, list]) => [
    lang,
    list.map((l) => ({
      pattern: l.pattern.toLowerCase(),
      whole: l.whole,
      sentiment: l.sentiment,
      note: l.meaning,
    })),
  ]),
);

/** Seed meaning dictionary — replaced by Bhashini lookups when the key is set. */
export async function scanLinguistic(
  letters: string,
  _mode: "business" | "baby",
  /** The name as the customer typed it, spaces intact. Without this a two-word
   *  name arrives here already concatenated and matches nothing. */
  rawName?: string,
  /** Off for shortlist candidates: the breakdown is a second Gemini call per
   *  name, and a shortlist verifies up to a dozen. It doubled the request
   *  count and pushed a free-tier key straight into 429s. */
  withBreakdown = true,
): Promise<TileResult[]> {
  const results: TileResult[] = [];

  // ── lin-mean — meaning + the name written across the Indian scripts ──
  // Our offline engine always runs (no key, no network, no cost). Bhashini,
  // when the Government credentials are configured, replaces it with the
  // higher-accuracy model output. Either way the source is credited honestly.
  // The meaning comes from the verified dataset or a cited Wiktionary lookup;
  // when neither knows, the tile says so rather than inventing one.
  const [meaningFound, offline, viaBhashini] = await Promise.all([
    lookupMeaning(letters),
    Promise.resolve(nameInAllScripts(letters)),
    transliterateAll(letters),
  ]);

  const scripts = viaBhashini ?? offline.scripts;
  const usedBhashini = viaBhashini !== null;
  results.push({
    tileId: "lin-mean",
    category: "linguistic",
    status: "ok",
    // The scripts themselves are rendered as a grid by the tile, so the
    // summary stays a one-liner rather than repeating them.
    summary: meaningFound
      ? `“${meaningFound.meaning}”${meaningFound.origin ? ` (${meaningFound.origin})` : ""} — written across ${scripts.length} Indian scripts:`
      : `No verified meaning on record — written across ${scripts.length} Indian scripts:`,
    detail: {
      devanagari: offline.devanagari,
      transliterations: scripts,
      meaning: meaningFound, // null when unknown — the honest answer
      languagesCovered: scripts.length,
      note: usedBhashini
        ? "Transliteration from Bhashini, the Government of India language platform."
        : "Transliteration by our in-house engine — Devanagari first, then converted to each script.",
    },
    source: meaningFound?.source
      ? `${usedBhashini ? "bhashini.gov.in" : "internal://lingo"} + ${meaningFound.source}`
      : usedBhashini ? "bhashini.gov.in" : "internal://lingo",
  });

  // ── lin-land — landmine dictionary across 7 languages ────────
  const lower = letters.toLowerCase();
  const hits: Array<{ language: string; note: string; pill: TileStatus }> = [];
  // Gemini runs BEFORE the rows are built, so its readings can sit inside them
  // rather than in a separate block underneath (founder decision, 6 Aug 2026).
  // The question this tile answers is "what does this name mean in each of
  // these languages" — a row that only says "nothing matched our bad-words
  // list" answers something narrower than what a parent is actually asking,
  // and it buries a bad meaning we do know about in a second section.
  //
  // It runs in BOTH modes. It used to be baby-only, on the reasoning that
  // someone naming a company does not care what the word means in Malayalam.
  // Wrong twice over: a brand sold across India is read in every one of these
  // languages, and the founder is usually the one person who has not thought
  // about it. 1.5–3s against a 6s budget, alongside the domain and social
  // checks, so it costs no visible time.
  const [aiReadings, breakdown] = await Promise.all([
    nameReadings(rawName ?? letters),
    // Divyom is Divya + Vyom. Shown whether or not the whole name reads on
    // its own, because the parts are what a family actually repeats.
    withBreakdown ? sandhiBreakdown(rawName ?? letters) : Promise.resolve(null),
  ]);
  const aiByLanguage = new Map(aiReadings.map((r) => [r.language, r]));

  // Per-language rows, not just the hits. A customer asked to trust a
  // "clear" verdict deserves to see WHICH languages were checked and how
  // thoroughly — and where a language has no dictionary yet, it must say so
  // rather than be silently counted as clear.
  const perLanguage = Object.entries(LANG_LANDMINES).map(([language, rules]) => {
    // A "whole" rule must BE the name; otherwise it may sit inside one.
    // Without this, Tarachand would be reported as meaning "star".
    const matches = rules.filter((r) => (r.whole ? lower === r.pattern : lower.includes(r.pattern)));
    // An unfortunate meaning always outranks a pleasant one — if a name is
    // lovely in one sense and crude in another, the crude one is the news.
    const bad = matches.find((m) => m.sentiment === "bad");
    const good = matches.find((m) => m.sentiment === "good");
    const neutral = matches.find((m) => m.sentiment === "neutral");
    const hit = bad ?? good ?? neutral ?? null;

    if (bad) hits.push({ language, note: bad.note, pill: "no" });

    // Our hand-verified dictionary always wins. Gemini only fills the silence —
    // and where it does, the row is tagged, because an unverified reading must
    // never wear the same badge as one a person checked.
    const ai = hit ? null : (aiByLanguage.get(language) ?? null);

    const grade: "bad" | "good" | "neutral" | "clear" | "unchecked" = bad
      ? "bad"
      : good
        ? "good"
        : neutral
          ? "neutral"
          : ai
            ? ai.sentiment === "bad"
              ? "bad"
              : ai.sentiment === "good"
                ? "good"
                : "neutral"
            : rules.length > 0
              ? "clear"
              : "unchecked";

    /** What the name MEANS in this language — null when it means nothing. */
    const meaning = hit?.note ?? ai?.meaning ?? null;

    return {
      language,
      checked: rules.length > 0,
      patterns: rules.length,
      grade,
      meaning,
      /** So the page can badge the row honestly. */
      meaningSource: hit ? ("dictionary" as const) : ai ? ("ai" as const) : null,
      verdict:
        meaning ??
        (rules.length > 0
          ? // Deliberately NOT "no meaning in this language". Our dictionary
            // proves nothing unfortunate matched; it does not prove the name
            // is meaningless. Claiming the stronger thing would be wrong the
            // first time a language we got no reading for turns out to have
            // a perfectly good word for it.
            "Nothing unfortunate — no meaning we could confirm here"
          : "No dictionary for this language yet"),
      // Kept for the older tile renderer.
      pill: bad ? "no" : rules.length > 0 ? "ok" : "info",
    };
  });

  // The four languages we never hand-built a dictionary for — Kannada,
  // Malayalam, Odia, Assamese — have no row of their own above, so their
  // readings still appear in a section underneath.
  const sevenLanguages = new Set(Object.keys(LANG_LANDMINES));
  const aiOnly = aiReadings.filter((r) => !sevenLanguages.has(r.language));

  const covered = perLanguage.filter((l) => l.checked);
  // An AI-flagged bad meaning warns but never hard-fails: it has not been
  // through the verification the dictionary entries have. Counted wherever it
  // appears now — inside one of the seven rows, or in the extra languages.
  const aiBad =
    aiOnly.some((r) => r.sentiment === "bad") ||
    perLanguage.some((l) => l.meaningSource === "ai" && l.grade === "bad");
  const worst: TileStatus = hits.some((h) => h.pill === "no") ? "no" : hits.length > 0 || aiBad ? "warn" : "ok";
  results.push({
    tileId: "lin-land",
    category: "linguistic",
    status: worst,
    summary:
      hits.length > 0
        ? `Unfortunate in ${hits.map((h) => h.language).join(", ")} — see below`
        : // The headline only claims a good meaning where OUR dictionary says
          // so. An AI reading still shows in its row, badged — it just does not
          // get to write the summary line.
          perLanguage.some((l) => l.meaningSource === "dictionary" && l.grade === "good")
          ? `A good meaning in ${perLanguage.filter((l) => l.meaningSource === "dictionary" && l.grade === "good").map((l) => l.language).join(", ")} · nothing unfortunate in ${covered.length} languages checked`
          : `Nothing unfortunate in ${covered.length} of ${perLanguage.length} languages checked`,
    detail: {
      breakdown,
      languages: perLanguage,
      languagesCovered: covered.length,
      languagesTotal: perLanguage.length,
      hits,
      transliteration: offline.devanagari,
      // The four languages with no row of their own, rendered separately.
      aiReadings: aiOnly,
      aiChecked: isGeminiConfigured(),
    },
    source: aiOnly.length > 0 ? "internal://lingo + Gemini" : "internal://lingo",
  });

  return results;
}

export function scanNumerology(letters: string, industry?: string): TileResult {
  const reading = chaldean(letters);

  // With an industry we can say something REAL: the customer's own industry
  // compared against the traditional list for this root. Without one we only
  // describe the number — the old bare "favourable" was an empty claim (every
  // root has a non-empty good list, so it was effectively hardcoded).
  const fit = isIndustryFavourable(reading, industry);
  const base = `Root ${reading.root} (${reading.planet.name})`;
  let status: TileStatus;
  let summary: string;
  if (!industry?.trim()) {
    status = "ok";
    summary = `${base} — traditionally favours ${reading.industryFit.good.slice(0, 2).join(", ")}`;
  } else if (fit === "favourable") {
    status = "ok";
    summary = `${base} — favourable for ${industry.trim()}`;
  } else if (fit === "avoid") {
    status = "warn";
    summary = `${base} — traditionally not favoured for ${industry.trim()}`;
  } else {
    status = "ok";
    summary = `${base} — neutral for ${industry.trim()}`;
  }

  return {
    tileId: "lin-num",
    category: "numerology",
    status,
    summary,
    detail: {
      letters: reading.letters,
      digits: reading.digits,
      compound: reading.compound,
      root: reading.root,
      planet: reading.planet,
      compoundMeaning: reading.compoundMeaning,
      industryFit: reading.industryFit,
      luckyDobSums: reading.luckyDobSums,
      ...(industry?.trim() ? { industry: industry.trim(), industryVerdict: fit } : {}),
    },
    source: "internal://numerology",
  };
}

/**
 * Pronunciation analysis — runs in both Business and Baby modes.
 */
/**
 * Split a romanised name into rough spoken chunks.
 *
 * This is a spelling-based approximation, not phonetics — but showing the
 * split is what makes the syllable count checkable. A bare "5 syllables"
 * asks the reader to take our word for it; "Ai-ka-glo-bal" lets them count.
 */
function syllableSplit(upper: string): string[] {
  const parts: string[] = [];
  let current = "";
  let seenVowel = false;
  for (let i = 0; i < upper.length; i++) {
    const ch = upper[i];
    const isVowel = "AEIOU".includes(ch);
    if (isVowel) {
      // A run of vowels stays in one chunk (AI, EE, OU).
      if (seenVowel && !"AEIOU".includes(upper[i - 1])) {
        parts.push(current);
        current = "";
      }
      current += ch;
      seenVowel = true;
    } else {
      // Consonant after a vowel: it starts the next chunk unless it is the
      // final letter, which stays attached (BAL, not BA-L).
      if (seenVowel && i < upper.length - 1 && "AEIOU".includes(upper[i + 1] ?? "")) {
        parts.push(current);
        current = ch;
        seenVowel = false;
      } else {
        current += ch;
      }
    }
  }
  if (current) parts.push(current);
  return parts.filter(Boolean);
}

/**
 * Consonant runs that are perfectly ordinary in Indian names — they are
 * single conjunct letters in Devanagari, not the pile-up the cluster rule is
 * meant to catch. Without this, Aaradhya and Akshara get flagged as hard to
 * say, which is nonsense to anyone who has said them.
 */
const INDIAN_CONJUNCTS = /DHY|SHR|SHW|CHH|KSH|JNY|GHY|TRY|NDR|MBH|NTH|RTH|SHT|SHV|SWA|THR|PRA|VYA|NYA/;

export function scanPronunciation(letters: string): TileResult {
  const upper = letters.toUpperCase();
  const endsInVowel = /[AEIOU]$/.test(upper);

  const chunks = syllableSplit(upper);
  // Count the chunks we actually SHOW, not raw vowels. "Ai-ka-glo-bal" is
  // four; counting vowels called it five, and a number that disagrees with
  // the split printed beside it is worse than no number.
  const syllables = Math.max(1, chunks.length);

  const rawCluster = upper.match(/[BCDFGHJKLMNPQRSTVWXYZ]{3,}/);
  const cluster = rawCluster && !INDIAN_CONJUNCTS.test(rawCluster[0]) ? rawCluster : null;
  const hasHardCluster = cluster !== null;

  // ── Score out of 10 ────────────────────────────────────────────
  // Start at 10 and deduct for the things that genuinely make a name hard to
  // say or easy to get wrong. Every deduction is returned with its reason, so
  // the number can be argued with rather than simply believed — a bare score
  // with no working is the kind of thing this product exists to replace.
  const deductions: Array<{ reason: string; points: number }> = [];

  if (syllables >= 8) deductions.push({ reason: `${syllables} syllables — almost nobody will say this in full`, points: 5 });
  else if (syllables >= 6) deductions.push({ reason: `${syllables} syllables — most people will shorten it`, points: 3 });
  else if (syllables === 5) deductions.push({ reason: "Five syllables is a mouthful", points: 1.5 });
  else if (syllables === 4) deductions.push({ reason: "Four syllables — fine, but not snappy", points: 0.5 });

  if (hasHardCluster) {
    deductions.push({ reason: `"${cluster![0]}" is a hard run of consonants`, points: 2.5 });
  }

  if (upper.length > 18) deductions.push({ reason: `${upper.length} letters — long to type, easy to misspell`, points: 2.5 });
  else if (upper.length > 12) deductions.push({ reason: `${upper.length} letters is long to type and spell`, points: 1 });

  if (upper.length < 3) deductions.push({ reason: "Very short — easy to mishear across a room", points: 2 });

  if (!endsInVowel) deductions.push({ reason: "Ends on a consonant — slightly harder to call out", points: 0.5 });

  // Vowel pairs an English reader can say more than one way (OU in "Sourav",
  // EA in "Neal"). Capped so a name is not punished repeatedly for one trait.
  const ambiguous = upper.match(/AE|EA|EO|OU|UE|IE|AO/g) ?? [];
  if (ambiguous.length > 0) {
    deductions.push({
      reason: `"${ambiguous[0]}" can be read more than one way`,
      points: Math.min(1.5, ambiguous.length * 0.75),
    });
  }

  const raw = 10 - deductions.reduce((sum, d) => sum + d.points, 0);
  // Half-point steps, not whole. Rounding to integers hid every 0.5 deduction
  // and handed 10/10 to two-thirds of all names — a score that never varies
  // is decoration, not information.
  // Floor of 1: no name is literally unsayable, and 0/10 on someone's chosen
  // name is a judgement we have not earned.
  const score = Math.max(1, Math.min(10, Math.round(raw * 2) / 2));

  const indianEase = !hasHardCluster && syllables <= 4 ? "Easy" : "Medium";
  const westernEase = hasHardCluster ? "Tricky" : endsInVowel ? "Easy" : "Medium";

  // Only the first chunk is capitalised — "Ai-ka-glo-bal" reads as one name;
  // "Ai-Ka-Glo-Bal" reads as four.
  const pretty = chunks
    .map((c, i) => (i === 0 ? c[0] + c.slice(1).toLowerCase() : c.toLowerCase()))
    .join("-");

  // The reasons, in the customer's words — so the score is arguable rather
  // than oracular. Each line says WHY, not just what.
  const factors = [
    {
      label: "Length",
      value: `${syllables} syllable${syllables === 1 ? "" : "s"}`,
      note:
        syllables <= 2 ? "Short and quick to say" :
        syllables <= 4 ? "Comfortable length" :
        "Long — people will shorten it, so pick the short form yourself",
    },
    {
      label: "Consonant clusters",
      value: hasHardCluster ? `"${cluster![0]}" is a hard run` : "None",
      note: hasHardCluster
        ? "Three consonants together trip most speakers, and get misspelled"
        : "Nothing awkward to get the tongue around",
    },
    {
      label: "Ending",
      value: endsInVowel ? "Ends in a vowel" : "Ends in a consonant",
      note: endsInVowel
        ? "Vowel endings carry well across Indian languages and sound warm"
        : "Consonant endings sound firmer, and are slightly harder to call across a room",
    },
    {
      label: "For Indian speakers",
      value: indianEase,
      note: indianEase === "Easy"
        ? "Sits naturally in Indian phonetics"
        : "Takes a moment, but nothing unusual",
    },
    {
      label: "For non-Indian speakers",
      value: westernEase,
      note: westernEase === "Easy"
        ? "Likely to be said correctly on the first try"
        : westernEase === "Medium"
          ? "Expect an occasional stumble at conferences"
          : "Expect it to be mispronounced abroad — worth knowing before you go global",
    },
  ];

  return {
    tileId: "lin-pron",
    category: "pronunciation",
    status: hasHardCluster ? "warn" : "ok",
    summary: `${score}/10 · ${pretty} — ${syllables} syllable${syllables === 1 ? "" : "s"}, ${indianEase.toLowerCase()} on Indian tongues`,
    // No "ipa" field: we do not have a real pronunciation dictionary, and a
    // syllable-split of the spelling is not IPA. Better to omit than to imply.
    detail: {
      score,
      scoreOutOf: 10,
      deductions,
      syllables,
      split: chunks,
      pretty,
      endsInVowel,
      indianEase,
      westernEase,
      factors,
    },
    source: "internal://pron",
  };
}

/**
 * The landmine tile renders a NameBreakdown. Sandhi produces a richer reading
 * than that shape carries, so this is where the two meet.
 *
 * Bridged here rather than inside gemini.ts because sandhi.ts already imports
 * from gemini.ts, and putting it there would close an import cycle.
 *
 * The old splitter asked, of a roman string, "is this a compound? if unsure
 * say NONE" — so it said NONE for Rivaan, and the tile reported a real name as
 * having nothing inside it. This asks in Devanagari, for संधि विच्छेद, and
 * accepts an answer only when every part carries its own meaning.
 */
async function sandhiBreakdown(name: string): Promise<NameBreakdown | null> {
  const r = await sandhiVichched(name);
  if (!r || r.single || r.parts.length < 2) return null;
  return {
    parts: r.parts.map((p) => ({
      text: p.roman || p.devanagari,
      meaning: p.meaning,
      // The rule IS the evidence for this split, so it travels with the part
      // rather than being dropped on the way to the tile.
      languages: r.rule ? [r.rule] : [],
    })),
    combined: r.composed ?? r.parts.map((p) => p.meaning).join(" + "),
  };
}
