import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
// requestOtp/verifyOtp deliberately not imported — the phone sign-in routes
// were removed on 6 Aug 2026. See the note at the foot of this file.
import { db } from "../db/index.js";
import { users, scans } from "../db/schema.js";
import { stackHealth, devUserGet } from "../lib/devstack.js";
import { signInWithGoogle, isGoogleConfigured } from "../auth/google.js";
import { affords, refreshPricing, currentPricing } from "../lib/tokens.js";
import { isAdminIdentity } from "./admin.js";

export default async function authRoutes(app: FastifyInstance) {
  // ─────────────────────────────────────────────────────────────
  // POST /v1/auth/google — sign in with a Google ID token
  //
  // The token is verified server-side against Google's public keys before
  // we trust a single claim in it. See src/auth/google.ts.
  // ─────────────────────────────────────────────────────────────
  app.post("/auth/google", {
    config: { rateLimit: { max: 20, timeWindow: "10 minutes" } },
  }, async (req, reply) => {
    if (!isGoogleConfigured()) {
      return reply.code(503).send({
        error: "google_not_configured",
        message: "Google sign-in is not set up yet — GOOGLE_CLIENT_ID is missing.",
      });
    }

    const body = z.object({ credential: z.string().min(20).max(8192) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "invalid_body" });

    try {
      const out = await signInWithGoogle(body.data.credential);
      return reply.send({
        id_token: out.idToken,
        user: { id: out.userId, email: out.email },
        is_new_user: out.isNewUser,
      });
    } catch (err) {
      const reason = (err as Error).message;
      // Log the real reason; tell the caller only that it failed.
      app.log.warn({ reason }, "Google sign-in rejected");
      return reply.code(401).send({ error: "google_sign_in_failed" });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // GET /v1/me — current user + credit balance (PRD §9.1)
  // ─────────────────────────────────────────────────────────────
  app.get("/me", async (req, reply) => {
    const userId = (req as { userId?: string }).userId;
    if (!userId) return reply.code(401).send({ error: "unauthorised" });
    await refreshPricing(); // costs below must match what a scan will charge

    if (!(await stackHealth()).db) {
      const u = devUserGet(userId);
      if (!u) return reply.code(404).send({ error: "user_not_found" });
      const bundleValid = !u.creditsExpiresAt || u.creditsExpiresAt.getTime() > Date.now();
      return reply.send({
        id: u.id,
        phone: u.phone,
        email: u.email ?? null,
        // So the nav can show a console link to the founder instead of making
        // them remember the /admin URL.
        is_admin: isAdminIdentity(u.email, u.phone),
        tokens: {
          balance: u.tokens,
          affords: affords(u.tokens),
          costs: currentPricing().costs.business,
        },
        // Legacy shape — kept so nothing breaks mid-deploy. Remove once the
        // frontend everywhere reads .
        credits: {
          free: u.creditsFree,
          bundle: bundleValid ? u.creditsBundle : 0,
          total: u.creditsFree + (bundleValid ? u.creditsBundle : 0),
          bundle_expires_at: u.creditsExpiresAt,
        },
      });
    }

    const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!u) return reply.code(404).send({ error: "user_not_found" });
    const bundleValid = !u.creditsExpiresAt || u.creditsExpiresAt.getTime() > Date.now();
    return reply.send({
      id: u.id,
      phone: u.phone,
      email: u.email ?? null,
      is_admin: isAdminIdentity(u.email, u.phone),
      tokens: {
        balance: u.tokens,
        affords: affords(u.tokens),
        costs: currentPricing().costs.business,
      },
      // Legacy shape — kept so nothing breaks mid-deploy. Remove once the
      // frontend everywhere reads .
      credits: {
        free: u.creditsFree,
        bundle: bundleValid ? u.creditsBundle : 0,
        total: u.creditsFree + (bundleValid ? u.creditsBundle : 0),
        bundle_expires_at: u.creditsExpiresAt,
      },
    });
  });

  // ─────────────────────────────────────────────────────────────
  // GET /v1/me/scans — the user's scan history (most recent first)
  // ─────────────────────────────────────────────────────────────
  app.get("/me/scans", async (req, reply) => {
    const userId = (req as { userId?: string }).userId;
    if (!userId) return reply.code(401).send({ error: "unauthorised" });
    if (!(await stackHealth()).db) return reply.send({ scans: [] });

    const rows = await db
      .select()
      .from(scans)
      .where(eq(scans.userId, userId))
      .orderBy(desc(scans.startedAt))
      .limit(50);

    return reply.send({
      scans: rows.map((s) => ({
        scan_id: s.id,
        name: s.name,
        mode: s.mode,
        tier: s.tier,
        status: s.status,
        verdict_score: s.verdictScore,
        clear: s.clearCount,
        conflict: s.conflictCount,
        started_at: s.startedAt,
      })),
    });
  });

  // ─────────────────────────────────────────────────────────────
  // DELETE /v1/me — DPDP Act data deletion (PRD §6.4: "user-initiated
  // data deletion endpoint live from day one"). Permanently removes the
  // user, their scans and results. Irreversible by design.
  // ─────────────────────────────────────────────────────────────
  app.delete("/me", async (req, reply) => {
    const userId = (req as { userId?: string }).userId;
    if (!userId) return reply.code(401).send({ error: "unauthorised" });
    if (!(await stackHealth()).db) return reply.send({ deleted: true, note: "no persistent data existed" });

    // scans → scan_results cascade on scan deletion; then the user row
    await db.delete(scans).where(eq(scans.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
    app.log.info({ userId }, "DPDP data deletion completed");
    return reply.send({ deleted: true });
  });

  /*
   * REMOVED 6 Aug 2026 — POST /auth/request-otp and POST /auth/verify-otp.
   *
   * Phone sign-in was retired when we moved to Google, but the two routes were
   * left in place. They were not dormant: they were a complete second way to
   * obtain a session, with none of Google's identity checks behind it.
   *
   * Demonstrated against the running server before deleting them. Two requests,
   * no SMS, no Google:
   *   POST /v1/auth/request-otp {"phone":"+919000000001"}  -> dev_code in body
   *   POST /v1/auth/verify-otp  {request_id, code}         -> valid session JWT
   *   GET  /v1/me                                          -> signed in
   *
   * The code was only returned because NODE_ENV was "development" — but that is
   * exactly the point. It made the safety of the whole authentication system
   * depend on one environment variable being right on the live server, and
   * sendSms() has sent nothing since MSG91 was dropped, so in production the
   * route could not have worked for a real customer anyway. It could only ever
   * have been used by someone attacking it.
   *
   * verifyJwt() stays in auth/otp.ts — it validates the sessions Google issues.
   * requestOtp()/verifyOtp() are gone with the routes.
   */
}
