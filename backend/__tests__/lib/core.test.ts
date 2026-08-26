import { describe, it, expect } from "vitest";
import { chaldean, isIndustryFavourable } from "../../src/lib/numerology.js";
import { scoreScan, isMateriallyIncomplete } from "../../src/lib/scoring.js";
import { normaliseName } from "../../src/lib/normalise.js";
import { devUserUpsert, devSpendTokens, devUserGet } from "../../src/lib/devstack.js";
import { isConfigured, transliterateAll, TARGET_LANGUAGES } from "../../src/lib/bhashini.js";
import { scanLinguistic } from "../../src/scanners/linguistic.js";
import { romanToDevanagari, nameInAllScripts } from "../../src/lib/transliterate.js";
import { amazonTitles, amazonBrandMatches, isAmazonBlocked } from "../../src/lib/scrapingbee.js";
import { isPaidTier } from "../../src/lib/types.js";
import { tokenCost, affords, TOKEN_PACKS, SIGNUP_BONUS_TOKENS, ADDON_COST } from "../../src/lib/tokens.js";
import type { TileResult, ScanTier } from "../../src/lib/types.js";

const tile = (over: Partial<TileResult>): TileResult => ({
  tileId: "t",
  category: "social",
  status: "ok",
  summary: "",
  ...over,
});

describe("chaldean numerology", () => {
  it("computes the documented reading for Vyana (V6+Y1+A1+N5+A1 = 14 → 5, Mercury)", () => {
    const r = chaldean("Vyana");
    expect(r.compound).toBe(14);
    expect(r.root).toBe(5);
    expect(r.planet.name).toBe("Mercury");
  });

  it("is stable for the same input", () => {
    expect(chaldean("Meridian")).toEqual(chaldean("Meridian"));
  });

  it("ignores non-letters", () => {
    expect(chaldean("Vy-ana 1!").compound).toBe(chaldean("Vyana").compound);
  });
});

describe("industry favourability (token matcher)", () => {
  // Vyana → root 5: good [Media, SaaS / Tech, Communication, Mobility,
  // Education], avoid [Banking, Insurance, Real estate]
  const r5 = chaldean("Vyana");

  it("matches the customer's word against the traditional list", () => {
    expect(isIndustryFavourable(r5, "Media & Entertainment")).toBe("favourable");
    expect(isIndustryFavourable(r5, "Insurance")).toBe("avoid");
  });

  it("matches through synonyms — Fintech means Banking, both directions", () => {
    expect(isIndustryFavourable(r5, "Fintech")).toBe("avoid"); // root 5 avoids Banking
    const r8 = chaldean("Rahul"); // R2+A1+H5+U6+L3 = 17 → 8
    expect(r8.root).toBe(8);
    expect(isIndustryFavourable(r8, "Fintech")).toBe("favourable"); // root 8 is good for Banking
  });

  it("matches multi-word vocabulary by meaningful token, not verbatim substring", () => {
    // Nobody types "Quick-turn retail" verbatim; the "retail" token must carry it
    const r8 = chaldean("Rahul");
    expect(isIndustryFavourable(r8, "E-commerce & Retail")).toBe("avoid"); // root 8 avoids quick-turn retail
  });

  it("is honestly neutral for an unknown industry, never guessed", () => {
    expect(isIndustryFavourable(r5, "Agriculture")).toBe("neutral");
    expect(isIndustryFavourable(r5, "")).toBe("neutral");
    expect(isIndustryFavourable(r5, undefined)).toBe("neutral");
  });

  it("does not treat a game studio as a casino", () => {
    // root 3 avoids Gambling; "Gaming" alone must not trigger it
    const r3 = chaldean("Zomato"); // documented root 3
    expect(isIndustryFavourable(r3, "Gaming & Esports")).toBe("neutral");
    expect(isIndustryFavourable(r3, "Betting apps")).toBe("avoid");
  });
});

describe("verdict scoring", () => {
  it("counts clear/conflict/warn/info/pending correctly", () => {
    const v = scoreScan("scn_x", [
      tile({ status: "ok" }),
      tile({ status: "ok" }),
      tile({ status: "no" }),
      tile({ status: "warn" }),
      tile({ status: "info" }),
      tile({ status: "pending" }),
    ], Date.now());
    expect(v.clear).toBe(2);
    expect(v.conflict).toBe(1);
    expect(v.warn).toBe(1);
    expect(v.info).toBe(1);
    expect(v.pending).toBe(1);
  });

  it("punishes a critical legal conflict harder than an ordinary one", () => {
    const base = [tile({ status: "ok" }), tile({ status: "ok" }), tile({ status: "ok" })];
    const ordinary = scoreScan("a", [...base, tile({ status: "no", tileId: "soc-x" })], Date.now());
    const critical = scoreScan("b", [...base, tile({ status: "no", tileId: "leg-mca" })], Date.now());
    expect(critical.score).toBeLessThan(ordinary.score);
  });

  it("flags materially incomplete scans (refund rule)", () => {
    const mostlyPending = [tile({ status: "ok" }), tile({ status: "pending" }), tile({ status: "pending" })];
    expect(isMateriallyIncomplete(mostlyPending)).toBe(true);
    const complete = [tile({ status: "ok" }), tile({ status: "ok" }), tile({ status: "no" })];
    expect(isMateriallyIncomplete(complete)).toBe(false);
  });
});

describe("name normalisation", () => {
  it("produces url-safe and display forms", () => {
    const n = normaliseName("  Naam Dekho!  ");
    expect(n.alnumLower).toBe("naamdekho");
    expect(n.capitalised.startsWith("Naam")).toBe(true);
  });

  // Without an NFC pass these pairs are visually identical but unequal, so two
  // users searching the same name would get different cache keys and different
  // scan rows — one could be told a taken name is free.
  it("folds Devanagari precomposed and combining forms together", () => {
    const precomposed = String.fromCodePoint(0x0958); // क़
    const combining = String.fromCodePoint(0x0915, 0x093c); // क + nukta
    expect(precomposed === combining).toBe(false); // differ before normalisation
    expect(normaliseName(precomposed).trimmed).toBe(normaliseName(combining).trimmed);
  });

  it("folds Latin accents pasted from a word processor", () => {
    const typed = "Café";
    const pasted = "Cafe" + String.fromCodePoint(0x0301);
    expect(typed === pasted).toBe(false);
    expect(normaliseName(typed).trimmed).toBe(normaliseName(pasted).trimmed);
  });

  it("strips invisible characters that would split one name into two", () => {
    const clean = "Naamdekho";
    for (const cp of [0x200b, 0x200d, 0xfeff, 0x00ad]) {
      const sneaky = "Naam" + String.fromCodePoint(cp) + "dekho";
      expect(sneaky === clean).toBe(false);
      expect(normaliseName(sneaky).trimmed).toBe(clean);
    }
  });
});

describe("amazon brand parsing", () => {
  const page = `
    <h2 aria-label="boAt Rockerz 255 Pro+, 60H Battery, Wireless Neckband" class="a-size-medium"><span>x</span></h2>
    <h2 aria-label="boAt Airdopes 141 Bluetooth Earbuds" class="a-size-medium"><span>x</span></h2>
    <h2 aria-label="Noise Buds VS104 Truly Wireless" class="a-size-medium"><span>x</span></h2>
    <h2 aria-label="Portronics Harmonics Twins &amp; More" class="a-size-medium"><span>x</span></h2>`;

  it("reads titles from aria-label, not from churning CSS classes", () => {
    const titles = amazonTitles(page);
    expect(titles).toHaveLength(4);
    expect(titles[3]).toContain("&"); // entity decoded
  });

  it("matches a brand only when a title LEADS with it", () => {
    expect(amazonBrandMatches(amazonTitles(page), "boat")).toHaveLength(2);
    expect(amazonBrandMatches(amazonTitles(page), "Noise")).toHaveLength(1);
  });

  it("does not fire on a name merely contained inside another word", () => {
    // "Ira" appears inside "Airdopes"/"Harmonics" — a substring search would
    // wrongly report the brand as taken.
    expect(amazonBrandMatches(amazonTitles(page), "Ira")).toHaveLength(0);
    expect(amazonBrandMatches(amazonTitles(page), "Twins")).toHaveLength(0);
  });

  it("refuses names too short to be distinctive", () => {
    expect(amazonBrandMatches(amazonTitles(page), "bo")).toHaveLength(0);
  });

  it("recognises Amazon's robot wall so a block is never read as 'available'", () => {
    expect(isAmazonBlocked("...Enter the characters you see below...")).toBe(true);
    expect(isAmazonBlocked(page)).toBe(false);
  });
});

describe("token economics", () => {
  it("prices business searches as agreed", () => {
    expect(tokenCost("standard", "business")).toBe(50);
    expect(tokenCost("deep", "business")).toBe(350);
  });

  it("prices baby searches at half the business rate", () => {
    // Baby runs 9 checks with only 2 leaving our server, against ~20 outbound
    // calls for business — and parents compare far more names than founders.
    expect(tokenCost("standard", "baby")).toBe(25);
    expect(tokenCost("deep", "baby")).toBe(300);
  });

  it("makes the Full naming report cheaper than buying its parts", () => {
    const parts = tokenCost("standard", "baby") + ADDON_COST.keepsake;
    expect(tokenCost("deep", "baby")).toBeLessThan(parts);
  });

  it("charges the MAXIMUM for anything unrecognised, never zero", () => {
    // Fails closed on both axes. A tier or mode added later must not slip
    // through free — that is how the ₹0 paid-product bypass happened.
    expect(tokenCost("enterprise-2027", "business")).toBe(350);
    expect(tokenCost("standard", "enterprise-mode")).toBe(350);
    expect(tokenCost("", "")).toBe(350);
  });

  it("the 500-token entrance bonus buys what we tell customers it buys", () => {
    expect(SIGNUP_BONUS_TOKENS).toBe(500);
    // One Deep Search plus three Standard searches, exactly.
    expect(tokenCost("deep") + 3 * tokenCost("standard")).toBe(SIGNUP_BONUS_TOKENS);
    // Or ten Standard searches on their own.
    expect(affords(SIGNUP_BONUS_TOKENS).standard).toBe(10);
    expect(affords(SIGNUP_BONUS_TOKENS).deep).toBe(1);
    // And for a parent: twenty name searches, or one full report with change.
    expect(affords(SIGNUP_BONUS_TOKENS).babySearch).toBe(20);
    expect(affords(SIGNUP_BONUS_TOKENS).babyReport).toBe(1);
  });

  it("never claims a search is affordable when it is not", () => {
    expect(affords(349).deep).toBe(0);
    expect(affords(49).standard).toBe(0);
    expect(affords(24).babySearch).toBe(0);
    expect(affords(0)).toEqual({ standard: 0, deep: 0, babySearch: 0, babyReport: 0 });
  });

  it("sells the two packs at the agreed prices", () => {
    const byId = Object.fromEntries(TOKEN_PACKS.map((p) => [p.id, p]));
    expect(byId["pack-500"]).toMatchObject({ rupees: 50, tokens: 500 });
    expect(byId["pack-5000"]).toMatchObject({ rupees: 500, tokens: 5000 });
    // ₹500 is a straight 10× of ₹50 — no hidden bonus, as decided.
    expect(byId["pack-5000"].tokens).toBe(byId["pack-500"].tokens * 10);
  });
});

describe("paywall — tier gating", () => {
  // Regression guard for a real paywall bypass found 3 Aug 2026: the credit
  // gate asked `tier === "deep"` while every downstream guard asked
  // `tier !== "free"`, so POST /v1/scan with tier:"shortlist" and no account
  // returned the full 26-tile paid scan plus report/keepsake/alternatives.
  const ALL_TIERS: ScanTier[] = ["standard", "deep", "keepsake", "shortlist", "agency"];

  it("treats exactly one tier as standard-depth", () => {
    expect(ALL_TIERS.filter((t) => !isPaidTier(t))).toEqual(["standard"]);
  });

  it("treats every deeper tier as premium, not just deep", () => {
    for (const tier of ["deep", "keepsake", "shortlist", "agency"] as ScanTier[]) {
      expect(isPaidTier(tier)).toBe(true);
    }
  });

  it("fails closed — an unknown future tier is treated as paid", () => {
    expect(isPaidTier("enterprise-2027")).toBe(true);
  });
});

describe("transliteration engine", () => {
  it("writes real Indian names correctly in Devanagari", () => {
    // These are the cases the OLD engine got wrong — it emitted standalone
    // vowels (परइयअ) instead of vowel signs. Guard against regressing.
    expect(romanToDevanagari("Aarav")).toBe("आरव");
    expect(romanToDevanagari("Priya")).toBe("प्रिया");
    expect(romanToDevanagari("Rohit")).toBe("रोहित");
    expect(romanToDevanagari("Ananya")).toBe("अनन्या");
  });

  it("uses anusvara for a nasal before a stop, but not before a semivowel", () => {
    expect(romanToDevanagari("Sanjay")).toBe("संजय"); // n + j → anusvara
    expect(romanToDevanagari("Ananya")).toBe("अनन्या"); // n + y → conjunct
  });

  it("never emits standalone vowel letters mid-word", () => {
    // अ इ उ ए ओ appearing after the first character means the old bug is back
    for (const name of ["Priya", "Rohit", "Deepika", "Meridian"]) {
      expect(romanToDevanagari(name).slice(1)).not.toMatch(/[अइईउऊएऐओऔ]/);
    }
  });

  it("renders every script without leaking Devanagari characters", () => {
    for (const name of ["Aarav", "Krishna", "Sanjay", "Lakshmi"]) {
      const { scripts } = nameInAllScripts(name);
      expect(scripts.length).toBeGreaterThanOrEqual(9);
      for (const s of scripts) {
        if (s.script === "Devanagari") continue;
        expect(s.text).not.toMatch(/[ऀ-ॿ]/); // a leak means broken text on screen
      }
    }
  });

  it("returns nothing rather than garbage for empty input", () => {
    expect(romanToDevanagari("")).toBe("");
    expect(nameInAllScripts("").scripts).toHaveLength(0);
  });
});

describe("bhashini integration", () => {
  it("reports itself unconfigured when no credentials are set", () => {
    delete process.env.BHASHINI_USER_ID;
    delete process.env.BHASHINI_ULCA_API_KEY;
    delete process.env.BHASHINI_API_KEY;
    delete process.env.BHASHINI_INFERENCE_KEY;
    expect(isConfigured()).toBe(false);
  });

  it("returns null (never fabricated text) when unconfigured, so callers fall back", async () => {
    expect(await transliterateAll("Aarav")).toBeNull();
  });

  it("covers the 10 languages the meaning tile promises", () => {
    expect(TARGET_LANGUAGES).toHaveLength(10);
    expect(TARGET_LANGUAGES.map((l) => l.code)).toContain("ta");
  });

  it("still produces both linguistic tiles, credited honestly, with Bhashini off", async () => {
    const tiles = await scanLinguistic("Aarav", "baby");
    const mean = tiles.find((t) => t.tileId === "lin-mean");
    expect(tiles).toHaveLength(2);
    expect(mean?.status).toBe("ok");
    // Must NOT claim Bhashini as the source when it never answered
    expect(mean?.source).toBe("internal://lingo");
  });
});

describe("tokens (in-memory dev store)", () => {
  it("grants the 500-token entrance bonus once and spends it down correctly", () => {
    const { user, created } = devUserUpsert("+911234500001");
    expect(created).toBe(true);
    expect(user.tokens).toBe(500);

    // Signing in again is not a new signup — no second bonus.
    const again = devUserUpsert("+911234500001");
    expect(again.created).toBe(false);
    expect(again.user.tokens).toBe(500);

    // One Deep Search, then three Standard searches, empties it exactly.
    expect(devSpendTokens(user.id, 350)).toEqual({ ok: true, balance: 150 });
    expect(devSpendTokens(user.id, 50)).toEqual({ ok: true, balance: 100 });
    expect(devSpendTokens(user.id, 50)).toEqual({ ok: true, balance: 50 });
    expect(devSpendTokens(user.id, 50)).toEqual({ ok: true, balance: 0 });

    // Empty means empty — the balance must never go negative.
    expect(devSpendTokens(user.id, 50)).toEqual({ ok: false, balance: 0 });
    expect(devUserGet(user.id)?.tokens).toBe(0);
  });

  it("refuses a Deep Search the balance cannot cover, without part-charging", () => {
    const { user } = devUserUpsert("+911234500002");
    expect(devSpendTokens(user.id, 350)).toEqual({ ok: true, balance: 150 });
    // 150 left, a Deep Search needs 350 — refuse and leave the balance alone.
    expect(devSpendTokens(user.id, 350)).toEqual({ ok: false, balance: 150 });
    expect(devUserGet(user.id)?.tokens).toBe(150);
  });

});
