-- Delegated console access (23 Aug 2026).
--
-- Admin access was ADMIN_EMAILS in the environment and nothing else, so adding
-- a person meant editing .env and restarting, and the founder could not let a
-- developer in without handing over the product's own account.
--
-- Owners stay in the environment. They are the accounts that cannot be revoked
-- from the console, which is what stops an admin screen from being able to lock
-- its owner out. This table is everyone else: granted by an owner, revocable by
-- an owner, and read fresh on every admin request rather than cached, so a
-- revoke takes effect on the next request.
CREATE TABLE IF NOT EXISTS "admin_grants" (
  "email"      text PRIMARY KEY,
  "granted_by" text NOT NULL,
  "note"       text,
  "granted_at" timestamptz NOT NULL DEFAULT now()
);
