import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";

/**
 * Credits (PRD §5.5):
 *   - 1 credit = 1 Deep Search (FR-5.5.1)
 *   - Free credits never expire; bundle credits expire 90 days after
 *     purchase (FR-5.5.2)
 *   - Spend order: free first, then unexpired bundle.
 *
 * Both updates are single atomic statements guarded by `> 0` conditions, so
 * concurrent spends can never drive a balance negative.
 */
export async function spendCredit(userId: string): Promise<boolean> {
  const freeSpent = await db
    .update(users)
    .set({ creditsFree: sql`${users.creditsFree} - 1` })
    .where(and(eq(users.id, userId), gt(users.creditsFree, 0)))
    .returning({ id: users.id });
  if (freeSpent.length > 0) return true;

  const bundleSpent = await db
    .update(users)
    .set({ creditsBundle: sql`${users.creditsBundle} - 1` })
    .where(
      and(
        eq(users.id, userId),
        gt(users.creditsBundle, 0),
        or(isNull(users.creditsExpiresAt), gt(users.creditsExpiresAt, new Date())),
      ),
    )
    .returning({ id: users.id });
  return bundleSpent.length > 0;
}

/** Refund one free credit — only for system-error scans (FR-5.5.4). */
export async function refundCredit(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ creditsFree: sql`${users.creditsFree} + 1` })
    .where(eq(users.id, userId));
}

/** Grant purchased credits. Bundle credits get a 90-day expiry (FR-5.4.3). */
export async function grantCredits(userId: string, kind: "single" | "bundle-12"): Promise<void> {
  if (kind === "single") {
    await db
      .update(users)
      .set({ creditsFree: sql`${users.creditsFree} + 1` })
      .where(eq(users.id, userId));
    return;
  }
  const expires = new Date(Date.now() + 90 * 24 * 3600 * 1000);
  await db
    .update(users)
    .set({
      creditsBundle: sql`${users.creditsBundle} + 12`,
      creditsExpiresAt: expires,
    })
    .where(eq(users.id, userId));
}
