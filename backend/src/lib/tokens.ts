import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import type { ScanTier } from "./types.js";
import { DEFAULT_PRICING, getPricing, type PricingConfig } from "./settings.js";

/**
 * TOKENS — the single currency for everything the product does.
 *
 *   Signup gift .............. 500 tokens, once per account, never expires
 *
 *   BUSINESS   Standard search ....  50   (20 checks)
 *              Deep Search ....... 350   (23 checks)
 *   BABY       Name search ........  25   (9 checks)
 *              Full naming report  300   (the 9 checks + keepsake certificate)
 *   ADD-ONS    Keepsake ......... 300
 *              Shortlist of Five  1,000
 *
 *   ₹50 ...... 500 tokens        ₹500 ...... 5,000 tokens   (1 token = ₹0.10)
 *
 * What the 500-token gift buys, depending on who you are:
 *   a founder — one Deep Search plus three Standard searches, or ten Standard
 *   a parent  — twenty name searches, or one Full naming report with change
 *
 * The Full naming report is deliberately cheaper than buying its parts
 * (25 + 300 = 325), so the search effectively comes free with the certificate.
 *
 * There is no free tier any more: every search is signed-in and costs tokens.
 */

/**
 * SINCE 4 AUG 2026 the numbers live in the settings table, editable from the
 * super admin panel (draft → preview → publish). The values here are the
 * compiled-in DEFAULTS — the launch pricing, and the permanent fallback when
 * no published row exists or the database is briefly away. tokenCost() reads
 * a snapshot refreshed via refreshPricing(); spendTokens refreshes before
 * every charge, so a publish takes effect within the 30-second cache window.
 *
 * Baby searches are priced at half the business rate because they genuinely
 * cost a fraction to run — 9 checks of which only 2 leave our server, against
 * ~20 outbound calls for a business search.
 *
 * NOTE THE FAIL-CLOSED DEFAULT. Anything unrecognised is charged the MAXIMUM,
 * never zero — a gate keyed on one tier name while everything downstream keyed
 * on another is exactly what gave the whole paid product away for ₹0 on
 * 3 Aug 2026.
 */

export const SIGNUP_BONUS_TOKENS = DEFAULT_PRICING.signupBonus;

/** The live signup gift — reads published settings, falls back to the default. */
export async function signupBonusTokens(): Promise<number> {
  return (await getPricing()).signupBonus;
}

// Snapshot the sync helpers read. Refreshed by refreshPricing(); starts (and
// on any failure remains) at the compiled defaults.
let CURRENT: PricingConfig = DEFAULT_PRICING;

export async function refreshPricing(): Promise<PricingConfig> {
  CURRENT = await getPricing();
  return CURRENT;
}

export function currentPricing(): PricingConfig {
  return CURRENT;
}

/** The most a SEARCH costs — charged for any tier/mode we do not recognise.
 * Add-ons are deliberately excluded: they are bought against an existing
 * scan, so an unknown search tier must map to the dearest search, not to
 * the Shortlist's 1,000. */
function maxCost(p: PricingConfig): number {
  return Math.max(...Object.values(p.costs).flatMap((m) => Object.values(m)));
}

/** Static default add-on prices (tests, docs). Live values: currentPricing().addons */
export const ADDON_COST = DEFAULT_PRICING.addons;

export function tokenCost(tier: ScanTier | string, mode: "business" | "baby" | string = "business"): number {
  const forMode = (CURRENT.costs as Record<string, Record<string, number>>)[mode];
  if (forMode?.[tier] !== undefined) return forMode[tier];

  /*
   * Some tiers are priced as add-ons rather than per mode — "shortlist" and
   * "keepsake" live under pricing.addons, not pricing.costs. Without this
   * branch they fell through to maxCost(), which is the most expensive SCAN
   * on the site: a 1,000-token shortlist was quietly billed at 350.
   */
  const addons = (CURRENT as { addons?: Record<string, number> }).addons;
  if (addons?.[tier] !== undefined) return addons[tier];

  return maxCost(CURRENT); // genuinely unknown → charge the most
}

/** Static default packs (tests, docs). Live values: currentPricing().packs */
export const TOKEN_PACKS = DEFAULT_PRICING.packs;

export type TokenPackId = string;

export interface SpendResult {
  ok: boolean;
  /** Balance AFTER a successful spend; the current balance when refused. */
  balance: number;
  cost: number;
}

/**
 * Spend tokens for one search.
 *
 * A single atomic UPDATE guarded by `tokens >= cost`. Two requests racing for
 * the last 350 tokens cannot both succeed: Postgres serialises the row update,
 * so the second sees the decremented value and its WHERE clause fails. This
 * is why the check and the decrement must stay in ONE statement — a read-then-
 * write version would double-spend under concurrency.
 */
export async function spendTokens(
  userId: string,
  tier: ScanTier | string,
  mode: "business" | "baby" | string = "business",
): Promise<SpendResult> {
  await refreshPricing(); // charge at the price on the site, not a stale one
  const cost = tokenCost(tier, mode);

  const spent = await db
    .update(users)
    .set({ tokens: sql`${users.tokens} - ${cost}` })
    .where(and(eq(users.id, userId), gte(users.tokens, cost)))
    .returning({ tokens: users.tokens });

  if (spent.length > 0) return { ok: true, balance: spent[0].tokens, cost };

  // Refused — report the real balance so the UI can say how short they are.
  const [row] = await db
    .select({ tokens: users.tokens })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return { ok: false, balance: row?.tokens ?? 0, cost };
}

/**
 * Charge for an add-on — a keepsake certificate, or the shortlist of five.
 *
 * Add-ons are NOT priced like scans and must not be charged through
 * spendTokens(). tokenCost() resolves `costs[mode][tier]`, and there is no
 * `shortlist` under costs — it lives under `addons`. Passed to spendTokens the
 * lookup misses, falls through to `maxCost()`, and bills the most expensive
 * scan on the site instead of the add-on's price. Same atomic UPDATE as
 * spendTokens, so two clicks on Generate cannot both succeed.
 */
export async function spendAddon(
  userId: string,
  addon: "keepsake" | "shortlist",
): Promise<SpendResult> {
  await refreshPricing(); // charge at the price on the site, not a stale one
  const cost = addonCost(addon);

  const spent = await db
    .update(users)
    .set({ tokens: sql`${users.tokens} - ${cost}` })
    .where(and(eq(users.id, userId), gte(users.tokens, cost)))
    .returning({ tokens: users.tokens });

  if (spent.length > 0) return { ok: true, balance: spent[0].tokens, cost };

  const [row] = await db
    .select({ tokens: users.tokens })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return { ok: false, balance: row?.tokens ?? 0, cost };
}

/** What an add-on costs at the price currently published. */
export function addonCost(addon: "keepsake" | "shortlist"): number {
  const addons = (CURRENT as { addons?: Record<string, number> }).addons;
  return addons?.[addon] ?? DEFAULT_PRICING.addons[addon];
}
/** Give an add-on charge back when our own work fails after taking it. */
export async function refundAddon(
  userId: string,
  addon: "keepsake" | "shortlist",
): Promise<void> {
  await db
    .update(users)
    .set({ tokens: sql`${users.tokens} + ${addonCost(addon)}` })
    .where(eq(users.id, userId));
}

/** Give tokens back when a scan fails through our own fault (FR-5.5.4). */
export async function refundTokens(
  userId: string,
  tier: ScanTier | string,
  mode: "business" | "baby" | string = "business",
): Promise<void> {
  await db
    .update(users)
    .set({ tokens: sql`${users.tokens} + ${tokenCost(tier, mode)}` })
    .where(eq(users.id, userId));
}

/** Credit a purchased pack. */
export async function grantTokens(userId: string, amount: number): Promise<void> {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("invalid_token_amount");
  await db
    .update(users)
    .set({ tokens: sql`${users.tokens} + ${amount}` })
    .where(eq(users.id, userId));
}

export async function tokenBalance(userId: string): Promise<number> {
  const [row] = await db
    .select({ tokens: users.tokens })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.tokens ?? 0;
}

/** How many searches of each kind the balance still affords. */
export function affords(balance: number) {
  return {
    standard: Math.floor(balance / tokenCost("standard", "business")),
    deep: Math.floor(balance / tokenCost("deep", "business")),
    babySearch: Math.floor(balance / tokenCost("standard", "baby")),
    babyReport: Math.floor(balance / tokenCost("deep", "baby")),
  };
}
