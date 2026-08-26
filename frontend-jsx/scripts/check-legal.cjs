/*
 * Stops a deployable bundle being built while the legal pages still contain
 * unfilled placeholders or the wrong company details.
 *
 * Wired to `prebuild`, so it runs on `npm run build` and NOT on `npm run dev`
 * — it can never block day-to-day work, only the act of shipping. Publishing a
 * privacy policy that reads "[To be filled by the Company]", or that names a
 * company which does not exist, is worse than publishing none: it is a document
 * the company cannot rely on and an opposing lawyer can wave about.
 */
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "src", "legal");

/** Text that must never reach production. */
const PLACEHOLDERS = [
  /\[To be filled[^\]]*\]/gi,
  /\[Registered address[^\]]*\]/gi,
  /\[CIN[^\]]*\]/gi,
  /\bTBD\b/g,
  /\bTODO\b/g,
  /\bLorem ipsum\b/gi,
];

/** Details that were wrong once and must not creep back. */
const FORBIDDEN = [
  ["Naam Dekho Technologies", "the entity is Beyond Quantum Technologies Private Limited"],
  ["Bangalore", "the registered office is in Lucknow"],
  ["@naamdekho.in", "the contact address is naamdekho.global@gmail.com"],
  ["Paytm Payment Services", "Paytm is not a payment processor for this platform"],
  ["Paytm (fallback)", "Paytm is not a payment processor for this platform"],
];

/** Details that must be present somewhere in the set. */
const REQUIRED = [
  ["Beyond Quantum Technologies Private Limited", "the registered entity name"],
  ["naamdekho.global@gmail.com", "the published contact address"],
];

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".js") && f !== "index.js");
const problems = [];
let corpus = "";

for (const file of files) {
  const text = fs.readFileSync(path.join(DIR, file), "utf8");
  corpus += text;

  for (const re of PLACEHOLDERS) {
    for (const hit of text.match(re) || []) {
      problems.push(`${file}: unfilled placeholder ${hit}`);
    }
  }
  for (const [needle, why] of FORBIDDEN) {
    if (text.includes(needle)) problems.push(`${file}: contains "${needle}" — ${why}`);
  }
}

for (const [needle, what] of REQUIRED) {
  if (!corpus.includes(needle)) problems.push(`missing from every legal page: ${what} ("${needle}")`);
}

if (problems.length === 0) {
  console.log(`legal pages OK — ${files.length} documents checked`);
  process.exit(0);
}

console.error("\n  BUILD STOPPED — the legal pages are not fit to publish:\n");
for (const p of problems) console.error("    · " + p);
console.error(
  "\n  Fill these in src/legal/, or run `npm run dev` if you are only working locally.\n" +
    "  Needed before launch: the CIN, the full registered office address with PIN,\n" +
    "  and the named Grievance Officer required by IT Rules 2011 Rule 5(9).\n",
);
process.exit(1);
