import type { FastifyInstance } from "fastify";
import { getPublishedLegal, isLegalSlug } from "../lib/legalDocs.js";
import { stackHealth } from "../lib/devstack.js";

/**
 * Public access to the legal documents.
 *
 * Deliberately thin, and deliberately forgiving. The frontend ships every
 * document inside its bundle and only asks this route whether an edited
 * version exists. A 404, a 503 or a dropped connection all mean the same
 * thing to the caller — "no override, render what you shipped" — so the
 * privacy policy stays reachable even with the database down. Pages that
 * Razorpay's KYC and the DPDP Act both require to be online are the wrong
 * place to introduce a new way to fail.
 *
 * Only published documents are served. A draft is never public.
 */
export default async function legalRoutes(app: FastifyInstance) {
  app.get<{ Params: { slug: string } }>("/legal/:slug", async (req, reply) => {
    const { slug } = req.params;
    if (!isLegalSlug(slug)) return reply.code(404).send({ error: "unknown_document" });

    // No database means no overrides, which is a normal state, not an error.
    if (!(await stackHealth()).db) return reply.code(404).send({ error: "no_override" });

    try {
      const doc = await getPublishedLegal(slug);
      if (!doc) return reply.code(404).send({ error: "no_override" });
      return reply.send({ document: doc });
    } catch (err) {
      // A failed lookup must not take the page down with it.
      app.log.warn({ err, slug }, "legal document lookup failed; falling back to the bundled copy");
      return reply.code(404).send({ error: "no_override" });
    }
  });
}
