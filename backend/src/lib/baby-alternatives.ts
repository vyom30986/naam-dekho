/**
 * Five more names for a parent — suggested by us, or brought by them.
 *
 * WHY THIS IS NOT lib/alternatives.ts
 * -----------------------------------
 * That module generates BRAND names. Its fallback generator appends "labs",
 * "kart", "verse" and prepends "get", "go", "try"; its verification is domain
 * availability and social handles. Pointed at a baby name it proposes
 * "Aaravkart" and "getAarav", and then grades them on whether the .in is free.
 * None of that is a thing to put in front of a parent, so baby mode gets its
 * own path rather than a mode flag on that one.
 *
 * WHAT A SUGGESTION HAS TO EARN
 * -----------------------------
 * A name we suggest is a name a family may actually use, so it is verified
 * before it is shown, not after:
 *
 *   - it is run through the same landmine dictionary as the searched name, and
 *     anything with an unfortunate meaning in any of the seven languages is
 *     dropped outright rather than shown with a warning;
 *   - its meaning is the one our own checks confirm, never a meaning the model
 *     asserted while proposing it — a generator that both invents a name and
 *     tells you what it means will happily invent both;
 *   - its numerology and its birth-star syllable are computed by the same
 *     engines that produced the reading on screen, so the numbers agree.
 *
 * The parent's own names are never re-ordered. That list is their preference;
 * sorting it by our score would quietly overrule the choice they walked in with.
 */
import { chaldean } from "./numerology.js";
import { normaliseName } from "./normalise.js";
import { logger } from "../logger.js";
import { withCache } from "../cache/redis.js";
import { isGeminiConfigured, postGemini } from "./gemini.js";
import { scanLinguistic, scanPronunciation } from "../scanners/linguistic.js";
import type { TileResult } from "./types.js";

const MODEL = "gemini-flash-lite-latest";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const TIMEOUT_MS = 8_000;
/** Suggestions for the same star and spirit are stable; a week is plenty. */
const CACHE_TTL = 7 * 24 * 3600;

/** A parent may bring up to five names of their own. */
export const MAX_OWN_NAMES = 5;

export interface BabyShortlistInput {
  /** The name they searched for — the suggestions keep its spirit. */
  name: string;
  /** Optional, and never required: "boy" | "girl" | "unisex". */
  gender?: string;
  /** Starting syllables the birth star traditionally favours, if a date was given. */
  syllables?: string[];
  nakshatra?: string;
  rashi?: string;
  /** Chaldean root of the searched name, so suggestions can echo it. */
  root?: number;
  /** For the harmony line, when the family already has a child. */
  siblingName?: string;
}

export interface BabySuggestion {
  name: string;
  /** What our own checks confirm it means — null when nothing is confirmed. */
  meaning: string | null;
  /** Which of the star's syllables it begins with, if any. */
  startsWith: string | null;
  /** Its own Chaldean root, and the planet that rules it. */
  root: number;
  planet: { name: string; glyph: string } | null;
  /** How the name breaks into syllables — the same split the search shows. */
  saidAs: string | null;
  syllables: number | null;
  /** Languages we confirmed a meaning in. Evidence, not decoration. */
  confirmedIn: string[];
  /**
   * Why this name is on the list: it shares the searched name’s first letter,
   * its meaning is close to it, or it carries the birth star’s syllable. Shown
   * to the parent, because a shortlist that cannot say why is just a list.
   */
  because?: "letter" | "meaning" | "star";
}

export interface BabyShortlistResponse {
  /** "ours" = we suggested them; "yours" = the parent brought them. */
  source: "ours" | "yours";
  suggestions: BabySuggestion[];
  /** Names we could not offer, each with the reason. Never silently dropped. */
  rejected: Array<{ name: string; reason: string }>;
  /** Plain sentence naming exactly what we checked, for the page to print. */
  checkedDepth: string;
}

const CHECK_DEPTH =
  "meaning across ten Indian scripts, the seven-language landmine dictionary, " +
  "pronunciation, Chaldean numerology and the birth-star syllable";

/* ────────────────────────────────────────────────────────────────
 * Verification — the part that decides whether a name may be shown
 * ──────────────────────────────────────────────────────────────── */

/**
 * Runs a candidate through the in-house baby checks.
 *
 * Deliberately NOT the social-handle probes. Those are bot-walled, slow, and
 * answer a question about a person who does not exist yet; running fifteen of
 * them to decorate a suggestion list would cost seconds and tell a parent
 * nothing they can act on. The searched name still gets them — this is a
 * shortlist, and it is honest about what it checked.
 */
async function verify(
  candidate: string,
  input: BabyShortlistInput,
): Promise<{ ok: true; suggestion: BabySuggestion } | { ok: false; reason: string }> {
  let n: ReturnType<typeof normaliseName>;
  try {
    n = normaliseName(candidate);
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }

  let tiles: TileResult[];
  try {
    // No breakdown for a candidate — one Gemini call each, not two.
    tiles = await scanLinguistic(n.letters, "baby", candidate, false);
  } catch (err) {
    logger.warn({ err: (err as Error).message, candidate }, "shortlist verification failed");
    return { ok: false, reason: "we could not check this name just now" };
  }

  const land = tiles.find((t) => t.tileId === "lin-land");
  const rows =
    ((land?.detail as { languages?: Array<{ language: string; grade: string; meaning: string | null; meaningSource: string | null }> })
      ?.languages) ?? [];

  // The one absolute rule. A name that means something unfortunate anywhere we
  // read does not get offered to a parent with a caveat attached — it does not
  // get offered.
  const bad = rows.find((r) => r.grade === "bad");
  if (bad) {
    return { ok: false, reason: `means something unfortunate in ${bad.language}` };
  }

  const withMeaning = rows.filter((r) => r.meaning);
  const meaning = withMeaning[0]?.meaning ?? null;

  const num = chaldean(n.letters);
  const syllables = (input.syllables ?? []).map((s) => s.toLowerCase());
  const lower = n.letters.toLowerCase();
  // Longest match first, so "chha" wins over "cha" rather than either winning
  // by whichever happened to be earlier in the table.
  const startsWith =
    [...syllables].sort((a, b) => b.length - a.length).find((s) => lower.startsWith(s)) ?? null;

  const pron = scanPronunciation(n.letters);
  const spoken = pron.detail as { pretty?: string; syllables?: number };

  return {
    ok: true,
    suggestion: {
      name: n.capitalised,
      meaning,
      startsWith,
      root: num.root,
      planet: num.planet ?? null,
      saidAs: spoken?.pretty ?? null,
      syllables: spoken?.syllables ?? null,
      confirmedIn: withMeaning.map((r) => r.language),
    },
  };
}

/* ────────────────────────────────────────────────────────────────
 * Their names
 * ──────────────────────────────────────────────────────────────── */

/**
 * Check the five names the parent already had in mind.
 *
 * Fewer than five is fine — someone with two names gets two checked and two on
 * the certificate, not two padded out with our inventions. And unlike our own
 * suggestions, a name of theirs that carries an unfortunate meaning is still
 * REPORTED, with the reason: they are entitled to know that about a name they
 * chose. We only decline to invent such a name ourselves.
 */
export async function verifyOwnBabyNames(
  names: string[],
  input: BabyShortlistInput,
): Promise<BabyShortlistResponse> {
  const seen = new Set<string>();
  const accepted: string[] = [];
  const rejected: BabyShortlistResponse["rejected"] = [];

  for (const raw of names.slice(0, MAX_OWN_NAMES)) {
    const trimmed = (raw ?? "").trim();
    if (!trimmed) continue; // an empty box is a name they chose not to give
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      rejected.push({ name: trimmed, reason: "you entered this one twice" });
      continue;
    }
    seen.add(key);
    accepted.push(trimmed);
  }

  const results = await Promise.all(accepted.map((c) => verify(c, input)));

  const suggestions: BabySuggestion[] = [];
  results.forEach((r, i) => {
    if (r.ok) suggestions.push(r.suggestion);
    else rejected.push({ name: accepted[i], reason: r.reason });
  });

  return { source: "yours", suggestions, rejected, checkedDepth: CHECK_DEPTH };
}

/* ────────────────────────────────────────────────────────────────
 * Our names
 * ──────────────────────────────────────────────────────────────── */

/*
 * How the five are chosen.
 *
 * Founder's rule, 22 Aug 2026: at least two of the five must begin with the
 * same letter as the name the family searched, and at least two more must be
 * chosen because their MEANING is close to it — those two need not begin with
 * any particular letter. The remainder follows the birth star as before.
 *
 * The quota is enforced here, after verification, rather than asked for in the
 * prompt. A single prompt saying "make two of them start with A" produces
 * names that mostly do not: the model optimises for plausible names, not for
 * arithmetic. So each rule gets its own request, each pool is verified
 * separately, and the five are assembled to the quota from what survives.
 */
type Brief = "letter" | "meaning" | "star";

function sharedRules(name: string): string {
  return (
    "Rules: real names in actual use in India, not invented ones. Do not repeat \"" +
    name +
    "\" itself. Latin script, one word, 3 to 15 letters, no titles, no surnames, " +
    "no punctuation. Do not give meanings — we verify those ourselves. Return names only."
  );
}

function candidatePrompt(input: BabyShortlistInput, brief: Brief, meaning: string | null): string {
  const lines: string[] = [];
  const letter = (input.name.trim()[0] ?? "").toUpperCase();
  const who =
    input.gender && input.gender !== "unisex" ? " The child is a " + input.gender + "." : "";

  if (brief === "letter") {
    lines.push(
      "Suggest 8 Indian given names for a baby, every one of them beginning with the " +
        "letter \"" + letter + "\" — the same letter as \"" + input.name + "\"." + who,
    );
  } else if (brief === "meaning") {
    lines.push(
      "Suggest 8 Indian given names for a baby whose meaning is close to this: \"" +
        (meaning ?? "the same sense as " + input.name) + "\"." + who,
    );
    lines.push(
      "They may begin with ANY letter — the meaning is what matters here, not the spelling.",
    );
  } else {
    lines.push("Suggest 8 Indian given names for a baby, in the same spirit as \"" + input.name + "\"." + who);
    if (input.syllables?.length) {
      lines.push(
        "The family is following the birth star" +
          (input.nakshatra ? " " + input.nakshatra : "") +
          ", so names beginning with these syllables are strongly preferred: " +
          input.syllables.join(", ") + ".",
      );
    }
  }

  if (input.root) {
    lines.push(
      "The searched name has the Chaldean root " + input.root +
        "; names of a similar length and rhythm sit well beside it.",
    );
  }
  if (input.siblingName) {
    lines.push("There is already a sibling called " + input.siblingName + " — the two names should sound well together.");
  }
  lines.push(sharedRules(input.name));
  return lines.join("\n");
}

/** Ask Gemini for one pool. Returns [] when unconfigured or unavailable. */
async function candidates(
  input: BabyShortlistInput,
  brief: Brief,
  meaning: string | null,
): Promise<string[]> {
  if (process.env.VITEST || !isGeminiConfigured()) return [];
  const key = [
    brief,
    input.name.toLowerCase(),
    input.gender ?? "any",
    (input.syllables ?? []).join("-") || "nostar",
    input.root ?? 0,
  ].join(":");

  try {
    return await withCache<string[]>("cache:baby-shortlist:" + key, CACHE_TTL, async () => {
      const res = await postGemini(
        {
          contents: [{ parts: [{ text: candidatePrompt(input, brief, meaning) }] }],
          generationConfig: {
            temperature: 0.9, // a shortlist of near-identical names is no shortlist
            maxOutputTokens: 400,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: { names: { type: "ARRAY", items: { type: "STRING" } } },
              required: ["names"],
            },
          },
        },
        "baby-shortlist",
      );
      // Thrown, not returned: a rate limit must never be cached as "no names".
      if (!res.ok) throw new Error("gemini_" + res.status);
      const j = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const raw = j.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const parsed = JSON.parse(raw) as { names?: string[] };
      return (parsed.names ?? [])
        .map((s) => s.replace(/[^A-Za-z]/g, ""))
        .filter((s) => s.length >= 3 && s.length <= 15);
    });
  } catch (err) {
    logger.warn({ err: (err as Error).message, brief }, "baby shortlist pool unavailable");
    return [];
  }
}

/** Verify a pool until `want` names pass, in small waves. */
async function harvest(
  pool: string[],
  input: BabyShortlistInput,
  want: number,
  seen: Set<string>,
  rejected: BabyShortlistResponse["rejected"],
  because: BabySuggestion["because"],
): Promise<BabySuggestion[]> {
  const out: BabySuggestion[] = [];
  const fresh = pool.filter((c) => !seen.has(c.toLowerCase()));
  const WAVE = 3;
  for (let i = 0; i < fresh.length && out.length < want; i += WAVE) {
    const wave = fresh.slice(i, i + WAVE);
    const results = await Promise.all(wave.map((c) => verify(c, input)));
    results.forEach((r, j) => {
      seen.add(wave[j].toLowerCase());
      if (r.ok) out.push({ ...r.suggestion, because });
      else if (r.reason.startsWith("means something")) rejected.push({ name: wave[j], reason: r.reason });
    });
  }
  return out.slice(0, want);
}

/**
 * Suggest five names.
 *
 * Returns fewer than five rather than padding: if only three survive, three is
 * the honest answer. There is no offline fallback generator on purpose — an
 * in-house one could only produce respellings of the name they already have,
 * and a parent can do that themselves without paying us.
 */
export async function suggestBabyNames(input: BabyShortlistInput): Promise<BabyShortlistResponse> {
  const original = input.name.trim().toLowerCase();
  const letter = original[0] ?? "";
  const rejected: BabyShortlistResponse["rejected"] = [];
  const seen = new Set<string>([original]);

  /*
   * What the searched name means, so the meaning pool has something to be
   * close TO. Verifying the original costs nothing new — the scan just read it,
   * so the answer is already in the cache.
   */
  const self = await verify(input.name, input);
  const ownMeaning = self.ok ? self.suggestion.meaning : null;

  const [letterPool, meaningPool, starPool] = await Promise.all([
    candidates(input, "letter", null),
    candidates(input, "meaning", ownMeaning),
    candidates(input, "star", null),
  ]);

  // Only names that actually start with the letter count towards that quota —
  // asking is not the same as getting.
  const letterOnly = letterPool.filter((c) => c.toLowerCase().startsWith(letter));

  const byLetter = await harvest(letterOnly, input, 2, seen, rejected, "letter");
  const byMeaning = await harvest(meaningPool, input, 2, seen, rejected, "meaning");

  const chosen = [...byLetter, ...byMeaning];
  if (chosen.length < 5) {
    const rest = await harvest(starPool, input, 5 - chosen.length, seen, rejected, "star");
    chosen.push(...rest);
  }
  /*
   * Short of five only when a pool came back empty or nothing in it survived.
   * Backfill from whichever pools are left rather than hand back three names
   * for a document that says five.
   */
  if (chosen.length < 5) {
    const spare = await harvest(
      [...letterPool, ...meaningPool, ...starPool],
      input,
      5 - chosen.length,
      seen,
      rejected,
      "star",
    );
    chosen.push(...spare);
  }

  return {
    source: "ours",
    suggestions: chosen.slice(0, 5),
    // Only rejections that say something useful about a name; a long list of
    // names the parent never saw being turned down is noise.
    rejected: rejected.slice(0, 3),
    checkedDepth: CHECK_DEPTH,
  };
}
