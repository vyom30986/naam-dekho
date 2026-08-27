import type { FastifyInstance, FastifyRequest } from "fastify";
import scanRoutes from "./scan.js";
import authRoutes from "./auth.js";
import billingRoutes from "./billing.js";
import agencyRoutes from "./agency.js";
import adminRoutes from "./admin.js";
import pricingRoutes from "./pricing.js";
import legalRoutes from "./legalDocs.js";
import { verifyJwt } from "../auth/otp.js";
import { disabledScanners } from "../lib/settings.js";

export default async function apiRoutes(app: FastifyInstance) {
  // Decorate request with userId if a valid bearer token is present (optional auth)
  app.addHook("preHandler", async (req: FastifyRequest) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.toLowerCase().startsWith("bearer ")) return;
    const token = auth.slice(7).trim();
    const decoded = verifyJwt(token);
    if (decoded) (req as { userId?: string }).userId = decoded.uid;
  });

  await app.register(scanRoutes);
  await app.register(authRoutes);
  await app.register(billingRoutes);
  await app.register(agencyRoutes);
  await app.register(adminRoutes);
  await app.register(pricingRoutes);
  await app.register(legalRoutes);

  /*
   * Which checks are switched off — public, and deliberately so.
   *
   * The customer page needs this BEFORE a scan runs, so a switched-off check
   * can be left out of the layout entirely rather than appearing as an empty
   * tile that fills in with nothing. The list contains only our own internal
   * check ids; it reveals nothing about any customer.
   *
   * Cached for 30 seconds inside disabledScanners(), so flipping a switch in
   * the console reaches the site within half a minute.
   */
  app.get("/checks/disabled", async () => ({ disabled: await disabledScanners() }));

  // Health probes
  app.get("/healthz", async () => ({ ok: true }));
  app.get("/readyz", async () => ({ ok: true, ts: Date.now() }));
}
