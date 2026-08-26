/**
 * Development degraded-mode support.
 *
 * When Docker (Postgres + Redis) is not running in development, the API can
 * still serve real scans: scan requests run inline in the API process, tile
 * events go straight to Socket.IO (in-memory adapter), and scan records live
 * in a per-process store. NOTHING here runs in production — `stackHealth()`
 * short-circuits to "all healthy" outside development, so missing infra
 * fails loudly there, as it should.
 */
import { isDev } from "../config.js";
import { logger } from "../logger.js";
import type { ScanRequest, ScanVerdict, TileResult, WSServerEvent } from "./types.js";

export interface StackHealth {
  redis: boolean;
  db: boolean;
  degraded: boolean;
}

let probed: Promise<StackHealth> | null = null;

export function stackHealth(): Promise<StackHealth> {
  if (!isDev) return Promise.resolve({ redis: true, db: true, degraded: false });
  if (probed) return probed;
  probed = (async () => {
    const [{ redis: redisClient }, { pool }] = await Promise.all([
      import("../cache/redis.js"),
      import("../db/index.js"),
    ]);
    const withTimeout = <T>(p: Promise<T>, ms: number) =>
      Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

    const [redisOk, dbOk] = await Promise.all([
      withTimeout(redisClient.ping(), 1_500).then(() => true).catch(() => false),
      withTimeout(pool.query("select 1"), 3_000).then(() => true).catch(() => false),
    ]);
    const degraded = !redisOk || !dbOk;
    if (degraded) {
      logger.warn(
        { redis: redisOk, db: dbOk },
        "DEV DEGRADED MODE — Postgres/Redis unavailable. Scans run inline, nothing is persisted. Start docker compose for the full stack.",
      );
    }
    return { redis: redisOk, db: dbOk, degraded };
  })();
  return probed;
}

// ── In-memory scan store (dev degraded mode only) ───────────────
export interface DevScanRecord {
  scanId: string;
  name: string;
  mode: "business" | "baby";
  tier: string;
  status: "queued" | "running" | "complete" | "failed";
  totalTiles: number;
  tiles: TileResult[];
  verdict: ScanVerdict | null;
  startedAt: Date;
  completedAt: Date | null;
  events: WSServerEvent[]; // replay buffer for reconnects
}

const devScans = new Map<string, DevScanRecord>();
const DEV_SCAN_CAP = 500; // keep memory bounded

// ── In-memory users + OTPs (dev degraded mode only) ─────────────
export interface DevUser {
  id: string;
  phone: string;
  email?: string;
  displayName?: string;
  tokens: number;
  creditsFree: number;
  creditsBundle: number;
  creditsExpiresAt: Date | null;
  createdAt: Date;
  lastLoginAt: Date;
}

export interface DevOtp {
  phone: string;
  hash: string;
  attempts: number;
  expiresAt: number;
}

const devUsersByPhone = new Map<string, DevUser>();
const devUsersById = new Map<string, DevUser>();
const devOtps = new Map<string, DevOtp>();

export function devOtpSet(requestId: string, otp: DevOtp): void {
  devOtps.set(requestId, otp);
}

export function devOtpGet(requestId: string): DevOtp | undefined {
  const o = devOtps.get(requestId);
  if (o && o.expiresAt < Date.now()) {
    devOtps.delete(requestId);
    return undefined;
  }
  return o;
}

export function devOtpDelete(requestId: string): void {
  devOtps.delete(requestId);
}

/** Find or create a user; grants the 1 free signup credit (FR-5.4.1) on creation. */
export function devUserUpsert(phone: string): { user: DevUser; created: boolean } {
  const existing = devUsersByPhone.get(phone);
  if (existing) {
    existing.lastLoginAt = new Date();
    return { user: existing, created: false };
  }
  const user: DevUser = {
    id: crypto.randomUUID(),
    phone,
    tokens: 500, // signup bonus
    creditsFree: 1, // signup bonus — FR-5.4.1
    creditsBundle: 0,
    creditsExpiresAt: null,
    createdAt: new Date(),
    lastLoginAt: new Date(),
  };
  devUsersByPhone.set(phone, user);
  devUsersById.set(user.id, user);
  return { user, created: true };
}

/**
 * Same as devUserUpsert but keyed on the Google account's email.
 * Only used when Postgres is down — the real path writes to the users table.
 */
const devUsersByEmail = new Map<string, DevUser>();
export function devUserUpsertByEmail(
  email: string,
  displayName?: string,
): { user: DevUser; created: boolean } {
  const existing = devUsersByEmail.get(email);
  if (existing) {
    existing.lastLoginAt = new Date();
    return { user: existing, created: false };
  }
  const user: DevUser = {
    id: crypto.randomUUID(),
    // The dev store keys users by one identifier; for Google sign-in the
    // email fills that slot, so /me and the admin gate keep working.
    phone: email,
    email,
    tokens: 500, // signup bonus
    creditsFree: 1, // signup bonus — FR-5.4.1
    creditsBundle: 0,
    creditsExpiresAt: null,
    createdAt: new Date(),
    lastLoginAt: new Date(),
  };
  if (displayName) (user as DevUser & { displayName?: string }).displayName = displayName;
  devUsersByEmail.set(email, user);
  devUsersById.set(user.id, user);
  return { user, created: true };
}

export function devUserGet(userId: string): DevUser | undefined {
  return devUsersById.get(userId);
}

/**
 * Spend one credit — free credits first, then unexpired bundle credits
 * (FR-5.5.1/5.5.2). Returns false when the user has none.
 */
export function devSpendTokens(userId: string, cost: number): { ok: boolean; balance: number } {
  const user = devUsersById.get(userId);
  if (!user) return { ok: false, balance: 0 };
  if (user.tokens < cost) return { ok: false, balance: user.tokens };
  user.tokens -= cost;
  return { ok: true, balance: user.tokens };
}

/** Give tokens back when a scan fails through our own fault. */
export function devRefundTokens(userId: string, amount: number): void {
  const user = devUsersById.get(userId);
  if (user) user.tokens += amount;
}

export function devScanCreate(req: ScanRequest, totalTiles: number): DevScanRecord {
  if (devScans.size >= DEV_SCAN_CAP) {
    const oldest = devScans.keys().next().value;
    if (oldest) devScans.delete(oldest);
  }
  const rec: DevScanRecord = {
    scanId: req.scanId,
    name: req.name,
    mode: req.mode,
    tier: req.tier,
    status: "queued",
    totalTiles,
    tiles: [],
    verdict: null,
    startedAt: new Date(),
    completedAt: null,
    events: [],
  };
  devScans.set(req.scanId, rec);
  return rec;
}

export function devScanGet(scanId: string): DevScanRecord | undefined {
  return devScans.get(scanId);
}

/**
 * Run a scan inline in the API process (used whenever the Redis queue is
 * unavailable) and stream tiles straight to the Socket.IO room. Mirrors the
 * worker's event contract. When `persistToDb` is true (Postgres is up), the
 * finished scan and its tiles are written to the database exactly as the
 * queue worker would — so results survive restarts even without Redis.
 */
export async function devRunScanInline(req: ScanRequest, persistToDb = false): Promise<void> {
  const [{ runScan }, { getIo }] = await Promise.all([
    import("../scanners/index.js"),
    import("../ws/server.js"),
  ]);
  const rec = devScanGet(req.scanId);
  if (!rec) return;

  const emitWs = (event: WSServerEvent) => {
    rec.events.push(event);
    if (rec.events.length > 300) rec.events.shift();
    try {
      getIo().to(`scan:${req.scanId}`).emit(event.type, event.data);
    } catch {
      /* WS not up yet — event stays in the replay buffer */
    }
  };

  rec.status = "running";
  let completed = 0;
  try {
    const { tiles, verdict } = await runScan(req, (tile) => {
      rec.tiles.push(tile);
      completed += 1;
      emitWs({ type: "result_event", data: tile });
      emitWs({ type: "progress", data: { completed, total: rec.totalTiles } });
    });
    rec.verdict = verdict;
    rec.status = "complete";
    rec.completedAt = new Date();
    emitWs({ type: "verdict_complete", data: verdict });

    if (persistToDb) {
      try {
        const [{ db }, { scans, scanResults }, { eq }] = await Promise.all([
          import("../db/index.js"),
          import("../db/schema.js"),
          import("drizzle-orm"),
        ]);
        await db
          .update(scans)
          .set({
            status: "complete",
            verdictScore: verdict.score,
            clearCount: verdict.clear,
            conflictCount: verdict.conflict,
            warnCount: verdict.warn,
            pendingCount: verdict.pending,
            completedAt: new Date(),
          })
          .where(eq(scans.id, req.scanId));
        if (tiles.length > 0) {
          await db.insert(scanResults).values(
            tiles.map((t) => ({
              scanId: req.scanId,
              tileId: t.tileId,
              category: t.category,
              status: t.status,
              summary: t.summary ?? null,
              detail: t.detail ?? {},
              latencyMs: t.latencyMs ?? null,
              source: t.source ?? null,
              actionUrl: t.actionUrl ?? null,
            })),
          ).onConflictDoNothing();
        }
      } catch (err) {
        logger.error({ err: (err as Error).message, scanId: req.scanId }, "Inline scan DB persistence failed");
      }
    }

    logger.info({ scanId: req.scanId, score: verdict.score, count: tiles.length }, "Inline scan complete");
  } catch (err) {
    rec.status = "failed";
    emitWs({ type: "scan_failed", data: { reason: (err as Error).message, retryable: true } });
    logger.error({ err: (err as Error).message, scanId: req.scanId }, "Inline scan failed");
  }
}
