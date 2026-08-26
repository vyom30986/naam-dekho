import IORedis, { Redis } from "ioredis";
import { env, isDev } from "../config.js";

/**
 * Three connections by convention:
 *  - `redis`     — general cache and rate-limit
 *  - `pubClient` — Socket.IO publisher
 *  - `subClient` — Socket.IO subscriber (BullMQ also reuses pub for queues)
 *
 * ioredis re-uses TCP and is safe to share for cache ops but pub/sub must be
 * on a dedicated subscriber connection.
 *
 * DEVELOPMENT FALLBACK: when Redis is unreachable in development, the cache
 * helpers fall back to a per-process in-memory store so scanners still run
 * (single-process only — no shared rate limits). Production behaviour is
 * unchanged: Redis is required.
 */
const connectionOpts = {
  maxRetriesPerRequest: null as null, // required by BullMQ
  enableReadyCheck: false,
  // In development, stop hammering a missing Redis after a few attempts;
  // in production keep ioredis' retry-forever default.
  ...(isDev ? { retryStrategy: (times: number) => (times > 3 ? null : 500) } : {}),
};

export const redis: Redis = new IORedis(env.REDIS_URL, connectionOpts);

export const pubClient: Redis = new IORedis(env.REDIS_URL, connectionOpts);

export const subClient: Redis = pubClient.duplicate();

// Prevent "Unhandled error event" spam — availability is handled explicitly below.
for (const client of [redis, pubClient, subClient]) {
  client.on("error", () => { /* handled via redisAvailable() probe */ });
}

// ── Development in-memory fallback ─────────────────────────────
let redisProbe: Promise<boolean> | null = null; // memoised — probe runs once
const memCache = new Map<string, { value: unknown; expiresAt: number }>();
const memBuckets = new Map<string, { tokens: number; last: number }>();

function redisAvailable(): Promise<boolean> {
  if (!isDev) return Promise.resolve(true); // production: always use Redis, fail loudly if down
  if (redisProbe) return redisProbe;
  redisProbe = (async () => {
    try {
      await Promise.race([
        redis.ping(),
        new Promise((_, rej) => setTimeout(() => rej(new Error("redis ping timeout")), 1_000)),
      ]);
      return true;
    } catch {
      // eslint-disable-next-line no-console
      console.warn("[cache] Redis unreachable — using in-memory dev fallback (no shared rate limits)");
      return false;
    }
  })();
  return redisProbe;
}

// Cache helpers
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!(await redisAvailable())) {
    const hit = memCache.get(key);
    if (!hit || hit.expiresAt < Date.now()) return null;
    return hit.value as T;
  }
  const raw = await redis.get(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!(await redisAvailable())) {
    memCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1_000 });
    return;
  }
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;
  const value = await loader();
  await cacheSet(key, value, ttlSeconds);
  return value;
}

// Simple token-bucket rate limiter (per source)
export async function tryTake(bucket: string, capacity: number, refillPerSec: number): Promise<boolean> {
  if (!(await redisAvailable())) {
    // In-memory token bucket (per-process; dev only)
    const now = Math.floor(Date.now() / 1000);
    const b = memBuckets.get(bucket) ?? { tokens: capacity, last: now };
    const delta = Math.max(0, now - b.last);
    b.tokens = Math.min(capacity, b.tokens + delta * refillPerSec);
    b.last = now;
    const allowed = b.tokens >= 1;
    if (allowed) b.tokens -= 1;
    memBuckets.set(bucket, b);
    return allowed;
  }
  const key = `ratelimit:${bucket}`;
  const now = Math.floor(Date.now() / 1000);
  const lua = `
    local tokens = tonumber(redis.call('hget', KEYS[1], 'tokens') or ARGV[1])
    local last   = tonumber(redis.call('hget', KEYS[1], 'last') or ARGV[3])
    local refill = tonumber(ARGV[2])
    local cap    = tonumber(ARGV[1])
    local now    = tonumber(ARGV[3])
    local delta  = math.max(0, now - last)
    tokens = math.min(cap, tokens + delta * refill)
    local allowed = 0
    if tokens >= 1 then tokens = tokens - 1; allowed = 1 end
    redis.call('hset', KEYS[1], 'tokens', tokens, 'last', now)
    redis.call('expire', KEYS[1], 600)
    return allowed
  `;
  const result = (await redis.eval(lua, 1, key, capacity.toString(), refillPerSec.toString(), now.toString())) as number;
  return result === 1;
}
