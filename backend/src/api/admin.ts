import type { FastifyInstance } from "fastify";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, scans, auditLog, corpusNames, adminGrants } from "../db/schema.js";
import { stackHealth, devUserGet } from "../lib/devstack.js";
import { grantTokens } from "../lib/tokens.js";
import {
  MANAGED_KEYS, maskKey, checkApiPassword, issueUnlock, verifyUnlock,
  writeEnvKey, isApiPasswordConfigured,
} from "../lib/api-keys.js";
import { usageByProvider, usageDaily } from "../lib/api-usage.js";
import { verifyGoogleIdToken } from "../auth/google.js";
import {
  DEFAULT_PRICING,
  pricingSchema,
  getPricingRow,
  savePricingDraft,
  publishPricing,
  discardPricingDraft,
  disabledScanners,
  setDisabledScanners,
  disabledFeatures,
  setDisabledFeatures,
  FEATURE_IDS,
} from "../lib/settings.js";

/**
 * Admin console API.
 *
 * Two kinds of account can reach it:
 *
 *   OWNER    a Google address listed in ADMIN_EMAILS in .env. Owners cannot be
 *            removed from inside the console. They are the way back in.
 *   GRANTED  an address an owner added from the Admin access screen, stored in
 *            admin_grants. Revocable by an owner at any time. This is how
 *            somebody outside the company gets to look at the console without
 *            being handed the product's own account.
 *
 * There is no separate admin password: you sign in with Google as normal and
 * the account is checked against those two lists. One less credential to leak.
 *
 * This file WAS read-only and its header said so until 23 Aug 2026. It is not
 * any more: pricing, the check catalogue, the name corpus and the access list
 * are all editable from here. Every one of those mutations is written to
 * audit_log before it is reported as successful.
 */

/**
 * Who may see the console.
 *
 * Matches on the Google EMAIL, because sign-in moved to Google on 4 Aug 2026
 * and `users.phone` is now always NULL. ADMIN_PHONES is still read so an older
 * deployment does not silently lock its owner out mid-upgrade.
 */
function adminIdentities(): string[] {
  return `${process.env.ADMIN_EMAILS ?? ""},${process.env.ADMIN_PHONES ?? ""}`
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * An OWNER is an identity named in the environment.
 *
 * The distinction is the whole point of the access screen. Owners are set in
 * ADMIN_EMAILS and cannot be revoked from inside the console, because an admin
 * screen that can remove its own owner is one wrong click from locking the
 * founder out of their product with no way back in. Everyone else was let in by
 * an owner, lives in admin_grants, and can be removed the same way.
 */
export function isOwnerIdentity(...identities: (string | null | undefined)[]): boolean {
  const owners = adminIdentities();
  if (owners.length === 0) return false;
  return identities.some((i) => !!i && owners.includes(i.toLowerCase()));
}

/**
 * Emails granted console access from inside the console.
 *
 * Read from the database on every call. Never cached for an authorisation
 * decision: revoking someone has to take effect on their next request, not
 * when a cache decides to expire.
 */
async function grantedAdminEmails(): Promise<string[]> {
  if (!(await stackHealth()).db) return [];
  try {
    const rows = await db.select({ email: adminGrants.email }).from(adminGrants);
    return rows.map((r) => r.email.toLowerCase());
  } catch {
    // An un-migrated database has no admin_grants table. Owners still get in,
    // which is the safe direction to fail: access is lost, never widened.
    return [];
  }
}

/**
 * A cheap, possibly-stale answer for the UI only.
 *
 * /v1/me calls this to decide whether to show the console link, and it is
 * synchronous because its four call sites are. It reads the environment alone,
 * so a delegated admin does not get the link offered automatically. That is a
 * missing convenience, not a missing permission: /admin still lets them in, and
 * the real check on every admin route is requireAdmin below, which does hit the
 * database. Authorisation is never decided here.
 */
export function isAdminIdentity(...identities: (string | null | undefined)[]): boolean {
  return isOwnerIdentity(...identities);
}

type AdminGate =
  | { ok: true; actor: string; isOwner: boolean }
  | { ok: false; code: number; error: string; signedInAs?: string };

async function requireAdmin(req: unknown): Promise<AdminGate> {
  const userId = (req as { userId?: string }).userId;
  if (!userId) return { ok: false, code: 401, error: "unauthorised" };

  const allowed = adminIdentities();
  if (allowed.length === 0) {
    return { ok: false, code: 503, error: "admin_not_configured" };
  }

  // Check the email first (the Google identity), falling back to phone for
  // any account created under the old OTP flow.
  const identities: string[] = [];
  if ((await stackHealth()).db) {
    const [u] = await db
      .select({ email: users.email, phone: users.phone })
      .from(users)
      .where(sql`${users.id} = ${userId}`)
      .limit(1);
    if (u?.email) identities.push(u.email.toLowerCase());
    if (u?.phone) identities.push(u.phone.toLowerCase());
  } else {
    const u = devUserGet(userId);
    if (u?.email) identities.push(u.email.toLowerCase());
    if (u?.phone) identities.push(u.phone.toLowerCase());
  }

  const owner = identities.some((i) => allowed.includes(i));

  // Not an owner? They may still have been let in from the console. This is a
  // live database read on every request on purpose: a revoked admin loses
  // access on their very next call.
  let granted = false;
  if (!owner) {
    const grants = await grantedAdminEmails();
    granted = identities.some((i) => grants.includes(i));
  }

  if (!owner && !granted) {
    // Name the account. Without this the page just says "not an admin", which
    // is useless when you have two Google accounts and the chooser silently
    // picked the other one — exactly what happened on 4 Aug 2026.
    return {
      ok: false,
      code: 403,
      error: "forbidden",
      signedInAs: identities[0] ?? "unknown",
    };
  }
  return { ok: true, actor: identities[0] ?? "unknown", isOwner: owner };
}

/**
 * One audit row per admin mutation. Append-only, written BEFORE the change is
 * reported back as successful — if the audit insert fails, the whole request
 * fails. An edit that cannot be recorded must not happen.
 */
async function audit(
  actor: string,
  action: string,
  entity: string | null,
  before: unknown,
  after: unknown,
): Promise<void> {
  await db.insert(auditLog).values({
    actor,
    action,
    entity,
    before: before ?? null,
    after: after ?? null,
  });
}

export default async function adminRoutes(app: FastifyInstance) {
  // ─────────────────────────────────────────────────────────────
  // GET /v1/admin/stats — the numbers the founder actually asks for
  // ─────────────────────────────────────────────────────────────
  app.get("/admin/stats", async (req, reply) => {
    const gate = await requireAdmin(req);
    if (!gate.ok) {
      return reply.code(gate.code).send({
        error: gate.error,
        ...(gate.signedInAs ? { signed_in_as: gate.signedInAs } : {}),
      });
    }

    if (!(await stackHealth()).db) {
      return reply.code(503).send({
        error: "database_unavailable",
        message: "Admin figures need the database. Start Postgres and try again.",
      });
    }

    const [userRow] = await db
      .select({
        total: sql<number>`count(*)::int`,
        last7: sql<number>`count(*) filter (where ${users.createdAt} > now() - interval '7 days')::int`,
        last24h: sql<number>`count(*) filter (where ${users.createdAt} > now() - interval '24 hours')::int`,
        tokens: sql<number>`coalesce(sum(${users.tokens}), 0)::int`,
      })
      .from(users);

    const [scanRow] = await db
      .select({
        total: sql<number>`count(*)::int`,
        last7: sql<number>`count(*) filter (where ${scans.startedAt} > now() - interval '7 days')::int`,
        last24h: sql<number>`count(*) filter (where ${scans.startedAt} > now() - interval '24 hours')::int`,
        // 'standard' since the 4 Aug 2026 rename — 'free' no longer exists in
        // the enum, and querying it throws rather than returning zero.
        deepSearches: sql<number>`count(*) filter (where ${scans.tier} <> 'standard')::int`,
        business: sql<number>`count(*) filter (where ${scans.mode} = 'business')::int`,
        baby: sql<number>`count(*) filter (where ${scans.mode} = 'baby')::int`,
        completed: sql<number>`count(*) filter (where ${scans.status} = 'complete')::int`,
        avgScore: sql<number>`coalesce(round(avg(${scans.verdictScore})), 0)::int`,
      })
      .from(scans);

    // What people are actually searching — the most useful single list for
    // deciding which name pages to publish next.
    const topNames = await db
      .select({
        name: scans.name,
        searches: sql<number>`count(*)::int`,
      })
      .from(scans)
      .groupBy(scans.name)
      .orderBy(sql`count(*) desc`)
      .limit(20);

    const daily = await db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${scans.startedAt}), 'YYYY-MM-DD')`,
        searches: sql<number>`count(*)::int`,
      })
      .from(scans)
      .where(sql`${scans.startedAt} > now() - interval '14 days'`)
      .groupBy(sql`date_trunc('day', ${scans.startedAt})`)
      .orderBy(sql`date_trunc('day', ${scans.startedAt})`);

    return reply.send({
      users: {
        total: userRow?.total ?? 0,
        last_7_days: userRow?.last7 ?? 0,
        last_24_hours: userRow?.last24h ?? 0,
        tokens_outstanding: userRow?.tokens ?? 0,
      },
      scans: {
        total: scanRow?.total ?? 0,
        last_7_days: scanRow?.last7 ?? 0,
        last_24_hours: scanRow?.last24h ?? 0,
        deep_searches: scanRow?.deepSearches ?? 0,
        completed: scanRow?.completed ?? 0,
        business: scanRow?.business ?? 0,
        baby: scanRow?.baby ?? 0,
        average_verdict: scanRow?.avgScore ?? 0,
      },
      // Revenue is deliberately NOT estimated from scan counts — until
      // Razorpay is live there are no real payments, and a made-up number
      // on a dashboard is worse than no number.
      revenue: { status: "not_live", note: "Razorpay is not connected yet — no payments have been taken." },
      top_names: topNames,
      daily_searches: daily,
      generated_at: new Date().toISOString(),
    });
  });

  // ─────────────────────────────────────────────────────────────
  // GET /v1/admin/recent — the latest searches, for spot-checking quality
  // ─────────────────────────────────────────────────────────────
  app.get("/admin/recent", async (req, reply) => {
    const gate = await requireAdmin(req);
    if (!gate.ok) {
      return reply.code(gate.code).send({
        error: gate.error,
        ...(gate.signedInAs ? { signed_in_as: gate.signedInAs } : {}),
      });
    }

    if (!(await stackHealth()).db) {
      return reply.code(503).send({ error: "database_unavailable" });
    }

    const rows = await db
      .select({
        scanId: scans.id,
        name: scans.name,
        mode: scans.mode,
        tier: scans.tier,
        status: scans.status,
        score: scans.verdictScore,
        conflicts: scans.conflictCount,
        startedAt: scans.startedAt,
      })
      .from(scans)
      .orderBy(sql`${scans.startedAt} desc`)
      .limit(50);

    return reply.send({ scans: rows });
  });

  // ═════════════════════════════════════════════════════════════
  // WRITE ROUTES (super admin, 4 Aug 2026). Every mutation writes an
  // audit row FIRST — an edit that cannot be recorded must not happen.
  // ═════════════════════════════════════════════════════════════

  // ── Pricing: draft → preview → publish ───────────────────────
  app.get("/admin/settings/pricing", async (req, reply) => {
    const gate = await requireAdmin(req);
    if (!gate.ok) return reply.code(gate.code).send({ error: gate.error });
    const row = await getPricingRow();
    return reply.send({ ...row, defaults: DEFAULT_PRICING });
  });

  app.put("/admin/settings/pricing/draft", async (req, reply) => {
    const gate = await requireAdmin(req);
    if (!gate.ok) return reply.code(gate.code).send({ error: gate.error });
    const parsed = pricingSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_pricing", details: parsed.error.flatten() });
    }
    const before = (await getPricingRow()).draft;
    await audit(gate.actor, "pricing.draft", "pricing", before, parsed.data);
    await savePricingDraft(parsed.data, gate.actor);
    return reply.send({ saved: true, draft: parsed.data });
  });

  app.post("/admin/settings/pricing/publish", async (req, reply) => {
    const gate = await requireAdmin(req);
    if (!gate.ok) return reply.code(gate.code).send({ error: gate.error });
    const result = await publishPricing(gate.actor);
    if (!result) return reply.code(409).send({ error: "no_draft_to_publish" });
    await audit(gate.actor, "pricing.publish", "pricing", result.before, result.after);
    return reply.send({ published: true, pricing: result.after });
  });

  app.post("/admin/settings/pricing/discard", async (req, reply) => {
    const gate = await requireAdmin(req);
    if (!gate.ok) return reply.code(gate.code).send({ error: gate.error });
    const before = (await getPricingRow()).draft;
    if (before) await audit(gate.actor, "pricing.discard", "pricing", before, null);
    await discardPricingDraft(gate.actor);
    return reply.send({ discarded: true });
  });

  // ── Check toggles ────────────────────────────────────────────
  app.get("/admin/scanners", async (req, reply) => {
    const gate = await requireAdmin(req);
    if (!gate.ok) return reply.code(gate.code).send({ error: gate.error });
    return reply.send({ disabled: await disabledScanners() });
  });

  app.put("/admin/scanners", async (req, reply) => {
    const gate = await requireAdmin(req);
    if (!gate.ok) return reply.code(gate.code).send({ error: gate.error });
    const parsed = z.object({ disabled: z.array(z.string().min(1).max(40)).max(64) }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_body" });
    const before = await disabledScanners();
    await audit(gate.actor, "scanners.update", "scanners", { disabled: before }, parsed.data);
    await setDisabledScanners(parsed.data.disabled, gate.actor);
    return reply.send({ saved: true, disabled: parsed.data.disabled });
  });


  // ── Feature switches ─────────────────────────────────────────
  //
  // Kept separate from the scanner toggles above, and deliberately so: a
  // scanner is a CHECK that produces a tile, a feature is something we SELL.
  // Switching off a check hides a row; switching off a feature stops a
  // purchase, and the two should never be one list where a mis-click does the
  // wrong one.
  //
  // setDisabledFeatures had no caller until now, so these could only be
  // switched off by editing the database by hand.
  app.get("/admin/features", async (req, reply) => {
    const gate = await requireAdmin(req);
    if (!gate.ok) return reply.code(gate.code).send({ error: gate.error });
    const disabled = await disabledFeatures();
    return reply.send({
      features: FEATURE_IDS.map((id) => ({
        id,
        label:
          id === "certificate"
            ? "Naming certificate (one page, with the naming report)"
            : "Shortlist of Five certificate (two pages, 1,000 tokens)",
        enabled: !disabled.includes(id),
      })),
    });
  });

  app.put("/admin/features", async (req, reply) => {
    const gate = await requireAdmin(req);
    if (!gate.ok) return reply.code(gate.code).send({ error: gate.error });
    // Only ids we actually know. An unknown id here would be a switch that
    // turns nothing off while looking like it did.
    const parsed = z
      .object({ disabled: z.array(z.enum(FEATURE_IDS)).max(FEATURE_IDS.length) })
      .safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_body" });
    const before = await disabledFeatures();
    await audit(gate.actor, "features.update", "features", { disabled: before }, parsed.data);
    await setDisabledFeatures(parsed.data.disabled);
    return reply.send({ saved: true, disabled: parsed.data.disabled });
  });
  // ── Token grants (support gestures + the founder's test wallet) ──
  app.post("/admin/tokens/grant", async (req, reply) => {
    const gate = await requireAdmin(req);
    if (!gate.ok) return reply.code(gate.code).send({ error: gate.error });
    const parsed = z.object({
      email: z.string().email(),
      amount: z.number().int().min(1).max(1_000_000),
      note: z.string().max(200).optional(),
    }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_body" });

    const [target] = await db
      .select({ id: users.id, tokens: users.tokens })
      .from(users)
      .where(sql`lower(${users.email}) = ${parsed.data.email.toLowerCase()}`)
      .limit(1);
    if (!target) return reply.code(404).send({ error: "user_not_found" });

    await audit(gate.actor, "tokens.grant", parsed.data.email, { tokens: target.tokens }, {
      tokens: target.tokens + parsed.data.amount,
      note: parsed.data.note ?? null,
    });
    await grantTokens(target.id, parsed.data.amount);
    return reply.send({ granted: parsed.data.amount, balance: target.tokens + parsed.data.amount });
  });

  // ── Users (read) ─────────────────────────────────────────────
  app.get("/admin/users", async (req, reply) => {
    const gate = await requireAdmin(req);
    if (!gate.ok) return reply.code(gate.code).send({ error: gate.error });
    // LEFT JOIN + GROUP BY rather than a correlated subquery: inside a
    // template subquery drizzle renders the column references ambiguously
    // (it tried to compare a scan id against users.id), and a join is
    // cheaper anyway.
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        phone: users.phone,
        tokens: users.tokens,
        createdAt: users.createdAt,
        searches: sql<number>`count(${scans.id})::int`,
      })
      .from(users)
      .leftJoin(scans, eq(scans.userId, users.id))
      .groupBy(users.id, users.email, users.phone, users.tokens, users.createdAt)
      .orderBy(sql`${users.createdAt} desc`)
      .limit(200);
    return reply.send({ users: rows });
  });

  // ── Admin access ─────────────────────────────────────────────
  /**
   * Who can see this console.
   *
   * Two kinds of entry, and the difference is deliberate:
   *
   *   OWNER    named in ADMIN_EMAILS. Cannot be revoked from here. This is the
   *            product's own account, and an access screen that can delete it
   *            is one click away from locking the founder out permanently.
   *   GRANTED  let in by an owner, revocable by an owner. This is how a
   *            developer gets to look at the console without being handed the
   *            product's own credentials.
   *
   * Any admin may READ this list, because a person should be able to see who
   * else can see their data. Only an OWNER may change it.
   */
  app.get("/admin/access", async (req, reply) => {
    const gate = await requireAdmin(req);
    if (!gate.ok) return reply.code(gate.code).send({ error: gate.error });

    const owners = adminIdentities();
    const rows = await db.select().from(adminGrants).orderBy(adminGrants.grantedAt);

    return reply.send({
      you: gate.actor,
      youAreOwner: gate.isOwner,
      // Owners are listed so the screen can show WHY they cannot be removed,
      // rather than a delete button that mysteriously fails.
      owners: owners.map((email) => ({ email, source: "ADMIN_EMAILS", removable: false })),
      granted: rows.map((r) => ({
        email: r.email,
        grantedBy: r.grantedBy,
        note: r.note,
        grantedAt: r.grantedAt,
        removable: true,
      })),
      total: owners.length + rows.length,
    });
  });

  const grantBody = z.object({
    email: z.string().email().max(160),
    note: z.string().max(200).nullish(),
  });

  app.post("/admin/access", async (req, reply) => {
    const gate = await requireAdmin(req);
    if (!gate.ok) return reply.code(gate.code).send({ error: gate.error });
    if (!gate.isOwner) {
      return reply.code(403).send({
        error: "owner_only",
        message: "Only an owner account can give someone else admin access.",
      });
    }

    const parsed = grantBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_body" });

    const email = parsed.data.email.trim().toLowerCase();

    // Granting an owner would create a removable row shadowing an unremovable
    // identity, and revoking it later would look like it had done something.
    if (adminIdentities().includes(email)) {
      return reply.code(409).send({
        error: "already_owner",
        message: "That address is already an owner and always has access.",
      });
    }

    await audit(gate.actor, "admin.access.grant", email, null, { note: parsed.data.note ?? null });
    await db
      .insert(adminGrants)
      .values({ email, grantedBy: gate.actor, note: parsed.data.note ?? null })
      .onConflictDoUpdate({
        target: adminGrants.email,
        set: { grantedBy: gate.actor, note: parsed.data.note ?? null, grantedAt: new Date() },
      });

    return reply.send({ ok: true, email });
  });

  app.delete("/admin/access/:email", async (req, reply) => {
    const gate = await requireAdmin(req);
    if (!gate.ok) return reply.code(gate.code).send({ error: gate.error });
    if (!gate.isOwner) {
      return reply.code(403).send({
        error: "owner_only",
        message: "Only an owner account can remove admin access.",
      });
    }

    const email = String((req as { params: { email: string } }).params.email).trim().toLowerCase();

    // The rule this whole screen exists to enforce.
    if (adminIdentities().includes(email)) {
      return reply.code(403).send({
        error: "owner_locked",
        message:
          "This is an owner account, set in ADMIN_EMAILS. It cannot be removed from the console. " +
          "Change the environment variable and restart if you really mean to.",
      });
    }

    const [before] = await db.select().from(adminGrants).where(eq(adminGrants.email, email)).limit(1);
    if (!before) return reply.code(404).send({ error: "not_found" });

    await audit(gate.actor, "admin.access.revoke", email, before, null);
    await db.delete(adminGrants).where(eq(adminGrants.email, email));

    return reply.send({ ok: true, email });
  });

  // ── SEO pages ────────────────────────────────────────────────
  /**
   * What the static page build actually put on disk.
   *
   * Reads the files rather than re-running the builders, because the question
   * being asked is "what is live right now", and a builder would answer "what
   * would be live if I ran". A stale sitemap is exactly the kind of thing this
   * page exists to surface.
   *
   * These pages are deliberately unlinked from the customer navigation, which
   * makes them easy to forget and impossible to check by browsing the site.
   * This endpoint is where they become visible.
   */
  app.get("/admin/seo", async (req, reply) => {
    const gate = await requireAdmin(req);
    if (!gate.ok) return reply.code(gate.code).send({ error: gate.error });

    const PUBLIC_DIR = resolve(process.cwd(), "../frontend-jsx/public");
    const CLUSTERS = [
      { key: "names", label: "Baby name pages", dir: "n", what: "One per name: meaning, numerology, rashi, nicknames, 10 scripts" },
      { key: "nakshatra", label: "Nakshatra", dir: "nakshatra", what: "The 27 birth stars, their padas and starting syllables" },
      { key: "rashi", label: "Rashi", dir: "rashi", what: "The 12 moon signs and the syllables belonging to each" },
      { key: "numerology", label: "Numerology", dir: "numerology", what: "Chaldean root numbers 1-9, ruling planets, industry fit" },
      { key: "names-by", label: "Names by letter & meaning", dir: "names", what: "Starting-letter and meaning-theme listings" },
      { key: "domains", label: "Domain endings", dir: "domains", what: "The 14 endings we check, with first-year prices" },
      { key: "trademark", label: "Trademark classes", dir: "trademark-class", what: "The 45 Nice classes and what files in each" },
      { key: "script", label: "Scripts", dir: "script", what: "Names written in each of the 10 Indian scripts" },
      { key: "explore", label: "Hub", dir: "explore", what: "The index that links every cluster together" },
    ];

    const clusters = await Promise.all(
      CLUSTERS.map(async (c) => {
        const dir = join(PUBLIC_DIR, c.dir);
        let files: string[] = [];
        let newest: number | null = null;
        try {
          files = (await readdir(dir)).filter((f) => f.endsWith(".html"));
          // Sampling the mtimes is enough to answer "was this built recently";
          // stat-ing 537 files to answer it would not be.
          for (const f of files.slice(0, 40)) {
            const s = await stat(join(dir, f));
            if (newest === null || s.mtimeMs > newest) newest = s.mtimeMs;
          }
        } catch {
          // An absent directory means this cluster has never been built.
        }
        return {
          ...c,
          pages: files.length,
          builtAt: newest ? new Date(newest).toISOString() : null,
          sample: files.filter((f) => f !== "index.html").slice(0, 6).map((f) => `/${c.dir}/${f}`),
          url: `/${c.dir}/`,
        };
      }),
    );

    let sitemapUrls = 0;
    let sitemapAt: string | null = null;
    try {
      const xml = await readFile(join(PUBLIC_DIR, "sitemap.xml"), "utf8");
      sitemapUrls = (xml.match(/<loc>/g) ?? []).length;
      sitemapAt = new Date((await stat(join(PUBLIC_DIR, "sitemap.xml"))).mtimeMs).toISOString();
    } catch {
      // No sitemap yet — the page says so rather than showing a confident zero.
    }

    const totalPages = clusters.reduce((n, c) => n + c.pages, 0);
    return reply.send({
      clusters,
      totalPages,
      sitemapUrls,
      sitemapAt,
      buildCommand: "npm run build:names",
    });
  });

  // ── Corpus (name pages) ──────────────────────────────────────
  app.get("/admin/corpus", async (req, reply) => {
    const gate = await requireAdmin(req);
    if (!gate.ok) return reply.code(gate.code).send({ error: gate.error });
    const rows = await db.select().from(corpusNames).orderBy(corpusNames.name);
    return reply.send({ names: rows, total: rows.length });
  });

  const corpusEntry = z.object({
    name: z.string().min(2).max(40),
    gender: z.enum(["boy", "girl", "unisex"]).nullish(),
    origin: z.string().max(60).nullish(),
    meaning: z.string().max(300).nullish(),
    meaningSource: z.string().max(120).nullish(),
    meaningUrl: z.string().url().max(300).nullish(),
    verified: z.boolean().default(false),
    published: z.boolean().default(false),
  });

  app.put("/admin/corpus/:slug", async (req, reply) => {
    const gate = await requireAdmin(req);
    if (!gate.ok) return reply.code(gate.code).send({ error: gate.error });
    const slug = (req.params as { slug: string }).slug.toLowerCase();
    const parsed = corpusEntry.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_body", details: parsed.error.flatten() });
    // HONESTY GATE: a meaning may only be marked verified with a source.
    if (parsed.data.verified && parsed.data.meaning && !parsed.data.meaningSource) {
      return reply.code(400).send({ error: "verified_needs_source", message: "A verified meaning must name its source." });
    }
    const [before] = await db.select().from(corpusNames).where(eq(corpusNames.slug, slug)).limit(1);
    await audit(gate.actor, before ? "corpus.update" : "corpus.create", slug, before ?? null, parsed.data);
    await db
      .insert(corpusNames)
      .values({ slug, ...parsed.data, updatedAt: new Date() })
      .onConflictDoUpdate({ target: corpusNames.slug, set: { ...parsed.data, updatedAt: new Date() } });
    return reply.send({ saved: true, slug });
  });

  app.delete("/admin/corpus/:slug", async (req, reply) => {
    const gate = await requireAdmin(req);
    if (!gate.ok) return reply.code(gate.code).send({ error: gate.error });
    const slug = (req.params as { slug: string }).slug.toLowerCase();
    const [before] = await db.select().from(corpusNames).where(eq(corpusNames.slug, slug)).limit(1);
    if (!before) return reply.code(404).send({ error: "not_found" });
    await audit(gate.actor, "corpus.delete", slug, before, null);
    await db.delete(corpusNames).where(eq(corpusNames.slug, slug));
    return reply.send({ deleted: true });
  });

  // Bulk import — how the 50 existing and the 450 new names arrive.
  app.post("/admin/corpus/import", async (req, reply) => {
    const gate = await requireAdmin(req);
    if (!gate.ok) return reply.code(gate.code).send({ error: gate.error });
    const parsed = z.object({ names: z.array(corpusEntry).min(1).max(1000) }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_body" });
    await audit(gate.actor, "corpus.import", null, null, { count: parsed.data.names.length });
    let imported = 0;
    for (const entry of parsed.data.names) {
      const slug = entry.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      await db
        .insert(corpusNames)
        .values({ slug, ...entry, updatedAt: new Date() })
        .onConflictDoUpdate({ target: corpusNames.slug, set: { ...entry, updatedAt: new Date() } });
      imported++;
    }
    return reply.send({ imported });
  });

  // ═════════════════════════════════════════════════════════════
  // API KEYS — behind a SECOND password, separate from admin access.
  // Being signed in as the founder is not enough to reach this.
  // ═════════════════════════════════════════════════════════════

  app.post("/admin/api-keys/unlock", {
    // Slow down guessing. Ten tries per ten minutes is ample for a human and
    // useless for a script.
    config: { rateLimit: { max: 10, timeWindow: "10 minutes" } },
  }, async (req, reply) => {
    const gate = await requireAdmin(req);
    if (!gate.ok) return reply.code(gate.code).send({ error: gate.error });

    if (!isApiPasswordConfigured()) {
      return reply.code(503).send({
        error: "api_password_not_set",
        message: "Set ADMIN_API_PASSWORD in backend/.env and restart, then this screen unlocks.",
      });
    }

    const body = z.object({ password: z.string().min(1).max(200) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "invalid_body" });

    if (!checkApiPassword(body.data.password)) {
      // Recorded: a wrong password on this screen is worth knowing about.
      await audit(gate.actor, "apikeys.unlock_failed", null, null, null);
      return reply.code(401).send({ error: "wrong_password" });
    }

    await audit(gate.actor, "apikeys.unlock", null, null, null);
    return reply.send({ unlock: issueUnlock(gate.actor), expires_in_minutes: 15 });
  });

  /**
   * Change the second password.
   *
   * Being signed in is NOT enough — that is the entire reason this password
   * exists. You must additionally prove one of two things:
   *
   *   a) you know the current password, or
   *   b) you are at the keyboard right now, by signing in with Google again
   *      and sending that fresh token. "Fresh" is enforced: a token more than
   *      five minutes old is refused, so one lifted from browser storage is
   *      no help to anyone.
   *
   * (b) is also the recovery path when the password has been forgotten, which
   * is why it exists at all — otherwise the only way back in is editing .env
   * on the server.
   */
  app.post("/admin/api-keys/password", {
    config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
  }, async (req, reply) => {
    const gate = await requireAdmin(req);
    if (!gate.ok) return reply.code(gate.code).send({ error: gate.error });

    /*
     * The rule that guards the key that moves your money.
     *
     * It was min(4) — which is how the live value came to be "1234". Four
     * digits is 10,000 possibilities; the 10-per-10-minutes limit on /unlock
     * makes that about a week of unattended guessing. Twelve characters with
     * some variety puts it beyond any effort worth making.
     *
     * The obvious-password list is short on purpose. It is not a leak
     * database — it catches the handful anyone actually types when they mean
     * "I'll change this later", which is exactly how weak passwords survive
     * to launch day.
     */
    const OBVIOUS = new Set([
      "password", "password1", "passw0rd", "123456", "12345678", "123456789",
      "1234567890", "qwerty", "qwerty123", "abc123", "letmein", "welcome",
      "admin", "admin123", "administrator", "iloveyou", "monkey", "dragon",
      "naamdekho", "naamdekho1", "changeme", "secret", "temporary", "test1234",
    ]);
    const body = z.object({
      newPassword: z.string().min(12).max(200)
        .refine((p) => !OBVIOUS.has(p.toLowerCase().replace(/[^a-z0-9]/g, "")),
          { message: "That is one of the first passwords anyone tries. Pick another." })
        .refine((p) => new Set(p).size >= 5,
          { message: "Too repetitive — use at least five different characters." })
        .refine((p) => !/^\d+$/.test(p),
          { message: "Digits only is guessable. Add letters." }),
      currentPassword: z.string().max(200).optional(),
      credential: z.string().min(20).max(8192).optional(),
    }).safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({
        error: "weak_password",
        // The specific reason, so the founder is not left guessing which rule
        // they tripped — a vague rejection is how people end up with "1234".
        message: body.error.issues[0]?.message
          ?? "Use at least 12 characters, not all digits, and not an obvious one.",
      });
    }

    let how: "current_password" | "google_reauth";

    if (body.data.currentPassword && checkApiPassword(body.data.currentPassword)) {
      how = "current_password";
    } else if (body.data.credential) {
      try {
        const identity = await verifyGoogleIdToken(body.data.credential);
        // The token must belong to an admin AND have been issued moments ago.
        if (!isAdminIdentity(identity.email)) {
          return reply.code(403).send({ error: "not_an_admin", signed_in_as: identity.email });
        }
        const ageSeconds = Math.floor(Date.now() / 1000) - identity.issuedAt;
        if (identity.issuedAt === 0 || ageSeconds > 300) {
          return reply.code(401).send({
            error: "stale_verification",
            message: "That sign-in is too old. Verify again and change the password within five minutes.",
          });
        }
        how = "google_reauth";
      } catch {
        return reply.code(401).send({ error: "verification_failed" });
      }
    } else {
      return reply.code(401).send({
        error: "verification_required",
        message: "Enter the current password, or verify with Google to set a new one.",
      });
    }

    const result = writeEnvKey("ADMIN_API_PASSWORD", body.data.newPassword);
    if (!result.ok) return reply.code(500).send({ error: result.error });

    // The audit records that it changed and how it was authorised — never the
    // password itself, old or new.
    await audit(gate.actor, "apikeys.password_changed", null, null, { verified_by: how });

    return reply.send({
      changed: true,
      verified_by: how,
      note: "The new password is active immediately. Any existing unlock stays valid until it expires.",
    });
  });

  /** Masked keys + usage + our cost estimate. Never returns a full secret. */
  app.get("/admin/api-keys", async (req, reply) => {
    const gate = await requireAdmin(req);
    if (!gate.ok) return reply.code(gate.code).send({ error: gate.error });

    const unlock = verifyUnlock((req.headers["x-api-unlock"] as string | undefined) ?? undefined);
    if (!unlock.ok) return reply.code(401).send({ error: "locked" });

    const [usage, daily] = await Promise.all([usageByProvider(), usageDaily()]);

    return reply.send({
      keys: MANAGED_KEYS.map((k) => ({
        env: k.env,
        label: k.label,
        provider: k.provider,
        secret: k.secret,
        // Free or paid. Without this the console cannot split the list, and
        // every key silently falls into the "free" bucket.
        tier: k.tier,
        set: Boolean(process.env[k.env]?.trim()),
        masked: maskKey(process.env[k.env], k.secret),
      })),
      usage,
      daily,
      // Said on every response so it can never be read as an invoice.
      cost_note:
        "Our own count of calls made, multiplied by each provider's published rate. " +
        "An estimate, not a bill — providers round, bundle, and apply free tiers. " +
        "Check the provider's own dashboard before making a financial decision.",
    });
  });

  /** Replace a key. Write-only by design — nothing is ever read back. */
  app.put("/admin/api-keys/:key", async (req, reply) => {
    const gate = await requireAdmin(req);
    if (!gate.ok) return reply.code(gate.code).send({ error: gate.error });

    const unlock = verifyUnlock((req.headers["x-api-unlock"] as string | undefined) ?? undefined);
    if (!unlock.ok) return reply.code(401).send({ error: "locked" });

    const key = (req.params as { key: string }).key;
    const body = z.object({ value: z.string().min(1).max(400) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "invalid_body" });

    const before = process.env[key]?.trim();
    const result = writeEnvKey(key, body.data.value.trim());
    if (!result.ok) return reply.code(400).send({ error: result.error });

    // The audit records THAT the key changed and its masked shape — never the
    // secret itself. An audit log that stores credentials is a second copy of
    // the thing you were protecting.
    const meta = MANAGED_KEYS.find((k) => k.env === key)!;
    await audit(gate.actor, "apikeys.replace", key,
      { was_set: Boolean(before), masked: maskKey(before, meta.secret) },
      { masked: maskKey(body.data.value.trim(), meta.secret) });

    return reply.send({
      saved: true,
      masked: maskKey(body.data.value.trim(), meta.secret),
      note: "Saved to .env. Some checks pick it up immediately; restart the backend to be certain.",
    });
  });

  // ── Audit log (read) ─────────────────────────────────────────
  app.get("/admin/audit", async (req, reply) => {
    const gate = await requireAdmin(req);
    if (!gate.ok) return reply.code(gate.code).send({ error: gate.error });
    const rows = await db.select().from(auditLog).orderBy(sql`${auditLog.at} desc`).limit(200);
    return reply.send({ entries: rows });
  });
}
