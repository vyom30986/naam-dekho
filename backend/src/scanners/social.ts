import fetch from "node-fetch";
import type { TileResult } from "../lib/types.js";
import { withCache, tryTake } from "../cache/redis.js";
import { isScrapingBeeConfigured, scrapeHtml } from "../lib/scrapingbee.js";

/**
 * Meta (Instagram/Facebook) shows servers a login wall instead of an answer.
 * ScrapingBee gets through it — verified 3 Aug 2026, 6/6 correct in both
 * directions on Instagram and Facebook. That is proxy rotation, not defeating
 * a human verification test.
 *
 * COST: 1 credit per call, and these are FREE-tier checks — so unrestricted
 * this would spend a credit on every free search.
 *   SCRAPINGBEE_SOCIAL=off    never
 *   SCRAPINGBEE_SOCIAL=paid   Deep Searches only   ← default
 *   SCRAPINGBEE_SOCIAL=all    every search, including free (~1 credit each)
 */
function socialProxyMode(): "off" | "paid" | "all" {
  const m = (process.env.SCRAPINGBEE_SOCIAL ?? "paid").toLowerCase();
  return m === "off" || m === "all" ? m : "paid";
}

/**
 * Social handle scanners — the 5 social checks of the 26-check portfolio:
 *   soc-ig  Instagram        (URL probe)
 *   soc-x   X / Twitter      (URL probe)
 *   soc-yt  YouTube @handle  (URL probe; YouTube Data API when key set)
 *   soc-li  LinkedIn company (URL probe)
 *   soc-fb  Facebook page    (URL probe)
 *
 * Strategy: platforms allow URL probing via GET to a public profile URL —
 * a 200 means the handle is taken, a 404 means available.
 * (Threads / Telegram / Pinterest are Phase 2 — see PRD §11.)
 */

async function urlProbe(url: string, timeoutMs = 4_000): Promise<boolean> {
  // returns true if the URL resolves to a real profile (= TAKEN)
  return withCache(`cache:url-probe:${url}`, 1_800, async () => {
    await tryTake("url-probe", 50, 8);
    try {
      const res = await fetch(url, {
        method: "GET",
        redirect: "manual",

        signal: AbortSignal.timeout(timeoutMs),
        headers: { "User-Agent": "NaamDekhoBot/1.0 (+https://naamdekho.in/bot)" },
      });
      return res.status === 200;
    } catch {
      return false;
    }
  });
}

/**
 * Meta properties (Instagram, Facebook) serve an HTTP 200 login-wall to bots
 * for BOTH existing and missing profiles, so a bare status check over-reports
 * "taken". We inspect the page body instead: an explicit not-found marker
 * means AVAILABLE; a profile marker means TAKEN; a login-wall with neither
 * means we honestly don't know → "pending" (PRD R-4: degrade gracefully,
 * never show a false conflict).
 */
async function metaProbe(url: string, handle: string, allowProxy = false): Promise<boolean | null> {
  // Proxy-assisted answers are cached separately — a "pending" learnt without
  // the proxy must not shadow the real answer we can get with it.
  return withCache(`cache:meta-probe:${allowProxy ? "px:" : ""}${url}`, 1_800, async () => {
    await tryTake("url-probe", 50, 8);
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(6_000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (res.status === 404) return false;
    const body = (await res.text()).slice(0, 200_000);
    const notFound =
      /Page Not Found|page isn't available|content isn't available|Sorry, this page isn't available|isn&#039;t available/i.test(body);
    if (notFound) return false;
    const profileMarker = new RegExp(`og:title[^>]*content="[^"]*${handle}`, "i").test(body) ||
      new RegExp(`"alternateName"\\s*:\\s*"@?${handle}"`, "i").test(body);
    if (profileMarker) return true;

    // Hit the login wall. Retry through ScrapingBee when allowed; otherwise
    // stay honestly undetermined rather than guess.
    if (allowProxy) return metaViaScrapingBee(url, handle);
    return null;
  });
}

/** Meta profile lookup through ScrapingBee. Costs 1 credit per call. */
async function metaViaScrapingBee(url: string, handle: string): Promise<boolean | null> {
  if (!isScrapingBeeConfigured()) return null;
  const html = await scrapeHtml(url, { timeoutMs: 30_000 });
  if (!html) return null;

  if (/Page Not Found|page isn't available|content isn't available|isn&#039;t available/i.test(html)) {
    return false;
  }
  // A live profile carries an og:title naming the handle; a free one has none.
  const og = /property="og:title"\s+content="([^"]{1,160})"/i.exec(html);
  if (!og) return false;
  const safe = handle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(safe, "i").test(og[1]) ? true : null;
}

// ── YouTube — Data API v3 when key is present, else URL probe ────
async function youtubeExists(handle: string): Promise<boolean> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return urlProbe(`https://www.youtube.com/@${handle}`);
  return withCache(`cache:youtube:${handle}`, 1_800, async () => {
    await tryTake("youtube", 30, 5);
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${key}`,
      { signal: AbortSignal.timeout(4_000) },
    );
    if (res.status !== 200) return urlProbe(`https://www.youtube.com/@${handle}`);
    const j = (await res.json()) as { pageInfo?: { totalResults?: number } };
    return (j.pageInfo?.totalResults ?? 0) > 0;
  });
}

export async function scanSocial(alnumLower: string, paid = false): Promise<TileResult[]> {
  // Meta needs the proxy to answer at all; whether we may spend a credit
  // depends on the mode and, in "paid" mode, on this being a Deep Search.
  const mode = socialProxyMode();
  const allowProxy = mode === "all" || (mode === "paid" && paid);
  const checks: Array<Promise<TileResult>> = [
    // Instagram — body-inspecting probe (Meta serves login-walls to bots)
    wrapNullable("soc-ig", "@" + alnumLower, "instagram.com",
      () => metaProbe(`https://www.instagram.com/${alnumLower}/`, alnumLower, allowProxy)),

    // X (Twitter) — URL probe
    wrap("soc-x", "@" + alnumLower, "x.com",
      () => urlProbe(`https://x.com/${alnumLower}`)),

    // YouTube — @handle
    wrap("soc-yt", "@" + alnumLower, "youtube.com",
      () => youtubeExists(alnumLower)),

    // LinkedIn — company URL probe
    wrap("soc-li", `/company/${alnumLower}`, "linkedin.com",
      () => urlProbe(`https://www.linkedin.com/company/${alnumLower}/`)),

    // Facebook — body-inspecting probe (Meta serves login-walls to bots)
    wrapNullable("soc-fb", `/${alnumLower}`, "facebook.com",
      () => metaProbe(`https://www.facebook.com/${alnumLower}`, alnumLower, allowProxy)),

  ];

  return Promise.all(checks);
}

/** Like wrap(), but the probe may return null = "couldn't determine" → pending. */
async function wrapNullable(
  tileId: string,
  display: string,
  source: string,
  probe: () => Promise<boolean | null>,
): Promise<TileResult> {
  const start = Date.now();
  try {
    const exists = await probe();
    if (exists === null) {
      return {
        tileId,
        category: "social",
        status: "pending",
        summary: `${display} — platform blocked automated check, will retry`,
        detail: { handle: display, note: "Bot-wall encountered; needs proxy pool or retry" },
        source,
        latencyMs: Date.now() - start,
      };
    }
    return {
      tileId,
      category: "social",
      status: exists ? "no" : "ok",
      summary: exists ? `${display} — taken` : `${display} — available`,
      detail: { handle: display },
      source,
      latencyMs: Date.now() - start,
    };
  } catch {
    return {
      tileId,
      category: "social",
      status: "pending",
      summary: `${display} — source unavailable`,
      detail: { handle: display },
      source,
      latencyMs: Date.now() - start,
    };
  }
}

async function wrap(
  tileId: string,
  display: string,
  source: string,
  probe: () => Promise<boolean>,
): Promise<TileResult> {
  const start = Date.now();
  try {
    const exists = await probe();
    return {
      tileId,
      category: "social",
      status: exists ? "no" : "ok",
      summary: exists ? `${display} — taken` : `${display} — available`,
      detail: { handle: display },
      source,
      latencyMs: Date.now() - start,
    };
  } catch {
    return {
      tileId,
      category: "social",
      status: "pending",
      summary: `${display} — source unavailable`,
      detail: { handle: display },
      source,
      latencyMs: Date.now() - start,
    };
  }
}
