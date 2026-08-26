import type { FastifyInstance } from "fastify";
import { getPricing, getPricingRow } from "../lib/settings.js";
import { stackHealth } from "../lib/devstack.js";
import { isAdminIdentity } from "./admin.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

/**
 * GET /v1/pricing — the published prices, public.
 *
 * The frontend reads THIS instead of compiling numbers in, so a price
 * published in the admin panel changes the whole site without a deploy.
 *
 * ?preview=1 (admin only) serves the DRAFT when one exists — this is how the
 * founder walks the real site with unpublished prices before customers see
 * them. Non-admins asking for a preview get the published prices; the draft
 * is never visible to the public.
 */
export default async function pricingRoutes(app: FastifyInstance) {
  app.get("/pricing", async (req, reply) => {
    const wantsPreview = (req.query as { preview?: string }).preview === "1";

    if (wantsPreview) {
      const userId = (req as { userId?: string }).userId;
      if (userId && (await stackHealth()).db) {
        const [u] = await db
          .select({ email: users.email, phone: users.phone })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        if (u && isAdminIdentity(u.email, u.phone)) {
          const row = await getPricingRow();
          return reply.send({
            pricing: row.draft ?? row.published,
            preview: row.draft !== null,
          });
        }
      }
      // fall through: not an admin — published prices, no hint a draft exists
    }

    return reply.send({ pricing: await getPricing(), preview: false });
  });
}
