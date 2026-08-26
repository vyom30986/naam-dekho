import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { env } from "../config.js";

/**
 * Editing API keys from a browser — carefully.
 *
 * Being an admin is not enough to reach this screen. A stolen laptop, a
 * borrowed session or a forgotten open tab already gets someone the console;
 * it must not also get them the key that moves money. So:
 *
 * 1. A SECOND PASSWORD, held in ADMIN_API_PASSWORD in .env on the server and
 *    NEVER editable from the browser. A session cannot change its own lock.
 *
 * 2. KEYS ARE WRITE-ONLY. The panel shows sk_live_…a7f9 and nothing more.
 *    You can REPLACE a key; you can never read one back. Someone who gets in
 *    can break your payments — which you would notice within minutes — but
 *    cannot walk away with your Razorpay secret.
 *
 * 3. THE UNLOCK IS SHORT-LIVED. Fifteen minutes, then it expires. Signed with
 *    the server's JWT secret so it cannot be forged, and scoped so it works
 *    for nothing except this screen.
 */

const UNLOCK_TTL_MS = 15 * 60 * 1000;

/** Keys the panel may manage. Anything not listed here is untouchable. */
export const MANAGED_KEYS = [
  { env: "RAZORPAY_KEY_ID", label: "Razorpay Key ID", provider: "razorpay", secret: false, tier: "paid" },
  { env: "RAZORPAY_KEY_SECRET", label: "Razorpay Key Secret", provider: "razorpay", secret: true, tier: "paid" },
  { env: "RAZORPAY_WEBHOOK_SECRET", label: "Razorpay Webhook Secret", provider: "razorpay", secret: true, tier: "paid" },
  { env: "GEMINI_API_KEY", label: "Gemini API key", provider: "gemini", secret: true, tier: "free" },
  { env: "SCRAPING_BEE_API_KEY", label: "ScrapingBee API key", provider: "scrapingbee", secret: true, tier: "paid" },
  // Founder's own Facebook integration. Stored here so it can be rotated from
  // the console like any other key — but NOTHING in the product calls it yet,
  // and the usage row says so, because a green tick beside a key that drives
  // no check is a lie the founder would only discover later.
  { env: "METAPILOT_API_KEY", label: "MetaPilot (Facebook)", provider: "metapilot", secret: true, tier: "paid" },
  { env: "GOOGLE_CSE_API_KEY", label: "Google Custom Search key", provider: "google-cse", secret: true, tier: "paid" },
  // Cloudflare R2, S3-compatible. Only the secret access key is masked: the
  // endpoint, bucket and access key ID are identifiers, and the founder needs
  // to read them back to check them against the Cloudflare dashboard.
  { env: "R2_ENDPOINT", label: "R2 endpoint", provider: "r2", secret: false, tier: "paid" },
  { env: "R2_BUCKET", label: "R2 bucket name", provider: "r2", secret: false, tier: "paid" },
  { env: "R2_ACCESS_KEY_ID", label: "R2 Access Key ID", provider: "r2", secret: false, tier: "paid" },
  { env: "R2_SECRET_ACCESS_KEY", label: "R2 Secret Access Key", provider: "r2", secret: true, tier: "paid" },
  { env: "GITHUB_TOKEN", label: "GitHub token", provider: "github", secret: true, tier: "free" },
  { env: "TWO_CAPTCHA_KEY", label: "2Captcha key", provider: "twocaptcha", secret: true, tier: "paid" },
  { env: "BHASHINI_USER_ID", label: "Bhashini User ID", provider: "bhashini", secret: false, tier: "free" },
  { env: "BHASHINI_ULCA_API_KEY", label: "Bhashini ULCA key", provider: "bhashini", secret: true, tier: "free" },
  { env: "GOOGLE_CLIENT_ID", label: "Google sign-in Client ID", provider: "google-signin", secret: false, tier: "free" },
] as const satisfies readonly {
  env: string; label: string; provider: string; secret: boolean;
  /**
   * Can this key ever produce a bill?
   *
   * Not "is it costing anything today" — three of the paid accounts bill
   * nothing right now only because nothing calls them yet. The question the
   * founder needs answered is which keys can generate an invoice, so those
   * are the ones to watch.
   */
  tier: "free" | "paid";
}[];

export function isApiPasswordConfigured(): boolean {
  return Boolean(process.env.ADMIN_API_PASSWORD?.trim());
}

/**
 * Show enough to recognise a key, never enough to use one.
 * A non-secret (a client ID, already public) is shown in full.
 */
export function maskKey(value: string | undefined, secret: boolean): string | null {
  const v = value?.trim();
  if (!v) return null;
  if (!secret) return v;
  if (v.length <= 8) return "•".repeat(v.length);
  return `${v.slice(0, 4)}${"•".repeat(Math.max(4, Math.min(12, v.length - 8)))}${v.slice(-4)}`;
}

// ── The short-lived unlock ────────────────────────────────────────

function sign(payload: string): string {
  return createHmac("sha256", env.JWT_SECRET).update(payload).digest("base64url");
}

/** Constant-time compare — a plain === leaks the password one character at a time. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function checkApiPassword(candidate: string): boolean {
  const real = process.env.ADMIN_API_PASSWORD?.trim();
  if (!real) return false;
  return safeEqual(candidate, real);
}

export function issueUnlock(actor: string): string {
  const body = `${actor}.${Date.now() + UNLOCK_TTL_MS}.${randomUUID()}`;
  return `${Buffer.from(body).toString("base64url")}.${sign(body)}`;
}

export function verifyUnlock(token: string | undefined): { ok: boolean; actor?: string } {
  if (!token) return { ok: false };
  const [encoded, mac] = token.split(".");
  if (!encoded || !mac) return { ok: false };
  let body: string;
  try {
    body = Buffer.from(encoded, "base64url").toString();
  } catch {
    return { ok: false };
  }
  if (!safeEqual(mac, sign(body))) return { ok: false };
  const [actor, expiresAt] = body.split(".");
  if (!actor || Number(expiresAt) < Date.now()) return { ok: false };
  return { ok: true, actor };
}

// ── Writing a key back to .env ────────────────────────────────────

const ENV_PATH = resolve(process.cwd(), ".env");

/**
 * Settings writeEnvKey may touch, beyond the keys shown on the screen.
 *
 * The second password lives here rather than in MANAGED_KEYS so it can be
 * changed through the verified flow without ever appearing in the key list —
 * a password is not an API key and should not be sitting on screen with a
 * "Replace" button beside it.
 */
const ALSO_WRITABLE = new Set(["ADMIN_API_PASSWORD"]);

/**
 * Replace one setting in .env, in place.
 *
 * Rewrites only the matching line so comments, ordering and every other
 * setting survive untouched — the file is edited by hand too, and a tool that
 * reformats it would be quietly hostile.
 *
 * The process must be restarted for the new value to take effect, which the
 * console says plainly rather than pretending the change is instant.
 */
export function writeEnvKey(key: string, value: string): { ok: boolean; error?: string } {
  const allowed = MANAGED_KEYS.some((k) => k.env === key) || ALSO_WRITABLE.has(key);
  if (!allowed) return { ok: false, error: "not_managed" };
  if (!/^[\x20-\x7E]{1,400}$/.test(value)) return { ok: false, error: "invalid_value" };
  if (!existsSync(ENV_PATH)) return { ok: false, error: "env_not_found" };

  try {
    const contents = readFileSync(ENV_PATH, "utf8");
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, "m");
    const next = pattern.test(contents)
      ? contents.replace(pattern, line)
      : `${contents.trimEnd()}\n${line}\n`;
    writeFileSync(ENV_PATH, next, "utf8");
    // Take effect immediately for anything reading process.env at call time.
    process.env[key] = value;
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
