import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ulid } from "ulid";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { scans, scanResults } from "../db/schema.js";
import { enqueueScan } from "../queue/index.js";
import { planScan } from "../scanners/index.js";
import { normaliseName } from "../lib/normalise.js";
import { buildCertificateData } from "../pdf/certificate-data.js";
import { renderCertificateHtml } from "../pdf/certificate.js";
import { disabledFeatures } from "../lib/settings.js";
import { generateAlternatives, verifyOwnNames, MAX_OWN_NAMES } from "../lib/alternatives.js";
import { suggestBabyNames, verifyOwnBabyNames } from "../lib/baby-alternatives.js";
import { buildFiveCertificateData } from "../pdf/certificate-five-data.js";
import { renderFiveCertificateHtml } from "../pdf/certificate-five.js";
import { stackHealth, devScanCreate, devScanGet, devRunScanInline, devSpendTokens } from "../lib/devstack.js";
import { spendTokens, tokenCost, refreshPricing, spendAddon, refundAddon } from "../lib/tokens.js";
import { isPaidTier } from "../lib/types.js";
import type { ScanRequest, ScanVerdict, TileResult } from "../lib/types.js";

const submitSchema = z.object({
  name: z.string().min(1).max(64),
  mode: z.enum(["business", "baby"]),
  industry: z.string().max(64).optional(),
  siblingName: z.string().max(64).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  tier: z.enum(["standard", "deep", "keepsake", "shortlist", "agency"]).default("standard"),
  callbackUrl: z.string().url().optional(),
});

export default async function scanRoutes(app: FastifyInstance) {
  // ─────────────────────────────────────────────────────────────
  // POST /v1/scan
  // ─────────────────────────────────────────────────────────────
  app.post("/scan", {
    // 30 free searches per IP per hour — anti-abuse rule R-6 from the PRD
    config: { rateLimit: { max: 30, timeWindow: "1 hour" } },
  }, async (req, reply) => {
    const body = submitSchema.safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({ error: "invalid_body", details: body.error.flatten() });
    }

    let normalisedName: string;
    try {
      normalisedName = normaliseName(body.data.name).capitalised;
    } catch (err) {
      return reply.code(400).send({ error: "invalid_name", message: (err as Error).message });
    }

    const scanId = "scn_" + ulid();
    const plan = planScan(body.data.mode, isPaidTier(body.data.tier) ? "paid" : "free");

    const userId = (req as { userId?: string }).userId;
    const anonymousIp = req.ip;

    // EVERY search is signed-in and costs tokens (4 Aug 2026). There is no
    // free tier: Standard costs 50, Deep costs 350, and an unrecognised tier
    // is charged the maximum rather than let through.
    const health = await stackHealth();
    if (!userId) return reply.code(401).send({ error: "sign_in_required" });

    await refreshPricing(); // quote at the published price, not a stale snapshot
    const cost = tokenCost(body.data.tier, body.data.mode);
    const spend = health.db
      ? await spendTokens(userId, body.data.tier, body.data.mode)
      : devSpendTokens(userId, cost);

    if (!spend.ok) {
      return reply.code(402).send({
        error: "insufficient_tokens",
        needed: cost,
        balance: spend.balance,
        short_by: cost - spend.balance,
      });
    }

    const scanReqBase: ScanRequest = {
      scanId,
      name: body.data.name,
      mode: body.data.mode,
      industry: body.data.industry,
      siblingName: body.data.siblingName,
      birthDate: body.data.birthDate,
      birthTime: body.data.birthTime,
      tier: body.data.tier,
      userId,
      anonymousIp: userId ? undefined : anonymousIp,
    };

    // INLINE MODE — whenever the Redis queue is unavailable, run the scan in
    // the API process and stream over Socket.IO. If Postgres is up, the scan
    // row is written first and results are persisted on completion, so
    // history survives restarts even without Redis.
    if (!health.redis) {
      if (health.db) {
        await db.insert(scans).values({
          id: scanId,
          userId: userId ?? null,
          anonymousIp: userId ? null : anonymousIp,
          name: body.data.name,
          nameNormalised: normalisedName,
          mode: body.data.mode,
          industry: body.data.industry ?? null,
          tier: body.data.tier,
          status: "queued",
          totalTiles: plan.totalTiles,
        });
      }
      devScanCreate(scanReqBase, plan.totalTiles);
      void devRunScanInline(scanReqBase, health.db); // fire and forget — tiles stream over WS
      return reply.code(200).send({
        scan_id: scanId,
        websocket_url: `ws://${req.headers.host}/v1/stream?scanId=${scanId}`,
        eta_seconds: plan.etaSeconds,
        total_tiles: plan.totalTiles,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        inline: true,
      });
    }

    await db.insert(scans).values({
      id: scanId,
      userId: userId ?? null,
      anonymousIp: userId ? null : anonymousIp,
      name: body.data.name,
      nameNormalised: normalisedName,
      mode: body.data.mode,
      industry: body.data.industry ?? null,
      tier: body.data.tier,
      status: "queued",
      totalTiles: plan.totalTiles,
    });

    await enqueueScan(scanReqBase);

    return reply.code(200).send({
      scan_id: scanId,
      websocket_url: `wss://${req.headers.host}/v1/stream?scanId=${scanId}`,
      eta_seconds: plan.etaSeconds,
      total_tiles: plan.totalTiles,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
  });

  // ─────────────────────────────────────────────────────────────
  // GET /v1/scans/:id
  // ─────────────────────────────────────────────────────────────
  app.get("/scans/:id", async (req, reply) => {
    const params = z.object({ id: z.string().regex(/^scn_[0-9A-Z]{26}$/) }).safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: "invalid_id" });

    // No database — serve from the in-memory store
    if (!(await stackHealth()).db) {
      const rec = devScanGet(params.data.id);
      if (!rec) return reply.code(404).send({ error: "scan_not_found" });
      return reply.send({
        scan_id: rec.scanId,
        name: rec.name,
        mode: rec.mode,
        status: rec.status,
        verdict: rec.verdict
          ? {
              score: rec.verdict.score,
              clear: rec.verdict.clear,
              conflict: rec.verdict.conflict,
              warn: rec.verdict.warn,
              info: rec.verdict.info,
              pending: rec.verdict.pending,
            }
          : null,
        tiles: rec.tiles.map((t) => ({
          tile_id: t.tileId,
          category: t.category,
          status: t.status,
          summary: t.summary,
          detail: t.detail,
          source: t.source,
          action_url: t.actionUrl,
        })),
        started_at: rec.startedAt,
        completed_at: rec.completedAt,
        degraded: true,
      });
    }

    const [scan] = await db.select().from(scans).where(eq(scans.id, params.data.id)).limit(1);
    if (!scan) return reply.code(404).send({ error: "scan_not_found" });

    const tiles = await db.select().from(scanResults).where(eq(scanResults.scanId, scan.id));

    return reply.send({
      scan_id: scan.id,
      name: scan.name,
      mode: scan.mode,
      status: scan.status,
      verdict:
        scan.status === "complete"
          ? {
              score: scan.verdictScore,
              clear: scan.clearCount,
              conflict: scan.conflictCount,
              warn: scan.warnCount,
              pending: scan.pendingCount,
            }
          : null,
      tiles: tiles.map((t) => ({
        tile_id: t.tileId,
        category: t.category,
        status: t.status,
        summary: t.summary,
        detail: t.detail,
        source: t.source,
        action_url: t.actionUrl,
      })),
      started_at: scan.startedAt,
      completed_at: scan.completedAt,
    });
  });

  // ─────────────────────────────────────────────────────────────
  // GET /v1/scans/:id/keepsake — the ₹29 baby-name certificate
  // (A4 + Instagram square in one print-ready page)
  // ─────────────────────────────────────────────────────────────
  app.get("/scans/:id/keepsake", async (req, reply) => {
    const params = z.object({ id: z.string().regex(/^scn_[0-9A-Z]{26}$/) }).safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: "invalid_id" });

    const query = z.object({ bornOn: z.string().max(60).optional() }).safeParse(req.query);
    const bornOn = query.success ? query.data.bornOn : undefined;

    let name: string | null = null;
    let tier = "standard";
    let startedAt: Date | undefined;

    if (!(await stackHealth()).db) {
      const rec = devScanGet(params.data.id);
      if (rec) {
        name = rec.name;
        tier = rec.tier;
        startedAt = rec.startedAt;
      }
    } else {
      const [scan] = await db.select().from(scans).where(eq(scans.id, params.data.id)).limit(1);
      if (scan) {
        name = scan.name;
        tier = scan.tier;
        startedAt = scan.startedAt;
      }
    }

    if (!name) return reply.code(404).send({ error: "scan_not_found" });

    /*
     * The certificate ships WITH the naming report rather than being sold
     * separately for ₹29. That is not only a pricing change: a certificate
     * reachable without the report behind it would break the good-parts-only
     * rule, because the report is where the parent learns everything, including
     * anything unfortunate. The certificate celebrates a decision already made
     * with the full picture.
     */
    if (!isPaidTier(tier)) {
      return reply.code(402).send({
        error: "report_required",
        message: "The certificate comes with the full naming report.",
      });
    }

    // A switch in the founder console can take the feature off the shelf.
    if ((await disabledFeatures()).includes("certificate")) {
      return reply.code(503).send({
        error: "feature_off",
        message: "Certificates are switched off at the moment.",
      });
    }

    // `?embed=1` returns the sheet without page chrome, for rendering inside
    // the report page; the default is the standalone printable document.
    const embedded = (req.query as { embed?: string })?.embed === "1";
    const data = await buildCertificateData({ name, birthDate: bornOn, issuedAt: startedAt });
    return reply
      .header("content-type", "text/html; charset=utf-8")
      .send(renderCertificateHtml(data, { embedded }));
  });


  // ─────────────────────────────────────────────────────────────
  // POST /v1/scans/:id/certificate-five — the Shortlist of Five
  // (two A4 pages; paid baby scans only)
  // ─────────────────────────────────────────────────────────────
  app.post("/scans/:id/certificate-five", {
    config: { rateLimit: { max: 20, timeWindow: "1 hour" } },
  }, async (req, reply) => {
    const params = z.object({ id: z.string().regex(/^scn_[0-9A-Z]{26}$/) }).safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: "invalid_id" });

    /*
     * The names travel in the request rather than being read back from the
     * scan. They are on the customer's screen at the moment they press the
     * button — the chosen name may be one they have just typed, and the
     * considered names may be ones they edited. Persisting the shortlist so
     * the document can be re-opened later is worth doing; it is not what makes
     * this request answerable.
     */
    const body = z
      .object({
        name: z.string().min(1).max(64),
        gender: z.enum(["boy", "girl", "unisex"]).optional(),
        birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        birthTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        firstAkshar: z.string().max(12).optional(),
        considered: z
          .array(
            z.object({
              name: z.string().min(1).max(64),
              meaning: z.string().max(240).nullish(),
              startsWith: z.string().max(12).nullish(),
            }),
          )
          .max(5)
          .default([]),
      })
      .safeParse(req.body ?? {});
    if (!body.success) return reply.code(400).send({ error: "invalid_body" });

    let tier = "standard";
    let mode = "business";
    let owner: string | null = null;

    if (!(await stackHealth()).db) {
      const rec = devScanGet(params.data.id);
      if (rec) { tier = rec.tier; mode = rec.mode; }
    } else {
      const [scan] = await db.select().from(scans).where(eq(scans.id, params.data.id)).limit(1);
      if (scan) { tier = scan.tier; mode = scan.mode; owner = scan.userId ?? null; }
      else return reply.code(404).send({ error: "scan_not_found" });
    }

    /*
     * Ownership. The alternatives route still checks none, which is survivable
     * while it is free; this one is about to cost 1,000 tokens, and a scan id
     * is not a secret — it comes back in the POST /scan body and rides in the
     * URL. Anonymous scans have no owner and stay reachable by id.
     */
    const caller = (req as { userId?: string }).userId;
    if (owner && owner !== caller) return reply.code(403).send({ error: "not_your_scan" });

    if (mode !== "baby") return reply.code(400).send({ error: "baby_scans_only" });
    if (!isPaidTier(tier)) return reply.code(402).send({ error: "report_required" });

    // A switch in the founder console can take the feature off the shelf.
    if ((await disabledFeatures()).includes("complete-set")) {
      return reply.code(503).send({
        error: "feature_off",
        message: "The shortlist certificate is switched off at the moment.",
      });
    }

    /*
     * Charged here, and only here. Not in the shortlist endpoint that produced
     * the five names — those are included in the naming report the parent has
     * already paid for. This document is the thing that costs 1,000.
     *
     * Debited BEFORE the render, because the render is where the money goes:
     * a Gemini passage and a full check of the chosen name. The refund below
     * covers the case where that work fails after we have taken payment.
     *
     * An anonymous scan cannot be charged — there is no wallet to charge. In
     * degraded mode there is no database either. Both render without a debit
     * rather than failing, which is the same stance the rest of dev takes.
     */
    /*
     * A scan bought at the "shortlist" tier has already paid for this sheet —
     * that tier IS the 1,000 tokens, report included. Only someone who came
     * up through a plain deep scan is charged here.
     */
    const health = await stackHealth();
    const charged = Boolean(caller) && health.db && tier !== "shortlist";
    if (charged) {
      const spend = await spendAddon(caller as string, "shortlist");
      if (!spend.ok) {
        return reply.code(402).send({
          error: "insufficient_tokens",
          cost: spend.cost,
          balance: spend.balance,
          short_by: spend.cost - spend.balance,
        });
      }
    }

    let data;
    try {
      data = await buildFiveCertificateData({
        name: body.data.name,
        gender: body.data.gender,
        birthDate: body.data.birthDate,
        birthTime: body.data.birthTime,
        firstAkshar: body.data.firstAkshar,
        considered: body.data.considered,
      });
    } catch (err) {
      // Our failure, so the tokens go back. FR-5.5.4.
      if (charged) await refundAddon(caller as string, "shortlist");
      return reply.code(400).send({ error: "invalid_name", message: (err as Error).message });
    }

    const embed = (req.query as { embed?: string })?.embed === "1";
    return reply
      .header("content-type", "text/html; charset=utf-8")
      .send(renderFiveCertificateHtml(data, { embedded: embed }));
  });
  // ─────────────────────────────────────────────────────────────
  // POST /v1/scans/:id/alternatives — 5 verified alternative names
  // (paid scans only — bonus item of the Deep Search, PRD §5.6)
  // ─────────────────────────────────────────────────────────────
  app.post("/scans/:id/alternatives", {
    config: { rateLimit: { max: 10, timeWindow: "1 hour" } },
  }, async (req, reply) => {
    const params = z.object({ id: z.string().regex(/^scn_[0-9A-Z]{26}$/) }).safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: "invalid_id" });

    let name: string | null = null;
    let tier = "standard";
    let mode = "business";
    let conflictReasons: string[] = [];
    /* The scan already worked out the birth star and the numerology. Reading
     * them back off its own tiles keeps the shortlist agreeing with the page
     * the parent is looking at — recomputing them here would let the two
     * drift the first time either engine changed. */
    let scanTiles: Array<{ tileId: string; detail: Record<string, unknown> }> = [];

    if (!(await stackHealth()).db) {
      const rec = devScanGet(params.data.id);
      if (rec) {
        name = rec.name;
        tier = rec.tier;
        mode = rec.mode;
        conflictReasons = rec.tiles.filter((t) => t.status === "no").map((t) => t.summary);
        scanTiles = rec.tiles.map((t) => ({ tileId: t.tileId, detail: (t.detail ?? {}) as Record<string, unknown> }));
      }
    } else {
      const [scan] = await db.select().from(scans).where(eq(scans.id, params.data.id)).limit(1);
      if (scan) {
        name = scan.name;
        tier = scan.tier;
        mode = scan.mode;
        const tiles = await db.select().from(scanResults).where(eq(scanResults.scanId, scan.id));
        conflictReasons = tiles.filter((t) => t.status === "no").map((t) => t.summary ?? "");
        scanTiles = tiles.map((t) => ({ tileId: t.tileId, detail: (t.detail ?? {}) as Record<string, unknown> }));
      }
    }

    if (!name) return reply.code(404).send({ error: "scan_not_found" });
    if (!isPaidTier(tier)) return reply.code(402).send({ error: "payment_required" });

    // The customer chooses: give us their own shortlist, or have us suggest.
    // `names` may hold fewer than five — we check exactly what they gave.
    const body = z
      .object({
        names: z.array(z.string().max(64)).max(MAX_OWN_NAMES).optional(),
        /* Baby mode only. Gender is optional by the founder's decision — it
         * sharpens the suggestions and gates nothing. It is read from the
         * request rather than the scan record because POST /v1/scan does not
         * yet persist it. */
        gender: z.enum(["boy", "girl", "unisex"]).optional(),
        siblingName: z.string().max(64).optional(),
      })
      .safeParse(req.body ?? {});
    if (!body.success) return reply.code(400).send({ error: "invalid_body" });

    const own = (body.data.names ?? []).filter((n) => n.trim().length > 0);

    /*
     * Baby names are not brand names, and the module that generates brand
     * names is not merely unsuited to them - left to its fallback it offers
     * a parent "Aaravkart" and "getAarav", then scores them on whether the
     * .in domain is free. Baby mode gets its own generator and its own
     * checks; see lib/baby-alternatives.ts.
     */
    if (mode === "baby") {
      const rashi = scanTiles.find((x) => x.tileId === "b-rashi")?.detail as
        | { suggestedSyllables?: string[]; nakshatra?: string; rashi?: string }
        | undefined;
      const numerology = scanTiles.find((x) => x.tileId === "lin-num")?.detail as
        | { root?: number }
        | undefined;

      const input = {
        name,
        gender: body.data.gender,
        siblingName: body.data.siblingName,
        syllables: rashi?.suggestedSyllables ?? [],
        nakshatra: rashi?.nakshatra,
        rashi: rashi?.rashi,
        root: numerology?.root,
      };

      const baby = own.length > 0
        ? await verifyOwnBabyNames(own, input)
        : await suggestBabyNames(input);
      return reply.send({ kind: "baby", ...baby });
    }

    const result = own.length > 0
      ? await verifyOwnNames(own)
      : await generateAlternatives(name, undefined, conflictReasons);

    return reply.send({ kind: "business", ...result });
  });

}
