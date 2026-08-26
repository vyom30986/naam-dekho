import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { eq } from "drizzle-orm";
import { NAME_CORPUS as FALLBACK_CORPUS, slugify, type CorpusName } from "./name-corpus.js";
import { renderNamePage, renderNameIndex } from "../pdf/name-page.js";
import type { SeoCtx, SeoDoc } from "../seo/shell.js";
import { buildNakshatraPages } from "../seo/nakshatra.js";
import { buildRashiPages } from "../seo/rashi.js";
import { buildNumerologyPages } from "../seo/numerology.js";
import { buildLetterPages } from "../seo/letters.js";
import { buildMeaningPages } from "../seo/meanings.js";
import { buildDomainPages } from "../seo/domains.js";
import { buildTrademarkPages } from "../seo/trademark.js";
import { buildScriptPages } from "../seo/scripts.js";
import { buildHubPages } from "../seo/hub.js";
import { db } from "../db/index.js";
import { corpusNames } from "../db/schema.js";
import { stackHealth } from "../lib/devstack.js";
import { registerNameSpellings } from "../lib/transliterate.js";

/**
 * Builds the static name pages, the /n/ index, sitemap.xml and robots.txt
 * into the frontend's public/ folder, so they ship as plain HTML files.
 *
 * Why static files rather than React routes: these pages exist to be crawled.
 * A file that already contains its content in the markup is indexed reliably;
 * a client-rendered SPA route is not. They are also free to serve and cannot
 * break when the app changes.
 *
 * Run:  npm run build:names
 */

const SITE_ORIGIN = (process.env.SITE_ORIGIN ?? "https://naamdekho.net").replace(/\/$/, "");
const PUBLIC_DIR = resolve(process.cwd(), "../frontend-jsx/public");
const OUT_DIR = join(PUBLIC_DIR, "n");

/**
 * The corpus lives in the database now, editable in the founder console.
 * The hardcoded list survives as a fallback so the build still works with no
 * database (fresh clone, CI). Only PUBLISHED rows become pages, and an
 * UNVERIFIED meaning is never printed — the page renders without one rather
 * than with a guess, the same rule the live product follows.
 */
async function loadCorpus(): Promise<CorpusName[]> {
  if (!(await stackHealth()).db) {
    console.warn("  No database — using the built-in fallback corpus.");
    return FALLBACK_CORPUS;
  }
  const rows = await db.select().from(corpusNames).where(eq(corpusNames.published, true));
  if (rows.length === 0) {
    console.warn("  corpus_names is empty — using the built-in fallback corpus.");
    return FALLBACK_CORPUS;
  }
  return rows
    .map((r) => ({
      name: r.name,
      gender: (r.gender ?? undefined) as CorpusName["gender"],
      origin: r.origin ?? undefined,
      meaning: r.verified && r.meaning ? r.meaning : undefined,
      nativeSpelling: r.nativeSpelling ?? undefined,
      meaningSource: r.verified && r.meaning ? (r.meaningSource ?? undefined) : undefined,
      meaningUrl: r.verified && r.meaning ? (r.meaningUrl ?? undefined) : undefined,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const NAME_CORPUS = await loadCorpus();

/*
 * Hand the transliterator the spellings we have verified BEFORE anything
 * renders. Every page, every cluster and the certificate all reach Devanagari
 * through romanToDevanagari, and the other nine scripts are derived from it,
 * so this one call is the difference between printing राम and रम everywhere.
 */
const taught = registerNameSpellings(
  NAME_CORPUS.flatMap((e) => (e.nativeSpelling ? [[e.name, e.nativeSpelling] as const] : [])),
);

// Static routes that exist in the React app and should be indexed.
const STATIC_ROUTES = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/how-it-works", priority: "0.8", changefreq: "monthly" },
  { path: "/pricing", priority: "0.8", changefreq: "monthly" },
  { path: "/n/", priority: "0.9", changefreq: "weekly" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
  { path: "/cookies", priority: "0.3", changefreq: "yearly" },
  { path: "/cancellation-refund", priority: "0.3", changefreq: "yearly" },
  { path: "/payment-terms", priority: "0.3", changefreq: "yearly" },
];

// Pages that must never be indexed — private or user-specific.
const DISALLOWED = ["/account", "/sign-in", "/admin"];

function pickRelated(index: number, count = 12) {
  const out = [];
  for (let i = 1; i <= count; i++) out.push(NAME_CORPUS[(index + i) % NAME_CORPUS.length]);
  return out;
}

mkdirSync(OUT_DIR, { recursive: true });

let written = 0;
NAME_CORPUS.forEach((entry, i) => {
  const html = renderNamePage({ entry, siteOrigin: SITE_ORIGIN, related: pickRelated(i) });
  writeFileSync(join(OUT_DIR, `${slugify(entry.name)}.html`), html, "utf8");
  written++;
});

writeFileSync(join(OUT_DIR, "index.html"), renderNameIndex(NAME_CORPUS, SITE_ORIGIN), "utf8");

// ── the keyword clusters ─────────────────────────────────────────────
/**
 * The name pages answer "what does Aarav mean". These answer the rest of
 * the question space around them — the nakshatra a family was given, the
 * numerology number, the domain ending, the trademark class. Each builder
 * owns one cluster and returns finished documents; this loop only writes
 * files, so adding a cluster is one import and one array entry.
 *
 * They are not linked from the app's navigation. They are, however, the
 * same bytes for every visitor: no crawler detection, no hidden text.
 */
const seoCtx: SeoCtx = { siteOrigin: SITE_ORIGIN, corpus: NAME_CORPUS };
const CLUSTERS: Array<{ name: string; docs: SeoDoc[] }> = [
  { name: "nakshatra", docs: buildNakshatraPages(seoCtx) },
  { name: "rashi", docs: buildRashiPages(seoCtx) },
  { name: "numerology", docs: buildNumerologyPages(seoCtx) },
  { name: "letters", docs: buildLetterPages(seoCtx) },
  { name: "meanings", docs: buildMeaningPages(seoCtx) },
  { name: "domains", docs: buildDomainPages(seoCtx) },
  { name: "trademark", docs: buildTrademarkPages(seoCtx) },
  { name: "scripts", docs: buildScriptPages(seoCtx) },
  { name: "hub", docs: buildHubPages(seoCtx) },
];

const clusterDocs: SeoDoc[] = CLUSTERS.flatMap((c) => c.docs);

// A hub linking to a page nobody emitted is a 404, and the thresholds that
// decide which letter and meaning pages exist live in two places. Catch the
// mismatch here rather than in Search Console three weeks later.
const emitted = new Set(clusterDocs.map((d) => d.path));
const dangling = new Set<string>();
for (const doc of clusterDocs) {
  for (const m of doc.html.matchAll(/href="(\/[^"#?]*\.html)"/g)) {
    if (!emitted.has(m[1]) && !m[1].startsWith("/n/")) dangling.add(m[1]);
  }
}

for (const doc of clusterDocs) {
  const full = join(PUBLIC_DIR, doc.path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, doc.html, "utf8");
}

// ── sitemap.xml ──────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
const urls = [
  ...STATIC_ROUTES.map(
    (r) => `  <url>
    <loc>${SITE_ORIGIN}${r.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`,
  ),
  ...NAME_CORPUS.map(
    (e) => `  <url>
    <loc>${SITE_ORIGIN}/n/${slugify(e.name)}.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`,
  ),
  ...clusterDocs.map(
    (d) => `  <url>
    <loc>${SITE_ORIGIN}${d.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${d.changefreq}</changefreq>
    <priority>${d.priority}</priority>
  </url>`,
  ),
].join("\n");

writeFileSync(
  join(PUBLIC_DIR, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`,
  "utf8",
);

// ── robots.txt ───────────────────────────────────────────────────────
writeFileSync(
  join(PUBLIC_DIR, "robots.txt"),
  `# Naam Dekho
User-agent: *
${DISALLOWED.map((d) => `Disallow: ${d}`).join("\n")}
Allow: /

Sitemap: ${SITE_ORIGIN}/sitemap.xml
`,
  "utf8",
);

console.log(`\n  Name pages built`);
console.log(`  ─────────────────────────────────────`);
console.log(`  ${taught} verified Devanagari spellings loaded`);
  console.log(`  ${written} name pages  → public/n/*.html`);
console.log(`  1 index page       → public/n/index.html`);
for (const c of CLUSTERS) {
  console.log(`  ${String(c.docs.length).padStart(3)} ${c.name.padEnd(10)}    → public${c.docs[0]?.path.replace(/[^/]+$/, "") ?? ""}`);
}
if (dangling.size) {
  console.log(`\n  ${dangling.size} internal links point at pages that were not emitted:`);
  for (const d of [...dangling].slice(0, 12)) console.log(`    ${d}`);
  console.log(`  A cluster is linking into another cluster past its threshold — find the`);
  console.log(`  linking file with: grep -rl "<path>" ../frontend-jsx/public`);
}
console.log(`  sitemap.xml        → ${STATIC_ROUTES.length + written + clusterDocs.length} urls`);
console.log(`  robots.txt         → ${DISALLOWED.length} paths disallowed`);
console.log(`  origin             → ${SITE_ORIGIN}`);
console.log(`\n  Set SITE_ORIGIN in .env before the production build.\n`);
