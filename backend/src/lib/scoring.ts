import type { ScanVerdict, TileResult } from "./types.js";

/**
 * Verdict scoring rubric — proprietary.
 *
 * Per-tile score:
 *   ok     → +1.0
 *   warn   → +0.3
 *   pending→  0.0 (not counted in normaliser)
 *   no     → -0.5
 *   error  →  0.0 (not counted)
 *
 * Critical tiles (high TM-class overlap, MCA exact match, copyright on
 * the wordmark itself) override:
 *   no (critical) → -1.5
 *
 * Result is normalised to a 0-100 score over completed (non-pending,
 * non-error) tiles, multiplied by the share of platforms that completed.
 */

const CRITICAL_TILE_IDS = new Set<string>([
  "leg-mca",
  "leg-tm",
]);

export function scoreScan(scanId: string, tiles: TileResult[], startTime: number): ScanVerdict {
  let raw = 0;
  let denom = 0;
  let clear = 0, conflict = 0, warn = 0, info = 0, pending = 0;

  for (const t of tiles) {
    switch (t.status) {
      case "ok":
        raw += 1.0;
        clear += 1;
        denom += 1;
        break;
      case "warn":
        raw += 0.3;
        warn += 1;
        denom += 1;
        break;
      case "no":
        raw += CRITICAL_TILE_IDS.has(t.tileId) ? -1.5 : -0.5;
        conflict += 1;
        denom += 1;
        break;
      case "info":
        // Informational only (e.g. GST trade-name) — never scored, never a conflict
        info += 1;
        break;
      case "pending":
        pending += 1;
        break;
      case "error":
        // Doesn't count either way
        break;
    }
  }

  // Completion penalty — if many sources failed/are pending, dampen the score
  const completionRatio = tiles.length > 0 ? denom / tiles.length : 0;
  const normalised = denom > 0 ? Math.max(0, raw) / denom : 0;
  const score = Math.round(normalised * completionRatio * 100);

  const summary =
    conflict > 0
      ? `${clear}/${tiles.length} clear — ${conflict} conflict${conflict === 1 ? "" : "s"} to resolve`
      : warn > 0
        ? `${clear}/${tiles.length} clear — ${warn} warning${warn === 1 ? "" : "s"}`
        : `${clear}/${tiles.length} clear — strong overall`;

  return {
    scanId,
    score,
    clear,
    conflict,
    warn,
    info,
    pending,
    totalTime: Date.now() - startTime,
    summary,
  };
}

/**
 * "Materially incomplete" — defined in the Cancellation Policy as fewer than
 * 70% of platforms applicable to the user's mode returning a substantive
 * (non-Checking, non-error) response. Used by the refund flow.
 */
export function isMateriallyIncomplete(tiles: TileResult[]): boolean {
  if (tiles.length === 0) return true;
  const substantive = tiles.filter((t) => t.status !== "pending" && t.status !== "error").length;
  return substantive / tiles.length < 0.7;
}
