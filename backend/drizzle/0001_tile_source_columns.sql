-- Persist which source answered each tile, and where the user can verify it.
-- Needed so the evidence report can credit every check by name.
ALTER TABLE "scan_results" ADD COLUMN IF NOT EXISTS "source" text;--> statement-breakpoint
ALTER TABLE "scan_results" ADD COLUMN IF NOT EXISTS "action_url" text;
