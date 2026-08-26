/**
 * Standalone worker entrypoint. Run with `npm run dev:worker`.
 *
 * The worker:
 *   1. Pulls scan jobs off the BullMQ queue
 *   2. Runs the orchestrator
 *   3. Publishes per-tile events to Redis (Socket.IO server picks them up via the Redis adapter)
 *   4. Persists final results to Postgres
 */
import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { SCAN_QUEUE_NAME } from "./index.js";
import { pubClient } from "../cache/redis.js";
import { runScan } from "../scanners/index.js";
import type { ScanRequest, TileResult, WSServerEvent } from "../lib/types.js";
import { db } from "../db/index.js";
import { scans, scanResults } from "../db/schema.js";
import { logger } from "../logger.js";

const REPLAY_BUFFER_MAX = 300;

async function publishEvent(scanId: string, event: WSServerEvent) {
  // Append to ring buffer for reconnect-replay
  const key = `ws:scan:${scanId}`;
  const payload = JSON.stringify({ ...event, ts: Date.now() });
  await pubClient
    .multi()
    .rpush(key, payload)
    .ltrim(key, -REPLAY_BUFFER_MAX, -1)
    .expire(key, 600)
    .publish(`scan-events`, JSON.stringify({ scanId, event }))
    .exec();
}

const worker = new Worker<ScanRequest>(
  SCAN_QUEUE_NAME,
  async (job) => {
    const req = job.data;
    logger.info({ scanId: req.scanId, name: req.name, mode: req.mode }, "Running scan");

    await db.update(scans).set({ status: "running" }).where(eq(scans.id, req.scanId));

    let completed = 0;
    const tilesCollected: TileResult[] = [];

    const emit = async (tile: TileResult) => {
      tilesCollected.push(tile);
      completed += 1;
      await publishEvent(req.scanId, { type: "result_event", data: tile });
      await publishEvent(req.scanId, { type: "progress", data: { completed, total: 0 } });
    };

    try {
      const { tiles, verdict } = await runScan(req, emit);

      await publishEvent(req.scanId, { type: "verdict_complete", data: verdict });

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

      logger.info({ scanId: req.scanId, score: verdict.score, count: tiles.length }, "Scan complete");
      return { scanId: req.scanId, verdict };
    } catch (err) {
      logger.error({ err: (err as Error).message, scanId: req.scanId }, "Scan failed");
      await publishEvent(req.scanId, {
        type: "scan_failed",
        data: { reason: (err as Error).message, retryable: true },
      });
      await db.update(scans).set({ status: "failed" }).where(eq(scans.id, req.scanId));
      throw err;
    }
  },
  {
    connection: pubClient,
    concurrency: 5,
  },
);

worker.on("ready", () => logger.info("Scan worker ready"));
worker.on("error", (err) => logger.error({ err: err.message }, "Worker error"));

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, draining worker…");
  await worker.close();
  process.exit(0);
});
