import "dotenv/config";
import { isConfigured, transliterateAll, probeAvailableLanguages, TARGET_LANGUAGES } from "../lib/bhashini.js";

/**
 * Bhashini readiness check — run with:  npm run check:bhashini
 *
 * Step 1 needs no credentials and proves the platform is reachable.
 * Step 2 needs the free credentials and proves transliteration works.
 */
const name = process.argv[2] ?? "Aarav";

console.log("\n  Bhashini readiness check");
console.log("  ─────────────────────────────────────────────\n");

// ── Step 1 — reachability + coverage (no credentials needed) ──
process.stdout.write("  1. Government platform reachable ......... ");
const langs = await probeAvailableLanguages();
if (!langs) {
  console.log("NO");
  console.log("     Could not reach bhashini.gov.in. Check the internet connection.\n");
  process.exit(1);
}
console.log("YES");
const missing = TARGET_LANGUAGES.filter((l) => !langs.includes(l.code));
console.log(`     ${langs.length} languages offered; all ${TARGET_LANGUAGES.length} we need are ${missing.length === 0 ? "covered" : "NOT covered: " + missing.map((m) => m.name).join(", ")}`);

// ── Step 2 — credentials + live transliteration ──────────────
process.stdout.write("\n  2. Credentials configured ................ ");
if (!isConfigured()) {
  console.log("NO");
  console.log("\n     Add these to backend/.env, then re-run this check:");
  console.log("       BHASHINI_USER_ID=<User ID from My Profile>");
  console.log("       BHASHINI_ULCA_API_KEY=<API key from My Profile>");
  console.log("\n     Get them free (5 minutes, no payment) at:");
  console.log("       https://bhashini.gov.in/ulca/user/register");
  console.log("\n     Until then the app uses its in-house transliteration engine,");
  console.log("     which works — it just covers Devanagari only.\n");
  process.exit(0);
}
console.log("YES");

process.stdout.write(`  3. Live transliteration of "${name}" ...... `);
const out = await transliterateAll(name);
if (!out) {
  console.log("FAILED");
  console.log("\n     Credentials are set but Bhashini refused the request.");
  console.log("     Most likely the User ID / API key pair is wrong, or the key was revoked.");
  console.log("     The app stays safe: it falls back to the in-house engine automatically.\n");
  process.exit(1);
}
console.log("OK\n");
for (const r of out) {
  console.log(`     ${r.name.padEnd(12)} ${r.text}`);
}
console.log(`\n  Bhashini is live — ${out.length}/${TARGET_LANGUAGES.length} scripts returned.\n`);
