-- Token system (4 Aug 2026) — replaces the credit model.
-- One balance, never expires. 500 granted once on signup.
-- Standard search = 50 tokens · Deep Search = 350 · ₹50 buys 500.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint

-- The old "free" search tier is now "standard" — every search costs tokens,
-- so nothing is free and the old name was misleading.
ALTER TYPE "scan_tier" RENAME VALUE 'free' TO 'standard';
