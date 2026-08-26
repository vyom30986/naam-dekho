-- API usage ledger (5 Aug 2026).
--
-- One row per outbound call to a paid or rate-limited service, so the founder
-- can see what the product is actually spending. Deliberately tiny: provider,
-- whether it worked, and when. No request bodies, no customer data — a usage
-- log is not a place to accumulate anything sensitive.
CREATE TABLE IF NOT EXISTS "api_calls" (
  "id" bigserial PRIMARY KEY,
  "provider" text NOT NULL,
  "operation" text,
  "ok" boolean DEFAULT true NOT NULL,
  "units" integer DEFAULT 1 NOT NULL,
  "at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- The console asks "how many calls per provider, and how many recently?" —
-- both answered from this index without scanning the table.
CREATE INDEX IF NOT EXISTS "api_calls_provider_at_idx" ON "api_calls" ("provider", "at" DESC);
