import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { billingEvents } from "../db/schema.js";
import { createCheckoutOrder, recordGatewayOutcome } from "../payments/index.js";
import { resolveProduct } from "../lib/products.js";
import { verifyRazorpaySignature, verifyRazorpayWebhook } from "../payments/razorpay.js";
import { verifyPaytmCallback } from "../payments/paytm.js";

export default async function billingRoutes(app: FastifyInstance) {
  // POST /v1/billing/checkout — create a payment intent
  app.post("/billing/checkout", async (req, reply) => {
    const body = z.object({
      product_code: z.string(),
      scan_id: z.string().optional(),
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "invalid_body" });

    const product = resolveProduct(body.data.product_code);
    if (!product) return reply.code(404).send({ error: "product_not_found" });

    const userId = (req as { userId?: string }).userId;

    try {
      const intent = await createCheckoutOrder({
        amountPaise: product.amountPaise,
        productCode: product.code,
        userId,
        scanId: body.data.scan_id,
      });
      return reply.send({
        gateway: intent.gateway,
        order_id: intent.orderId,
        amount_paise: product.amountPaise,
        currency: "INR",
        product: { code: product.code, name: product.name },
        razorpay: intent.gateway === "razorpay" ? { key_id: (intent as { keyId: string }).keyId } : undefined,
        paytm: intent.gateway === "paytm"
          ? { mid: (intent as { mid: string }).mid, txn_token: (intent as { txnToken: string }).txnToken, checkout_url: (intent as { checkoutUrl: string }).checkoutUrl }
          : undefined,
      });
    } catch (err) {
      app.log.error({ err: (err as Error).message }, "Checkout creation failed");
      return reply.code(500).send({ error: "checkout_failed" });
    }
  });

  // POST /v1/billing/razorpay-webhook
  app.post("/billing/razorpay-webhook", async (req: FastifyRequest, reply) => {
    const signature = req.headers["x-razorpay-signature"];
    const raw = (req as { rawBody?: string }).rawBody ?? "";
    if (typeof signature !== "string" || !verifyRazorpayWebhook(raw, signature)) {
      return reply.code(401).send({ error: "invalid_signature" });
    }
    const body = JSON.parse(raw) as {
      event: string;
      payload?: { payment?: { entity?: { id: string; order_id: string; amount: number; status: string } } };
    };
    const payment = body.payload?.payment?.entity;
    if (payment) {
      await db.insert(billingEvents).values({
        provider: "razorpay",
        intentId: payment.order_id,
        amountPaise: payment.amount,
        currency: "INR",
        status: payment.status === "captured" ? "captured" : "failed",
        rawPayload: body,
      });
      await recordGatewayOutcome("razorpay", payment.status === "captured", 0);
    }
    return reply.send({ ok: true });
  });

  // POST /v1/billing/razorpay-verify (called from the front-end after handler-success)
  app.post("/billing/razorpay-verify", async (req, reply) => {
    const body = z.object({
      razorpay_order_id: z.string(),
      razorpay_payment_id: z.string(),
      razorpay_signature: z.string(),
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "invalid_body" });
    const ok = verifyRazorpaySignature(
      body.data.razorpay_order_id,
      body.data.razorpay_payment_id,
      body.data.razorpay_signature,
    );
    return reply.send({ verified: ok });
  });

  // POST /v1/billing/paytm-callback
  app.post("/billing/paytm-callback", async (req, reply) => {
    const params = (req.body ?? {}) as Record<string, string>;
    const checksum = params.CHECKSUMHASH ?? "";
    const ok = verifyPaytmCallback(params, checksum);
    if (!ok) return reply.code(401).send({ error: "invalid_checksum" });
    await db.insert(billingEvents).values({
      provider: "paytm",
      intentId: params.ORDERID,
      amountPaise: Math.round(Number(params.TXNAMOUNT ?? "0") * 100),
      currency: "INR",
      status: params.STATUS === "TXN_SUCCESS" ? "captured" : "failed",
      rawPayload: params,
    });
    await recordGatewayOutcome("paytm", params.STATUS === "TXN_SUCCESS", 0);
    return reply.send({ ok: true });
  });
}
