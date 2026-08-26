-- Super admin (4 Aug 2026) — the panel stops being read-only.

-- Editable product configuration. `published` is what the live site reads;
-- `draft` is the founder's work-in-progress behind the admin preview.
CREATE TABLE IF NOT EXISTS "settings" (
  "key" text PRIMARY KEY,
  "published" jsonb,
  "draft" jsonb,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" text
);--> statement-breakpoint

-- Every admin mutation, append-only. Nothing ever updates or deletes a row.
CREATE TABLE IF NOT EXISTS "audit_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "actor" text NOT NULL,
  "action" text NOT NULL,
  "entity" text,
  "before" jsonb,
  "after" jsonb,
  "at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- The name-page corpus, editable in the panel. A meaning renders on the
-- public page ONLY when verified with a recorded source.
CREATE TABLE IF NOT EXISTS "corpus_names" (
  "slug" text PRIMARY KEY,
  "name" text NOT NULL,
  "gender" text,
  "origin" text,
  "meaning" text,
  "meaning_source" text,
  "meaning_url" text,
  "verified" boolean DEFAULT false NOT NULL,
  "published" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
