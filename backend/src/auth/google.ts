import crypto from "node:crypto";
import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { env } from "../config.js";
import { logger } from "../logger.js";
import { stackHealth, devUserUpsertByEmail } from "../lib/devstack.js";
import { signupBonusTokens } from "../lib/tokens.js";

/**
 * Google Sign-In.
 *
 * The browser runs Google Identity Services, which hands us a signed ID token
 * (a JWT). Everything that matters happens HERE, on the server:
 *
 *   1. Fetch Google's public signing keys (JWKS) and verify the RS256
 *      signature. Without this step anyone could hand-craft a token claiming
 *      to be any email address — decoding a JWT is not verifying it.
 *   2. Check `aud` equals OUR client id, so a valid token minted for a
 *      different app cannot be replayed against us.
 *   3. Check `iss` is Google.
 *   4. Check expiry (jsonwebtoken enforces `exp`, with no clock tolerance).
 *   5. Require `email_verified` — an unverified address proves nothing.
 *
 * Only then do we mint our own session JWT.
 */

const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS: [string, ...string[]] = ["accounts.google.com", "https://accounts.google.com"];

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim());
}

function clientId(): string {
  return process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
}

// ── JWKS cache ───────────────────────────────────────────────────────
// Google rotates these keys. We cache them but re-fetch on an unknown `kid`
// so a rotation cannot lock users out, and never longer than the TTL.
interface Jwk { kid: string; kty: string; n: string; e: string; alg?: string; use?: string }
let jwksCache: { at: number; keys: Jwk[] } | null = null;
const JWKS_TTL_MS = 60 * 60 * 1000;

async function fetchJwks(force = false): Promise<Jwk[]> {
  if (!force && jwksCache && Date.now() - jwksCache.at < JWKS_TTL_MS) return jwksCache.keys;
  const res = await fetch(GOOGLE_JWKS_URL, { signal: AbortSignal.timeout(8_000) });
  if (!res.ok) throw new Error(`jwks_fetch_failed_${res.status}`);
  const body = (await res.json()) as { keys?: Jwk[] };
  const keys = body.keys ?? [];
  if (keys.length === 0) throw new Error("jwks_empty");
  jwksCache = { at: Date.now(), keys };
  return keys;
}

async function publicKeyForKid(kid: string): Promise<crypto.KeyObject> {
  let keys = await fetchJwks();
  let jwk = keys.find((k) => k.kid === kid);
  if (!jwk) {
    // Unknown key id — Google may have rotated. Re-fetch once before failing.
    keys = await fetchJwks(true);
    jwk = keys.find((k) => k.kid === kid);
  }
  if (!jwk) throw new Error("unknown_signing_key");
  return crypto.createPublicKey({ key: jwk as unknown as crypto.JsonWebKey, format: "jwk" });
}

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
  /**
   * When Google issued the token, as epoch seconds.
   *
   * Needed for step-up checks: proving you signed in at SOME point is not the
   * same as proving you are at the keyboard now. Without this, an old ID token
   * lifted from storage would pass as identity verification.
   */
  issuedAt: number;
}

/** Verify a Google ID token. Throws on anything suspicious — never returns a partial trust. */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity> {
  if (!isGoogleConfigured()) throw new Error("google_not_configured");

  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded || typeof decoded === "string" || !decoded.header?.kid) {
    throw new Error("malformed_token");
  }
  if (decoded.header.alg !== "RS256") {
    // Refuse "alg: none" and HMAC confusion attacks outright.
    throw new Error("unexpected_algorithm");
  }

  const key = await publicKeyForKid(decoded.header.kid);

  const payload = jwt.verify(idToken, key, {
    algorithms: ["RS256"],
    audience: clientId(),
    issuer: GOOGLE_ISSUERS,
    clockTolerance: 0,
  }) as jwt.JwtPayload;

  const email = typeof payload.email === "string" ? payload.email.toLowerCase().trim() : "";
  if (!email) throw new Error("no_email_in_token");
  if (payload.email_verified !== true) throw new Error("email_not_verified");
  if (!payload.sub) throw new Error("no_subject_in_token");

  return {
    sub: String(payload.sub),
    email,
    emailVerified: true,
    name: typeof payload.name === "string" ? payload.name : undefined,
    picture: typeof payload.picture === "string" ? payload.picture : undefined,
    issuedAt: typeof payload.iat === "number" ? payload.iat : 0,
  };
}

/**
 * Exchange a verified Google identity for a Naam Dekho session.
 * First-time sign-ins get exactly one free Deep Search credit (FR-5.4.1) —
 * the same rule the phone flow used.
 */
export async function signInWithGoogle(
  idToken: string,
): Promise<{ idToken: string; userId: string; email: string; isNewUser: boolean }> {
  const identity = await verifyGoogleIdToken(idToken);
  const health = await stackHealth();

  let userId: string;
  let isNewUser = false;

  if (!health.db) {
    const out = devUserUpsertByEmail(identity.email, identity.name);
    userId = out.user.id;
    isNewUser = out.created;
  } else {
    const existing = await db.select().from(users).where(eq(users.email, identity.email)).limit(1);
    if (existing.length > 0) {
      userId = existing[0].id;
      await db
        .update(users)
        .set({ lastLoginAt: new Date(), ...(identity.name ? { displayName: identity.name } : {}) })
        .where(eq(users.id, userId));
    } else {
      const [created] = await db
        .insert(users)
        .values({
          email: identity.email,
          displayName: identity.name ?? null,
          tier: "retail",
          // The entrance bonus: 500 tokens, once per Google account, never
          // expires. Enough for one Deep Search plus three Standard searches.
          tokens: await signupBonusTokens(),
          lastLoginAt: new Date(),
        })
        .returning({ id: users.id });
      userId = created.id;
      isNewUser = true;
    }
  }

  logger.info({ userId, isNewUser }, "Google sign-in");

  const session = jwt.sign({ uid: userId, email: identity.email }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as unknown as number,
  });

  return { idToken: session, userId, email: identity.email, isNewUser };
}
