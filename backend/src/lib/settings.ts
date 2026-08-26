import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { settings } from "../db/schema.js";
import { stackHealth } from "./devstack.js";

/**
 * Editable product configuration — the heart of the super admin panel.
 *
 * Flow: the founder edits a DRAFT in the panel, previews the site with it,
 * then PUBLISHES. The live site only ever reads `published`. Code constants
 * remain as defaults, so a fresh database (or a broken row) can never take
 * pricing to zero — the site falls back to what is compiled in.
 */

export const pricingSchema = z.object({
  signupBonus: z.number().int().min(0).max(100_000),
  costs: z.object({
    business: z.object({
      standard: z.number().int().min(1).max(100_000),
      deep: z.number().int().min(1).max(100_000),
    }),
    baby: z.object({
      standard: z.number().int().min(1).max(100_000),
      deep: z.number().int().min(1).max(100_000),
    }),
  }),
  addons: z.object({
    keepsake: z.number().int().min(1).max(100_000),
    shortlist: z.number().int().min(1).max(100_000),
  }),
  packs: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        rupees: z.number().int().min(1).max(1_000_000),
        tokens: z.number().int().min(1).max(10_000_000),
        label: z.string().min(1).max(60),
      }),
    )
    .min(1)
    .max(6),
});

export type PricingConfig = z.infer<typeof pricingSchema>;

/** Compiled-in defaults — the launch pricing, and the fallback forever. */
export const DEFAULT_PRICING: PricingConfig = {
  signupBonus: 500,
  costs: {
    business: { standard: 50, deep: 350 },
    baby: { standard: 25, deep: 300 },
  },
  addons: { keepsake: 300, shortlist: 1000 },
  packs: [
    { id: "pack-500", rupees: 50, tokens: 500, label: "500 tokens" },
    { id: "pack-5000", rupees: 500, tokens: 5000, label: "5,000 tokens" },
  ],
};

// ── Published pricing, cached ────────────────────────────────────
// A 30-second cache means a publish takes effect within half a minute
// everywhere without every scan paying a settings query.
let cached: { value: PricingConfig; at: number } | null = null;

export function invalidatePricingCache(): void {
  cached = null;
}

export async function getPricing(): Promise<PricingConfig> {
  if (cached && Date.now() - cached.at < 30_000) return cached.value;
  let value = DEFAULT_PRICING;
  try {
    if ((await stackHealth()).db) {
      const [row] = await db.select().from(settings).where(eq(settings.key, "pricing")).limit(1);
      if (row?.published) {
        const parsed = pricingSchema.safeParse(row.published);
        // An invalid published row is IGNORED, loudly-by-shape: better the
        // compiled defaults than half a config.
        if (parsed.success) value = parsed.data;
      }
    }
  } catch {
    /* database briefly away — defaults are correct-by-construction */
  }
  cached = { value, at: Date.now() };
  return value;
}

// ── Draft handling (admin only — audit rows are written by the routes) ──

export interface PricingRow {
  published: PricingConfig; // effective published (defaults if none stored)
  draft: PricingConfig | null;
}

export async function getPricingRow(): Promise<PricingRow> {
  const [row] = await db.select().from(settings).where(eq(settings.key, "pricing")).limit(1);
  const pub = row?.published ? pricingSchema.safeParse(row.published) : null;
  const dr = row?.draft ? pricingSchema.safeParse(row.draft) : null;
  return {
    published: pub?.success ? pub.data : DEFAULT_PRICING,
    draft: dr?.success ? dr.data : null,
  };
}

export async function savePricingDraft(draft: PricingConfig, actor: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key: "pricing", draft, updatedAt: new Date(), updatedBy: actor })
    .onConflictDoUpdate({
      target: settings.key,
      set: { draft, updatedAt: new Date(), updatedBy: actor },
    });
}

/** draft → published. Returns what was live before, for the audit row. */
export async function publishPricing(actor: string): Promise<{ before: PricingConfig; after: PricingConfig } | null> {
  const row = await getPricingRow();
  if (!row.draft) return null; // nothing to publish
  await db
    .insert(settings)
    .values({ key: "pricing", published: row.draft, draft: null, updatedAt: new Date(), updatedBy: actor })
    .onConflictDoUpdate({
      target: settings.key,
      set: { published: row.draft, draft: null, updatedAt: new Date(), updatedBy: actor },
    });
  invalidatePricingCache();
  return { before: row.published, after: row.draft };
}

export async function discardPricingDraft(actor: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key: "pricing", draft: null, updatedAt: new Date(), updatedBy: actor })
    .onConflictDoUpdate({
      target: settings.key,
      set: { draft: null, updatedAt: new Date(), updatedBy: actor },
    });
}

// ── Check toggles ────────────────────────────────────────────────
// A simple published-only list of disabled tile ids ("soc-ig", "mp-amzn"…).
// No draft flow: switching a broken check off should be one click, and the
// honest tile ("temporarily unavailable") is the preview.

let scannersCached: { value: string[]; at: number } | null = null;

export function invalidateScannersCache(): void {
  scannersCached = null;
}

export async function disabledScanners(): Promise<string[]> {
  if (scannersCached && Date.now() - scannersCached.at < 30_000) return scannersCached.value;
  let value: string[] = [];
  try {
    if ((await stackHealth()).db) {
      const [row] = await db.select().from(settings).where(eq(settings.key, "scanners")).limit(1);
      const parsed = z.object({ disabled: z.array(z.string()).max(64) }).safeParse(row?.published);
      if (parsed.success) value = parsed.data.disabled;
    }
  } catch {
    /* defaults: everything enabled */
  }
  scannersCached = { value, at: Date.now() };
  return value;
}

export async function setDisabledScanners(disabled: string[], actor: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key: "scanners", published: { disabled }, updatedAt: new Date(), updatedBy: actor })
    .onConflictDoUpdate({
      target: settings.key,
      set: { published: { disabled }, updatedAt: new Date(), updatedBy: actor },
    });
  invalidateScannersCache();
}

/** Sellable features the founder has switched off in the console. */
export const FEATURE_IDS = ["certificate", "complete-set"] as const;

let featuresCached: { value: string[]; at: number } | null = null;

/**
 * Kept as its own list rather than folded into the scanner switches. A scanner
 * is a CHECK that produces a tile; a feature is something we SELL. Sharing one
 * list would mean switching off a product silently dropped a tile, or the
 * reverse. Empty on any failure — a database blip must never take a paid
 * feature away from someone who paid for it.
 */
export async function disabledFeatures(): Promise<string[]> {
  if (featuresCached && Date.now() - featuresCached.at < 30_000) return featuresCached.value;
  let value: string[] = [];
  try {
    if ((await stackHealth()).db) {
      const [row] = await db.select().from(settings).where(eq(settings.key, "features")).limit(1);
      const parsed = z.object({ disabled: z.array(z.string()).max(16) }).safeParse(row?.published);
      if (parsed.success) value = parsed.data.disabled;
    }
  } catch {
    /* everything enabled */
  }
  featuresCached = { value, at: Date.now() };
  return value;
}

export async function setDisabledFeatures(disabled: string[]): Promise<void> {
  await db
    .insert(settings)
    .values({ key: "features", published: { disabled } })
    .onConflictDoUpdate({ target: settings.key, set: { published: { disabled } } });
  featuresCached = null;
}
