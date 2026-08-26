import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { env, isDev } from "./config.js";
import { logger } from "./logger.js";
import apiRoutes from "./api/index.js";
import { setupWebSocket } from "./ws/server.js";
import { redis } from "./cache/redis.js";
import { stackHealth } from "./lib/devstack.js";
import { db } from "./db/index.js";
import { corpusNames } from "./db/schema.js";
import { registerNameSpellings } from "./lib/transliterate.js";

async function main() {
  const health = await stackHealth();

  /*
   * Load the verified Devanagari spellings before serving anything.
   *
   * Roman spelling does not record vowel length, so the transliterator cannot
   * recover it: left to itself it writes Ram as रम and Ritu as रितु. That
   * spelling reaches the customer on the scan's script tile and, worse, on the
   * keepsake certificate a family frames. Every other Indian script here is
   * derived from the Devanagari, so one wrong vowel is wrong in all ten.
   *
   * Only names with a corroborated spelling are in this table; anything else
   * still falls back to the engine, which is all that can be done for a name
   * nobody has checked.
   */
  if (health.db) {
    try {
      const rows = await db
        .select({ name: corpusNames.name, native: corpusNames.nativeSpelling })
        .from(corpusNames);
      const n = registerNameSpellings(
        rows.flatMap((r) => (r.native ? [[r.name, r.native] as const] : [])),
      );
      logger.info(`Loaded ${n} verified Devanagari spellings.`);
    } catch (err) {
      // An un-migrated database is missing the column. That must not stop the
      // server; the transliterator just carries on doing its best-effort job.
      logger.warn({ err }, "Could not load verified spellings — using transliteration only.");
    }
  }

  // `trustProxy: true` would trust the ENTIRE X-Forwarded-For chain, including
  // whatever the client injected — which made req.ip attacker-controlled and
  // the per-IP rate limit meaningless (rotate the header, get unlimited free
  // scans). A number instead means "trust exactly N proxy hops in front of us",
  // so only the hop OUR infrastructure added is believed.
  //   0 = exposed directly (use the socket address, ignore the header)
  //   1 = one reverse proxy, e.g. nginx on the same box  ← default
  //   2 = CDN in front of nginx, e.g. Cloudflare → nginx
  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 1);
  const app = Fastify({
    logger,
    trustProxy: Number.isFinite(trustProxyHops) && trustProxyHops > 0 ? trustProxyHops : false,
    bodyLimit: 256 * 1024,
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: env.FRONTEND_ORIGIN,
    credentials: false,
    // PUT and DELETE are needed by the admin console (pricing drafts, check
    // toggles, corpus edits). Without them the browser blocks the request at
    // the preflight and the console silently fails to save — curl still
    // works, which is exactly how this hid until 4 Aug 2026.
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  });
  /*
   * 6 Aug 2026: this was `global: false`, which meant the 100/minute ceiling
   * applied to NOTHING. Only routes that named a limit themselves had one, so
   * every route added since — and every route added in future — was unlimited
   * by default. A rate limit you have to remember to opt into is one you will
   * eventually forget.
   *
   * It is now on by default. The stricter per-route limits (sign-in, the
   * API-key password, /scan) still override this downwards; 100/minute is
   * simply the floor nobody has to remember to ask for.
   */
  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: "1 minute",
    // In-memory rate-limit store when Redis is down (dev degraded mode)
    ...(health.redis ? { redis } : {}),
  });

  // Capture raw body for webhook signature verification on /v1/billing/*-webhook
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (req, body, done) => {
      try {
        (req as { rawBody?: string }).rawBody = body as string;
        done(null, body === "" ? {} : JSON.parse(body as string));
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  await app.register(apiRoutes, { prefix: "/v1" });

  const address = await app.listen({ port: env.PORT, host: env.HOST });
  logger.info(`HTTP listening at ${address}`);

  // Attach Socket.IO to the same HTTP server
  await setupWebSocket(app.server);

  if (isDev) {
    logger.info("───────────────────────────────────────────────────────────");
    logger.info("Naam Dekho backend up.");
    logger.info("  REST       → http://localhost:" + env.PORT + "/v1");
    logger.info("  WebSocket  → ws://localhost:" + env.PORT + "/v1/stream");
    logger.info("  Health     → http://localhost:" + env.PORT + "/v1/healthz");
    logger.info("");
    logger.info("Start the worker in another terminal:  npm run dev:worker");
    logger.info("───────────────────────────────────────────────────────────");
  }

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, async () => {
      logger.info(`Received ${signal}, draining…`);
      await app.close();
      process.exit(0);
    });
  }
}

main().catch((err) => {
  logger.fatal({ err: (err as Error).message, stack: (err as Error).stack }, "Server failed to start");
  process.exit(1);
});
