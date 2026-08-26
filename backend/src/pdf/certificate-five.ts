/**
 * The Shortlist of Five — two A4 pages, print-ready.
 *
 * Page 1  the chosen name: the name, a ~150-word passage, the numerology wheel,
 *         and how it is said, shortened and starred.
 * Page 2  the name across India, the reading in full, and the names the family
 *         considered before settling.
 *
 * Two pages rather than three. The first draft was three and the content did
 * not fill them — even for a well-known name with five confirmed languages,
 * page two came out 45% empty, and most names carry three or four. Founder's
 * call, 22 Aug 2026, taken while looking at the rendered draft.
 *
 * Page 2 is consequently full. Five considered names, ten scripts and the
 * reading strip fit inside 297mm with very little to spare, which is why five
 * is a hard cap rather than a convention. Anything added here has to displace
 * something.
 *
 * Delivered as HTML the browser prints, exactly like the single-name sheet: no
 * renderer on the server, no cold start, and the customer's own print dialog
 * offers "Save as PDF".
 */
import { logoMark } from "../brand/logo.js";
import type { FiveCertificateData, ConsideredName } from "./certificate-five-data.js";

const esc = (s: string): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/* ── the wheel ────────────────────────────────────────────────────────
 * Nine wedges of 40°, inner radius 58, outer 106, in a 300×300 box. The same
 * geometry as the single-name certificate so the two sheets agree, computed
 * here rather than in the page because a printed sheet cannot depend on script.
 */
const QUALITIES = [
  "Leadership", "Cooperation", "Expression", "Order", "Freedom",
  "Nurturing", "Spirit", "Power", "Compassion",
];
const TINTS = ["#E7B4C2", "#A5C4DD", "#E8C76A", "#C3B6DE", "#E7B4C2", "#C3B6DE", "#E8C76A", "#A5C4DD", "#E7B4C2"];
const R_IN = 58, R_OUT = 106, STEP = 40, START = -110;

function wheel(root: number, planet: { name: string; glyph: string } | null, compound: number): string {
  const pt = (r: number, degrees: number): [string, string] => {
    const a = (degrees * Math.PI) / 180;
    return [(r * Math.cos(a)).toFixed(2), (r * Math.sin(a)).toFixed(2)];
  };

  const parts: string[] = [];
  for (let i = 0; i < 9; i++) {
    const n = i + 1;
    const a0 = START + i * STEP;
    const a1 = START + (i + 1) * STEP;
    const [x0, y0] = pt(R_OUT, a0);
    const [x1, y1] = pt(R_OUT, a1);
    const [x2, y2] = pt(R_IN, a1);
    const [x3, y3] = pt(R_IN, a0);
    const isRoot = n === root;

    parts.push(
      `<path d="M${x0},${y0} A${R_OUT},${R_OUT} 0 0 1 ${x1},${y1} L${x2},${y2} A${R_IN},${R_IN} 0 0 0 ${x3},${y3} Z" ` +
        `fill="${isRoot ? "#B8501C" : TINTS[i]}" fill-opacity="${isRoot ? "1" : ".45"}" ` +
        `stroke="#FCFAF5" stroke-width="1.5"/>`,
    );

    const mid = (a0 + a1) / 2;
    const [nx, ny] = pt((R_IN + R_OUT) / 2, mid);
    parts.push(
      `<text x="${nx}" y="${ny}" text-anchor="middle" dominant-baseline="central" ` +
        `font-family="Fraunces,Georgia,serif" font-size="17" fill="${isRoot ? "#FCFAF5" : "#3D4751"}">${n}</text>`,
    );

    const [lx, ly] = pt(R_OUT + 16, mid);
    parts.push(
      `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central" ` +
        `font-family="Inter,sans-serif" font-size="8" font-weight="${isRoot ? "600" : "400"}" ` +
        `fill="${isRoot ? "#B8501C" : "#6B7480"}">${QUALITIES[i]}</text>`,
    );
  }

  return `<svg class="wheel" viewBox="0 0 300 300" aria-hidden="true">
  <g transform="translate(150,150)">${parts.join("")}</g>
  <circle cx="150" cy="150" r="55" fill="#FCFAF5" stroke="#B8501C" stroke-width="1" stroke-dasharray="2 3" opacity=".5"/>
  <text x="150" y="138" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="8" letter-spacing="2" fill="#6B7480">ROOT</text>
  <text x="150" y="164" text-anchor="middle" font-family="Fraunces,Georgia,serif" font-size="30" font-weight="700" fill="#B8501C">${root}</text>
  <text x="150" y="180" text-anchor="middle" font-family="Inter,sans-serif" font-size="8" fill="#3D4751">${planet ? esc(planet.glyph) + " " + esc(planet.name) : ""} · compound ${compound}</text>
</svg>`;
}

/** Sparkles, kept in the margins so they never land on a line of text. */
const sparkles = (variant: 1 | 2): string => {
  const a = variant === 1
    ? `<path d="M12 96 l2.4 5.6 5.6 2.4 -5.6 2.4 -2.4 5.6 -2.4 -5.6 -5.6 -2.4 5.6 -2.4z"/>
       <path d="M196 152 l2 4.6 4.6 2 -4.6 2 -2 4.6 -2 -4.6 -4.6 -2 4.6 -2z"/>`
    : `<path d="M11 118 l2.2 5 5 2.2 -5 2.2 -2.2 5 -2.2 -5 -5 -2.2 5 -2.2z"/>`;
  const b = variant === 1
    ? `<path d="M192 74 l2.6 6 6 2.6 -6 2.6 -2.6 6 -2.6 -6 -6 -2.6 6 -2.6z"/>
       <path d="M14 214 l2.2 5 5 2.2 -5 2.2 -2.2 5 -2.2 -5 -5 -2.2 5 -2.2z"/>`
    : `<path d="M198 206 l2.2 5 5 2.2 -5 2.2 -2.2 5 -2.2 -5 -5 -2.2 5 -2.2z"/>`;
  return `<svg class="sparkles" viewBox="0 0 210 297" aria-hidden="true">
  <g fill="#C3B6DE" opacity=".5">${a}</g>
  <g fill="#E7B4C2" opacity=".55">${b}</g>
  <circle cx="199" cy="112" r="1.6" fill="#E8C76A" opacity=".8"/>
  <circle cx="11" cy="164" r="1.3" fill="#E8C76A" opacity=".7"/>
</svg>`;
};

const head = (kicker: string): string =>
  `<div class="top"><div class="mark">नाम देखो</div><div class="kicker">${esc(kicker)}</div></div>`;

const foot = (issued: string, full: boolean): string =>
  `<div class="foot"><div class="t">Issued ${esc(issued)}<br>naamdekho.net${
    full ? "<br>Traditional readings,<br>offered in that spirit" : ""
  }</div>${logoMark({ widthMm: 30, className: "foot-logo" })}</div>`;

function consideredRow(c: ConsideredName): string {
  return `<div class="cand">
  <div><div class="n">${esc(c.name)}</div><div class="nd">${esc(c.devanagari)}</div></div>
  <div>${c.meaning ? `<div class="m">${esc(c.meaning)}</div>` : ""}${
    c.startsWith ? `<div class="star">★ CARRIES THE STAR&rsquo;S SYLLABLE &ldquo;${esc(c.startsWith.toUpperCase())}&rdquo;</div>` : ""
  }</div>
  <div class="num"><div class="big">${c.root}</div><div class="cap">${esc(c.planet ?? "")}</div></div>
</div>`;
}

export function renderFiveCertificateHtml(
  d: FiveCertificateData,
  opts: { embedded?: boolean } = {},
): string {
  const issued = d.issuedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const scripts = d.scripts
    .map((s) => `<div class="sc"><div class="t">${esc(s.text)}</div><div class="l">${esc(s.name)}</div></div>`)
    .join("");

  const agreed = d.agreed
    ? `<div class="agree">
    <div class="agree-line">&ldquo;${esc(d.agreed.meaning)}.&rdquo;</div>
    <div class="agree-sub">the same reading in ${esc(
      d.agreed.languages.length > 1
        ? d.agreed.languages.slice(0, -1).join(", ") + " and " + d.agreed.languages[d.agreed.languages.length - 1]
        : d.agreed.languages[0],
    )}</div>
  </div>`
    : "";

  const differing = d.differing.length
    ? `<table class="langtable">${d.differing
        .map(
          (r) =>
            `<tr><td class="lang">${esc(r.language)}</td><td class="scr">${esc(r.script)}</td><td class="mean">${esc(r.meaning)}</td></tr>`,
        )
        .join("")}</table>`
    : "";

  /*
   * The compound number is printed; its meaning is not. The dataset's reading
   * for 11 is "Hidden trials, danger of treachery" — true to Chaldean tradition
   * and entirely wrong for a sheet a family frames. Under the good-parts rule
   * the honest options were to omit the interpretation or to invent a nicer
   * one, and inventing is not an option.
   */
  const reading = `<div class="reading">
  <div class="rd"><div class="cap">Compound</div><div class="v">${d.compound}</div><div class="s">reduces to ${d.root}${d.planet ? `, ruled by ${esc(d.planet.name)}` : ""}</div></div>
  ${d.pronScore !== null ? `<div class="rd"><div class="cap">Said easily</div><div class="v">${d.pronScore} / 10</div><div class="s">${esc((d.pronEase ?? "").toLowerCase())} on Indian tongues</div></div>` : ""}
  ${d.birthStar?.pada ? `<div class="rd"><div class="cap">Pada</div><div class="v">${d.birthStar.pada}</div><div class="s">${esc(d.birthStar.nakshatra)}</div></div>` : ""}
</div>`;

  const facts = `<div class="facts">
  ${d.saidAs ? `<div class="fact f1"><div class="cap">Said as</div><div class="v">${esc(d.saidAs)}</div><div class="s">${d.syllables ?? ""} syllable${d.syllables === 1 ? "" : "s"}</div></div>` : ""}
  ${d.shortForms.length ? `<div class="fact f2"><div class="cap">At home</div><div class="v">${esc(d.shortForms.join(" · "))}</div><div class="s">the short forms</div></div>` : ""}
  ${d.birthStar ? `<div class="fact f3"><div class="cap">Born under</div><div class="v">${esc(d.birthStar.symbol)} ${esc(d.birthStar.nakshatra)}</div><div class="s">${esc(d.birthStar.rashi)}${d.birthStar.firstAkshar ? ` · first akshar &ldquo;${esc(d.birthStar.firstAkshar)}&rdquo;` : ""}</div></div>` : ""}
</div>`;

  const page1 = `<div class="sheet">
  ${sparkles(1)}
  ${head("The name we chose")}
  <div class="nameblock">
    <div class="swash"></div>
    <div class="name">${esc(d.name)}</div>
    <div class="deva">${esc(d.devanagari)}</div>
  </div>
  <p class="prose">${esc(d.essay)}</p>
  <div class="wheelwrap">${wheel(d.root, d.planet, d.compound)}</div>
  ${facts}
  ${foot(issued, true)}
  <div class="pagenum">ONE OF TWO</div>
</div>`;

  const page2 = `<div class="sheet">
  ${sparkles(2)}
  ${head("One name, many tongues")}
  <div class="h2">${esc(d.name)}, across India</div>
  <div class="sub">The same name, written and read in each of these languages</div>
  <div class="scripts-big">${scripts}</div>
  ${agreed}
  ${differing}
  ${reading}
  ${d.considered.length ? `<div class="rule" style="margin:4mm auto 0"></div>
  <div class="h2">The names we considered</div>
  <div class="sub">Each one read the same way, and each one loved</div>
  <div class="considered">${d.considered.map(consideredRow).join("")}</div>
  <div class="closing">
    <div class="cong">And out of all of them, ${esc(d.name)}</div>
    <p class="wish">Every one of these was a name this family weighed with care. One of them became a person.</p>
  </div>` : ""}
  ${foot(issued, false)}
  <div class="pagenum">TWO OF TWO</div>
</div>`;

  const css = `
  :root{--paper:#FCFAF5;--ink:#0F1419;--ink-2:#3D4751;--ink-3:#6B7480;
        --line:rgba(24,19,16,.14);--accent:#B8501C;--accent-2:#7A2E0E;
        --blush:#E7B4C2;--lilac:#C3B6DE;--powder:#A5C4DD}
  *{box-sizing:border-box}
  .sheet{width:210mm;height:297mm;background:var(--paper);color:var(--ink);position:relative;
    overflow:hidden;display:flex;flex-direction:column;padding:13mm 11mm 9mm;
    font-family:'Inter',system-ui,sans-serif}
  .sheet + .sheet{margin-top:8mm}
  .sheet::before{content:"";position:absolute;inset:4mm;border:1.5px dashed rgba(195,182,222,.75);
    border-radius:2mm;pointer-events:none;z-index:3}
  /* Higher specificity than .sheet > * on purpose: at equal weight the child
     rule wins and the sparkle layer starts consuming real layout space. */
  svg.sparkles{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0}
  .sheet > *{position:relative;z-index:1}
  .top{text-align:center}
  .mark{font-family:'Noto Sans Devanagari',serif;font-size:4.4mm;color:var(--accent);letter-spacing:.04em}
  .kicker{font-family:'JetBrains Mono',monospace;font-size:2.3mm;letter-spacing:.22em;
    text-transform:uppercase;color:var(--ink-3);margin-top:1mm}
  .pagenum{position:absolute;bottom:4.5mm;left:0;right:0;text-align:center;
    font-family:'JetBrains Mono',monospace;font-size:2.2mm;letter-spacing:.18em;color:var(--ink-3);z-index:2}
  .foot{margin-top:auto;padding-top:1mm;display:flex;justify-content:space-between;align-items:flex-end}
  .foot .t{font-family:'JetBrains Mono',monospace;font-size:2.2mm;letter-spacing:.09em;
    text-transform:uppercase;color:var(--ink-3);line-height:1.55}
  .foot-logo{align-self:flex-end;margin-bottom:-1mm}
  .rule{width:24mm;height:1px;margin:0 auto;background:linear-gradient(90deg,transparent,var(--accent),transparent);opacity:.65}
  .nameblock{text-align:center;margin-top:6mm;position:relative}
  .nameblock .swash{position:absolute;left:12%;right:12%;top:52%;height:4mm;border-radius:2mm;
    background:linear-gradient(90deg,var(--blush),var(--lilac),var(--powder));opacity:.55;z-index:-1}
  .name{font-family:'Fraunces',Georgia,serif;font-weight:700;font-size:22mm;line-height:1;letter-spacing:-.02em}
  .deva{font-family:'Noto Sans Devanagari',serif;font-size:8mm;color:var(--accent-2);margin-top:2mm}
  /* Left-aligned: 150 words centred is pretty for three sentences and hard
     work for a paragraph. */
  .prose{font-family:'Fraunces',Georgia,serif;font-style:italic;font-size:3.9mm;line-height:1.75;
    color:var(--ink-2);max-width:146mm;margin:6mm auto 0;text-align:left;text-wrap:pretty;hyphens:auto}
  .wheelwrap{display:flex;justify-content:center;margin-top:auto;margin-bottom:auto}
  .wheel{width:78mm;height:78mm}
  .facts{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;margin-top:2mm}
  .fact{border-radius:2.5mm;padding:3.5mm 3mm;text-align:center}
  .fact .cap{font-family:'JetBrains Mono',monospace;font-size:2.1mm;letter-spacing:.16em;
    text-transform:uppercase;color:var(--ink-3)}
  .fact .v{font-family:'Fraunces',Georgia,serif;font-size:4.6mm;margin-top:1.5mm;line-height:1.35}
  .fact .s{font-size:3mm;color:var(--ink-2);margin-top:.8mm}
  .f1{background:rgba(231,180,194,.28)}.f2{background:rgba(195,182,222,.28)}.f3{background:rgba(165,196,221,.28)}
  .h2{font-family:'Fraunces',Georgia,serif;font-size:6mm;text-align:center;color:var(--accent-2);margin:3.5mm 0 .8mm}
  .sub{text-align:center;font-size:3.1mm;color:var(--ink-3);margin-bottom:3mm}
  .scripts-big{display:grid;grid-template-columns:repeat(5,1fr);gap:2.4mm;margin-bottom:2.5mm}
  .sc{text-align:center;padding:2.4mm 1.5mm;border-radius:2.5mm;background:#FEFDFB;border:1px solid var(--line)}
  .sc .t{font-size:5.4mm;line-height:1.2}
  .sc .l{font-family:'JetBrains Mono',monospace;font-size:2mm;letter-spacing:.12em;
    text-transform:uppercase;color:var(--ink-3);margin-top:1.5mm}
  .agree{text-align:center;margin:1mm 0 4mm}
  .agree-line{font-family:'Fraunces',Georgia,serif;font-size:8mm;color:var(--accent-2);line-height:1.2}
  .agree-sub{font-family:'JetBrains Mono',monospace;font-size:2.3mm;letter-spacing:.14em;
    text-transform:uppercase;color:var(--ink-3);margin-top:2mm}
  .langtable{width:100%;border-collapse:collapse;font-size:3.4mm;margin-bottom:3mm}
  .langtable td{padding:1.6mm 2mm;border-bottom:1px solid var(--line);vertical-align:middle}
  .langtable td.lang{font-family:'JetBrains Mono',monospace;font-size:2.4mm;letter-spacing:.14em;
    text-transform:uppercase;color:var(--ink-3);width:26mm}
  .langtable td.scr{font-size:4.4mm;width:26mm;color:var(--accent-2)}
  .langtable td.mean{font-family:'Fraunces',Georgia,serif;font-size:3.6mm;color:var(--ink)}
  .reading{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;margin-bottom:1mm}
  .rd{text-align:center;padding:3mm 2mm;border-radius:2.5mm;background:#FEFDFB;border:1px solid var(--line)}
  .rd .cap{font-family:'JetBrains Mono',monospace;font-size:2mm;letter-spacing:.15em;
    text-transform:uppercase;color:var(--ink-3)}
  .rd .v{font-family:'Fraunces',Georgia,serif;font-size:5.4mm;color:var(--accent);margin-top:1mm;line-height:1}
  .rd .s{font-size:2.7mm;color:var(--ink-2);margin-top:1.2mm;line-height:1.35}
  .considered{display:flex;flex-direction:column;gap:1.8mm;margin-top:2mm}
  .cand{display:grid;grid-template-columns:38mm 1fr auto;gap:4mm;align-items:center;
    padding:2.4mm 4mm;border-radius:2.5mm;background:#FEFDFB;border:1px solid var(--line)}
  .cand .n{font-family:'Fraunces',Georgia,serif;font-size:6.2mm;line-height:1}
  .cand .nd{font-family:'Noto Sans Devanagari',serif;font-size:3.6mm;color:var(--accent-2);margin-top:1mm}
  .cand .m{font-family:'Fraunces',Georgia,serif;font-style:italic;font-size:3.5mm;color:var(--ink-2)}
  .cand .star{font-size:2.6mm;color:var(--accent);font-family:'JetBrains Mono',monospace;
    letter-spacing:.1em;margin-top:1.2mm}
  .cand .num{text-align:center;min-width:22mm}
  .cand .num .big{font-family:'Fraunces',Georgia,serif;font-size:5.6mm;color:var(--accent);line-height:1}
  .cand .num .cap{font-family:'JetBrains Mono',monospace;font-size:1.9mm;letter-spacing:.14em;
    text-transform:uppercase;color:var(--ink-3)}
  .closing{margin-top:2.5mm;text-align:center}
  .closing .cong{font-family:'Fraunces',Georgia,serif;font-size:4.6mm;color:var(--accent-2);margin-top:2.5mm}
  .closing .wish{font-family:'Fraunces',Georgia,serif;font-style:italic;font-size:3.2mm;
    line-height:1.55;color:var(--ink-2);max-width:112mm;margin:1.5mm auto 0}
  @media print{
    /* The preview may be scaled to its frame; the printed sheet never is. */
    .sheet{transform:none !important;margin:0 !important}
    @page{size:A4 portrait;margin:0}
    html,body{margin:0;padding:0;background:#fff}
    .no-print{display:none !important}
  }`;

  const FIT_CSS = `
  html,body{margin:0;padding:0;overflow:hidden;background:#fff}`;

  const FIT_JS = `
  <script>
    (function () {
      var s = document.querySelectorAll('.sheet');
      if (!s.length) return;
      function fit() {
        var k = document.documentElement.clientWidth / s[0].offsetWidth;
        for (var i = 0; i < s.length; i++) {
          s[i].style.transformOrigin = 'top left';
          s[i].style.transform = k < 1 ? 'scale(' + k + ')' : 'none';
        }
      }
      fit();
      addEventListener('resize', fit);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    })();
  </script>`;

  const body = page1 + page2;
  if (opts.embedded) return `<style>${css}${FIT_CSS}</style>${body}${FIT_JS}`;

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(d.name)} — Shortlist of Five</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+Devanagari:wght@400;600&display=swap" rel="stylesheet">
<style>body{margin:0;background:#ECE5D5;padding:10mm;display:flex;flex-direction:column;align-items:center}
.bar{position:sticky;top:0;display:flex;gap:12px;align-items:center;justify-content:center;
  padding:10px;font-family:system-ui,sans-serif;font-size:14px;color:#3D4751}
.bar button{font:inherit;padding:8px 18px;border-radius:8px;
  border:1px solid #B8501C;background:#B8501C;color:#FCFAF5;cursor:pointer;
  box-shadow:0 6px 16px -6px rgba(184,80,28,.7);transition:filter .15s,transform .15s}
.bar button:hover{filter:brightness(1.07);transform:translateY(-1px)}
.bar button:active{transform:none}
${css}</style>
</head><body>
<div class="bar no-print"><button onclick="window.print()">Download as PDF</button>
<span>Your browser's print dialog has a &ldquo;Save as PDF&rdquo; option.</span></div>
${body}
</body></html>`;
}
