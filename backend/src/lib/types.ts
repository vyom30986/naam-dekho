// Shared domain types used across orchestrator, scanners, queue, WS

export type ScanMode = "business" | "baby";
export type ScanTier = "standard" | "deep" | "keepsake" | "shortlist" | "agency";

/**
 * Does this tier unlock the premium checks (MCA21, Trademark, Amazon) and the
 * paid deliverables (evidence report, keepsake, alternatives)?
 *
 * Since 4 Aug 2026 EVERY search costs tokens, so this is no longer "is it
 * paid" — it is "how deep does it go". The name is kept because every call
 * site already routes through it, and routing every tier decision through ONE
 * predicate is the thing that matters: the gate and its consumers drifted
 * apart once and gave the whole paid product away for ₹0.
 *
 * Adding a new tier to ScanTier defaults it to PREMIUM here, and to the
 * highest token cost in tokens.ts. Both fail closed.
 */
export function isPaidTier(tier: ScanTier | string): boolean {
  return tier !== "standard";
}

// "info" — informational only (e.g. GST trade-name), never a conflict, not scored
export type TileStatus = "ok" | "no" | "warn" | "info" | "pending" | "error";

export type TileCategory =
  | "legal"
  | "domains"
  | "social"
  | "marketplace"
  | "brand"
  | "linguistic"
  | "numerology"
  | "pronunciation"
  | "astrology";

export interface ScanRequest {
  scanId: string;
  name: string;
  mode: ScanMode;
  industry?: string;
  siblingName?: string;
  /** Baby mode: birth date (YYYY-MM-DD) and optional time (HH:MM), IST. */
  birthDate?: string;
  birthTime?: string; // baby mode only — optional harmony comparison
  tier: ScanTier;
  userId?: string;
  anonymousIp?: string;
}

export interface TileResult {
  tileId: string;
  category: TileCategory;
  status: TileStatus;
  summary: string;
  detail?: Record<string, unknown>;
  latencyMs?: number;
  source?: string;
  actionUrl?: string;
}

export interface ScanVerdict {
  scanId: string;
  score: number; // 0-100
  clear: number;
  conflict: number;
  warn: number;
  info: number;
  pending: number;
  totalTime: number;
  summary: string;
}

// WebSocket events
export type WSServerEvent =
  | { type: "scan_started"; data: { scanId: string; totalTiles: number; etaSeconds: number } }
  | { type: "result_event"; data: TileResult }
  | { type: "progress"; data: { completed: number; total: number } }
  | { type: "hud_update"; data: { verdictScore: number; clear: number; conflict: number; warn: number; pending: number } }
  | { type: "verdict_complete"; data: ScanVerdict }
  | { type: "tile_error"; data: { tileId: string; errorCode: string; retry: boolean } }
  | { type: "scan_failed"; data: { reason: string; retryable: boolean } };
