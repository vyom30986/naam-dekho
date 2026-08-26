/**
 * Single source of truth for paid product pricing and naming.
 * Keep in sync with frontend-jsx/src/pages/Pricing.jsx (PRD §5.4).
 */
export interface Product {
  code: string;
  name: string;
  amountPaise: number; // inclusive of 18% GST (FR-5.4.6)
  templateCode?: "business-deep-scan" | "baby-keepsake" | "baby-shortlist";
  credits?: { count: number; expiresDays?: number };
  tier: "deep" | "keepsake" | "shortlist" | "agency";
}

export const PRODUCTS: Record<string, Product> = {
  // ₹50 — one Deep Search credit; never expires (FR-5.4.3, FR-5.5.2)
  "deep-scan": {
    code: "deep-scan",
    name: "Deep Search",
    amountPaise: 5000,
    templateCode: "business-deep-scan",
    credits: { count: 1 },
    tier: "deep",
  },
  // ₹500 — bundle of 12 Deep Search credits, valid 90 days (FR-5.4.3)
  "bundle-12": {
    code: "bundle-12",
    name: "Deep Search Bundle of 12",
    amountPaise: 50000,
    credits: { count: 12, expiresDays: 90 },
    tier: "deep",
  },
  keepsake: {
    code: "keepsake",
    name: "Keepsake PDF Report",
    amountPaise: 2900,
    templateCode: "baby-keepsake",
    tier: "keepsake",
  },
  shortlist: {
    code: "shortlist",
    name: "Shortlist of Five",
    amountPaise: 9900,
    templateCode: "baby-shortlist",
    tier: "shortlist",
  },
};

export function resolveProduct(code: string): Product | null {
  return PRODUCTS[code] ?? null;
}
