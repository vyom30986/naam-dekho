import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { apiCalls } from "../db/schema.js";
import { stackHealth } from "./devstack.js";

/**
 * What the product spends on outbound APIs.
 *
 * Every paid or rate-limited call is recorded here, so the founder can answer
 * "which service is costing me money, and how much?" without logging into five
 * dashboards.
 *
 * THE NUMBERS ARE OUR ESTIMATE, NOT AN INVOICE, and the console says so on
 * every screen. We count our own calls and multiply by the published rate.
 * That is accurate for volume and approximate for money: providers round,
 * bill in bundles, apply free tiers and change prices. Anyone deciding
 * something financial should read the provider's own bill.
 */

export interface Provider {
  id: string;
  label: string;
  /** The .env setting that switches it on. */
  envKey: string;
  /** Rupees per call at the published rate. 0 = free at our volume. */
  rupeesPerCall: number;
  /** How the rate was arrived at — shown in the console so it can be checked. */
  basis: string;
  /** Free allowance per month, where one exists. */
  freePerMonth?: number;
  where: string;
}

export const PROVIDERS: Provider[] = [
  {
    id: "scrapingbee",
    label: "ScrapingBee",
    envKey: "SCRAPING_BEE_API_KEY",
    rupeesPerCall: 0.09,
    basis: "1 credit per call on the ₹0.09/credit plan (Instagram and Facebook use premium proxies at 25 credits when enabled)",
    where: "Amazon India brand · Instagram · Facebook",
  },
  {
    id: "r2",
    label: "Cloudflare R2 storage",
    envKey: "R2_SECRET_ACCESS_KEY",
    rupeesPerCall: 0,
    basis: "Free up to 10 GB stored, and nothing at all for downloads — which is why R2 was chosen over Amazon S3, since reports get downloaded again and again",
    where: "Evidence reports and keepsake certificates (PDFs)",
  },
  {
    id: "metapilot",
    label: "MetaPilot (Facebook)",
    envKey: "METAPILOT_API_KEY",
    rupeesPerCall: 0,
    basis: "Not billed by us — whatever MetaPilot charges is on their own invoice, not counted here",
    where: "Stored only. No check in the product calls MetaPilot yet, so this will read zero calls until one does",
  },
  {
    id: "gemini",
    label: "Gemini",
    envKey: "GEMINI_API_KEY",
    rupeesPerCall: 0,
    basis: "Free tier — 1,500 requests/day on Flash Lite. Results are cached per name, so a repeat search costs nothing at all",
    freePerMonth: 45_000,
    where: "Name meanings across 11 languages (baby mode)",
  },
  {
    id: "google-cse",
    label: "Google Custom Search",
    envKey: "GOOGLE_CSE_API_KEY",
    rupeesPerCall: 0.42,
    basis: "100 searches/day free, then about $5 per 1,000",
    freePerMonth: 3_000,
    where: "The web-search collision check",
  },
  {
    id: "github",
    label: "GitHub",
    envKey: "GITHUB_TOKEN",
    rupeesPerCall: 0,
    basis: "Free — the token only raises the rate limit from 60 to 5,000 per hour",
    where: "GitHub username availability",
  },
  {
    id: "rdap",
    label: "RDAP domain registry",
    envKey: "",
    rupeesPerCall: 0,
    basis: "Free public registry service, no key required",
    where: "All 14 domain endings",
  },
  {
    id: "razorpay",
    label: "Razorpay",
    envKey: "RAZORPAY_KEY_ID",
    rupeesPerCall: 0,
    basis: "No per-call charge — Razorpay takes roughly 2% of each payment instead",
    where: "Token purchases",
  },
  {
    id: "twocaptcha",
    label: "2Captcha",
    envKey: "TWO_CAPTCHA_KEY",
    rupeesPerCall: 0.25,
    basis: "About $3 per 1,000 solves",
    where: "MCA21 and IP India trademark (not live yet)",
  },
  {
    id: "bhashini",
    label: "Bhashini",
    envKey: "BHASHINI_ULCA_API_KEY",
    rupeesPerCall: 0,
    basis: "Free — Government of India language platform",
    where: "Transliteration into 10 Indian scripts",
  },
];

/**
 * Record one outbound call. Never throws and never blocks: a usage ledger
 * that can break a customer's search is worse than no ledger.
 */
export async function recordApiCall(
  provider: string,
  operation?: string,
  ok = true,
  units = 1,
): Promise<void> {
  try {
    if (!(await stackHealth()).db) return;
    await db.insert(apiCalls).values({ provider, operation: operation ?? null, ok, units });
  } catch {
    /* usage tracking is never worth failing a scan over */
  }
}

export interface ProviderUsage extends Provider {
  configured: boolean;
  calls: number;
  callsLast30: number;
  failures: number;
  unitsTotal: number;
  estimatedRupees: number;
  lastUsed: string | null;
}

/** Per-provider counts and our estimate of what they cost. */
export async function usageByProvider(): Promise<ProviderUsage[]> {
  let rows: Array<{
    provider: string; calls: number; last30: number; failures: number; units: number; lastUsed: Date | null;
    lastSuccessAt: Date | null; lastFailureAt: Date | null; failingSince: Date | null; failStreak: number;
  }> = [];
  /* Whether the health columns are real or just absent because the database
   * was unreachable. Zero failures and "we could not look" are different
   * answers, and only one of them is green. */
  let measured = false;

  try {
    if ((await stackHealth()).db) {
      rows = (await db
        .select({
          provider: apiCalls.provider,
          calls: sql<number>`count(*)::int`,
          last30: sql<number>`count(*) filter (where ${apiCalls.at} > now() - interval '30 days')::int`,
          failures: sql<number>`count(*) filter (where ${apiCalls.ok} = false)::int`,
          units: sql<number>`coalesce(sum(${apiCalls.units}), 0)::int`,
          lastUsed: sql<Date | null>`max(${apiCalls.at})`,
          /*
           * The date it started failing, derived rather than stored.
           *
           * failingSince is the FIRST failure of the unbroken run since the
           * last success. Because it is defined relative to that success,
           * there is no state to clear: one successful call moves the
           * boundary and the streak is empty on the very next read. Nothing
           * can get stuck red after a working key is pasted in, and a
           * restart or a rollback cannot desynchronise it.
           */
          lastSuccessAt: sql<Date | null>`max(${apiCalls.at}) filter (where ${apiCalls.ok})`,
          lastFailureAt: sql<Date | null>`max(${apiCalls.at}) filter (where not ${apiCalls.ok})`,
          failingSince: sql<Date | null>`min(${apiCalls.at}) filter (where not ${apiCalls.ok} and ${apiCalls.at} > coalesce((select max(a2.at) from api_calls a2 where a2.provider = ${apiCalls.provider} and a2.ok), '-infinity'::timestamptz))`,
          failStreak: sql<number>`(count(*) filter (where not ${apiCalls.ok} and ${apiCalls.at} > coalesce((select max(a2.at) from api_calls a2 where a2.provider = ${apiCalls.provider} and a2.ok), '-infinity'::timestamptz)))::int`,
        })
        .from(apiCalls)
        .groupBy(apiCalls.provider)) as typeof rows;
      measured = true;
    }
  } catch {
    /* no database — every provider simply reports zero */
  }

  const byId = new Map(rows.map((r) => [r.provider, r]));

  return PROVIDERS.map((p) => {
    const u = byId.get(p.id);
    const units = u?.units ?? 0;
    // The free allowance is monthly, so it offsets the last 30 days' calls,
    // not the all-time total.
    const billableRecent = p.freePerMonth
      ? Math.max(0, (u?.last30 ?? 0) - p.freePerMonth)
      : (u?.last30 ?? 0);
    const billableTotal = p.freePerMonth ? billableRecent : units;
    return {
      ...p,
      configured: p.envKey === "" || Boolean(process.env[p.envKey]),
      calls: u?.calls ?? 0,
      callsLast30: u?.last30 ?? 0,
      failures: u?.failures ?? 0,
      unitsTotal: units,
      estimatedRupees: Math.round(billableTotal * p.rupeesPerCall * 100) / 100,
      lastUsed: u?.lastUsed ? new Date(u.lastUsed).toISOString() : null,
      ...providerHealth(
        {
          calls: u?.calls ?? 0,
          failStreak: u?.failStreak ?? 0,
          failingSince: u?.failingSince ?? null,
          lastFailureAt: u?.lastFailureAt ?? null,
          measured,
        },
        p.envKey === "" || Boolean(process.env[p.envKey]?.trim()),
      ),
    };
  });
}

export type HealthState = "working" | "failing" | "was_failing" | "not_configured" | "no_data";

/**
 * Is this provider working, and if not, since when?
 *
 * Pure, so it can be tested without a database.
 *
 * The thresholds are not arbitrary. recordApiCall fires INSIDE the
 * three-attempt retry loop in gemini.ts, so a single rate-limited call
 * already writes three failure rows in about two seconds — a threshold of
 * three would turn the panel red on one 429. Five forces at least two
 * genuinely separate failed calls. The thirty-minute floor then means a
 * provider having one bad minute never reddens: within half an hour either a
 * success lands, which empties the streak by definition, or the failures are
 * real and the founder should know.
 */
export function providerHealth(
  row: {
    calls: number;
    failStreak: number;
    failingSince: Date | string | null;
    lastFailureAt: Date | string | null;
    measured: boolean;
  },
  configured: boolean,
  now: Date = new Date(),
): { health: HealthState; failingSince: string | null } {
  const since = row.failingSince ? new Date(row.failingSince) : null;
  const lastFail = row.lastFailureAt ? new Date(row.lastFailureAt) : null;
  const iso = since ? since.toISOString() : null;

  if (!configured) return { health: "not_configured", failingSince: null };
  if (!row.measured || row.calls === 0) return { health: "no_data", failingSince: null };

  const MIN_STREAK = 5;
  const MIN_AGE_MS = 30 * 60 * 1000;
  const STALE_MS = 7 * 24 * 60 * 60 * 1000;

  if (row.failStreak >= MIN_STREAK && since && lastFail) {
    const aged = now.getTime() - since.getTime() >= MIN_AGE_MS;
    const recent = now.getTime() - lastFail.getTime() <= STALE_MS;
    if (aged && recent) return { health: "failing", failingSince: iso };
    // Broke, and then nothing has called it since. Still worth showing the
    // date, but it is history rather than an alarm.
    if (aged) return { health: "was_failing", failingSince: iso };
  }
  return { health: "working", failingSince: null };
}

/** Calls per day for the last 30 days, for the console's chart. */
export async function usageDaily(): Promise<Array<{ day: string; calls: number }>> {
  try {
    if (!(await stackHealth()).db) return [];
    return await db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${apiCalls.at}), 'YYYY-MM-DD')`,
        calls: sql<number>`count(*)::int`,
      })
      .from(apiCalls)
      .where(sql`${apiCalls.at} > now() - interval '30 days'`)
      .groupBy(sql`date_trunc('day', ${apiCalls.at})`)
      .orderBy(sql`date_trunc('day', ${apiCalls.at})`);
  } catch {
    return [];
  }
}
