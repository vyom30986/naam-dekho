/*
 * Every field the certificate request sends must be cleared when a new scan
 * starts.
 *
 * This exists because it was not. startScan() cleared the scan-result state
 * but never the certificate state, which was added later. finalName — the
 * "Which name did you finally choose?" box — therefore survived every new
 * search, and generateFive() reads it first:
 *
 *     const chosen = (finalName || displayName || name).trim()
 *
 * So one name typed into that box was printed on every certificate generated
 * afterwards, for every name searched thereafter, for the rest of the session.
 * A certificate in the wrong child's name is the worst thing this product can
 * produce, so the build refuses to ship if the reset goes missing again.
 *
 * The check is deliberately shallow: it reads the source rather than running
 * the component, because the alternative is a React test harness this project
 * does not otherwise need. It catches the exact regression that happened.
 *
 *   node scripts/check-scan-reset.cjs
 */
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const SRC = join(__dirname, "..", "src", "pages", "Home.jsx");
const text = readFileSync(SRC, "utf8");

/* The state the certificate request is built from. Add to this list whenever
   generateFive()'s body grows a new field backed by component state. */
const MUST_RESET = ["finalName", "firstAkshar", "fiveHtml", "fiveState", "fiveError", "certHtml", "certState"];

const setterFor = (s) => "set" + s[0].toUpperCase() + s.slice(1);

// startScan runs from its declaration to the first line at two-space indent
// that closes it. Good enough to see which setters it reaches, directly or
// through a helper it calls.
const start = text.indexOf("const startScan = async");
if (start === -1) {
  console.error("\n  check-scan-reset: could not find startScan() in Home.jsx.");
  console.error("  If it was renamed, update this check rather than deleting it.\n");
  process.exit(1);
}
const body = text.slice(start, text.indexOf("\n  }", start));

/* Resets may be inlined or grouped into a helper, so follow one level of
   indirection: any zero-argument local function startScan calls is inlined
   into the text we search. */
let searchable = body;
for (const m of body.matchAll(/^\s*([a-zA-Z][\w]*)\(\)\s*$/gm)) {
  const helper = m[1];
  const at = text.indexOf(`const ${helper} = () => {`);
  if (at !== -1) searchable += text.slice(at, text.indexOf("\n  }", at));
}

const missing = MUST_RESET.filter((s) => !searchable.includes(`${setterFor(s)}(`));

if (missing.length) {
  console.error("\n  BUILD STOPPED — a new scan would inherit the last scan's certificate:\n");
  for (const s of missing) {
    console.error(`    · ${s} is never cleared when a scan starts (${setterFor(s)} not called)`);
  }
  console.error(
    "\n  Call it from clearCertificates(), which startScan() already runs.\n" +
    "  This is how certificates came out in the wrong name: finalName was left\n" +
    "  over from a previous search and generateFive() prefers it.\n",
  );
  process.exit(1);
}

console.log(`  scan reset: all ${MUST_RESET.length} certificate fields are cleared on a new scan.`);
