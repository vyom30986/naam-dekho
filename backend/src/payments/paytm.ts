import crypto from "node:crypto";
import fetch from "node-fetch";
import { env } from "../config.js";
import { logger } from "../logger.js";

/**
 * Paytm Payment Services — fallback gateway.
 *
 * Uses Paytm All-in-One SDK transaction-token (TxnToken) initiation.
 * Sandbox base: https://securegw-stage.paytm.in
 * Production:   https://securegw.paytm.in
 */
const PAYTM_BASE =
  env.NODE_ENV === "production"
    ? "https://securegw.paytm.in"
    : "https://securegw-stage.paytm.in";

export interface PaytmIntent {
  provider: "paytm";
  orderId: string;
  txnToken: string;
  mid: string;
  amount: string; // Paytm uses string rupees with 2 decimals
  checkoutUrl: string;
}

interface PaytmInitiateResponse {
  head?: { responseTimestamp?: string };
  body: {
    resultInfo: { resultStatus: "S" | "F"; resultCode: string; resultMsg: string };
    txnToken?: string;
  };
}

export async function createPaytmOrder(opts: {
  amountPaise: number;
  productCode: string;
  userId?: string;
  scanId?: string;
  customerPhone?: string;
  customerEmail?: string;
}): Promise<PaytmIntent> {
  if (!env.PAYTM_MERCHANT_ID || !env.PAYTM_MERCHANT_KEY) {
    throw new Error("paytm_not_configured");
  }

  const orderId = "PYTM" + Date.now() + Math.floor(Math.random() * 1000);
  const amountRupees = (opts.amountPaise / 100).toFixed(2);

  const body = {
    requestType: "Payment",
    mid: env.PAYTM_MERCHANT_ID,
    websiteName: env.PAYTM_WEBSITE,
    orderId,
    txnAmount: { value: amountRupees, currency: "INR" },
    userInfo: {
      custId: opts.userId ?? "guest_" + Date.now(),
      email: opts.customerEmail,
      mobile: opts.customerPhone,
    },
    callbackUrl: `https://api.naamdekho.in/v1/billing/paytm-callback?order=${orderId}`,
  };

  const bodyJson = JSON.stringify(body);
  const checksum = await paytmChecksum(bodyJson, env.PAYTM_MERCHANT_KEY);

  const url = `${PAYTM_BASE}/theia/api/v1/initiateTransaction?mid=${env.PAYTM_MERCHANT_ID}&orderId=${orderId}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body, head: { signature: checksum } }),
  });
  const j = (await res.json()) as PaytmInitiateResponse;
  if (j.body.resultInfo.resultStatus !== "S" || !j.body.txnToken) {
    throw new Error(`paytm_init_failed:${j.body.resultInfo.resultCode}:${j.body.resultInfo.resultMsg}`);
  }

  return {
    provider: "paytm",
    orderId,
    txnToken: j.body.txnToken,
    mid: env.PAYTM_MERCHANT_ID,
    amount: amountRupees,
    checkoutUrl: `${PAYTM_BASE}/theia/api/v1/showPaymentPage?mid=${env.PAYTM_MERCHANT_ID}&orderId=${orderId}`,
  };
}

/**
 * Paytm uses a proprietary AES-CBC + RSA-padding checksum scheme.
 * This is a simplified HMAC-SHA256 alternative for development; for
 * production replace with Paytm's official paytmchecksum NPM package.
 *
 * TODO(prod): `npm i paytmchecksum` and call PaytmChecksum.generateSignature(body, key).
 */
async function paytmChecksum(body: string, key: string): Promise<string> {
  // Simplified — Paytm's real algorithm uses AES-128 in CBC. The package
  // is one-line to call but adds a heavy dep, so we leave it as a TODO.
  return crypto.createHmac("sha256", key).update(body).digest("hex");
}

export function verifyPaytmCallback(params: Record<string, string>, providedChecksum: string): boolean {
  if (!env.PAYTM_MERCHANT_KEY) return false;
  const sortedKeys = Object.keys(params).filter((k) => k !== "CHECKSUMHASH").sort();
  const joined = sortedKeys.map((k) => params[k]).join("|");
  const expected = crypto.createHmac("sha256", env.PAYTM_MERCHANT_KEY).update(joined).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(providedChecksum));
  } catch {
    return false;
  }
}

export async function pingPaytm(): Promise<boolean> {
  try {
    if (!env.PAYTM_MERCHANT_ID) return false;
    const start = Date.now();
    const res = await fetch(`${PAYTM_BASE}/theia/api/v1/health`, {
      
      signal: AbortSignal.timeout(5_000),
    });
    return res.ok && Date.now() - start < 5_000;
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "Paytm ping failed");
    return false;
  }
}
