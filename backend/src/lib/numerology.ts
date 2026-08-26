/**
 * Chaldean Numerology Engine — the entire algorithm.
 * This is the canonical implementation. Pure function, no I/O.
 */

export const CHALDEAN_MAP: Record<string, number> = (() => {
  const m: Record<string, number> = {};
  const fill = (chars: string, digit: number) => {
    for (const c of chars) m[c] = digit;
  };
  // Note: 9 is intentionally omitted in the Chaldean system, being considered sacred.
  fill("AIJQY", 1);
  fill("BKR", 2);
  fill("CGLS", 3);
  fill("DMT", 4);
  fill("EHNX", 5);
  fill("UVW", 6);
  fill("OZ", 7);
  fill("FP", 8);
  return m;
})();

export const RULING_PLANET: Record<number, { name: string; glyph: string }> = {
  1: { name: "Sun", glyph: "☉" },
  2: { name: "Moon", glyph: "☽" },
  3: { name: "Jupiter", glyph: "♃" },
  4: { name: "Uranus", glyph: "♅" },
  5: { name: "Mercury", glyph: "☿" },
  6: { name: "Venus", glyph: "♀" },
  7: { name: "Neptune", glyph: "♆" },
  8: { name: "Saturn", glyph: "♄" },
  9: { name: "Mars", glyph: "♂" }, // arrives only via certain compound reductions
};

export const COMPOUND_MEANINGS: Record<number, string> = {
  10: "Wheel of Fortune — honour, will-power, success through self-reliance",
  11: "Hidden trials, danger of treachery — caution warranted",
  12: "Sacrifice for others — the victim's number",
  13: "Upheaval, regeneration — power that must be wielded carefully",
  14: "Movement & combinations of people — favourable for media, trade, transit",
  15: "Magical, magnetic — strong in art, business, and the persuasive arts",
  16: "The fated lover — challenges in relationships and unexpected falls",
  17: "Spiritual upliftment, immortality — the star of the Magi",
  18: "Material progress through conflict — caution against treachery",
  19: "The Prince of Heaven — the most fortunate number",
  20: "The Awakening — judgement, calling to action",
  21: "Universe — culmination, success after long effort",
  22: "Good Man Blinded by Folly — caution against credulity",
  23: "Royal Star of the Lion — protection of those highly placed",
  24: "Assistance and association with those of rank — favourable",
  25: "Strength gained through experience — favourable",
  26: "Treachery, deception — caution against trusting others, partnerships that fail",
  27: "Sceptre — reward through productive intellect",
  28: "Trusting Lamb — loss through misplaced trust, must rebuild after loss",
  29: "Uncertainty, deceptions — favoured by women only with caution",
  30: "Thoughtful Deduction — favourable for those who succeed by mental superiority",
  31: "Recluse — fortunate but isolated",
  32: "Magical Power — favourable for combined collective work",
  33: "No special significance — read as 6",
  34: "Read as 7",
};

export const INDUSTRY_FIT: Record<number, { good: string[]; avoid: string[] }> = {
  1: { good: ["Leadership", "Politics", "Entrepreneurship", "Independence brands"], avoid: ["Banking", "Insurance"] },
  2: { good: ["Hospitality", "Diplomacy", "Wellness", "Children's products"], avoid: ["Heavy industry", "Mining"] },
  3: { good: ["Education", "Publishing", "Wisdom-focused brands", "Religious products"], avoid: ["Speculation", "Gambling"] },
  4: { good: ["Construction", "Engineering", "Manufacturing", "Logistics"], avoid: ["Entertainment", "Quick-turnaround retail"] },
  5: { good: ["Media", "SaaS / Tech", "Communication", "Mobility", "Education"], avoid: ["Banking", "Insurance", "Real estate"] },
  6: { good: ["Luxury", "Fashion", "Beauty", "Hospitality", "F&B"], avoid: ["Engineering", "Heavy industry"] },
  7: { good: ["Research", "Spirituality", "Independent consulting", "Esoteric arts"], avoid: ["Mass-market retail", "Politics"] },
  8: { good: ["Banking", "Insurance", "Real estate", "Long-term investment"], avoid: ["Media", "Quick-turn retail"] },
  9: { good: ["Defence", "Sports", "Surgery", "Manufacturing of cutting tools"], avoid: ["Hospitality"] },
};

export const LUCKY_DOB_SUMS: Record<number, number[]> = {
  1: [1, 4, 8],
  2: [2, 7, 9],
  3: [3, 6, 9],
  4: [1, 4, 8],
  5: [1, 3, 5],
  6: [3, 6, 9],
  7: [2, 7, 9],
  8: [4, 8, 1],
  9: [3, 6, 9],
};

export interface ChaldeanReading {
  letters: string[];
  digits: number[];
  compound: number;
  root: number;
  planet: { name: string; glyph: string };
  compoundMeaning: string;
  industryFit: { good: string[]; avoid: string[] };
  luckyDobSums: number[];
}

export function chaldean(name: string): ChaldeanReading {
  const upper = (name ?? "").toUpperCase().replace(/[^A-Z]/g, "");
  const letters = upper.split("");
  const digits = letters.map((c) => CHALDEAN_MAP[c] ?? 0).filter((d) => d > 0);
  const compound = digits.reduce((a, b) => a + b, 0);

  let root = compound;
  while (root > 9) {
    root = root
      .toString()
      .split("")
      .reduce((a, b) => a + Number(b), 0);
  }

  return {
    letters,
    digits,
    compound,
    root,
    planet: RULING_PLANET[root] ?? { name: "Unknown", glyph: "?" },
    compoundMeaning: COMPOUND_MEANINGS[compound] ?? `Compound ${compound} — reduce to root ${root}`,
    industryFit: INDUSTRY_FIT[root] ?? { good: [], avoid: [] },
    luckyDobSums: LUCKY_DOB_SUMS[root] ?? [],
  };
}

/**
 * Favourability of the customer's industry under this root number.
 *
 * Token-based, not substring-based. The old `includes()` check needed the
 * customer's string to contain the vocabulary phrase verbatim — "Fintech"
 * never matched "Banking", and the long entries ("Quick-turnaround retail")
 * could never match anything a human would type. Both sides are now broken
 * into meaningful words, expanded through a small synonym table, and matched
 * on overlap.
 */

// Words too generic to signal an industry on their own.
const GENERIC_TOKENS = new Set([
  "products", "brands", "focused", "mass", "market", "quick", "turnaround",
  "term", "long", "heavy", "industry", "and", "the", "of",
]);

// Customer-word → traditional-vocabulary words. Only mappings we are sure of;
// an unmapped industry is honestly "neutral", never guessed.
const INDUSTRY_SYNONYMS: Record<string, string[]> = {
  fintech: ["banking"],
  edtech: ["education"],
  healthtech: ["wellness"],
  travel: ["hospitality", "mobility"],
  tourism: ["hospitality"],
  restaurants: ["f&b"],
  food: ["f&b"],
  beverage: ["f&b"],
  fitness: ["sports", "wellness"],
  healthcare: ["wellness"],
  security: ["defence"],
  trading: ["speculation"],
  crypto: ["speculation"],
  // NOT mapped to gambling — a game studio is not a casino. "Gambling" only
  // matches when the customer's own words say gambling/betting.
  gaming: ["entertainment"],
  betting: ["gambling"],
  ecommerce: ["retail"],
  commerce: ["retail"],
  software: ["saas", "tech"],
  startup: ["entrepreneurship"],
  ngo: ["politics"],
  religion: ["religious"],
};

function industryTokens(s: string): Set<string> {
  const out = new Set<string>();
  for (const w of s.toLowerCase().split(/[^a-z&]+/)) {
    if (w.length < 3 && w !== "f&b") continue;
    if (GENERIC_TOKENS.has(w)) continue;
    out.add(w);
    for (const syn of INDUSTRY_SYNONYMS[w] ?? []) out.add(syn);
  }
  return out;
}

function tokensOverlap(a: Set<string>, vocabPhrase: string): boolean {
  for (const w of vocabPhrase.toLowerCase().split(/[^a-z&/]+/)) {
    if (w.length < 3 && w !== "f&b") continue;
    if (GENERIC_TOKENS.has(w)) continue;
    if (a.has(w)) return true;
  }
  return false;
}

export function isIndustryFavourable(reading: ChaldeanReading, industry?: string): "favourable" | "neutral" | "avoid" {
  if (!industry?.trim()) return "neutral";
  const t = industryTokens(industry);
  if (reading.industryFit.good.some((g) => tokensOverlap(t, g))) return "favourable";
  if (reading.industryFit.avoid.some((a) => tokensOverlap(t, a))) return "avoid";
  return "neutral";
}
