import type { TileResult, ScanVerdict } from "../lib/types.js";

/**
 * Evidence report — a standalone, print-ready HTML document.
 *
 * This template is the single source of truth for the Deep Search report:
 *   - Served directly at GET /v1/scans/:id/report (user can print → Save as PDF)
 *   - Will be fed to the WeasyPrint sidecar to produce the stored PDF once
 *     Python/WeasyPrint is installed (see STUBBED.md)
 */

export interface ReportInput {
  scanId: string;
  name: string;
  mode: string;
  startedAt: Date;
  completedAt: Date | null;
  verdict: ScanVerdict | null;
  tiles: TileResult[];
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  ok: { label: "Clear", color: "#1B7A3D", bg: "#E8F5EC" },
  no: { label: "Conflict", color: "#B3261E", bg: "#FBEAE9" },
  warn: { label: "Warning", color: "#8A6100", bg: "#FBF3DD" },
  info: { label: "Info", color: "#5A5750", bg: "#F1EFE9" },
  pending: { label: "Pending", color: "#8A867C", bg: "#F1EFE9" },
  error: { label: "Error", color: "#8A867C", bg: "#F1EFE9" },
};

const FAMILY_LABEL: Record<string, string> = {
  legal: "Legal & Regulatory",
  domains: "Domain Availability",
  social: "Social Handles",
  marketplace: "Marketplaces",
  brand: "Brand & Search",
  linguistic: "Linguistic",
  numerology: "Numerology",
  pronunciation: "Pronunciation",
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderReportHtml(input: ReportInput): string {
  const { scanId, name, verdict, tiles } = input;
  const when = (input.completedAt ?? input.startedAt).toISOString().replace("T", " ").slice(0, 16) + " UTC";

  const families = new Map<string, TileResult[]>();
  for (const t of tiles) {
    const key = FAMILY_LABEL[t.category] ?? t.category;
    if (!families.has(key)) families.set(key, []);
    families.get(key)!.push(t);
  }

  const familySections = [...families.entries()]
    .map(([family, familyTiles]) => {
      const rows = familyTiles
        .map((t) => {
          const s = STATUS_LABEL[t.status] ?? STATUS_LABEL.pending;
          const source = t.actionUrl
            ? `<a href="${esc(t.actionUrl)}">${esc(t.source ?? t.actionUrl)}</a>`
            : esc(t.source ?? "—");
          return `<tr>
            <td class="check">${esc(t.tileId)}</td>
            <td><span class="pill" style="color:${s.color};background:${s.bg}">${s.label}</span></td>
            <td>${esc(t.summary)}</td>
            <td class="src">${source}</td>
          </tr>`;
        })
        .join("\n");
      return `<h2>${esc(family)}</h2>
      <table>
        <thead><tr><th>Check</th><th>Result</th><th>Finding</th><th>Source</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    })
    .join("\n");

  const verdictBlock = verdict
    ? `<div class="verdict">
        <div class="score">&#8776;&nbsp;${verdict.score}<span>%</span></div>
        <div class="counts">
          <b>${verdict.clear}</b> clear · <b>${verdict.conflict}</b> conflict${verdict.conflict === 1 ? "" : "s"} ·
          <b>${verdict.warn}</b> warning${verdict.warn === 1 ? "" : "s"} · <b>${verdict.info}</b> informational ·
          <b>${verdict.pending}</b> pending
          <div class="approx">An approximate figure — rounded, and damped by how many sources answered.</div>
        </div>
        <div class="summary">${esc(verdict.summary)}</div>
      </div>`
    : `<div class="verdict"><div class="summary">Scan in progress — partial evidence below.</div></div>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Naam Dekho — Evidence Report: ${esc(name)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: Georgia, 'Times New Roman', serif; background: #FAF8F3; color: #211F1A; padding: 32px; }
  .sheet { max-width: 820px; margin: 0 auto; }
  header { border-bottom: 3px solid #B8501C; padding-bottom: 16px; margin-bottom: 24px; }
  .brand { font-size: 14px; letter-spacing: 0.14em; text-transform: uppercase; color: #B8501C; font-family: monospace; }
  h1 { font-size: 40px; font-weight: normal; margin-top: 8px; }
  h1 em { color: #B8501C; }
  .meta { margin-top: 6px; font-family: monospace; font-size: 11px; color: #8A867C; }
  .verdict { display: flex; align-items: center; gap: 24px; background: #fff; border: 1px solid #E4E0D5;
             border-radius: 12px; padding: 20px 24px; margin: 20px 0 28px; }
  .score { font-size: 46px; color: #B8501C; } .score span { font-size: 18px; color: #8A867C; }
  .counts { font-size: 14px; color: #5A5750; } .summary { font-size: 14px; color: #211F1A; margin-top: 4px; }
  .approx { font-size: 11px; color: #8A867C; margin-top: 3px; }
  h2 { font-size: 19px; margin: 26px 0 10px; border-bottom: 1px solid #E4E0D5; padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; background: #fff; }
  th { text-align: left; font-family: monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em;
       color: #8A867C; padding: 8px 10px; border-bottom: 1px solid #E4E0D5; }
  td { padding: 8px 10px; border-bottom: 1px solid #F1EFE9; vertical-align: top; }
  td.check { font-family: monospace; font-size: 11px; color: #5A5750; white-space: nowrap; }
  td.src { font-size: 11px; } td.src a { color: #B8501C; }
  .pill { display: inline-block; padding: 2px 9px; border-radius: 99px; font-family: monospace; font-size: 10px;
          text-transform: uppercase; letter-spacing: 0.05em; }
  footer { margin-top: 36px; padding-top: 14px; border-top: 1px solid #E4E0D5; font-family: monospace;
           font-size: 10px; color: #8A867C; display: flex; justify-content: space-between; }
  .disclaimer { margin-top: 18px; font-size: 11px; color: #8A867C; line-height: 1.5; }
  @media print { body { padding: 0; background: #fff; } }
</style>
</head>
<body>
<div class="sheet">
  <header>
    <div class="brand">Naam Dekho · नाम देखो · Deep Search Evidence Report</div>
    <h1>“<em>${esc(name)}</em>”</h1>
    <div class="meta">Scan ${esc(scanId)} · completed ${when} · ${tiles.length} checks</div>
  </header>
  ${verdictBlock}
  ${familySections}
  <div class="disclaimer">
    This report reflects the state of the listed public registries and platforms at the time of the scan.
    It is an availability signal, not legal advice — consult a trademark attorney before filing.
    GST trade-name findings are informational only: trade names are not exclusive under GST registration.
  </div>
  <footer>
    <span>© Naam Dekho Technologies Pvt Ltd</span>
    <span>naamdekho.in · DPDP Act 2023 compliant</span>
  </footer>
</div>
</body>
</html>`;
}
