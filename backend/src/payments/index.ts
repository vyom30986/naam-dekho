/**
 * Gateway switcher — Razorpay (primary) with automatic Paytm (fallback).
 *
 * Health is tracked in Redis. When the primary error rate is high or its
 * median response time crosses the threshold, new checkouts switch to
 * Paytm. After 30 minutes of stability, we revert.
 */
import { redis } from "../cache/redis.js";
import { createRazorpayOrder, pingRazorpay } from "./razorpay.js";
import { createPaytmOrder, pingPaytm } from "./paytm.js";
import { logger } from "../logger.js";

export type CheckoutIntent =
  | Awaited<ReturnType<typeof createRazorpayOrder>>
  | Awaited<ReturnType<typeof createPaytmOrder>>;

export type Gateway = "razorpay" | "paytm";

const FAILOVER_KEY = "billing:gateway:failover-until";
const FAILOVER_TTL_SEC = 30 * 60; // 30 minutes

export async function selectGateway(): Promise<Gateway> {
  // Active failover window?
  const until = await redis.get(FAILOVER_KEY);
  if (until && Number(until) > Date.now()) return "paytm";

  // Otherwise — check primary health
  const ok = await pingRazorpay();
  if (!ok) {
    const paytmOk = await pingPaytm();
    if (paytmOk) {
      await redis.set(FAILOVER_KEY, Date.now() + FAILOVER_TTL_SEC * 1000, "EX", FAILOVER_TTL_SEC);
      logger.warn("Razorpay unhealthy — failing over to Paytm for the next 30 minutes");
      return "paytm";
    }
  }
  return "razorpay";
}

/**
 * Record a payment outcome for the gateway-health window. Worker / webhook
 * handler should call this after every transaction. We track a rolling
 * 5-minute error window for failover triggering.
 */
export async function recordGatewayOutcome(gateway: Gateway, success: boolean, latencyMs: number): Promise<void> {
  const bucket = Math.floor(Date.now() / 60_000); // 1-minute buckets
  const key = `billing:gateway-stats:${gateway}:${bucket}`;
  await redis
    .multi()
    .hincrby(key, "total", 1)
    .hincrby(key, success ? "success" : "errors", 1)
    .hincrby(key, "latency_ms_sum", Math.round(latencyMs))
    .expire(key, 600)
    .exec();

  // Trigger failover if last 5 minutes show > 5% errors OR > 10s median
  if (gateway === "razorpay" && !success) {
    const buckets = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        redis.hgetall(`billing:gateway-stats:razorpay:${bucket - i}`),
      ),
    );
    const totals = buckets.reduce((acc, b) => acc + Number(b.total ?? 0), 0);
    const errors = buckets.reduce((acc, b) => acc + Number(b.errors ?? 0), 0);
    if (totals >= 20 && errors / totals > 0.05) {
      await redis.set(FAILOVER_KEY, Date.now() + FAILOVER_TTL_SEC * 1000, "EX", FAILOVER_TTL_SEC);
      logger.warn({ totals, errors }, "Razorpay error-rate breached — triggering failover");
    }
  }
}

export async function createCheckoutOrder(opts: {
  amountPaise: number;
  productCode: string;
  userId?: string;
  scanId?: string;
  customerEmail?: string;
  customerPhone?: string;
}): Promise<CheckoutIntent & { gateway: Gateway }> {
  const gateway = await selectGateway();
  const start = Date.now();
  try {
    let intent: CheckoutIntent;
    if (gateway === "razorpay") {
      intent = await createRazorpayOrder(opts);
    } else {
      intent = await createPaytmOrder(opts);
    }
    await recordGatewayOutcome(gateway, true, Date.now() - start);
    return { ...intent, gateway };
  } catch (err) {
    await recordGatewayOutcome(gateway, false, Date.now() - start);
    // Try the other gateway once
    if (gateway === "razorpay") {
      logger.warn({ err: (err as Error).message }, "Razorpay create failed — retrying on Paytm");
      const intent = await createPaytmOrder(opts);
      return { ...intent, gateway: "paytm" };
    }
    throw err;
  }
}
