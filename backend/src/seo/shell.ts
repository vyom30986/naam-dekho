/**
 * The shared shell every static SEO page is built from.
 *
 * These pages exist to be crawled, so they are plain HTML files with their
 * styling inline — no build step, no stylesheet request, nothing that can fail
 * between a crawler and the words. They deliberately do NOT use the React
 * app's index.css: that file follows the reader's theme, and these are meant
 * to render identically for everyone, every time.
 *
 * PAGE_CSS is the exact block the 537 name pages have always used. It lives
 * here rather than being copied so the name pages and the keyword clusters
 * cannot drift into looking like two different sites.
 *
 * Note, honestly: name-page.ts does NOT import it yet. It still carries its own
 * copy of the same block, so the two can drift until somebody points it at
 * this one. That refactor was deliberately not bundled into the cluster work.
 *
 * A note on what these pages are and are not. They are unlinked from the app's
 * own navigation — a customer browsing the product never lands in them — but
 * they serve exactly the same bytes to every visitor, crawler or person.
 * Detecting a crawler and showing it something else is cloaking, and it is the
 * one SEO technique that reliably gets a domain removed from the index.
 */

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Lowercase, hyphenated, ASCII — the slug form every SEO URL uses. */
export const seoSlug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const FONT_LINKS = `<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+Devanagari:wght@400;500&display=swap" rel="stylesheet" />`;

/* The original name-page stylesheet, unchanged. Edit with care: 537 published
   pages render from it. */
export const PAGE_CSS = `
  :root{--paper:#FAF8F3;--paper-2:#FBF9F4;--ink:#1A1917;--ink-2:#4A4741;--ink-3:#8A867C;--line:#E5E0D6;--accent:#B8501C;--ok-bg:#E8F5EC;--ok-ink:#1B7A3D}
  *{box-sizing:border-box}
  body{margin:0;background:var(--paper);color:var(--ink);font-family:Inter,system-ui,sans-serif;line-height:1.65;-webkit-font-smoothing:antialiased}
  .wrap{max-width:820px;margin:0 auto;padding:0 22px}
  header.site{border-bottom:1px solid var(--line);padding:16px 0}
  header.site .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px}
  .logo{font-family:Fraunces,serif;font-size:21px;font-weight:600;color:var(--ink);text-decoration:none}
  .logo em{color:var(--accent);font-style:normal}
  .nav a{color:var(--ink-2);text-decoration:none;font-size:14px;margin-left:18px}
  .nav a:hover{color:var(--accent)}
  .crumb{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--ink-3);margin:26px 0 8px;letter-spacing:.04em}
  .crumb a{color:var(--ink-3);text-decoration:none}
  h1{font-family:Fraunces,serif;font-size:clamp(34px,6vw,52px);font-weight:500;margin:0 0 6px;line-height:1.1}
  .deva{font-family:'Noto Sans Devanagari',Fraunces,serif;font-size:clamp(26px,4vw,36px);color:var(--accent);margin:0 0 14px}
  .lede{font-size:17px;color:var(--ink-2);margin:0 0 8px;max-width:62ch}
  .tags{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 34px}
  .tag{font-family:'JetBrains Mono',monospace;font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;padding:5px 10px;border-radius:999px;border:1px solid var(--line);background:#fff;color:var(--ink-2)}
  section{margin:0 0 40px}
  h2{font-family:Fraunces,serif;font-size:25px;font-weight:500;margin:0 0 4px}
  .sub{color:var(--ink-3);font-size:13.5px;margin:0 0 16px}
  .scripts{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
  .script{border:1px solid var(--line);border-radius:10px;padding:11px 13px;background:#fff}
  .script-lang{font-family:'JetBrains Mono',monospace;font-size:9.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--ink-3)}
  .script-text{font-size:21px;line-height:1.5;margin-top:3px}
  .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}
  .card{border:1px solid var(--line);border-radius:12px;padding:16px 18px;background:#fff}
  .card .k{font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--ink-3)}
  .card .v{font-family:Fraunces,serif;font-size:30px;margin:4px 0 2px}
  .card .n{font-size:13.5px;color:var(--ink-2)}
  .fit{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}
  .fit span{font-size:12.5px;padding:4px 10px;border-radius:999px;background:var(--ok-bg);color:var(--ok-ink)}
  .cta{border:1px solid var(--line);border-radius:14px;padding:22px 24px;background:linear-gradient(180deg,#fff 0%,var(--paper-2) 100%);text-align:center}
  .cta h3{font-family:Fraunces,serif;font-size:22px;font-weight:500;margin:0 0 6px}
  .cta p{color:var(--ink-2);font-size:14.5px;margin:0 0 16px}
  .btn{display:inline-block;background:var(--accent);color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14.5px;font-weight:500}
  .related{display:flex;flex-wrap:wrap;gap:8px}
  .related a{font-size:13.5px;padding:6px 13px;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--ink-2);text-decoration:none}
  .related a:hover{border-color:var(--accent);color:var(--accent)}
  .note{font-size:12.5px;color:var(--ink-3);border-left:2px solid var(--line);padding-left:12px;margin-top:14px}
  footer.site{border-top:1px solid var(--line);margin-top:50px;padding:26px 0 40px;color:var(--ink-3);font-size:13px}
  footer.site a{color:var(--ink-3)}`;

/* Additions the keyword clusters need and the name pages never did: real
   tables, a syllable badge, and a dense link grid for the hub pages. Kept
   separate so the block above stays a faithful copy of what already shipped. */
export const CLUSTER_CSS = `
  table.data{width:100%;border-collapse:collapse;font-size:14px;background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden}
  table.data th,table.data td{text-align:left;padding:10px 14px;border-bottom:1px solid var(--line)}
  table.data th{font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--ink-3);font-weight:400;background:var(--paper-2)}
  table.data tr:last-child td{border-bottom:0}
  table.data td.num{font-variant-numeric:tabular-nums}
  .table-scroll{overflow-x:auto}
  .syls{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 0}
  .syl{font-family:Fraunces,serif;font-size:23px;line-height:1;padding:10px 15px;border:1px solid var(--line);border-radius:10px;background:#fff}
  .syl small{display:block;font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);margin-top:5px}
  .grid-links{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:8px}
  .grid-links a{font-size:13.5px;padding:9px 13px;border:1px solid var(--line);border-radius:10px;background:#fff;color:var(--ink-2);text-decoration:none}
  .grid-links a:hover{border-color:var(--accent);color:var(--accent)}
  .prose p{color:var(--ink-2);max-width:64ch}
  .hub-sec{margin:0 0 34px}`;

export interface SeoPage {
  /** <title>. Write it for a person scanning a results list. */
  title: string;
  /** <meta name="description">. One sentence that says what is on the page. */
  metaDesc: string;
  /** Absolute path from the site root, e.g. "/nakshatra/krittika.html". */
  path: string;
  siteOrigin: string;
  /** Breadcrumb trail, root first. The last entry is the current page. */
  crumbs: Array<{ label: string; href?: string }>;
  /** Any schema.org objects to embed. A BreadcrumbList is added for you. */
  jsonLd?: unknown[];
  /** The page body, everything between the breadcrumb and the footer. */
  body: string;
}

/**
 * Wraps a body in the site chrome and returns a complete HTML document.
 *
 * The breadcrumb is emitted twice on purpose — once as visible text a reader
 * can click, once as BreadcrumbList JSON-LD. They are generated from the same
 * array so they can never disagree, which is what the structured-data
 * validators actually check for.
 */
export function renderSeoPage({
  title,
  metaDesc,
  path,
  siteOrigin,
  crumbs,
  jsonLd = [],
  body,
}: SeoPage): string {
  const url = `${siteOrigin}${path}`;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      item: c.href ? `${siteOrigin}${c.href}` : url,
    })),
  };

  const crumbHtml = crumbs
    .map((c) => (c.href ? `<a href="${c.href}">${esc(c.label)}</a>` : esc(c.label)))
    .join(" / ");

  const ld = [...jsonLd, breadcrumbLd]
    .map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`)
    .join("\n");

  return `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(metaDesc)}" />
<link rel="canonical" href="${url}" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(metaDesc)}" />
<meta property="og:url" content="${url}" />
<meta name="twitter:card" content="summary" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
${FONT_LINKS}
${ld}
<style>${PAGE_CSS}${CLUSTER_CSS}
</style>
</head>
<body>
<header class="site">
  <div class="wrap">
    <a class="logo" href="/">Naam <em>Dekho</em></a>
    <nav class="nav">
      <a href="/how-it-works">How it works</a>
      <a href="/pricing">Pricing</a>
    </nav>
  </div>
</header>

<div class="wrap">
  <div class="crumb">${crumbHtml}</div>
${body}
</div>

<footer class="site">
  <div class="wrap">
    Numerology, transliteration and syllable readings computed by <a href="/">Naam Dekho</a>.
    Traditional readings are cultural reference, not advice. ·
    <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a>
  </div>
</footer>
</body>
</html>
`;
}

/**
 * One finished page, ready to write to disk and list in the sitemap.
 *
 * Every cluster builder returns these, so the build script never needs to know
 * what a cluster is — it writes files and emits sitemap entries, and a new
 * cluster is one more import.
 */
export interface SeoDoc {
  /** Absolute site path including the .html, e.g. "/nakshatra/krittika.html". */
  path: string;
  html: string;
  /** sitemap <priority>, "0.0".."1.0". */
  priority: string;
  /** sitemap <changefreq>. */
  changefreq: "daily" | "weekly" | "monthly" | "yearly";
}

/** What every cluster builder is handed. */
export interface SeoCtx {
  siteOrigin: string;
  /** The published name corpus, already filtered and sorted by name. */
  corpus: Array<{
    name: string;
    gender?: "boy" | "girl" | "unisex";
    origin?: string;
    /** Present ONLY when verified. Never print a meaning that is absent. */
    meaning?: string;
  }>;
}

/** The standard closing call to action. Every cluster page ends with this. */
export function ctaBlock(heading: string, line: string): string {
  return `  <section>
    <div class="cta">
      <h3>${esc(heading)}</h3>
      <p>${esc(line)}</p>
      <a class="btn" href="/">Check a name</a>
    </div>
  </section>`;
}
