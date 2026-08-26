import type { NameMeaning } from "./meanings.js";

/**
 * Offline verified meanings — keyed by lowercase name.
 *
 * Every entry carries the source a customer could check themselves. Entries
 * for the pilot corpus are verified against that source by the 4 Aug 2026
 * research pass; the in-house seed entries below predate it and are credited
 * as in-house.
 *
 * RULE: no entry without a source. An empty dataset is better than a wrong one.
 */
export const VERIFIED_MEANINGS: Record<string, NameMeaning> = {
  // In-house seed (Sanskrit terms not commonly in Wiktionary as names)
  vyana: { meaning: "one of the five vital airs (prāṇas) in Ayurveda, governing circulation", origin: "Sanskrit", source: "in-house Sanskrit reference" },
  agni: { meaning: "fire; the digestive principle", origin: "Sanskrit", source: "in-house Sanskrit reference" },
  atma: { meaning: "self, soul", origin: "Sanskrit", source: "in-house Sanskrit reference" },
  deva: { meaning: "deity, divinity", origin: "Sanskrit", source: "in-house Sanskrit reference" },
};
