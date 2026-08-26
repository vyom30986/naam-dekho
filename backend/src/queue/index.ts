import { Queue } from "bullmq";
import { pubClient } from "../cache/redis.js";
import type { ScanRequest } from "../lib/types.js";

export const SCAN_QUEUE_NAME = "scan";

export const scanQueue = new Queue<ScanRequest>(SCAN_QUEUE_NAME, {
  connection: pubClient,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1_000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 86_400 },
  },
});

export async function enqueueScan(req: ScanRequest): Promise<string> {
  const priority = req.tier === "deep" || req.tier === "agency" ? 1 : 5;
  await scanQueue.add("run-scan", req, {
    jobId: req.scanId,
    priority,
  });
  return req.scanId;
}
