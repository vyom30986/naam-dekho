import crypto from "node:crypto";
import Razorpay from "razorpay";
import { env } from "../config.js";
import { logger } from "../logger.js";

export interface CheckoutIntent {
  provider: "razorpay";
  orderId: string;
  keyId: string;
  amountPaise: number;
  currency: string;
  checkoutUrl?: string;
}

let client: Razorpay | null = null;

function getClient(): Razorpay {
  if (!client) {
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      throw new Error("razorpay_not_configured");
    }
    client = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return client;
}

export async function createRazorpayOrder(opts: {
  amountPaise: number;
  productCode: string;
  userId?: string;
  scanId?: string;
}): Promise<CheckoutIntent> {
  const order = await getClient().orders.create({
    amount: opts.amountPaise,
    currency: "INR",
    receipt: opts.scanId ?? `ord_${Date.now()}`,
    notes: { productCode: opts.productCode, userId: opts.userId ?? "", scanId: opts.scanId ?? "" },
  });
  return {
    provider: "razorpay",
    orderId: order.id,
    keyId: env.RAZORPAY_KEY_ID!,
    amountPaise: Number(order.amount),
    currency: order.currency,
  };
}

export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  if (!env.RAZORPAY_KEY_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function verifyRazorpayWebhook(rawBody: string, signature: string): boolean {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function pingRazorpay(): Promise<boolean> {
  try {
    if (!env.RAZORPAY_KEY_ID) return false;
    // Razorpay has no dedicated health endpoint; use a tiny orders.all call.
    const start = Date.now();
    await getClient().orders.all({ count: 1 });
    const ms = Date.now() - start;
    return ms < 5_000;
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "Razorpay ping failed");
    return false;
  }
}
