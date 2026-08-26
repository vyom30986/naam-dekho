import fetch from "node-fetch";
import { logger } from "../logger.js";
import { recordApiCall } from "./api-usage.js";

/**
 * ScrapingBee client — the proxy we use for marketplaces that block ordinary
 * server requests.
 *
 * COST DISCIPLINE. ScrapingBee bills per request, and the cost multiplies with
 * options:
 *   render_js=false                1 credit    ← what we use
 *   render_js=true                 5 credits
 *   premium_proxy=true            25 credits
 *   stealth_proxy=true            75 credits
 *
 * Measured 3 Aug 2026: Amazon India returns full, un-blocked search HTML at the
 * 1-credit setting, so there is no reason to pay more. Every result is cached,
 * so a repeated search for the same name costs nothing.
 *
 * At 1 credit per check the ₹50 Deep Search spends ~1 credit on marketplaces.
 * At the 25-credit setting it would spend 25 — worth remembering before anyone
 * "improves" this by switching on premium_proxy.
 */

const ENDPOINT = "https://app.scrapingbee.com/api/v1/";

export function isScrapingBeeConfigured(): boolean {
  return Boolean(process.env.SCRAPING_BEE_API_KEY?.trim());
}

export interface FetchOptions {
  /** Only enable for a site that genuinely needs it — 25x the cost. */
  premiumProxy?: boolean;
  timeoutMs?: number;
}

/**
 * Fetch a page through ScrapingBee. Returns null on any failure — callers must
 * treat null as "could not verify" and never as "nothing found".
 */
export async function scrapeHtml(url: string, opts: FetchOptions = {}): Promise<string | null> {
  const key = process.env.SCRAPING_BEE_API_KEY?.trim();
  if (!key) return null;

  const params = new URLSearchParams({
    api_key: key,
    url,
    render_js: "false", // 1 credit — see the note above before changing
  });
  if (opts.premiumProxy) {
    params.set("premium_proxy", "true");
    params.set("country_code", "in");
  }

  // Premium proxies bill at 25 credits, plain requests at 1 — recorded as
  // units so the console's cost estimate reflects what was actually spent.
  const units = opts.premiumProxy ? 25 : 1;

  try {
    const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
      signal: AbortSignal.timeout(opts.timeoutMs ?? 25_000),
    });
    void recordApiCall("scrapingbee", opts.premiumProxy ? "premium" : "standard", res.ok, units);
    if (!res.ok) {
      logger.warn({ status: res.status, url }, "ScrapingBee request failed");
      return null;
    }
    return await res.text();
  } catch (err) {
    void recordApiCall("scrapingbee", "error", false, units);
    logger.warn({ err: (err as Error).message, url }, "ScrapingBee request threw");
    return null;
  }
}

/** Remaining credits, or null if unavailable. Does not consume credit. */
export async function creditBalance(): Promise<{ used: number; max: number } | null> {
  const key = process.env.SCRAPING_BEE_API_KEY?.trim();
  if (!key) return null;
  try {
    const res = await fetch(`${ENDPOINT.replace(/\/$/, "")}/usage?api_key=${key}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { used_api_credit?: number; max_api_credit?: number };
    return { used: j.used_api_credit ?? 0, max: j.max_api_credit ?? 0 };
  } catch {
    return null;
  }
}

// ── Page-shape detection ─────────────────────────────────────────────

/** Amazon serves a "Sorry, we just need to make sure you're not a robot" wall. */
export function isAmazonBlocked(html: string): boolean {
  return /Enter the characters you see below|we just need to make sure you're not a robot|api-services-support@amazon\.com/i.test(
    html,
  );
}

/**
 * Product titles from an Amazon search page.
 *
 * Read from `<h2 aria-label="...">`, which is the accessible name Amazon
 * attaches to every result. Chosen over CSS classes deliberately: the class
 * names (`a-size-medium` etc.) churn, the aria-label does not.
 */
export function amazonTitles(html: string): string[] {
  return [...html.matchAll(/<h2[^>]*\saria-label="([^"]{3,300})"/g)]
    .map((m) => m[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim())
    .filter(Boolean);
}

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Does a brand of this name sell on Amazon India?
 *
 * A real brand's own products lead with the brand name — searching "boat"
 * returns "boAt Rockerz 255 Pro+…". Matching on titles that START with the
 * name avoids the false positives you get from a bare substring search, where
 * "Ira" would match "Admira", "Kabira" and every third product description.
 */
export function amazonBrandMatches(titles: string[], name: string): string[] {
  const n = normalise(name);
  if (n.length < 3) return []; // too short to be distinctive
  return titles.filter((t) => normalise(t).startsWith(n));
}
