import type { CertificateData } from "./certificate-data.js";
import { logoMark } from "../brand/logo.js";

/**
 * The naming certificate — one A4 page, print-ready.
 *
 * Delivered as HTML rather than a rendered PDF on purpose. No HTML-to-PDF
 * renderer is installed and none is being added: the browser the customer is
 * already using produces an identical result from the same CSS, with no
 * 300 MB of Chromium on the server and no cold start. The Download button on
 * the page calls print(), and every browser offers "Save as PDF" there.
 *
 * The sheet is regenerated from the name on every request and never stored, so
 * no file carrying a child's name accumulates anywhere.
 */

const esc = (s: string): string =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/*
 * Wheel geometry. Nine wedges of 40°, inner radius 58, outer 106, centred on
 * (150,150) of a 300×300 viewBox. Computed once rather than placed by eye —
 * the first version was eyeballed and nothing sat on a true axis.
 */
const WEDGES = [
  "M 113.7 50.4 A 106 106 0 0 1 186.3 50.4 L 169.8 95.5 A 58 58 0 0 0 130.2 95.5 Z",
  "M 186.3 50.4 A 106 106 0 0 1 241.8 97.0 L 200.2 121.0 A 58 58 0 0 0 169.8 95.5 Z",
  "M 241.8 97.0 A 106 106 0 0 1 254.4 168.4 L 207.1 160.1 A 58 58 0 0 0 200.2 121.0 Z",
  "M 254.4 168.4 A 106 106 0 0 1 218.1 231.2 L 187.3 194.4 A 58 58 0 0 0 207.1 160.1 Z",
  "M 218.1 231.2 A 106 106 0 0 1 150.0 256.0 L 150.0 208.0 A 58 58 0 0 0 187.3 194.4 Z",
  "M 150.0 256.0 A 106 106 0 0 1 81.9 231.2 L 112.7 194.4 A 58 58 0 0 0 150.0 208.0 Z",
  "M 81.9 231.2 A 106 106 0 0 1 45.6 168.4 L 92.9 160.1 A 58 58 0 0 0 112.7 194.4 Z",
  "M 45.6 168.4 A 106 106 0 0 1 58.2 97.0 L 99.8 121.0 A 58 58 0 0 0 92.9 160.1 Z",
  "M 58.2 97.0 A 106 106 0 0 1 113.7 50.4 L 130.2 95.5 A 58 58 0 0 0 99.8 121.0 Z",
];
const TINTS = ["#E7B4C2", "#C3B6DE", "#A5C4DD", "#E8C76A", "#E7B4C2", "#C3B6DE", "#A5C4DD", "#E8C76A", "#C3B6DE"];
const NUM_XY: Array<[number, number]> = [
  [150, 74], [202.7, 93.2], [230.8, 141.8], [221.0, 197.0], [178.0, 233.1],
  [122.0, 233.1], [79.0, 197.0], [69.2, 141.8], [97.3, 93.2],
];
const LABEL_XY: Array<[number, number]> = [
  [150, 31], [228.4, 59.5], [270.1, 131.8], [255.7, 214.0], [191.7, 267.6],
  [108.3, 267.6], [44.3, 214.0], [29.9, 131.8], [71.6, 59.5],
];
/** The traditional qualities. Offered as tradition, never as a prediction. */
const QUALITIES = [
  "Leadership", "Cooperation", "Expression", "Order", "Freedom",
  "Nurturing", "Spirit", "Power", "Compassion",
];

function wheel(root: number, planet: CertificateData["planet"], compound: number): string {
  const hit = Math.min(Math.max(root, 1), 9) - 1;
  const wedges = WEDGES.map((d, i) =>
    i === hit ? "" : `<path d="${d}" fill="${TINTS[i]}"/>`).join("");
  const strokes = WEDGES.map((d) => {
    const arc = d.slice(0, d.indexOf(" L "));
    return `<path d="${arc}" fill="none" stroke="#FCFAF5" stroke-width="1.6" opacity=".9"/>`;
  }).join("");
  const numbers = NUM_XY.map(([x, y], i) =>
    `<text x="${x}" y="${y}" ${i === hit ? 'fill="#FCFAF5" font-weight="600"' : 'fill="#0F1419"'}>${i + 1}</text>`,
  ).join("");
  const labels = LABEL_XY.map(([x, y], i) =>
    i === hit
      ? `<text x="${x}" y="${y}" fill="#B8501C" font-weight="600">${QUALITIES[i]}</text>`
      : `<text x="${x}" y="${y}" fill="#6B7480">${QUALITIES[i]}</text>`,
  ).join("");

  return `<svg viewBox="0 0 300 300" class="wheel" role="img" aria-label="Numerology wheel, root number ${root}">
  <g opacity=".55">${wedges}</g>
  <path d="${WEDGES[hit]}" fill="#B8501C"/>
  <g>${strokes}</g>
  <circle cx="150" cy="150" r="58" fill="#FCFAF5"/>
  <circle cx="150" cy="150" r="52" fill="none" stroke="#B8501C" stroke-opacity=".28" stroke-dasharray="2.5 3.5"/>
  <g font-family="Fraunces,Georgia,serif" font-size="16.5" text-anchor="middle">${numbers}</g>
  <g font-family="Inter,sans-serif" font-size="7.6" text-anchor="middle">${labels}</g>
  <g text-anchor="middle">
    <text x="150" y="139" font-family="JetBrains Mono,monospace" font-size="6.4" fill="#6B7480" letter-spacing="1.5">ROOT</text>
    <text x="150" y="166" font-family="Fraunces,Georgia,serif" font-size="33" fill="#B8501C" font-weight="600">${root}</text>
    <text x="150" y="180" font-family="Inter,sans-serif" font-size="7.6" fill="#3D4751">${
      planet ? `${esc(planet.glyph)} ${esc(planet.name)} · compound ${compound}` : `compound ${compound}`
    }</text>
  </g>
</svg>`;
}

/** Embedded-only: shrink the sheet to whatever width the frame gives us. */
const FIT_CSS = `
  html,body{margin:0;padding:0;overflow:hidden;background:#fff}`;
const FIT_JS = `
  <script>
    (function () {
      var s = document.querySelector('.sheet');
      if (!s) return;
      function fit() {
        var k = document.documentElement.clientWidth / s.offsetWidth;
        s.style.transformOrigin = 'top left';
        s.style.transform = k < 1 ? 'scale(' + k + ')' : 'none';
      }
      fit();
      addEventListener('resize', fit);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    })();
  </script>`;


const SPARKLES = `<svg class="sparkles" viewBox="0 0 210 297" aria-hidden="true">
  <g fill="#C3B6DE" opacity=".55">
    <path d="M28 62 l2.4 5.6 5.6 2.4 -5.6 2.4 -2.4 5.6 -2.4 -5.6 -5.6 -2.4 5.6 -2.4z"/>
    <path d="M182 108 l1.8 4.2 4.2 1.8 -4.2 1.8 -1.8 4.2 -1.8 -4.2 -4.2 -1.8 4.2 -1.8z"/>
  </g>
  <g fill="#E7B4C2" opacity=".6">
    <path d="M176 54 l2 4.6 4.6 2 -4.6 2 -2 4.6 -2 -4.6 -4.6 -2 4.6 -2z"/>
    <path d="M24 208 l1.6 3.8 3.8 1.6 -3.8 1.6 -1.6 3.8 -1.6 -3.8 -3.8 -1.6 3.8 -1.6z"/>
  </g>
  <g fill="#A5C4DD" opacity=".6">
    <path d="M190 236 l2.2 5 5 2.2 -5 2.2 -2.2 5 -2.2 -5 -5 -2.2 5 -2.2z"/>
    <path d="M34 128 l1.4 3.4 3.4 1.4 -3.4 1.4 -1.4 3.4 -1.4 -3.4 -3.4 -1.4 3.4 -1.4z"/>
  </g>
  <g fill="#E8C76A" opacity=".7">
    <circle cx="196" cy="86" r="1.7"/><circle cx="18" cy="176" r="1.5"/><circle cx="188" cy="188" r="1.3"/>
  </g>
</svg>`;

/**
 * The complete document.
 *
 * `embedded` renders it for display inside the report page (no page chrome, no
 * print button of its own — the host page supplies that). The default renders a
 * standalone printable page.
 */
export function renderCertificateHtml(d: CertificateData, opts: { embedded?: boolean } = {}): string {
  const issued = d.issuedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const facts: string[] = [
    `<div class="fact f1"><div class="k">Said as</div><div class="v"><em>${esc(d.saidAs)}</em><br>${
      d.syllables === 1 ? "one syllable" : `${d.syllables} syllables`
    }</div></div>`,
  ];
  if (d.shortForms.length > 0) {
    facts.push(
      `<div class="fact f2"><div class="k">At home</div><div class="v">${d.shortForms
        .map((s) => `<em>${esc(s)}</em>`)
        .join(" · ")}</div></div>`,
    );
  }
  if (d.birthStar) {
    facts.push(
      `<div class="fact f3"><div class="k">Born under</div><div class="v">${esc(d.birthStar.symbol)} <em>${esc(
        d.birthStar.nakshatra,
      )}</em><br>${esc(d.birthStar.rashi)}</div></div>`,
    );
  }

  const scripts = d.scripts.map((s) => `<span>${esc(s.text)}</span>`).join("");

  const sheet = `<div class="sheet">
  ${SPARKLES}
  <div class="top"><div class="mark">नाम देखो</div><div class="kicker">A name, considered</div></div>
  <div class="nameblock"><div class="name">${esc(d.name)}</div><div class="deva">${esc(d.devanagari)}</div></div>
  <p class="prose">${esc(d.prose)}</p>
  <div class="wheelwrap">${wheel(d.root, d.planet, d.compound)}</div>
  <div class="facts cols-${facts.length}">${facts.join("")}</div>
  <div class="scripts">${scripts}</div>
  <div class="closing">
    <div class="rule"></div>
    <div class="cong">With every good wish for ${esc(d.name)}</div>
    <p class="wish">May it be spoken with love, and answered to with joy — at home, at school,
      and everywhere this name is carried. A name is the first gift, and the one used most.</p>
  </div>
  <div class="foot">
    <div class="t">Issued ${esc(issued)}<br>naamdekho.net<br>Traditional readings,<br>offered in that spirit</div>
    ${logoMark({ widthMm: 30, className: 'foot-logo' })}
  </div>
</div>`;

  const css = `
  :root{--paper:#FCFAF5;--ink:#0F1419;--ink-2:#3D4751;--ink-3:#6B7480;
        --line:rgba(24,19,16,.14);--accent:#B8501C;--accent-2:#7A2E0E}
  *{box-sizing:border-box}
  .sheet{width:210mm;height:297mm;background:var(--paper);color:var(--ink);position:relative;
    overflow:hidden;display:flex;flex-direction:column;padding:13mm 11mm 9mm;
    font-family:'Inter',system-ui,sans-serif;}
  .sheet::before{content:"";position:absolute;inset:4mm;border:1.5px dashed rgba(195,182,222,.75);
    border-radius:2mm;pointer-events:none;z-index:3}
  .sheet>*{position:relative;z-index:2}
  .sparkles{position:absolute;inset:0;z-index:1;width:100%;height:100%;pointer-events:none}
  .top{text-align:center}
  .mark{font-family:'Noto Sans Devanagari',serif;font-size:4mm;color:var(--accent);letter-spacing:.05em}
  .kicker{font-family:'JetBrains Mono',monospace;font-size:2.3mm;letter-spacing:.24em;
    text-transform:uppercase;color:var(--ink-3);margin-top:1mm}
  .nameblock{text-align:center;margin-top:3mm;position:relative}
  .nameblock::before{content:"";position:absolute;left:50%;top:52%;
    transform:translate(-50%,-50%) rotate(-1.2deg);width:78%;height:1.05em;border-radius:99mm;z-index:-1;
    background:linear-gradient(95deg,rgba(231,180,194,.62),rgba(195,182,222,.58) 52%,rgba(165,196,221,.55));
    -webkit-print-color-adjust:exact;print-color-adjust:exact}
  .name{font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:16mm;line-height:1.05;letter-spacing:-.02em}
  .deva{font-family:'Noto Sans Devanagari',serif;font-size:6mm;color:var(--accent-2);opacity:.92;margin-top:.5mm}
  .prose{font-family:'Fraunces',Georgia,serif;font-size:3.9mm;line-height:1.66;color:var(--ink-2);
    text-align:center;margin:4mm auto 0;max-width:120mm;font-style:italic}
  .wheelwrap{display:flex;justify-content:center;margin-top:2mm}
  .wheel{width:95mm;height:95mm}
  .facts{display:grid;gap:2mm;margin-top:3mm}
  .facts.cols-1{grid-template-columns:1fr}.facts.cols-2{grid-template-columns:repeat(2,1fr)}
  .facts.cols-3{grid-template-columns:repeat(3,1fr)}
  .fact{text-align:center;padding:2mm 1mm;border-radius:2mm;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .fact.f1{background:rgba(231,180,194,.30)}.fact.f2{background:rgba(195,182,222,.30)}
  .fact.f3{background:rgba(165,196,221,.30)}
  .fact .k{font-family:'JetBrains Mono',monospace;font-size:2.2mm;letter-spacing:.13em;
    text-transform:uppercase;color:var(--ink-3)}
  .fact .v{font-family:'Fraunces',Georgia,serif;font-size:3.7mm;margin-top:.8mm;line-height:1.28}
  .fact .v em{font-style:normal;color:var(--accent-2)}
  .scripts{display:flex;flex-wrap:wrap;justify-content:center;gap:1.2mm;margin-top:3mm}
  .scripts span{font-size:3.2mm;padding:.6mm 2mm;border-radius:99mm;line-height:1.5;
    -webkit-print-color-adjust:exact;print-color-adjust:exact}
  .scripts span:nth-child(5n+1){background:rgba(231,180,194,.40)}
  .scripts span:nth-child(5n+2){background:rgba(195,182,222,.40)}
  .scripts span:nth-child(5n+3){background:rgba(165,196,221,.40)}
  .scripts span:nth-child(5n+4){background:rgba(232,199,106,.42)}
  .scripts span:nth-child(5n+5){background:rgba(184,80,28,.16)}
  .closing{margin-top:auto;padding-bottom:4mm;text-align:center}
  .closing .rule{width:24mm;height:1px;margin:0 auto 4mm;
    background:linear-gradient(90deg,transparent,#B8501C,transparent);opacity:.65}
  .closing .cong{font-family:'Fraunces',Georgia,serif;font-size:6mm;color:var(--accent-2);
    letter-spacing:-.01em}
  .closing .wish{font-family:'Fraunces',Georgia,serif;font-style:italic;font-size:3.6mm;
    line-height:1.7;color:var(--ink-2);max-width:118mm;margin:2.5mm auto 0}
  .foot{margin-top:auto;padding-top:2mm;display:flex;justify-content:space-between;align-items:flex-end}
  .foot .t{font-family:'JetBrains Mono',monospace;font-size:2.2mm;letter-spacing:.09em;
    text-transform:uppercase;color:var(--ink-3);line-height:1.55}
  /* Placement only. The artwork's own size and shape come from the file, so
     nothing here can stretch or recolour it. */
  .foot-logo{align-self:flex-end;margin-bottom:-1mm}
  @media print{
    /* The preview may be scaled down to fit its frame; the printed sheet
       never is. Without this the PDF would come out at frame size. */
    .sheet{transform:none !important}
    @page{size:A4 portrait;margin:0}
    html,body{margin:0;padding:0;background:#fff}
    .sheet{box-shadow:none;border:0}
    .no-print{display:none !important}
  }`;

  if (opts.embedded) return `<style>${css}${FIT_CSS}</style>${sheet}${FIT_JS}`;

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(d.name)} — Naming Certificate</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+Devanagari:wght@400;600&family=Noto+Sans+Bengali&family=Noto+Sans+Tamil&family=Noto+Sans+Telugu&family=Noto+Sans+Gujarati&family=Noto+Sans+Kannada&family=Noto+Sans+Malayalam&family=Noto+Sans+Gurmukhi&family=Noto+Sans+Oriya&display=swap" rel="stylesheet">
<style>
  body{margin:0;background:#ECE5D5;display:flex;flex-direction:column;align-items:center;gap:6mm;padding:8mm}
  .bar{font-family:'Inter',system-ui,sans-serif;display:flex;gap:3mm;align-items:center}
  .bar button{font:inherit;font-weight:600;font-size:14px;padding:10px 20px;border-radius:999px;
    border:1px solid #B8501C;background:#B8501C;color:#FCFAF5;cursor:pointer;
    box-shadow:0 6px 16px -6px rgba(184,80,28,.7);transition:filter .15s,transform .15s}
  .bar button:hover{filter:brightness(1.07);transform:translateY(-1px)}
  .bar button:active{transform:none}
  .bar span{font-size:13px;color:#3D4751}
${css}
</style>
</head><body>
<div class="bar no-print">
  <button onclick="window.print()">Download as PDF</button>
  <span>Your browser's print dialog has a “Save as PDF” option.</span>
</div>
${sheet}
</body></html>`;
}
