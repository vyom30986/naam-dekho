/**
 * Naam Dekho — Production Development Documentation
 *
 * Comprehensive technical reference for the engineering team building
 * the Naam Dekho platform. Pairs with Naam_Dekho_Connector_Catalog.xlsx.
 */
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageNumber, PageBreak,
  TableOfContents, TabStopType, TabStopPosition, VerticalAlign,
} = require("docx");

const OUT_DIR = __dirname;
const DIAGRAMS = path.join(OUT_DIR, "diagrams");

const INK = "0F1419", INK2 = "3D4751", INK3 = "6B7480";
const ACCENT = "B8501C", GOLD = "8A5A00", OK = "1B5E20", NO = "880E4F";
const BG2 = "F3EFE5", LINE = "D8D0BC";
const SOFT_GREEN = "E7F2E9", SOFT_PINK = "FCE4EC", SOFT_YELLOW = "FFF4D9";

const FONT = "Calibri";
const SERIF = "Cambria";
const MONO = "Consolas";

// ── Paragraph helpers ─────────────────────────────────────────────
const p = (text, opts = {}) =>
  new Paragraph({
    spacing: { before: 0, after: 120, line: 300 },
    alignment: opts.align || AlignmentType.LEFT,
    children: [new TextRun({ text, font: FONT, size: opts.size || 22, color: opts.color || INK, bold: opts.bold, italics: opts.italic })],
  });

const rich = (runs, opts = {}) =>
  new Paragraph({
    spacing: { before: opts.before || 0, after: opts.after || 120, line: 300 },
    alignment: opts.align || AlignmentType.LEFT,
    children: runs.map(r => typeof r === "string"
      ? new TextRun({ text: r, font: FONT, size: 22, color: INK })
      : new TextRun({ font: FONT, size: 22, color: INK, ...r }))
  });

const h1 = text => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 360, after: 200 },
  children: [new TextRun({ text, font: SERIF, size: 36, bold: true, color: INK })],
});
const h2 = text => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 280, after: 160 },
  children: [new TextRun({ text, font: SERIF, size: 28, bold: true, color: INK })],
});
const h3 = text => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 220, after: 120 },
  children: [new TextRun({ text, font: SERIF, size: 24, bold: true, color: INK2 })],
});

const bullet = (text, level = 0) => new Paragraph({
  numbering: { reference: "bullets", level },
  spacing: { after: 80, line: 280 },
  children: [new TextRun({ text, font: FONT, size: 22, color: INK })],
});

const code = text => new Paragraph({
  spacing: { before: 60, after: 120, line: 280 },
  shading: { type: ShadingType.CLEAR, fill: "F5F1E8" },
  border: { left: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 8 } },
  children: text.split("\n").map((line, i) => new TextRun({
    text: line, font: MONO, size: 18, color: INK, break: i === 0 ? 0 : 1,
  })),
});

const blank = (size = 120) => new Paragraph({ spacing: { before: 0, after: size }, children: [new TextRun("")] });
const hr = () => new Paragraph({
  spacing: { before: 80, after: 80 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: LINE, space: 1 } },
  children: [new TextRun("")],
});
const pb = () => new Paragraph({ children: [new PageBreak()] });

// ── Tables ────────────────────────────────────────────────────────
const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: LINE };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

const cell = (text, opts = {}) => new TableCell({
  borders: cellBorders,
  width: { size: opts.width, type: WidthType.DXA },
  shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
  verticalAlign: VerticalAlign.CENTER,
  margins: { top: 100, bottom: 100, left: 130, right: 130 },
  children: [new Paragraph({
    spacing: { before: 0, after: 0 },
    children: [new TextRun({
      text, font: opts.mono ? MONO : FONT,
      size: opts.size || 19, color: opts.color || INK,
      bold: opts.bold, italics: opts.italic,
    })],
  })],
});

const headerCell = (text, width) => cell(text, { width, fill: INK, color: "FAF8F3", bold: true, size: 17 });
const catCell = (text, width) => cell(text, { width, fill: ACCENT, color: "FAF8F3", bold: true, size: 19 });

const wideTable = (colWidths, rows) => new Table({
  width: { size: colWidths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
  columnWidths: colWidths,
  rows,
});

// ── Image embed ───────────────────────────────────────────────────
const diagram = (fname, w, h, title, desc) => [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 160, after: 80 },
    children: [new ImageRun({
      type: "png",
      data: fs.readFileSync(path.join(DIAGRAMS, fname)),
      transformation: { width: w, height: h },
      altText: { title, description: desc, name: title },
    })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 280 },
    children: [
      new TextRun({ text: title + " — ", font: FONT, size: 18, bold: true, color: INK2, italics: true }),
      new TextRun({ text: desc, font: FONT, size: 18, color: INK3, italics: true }),
    ],
  }),
];

// ══════════════════════════════════════════════════════════════════
// CONTENT
// ══════════════════════════════════════════════════════════════════
const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
const children = [];

// COVER PAGE
children.push(
  new Paragraph({ spacing: { before: 1400 }, children: [new TextRun("")] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [new TextRun({ text: "DEVELOPER DOCUMENTATION  ·  v1.0", font: FONT, size: 18, color: ACCENT, bold: true, characterSpacing: 80 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
    children: [new TextRun({ text: "NAAM DEKHO", font: SERIF, size: 88, bold: true, color: INK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
    children: [new TextRun({ text: "नाम देखो", font: SERIF, size: 36, italics: true, color: ACCENT })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 500 },
    children: [new TextRun({ text: "Production engineering reference — architecture, APIs, WebSockets, connectors", font: SERIF, size: 22, italics: true, color: INK2 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER,
    border: { top: { style: BorderStyle.SINGLE, size: 8, color: ACCENT, space: 8 }, bottom: { style: BorderStyle.SINGLE, size: 8, color: ACCENT, space: 8 } },
    spacing: { after: 200 },
    children: [new TextRun({ text: "FOR THE NAAM DEKHO ENGINEERING TEAM", font: FONT, size: 20, bold: true, color: INK, characterSpacing: 30 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 200 },
    children: [new TextRun({ text: "This document is the canonical engineering reference for building the Naam Dekho platform. It covers system architecture, REST API contracts, WebSocket protocol, scanner module specifications, the complete connector knowledge base (with URLs, pricing, and rate limits), authentication and billing flows, deployment topology, and security and compliance posture.", font: FONT, size: 20, italics: true, color: INK2 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1200 },
    children: [new TextRun({ text: "Paired deliverable", font: FONT, size: 18, color: INK3 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
    children: [new TextRun({ text: "Naam_Dekho_Connector_Catalog.xlsx", font: MONO, size: 22, bold: true, color: ACCENT })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 },
    children: [new TextRun({ text: "Three-sheet workbook: Connector Catalog · Scanner Modules · Cost Model", font: FONT, size: 18, italics: true, color: INK3 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 },
    children: [new TextRun({ text: `Prepared: ${today}  ·  Document version: 1.0  ·  Audience: Engineering, DevOps, Data, SRE`, font: FONT, size: 18, color: INK3, italics: true })] }),
  pb(),
);

// TABLE OF CONTENTS
children.push(
  h1("Table of Contents"),
  p("In Microsoft Word: right-click the table below and choose \"Update Field\" to populate page numbers.", { italic: true, color: INK3, size: 18 }),
  new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-3" }),
  pb(),
);

// ════════════════════════════════════════════════════════════════
// 1. AT A GLANCE
// ════════════════════════════════════════════════════════════════
children.push(
  h1("1. At a Glance"),

  h2("1.1  What we are building"),
  p("Naam Dekho is a name-availability and name-suitability platform that accepts a single proposed name and returns, in a few seconds, the status of that name across up to sixty-two distinct sources. Two product modes are available to the user — a comprehensive Startup mode (full sixty-two checks) and a focused Baby mode (four checks: pronunciation, linguistic safety, Chaldean numerology, and social handle availability)."),

  h2("1.2  System pillars"),
  bullet("HTTPS REST API (FastAPI) for scan submission, account, billing, and PDF retrieval."),
  bullet("Real-time WebSocket channel (Socket.IO with Redis adapter) for streaming per-tile results back to the client as they arrive."),
  bullet("Asynchronous task queue (Redis-backed BullMQ) with priority lanes, retry policy, and per-source rate limiters."),
  bullet("Six independent scanner worker pools, each owning a specific class of external sources."),
  bullet("Two persistent data stores: PostgreSQL for users/scans/billing, and S3/R2 for generated PDF reports."),
  bullet("Three caching layers: in-memory LRU per worker, shared Redis cache (TTL-tuned per source), and CDN edge cache for static assets."),

  h2("1.3  Stack summary"),
  wideTable([2400, 6960], [
    new TableRow({ children: [headerCell("Concern", 2400), headerCell("Choice", 6960)] }),
    new TableRow({ children: [cell("Front-end", { width: 2400, bold: true, fill: BG2 }), cell("React 18 + Vite + Tailwind CSS; Socket.IO-client; Service Worker for PWA; deployed to Cloudflare Pages.", { width: 6960 })] }),
    new TableRow({ children: [cell("REST API", { width: 2400, bold: true, fill: BG2 }), cell("FastAPI on Python 3.12 with uvicorn-workers + gunicorn supervision. OpenAPI auto-generated.", { width: 6960 })] }),
    new TableRow({ children: [cell("WebSocket", { width: 2400, bold: true, fill: BG2 }), cell("Socket.IO 4 (Node.js 20) with @socket.io/redis-adapter for horizontal scaling across instances.", { width: 6960 })] }),
    new TableRow({ children: [cell("Task queue", { width: 2400, bold: true, fill: BG2 }), cell("BullMQ 5 (Node.js workers) on Redis 7 with priority lanes, exponential-backoff retries, and per-source token-bucket rate limiters.", { width: 6960 })] }),
    new TableRow({ children: [cell("Scanner workers", { width: 2400, bold: true, fill: BG2 }), cell("Mixed Python (Playwright-based scrapers) and Node.js (API-based connectors). Containerised with Docker; orchestrated by Kubernetes (EKS) or Hetzner Cloud (cheaper alternative).", { width: 6960 })] }),
    new TableRow({ children: [cell("Database", { width: 2400, bold: true, fill: BG2 }), cell("PostgreSQL 16 (managed: Neon or AWS RDS). Tables: users, scans, scan_results, billing_events, agency_leads.", { width: 6960 })] }),
    new TableRow({ children: [cell("Cache & pub/sub", { width: 2400, bold: true, fill: BG2 }), cell("Redis 7 (managed: Upstash or AWS ElastiCache). Used for cache, pub/sub, task queue.", { width: 6960 })] }),
    new TableRow({ children: [cell("Object storage", { width: 2400, bold: true, fill: BG2 }), cell("Cloudflare R2 (preferred — zero egress fees) or AWS S3 for PDF reports. Pre-signed URLs.", { width: 6960 })] }),
    new TableRow({ children: [cell("Authentication", { width: 2400, bold: true, fill: BG2 }), cell("Firebase Phone Auth (OTP) for free + retail tiers; bespoke JWT-on-top for agency API tier.", { width: 6960 })] }),
    new TableRow({ children: [cell("Payments", { width: 2400, bold: true, fill: BG2 }), cell("Razorpay (India) + Stripe (international); webhooks → billing_events table.", { width: 6960 })] }),
    new TableRow({ children: [cell("PDF generation", { width: 2400, bold: true, fill: BG2 }), cell("WeasyPrint (Python) for the corporate scan report; ReportLab for the baby keepsake (more typography control).", { width: 6960 })] }),
    new TableRow({ children: [cell("CAPTCHA solving", { width: 2400, bold: true, fill: BG2 }), cell("2Captcha (primary) + Anti-Captcha (failover) for deep-tier scans only.", { width: 6960 })] }),
    new TableRow({ children: [cell("Proxy network", { width: 2400, bold: true, fill: BG2 }), cell("Bright Data residential (premium sources) + Smartproxy (cost-effective for most). Rotating session-sticky.", { width: 6960 })] }),
    new TableRow({ children: [cell("Observability", { width: 2400, bold: true, fill: BG2 }), cell("Sentry (errors) + Grafana Loki (logs) + Prometheus (metrics) + Better Stack (uptime/alerts).", { width: 6960 })] }),
    new TableRow({ children: [cell("CI / CD", { width: 2400, bold: true, fill: BG2 }), cell("GitHub Actions → Docker registry → ArgoCD (k8s) or simpler GitHub-Actions-direct-deploy (Hetzner).", { width: 6960 })] }),
    new TableRow({ children: [cell("Infrastructure", { width: 2400, bold: true, fill: BG2 }), cell("Cloudflare for edge + DNS + R2 + Pages. Hetzner Cloud (Frankfurt + Singapore) for workers. AWS for managed PG/Redis.", { width: 6960 })] }),
  ]),

  pb(),
);

// ════════════════════════════════════════════════════════════════
// 2. ARCHITECTURE
// ════════════════════════════════════════════════════════════════
children.push(
  h1("2. Architecture"),

  h2("2.1  Layered system view"),
  ...diagram("05_api_architecture.png", 600, 415, "Figure 1", "Production system architecture — gateway, orchestrator, queue, scanner workers, data stores"),

  h2("2.2  WebSocket message lifecycle"),
  p("Figure 2 traces a single scan request through the system. The same lifecycle applies to both Startup and Baby modes; the only difference is the number of platform queries fanned out at the dispatch step."),
  ...diagram("06_websocket_sequence.png", 600, 392, "Figure 2", "Sequence diagram for one /v1/scan request"),

  h2("2.3  Original twelve-step pipeline (recap)"),
  p("For completeness, Figure 3 reproduces the original twelve-step name-to-verdict pipeline. This pipeline is the central business-logic IP and is shared across all modes."),
  ...diagram("02_pipeline.png", 600, 488, "Figure 3", "Twelve-step pipeline — copy reproduced from the Copyright Filing"),

  h2("2.4  Deployment topology"),
  p("Recommended primary topology for production:"),
  bullet("Cloudflare edge — DNS, WAF, DDoS, CDN, R2 (object storage), Pages (static front-end)."),
  bullet("Hetzner Cloud — six worker pools (one per scanner family) running on CCX21 instances (4 vCPU / 16 GB / dedicated CPU) in Frankfurt and Singapore for India-latency."),
  bullet("AWS Mumbai — managed PostgreSQL (RDS) and managed Redis (ElastiCache) for India data-residency posture."),
  bullet("API + WebSocket — three uvicorn pods + three Socket.IO pods, fronted by a Cloudflare Load Balancer. Each pod is stateless."),
  bullet("Total bare cost at launch traffic (~50,000 scans/month) is approximately ₹35,000–₹50,000/month of cloud spend. Scales linearly thereafter."),

  pb(),
);

// ════════════════════════════════════════════════════════════════
// 3. REST API CONTRACTS
// ════════════════════════════════════════════════════════════════
children.push(
  h1("3. REST API Contracts"),

  p("All endpoints are versioned under /v1. Base URL: https://api.naamdekho.in. All requests/responses are JSON over HTTPS. Errors follow RFC 7807 (Problem Details for HTTP APIs)."),

  h2("3.1  Authentication"),
  bullet("Free tier: no auth required for /v1/scan submissions."),
  bullet("Retail paid tier (₹49 deep, ₹29 keepsake, ₹99 shortlist): Firebase ID token in `Authorization: Bearer <token>` header."),
  bullet("Agency tier: long-lived JWT issued from the dashboard; per-organisation quota enforced server-side via Redis token-bucket."),

  h2("3.2  POST /v1/scan — start a new scan"),
  p("Request body (JSON):"),
  code(`{
  "name": "Vyana",
  "mode": "business" | "baby",
  "industry": "saas-tech",      // optional, sharpens TM class relevance
  "tier":    "free" | "deep" | "agency",
  "callback_url": "https://...", // optional, webhook on completion
  "options": {
    "include_pending": true,
    "skip_categories": ["fssai"]
  }
}`),
  p("Response (200 OK):"),
  code(`{
  "scan_id": "scn_01HXX...",
  "websocket_url": "wss://ws.naamdekho.in/v1/stream/scn_01HXX...",
  "eta_seconds": 4,
  "expires_at": "2026-05-14T10:30:00Z"
}`),
  p("Errors:"),
  bullet("400 — invalid name (empty, > 64 chars, contains forbidden tokens)."),
  bullet("401 — missing/invalid auth (for paid tiers)."),
  bullet("402 — payment required (agency over quota)."),
  bullet("429 — rate-limited (free tier — 60 scans / IP / hour)."),
  bullet("503 — orchestrator overloaded (retry with `Retry-After` header)."),

  h2("3.3  GET /v1/scans/{scan_id} — fetch consolidated result"),
  p("Returns the full scan envelope once the scan is complete. Suitable for non-streaming clients."),
  code(`{
  "scan_id": "scn_01HXX...",
  "name": "Vyana",
  "mode": "business",
  "status": "complete" | "running" | "failed",
  "verdict": {
    "score": 67,
    "clear":  42,
    "conflict": 13,
    "warn":   5,
    "pending": 2
  },
  "tiles": [
    { "tile_id": "mca",       "category": "legal",   "status": "ok",   "summary": "...", "detail": {...} },
    { "tile_id": "tm_class_35","category": "legal",  "status": "no",   "summary": "...", "detail": {...} },
    ...
  ],
  "started_at":  "2026-05-14T10:25:14Z",
  "completed_at":"2026-05-14T10:25:18Z"
}`),

  h2("3.4  GET /v1/scans/{scan_id}/pdf — fetch report"),
  p("Returns a 302 redirect to a pre-signed Cloudflare R2 URL valid for 15 minutes. Only available for deep, keepsake, shortlist, and agency tiers."),

  h2("3.5  POST /v1/agency-leads — submit agency interest"),
  p("Public endpoint. Body:"),
  code(`{
  "name": "Rohan Mehta",
  "role": "Founder",
  "company": "Naming House Pvt Ltd",
  "firm_type": "naming-agency",
  "email": "rohan@naminghouse.in",
  "phone": "+91 98765 43210",
  "expected_volume": "200-1000",
  "budget_range": "50000-200000",
  "notes": "..."
}`),
  p("Response: 201 Created. Writes to agency_leads table and triggers a Slack alert to #sales."),

  h2("3.6  POST /v1/auth/request-otp"),
  p("Body: `{ \"phone\": \"+919876543210\" }`. Triggers Firebase Phone Auth OTP. Response: 200 OK with `request_id`."),

  h2("3.7  POST /v1/auth/verify-otp"),
  p("Body: `{ \"request_id\": \"...\", \"code\": \"123456\" }`. Response 200 with `{ id_token, refresh_token, user }`."),

  h2("3.8  Other endpoints"),
  bullet("GET /v1/me — current user profile, scan history (paginated)."),
  bullet("POST /v1/billing/checkout — create Razorpay/Stripe payment intent."),
  bullet("POST /v1/billing/webhook — provider webhook receiver (signature-verified)."),
  bullet("GET /v1/openapi.json — auto-generated OpenAPI 3.1 spec."),
  bullet("GET /v1/healthz — liveness probe; GET /v1/readyz — readiness probe."),

  pb(),
);

// ════════════════════════════════════════════════════════════════
// 4. WEBSOCKET PROTOCOL
// ════════════════════════════════════════════════════════════════
children.push(
  h1("4. WebSocket Protocol"),

  p("The WebSocket channel is the primary mechanism by which scan results are delivered to the client. The protocol is Socket.IO v4 over WSS, with Redis adapter for multi-node fan-out."),

  h2("4.1  Connection"),
  p("Client connects to wss://ws.naamdekho.in/v1/stream/{scan_id}. The scan_id is bound to the channel — clients cannot subscribe to scan_ids they did not initiate (enforced server-side via JWT or anonymous IP-binding for free tier)."),

  h2("4.2  Server → Client events"),
  wideTable([2200, 7160], [
    new TableRow({ children: [headerCell("Event", 2200), headerCell("Payload", 7160)] }),
    new TableRow({ children: [cell("scan_started", { width: 2200, mono: true, bold: true }), cell("{ scan_id, total_tiles, eta_seconds } — sent immediately after connection.", { width: 7160 })] }),
    new TableRow({ children: [cell("result_event", { width: 2200, mono: true, bold: true }), cell("{ tile_id, category, status, summary, detail, latency_ms } — one event per platform tile, streamed as they complete.", { width: 7160 })] }),
    new TableRow({ children: [cell("progress", { width: 2200, mono: true, bold: true }), cell("{ completed, total } — periodic (every 500ms) for the progress bar.", { width: 7160 })] }),
    new TableRow({ children: [cell("hud_update", { width: 2200, mono: true, bold: true }), cell("{ verdict_score, clear, conflict, warn, pending } — sent on each result_event so the four-card HUD updates live.", { width: 7160 })] }),
    new TableRow({ children: [cell("verdict_complete", { width: 2200, mono: true, bold: true }), cell("{ scan_id, score, total_time_ms, pdf_url? } — sent when all tiles have completed.", { width: 7160 })] }),
    new TableRow({ children: [cell("tile_error", { width: 2200, mono: true, bold: true }), cell("{ tile_id, error_code, retry: bool } — sent when a tile fails. Client renders \"Checking...\" with a small warning glyph; not a fatal scan error.", { width: 7160 })] }),
    new TableRow({ children: [cell("scan_failed", { width: 2200, mono: true, bold: true }), cell("{ reason, retryable } — sent only on a fatal scan failure (orchestrator dead, queue overflow, etc.).", { width: 7160 })] }),
  ]),

  h2("4.3  Client → Server events"),
  bullet("subscribe — re-attach to an existing scan_id (used on reconnect)."),
  bullet("cancel — abort an in-flight scan."),
  bullet("ping — heartbeat (handled by Socket.IO transport)."),

  h2("4.4  Reconnection behaviour"),
  bullet("Client uses Socket.IO's built-in reconnect with exponential backoff (1s, 2s, 4s, max 30s)."),
  bullet("On reconnect, client emits `subscribe` with the scan_id; server replays any missed events from the Redis ring buffer (last 300 events / 5 minutes)."),

  h2("4.5  Backpressure & ordering"),
  bullet("Events are NOT guaranteed strictly ordered — tiles complete in independent threads. Each event carries a `tile_id` so client can render in the correct grid cell."),
  bullet("Server applies per-connection rate limiting at 200 events/second to protect slow clients."),
  bullet("Client should debounce HUD re-renders to 60fps (16ms)."),

  pb(),
);

// ════════════════════════════════════════════════════════════════
// 5. SCANNER MODULE SPECIFICATIONS
// ════════════════════════════════════════════════════════════════
children.push(
  h1("5. Scanner Module Specifications"),

  p("Six scanner module families. Each runs in its own worker pool, has its own connector dependencies, its own cache TTLs, and its own owning squad. The detailed connector knowledge base is in §7 below."),

  h2("5.1  Legal Scanner (11 + 1 fallback)"),
  bullet("Owned by: Legal-Data squad."),
  bullet("Connectors: MCA21, IP India, Copyright, GST, DPIIT, FSSAI, RBI, SEBI, IRDAI, Patent Office, State S&E, Trademarkia (fallback)."),
  bullet("Technology: Python 3.12 + Playwright (headful Chromium for sources with anti-bot). Per-source warmed-proxy sessions."),
  bullet("Worker pool size: 12 (scales to 30 under deep-tier load)."),
  bullet("Avg response time: 1.8–3.5s per source. Total Legal-scan time budget: 6s for free tier (parallel), 25s for deep tier (deeper crawling + class-wise TM)."),
  bullet("Cache TTL: 24h for register hits; 7d for misses (misses are sticky)."),
  bullet("CAPTCHA: 2Captcha for IP India, MCA on deep tier. Free tier skips CAPTCHA-gated deep checks."),

  h2("5.2  Domain Probe (10)"),
  bullet("Owned by: Infra squad."),
  bullet("Connectors: WHOIS (port 43), RDAP, GoDaddy API, Namecheap API, WhoisXML (fallback), Domainr, INRegistry, Cloudflare Registrar."),
  bullet("Technology: Node.js 20 (async whois client + axios for REST). No browser needed."),
  bullet("Worker pool size: 8."),
  bullet("Avg response time: 300–900ms."),
  bullet("Cache TTL: 5min for availability; 24h for pricing."),
  bullet("Cost: minimal — almost entirely free APIs and registrar partner programmes."),

  h2("5.3  Social Handle Bot (9)"),
  bullet("Owned by: Social-Integrations squad."),
  bullet("Connectors: Instagram (URL probe), X v2 API, YouTube Data API v3, LinkedIn (URL probe), Facebook (URL probe), Threads (URL probe), Telegram Bot API, WhatsApp Business directory, Pinterest API."),
  bullet("Technology: Node.js 20 + light Playwright when JS-rendered profile pages required."),
  bullet("Worker pool size: 10."),
  bullet("Avg response time: 400–1,200ms."),
  bullet("Cache TTL: 30min for availability (handles are reserved quickly so freshness matters)."),

  h2("5.4  Marketplace Crawler (7)"),
  bullet("Owned by: Infra squad."),
  bullet("Connectors: google-play-scraper (npm), iTunes Search API, Product Hunt v2 GraphQL, GitHub REST API, Shopify DNS probe, ScrapingBee (Amazon + Flipkart)."),
  bullet("Technology: Node.js 20 + Python."),
  bullet("Worker pool size: 8."),
  bullet("Avg response time: 600–2,200ms (Amazon scraping is the slowest)."),
  bullet("Cache TTL: 12h for app listings; 24h for sellers."),

  h2("5.5  Brand & SEO Engine (8)"),
  bullet("Owned by: Brand-Intel squad."),
  bullet("Connectors: Google CSE, SerpAPI (fallback), ScrapingBee (for hard pages), Bright Data (deep tier only), Wikipedia, Wikidata SPARQL, pytrends, Crunchbase Basic."),
  bullet("Technology: Python 3.12 (httpx + asyncio)."),
  bullet("Worker pool size: 6 (Google CSE quota-bound)."),
  bullet("Avg response time: 1,200–3,000ms."),
  bullet("Cache TTL: 6h for SERP; 24h for Wikipedia."),

  h2("5.6  Linguistic + Numerology Engine (7)"),
  bullet("Owned by: NLP squad."),
  bullet("Connectors: Bhashini (Govt of India), Indic NLP Library, Aksharamukha, Google Translate (fallback), ICU4J, custom Chaldean engine."),
  bullet("Technology: Python 3.12, mostly local computation."),
  bullet("Worker pool size: 4."),
  bullet("Avg response time: 100–400ms (the fastest scanner)."),
  bullet("Cache TTL: permanent (deterministic given fixed input). Stored keyed by SHA-256 of normalised input."),

  pb(),
);

// ════════════════════════════════════════════════════════════════
// 6. DATA MODELS
// ════════════════════════════════════════════════════════════════
children.push(
  h1("6. Data Models"),

  h2("6.1  PostgreSQL schema (core tables)"),

  code(`-- users
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone           TEXT UNIQUE,
  email           TEXT UNIQUE,
  display_name    TEXT,
  tier            TEXT NOT NULL CHECK (tier IN ('free','retail','founder-pro','agency')),
  agency_org_id   UUID REFERENCES agencies(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at   TIMESTAMPTZ
);

-- scans
CREATE TABLE scans (
  id              TEXT PRIMARY KEY,      -- ULID, prefixed "scn_"
  user_id         UUID REFERENCES users(id),
  anonymous_ip    INET,                  -- for free tier
  name            TEXT NOT NULL,
  name_normalised TEXT NOT NULL,
  mode            TEXT NOT NULL CHECK (mode IN ('business','baby')),
  industry        TEXT,
  tier            TEXT NOT NULL,
  status          TEXT NOT NULL,
  verdict_score   INT,
  total_tiles     INT NOT NULL,
  clear_count     INT,
  conflict_count  INT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  pdf_object_key  TEXT
);
CREATE INDEX idx_scans_user ON scans(user_id, started_at DESC);

-- per-tile results
CREATE TABLE scan_results (
  scan_id         TEXT REFERENCES scans(id) ON DELETE CASCADE,
  tile_id         TEXT NOT NULL,
  category        TEXT NOT NULL,
  status          TEXT NOT NULL,      -- ok|no|warn|pending|error
  summary         TEXT,
  detail          JSONB NOT NULL,
  latency_ms      INT,
  PRIMARY KEY (scan_id, tile_id)
);

-- billing events
CREATE TABLE billing_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id),
  provider        TEXT NOT NULL,       -- razorpay|stripe
  intent_id       TEXT NOT NULL,
  amount_paise    BIGINT NOT NULL,
  currency        TEXT NOT NULL,
  status          TEXT NOT NULL,
  scan_id         TEXT REFERENCES scans(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_payload     JSONB
);

-- agency leads
CREATE TABLE agency_leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  role            TEXT,
  company         TEXT NOT NULL,
  firm_type       TEXT,
  email           TEXT NOT NULL,
  phone           TEXT NOT NULL,
  expected_volume TEXT,
  budget_range    TEXT,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'new',
  assigned_to     UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);`),

  h2("6.2  Redis key namespaces"),
  bullet("`cache:source:{source_id}:{name_hash}` — per-source result cache (TTL varies by source, see §7)."),
  bullet("`queue:scan` — BullMQ primary task queue."),
  bullet("`queue:scan:deep` — BullMQ priority queue for paid deep scans."),
  bullet("`ratelimit:src:{source_id}` — token-bucket counter."),
  bullet("`ws:scan:{scan_id}` — ring buffer of last 300 WS events for reconnect replay."),
  bullet("`auth:otp:{phone}` — OTP attempt counter (TTL 10min, max 5 attempts)."),

  pb(),
);

// ════════════════════════════════════════════════════════════════
// 7. CONNECTOR KNOWLEDGE BASE (inline + xlsx ref)
// ════════════════════════════════════════════════════════════════
children.push(
  h1("7. Connector Knowledge Base"),

  rich([
    "This section is the single source of truth for every external connector. The same data is delivered as a fully formatted, sortable, filter-friendly workbook at ",
    { text: "Naam_Dekho_Connector_Catalog.xlsx", font: MONO, bold: true, color: ACCENT },
    " (three sheets: Connector Catalog · Scanner Modules · Cost Model — the cost model has live formulas)."
  ]),

  p("The catalogue below is grouped by scanner family. Connectors marked \"Free\" require no payment but may require account creation; connectors marked with a price are pay-as-you-go or subscription."),

  // ── Legal connectors ──
  h2("7.1  Legal & Regulatory"),
  wideTable([2200, 2400, 1900, 1500, 1360], [
    new TableRow({ children: [headerCell("Connector", 2200), headerCell("URL", 2400), headerCell("Free / Paid", 1900), headerCell("Auth", 1500), headerCell("Notes", 1360)] }),
    new TableRow({ children: [cell("MCA21", { width: 2200, bold: true }), cell("mca.gov.in", { width: 2400, mono: true }), cell("Free (manual / scraping)", { width: 1900, fill: SOFT_GREEN }), cell("Session + CAPTCHA", { width: 1500 }), cell("Use Playwright", { width: 1360 })] }),
    new TableRow({ children: [cell("IP India TM", { width: 2200, bold: true }), cell("ipindiaonline.gov.in", { width: 2400, mono: true }), cell("Free (scraping)", { width: 1900, fill: SOFT_GREEN }), cell("Session + CAPTCHA", { width: 1500 }), cell("All 45 classes", { width: 1360 })] }),
    new TableRow({ children: [cell("Copyright Office", { width: 2200, bold: true }), cell("copyright.gov.in", { width: 2400, mono: true }), cell("Free", { width: 1900, fill: SOFT_GREEN }), cell("Session", { width: 1500 }), cell("Cache 7d", { width: 1360 })] }),
    new TableRow({ children: [cell("GST trade name", { width: 2200, bold: true }), cell("gst.gov.in/services/searchtp", { width: 2400, mono: true }), cell("Free", { width: 1900, fill: SOFT_GREEN }), cell("Session", { width: 1500 }), cell("Per-state loop", { width: 1360 })] }),
    new TableRow({ children: [cell("DPIIT Startup India", { width: 2200, bold: true }), cell("startupindia.gov.in", { width: 2400, mono: true }), cell("Free", { width: 1900, fill: SOFT_GREEN }), cell("None", { width: 1500 }), cell("JSON XHR", { width: 1360 })] }),
    new TableRow({ children: [cell("FSSAI", { width: 2200, bold: true }), cell("foscos.fssai.gov.in", { width: 2400, mono: true }), cell("Free", { width: 1900, fill: SOFT_GREEN }), cell("Session", { width: 1500 }), cell("F&B clients", { width: 1360 })] }),
    new TableRow({ children: [cell("RBI banks/NBFCs", { width: 2200, bold: true }), cell("rbi.org.in", { width: 2400, mono: true }), cell("Free (CSV)", { width: 1900, fill: SOFT_GREEN }), cell("None", { width: 1500 }), cell("Daily refresh", { width: 1360 })] }),
    new TableRow({ children: [cell("SEBI intermediaries", { width: 2200, bold: true }), cell("sebi.gov.in", { width: 2400, mono: true }), cell("Free (CSV)", { width: 1900, fill: SOFT_GREEN }), cell("None", { width: 1500 }), cell("Weekly refresh", { width: 1360 })] }),
    new TableRow({ children: [cell("IRDAI", { width: 2200, bold: true }), cell("irdai.gov.in", { width: 2400, mono: true }), cell("Free", { width: 1900, fill: SOFT_GREEN }), cell("None", { width: 1500 }), cell("Insurance only", { width: 1360 })] }),
    new TableRow({ children: [cell("Patent Office", { width: 2200, bold: true }), cell("search.ipindia.gov.in", { width: 2400, mono: true }), cell("Free", { width: 1900, fill: SOFT_GREEN }), cell("Session + CAPTCHA", { width: 1500 }), cell("Prior-use proof", { width: 1360 })] }),
    new TableRow({ children: [cell("Trademarkia (fallback)", { width: 2200, bold: true }), cell("trademarkia.com/api", { width: 2400, mono: true }), cell("Paid — USD 99/mo", { width: 1900, fill: SOFT_YELLOW }), cell("API key", { width: 1500 }), cell("Backup only", { width: 1360 })] }),
  ]),

  // ── Domains ──
  h2("7.2  Domains"),
  wideTable([2200, 2400, 1900, 1500, 1360], [
    new TableRow({ children: [headerCell("Connector", 2200), headerCell("URL", 2400), headerCell("Free / Paid", 1900), headerCell("Auth", 1500), headerCell("Notes", 1360)] }),
    new TableRow({ children: [cell("WHOIS (raw)", { width: 2200, bold: true }), cell("whois.iana.org", { width: 2400, mono: true }), cell("Free", { width: 1900, fill: SOFT_GREEN }), cell("None", { width: 1500 }), cell("Port 43", { width: 1360 })] }),
    new TableRow({ children: [cell("RDAP", { width: 2200, bold: true }), cell("rdap.org", { width: 2400, mono: true }), cell("Free", { width: 1900, fill: SOFT_GREEN }), cell("None", { width: 1500 }), cell("JSON / modern", { width: 1360 })] }),
    new TableRow({ children: [cell("GoDaddy", { width: 2200, bold: true }), cell("developer.godaddy.com", { width: 2400, mono: true }), cell("Free dev / affiliate", { width: 1900, fill: SOFT_GREEN }), cell("Key + secret", { width: 1500 }), cell("Revenue share", { width: 1360 })] }),
    new TableRow({ children: [cell("Namecheap", { width: 2200, bold: true }), cell("namecheap.com/support/api", { width: 2400, mono: true }), cell("Free w/ $50 balance", { width: 1900, fill: SOFT_GREEN }), cell("Key + IP whitelist", { width: 1500 }), cell("Cheap TLDs", { width: 1360 })] }),
    new TableRow({ children: [cell("WhoisXML", { width: 2200, bold: true }), cell("whoisxmlapi.com", { width: 2400, mono: true }), cell("500/mo free; USD 19+/mo", { width: 1900, fill: SOFT_YELLOW }), cell("API key", { width: 1500 }), cell("Bulk WHOIS", { width: 1360 })] }),
    new TableRow({ children: [cell("Domainr", { width: 2200, bold: true }), cell("domainr.com/docs/api", { width: 2400, mono: true }), cell("Paid — USD 25/mo from 10k", { width: 1900, fill: SOFT_YELLOW }), cell("RapidAPI key", { width: 1500 }), cell("Best UX", { width: 1360 })] }),
    new TableRow({ children: [cell("INRegistry", { width: 2200, bold: true }), cell("registry.in", { width: 2400, mono: true }), cell("Free WHOIS", { width: 1900, fill: SOFT_GREEN }), cell("None", { width: 1500 }), cell(".in / .co.in", { width: 1360 })] }),
    new TableRow({ children: [cell("Cloudflare Registrar", { width: 2200, bold: true }), cell("api.cloudflare.com", { width: 2400, mono: true }), cell("Free (at-cost domains)", { width: 1900, fill: SOFT_GREEN }), cell("API token", { width: 1500 }), cell("Limited TLDs", { width: 1360 })] }),
  ]),

  // ── Social ──
  h2("7.3  Social Handles"),
  wideTable([2200, 2400, 1900, 1500, 1360], [
    new TableRow({ children: [headerCell("Connector", 2200), headerCell("URL", 2400), headerCell("Free / Paid", 1900), headerCell("Auth", 1500), headerCell("Notes", 1360)] }),
    new TableRow({ children: [cell("Instagram Graph", { width: 2200, bold: true }), cell("developers.facebook.com/docs/instagram-api", { width: 2400, mono: true }), cell("Free w/ Meta dev", { width: 1900, fill: SOFT_GREEN }), cell("OAuth 2.0", { width: 1500 }), cell("Public probe better", { width: 1360 })] }),
    new TableRow({ children: [cell("X (Twitter)", { width: 2200, bold: true }), cell("developer.x.com", { width: 2400, mono: true }), cell("Paid — USD 200/mo Basic", { width: 1900, fill: SOFT_YELLOW }), cell("OAuth 2.0", { width: 1500 }), cell("Free tier 1500/mo only", { width: 1360 })] }),
    new TableRow({ children: [cell("YouTube Data v3", { width: 2200, bold: true }), cell("developers.google.com/youtube/v3", { width: 2400, mono: true }), cell("Free (10k units/day)", { width: 1900, fill: SOFT_GREEN }), cell("API key", { width: 1500 }), cell("Cache aggressively", { width: 1360 })] }),
    new TableRow({ children: [cell("LinkedIn", { width: 2200, bold: true }), cell("developer.linkedin.com", { width: 2400, mono: true }), cell("Restricted partner", { width: 1900, fill: SOFT_YELLOW }), cell("OAuth 2.0", { width: 1500 }), cell("Use URL probe", { width: 1360 })] }),
    new TableRow({ children: [cell("Facebook Graph", { width: 2200, bold: true }), cell("developers.facebook.com", { width: 2400, mono: true }), cell("Free w/ Meta dev", { width: 1900, fill: SOFT_GREEN }), cell("OAuth 2.0", { width: 1500 }), cell("URL probe primary", { width: 1360 })] }),
    new TableRow({ children: [cell("Threads", { width: 2200, bold: true }), cell("developers.facebook.com/docs/threads", { width: 2400, mono: true }), cell("Free preview", { width: 1900, fill: SOFT_GREEN }), cell("OAuth 2.0", { width: 1500 }), cell("URL probe fallback", { width: 1360 })] }),
    new TableRow({ children: [cell("Telegram Bot API", { width: 2200, bold: true }), cell("core.telegram.org/bots/api", { width: 2400, mono: true }), cell("Free", { width: 1900, fill: SOFT_GREEN }), cell("Bot token", { width: 1500 }), cell("getChat method", { width: 1360 })] }),
    new TableRow({ children: [cell("WhatsApp Business", { width: 2200, bold: true }), cell("business.whatsapp.com", { width: 2400, mono: true }), cell("Paid per conversation", { width: 1900, fill: SOFT_YELLOW }), cell("OAuth + verify", { width: 1500 }), cell("Display-name check", { width: 1360 })] }),
    new TableRow({ children: [cell("Pinterest", { width: 2200, bold: true }), cell("developers.pinterest.com", { width: 2400, mono: true }), cell("Free", { width: 1900, fill: SOFT_GREEN }), cell("OAuth 2.0", { width: 1500 }), cell("Business profile slug", { width: 1360 })] }),
  ]),

  // ── Marketplaces ──
  h2("7.4  Marketplaces & Stores"),
  wideTable([2200, 2400, 1900, 1500, 1360], [
    new TableRow({ children: [headerCell("Connector", 2200), headerCell("URL", 2400), headerCell("Free / Paid", 1900), headerCell("Auth", 1500), headerCell("Notes", 1360)] }),
    new TableRow({ children: [cell("google-play-scraper", { width: 2200, bold: true }), cell("github.com/facundoolano/google-play-scraper", { width: 2400, mono: true }), cell("Free OSS", { width: 1900, fill: SOFT_GREEN }), cell("None", { width: 1500 }), cell("npm package", { width: 1360 })] }),
    new TableRow({ children: [cell("iTunes Search", { width: 2200, bold: true }), cell("itunes.apple.com/search", { width: 2400, mono: true }), cell("Free", { width: 1900, fill: SOFT_GREEN }), cell("None", { width: 1500 }), cell("Public endpoint", { width: 1360 })] }),
    new TableRow({ children: [cell("Product Hunt v2", { width: 2200, bold: true }), cell("api.producthunt.com/v2", { width: 2400, mono: true }), cell("Free w/ OAuth", { width: 1900, fill: SOFT_GREEN }), cell("OAuth 2.0", { width: 1500 }), cell("GraphQL", { width: 1360 })] }),
    new TableRow({ children: [cell("GitHub REST", { width: 2200, bold: true }), cell("docs.github.com/en/rest", { width: 2400, mono: true }), cell("Free (5k/hr auth)", { width: 1900, fill: SOFT_GREEN }), cell("PAT", { width: 1500 }), cell("GET /users/<name>", { width: 1360 })] }),
    new TableRow({ children: [cell("Shopify probe", { width: 2200, bold: true }), cell("shopify.dev/api", { width: 2400, mono: true }), cell("Free (DNS)", { width: 1900, fill: SOFT_GREEN }), cell("None", { width: 1500 }), cell("DNS resolve", { width: 1360 })] }),
    new TableRow({ children: [cell("Amazon (3rd-party)", { width: 2200, bold: true }), cell("scrapingbee.com", { width: 2400, mono: true }), cell("Paid — USD 49+/mo", { width: 1900, fill: SOFT_YELLOW }), cell("Provider key", { width: 1500 }), cell("Heavy bot detect", { width: 1360 })] }),
    new TableRow({ children: [cell("Flipkart (3rd-party)", { width: 2200, bold: true }), cell("brightdata.com", { width: 2400, mono: true }), cell("Paid — USD 500+/mo", { width: 1900, fill: SOFT_YELLOW }), cell("Provider key", { width: 1500 }), cell("Residential proxies", { width: 1360 })] }),
  ]),

  // ── Brand & SEO ──
  h2("7.5  Brand Collision & SEO"),
  wideTable([2200, 2400, 1900, 1500, 1360], [
    new TableRow({ children: [headerCell("Connector", 2200), headerCell("URL", 2400), headerCell("Free / Paid", 1900), headerCell("Auth", 1500), headerCell("Notes", 1360)] }),
    new TableRow({ children: [cell("Google CSE", { width: 2200, bold: true }), cell("developers.google.com/custom-search", { width: 2400, mono: true }), cell("100/day free", { width: 1900, fill: SOFT_GREEN }), cell("API key + CX", { width: 1500 }), cell("Filter gl=in", { width: 1360 })] }),
    new TableRow({ children: [cell("SerpAPI", { width: 2200, bold: true }), cell("serpapi.com", { width: 2400, mono: true }), cell("Paid — USD 50/mo from 5k", { width: 1900, fill: SOFT_YELLOW }), cell("API key", { width: 1500 }), cell("Full SERP", { width: 1360 })] }),
    new TableRow({ children: [cell("ScrapingBee", { width: 2200, bold: true }), cell("scrapingbee.com", { width: 2400, mono: true }), cell("1k free credits; USD 49+/mo", { width: 1900, fill: SOFT_YELLOW }), cell("API key", { width: 1500 }), cell("Dynamic pages", { width: 1360 })] }),
    new TableRow({ children: [cell("Bright Data", { width: 2200, bold: true }), cell("brightdata.com", { width: 2400, mono: true }), cell("Paid — USD 500+/mo", { width: 1900, fill: SOFT_YELLOW }), cell("Account + zone", { width: 1500 }), cell("Residential", { width: 1360 })] }),
    new TableRow({ children: [cell("Wikipedia API", { width: 2200, bold: true }), cell("en.wikipedia.org/w/api.php", { width: 2400, mono: true }), cell("Free", { width: 1900, fill: SOFT_GREEN }), cell("None", { width: 1500 }), cell("Concept-page check", { width: 1360 })] }),
    new TableRow({ children: [cell("Wikidata SPARQL", { width: 2200, bold: true }), cell("query.wikidata.org/sparql", { width: 2400, mono: true }), cell("Free", { width: 1900, fill: SOFT_GREEN }), cell("None", { width: 1500 }), cell("Disambiguation", { width: 1360 })] }),
    new TableRow({ children: [cell("pytrends", { width: 2200, bold: true }), cell("github.com/GeneralMills/pytrends", { width: 2400, mono: true }), cell("Free OSS", { width: 1900, fill: SOFT_GREEN }), cell("None", { width: 1500 }), cell("Unofficial — risky", { width: 1360 })] }),
    new TableRow({ children: [cell("Crunchbase Basic", { width: 2200, bold: true }), cell("data.crunchbase.com", { width: 2400, mono: true }), cell("Paid — USD 49+/mo", { width: 1900, fill: SOFT_YELLOW }), cell("API key", { width: 1500 }), cell("Funded startups", { width: 1360 })] }),
  ]),

  // ── Linguistic ──
  h2("7.6  Linguistic, Transliteration & Numerology"),
  wideTable([2200, 2400, 1900, 1500, 1360], [
    new TableRow({ children: [headerCell("Connector", 2200), headerCell("URL", 2400), headerCell("Free / Paid", 1900), headerCell("Auth", 1500), headerCell("Notes", 1360)] }),
    new TableRow({ children: [cell("Bhashini (Govt)", { width: 2200, bold: true }), cell("bhashini.gov.in/ulca", { width: 2400, mono: true }), cell("Free (registered)", { width: 1900, fill: SOFT_GREEN }), cell("Account token", { width: 1500 }), cell("22 languages", { width: 1360 })] }),
    new TableRow({ children: [cell("Indic NLP Library", { width: 2200, bold: true }), cell("github.com/anoopkunchukuttan/indic_nlp_library", { width: 2400, mono: true }), cell("Free OSS", { width: 1900, fill: SOFT_GREEN }), cell("None", { width: 1500 }), cell("Self-host", { width: 1360 })] }),
    new TableRow({ children: [cell("Aksharamukha", { width: 2200, bold: true }), cell("aksharamukha.appspot.com", { width: 2400, mono: true }), cell("Free", { width: 1900, fill: SOFT_GREEN }), cell("None", { width: 1500 }), cell("ISO 15919", { width: 1360 })] }),
    new TableRow({ children: [cell("Google Translate", { width: 2200, bold: true }), cell("cloud.google.com/translate", { width: 2400, mono: true }), cell("500k chars/mo free", { width: 1900, fill: SOFT_GREEN }), cell("API key + GCP", { width: 1500 }), cell("Fallback only", { width: 1360 })] }),
    new TableRow({ children: [cell("ICU4J / PyICU", { width: 2200, bold: true }), cell("icu.unicode.org", { width: 2400, mono: true }), cell("Free OSS", { width: 1900, fill: SOFT_GREEN }), cell("None", { width: 1500 }), cell("Unicode normalisation", { width: 1360 })] }),
    new TableRow({ children: [cell("Chaldean engine", { width: 2200, bold: true }), cell("internal://numerology", { width: 2400, mono: true }), cell("Proprietary", { width: 1900, fill: SOFT_PINK }), cell("None", { width: 1500 }), cell("Pure Python", { width: 1360 })] }),
  ]),

  // ── Infra ──
  h2("7.7  Infrastructure — CAPTCHA · proxies · queues · real-time"),
  wideTable([2200, 2400, 1900, 1500, 1360], [
    new TableRow({ children: [headerCell("Connector", 2200), headerCell("URL", 2400), headerCell("Free / Paid", 1900), headerCell("Auth", 1500), headerCell("Notes", 1360)] }),
    new TableRow({ children: [cell("2Captcha", { width: 2200, bold: true }), cell("2captcha.com", { width: 2400, mono: true }), cell("USD 2.99/1k", { width: 1900, fill: SOFT_YELLOW }), cell("API key", { width: 1500 }), cell("Deep tier only", { width: 1360 })] }),
    new TableRow({ children: [cell("Anti-Captcha", { width: 2200, bold: true }), cell("anti-captcha.com", { width: 2400, mono: true }), cell("USD 2.00/1k", { width: 1900, fill: SOFT_YELLOW }), cell("API key", { width: 1500 }), cell("Failover", { width: 1360 })] }),
    new TableRow({ children: [cell("CapMonster Cloud", { width: 2200, bold: true }), cell("capmonster.cloud", { width: 2400, mono: true }), cell("USD 0.50–1.50/1k", { width: 1900, fill: SOFT_YELLOW }), cell("API key", { width: 1500 }), cell("Cheapest", { width: 1360 })] }),
    new TableRow({ children: [cell("Bright Data proxies", { width: 2200, bold: true }), cell("brightdata.com", { width: 2400, mono: true }), cell("USD 15.75/GB", { width: 1900, fill: SOFT_YELLOW }), cell("Zone token", { width: 1500 }), cell("Hardest sources", { width: 1360 })] }),
    new TableRow({ children: [cell("Smartproxy", { width: 2200, bold: true }), cell("smartproxy.com", { width: 2400, mono: true }), cell("USD 7/GB starter", { width: 1900, fill: SOFT_YELLOW }), cell("IP whitelist", { width: 1500 }), cell("Cheaper residential", { width: 1360 })] }),
    new TableRow({ children: [cell("Redis", { width: 2200, bold: true }), cell("redis.io / upstash.com", { width: 2400, mono: true }), cell("Free OSS / USD 7+/mo managed", { width: 1900, fill: SOFT_GREEN }), cell("Self-host", { width: 1500 }), cell("Core dependency", { width: 1360 })] }),
    new TableRow({ children: [cell("BullMQ", { width: 2200, bold: true }), cell("docs.bullmq.io", { width: 2400, mono: true }), cell("Free OSS", { width: 1900, fill: SOFT_GREEN }), cell("Same as Redis", { width: 1500 }), cell("Job queue", { width: 1360 })] }),
    new TableRow({ children: [cell("Socket.IO", { width: 2200, bold: true }), cell("socket.io", { width: 2400, mono: true }), cell("Free OSS", { width: 1900, fill: SOFT_GREEN }), cell("Token / session", { width: 1500 }), cell("Self-host", { width: 1360 })] }),
    new TableRow({ children: [cell("Pusher Channels", { width: 2200, bold: true }), cell("pusher.com/channels", { width: 2400, mono: true }), cell("200k/day free; USD 49+/mo", { width: 1900, fill: SOFT_GREEN }), cell("App key + secret", { width: 1500 }), cell("Managed alt", { width: 1360 })] }),
    new TableRow({ children: [cell("AWS WS API Gateway", { width: 2200, bold: true }), cell("aws.amazon.com/api-gateway", { width: 2400, mono: true }), cell("USD 1/1M msgs", { width: 1900, fill: SOFT_YELLOW }), cell("IAM", { width: 1500 }), cell("Scale-cheap", { width: 1360 })] }),
    new TableRow({ children: [cell("Cloudflare R2", { width: 2200, bold: true }), cell("cloudflare.com/products/r2", { width: 2400, mono: true }), cell("10GB free; USD 0.015/GB", { width: 1900, fill: SOFT_GREEN }), cell("API token", { width: 1500 }), cell("Zero egress", { width: 1360 })] }),
    new TableRow({ children: [cell("AWS S3", { width: 2200, bold: true }), cell("aws.amazon.com/s3", { width: 2400, mono: true }), cell("Free 5GB/12mo; USD 0.023/GB", { width: 1900, fill: SOFT_GREEN }), cell("IAM", { width: 1500 }), cell("Pre-signed URLs", { width: 1360 })] }),
  ]),

  // ── Auth & Payments ──
  h2("7.8  Authentication & Payments"),
  wideTable([2200, 2400, 1900, 1500, 1360], [
    new TableRow({ children: [headerCell("Connector", 2200), headerCell("URL", 2400), headerCell("Free / Paid", 1900), headerCell("Auth", 1500), headerCell("Notes", 1360)] }),
    new TableRow({ children: [cell("Firebase Phone Auth", { width: 2200, bold: true }), cell("firebase.google.com/docs/auth/web/phone-auth", { width: 2400, mono: true }), cell("Free 10k/mo; USD 0.01–0.06/SMS", { width: 1900, fill: SOFT_GREEN }), cell("Firebase config", { width: 1500 }), cell("Global OTP", { width: 1360 })] }),
    new TableRow({ children: [cell("MSG91 (India SMS)", { width: 2200, bold: true }), cell("msg91.com", { width: 2400, mono: true }), cell("100 trial; ₹0.18–0.25/SMS", { width: 1900, fill: SOFT_YELLOW }), cell("Auth key", { width: 1500 }), cell("DLT-registered", { width: 1360 })] }),
    new TableRow({ children: [cell("WhatsApp Business OTP", { width: 2200, bold: true }), cell("developers.facebook.com/docs/whatsapp", { width: 2400, mono: true }), cell("Free dev; ₹0.30–0.80/msg", { width: 1900, fill: SOFT_YELLOW }), cell("Meta business", { width: 1500 }), cell("Preferred in India", { width: 1360 })] }),
    new TableRow({ children: [cell("Razorpay", { width: 2200, bold: true }), cell("razorpay.com/docs", { width: 2400, mono: true }), cell("2% / UPI 0%", { width: 1900, fill: SOFT_YELLOW }), cell("Key + secret", { width: 1500 }), cell("India primary", { width: 1360 })] }),
    new TableRow({ children: [cell("Stripe", { width: 2200, bold: true }), cell("stripe.com/docs", { width: 2400, mono: true }), cell("2.9% + ₹3", { width: 1900, fill: SOFT_YELLOW }), cell("Key + webhook secret", { width: 1500 }), cell("International", { width: 1360 })] }),
    new TableRow({ children: [cell("ClearTax e-invoice", { width: 2200, bold: true }), cell("cleartax.in", { width: 2400, mono: true }), cell("₹0.50–2.00/invoice", { width: 1900, fill: SOFT_YELLOW }), cell("API key", { width: 1500 }), cell("GST automation", { width: 1360 })] }),
  ]),

  pb(),
);

// ════════════════════════════════════════════════════════════════
// 8. RATE LIMITING, RESILIENCE, OBSERVABILITY
// ════════════════════════════════════════════════════════════════
children.push(
  h1("8. Rate Limiting, Resilience, Observability"),

  h2("8.1  Rate-limit strategy"),
  bullet("Per-source token-bucket in Redis. Refill rate calibrated to each source's documented limits (see §7 column \"Rate Limit\")."),
  bullet("Per-IP scan limit for free tier: 60 scans / hour. Returns 429 with `Retry-After`."),
  bullet("Per-user scan limit for retail: 5 deep scans / day (anti-abuse)."),
  bullet("Per-agency-org quota: configured per contract, enforced at JWT validation."),

  h2("8.2  Retry policy"),
  bullet("Each scanner job retries up to 3 times with exponential backoff (1s, 4s, 16s)."),
  bullet("On final failure, tile_id is emitted with `status: \"error\"` and the verdict aggregator ignores it (does not score it as pass or fail)."),
  bullet("CAPTCHA failures trigger an automatic failover to the secondary solver."),

  h2("8.3  Circuit breakers"),
  bullet("Each connector has a circuit breaker: 5 consecutive errors → open state for 60 seconds, during which the tile returns \"Checking…\" and never emits result."),
  bullet("Breaker state surfaces on /v1/healthz as a JSON object listing open circuits."),

  h2("8.4  Observability"),
  bullet("Sentry for errors. Tag every event with `scan_id`, `tile_id`, `source_id`."),
  bullet("Grafana Loki for logs. JSON structured logs with consistent field names."),
  bullet("Prometheus for metrics. Key SLIs: scan_p50_latency, scan_p95_latency, source_error_rate, queue_depth, captcha_solve_rate."),
  bullet("Better Stack for synthetic uptime probes against /v1/healthz from 5 regions."),

  h2("8.5  Alerting"),
  bullet("P0 — scan_failed rate > 1% over 5min → PagerDuty."),
  bullet("P1 — any source error_rate > 30% over 15min → Slack #ops-alerts."),
  bullet("P2 — queue depth > 5000 over 10min → Slack #ops-alerts."),
  bullet("P3 — daily summary email with top 10 noisy sources."),

  pb(),
);

// ════════════════════════════════════════════════════════════════
// 9. SECURITY & COMPLIANCE
// ════════════════════════════════════════════════════════════════
children.push(
  h1("9. Security & Compliance"),

  h2("9.1  Data classification"),
  bullet("Public — anonymous scan inputs, public-register lookups (cached freely)."),
  bullet("Confidential — phone, email, account history (encrypted at rest, AES-256)."),
  bullet("Highly Confidential — payment tokens (never stored; provider tokenises)."),

  h2("9.2  DPDP Act compliance (Digital Personal Data Protection Act, 2023)"),
  bullet("Lawful purpose, consent, purpose-limitation, storage-limitation, security-safeguard obligations honoured."),
  bullet("Section 5 notice and privacy policy published; consent captured on sign-up."),
  bullet("Data Principal rights — access, correction, erasure, grievance redressal — implemented in account UI."),
  bullet("DPO/grievance officer contact published in /privacy."),
  bullet("Free tier collects only anonymous IP + name string; not personal data within the Section."),

  h2("9.3  IT Act, 2000 — Section 65"),
  p("Source code repositories are private (GitHub) with branch protections, signed commits, and audit logs. Source code is retained as long as the work is in service plus 3 years."),

  h2("9.4  Scraping ethics"),
  bullet("Strict robots.txt observance for sources whose ToS prohibit automated access (we do NOT scrape them; we link the user out)."),
  bullet("Rate limits respected per source documentation."),
  bullet("No login bypass, no CAPTCHA bypass against sources that disallow it."),
  bullet("CAPTCHA solving used only against Government registers (MCA, IP India, Copyright) where Section 399 of the Companies Act, public register access under Trade Marks Act and Copyright Act expressly contemplate public read access."),

  h2("9.5  Transport & storage"),
  bullet("TLS 1.3 across the board. HSTS, CSP, X-Frame-Options on all responses."),
  bullet("PostgreSQL — at-rest AES-256 via cloud provider; row-level encryption for phone/email columns via pgcrypto."),
  bullet("R2/S3 — server-side encryption with provider-managed keys."),
  bullet("Redis — TLS-only, password-auth, ACLs per service."),

  h2("9.6  Vulnerability management"),
  bullet("GitHub Dependabot + Snyk scanning on every PR."),
  bullet("Quarterly penetration test (third-party)."),
  bullet("Bug bounty programme (hosted on Bugcrowd) — to be opened post-launch."),

  pb(),
);

// ════════════════════════════════════════════════════════════════
// 10. DEPLOYMENT & RUNBOOK
// ════════════════════════════════════════════════════════════════
children.push(
  h1("10. Deployment, CI/CD & Runbook"),

  h2("10.1  Environments"),
  bullet("development — local Docker Compose. All services + a mock orchestrator."),
  bullet("staging — Hetzner CCX11 single-node Kubernetes (k3s). Deployed on every merge to `main`."),
  bullet("production — multi-zone deployment as in §2.4. Deployed via ArgoCD on manual tag promotion."),

  h2("10.2  CI/CD pipeline"),
  bullet("GitHub Actions runs: lint, unit tests, integration tests, type-check, build Docker images, push to registry."),
  bullet("ArgoCD picks up tagged images and syncs to k8s manifests."),
  bullet("Database migrations via Alembic (Python) / Prisma (Node) — run in pre-deploy hook with idempotency guard."),

  h2("10.3  On-call runbook"),
  bullet("Primary on-call rotation: weekly, Mon-Sun."),
  bullet("Secondary: same week, escalation after 15min."),
  bullet("Common incidents — runbook entries: (a) MCA portal down, (b) Captcha provider quota exceeded, (c) Queue depth runaway, (d) WS server pod restarts, (e) Cloudflare edge incident."),

  pb(),
);

// ════════════════════════════════════════════════════════════════
// 11. CODE EXAMPLES
// ════════════════════════════════════════════════════════════════
children.push(
  h1("11. Code Examples (selected)"),

  h2("11.1  Submitting a scan (front-end, TypeScript)"),
  code(`import { io, Socket } from "socket.io-client";

interface ScanResponse {
  scan_id: string;
  websocket_url: string;
  eta_seconds: number;
}

export async function runScan(name: string, mode: "business"|"baby") {
  const res = await fetch("/api/v1/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, mode, tier: "free" }),
  });
  if (!res.ok) throw new Error(\`Scan failed: \${res.status}\`);
  const { scan_id, websocket_url }: ScanResponse = await res.json();

  const socket: Socket = io(websocket_url, { transports: ["websocket"] });
  socket.on("result_event",  (t) => upsertTile(t));
  socket.on("hud_update",    (h) => updateHud(h));
  socket.on("verdict_complete", (v) => finishScan(v));
  socket.on("tile_error",    (e) => markTileError(e));
}`),

  h2("11.2  Domain availability via RDAP (worker, Node.js)"),
  code(`import fetch from "node-fetch";

export async function checkDomain(domain: string): Promise<TileResult> {
  const url = \`https://rdap.org/domain/\${domain}\`;
  const res = await fetch(url, { headers: { "Accept": "application/rdap+json" } });

  if (res.status === 404) {
    return { tile_id: \`dom_\${domain}\`, status: "ok", summary: "Available" };
  }
  if (res.status === 200) {
    const body = await res.json();
    const expires = body.events?.find(e => e.eventAction === "expiration")?.eventDate;
    return { tile_id: \`dom_\${domain}\`, status: "no",
             summary: "Taken", detail: { expires } };
  }
  throw new Error(\`RDAP returned \${res.status}\`);
}`),

  h2("11.3  Chaldean numerology engine (Python, the entire algorithm)"),
  code(`CHALDEAN_MAP = {
  **dict.fromkeys("AIJQY", 1), **dict.fromkeys("BKR",   2),
  **dict.fromkeys("CGLS",  3), **dict.fromkeys("DMT",   4),
  **dict.fromkeys("EHNX",  5), **dict.fromkeys("UVW",   6),
  **dict.fromkeys("OZ",    7), **dict.fromkeys("FP",    8),
}
RULING_PLANET = {1:"Sun",2:"Moon",3:"Jupiter",4:"Uranus",5:"Mercury",
                 6:"Venus",7:"Neptune",8:"Saturn",9:"Mars"}
INDUSTRY_FIT  = {
  5: {"good": ["Media","SaaS","Tech","Mobility","Education","Comms"],
      "avoid":["Banking","Insurance","Real estate"]},
  # ... other root numbers
}

def chaldean(name: str) -> dict:
    letters = [c for c in name.upper() if c.isalpha()]
    digits  = [CHALDEAN_MAP[c] for c in letters if c in CHALDEAN_MAP]
    compound = sum(digits)
    root = compound
    while root > 9:
        root = sum(int(d) for d in str(root))
    return {
        "letters": letters,
        "digits":  digits,
        "compound": compound,
        "root":    root,
        "planet":  RULING_PLANET[root],
        "fit":     INDUSTRY_FIT.get(root, {"good": [], "avoid": []}),
    }`),

  h2("11.4  WebSocket event emission (server, Node.js)"),
  code(`import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";

const pub = new Redis(REDIS_URL);
const sub = pub.duplicate();
const io  = new Server({ cors: { origin: "*" } });
io.adapter(createAdapter(pub, sub));

io.of("/v1/stream").on("connection", (socket) => {
  const { scanId } = socket.handshake.query;
  socket.join(\`scan:\${scanId}\`);
  replayBuffer(scanId).then(events => events.forEach(e => socket.emit(e.type, e.data)));
});

// from any worker:
export function emitTile(scanId: string, tile: TileResult) {
  io.of("/v1/stream").to(\`scan:\${scanId}\`).emit("result_event", tile);
  appendToReplayBuffer(scanId, "result_event", tile);
}`),

  pb(),
);

// ════════════════════════════════════════════════════════════════
// 12. APPENDICES
// ════════════════════════════════════════════════════════════════
children.push(
  h1("12. Appendices"),

  h2("Appendix A — Paired Excel deliverable"),
  rich([
    "The full connector knowledge base, scanner ownership matrix, and live cost model are in the companion file ",
    { text: "Naam_Dekho_Connector_Catalog.xlsx", font: MONO, bold: true, color: ACCENT },
    " delivered alongside this document. Three sheets: (1) Connector Catalog — every connector with URL, free/paid status, rate limit, auth, notes; (2) Scanner Modules — worker pool sizes, response times, cache TTLs, owning squad; (3) Cost Model — fully-formula-driven per-scan cost analysis where you can change the blue input cells and watch the bottom-line gross margin recompute live."
  ]),

  h2("Appendix B — Related diagrams"),
  ...diagram("01_architecture.png", 580, 396, "Figure A1", "System architecture — layered view (recap)"),
  ...diagram("03_numerology.png", 580, 369, "Figure A2", "Chaldean numerology engine — implementation algorithm"),
  ...diagram("04_user_journey.png", 580, 369, "Figure A3", "User journey & three-tier service model"),

  h2("Appendix C — Glossary"),
  bullet("BullMQ — Redis-backed job queue library for Node.js. Used as the task queue."),
  bullet("CSE — Custom Search Engine. Google's programmable web-search product."),
  bullet("DPDP Act — Digital Personal Data Protection Act, 2023 (India)."),
  bullet("MCA21 — The portal at mca.gov.in for Companies Act 2013 filings and lookups."),
  bullet("RDAP — Registration Data Access Protocol, the JSON successor to WHOIS."),
  bullet("Tile — One platform's result in the result page UI; corresponds 1:1 with a result_event over WebSocket."),
  bullet("ULID — Universally Unique Lexicographically Sortable Identifier. Used for scan_id."),

  h2("Appendix D — Open questions for the team"),
  bullet("Confirm primary infra region: AWS Mumbai vs Hetzner Frankfurt (latency vs cost)."),
  bullet("Decide on SMS provider final choice between MSG91, Firebase, and WhatsApp Business OTP."),
  bullet("Build vs buy on PDF generation — WeasyPrint vs ReportLab vs Browserless."),
  bullet("Sandbox vs live integration with Bhashini (their stability is still maturing as of Q2 2026)."),
  bullet("Per-organisation analytics dashboard for agency tier — Phase 2 scope."),
  bullet("Disaster recovery — RPO/RTO targets for production data."),

  blank(280),
  hr(),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "— End of Developer Documentation —", font: SERIF, italics: true, size: 22, color: INK3 })],
  }),
);


// ── ASSEMBLE ─────────────────────────────────────────────────────
const doc = new Document({
  creator: "Naam Dekho — Engineering",
  title: "Naam Dekho — Developer Documentation v1.0",
  description: "Production-grade engineering reference for the Naam Dekho platform.",
  styles: {
    default: { document: { run: { font: FONT, size: 22, color: INK } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: SERIF, color: INK },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: SERIF, color: INK },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: SERIF, color: INK2 },
        paragraph: { spacing: { before: 220, after: 120 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
        ] },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "NAAM DEKHO · Developer Documentation v1.0", font: FONT, size: 16, color: INK3, characterSpacing: 30 })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          children: [
            new TextRun({ text: "For internal engineering use only", font: FONT, size: 16, color: INK3, italics: true }),
            new TextRun({ text: "\tPage ", font: FONT, size: 16, color: INK3 }),
            new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: INK3 }),
            new TextRun({ text: " of ", font: FONT, size: 16, color: INK3 }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: INK3 }),
          ],
        })],
      }),
    },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  const out = path.join(OUT_DIR, "Naam_Dekho_Dev_Documentation.docx");
  fs.writeFileSync(out, buf);
  console.log("Wrote:", out, "(", (buf.length / 1024).toFixed(1), "KB )");
});
