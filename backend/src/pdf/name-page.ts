import { chaldean } from "../lib/numerology.js";
import { nameInAllScripts } from "../lib/transliterate.js";
import { scanRashi, scanNicknames } from "../scanners/astro.js";
import { scanPronunciation } from "../scanners/linguistic.js";
import type { CorpusName } from "../scripts/name-corpus.js";
import { slugify } from "../scripts/name-corpus.js";

/**
 * A single static name page.
 *
 * Every section is computed from OUR engines — numerology, transliteration,
 * the Avakahada chakra, the nickname engine, the pronunciation scorer. That
 * is the whole point: the page carries data no competitor can copy from a
 * public dataset, which is what earns rankings rather than a penalty.
 *
 * Nothing is invented. If we do not know a name's meaning, the meaning block
 * simply does not render.
 */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface NamePageOptions {
  entry: CorpusName;
  siteOrigin: string;
  /** Other names in the corpus, for the internal-link block. */
  related: CorpusName[];
}

export function renderNamePage({ entry, siteOrigin, related }: NamePageOptions): string {
  const name = entry.name;
  const slug = slugify(name);
  const num = chaldean(name);
  const { devanagari, scripts } = nameInAllScripts(name);
  const rashi = scanRashi(name);
  const nick = scanNicknames(name);
  const pron = scanPronunciation(name.toUpperCase());

  const genderWord = entry.gender === "boy" ? "boy's" : entry.gender === "girl" ? "girl's" : "";
  // Only promise a meaning when we HAVE one. A title reading "X — meaning…"
  // above a page with no meaning is the textbook thin-content signal, and it
  // is a small lie to the reader who clicked expecting one.
  const title = entry.meaning
    ? `${name} — meaning, numerology, rashi & the name in 10 Indian scripts | Naam Dekho`
    : `${name} — numerology, rashi & the name in 10 Indian scripts | Naam Dekho`;
  const metaDesc = entry.meaning
    ? `${name} means "${entry.meaning}". See its Chaldean root number ${num.root} (${num.planet.name}), birth star, nicknames, and how ${name} is written in Hindi, Tamil, Bengali and 7 more Indian scripts.`
    : `${name}: Chaldean root number ${num.root} (${num.planet.name}), birth star, everyday short forms, and how ${name} is written in Hindi, Tamil, Bengali and 7 more Indian scripts.`;

  const scriptRows = scripts
    .map(
      (s) => `      <div class="script">
        <div class="script-lang">${esc(s.name)}</div>
        <div class="script-text">${esc(s.text)}</div>
      </div>`,
    )
    .join("\n");

  const nicknames = (nick.detail?.nicknames as string[] | undefined) ?? [];
  const rashiDetail = rashi.detail as
    | { nakshatra?: string; pada?: number; rashi?: string; alternates?: string[] }
    | undefined;

  const relatedLinks = related
    .map((r) => `<a href="/n/${slugify(r.name)}.html">${esc(r.name)}</a>`)
    .join("\n        ");

  // Schema.org — helps this page qualify for rich results and gives AI
  // assistants a clean structured summary to cite.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: entry.meaning
      ? `${name} — meaning, numerology and the name in 10 Indian scripts`
      : `${name} — numerology and the name in 10 Indian scripts`,
    about: { "@type": "Thing", name },
    inLanguage: "en-IN",
    isPartOf: { "@type": "WebSite", name: "Naam Dekho", url: siteOrigin },
    publisher: { "@type": "Organization", name: "Naam Dekho", url: siteOrigin },
    description: metaDesc,
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteOrigin },
      { "@type": "ListItem", position: 2, name: "Names", item: `${siteOrigin}/n/` },
      { "@type": "ListItem", position: 3, name, item: `${siteOrigin}/n/${slug}.html` },
    ],
  };

  return `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(metaDesc)}" />
<link rel="canonical" href="${siteOrigin}/n/${slug}.html" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(metaDesc)}" />
<meta property="og:url" content="${siteOrigin}/n/${slug}.html" />
<meta name="twitter:card" content="summary" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+Devanagari:wght@400;500&display=swap" rel="stylesheet" />
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>
<style>
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
  footer.site a{color:var(--ink-3)}
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
  <div class="crumb"><a href="/">Home</a> / <a href="/n/">Names</a> / ${esc(name)}</div>

  <h1>${esc(name)}</h1>
  <div class="deva">${esc(devanagari)}</div>
  ${entry.meaning ? `<p class="lede"><strong>${esc(name)}</strong> ${genderWord ? `is a ${genderWord} name ` : ""}${entry.origin ? `of ${esc(entry.origin)} origin ` : ""}meaning <strong>${esc(entry.meaning)}</strong>.</p>` : `<p class="lede"><strong>${esc(name)}</strong>${genderWord ? ` is a ${genderWord} name` : ""}${entry.origin ? ` of ${esc(entry.origin)} origin` : ""}.</p>`}
  ${entry.meaning && entry.meaningSource ? `<p class="note">Meaning from ${entry.meaningUrl ? `<a href="${esc(entry.meaningUrl)}" rel="nofollow noopener" target="_blank">${esc(entry.meaningSource)}</a>` : esc(entry.meaningSource)}.</p>` : ""}
  <p class="lede">Below: how ${esc(name)} is written across ${scripts.length} Indian scripts, its Chaldean numerology reading, the birth star traditionally linked to its first sound, and the short forms families actually use.</p>

  <div class="tags">
    ${entry.gender ? `<span class="tag">${esc(entry.gender)}</span>` : ""}
    ${entry.origin ? `<span class="tag">${esc(entry.origin)}</span>` : ""}
    <span class="tag">${pron.detail?.syllables ?? "?"} syllables</span>
    <span class="tag">Root ${num.root} · ${esc(num.planet.name)}</span>
  </div>

  <section>
    <h2>${esc(name)} in ${scripts.length} Indian scripts</h2>
    <p class="sub">Written out for the certificate, the invitation, and the passport form.</p>
    <div class="scripts">
${scriptRows}
    </div>
  </section>

  <section>
    <h2>Chaldean numerology</h2>
    <p class="sub">The traditional Chaldean system, which assigns a value to each letter by its sound.</p>
    <div class="cards">
      <div class="card">
        <div class="k">Compound number</div>
        <div class="v">${num.compound}</div>
        <div class="n">${esc(num.compoundMeaning ?? "")}</div>
      </div>
      <div class="card">
        <div class="k">Root number</div>
        <div class="v">${num.root}</div>
        <div class="n">Ruling planet: ${esc(num.planet.glyph ?? "")} ${esc(num.planet.name)}</div>
      </div>
    </div>
    ${
      num.industryFit?.good?.length
        ? `<div class="fit">${num.industryFit.good.map((g) => `<span>${esc(g)}</span>`).join("")}</div>
    <p class="sub" style="margin-top:8px">Fields traditionally considered favourable for root ${num.root}.</p>`
        : ""
    }
  </section>

  <section>
    <h2>Rashi &amp; Nakshatra</h2>
    <p class="sub">By the Avakahada chakra, the syllable table used at namkaran ceremonies.</p>
    ${
      rashiDetail?.nakshatra
        ? `<div class="cards">
      <div class="card">
        <div class="k">Nakshatra</div>
        <div class="v" style="font-size:24px">${esc(rashiDetail.nakshatra)}</div>
        <div class="n">Pada ${rashiDetail.pada ?? "—"}</div>
      </div>
      <div class="card">
        <div class="k">Rashi (moon sign)</div>
        <div class="v" style="font-size:24px">${esc(rashiDetail.rashi ?? "—")}</div>
        <div class="n">From the first sound of ${esc(name)}</div>
      </div>
    </div>
    ${rashiDetail.alternates?.length ? `<p class="sub" style="margin-top:10px">This syllable also appears under: ${rashiDetail.alternates.map(esc).join(" · ")}</p>` : ""}`
        : `<p class="lede">${esc(rashi.summary)}</p>`
    }
    <p class="note">Traditionally this table runs the other way: a pandit reads the baby's birth star from the janam kundli and gives you a syllable to start the name with. The birth chart, not the name, is the authority. We show the reverse lookup for reference.</p>
  </section>

  <section>
    <h2>Everyday use</h2>
    <div class="cards">
      <div class="card">
        <div class="k">Short forms</div>
        <div class="v" style="font-size:23px">${nicknames.length ? esc(nicknames.join(", ")) : "—"}</div>
        <div class="n">${nicknames.length ? "How the name is likely to be shortened at home." : esc(nick.summary)}</div>
      </div>
      <div class="card">
        <div class="k">Pronunciation</div>
        <div class="v" style="font-size:23px">${esc(String(pron.detail?.indianEase ?? "—"))}</div>
        <div class="n">${pron.detail?.syllables ?? "?"} syllables · ${esc(String(pron.detail?.westernEase ?? "—"))} for non-Indian speakers</div>
      </div>
    </div>
  </section>

  <section>
    <div class="cta">
      <h3>Thinking of ${esc(name)} for a business?</h3>
      <p>Run a live check across domains, social handles, marketplaces, the MCA company register and all 45 trademark classes.</p>
      <a class="btn" href="/?q=${encodeURIComponent(name)}">Check ${esc(name)} everywhere →</a>
    </div>
  </section>

  <section>
    <h2>More names</h2>
    <div class="related">
        ${relatedLinks}
    </div>
  </section>
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

/** The /n/ index page that links every name — prevents orphan pages. */
export function renderNameIndex(entries: CorpusName[], siteOrigin: string): string {
  const links = entries
    .map(
      (e) =>
        `      <a href="/n/${slugify(e.name)}.html"><strong>${esc(e.name)}</strong>${e.meaning ? `<span>${esc(e.meaning.split(";")[0])}</span>` : ""}</a>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Indian baby names — meaning, numerology &amp; every Indian script | Naam Dekho</title>
<meta name="description" content="Every name with its Chaldean numerology, birth star, nicknames and how it is written in Hindi, Tamil, Bengali, Telugu and 6 more Indian scripts." />
<link rel="canonical" href="${siteOrigin}/n/" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />
<style>
  :root{--paper:#FAF8F3;--ink:#1A1917;--ink-2:#4A4741;--ink-3:#8A867C;--line:#E5E0D6;--accent:#B8501C}
  *{box-sizing:border-box}
  body{margin:0;background:var(--paper);color:var(--ink);font-family:Inter,system-ui,sans-serif;line-height:1.65}
  .wrap{max-width:900px;margin:0 auto;padding:0 22px}
  header.site{border-bottom:1px solid var(--line);padding:16px 0}
  .logo{font-family:Fraunces,serif;font-size:21px;font-weight:600;color:var(--ink);text-decoration:none}
  .logo em{color:var(--accent);font-style:normal}
  h1{font-family:Fraunces,serif;font-size:clamp(30px,5vw,44px);font-weight:500;margin:34px 0 8px}
  .lede{color:var(--ink-2);max-width:62ch;margin:0 0 28px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;margin-bottom:50px}
  .grid a{display:block;border:1px solid var(--line);border-radius:10px;padding:13px 15px;background:#fff;text-decoration:none;color:var(--ink)}
  .grid a:hover{border-color:var(--accent)}
  .grid strong{display:block;font-family:Fraunces,serif;font-size:19px;font-weight:500}
  .grid span{display:block;font-size:12.5px;color:var(--ink-3);margin-top:2px}
  footer.site{border-top:1px solid var(--line);padding:26px 0 40px;color:var(--ink-3);font-size:13px}
</style>
</head>
<body>
<header class="site"><div class="wrap"><a class="logo" href="/">Naam <em>Dekho</em></a></div></header>
<div class="wrap">
  <h1>Indian names, properly checked</h1>
  <p class="lede">Each page carries the name written across ten Indian scripts, its Chaldean numerology reading, the birth star traditionally linked to its first sound, and the short forms families actually use.</p>
  <div class="grid">
${links}
  </div>
</div>
<footer class="site"><div class="wrap">© Naam Dekho · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></div></footer>
</body>
</html>
`;
}
