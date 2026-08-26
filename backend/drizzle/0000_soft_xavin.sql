DO $$ BEGIN
 CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'won', 'lost');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payment_provider" AS ENUM('razorpay', 'paytm');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payment_status" AS ENUM('created', 'authorised', 'captured', 'failed', 'refunded');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."scan_mode" AS ENUM('business', 'baby');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."scan_status" AS ENUM('queued', 'running', 'complete', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."scan_tier" AS ENUM('free', 'deep', 'keepsake', 'shortlist', 'agency');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."tile_status" AS ENUM('ok', 'no', 'warn', 'info', 'pending', 'error');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."user_tier" AS ENUM('free', 'retail', 'founder-pro', 'agency');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agency_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"company" text NOT NULL,
	"firm_type" text,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"expected_volume" text,
	"budget_range" text,
	"notes" text,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"assigned_to" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "billing_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"provider" "payment_provider" NOT NULL,
	"intent_id" text NOT NULL,
	"amount_paise" bigint NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" "payment_status" NOT NULL,
	"scan_id" text,
	"product_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"raw_payload" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scan_results" (
	"scan_id" text NOT NULL,
	"tile_id" text NOT NULL,
	"category" text NOT NULL,
	"status" "tile_status" NOT NULL,
	"summary" text,
	"detail" jsonb NOT NULL,
	"latency_ms" integer,
	CONSTRAINT "scan_results_scan_id_tile_id_pk" PRIMARY KEY("scan_id","tile_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scans" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"anonymous_ip" "inet",
	"name" text NOT NULL,
	"name_normalised" text NOT NULL,
	"mode" "scan_mode" NOT NULL,
	"industry" text,
	"tier" "scan_tier" NOT NULL,
	"status" "scan_status" DEFAULT 'queued' NOT NULL,
	"verdict_score" integer,
	"total_tiles" integer NOT NULL,
	"clear_count" integer,
	"conflict_count" integer,
	"warn_count" integer,
	"pending_count" integer,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"pdf_object_key" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text,
	"email" text,
	"display_name" text,
	"tier" "user_tier" DEFAULT 'free' NOT NULL,
	"agency_org_id" uuid,
	"credits_free" integer DEFAULT 0 NOT NULL,
	"credits_bundle" integer DEFAULT 0 NOT NULL,
	"credits_expires_at" timestamp with time zone,
	"jwt_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "users_phone_unique" UNIQUE("phone"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scan_results" ADD CONSTRAINT "scan_results_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scans" ADD CONSTRAINT "scans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scans_user_started_idx" ON "scans" ("user_id","started_at");