import { normaliseName } from "./normalise.js";
import { scanDomains } from "../scanners/domain.js";
import { scanSocial } from "../scanners/social.js";
import { logger } from "../logger.js";
import type { TileResult } from "./types.js";

/**
 * Auto-generated alternative names (PRD §5.6, paid bonus).
 *
 * Pipeline:
 *   1. Generate ~10 candidate names with a deterministic in-house generator
 *      (prefix, suffix and blend patterns). No model is called here, so this
 *      step costs nothing and cannot fail on a rate limit. The response
 *      reports source "heuristic", so it never overstates where a suggestion
 *      came from.
 *   2. Re-verify each candidate with real checks (domains + social handles).
 *      FR-5.6.3 requires re-verification across all 26 checks; until the
 *      paid scrapers are live we verify across the fast free checks and
 *      note the depth in the response (see STUBBED.md).
 *   3. Return the top 5 candidates with zero conflicts (or fewest conflicts
 *      if fewer than 5 are fully clear).
 */

export interface AlternativeResult {
  name: string;
  clear: number;
  conflicts: number;
  pending: number;
  highlights: string[]; // human-readable per-check summaries
}

export interface AlternativesResponse {
  /** "your-own" = the customer supplied the names; we only verified them. */
  source: "heuristic" | "your-own";
  checkedDepth: string;
  alternatives: AlternativeResult[];
  /** How many names the customer asked us to check, when they brought their own. */
  requested?: number;
  /** Names we could not accept, each with a reason — never silently dropped. */
  rejected?: Array<{ input: string; reason: string }>;
}

/** A customer may shortlist up to five names of their own. */
export const MAX_OWN_NAMES = 5;

const SUFFIXES = ["ly", "io", "hq", "labs", "works", "verse", "kart", "desk", "gen", "wave"];
const PREFIXES = ["get", "go", "try", "my", "the"];

function heuristicCandidates(base: string): string[] {
  const stem = base.toLowerCase().replace(/[^a-z]/g, "");
  const out = new Set<string>();
  for (const s of SUFFIXES) out.add(stem + s);
  for (const p of PREFIXES) out.add(p + stem);
  // vowel-doubling / trimming variants
  out.add(stem.replace(/a/, "aa"));
  out.add(stem.endsWith("a") ? stem.slice(0, -1) + "o" : stem + "a");
  out.delete(stem);
  return [...out].slice(0, 12);
}

function countByStatus(tiles: TileResult[]) {
  let clear = 0, conflicts = 0, pending = 0;
  const highlights: string[] = [];
  for (const t of tiles) {
    if (t.status === "ok") clear += 1;
    else if (t.status === "no" || t.status === "warn") {
      conflicts += 1;
      highlights.push(t.summary);
    } else pending += 1;
  }
  return { clear, conflicts, pending, highlights };
}

/** Run the real domain + social checks against one candidate name. */
async function verifyCandidate(candidate: string): Promise<AlternativeResult | null> {
  try {
    const n = normaliseName(candidate);
    const [domains, social] = await Promise.all([
      scanDomains(n.alnumLower),
      scanSocial(n.alnumLower),
    ]);
    const { clear, conflicts, pending, highlights } = countByStatus([...domains, ...social]);
    return { name: n.capitalised, clear, conflicts, pending, highlights };
  } catch {
    return null;
  }
}

const CHECK_DEPTH = "domains + social handles (full 26-check verification once paid scrapers are live)";

/**
 * Verify names the CUSTOMER has already shortlisted.
 *
 * Their order is preserved deliberately — this is their preference list, and
 * re-sorting it by our score would quietly overrule the choice they came in
 * with. We report what each name costs them; the ranking is theirs to make.
 *
 * Fewer than five is fine. Someone with two names in mind gets two checked
 * and two on the certificate, not five padded out with our inventions.
 */
export async function verifyOwnNames(names: string[]): Promise<AlternativesResponse> {
  const rejected: Array<{ input: string; reason: string }> = [];
  const accepted: string[] = [];

  for (const raw of names.slice(0, MAX_OWN_NAMES)) {
    const trimmed = (raw ?? "").trim();
    if (!trimmed) continue; // an empty box is simply a name they chose not to give
    try {
      normaliseName(trimmed); // reuses the same validation the main search uses
      if (accepted.some((a) => a.toLowerCase() === trimmed.toLowerCase())) {
        rejected.push({ input: trimmed, reason: "duplicate of another name you entered" });
        continue;
      }
      accepted.push(trimmed);
    } catch (err) {
      rejected.push({ input: trimmed, reason: (err as Error).message });
    }
  }

  const verified = await Promise.all(accepted.map(verifyCandidate));

  return {
    source: "your-own",
    checkedDepth: CHECK_DEPTH,
    requested: accepted.length,
    alternatives: verified.filter((v): v is AlternativeResult => v !== null),
    ...(rejected.length ? { rejected } : {}),
  };
}

/** Generate candidates ourselves, then verify them. */
export async function generateAlternatives(
  originalName: string,
  industry: string | undefined,
  conflictReasons: string[],
): Promise<AlternativesResponse> {
  /*
   * Alternatives come from the in-house heuristic, and only from it.
   *
   * There used to be a paid model API in front of this, with the heuristic as
   * its fallback. Its key was never set, so the fallback was the only path that
   * ever ran. The integration was removed on 26 Aug 2026 rather than left in
   * place as a dormant bill waiting for somebody to add a key.
   */
  const candidates = heuristicCandidates(originalName);
  const source = "heuristic" as const;

  // Re-verify every candidate with real checks, in parallel
  const verified = await Promise.all(candidates.map(verifyCandidate));

  // These are OUR suggestions, so ranking them by fewest conflicts is the
  // useful thing to do — unlike the customer's own list, which we leave alone.
  const ranked = verified
    .filter((v): v is AlternativeResult => v !== null)
    .sort((a, b) => a.conflicts - b.conflicts || b.clear - a.clear)
    .slice(0, 5);

  return { source, checkedDepth: CHECK_DEPTH, alternatives: ranked };
}
