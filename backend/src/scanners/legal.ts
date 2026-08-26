import type { TileResult } from "../lib/types.js";

/**
 * Legal & Regulatory scanners — 2 checks of the portfolio:
 *   leg-mca  MCA21 Company Register        PAID  (Playwright + 2Captcha)
 *   leg-tm   IP India Trademark, 45 classes PAID (Playwright + CAPTCHA)
 *
 * NONE of the Government sources we depend on have official public APIs.
 * They require:
 *   - Playwright with a warmed-proxy session
 *   - CAPTCHA solving (2Captcha / Anti-Captcha) on the deep-tier
 *   - Per-source HTML parsers (they change frequently)
 *
 * The paid checks are deliberately stubbed until CAPTCHA/proxy keys are
 * configured (see STUBBED.md). The structure mirrors what the real
 * scrapers will look like — same return shape, same caching, same error
 * handling. In development the stubs return plausible-but-deterministic
 * results so the front-end renders correctly. In production without keys
 * they return "pending" — we never pretend a legal check succeeded.
 *
 * (Copyright Office removed — copyright does not enforce name uniqueness.
 *  DPIIT / FSSAI / RBI / SEBI / IRDAI are Phase 3, see PRD §11.)
 */

const DEV_MOCK = process.env.NODE_ENV !== "production";

/** MCA21 + IP India Trademark run only on the paid tier. */
export async function scanLegalPaid(name: string, _industry?: string): Promise<TileResult[]> {
  const tiles: TileResult[] = [];

  tiles.push(stubLegal("leg-mca", "MCA21 company name", "mca.gov.in",
    DEV_MOCK ? deterministicMatch(name, 0.7) : null, "https://www.mca.gov.in/"));

  tiles.push(stubLegal("leg-tm", "IP India Trademark (45 classes)", "ipindia.gov.in",
    DEV_MOCK ? deterministicMatch(name, 0.55) : null, "https://tmrsearch.ipindia.gov.in/"));

  return tiles;
}

function stubLegal(
  tileId: string,
  label: string,
  source: string,
  isAvailable: boolean | null,
  actionUrl?: string,
): TileResult {
  if (isAvailable === null) {
    return {
      tileId,
      category: "legal",
      status: "pending",
      summary: `${label} — check queued`,
      detail: { note: "Scraper integration pending — see STUBBED.md" },
      source,
      actionUrl,
    };
  }
  return {
    tileId,
    category: "legal",
    status: isAvailable ? "ok" : "no",
    summary: isAvailable
      ? `${label} — clear (practice data, real registry check coming soon)`
      : `${label} — conflict found (practice data, real registry check coming soon)`,
    detail: { stub: true, note: "Development-mode mock; replace with real scraper" },
    source,
    actionUrl,
  };
}

/**
 * Stable pseudo-random — same name → same verdict.
 * Returns true ("available") with probability `availabilityProb`.
 */
function deterministicMatch(name: string, availabilityProb: number): boolean {
  let h = 0;
  for (const c of name.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h % 1000) / 1000 < availabilityProb;
}
