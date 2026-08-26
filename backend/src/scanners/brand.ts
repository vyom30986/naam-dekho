import fetch from "node-fetch";
import type { TileResult } from "../lib/types.js";
import { withCache, tryTake } from "../cache/redis.js";

/**
 * Brand & Search scanners — 2 checks of the 26-check portfolio:
 *   br-wiki  Wikipedia + Wikidata     FREE  (MediaWiki API)
 *   br-cse   Google Search            FREE top-3 (CSE free tier);
 *            full 10-result SERP runs on the paid tier (same tile, deeper data)
 *
 * (Google Trends, Crunchbase, Reddit — Phase 2, see PRD §11.)
 */

interface WikipediaResponse {
  query?: { search?: Array<{ title: string; snippet: string }> };
}

async function wikipediaSearch(name: string): Promise<WikipediaResponse> {
  return withCache(`cache:wikipedia:${name}`, 24 * 3600, async () => {
    await tryTake("wikipedia", 100, 20);
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srsearch=${encodeURIComponent(name)}&srlimit=5`;
    const res = await fetch(url, {
      headers: { "User-Agent": "NaamDekho/1.0 (https://naamdekho.in)" },

      signal: AbortSignal.timeout(5_000),
    });
    return (await res.json()) as WikipediaResponse;
  });
}

export async function scanBrand(name: string, deepSerp = false): Promise<TileResult[]> {
  const out: TileResult[] = [];

  // ── Wikipedia — fully working ────────────────────────────────
  const start = Date.now();
  try {
    const j = await wikipediaSearch(name);
    const exact = j.query?.search?.find((r) => r.title.toLowerCase() === name.toLowerCase());
    out.push({
      tileId: "br-wiki",
      category: "brand",
      status: exact ? "warn" : "ok",
      summary: exact ? `Concept page: ${exact.title}` : "No Wikipedia concept page",
      detail: exact ?? { hitCount: j.query?.search?.length ?? 0 },
      source: "wikipedia.org",
      latencyMs: Date.now() - start,
    });
  } catch {
    out.push(pending("br-wiki", "Wikipedia check pending", "wikipedia.org"));
  }

  // ── Web search (top-3 free, full SERP paid) ──────────────────
  // Brave Search API is the primary source (Google closed the Custom Search
  // JSON API to new customers; it shuts down entirely on 2027-01-01).
  // GOOGLE_CSE_* is kept as a fallback for grandfathered accounts only.
  if (process.env.BRAVE_SEARCH_API_KEY) {
    out.push(await braveSearch(name, deepSerp ? 10 : 3));
  } else if (process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_ID) {
    out.push(await googleCSE(name, deepSerp ? 10 : 3));
  } else {
    out.push(pending("br-cse", "Web search — configure BRAVE_SEARCH_API_KEY to enable", "search.brave.com"));
  }

  return out;
}

async function braveSearch(name: string, num: number): Promise<TileResult> {
  const start = Date.now();
  try {
    await tryTake("brave-search", 50, 1);
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(name)}&country=in&count=${num}`,
      {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY as string,
        },
        signal: AbortSignal.timeout(6_000),
      },
    );
    if (res.status !== 200) {
      return pending("br-cse", `Web search unavailable (HTTP ${res.status})`, "search.brave.com");
    }
    const j = (await res.json()) as { web?: { results?: Array<{ title: string; url: string }> } };
    const items = (j.web?.results ?? []).slice(0, num).map((r) => ({ title: r.title, link: r.url }));
    const count = items.length;
    return {
      tileId: "br-cse",
      category: "brand",
      status: count >= 3 ? "warn" : "ok",
      summary: count > 0
        ? `${count} page-1 entit${count === 1 ? "y" : "ies"} ranking for "${name}"`
        : "No exact-match search results",
      detail: { items, depth: num, engine: "brave" },
      source: "search.brave.com",
      latencyMs: Date.now() - start,
    };
  } catch {
    return pending("br-cse", "Web search check failed", "search.brave.com");
  }
}

async function googleCSE(name: string, num: number): Promise<TileResult> {
  const start = Date.now();
  try {
    await tryTake("google-cse", 100, 1);
    const url = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_CSE_API_KEY}&cx=${process.env.GOOGLE_CSE_ID}&q=${encodeURIComponent(name)}&gl=in&num=${num}`;
    const res = await fetch(url, {

      signal: AbortSignal.timeout(5_000),
    });
    const j = (await res.json()) as { items?: Array<{ title: string; link: string }> };
    const count = j.items?.length ?? 0;
    return {
      tileId: "br-cse",
      category: "brand",
      status: count >= 3 ? "warn" : "ok",
      summary: count > 0 ? `${count} page-1 entit${count === 1 ? "y" : "ies"} ranking for "${name}"` : "No exact-match SERP entities",
      detail: { items: j.items?.slice(0, num) ?? [], depth: num },
      source: "google.com",
      latencyMs: Date.now() - start,
    };
  } catch {
    return pending("br-cse", "Google SERP check failed", "google.com");
  }
}

function pending(tileId: string, summary: string, source: string): TileResult {
  return { tileId, category: "brand", status: "pending", summary, detail: {}, source };
}
