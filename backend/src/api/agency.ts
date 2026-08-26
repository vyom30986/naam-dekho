import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { z } from "zod";
import { db } from "../db/index.js";
import { agencyLeads } from "../db/schema.js";
import { stackHealth } from "../lib/devstack.js";

// Dev degraded mode — leads land here until Postgres is up
const devLeads: Array<Record<string, unknown>> = [];

const schema = z.object({
  name: z.string().min(1).max(200),
  role: z.string().max(100).optional(),
  company: z.string().min(1).max(200),
  firm_type: z.string().max(100).optional(),
  email: z.string().email(),
  phone: z.string().min(7).max(20),
  expected_volume: z.string().max(100).optional(),
  budget_range: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
});

export default async function agencyRoutes(app: FastifyInstance) {
  app.post("/agency-leads", {
    config: { rateLimit: { max: 3, timeWindow: "10 minutes" } },
  }, async (req, reply) => {
    const body = schema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "invalid_body", details: body.error.flatten() });

    if (!(await stackHealth()).db) {
      const id = crypto.randomUUID();
      devLeads.push({ id, ...body.data, createdAt: new Date() });
      app.log.info({ leadId: id, company: body.data.company }, "New agency lead (dev store)");
      return reply.code(201).send({ ok: true, id });
    }

    const [row] = await db
      .insert(agencyLeads)
      .values({
        name: body.data.name,
        role: body.data.role ?? null,
        company: body.data.company,
        firmType: body.data.firm_type ?? null,
        email: body.data.email,
        phone: body.data.phone,
        expectedVolume: body.data.expected_volume ?? null,
        budgetRange: body.data.budget_range ?? null,
        notes: body.data.notes ?? null,
      })
      .returning({ id: agencyLeads.id });

    // TODO: post to Slack #sales
    // TODO: enqueue a "call within 24h" reminder
    app.log.info({ leadId: row.id, company: body.data.company }, "New agency lead");

    return reply.code(201).send({ ok: true, id: row.id });
  });
}
