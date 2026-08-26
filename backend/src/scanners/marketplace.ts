import fetch from "node-fetch";
import gplay from "google-play-scraper";
import type { TileResult } from "../lib/types.js";
import { withCache, tryTake } from "../cache/redis.js";
import {
  isScrapingBeeConfigured,
  scrapeHtml,
  isAmazonBlocked,
  amazonTitles,
  amazonBrandMatches,
} from "../lib/scrapingbee.js";

/**
 * Marketplace scanners — 5 free + 1 paid check of the 26-check portfolio:
 *   mp-play   Google Play Store       FREE  (google-play-scraper)
 *   mp-apple  Apple App Store         FREE  (iTunes Search API)
 *   mp-shop   Shopify subdomain       FREE  (DNS/HTTP probe)
 *   mp-gh     GitHub username         FREE  (GitHub REST API)
 *   mp-ph     Product Hunt            FREE  (public URL probe)
 *   mp-amzn   Amazon India Brand      PAID  (ScrapingBee, live)
 */

interface ITunesResponse {
  resultCount: number;
  results: Array<{ trackName?: string; sellerName?: string; bundleId?: string }>;
}

async function itunesSearch(name: string): Promise<ITunesResponse> {
  return withCache(`cache:itunes:${name}`, 12 * 3600, async () => {
    await tryTake("itunes", 20, 3);
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(name)}&entity=software&limit=10`,

      { signal: AbortSignal.timeout(5_000) },
    );
    return (await res.json()) as ITunesResponse;
  });
}

export async function scanMarketplace(
  alnumLower: string,
  capitalised: string,
  includePaid = false,
): Promise<TileResult[]> {
  const out: TileResult[] = [];

  // ── Apple App Store — working public API ─────────────────────
  const tStart = Date.now();
  try {
    const j = await itunesSearch(capitalised);
    const exactMatch = j.results.find((r) => r.trackName?.toLowerCase() === capitalised.toLowerCase());
    out.push({
      tileId: "mp-apple",
      category: "marketplace",
      status: exactMatch ? "no" : "ok",
      summary: exactMatch ? `Existing app: "${exactMatch.trackName}"` : "No exact-match app on App Store",
      detail: exactMatch ?? { count: j.resultCount },
      source: "apps.apple.com",
      latencyMs: Date.now() - tStart,
    });
  } catch {
    out.push(pending("mp-apple", "App Store check pending", "apps.apple.com"));
  }

  // ── Google Play — google-play-scraper (free, throttle-limited) ─
  out.push(await playStoreCheck(capitalised));

  // ── Product Hunt — public product-page probe (no key needed) ──
  out.push(await productHuntCheck(alnumLower, capitalised));

  // ── Shopify subdomain — DNS probe ────────────────────────────
  out.push(await shopifyProbe(alnumLower));

  // ── GitHub — official REST API ───────────────────────────────
  out.push(await githubCheck(alnumLower));

  // ── Amazon / Flipkart — PAID tier (via ScrapingBee) ──────────
  if (includePaid) {
    out.push(await amazonBrandCheck(capitalised));
  }

  return out;
}

/**
 * Amazon India brand check — real, via ScrapingBee at the 1-credit setting.
 * Cached for 24h so re-running the same name costs nothing.
 */
async function amazonBrandCheck(name: string): Promise<TileResult> {
  const start = Date.now();
  const searchUrl = `https://www.amazon.in/s?k=${encodeURIComponent(name)}`;

  if (!isScrapingBeeConfigured()) {
    return { ...pending("mp-amzn", "Amazon.in brand check — awaiting ScrapingBee key", "amazon.in"), actionUrl: searchUrl };
  }

  try {
    const found = await withCache(`cache:amzn:${name.toLowerCase()}`, 24 * 3600, async () => {
      const html = await scrapeHtml(searchUrl);
      if (!html || isAmazonBlocked(html)) return null; // null = could not verify
      const titles = amazonTitles(html);
      return { matches: amazonBrandMatches(titles, name).slice(0, 5), scanned: titles.length };
    });

    if (!found) {
      return {
        ...pending("mp-amzn", "Amazon blocked the automated check this time — open the search to see for yourself", "amazon.in"),
        actionUrl: searchUrl,
        latencyMs: Date.now() - start,
      };
    }

    const hits = found.matches.length;
    return {
      tileId: "mp-amzn",
      category: "marketplace",
      // One listing is a signal; several means an established seller.
      status: hits >= 2 ? "no" : hits === 1 ? "warn" : "ok",
      summary: hits === 0
        ? `No brand selling as "${name}" on Amazon India`
        : hits === 1
          ? `One listing leads with "${name}" — worth a look`
          : `${hits} listings sell under "${name}" — the brand is established here`,
      detail: { matches: found.matches, resultsScanned: found.scanned, searchUrl },
      source: "amazon.in",
      actionUrl: searchUrl,
      latencyMs: Date.now() - start,
    };
  } catch {
    return { ...pending("mp-amzn", "Amazon check could not complete", "amazon.in"), actionUrl: searchUrl };
  }
}



async function playStoreCheck(capitalised: string): Promise<TileResult> {
  const start = Date.now();
  try {
    const apps = await withCache(`cache:gplay:${capitalised.toLowerCase()}`, 12 * 3600, async () => {
      await tryTake("gplay", 20, 2);
      return gplay.search({ term: capitalised, num: 10, country: "in" });
    });
    const exact = apps.find((a) => a.title.toLowerCase() === capitalised.toLowerCase());
    return {
      tileId: "mp-play",
      category: "marketplace",
      status: exact ? "no" : "ok",
      summary: exact ? `Existing app: "${exact.title}" by ${exact.developer}` : "No exact-match app on Play Store",
      detail: exact ? { appId: exact.appId, developer: exact.developer, url: exact.url } : { count: apps.length },
      source: "play.google.com",
      actionUrl: exact?.url,
      latencyMs: Date.now() - start,
    };
  } catch {
    return pending("mp-play", "Play Store check pending", "play.google.com");
  }
}

async function productHuntCheck(alnumLower: string, capitalised: string): Promise<TileResult> {
  const start = Date.now();
  try {
    const taken = await withCache(`cache:ph:${alnumLower}`, 12 * 3600, async () => {
      await tryTake("producthunt", 20, 3);
      const res = await fetch(`https://www.producthunt.com/products/${alnumLower}`, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(5_000),
        headers: { "User-Agent": "NaamDekhoBot/1.0 (+https://naamdekho.in/bot)" },
      });
      return res.status === 200;
    });
    return {
      tileId: "mp-ph",
      category: "marketplace",
      status: taken ? "warn" : "ok",
      summary: taken ? `Product "${capitalised}" listed on Product Hunt` : "No Product Hunt listing",
      detail: { slug: alnumLower },
      source: "producthunt.com",
      actionUrl: taken ? `https://www.producthunt.com/products/${alnumLower}` : undefined,
      latencyMs: Date.now() - start,
    };
  } catch {
    return pending("mp-ph", "Product Hunt check pending", "producthunt.com");
  }
}

async function githubCheck(alnumLower: string): Promise<TileResult> {
  const start = Date.now();
  try {
    const exists = await withCache(`cache:github:${alnumLower}`, 1_800, async () => {
      await tryTake("github", 30, 5);
      const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
      if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
      const res = await fetch(`https://api.github.com/users/${alnumLower}`, {
        headers,

        signal: AbortSignal.timeout(4_000),
      });
      return res.status === 200;
    });
    return {
      tileId: "mp-gh",
      category: "marketplace",
      status: exists ? "no" : "ok",
      summary: exists ? `github.com/${alnumLower} — taken` : `github.com/${alnumLower} — available`,
      detail: { handle: alnumLower },
      source: "github.com",
      latencyMs: Date.now() - start,
    };
  } catch {
    return pending("mp-gh", `github.com/${alnumLower} — source unavailable`, "github.com");
  }
}

async function shopifyProbe(alnumLower: string): Promise<TileResult> {
  const start = Date.now();
  try {
    await tryTake("shopify", 30, 5);
    const res = await fetch(`https://${alnumLower}.myshopify.com`, {
      method: "HEAD",

      signal: AbortSignal.timeout(4_000),
      redirect: "manual",
    });
    const taken = res.status === 200 || res.status === 301 || res.status === 302;
    return {
      tileId: "mp-shop",
      category: "marketplace",
      status: taken ? "no" : "ok",
      summary: taken ? "Subdomain in use" : "Subdomain available",
      detail: { url: `${alnumLower}.myshopify.com` },
      source: "shopify.com",
      latencyMs: Date.now() - start,
    };
  } catch {
    // Resolution failure = available
    return {
      tileId: "mp-shop",
      category: "marketplace",
      status: "ok",
      summary: "Subdomain available",
      detail: { url: `${alnumLower}.myshopify.com` },
      source: "shopify.com",
      latencyMs: Date.now() - start,
    };
  }
}

function pending(tileId: string, summary: string, source = ""): TileResult {
  return {
    tileId,
    category: "marketplace",
    status: "pending",
    summary,
    detail: { note: "Source integration pending" },
    source,
  };
}
