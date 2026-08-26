import { chaldean } from "../lib/numerology.js";
import { nameInAllScripts } from "../lib/transliterate.js";
import { scanRashi, scanNicknames } from "../scanners/astro.js";
import { scanPronunciation } from "../scanners/linguistic.js";

/**
 * Keepsake certificate (₹29) — a designed, print-ready page for the family.
 *
 * Two artboards in one document:
 *   1. A4 portrait — for printing and framing
 *   2. 1080×1080 square — for sharing on Instagram (screenshot it)
 *
 * Everything is recomputed from the name itself rather than read back from
 * the scan's tiles, so the certificate is always complete even if a network
 * check was slow or a source was unavailable. Nothing here depends on an
 * external service.
 */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface KeepsakeInput {
  name: string;
  /** Optional — printed under the name if the parents supplied one. */
  bornOn?: string;
  issuedAt?: Date;
}

export function renderKeepsakeHtml({ name, bornOn, issuedAt }: KeepsakeInput): string {
  const num = chaldean(name);
  const { devanagari, scripts } = nameInAllScripts(name);
  const rashi = scanRashi(name);
  const nick = scanNicknames(name);
  const pron = scanPronunciation(name.toUpperCase());

  const rd = rashi.detail as { nakshatra?: string; pada?: number; rashi?: string } | undefined;
  const nicknames = (nick.detail?.nicknames as string[] | undefined) ?? [];
  const issued = (issuedAt ?? new Date()).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const scriptGrid = scripts
    .map(
      (s) => `<div class="sc"><div class="sc-l">${esc(s.name)}</div><div class="sc-t">${esc(s.text)}</div></div>`,
    )
    .join("");

  // The square artboard shows a curated subset — ten scripts do not breathe
  // at 1080px, and a cramped keepsake is worse than a selective one.
  const squareScripts = scripts
    .filter((s) => ["hi", "bn", "ta", "te", "gu", "kn"].includes(s.code))
    .map((s) => `<div class="qsc"><span>${esc(s.name)}</span><b>${esc(s.text)}</b></div>`)
    .join("");

  return `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(name)} — Keepsake | Naam Dekho</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,300;1,9..144,400&family=Inter:wght@300;400;500&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+Devanagari:wght@400;500;600&display=swap" rel="stylesheet" />
<style>
  :root{
    --paper:#FDFBF6;--ink:#1A1917;--ink-2:#4A4741;--ink-3:#95908456;
    --muted:#8A867C;--line:#E8E2D6;--accent:#B8501C;--gold:#C89A54;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#EDE9E0;font-family:Inter,system-ui,sans-serif;color:var(--ink);-webkit-font-smoothing:antialiased;padding:26px 14px}

  .toolbar{max-width:820px;margin:0 auto 20px;display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}
  .toolbar p{font-size:13px;color:#6A665E}
  .print-btn{background:var(--accent);color:#fff;border:0;padding:10px 20px;border-radius:9px;font-size:13.5px;font-weight:500;cursor:pointer;font-family:inherit}

  .sheet{background:var(--paper);margin:0 auto 30px;box-shadow:0 3px 24px rgba(0,0,0,.10);position:relative}
  .a4{width:210mm;min-height:297mm;padding:20mm 18mm}
  .square{width:1080px;height:1080px;padding:74px;display:flex;flex-direction:column;justify-content:center}

  /* ── decorative frame ── */
  .frame{position:absolute;inset:9mm;border:1px solid var(--line);pointer-events:none}
  .frame::before,.frame::after{content:"";position:absolute;width:26px;height:26px;border:2px solid var(--gold)}
  .frame::before{top:-1px;left:-1px;border-right:0;border-bottom:0}
  .frame::after{bottom:-1px;right:-1px;border-left:0;border-top:0}

  .brand{text-align:center;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.30em;text-transform:uppercase;color:var(--muted)}
  .eyebrow{text-align:center;font-family:Fraunces,serif;font-style:italic;font-size:15px;color:var(--muted);margin-top:26px}

  .name{text-align:center;font-family:Fraunces,serif;font-weight:400;font-size:66px;line-height:1.05;margin-top:8px;letter-spacing:-.01em}
  .deva{text-align:center;font-family:'Noto Sans Devanagari',serif;font-size:38px;color:var(--accent);margin-top:6px;font-weight:500}
  .born{text-align:center;font-size:13px;color:var(--muted);margin-top:12px;font-family:'JetBrains Mono',monospace;letter-spacing:.05em}

  .rule{display:flex;align-items:center;gap:12px;margin:26px 0 22px}
  .rule::before,.rule::after{content:"";flex:1;height:1px;background:var(--line)}
  .rule span{color:var(--gold);font-size:13px;letter-spacing:.3em}

  .h{font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);text-align:center;margin-bottom:11px}

  .scripts{display:grid;grid-template-columns:repeat(5,1fr);gap:9px}
  .sc{border:1px solid var(--line);border-radius:8px;padding:9px 7px;text-align:center;background:#fff}
  .sc-l{font-family:'JetBrains Mono',monospace;font-size:7.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
  .sc-t{font-size:17px;margin-top:3px;line-height:1.45}

  .two{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:22px}
  .box{border:1px solid var(--line);border-radius:10px;padding:15px 17px;background:#fff}
  .box .k{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.13em;text-transform:uppercase;color:var(--muted)}
  .box .v{font-family:Fraunces,serif;font-size:27px;margin-top:5px;line-height:1.2}
  .box .n{font-size:12.5px;color:var(--ink-2);margin-top:4px;line-height:1.5}

  .foot{margin-top:auto;padding-top:24px;text-align:center}
  .foot .line{font-size:11.5px;color:var(--muted);line-height:1.7}
  .a4 .foot{position:absolute;left:18mm;right:18mm;bottom:16mm}

  /* ── square artboard ── */
  .square .name{font-size:104px}
  .square .deva{font-size:60px;margin-top:10px}
  .qgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:34px}
  .qsc{border:1px solid var(--line);border-radius:11px;padding:15px;text-align:center;background:#fff}
  .qsc span{display:block;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
  .qsc b{display:block;font-size:31px;font-weight:400;margin-top:6px;line-height:1.4}
  .qmeta{display:flex;justify-content:center;gap:44px;margin-top:38px;text-align:center}
  .qmeta div span{display:block;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
  .qmeta div b{display:block;font-family:Fraunces,serif;font-size:29px;font-weight:400;margin-top:5px}

  .caption{max-width:820px;margin:0 auto 26px;font-size:12.5px;color:#6A665E;text-align:center}

  @media print{
    body{background:#fff;padding:0}
    .toolbar,.caption{display:none}
    .sheet{box-shadow:none;margin:0}
    .square{display:none}       /* print the A4 only */
    @page{size:A4;margin:0}
  }
  @media (max-width:900px){
    .a4,.square{width:100%;min-height:auto;height:auto;padding:26px 20px}
    .name{font-size:44px}.square .name{font-size:52px}
    .deva,.square .deva{font-size:30px}
    .scripts{grid-template-columns:repeat(2,1fr)}
    .qgrid{grid-template-columns:repeat(2,1fr)}
    .two{grid-template-columns:1fr}
    .a4 .foot{position:static}
  }
</style>
</head>
<body>

<div class="toolbar">
  <p><strong>Keepsake for ${esc(name)}</strong> — print the A4, or screenshot the square for Instagram.</p>
  <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
</div>

<!-- ───────────── A4 ───────────── -->
<div class="sheet a4">
  <div class="frame"></div>

  <div class="brand">Naam Dekho</div>
  <div class="eyebrow">A name, and everything it carries</div>

  <div class="name">${esc(name)}</div>
  <div class="deva">${esc(devanagari)}</div>
  ${bornOn ? `<div class="born">${esc(bornOn)}</div>` : ""}

  <div class="rule"><span>✦</span></div>

  <div class="h">Written across ${scripts.length} Indian scripts</div>
  <div class="scripts">${scriptGrid}</div>

  <div class="two">
    <div class="box">
      <div class="k">Chaldean root number</div>
      <div class="v">${num.root} &nbsp;<span style="font-size:19px;color:var(--muted)">${esc(num.planet.glyph ?? "")} ${esc(num.planet.name)}</span></div>
      <div class="n">Compound ${num.compound}${num.compoundMeaning ? ` — ${esc(num.compoundMeaning)}` : ""}</div>
    </div>
    <div class="box">
      <div class="k">Nakshatra &amp; Rashi</div>
      <div class="v" style="font-size:22px">${esc(rd?.nakshatra ?? "—")}</div>
      <div class="n">${rd?.rashi ? `${esc(rd.rashi)} · pada ${rd.pada ?? "—"}` : esc(rashi.summary)}</div>
    </div>
    <div class="box">
      <div class="k">Called at home</div>
      <div class="v" style="font-size:22px">${nicknames.length ? esc(nicknames.join(" · ")) : "—"}</div>
      <div class="n">${nicknames.length ? "The short forms this name naturally takes." : esc(nick.summary)}</div>
    </div>
    <div class="box">
      <div class="k">Pronunciation</div>
      <div class="v" style="font-size:22px">${pron.detail?.syllables ?? "?"} syllables</div>
      <div class="n">${esc(String(pron.detail?.indianEase ?? "—"))} across Indian languages · ${esc(String(pron.detail?.westernEase ?? "—"))} for non-Indian speakers</div>
    </div>
  </div>

  <div class="foot">
    <div class="line">Issued ${esc(issued)} · naamdekho.net</div>
    <div class="line" style="font-size:10px">Numerology and nakshatra readings are traditional cultural reference, offered with affection — not advice.</div>
  </div>
</div>

<p class="caption">Below: the square version, sized for Instagram. Screenshot it.</p>

<!-- ───────────── 1080 × 1080 ───────────── -->
<div class="sheet square">
  <div class="frame"></div>
  <div class="brand">Naam Dekho</div>
  <div class="eyebrow">A name, and everything it carries</div>
  <div class="name">${esc(name)}</div>
  <div class="deva">${esc(devanagari)}</div>

  <div class="qgrid">${squareScripts}</div>

  <div class="qmeta">
    <div><span>Root number</span><b>${num.root}</b></div>
    <div><span>Ruling planet</span><b>${esc(num.planet.name)}</b></div>
    <div><span>Nakshatra</span><b>${esc(rd?.nakshatra ?? "—")}</b></div>
  </div>

  <div class="foot"><div class="line">naamdekho.net</div></div>
</div>

</body>
</html>
`;
}
