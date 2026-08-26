import fetch from "node-fetch";
import type { TileResult } from "../lib/types.js";
import { withCache, tryTake } from "../cache/redis.js";
import { logger } from "../logger.js";

/**
 * Domain availability via RDAP. RDAP is the modern JSON replacement for
 * WHOIS — it returns 404 for free domains and 200 with structured JSON
 * for taken ones. Free, no API key, generous rate limits.
 *
 * ONE TILE PER ENDING (4 Aug 2026). They used to be bundled — .org/.net/.io/
 * .ai/.co/.dev shared a single tile — which meant a founder could not see at a
 * glance that .ai was free while .io was gone, and a mixed group could only
 * say "3 taken, 3 available". The same 14 lookups run either way, so showing
 * them separately costs nothing extra and answers the actual question.
 *
 * Pricing is indicative INR (replace with live registrar pricing once an API
 * key is configured in .env).
 */
export const TLDS: Array<{ tileId: string; tld: string; priceInr: number }> = [
  { tileId: "dom-com", tld: "com", priceInr: 999 },
  { tileId: "dom-in", tld: "in", priceInr: 699 },
  { tileId: "dom-coin", tld: "co.in", priceInr: 599 },
  { tileId: "dom-org", tld: "org", priceInr: 999 },
  { tileId: "dom-net", tld: "net", priceInr: 1099 },
  { tileId: "dom-io", tld: "io", priceInr: 3800 },
  { tileId: "dom-ai", tld: "ai", priceInr: 15400 },
  { tileId: "dom-co", tld: "co", priceInr: 2499 },
  { tileId: "dom-dev", tld: "dev", priceInr: 1199 },
  { tileId: "dom-app", tld: "app", priceInr: 1499 },
  { tileId: "dom-store", tld: "store", priceInr: 4999 },
  { tileId: "dom-shop", tld: "shop", priceInr: 1999 },
  { tileId: "dom-tech", tld: "tech", priceInr: 3999 },
  { tileId: "dom-xyz", tld: "xyz", priceInr: 249 },
];

interface RdapResponse {
  events?: Array<{ eventAction: string; eventDate: string }>;
  status?: string[];
}

async function rdapLookup(domain: string): Promise<{ available: boolean; expires?: string }> {
  return withCache(`cache:rdap:${domain}`, 300, async () => {
    await tryTake(`rdap`, 60, 10); // 60 capacity, 10/sec refill
    try {
      const res = await fetch(`https://rdap.org/domain/${domain}`, {
        headers: { Accept: "application/rdap+json" },

        signal: AbortSignal.timeout(5_000),
      });
      if (res.status === 404) return { available: true };
      if (res.status === 200) {
        const body = (await res.json()) as RdapResponse;
        const expires = body.events?.find((e) => e.eventAction === "expiration")?.eventDate;
        return { available: false, expires };
      }
      // Unknown status — best-effort: not available
      return { available: false };
    } catch (err) {
      logger.warn({ err: (err as Error).message, domain }, "RDAP lookup failed");
      throw err;
    }
  });
}

export async function scanDomains(alnumLower: string): Promise<TileResult[]> {
  return Promise.all(
    TLDS.map(async ({ tileId, tld, priceInr }): Promise<TileResult> => {
      const start = Date.now();
      const domain = `${alnumLower}.${tld}`;
      const price = `₹${priceInr.toLocaleString("en-IN")}/yr`;

      let available: boolean | null = null;
      let expires: string | undefined;
      try {
        const out = await rdapLookup(domain);
        available = out.available;
        expires = out.expires;
      } catch {
        available = null; // lookup failed — reported honestly below
      }

      // A failed lookup is never reported as free. "Available" is the answer
      // someone spends money on, so it has to come from a real response.
      if (available === null) {
        return {
          tileId,
          category: "domains",
          status: "pending",
          summary: `.${tld} — could not be checked just now`,
          detail: { domain, tld, priceInr },
          source: "rdap.org",
          latencyMs: Date.now() - start,
        };
      }

      return {
        tileId,
        category: "domains",
        status: available ? "ok" : "no",
        summary: available ? `${domain} is free — ${price}` : `${domain} is taken`,
        detail: { domain, tld, priceInr, available, expires },
        source: "rdap.org",
        actionUrl: available
          ? `https://www.godaddy.com/domainsearch/find?domainToCheck=${domain}`
          : `https://rdap.org/domain/${domain}`,
        latencyMs: Date.now() - start,
      };
    }),
  );
}
