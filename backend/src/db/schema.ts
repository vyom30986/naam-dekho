import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  bigint,
  bigserial,
  jsonb,
  boolean,
  pgEnum,
  index,
  inet,
  primaryKey,
} from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────
export const userTier = pgEnum("user_tier", [
  "free",
  "retail",
  "founder-pro",
  "agency",
]);

export const scanMode = pgEnum("scan_mode", ["business", "baby"]);
// "standard" was called "free" until 4 Aug 2026. Nothing is free now — every
// search costs tokens — so the name was renamed along with the model.
export const scanTier = pgEnum("scan_tier", ["standard", "deep", "keepsake", "shortlist", "agency"]);
export const scanStatus = pgEnum("scan_status", ["queued", "running", "complete", "failed"]);
export const tileStatus = pgEnum("tile_status", ["ok", "no", "warn", "info", "pending", "error"]);
export const paymentProvider = pgEnum("payment_provider", ["razorpay", "paytm"]);
export const paymentStatus = pgEnum("payment_status", [
  "created",
  "authorised",
  "captured",
  "failed",
  "refunded",
]);
export const leadStatus = pgEnum("lead_status", ["new", "contacted", "won", "lost"]);

// ─────────────────────────────────────────────────────────────────
// users
// ─────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: text("phone").unique(),
  email: text("email").unique(),
  displayName: text("display_name"),
  tier: userTier("tier").notNull().default("free"),
  agencyOrgId: uuid("agency_org_id"),
  // Credits (PRD §8.1) — free credits never expire; bundle credits expire
  // 90 days after purchase (FR-5.5.2)
  // ── TOKENS (the live currency, 4 Aug 2026) ────────────────────
  // One balance, never expires. 500 granted once on signup.
  // Standard search = 50 · Deep Search = 350 · ₹50 buys 500.
  tokens: integer("tokens").notNull().default(0),

  // Legacy credit columns — superseded by `tokens`. Kept so historical rows
  // stay readable; nothing writes to them any more.
  creditsFree: integer("credits_free").notNull().default(0),
  creditsBundle: integer("credits_bundle").notNull().default(0),
  creditsExpiresAt: timestamp("credits_expires_at", { withTimezone: true }),
  jwtVersion: integer("jwt_version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

// ─────────────────────────────────────────────────────────────────
// scans
// ─────────────────────────────────────────────────────────────────
export const scans = pgTable(
  "scans",
  {
    id: text("id").primaryKey(), // "scn_" + ULID
    userId: uuid("user_id").references(() => users.id),
    anonymousIp: inet("anonymous_ip"),
    name: text("name").notNull(),
    nameNormalised: text("name_normalised").notNull(),
    mode: scanMode("mode").notNull(),
    industry: text("industry"),
    tier: scanTier("tier").notNull(),
    status: scanStatus("status").notNull().default("queued"),
    verdictScore: integer("verdict_score"),
    totalTiles: integer("total_tiles").notNull(),
    clearCount: integer("clear_count"),
    conflictCount: integer("conflict_count"),
    warnCount: integer("warn_count"),
    pendingCount: integer("pending_count"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    pdfObjectKey: text("pdf_object_key"),
  },
  (t) => ({
    userIdx: index("scans_user_started_idx").on(t.userId, t.startedAt),
  }),
);

// ─────────────────────────────────────────────────────────────────
// scan_results — per-tile
// ─────────────────────────────────────────────────────────────────
export const scanResults = pgTable(
  "scan_results",
  {
    scanId: text("scan_id")
      .notNull()
      .references(() => scans.id, { onDelete: "cascade" }),
    tileId: text("tile_id").notNull(),
    category: text("category").notNull(),
    status: tileStatus("status").notNull(),
    summary: text("summary"),
    detail: jsonb("detail").notNull(),
    latencyMs: integer("latency_ms"),
    // Which source answered, and where the user can verify it themselves.
    // Persisted so the evidence report can credit every single check.
    source: text("source"),
    actionUrl: text("action_url"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.scanId, t.tileId] }),
  }),
);

// ─────────────────────────────────────────────────────────────────
// billing_events
// ─────────────────────────────────────────────────────────────────
export const billingEvents = pgTable("billing_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  provider: paymentProvider("provider").notNull(),
  intentId: text("intent_id").notNull(),
  amountPaise: bigint("amount_paise", { mode: "number" }).notNull(),
  currency: text("currency").notNull().default("INR"),
  status: paymentStatus("status").notNull(),
  scanId: text("scan_id").references(() => scans.id),
  productCode: text("product_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  rawPayload: jsonb("raw_payload"),
});

// ─────────────────────────────────────────────────────────────────
// settings — editable product configuration (super admin, 4 Aug 2026)
//
// `published` is what the live site reads; `draft` is the founder's
// work-in-progress, visible only through the admin preview. Publishing
// copies draft → published; discarding clears draft. One row per key
// ("pricing", "scanners", …) so each area publishes independently.
// ─────────────────────────────────────────────────────────────────
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  published: jsonb("published"),
  draft: jsonb("draft"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by"),
});

// ─────────────────────────────────────────────────────────────────
// admin_grants — console access delegated to someone who is not an owner.
//
// The OWNERS live in ADMIN_EMAILS / ADMIN_PHONES and are deliberately NOT in
// this table. An owner cannot be revoked through the console, because the one
// failure this design must never allow is the founder locking themselves out
// of their own product. Anyone in this table was let in by an owner and can be
// removed by one.
//
// Authorisation reads this table on every admin request rather than from a
// cache. A revoked admin has to lose access on their next request, not
// whenever a cache decides to expire.
// ─────────────────────────────────────────────────────────────────
export const adminGrants = pgTable("admin_grants", {
  /** Lowercased email. Primary key, so granting twice is impossible. */
  email: text("email").primaryKey(),
  /** Which owner granted it. Kept for the audit trail. */
  grantedBy: text("granted_by").notNull(),
  /** Why, in plain words. "Dev team, Ravi" beats a bare address six months on. */
  note: text("note"),
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────
// audit_log — every admin mutation, forever. The moment anything is
// editable from a browser, "who changed what, when" stops being optional.
// Append-only: nothing in the code ever updates or deletes a row.
// ─────────────────────────────────────────────────────────────────
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actor: text("actor").notNull(), // admin email
  action: text("action").notNull(), // e.g. "pricing.publish", "corpus.update", "tokens.grant"
  entity: text("entity"), // what it acted on — a settings key, user id, corpus slug
  before: jsonb("before"),
  after: jsonb("after"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────
// corpus_names — the name-page corpus, editable in the admin panel.
// Replaces the hardcoded list in scripts/name-corpus.ts. A meaning is
// printed on the public page ONLY when verified=true and a source is
// recorded — unverified entries render without a meaning rather than
// with a guessed one.
// ─────────────────────────────────────────────────────────────────
export const corpusNames = pgTable("corpus_names", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  gender: text("gender"), // "boy" | "girl" | "unisex"
  origin: text("origin"),
  meaning: text("meaning"),
  /* The Devanagari spelling a Hindi reader would actually write.
     Not derivable from the roman form: our transliterator renders Rahul as
     रहुल and Ram as रम, because roman spelling does not record vowel length,
     and 63% of the corpus came out wrong that way. This column is the lexicon
     that fixes it for the names we publish; an arbitrary name a customer types
     still falls back to transliteration, which is the best that can be done
     without an entry. */
  nativeSpelling: text("native_spelling"),
  meaningSource: text("meaning_source"), // e.g. "en.wiktionary.org"
  meaningUrl: text("meaning_url"),
  verified: boolean("verified").notNull().default(false),
  published: boolean("published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────
// api_calls — one row per outbound paid/rate-limited call, so the
// founder can see what the product actually spends. Deliberately holds
// no request content: a usage log should never accumulate anything
// worth stealing.
// ─────────────────────────────────────────────────────────────────
export const apiCalls = pgTable(
  "api_calls",
  {
    // bigserial in the migration — Postgres supplies it, so inserts must not
    // be required to.
    id: bigserial("id", { mode: "number" }).primaryKey(),
    provider: text("provider").notNull(),
    operation: text("operation"),
    ok: boolean("ok").notNull().default(true),
    units: integer("units").notNull().default(1),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ providerAt: index("api_calls_provider_at_idx").on(t.provider, t.at) }),
);

// ─────────────────────────────────────────────────────────────────
// agency_leads
// ─────────────────────────────────────────────────────────────────
export const agencyLeads = pgTable("agency_leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  role: text("role"),
  company: text("company").notNull(),
  firmType: text("firm_type"),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  expectedVolume: text("expected_volume"),
  budgetRange: text("budget_range"),
  notes: text("notes"),
  status: leadStatus("status").notNull().default("new"),
  assignedTo: uuid("assigned_to"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
