import { isPaidTier } from "../lib/types.js";
import type { ScanRequest, TileResult } from "../lib/types.js";
import { normaliseName } from "../lib/normalise.js";
import { scoreScan } from "../lib/scoring.js";
import { scanDomains } from "./domain.js";
import { scanSocial } from "./social.js";
import { scanMarketplace } from "./marketplace.js";
import { scanBrand } from "./brand.js";
import { scanLegalPaid } from "./legal.js";
import { scanLinguistic, scanNumerology, scanPronunciation } from "./linguistic.js";
import { scanRashi, scanNicknames, scanSiblingHarmony } from "./astro.js";
import { logger } from "../logger.js";
import { disabledScanners } from "../lib/settings.js";

export type TileEmitter = (tile: TileResult) => void | Promise<void>;

/**
 * Orchestrator — fans the user's request out into all relevant scanners
 * for the given mode and tier, emits each tile result as it arrives via
 * the supplied `emit` callback, and returns the final verdict once all
 * tiles have completed.
 *
 * Business mode, standard  → 30 checks
 * Business mode, deep      → 33 checks (adds MCA21, IP India TM, Amazon)
 * Baby mode                 → linguistic, numerology, pronunciation, social
 */
export async function runScan(req: ScanRequest, emit: TileEmitter) {
  const start = Date.now();
  const n = normaliseName(req.name);
  const tiles: TileResult[] = [];
  const paid = isPaidTier(req.tier);

  // Per-scanner family — each returns a Promise<TileResult[]>.
  // We run them all in parallel and emit individual tiles as they resolve.
  const tasks: Array<Promise<TileResult[]>> = [];

  if (req.mode === "business") {
    tasks.push(scanDomains(n.alnumLower));                       // 14 tiles, one per ending
    tasks.push(scanSocial(n.alnumLower, paid));                  // 6 tiles
    tasks.push(scanMarketplace(n.alnumLower, n.capitalised, paid)); // 5 free (+2 paid)
    tasks.push(scanBrand(n.capitalised, paid));                  // 2 tiles
    tasks.push(scanLinguistic(n.letters, "business", req.name));            // 2 tiles
    tasks.push(Promise.resolve([scanPronunciation(n.letters)])); // 1 tile
    tasks.push(Promise.resolve([scanNumerology(n.letters, req.industry)])); // 1 tile
    if (paid) {
      tasks.push(scanLegalPaid(n.capitalised, req.industry));    // 2 tiles (paid)
    }
  } else {
    // baby mode — pronunciation, linguistic, numerology, astrology, social
    tasks.push(Promise.resolve([scanPronunciation(n.letters)]));
    tasks.push(scanLinguistic(n.letters, "baby", req.name));
    tasks.push(Promise.resolve([scanNumerology(n.letters)]));
    tasks.push(Promise.resolve([scanRashi(req.name, req.birthDate, req.birthTime)]));
    tasks.push(Promise.resolve([scanNicknames(req.name)]));
    tasks.push(Promise.resolve([scanSiblingHarmony(req.name, req.siblingName)]));
    tasks.push(scanSocial(n.alnumLower, paid));
  }

  /*
   * Checks the founder switched off in the admin panel.
   *
   * These used to still emit a tile reading "Temporarily switched off", on the
   * reasoning that a vanished tile looks like a bug. The founder overruled that
   * on 6 Aug 2026, and for the case that actually matters they are right: when a
   * government registry is down and the check is switched off, someone who paid
   * for a Deep Search should not be handed a row about our plumbing in the middle
   * of the answer they bought.
   *
   * A switched-off check is now omitted entirely — never emitted, never added to
   * the tile list. Because the verdict is scored from the tiles, it also cannot
   * drag the score down for a check nobody ran. The admin panel still lists every
   * check, on or off; that is where the state belongs.
   */
  const disabled = new Set(await disabledScanners());

  // Emit results as each family completes
  await Promise.all(
    tasks.map(async (p) => {
      try {
        const family = await p;
        for (const tile of family) {
          if (disabled.has(tile.tileId)) continue;
          tiles.push(tile);
          await emit(tile);
        }
      } catch (err) {
        logger.error({ err: (err as Error).message }, "Scanner family failed");
      }
    }),
  );

  const verdict = scoreScan(req.scanId, tiles, start);
  return { tiles, verdict };
}

/**
 * Plan only — used by the API to tell the client how many tiles to expect
 * before any are emitted.
 *
 * Business free: 14 domain + 6 social + 5 marketplace + 2 brand
 *                + 2 linguistic + 1 pronunciation + 1 numerology = 30
 * Business paid: + MCA21 + IP India TM + Amazon              = 33
 * Baby:          1 pronunciation + 2 linguistic + 1 numerology
 *                + 1 rashi + 1 nickname + 1 sibling + 5 social   = 12
 */
export function planScan(mode: "business" | "baby", tier: "free" | "paid" = "free"): { totalTiles: number; etaSeconds: number } {
  if (mode === "business") {
    return { totalTiles: tier === "paid" ? 33 : 30, etaSeconds: 8 };
  }
  return { totalTiles: 12, etaSeconds: 5 };
}
