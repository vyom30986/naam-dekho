// Naam Dekho — Product Requirements Document (v2, trimmed scope)
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
        Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
        PageBreak, TableOfContents, PageNumber, Header, Footer, LevelFormat, convertInchesToTwip } = require('docx');
const fs = require('fs');

// Style constants
const ACCENT = 'B8501C';
const INK = '0F1419';
const INK2 = '3D4751';
const INK3 = '6B7480';
const LINE = 'E5DFD0';
const OK_BG = 'E7F2E9';
const NO_BG = 'FCE4EC';
const WARN_BG = 'FFF4D9';

// Helpers ---------------------------------------------------------------------
const H1 = (t) => new Paragraph({
  children: [new TextRun({ text: t, bold: true, color: ACCENT, size: 40, font: 'Cambria' })],
  spacing: { before: 480, after: 240 },
  heading: HeadingLevel.HEADING_1,
});
const H2 = (t) => new Paragraph({
  children: [new TextRun({ text: t, bold: true, color: INK, size: 30, font: 'Cambria' })],
  spacing: { before: 360, after: 160 },
  heading: HeadingLevel.HEADING_2,
});
const H3 = (t) => new Paragraph({
  children: [new TextRun({ text: t, bold: true, color: INK2, size: 24, font: 'Cambria' })],
  spacing: { before: 240, after: 120 },
  heading: HeadingLevel.HEADING_3,
});
const P = (t, opts = {}) => new Paragraph({
  children: [new TextRun({ text: t, size: 22, font: 'Calibri', ...opts })],
  spacing: { after: 120, line: 320 },
  alignment: opts.align || AlignmentType.LEFT,
});
const bullet = (t) => new Paragraph({
  children: [new TextRun({ text: t, size: 22, font: 'Calibri' })],
  numbering: { reference: 'bullets', level: 0 },
  spacing: { after: 80 },
});
const bold = (label, rest) => new Paragraph({
  children: [
    new TextRun({ text: label, bold: true, size: 22, font: 'Calibri' }),
    new TextRun({ text: rest, size: 22, font: 'Calibri' }),
  ],
  spacing: { after: 100 },
});
const cell = (text, opts = {}) => new TableCell({
  width: { size: opts.width || 2400, type: WidthType.DXA },
  shading: opts.shade ? { type: ShadingType.CLEAR, color: 'auto', fill: opts.shade } : undefined,
  children: [new Paragraph({
    children: [new TextRun({ text, size: opts.size || 20, bold: opts.bold, color: opts.color || INK, font: 'Calibri' })],
    alignment: opts.align || AlignmentType.LEFT,
    spacing: { before: 60, after: 60 },
  })],
});
const tableRow = (cells) => new TableRow({ children: cells });

const table = (rows, colWidths) => new Table({
  columnWidths: colWidths,
  width: { size: colWidths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
  rows,
});

// -----------------------------------------------------------------------------
// Cover page
// -----------------------------------------------------------------------------
const cover = [
  new Paragraph({ children: [new TextRun({ text: '', size: 24 })], spacing: { before: 2400 } }),
  new Paragraph({
    children: [new TextRun({ text: 'Naam Dekho', bold: true, size: 96, color: ACCENT, font: 'Cambria' })],
    alignment: AlignmentType.CENTER, spacing: { after: 120 },
  }),
  new Paragraph({
    children: [new TextRun({ text: 'नाम देखो', size: 44, color: INK2, font: 'Cambria' })],
    alignment: AlignmentType.CENTER, spacing: { after: 480 },
  }),
  new Paragraph({
    children: [new TextRun({ text: 'Product Requirements Document', size: 40, color: INK, font: 'Cambria' })],
    alignment: AlignmentType.CENTER, spacing: { after: 120 },
  }),
  new Paragraph({
    children: [new TextRun({ text: 'Version 2.0 · July 2026', size: 24, color: INK3, font: 'Calibri' })],
    alignment: AlignmentType.CENTER, spacing: { after: 2400 },
  }),
  new Paragraph({
    children: [new TextRun({ text: 'India-first name verification platform', italics: true, size: 28, color: INK2, font: 'Cambria' })],
    alignment: AlignmentType.CENTER,
  }),
  new Paragraph({
    children: [new TextRun({ text: 'Legal · Domain · Social · Marketplace · Brand · Linguistic', size: 22, color: INK3, font: 'Calibri' })],
    alignment: AlignmentType.CENTER, spacing: { after: 2400 },
  }),
  new Paragraph({
    children: [new TextRun({ text: 'Confidential · Internal distribution only', size: 18, color: INK3, italics: true, font: 'Calibri' })],
    alignment: AlignmentType.CENTER,
  }),
  new Paragraph({ children: [new PageBreak()] }),
];

// -----------------------------------------------------------------------------
// Section 1 — Executive Summary
// -----------------------------------------------------------------------------
const execSummary = [
  H1('1. Executive Summary'),
  P('Naam Dekho is an India-first name verification platform. In a single search, it runs 26 checks across six families of sources — legal registries, domain availability, social handles, marketplace listings, brand and search-engine collision, and linguistic and numerological analysis — and returns a consolidated verdict in approximately 90 seconds.'),
  P('The product serves two distinct audiences in one interface. Founders use it to verify startup names before incorporation, avoiding trademark disputes, taken domains, and cultural landmines. Parents use it to verify baby names before namkaran ceremonies, checking meaning across ten Indian languages, pronunciation ease, numerological fit, and future digital-handle availability.'),
  P('The commercial model is freemium. All free-tier checks run for every user without payment. Paid checks — MCA21, IP India Trademark, Amazon and Flipkart brand registries, and the auto-generated alternative names — unlock at a flat price of ₹50 per Deep Search or ₹500 for a bundle of twelve. Users buy credits on signup and top up as needed.'),
  bold('Key metric: ', 'Free searches cost approximately ₹0 in variable cost. Paid searches cost approximately ₹7 in variable cost and generate ₹50 in revenue, delivering ~86% gross margin per Deep Search.'),
];

// -----------------------------------------------------------------------------
// Section 2 — Product Vision
// -----------------------------------------------------------------------------
const vision = [
  H1('2. Product Vision'),
  H2('2.1 Problem'),
  P('Naming a company or a child in India requires checking dozens of independent registries and platforms. No single tool combines the Indian legal registries (MCA, IP India, GST) with the global technical registries (domains, social handles, app stores) with the cultural layer (multi-lingual meaning, numerology, pronunciation). Founders spend two to three hours across ten to fifteen browser tabs and still miss critical conflicts. Parents rely on family members and religious advisors with limited cross-verification.'),
  H2('2.2 Solution'),
  P('One search box. One name. Twenty-six checks run in parallel. A verdict in ninety seconds. A downloadable evidence report for the paid tier. An auto-generated shortlist of five verified alternatives when the primary name is blocked.'),
  H2('2.3 Guiding principles'),
  bullet('Transparency over marketing — every conflict shows the source registry link and timestamp.'),
  bullet('Speed over completeness — return partial results in ten seconds rather than a complete result in three minutes.'),
  bullet('Honesty over alarm — separate legal blockers from advisory signals from pure information.'),
  bullet('India-first over global-copy — Indian founders and Indian parents get first-class UX in Devanagari and Hinglish.'),
];

// -----------------------------------------------------------------------------
// Section 3 — Target users
// -----------------------------------------------------------------------------
const users = [
  H1('3. Target Users & Personas'),
  H2('3.1 Founder (Business mode)'),
  bullet('Early-stage Indian entrepreneur, aged 25 to 40, incorporating a private limited company or LLP.'),
  bullet('Pain: has fallen in love with a name; needs to verify before spending money on lawyer, domain, or trademark filing.'),
  bullet('Decision trigger: about to file with MCA21 or purchase domain.'),
  bullet('Willingness to pay: high — ₹50 is under 1% of typical incorporation cost.'),
  H2('3.2 Parent (Baby-name mode)'),
  bullet('New or expecting parent, aged 25 to 45, planning namkaran ceremony within 10 to 45 days of birth.'),
  bullet('Pain: family has ten different suggestions; needs objective cross-check of meaning, pronunciation, numerology, cultural safety.'),
  bullet('Decision trigger: namkaran ceremony date approaching.'),
  bullet('Willingness to pay: moderate — ₹29 for Keepsake PDF is emotional purchase, ₹99 for Shortlist of Five is practical.'),
  H2('3.3 Agency (secondary — Phase 2)'),
  bullet('Naming consultancy, brand studio, or incubator running many searches monthly.'),
  bullet('Pain: manual research is billed hourly but doesn\'t scale.'),
  bullet('Decision trigger: onboarding new client.'),
  bullet('Willingness to pay: high — subscription plans from ₹9,999/month.'),
];

// -----------------------------------------------------------------------------
// Section 4 — User Journeys
// -----------------------------------------------------------------------------
const journeys = [
  H1('4. User Journeys'),
  H2('4.1 Founder journey (typical)'),
  bullet('Founder lands on naamdekho.in from an ad or organic search.'),
  bullet('Types the proposed name in the search box. No sign-up required for first search.'),
  bullet('Results stream in real-time: domains, social handles, marketplace, brand, linguistic checks — all appear within 20 seconds. Legal, trademark, and Amazon/Flipkart tiles show a blurred "Unlock for ₹50" overlay.'),
  bullet('Founder clicks the locked overlay. Redirected to sign-in with phone OTP (30 seconds).'),
  bullet('After OTP verification, Razorpay checkout modal opens. Founder pays ₹50 or ₹500 for a bundle.'),
  bullet('Locked tiles unlock. All 26 checks now visible. If any red conflict appears, the auto-generated alternatives shortlist appears alongside.'),
  bullet('Founder downloads the PDF evidence report. Shares with lawyer or co-founder.'),
  H2('4.2 Parent journey (typical)'),
  bullet('Parent lands, switches mode from Business to Baby Name.'),
  bullet('Types a shortlisted name. Free checks return in 12 seconds: meaning across 10 languages, pronunciation score, numerology reading, landmine dictionary result, and handle availability.'),
  bullet('If satisfied, parent optionally buys Keepsake PDF (₹29) — a designed one-page certificate suitable for framing or sharing on WhatsApp.'),
  bullet('If comparing multiple names, parent buys Shortlist of Five (₹99) — a side-by-side comparison PDF for family discussion.'),
];

// -----------------------------------------------------------------------------
// Section 5 — Functional Requirements
// -----------------------------------------------------------------------------
const funcReq = [
  H1('5. Functional Requirements'),
  H2('5.1 Search engine'),
  bold('FR-5.1.1  ', 'The system shall accept a name of 2 to 60 characters, in Roman script or any of ten supported Indic scripts.'),
  bold('FR-5.1.2  ', 'The system shall normalise the input via Unicode NFC, strip diacritics, and generate a canonical form for matching.'),
  bold('FR-5.1.3  ', 'The system shall dispatch the normalised name in parallel to all applicable connectors within 500 milliseconds of search submission.'),
  bold('FR-5.1.4  ', 'The system shall stream individual check results to the user interface via WebSocket as each check completes.'),
  bold('FR-5.1.5  ', 'The system shall return a final consolidated verdict within 120 seconds; connectors that have not returned within this window shall be marked "Pending" and retried in a background job.'),

  H2('5.2 The 26-check portfolio'),
  P('The following table lists every check the system runs, its tier (free or paid), and the underlying data source. Free-tier checks run for every search regardless of authentication status. Paid-tier checks run only when the user has an unlocked Deep Search credit.'),

  table([
    tableRow([
      cell('Check', { bold: true, shade: INK, color: 'FFFFFF', width: 3200 }),
      cell('Family', { bold: true, shade: INK, color: 'FFFFFF', width: 1800 }),
      cell('Tier', { bold: true, shade: INK, color: 'FFFFFF', width: 1200, align: AlignmentType.CENTER }),
      cell('Source', { bold: true, shade: INK, color: 'FFFFFF', width: 2400 }),
    ]),
    // Free-tier rows
    ...[
      ['Domain: .com', 'Domain', 'FREE', 'RDAP'],
      ['Domain: .in / .co.in', 'Domain', 'FREE', 'INRegistry + RDAP'],
      ['Domain: .org / .net / .io / .ai', 'Domain', 'FREE', 'RDAP'],
      ['Domain: .app / .store / .shop / .tech', 'Domain', 'FREE', 'RDAP'],
      ['Instagram handle', 'Social', 'FREE', 'Public URL probe'],
      ['X (Twitter) handle', 'Social', 'FREE', 'Public URL probe'],
      ['YouTube channel handle', 'Social', 'FREE', 'YouTube Data API v3'],
      ['LinkedIn company page', 'Social', 'FREE', 'Public URL probe'],
      ['Facebook page', 'Social', 'FREE', 'Public URL probe'],
      ['WhatsApp Business link', 'Social', 'FREE', 'wa.me probe'],
      ['Google Play Store', 'Marketplace', 'FREE', 'google-play-scraper'],
      ['Apple App Store', 'Marketplace', 'FREE', 'iTunes Search API'],
      ['Shopify subdomain', 'Marketplace', 'FREE', 'DNS lookup'],
      ['GitHub username', 'Marketplace', 'FREE', 'GitHub REST API'],
      ['Product Hunt', 'Marketplace', 'FREE', 'Product Hunt API v2'],
      ['Wikipedia + Wikidata', 'Brand', 'FREE', 'MediaWiki API'],
      ['Google Search (top 3)', 'Brand', 'FREE', 'Google CSE (free tier)'],
      ['Chaldean numerology', 'Linguistic', 'FREE', 'In-house engine'],
      ['Meaning (10 Indian languages)', 'Linguistic', 'FREE', 'Bhashini + Indic NLP'],
      ['Landmine dictionary (7 langs)', 'Linguistic', 'FREE', 'Curated dataset'],
      ['Pronunciation score', 'Linguistic', 'FREE', 'ICU + Aksharamukha'],
    ].map(([c, f, t, s]) => tableRow([
      cell(c, { width: 3200 }),
      cell(f, { width: 1800 }),
      cell(t, { width: 1200, align: AlignmentType.CENTER, shade: OK_BG, color: '1B5E20', bold: true }),
      cell(s, { width: 2400 }),
    ])),
    // Paid-tier rows
    ...[
      ['MCA21 Company Register', 'Legal', 'PAID', 'Playwright + CAPTCHA'],
      ['IP India Trademark (45 classes)', 'Legal', 'PAID', 'Playwright + CAPTCHA'],
      ['GST trade-name', 'Legal', 'PAID', 'Playwright scraping'],
      ['Amazon India Brand', 'Marketplace', 'PAID', 'ScrapingBee'],
      ['Flipkart Brand', 'Marketplace', 'PAID', 'ScrapingBee'],
      ['Full Google SERP', 'Brand', 'PAID', 'Google CSE (paid tier)'],
      ['Auto-generated alternatives (5)', 'Bonus', 'PAID', 'LLM + full pipeline'],
      ['PDF evidence report', 'Bonus', 'PAID', 'WeasyPrint'],
    ].map(([c, f, t, s]) => tableRow([
      cell(c, { width: 3200 }),
      cell(f, { width: 1800 }),
      cell(t, { width: 1200, align: AlignmentType.CENTER, shade: NO_BG, color: '880E4F', bold: true }),
      cell(s, { width: 2400 }),
    ])),
  ], [3200, 1800, 1200, 2400]),

  new Paragraph({ children: [new TextRun({ text: '', size: 8 })], spacing: { after: 120 } }),

  H2('5.3 Authentication'),
  bold('FR-5.3.1  ', 'The system shall authenticate users via phone number and one-time password (OTP) delivered by SMS.'),
  bold('FR-5.3.2  ', 'The system shall support Indian (+91) numbers by default and four other country codes (US, UK, UAE, Singapore).'),
  bold('FR-5.3.3  ', 'The OTP shall be 6 digits, valid for 5 minutes, with a resend cool-down of 30 seconds.'),
  bold('FR-5.3.4  ', 'On successful verification, the system shall issue a JWT valid for 30 days, stored in the browser\'s localStorage.'),
  bold('FR-5.3.5  ', 'The system shall use MSG91 as the primary SMS provider with a Twilio fallback for international numbers.'),

  H2('5.4 Freemium model & payments'),
  bold('FR-5.4.1  ', 'The system shall grant every newly-signed-up user 1 free Deep Search credit as a signup bonus.'),
  bold('FR-5.4.2  ', 'The system shall allow every user, authenticated or anonymous, to run unlimited free-tier searches.'),
  bold('FR-5.4.3  ', 'The system shall offer two paid SKUs: single Deep Search at ₹50, and bundle of 12 Deep Searches at ₹500 (valid 90 days).'),
  bold('FR-5.4.4  ', 'The system shall use Razorpay as the primary payment gateway and Paytm as the automatic fallback.'),
  bold('FR-5.4.5  ', 'The gateway switcher shall flip to Paytm when Razorpay error rate exceeds 5% or latency exceeds 10 seconds, with 30-minute stickiness.'),
  bold('FR-5.4.6  ', 'All prices shall be inclusive of 18% GST; the tax invoice shall be automatically generated and emailed within 60 minutes of payment.'),

  H2('5.5 Credits system'),
  bold('FR-5.5.1  ', 'One credit shall equal one Deep Search that unlocks all paid-tier checks for a single name.'),
  bold('FR-5.5.2  ', 'Credits shall not expire, except for Bundle-of-12 which expires 90 days after purchase.'),
  bold('FR-5.5.3  ', 'The user\'s credit balance shall be visible on every authenticated page in the top-right of the navigation bar.'),
  bold('FR-5.5.4  ', 'The system shall support credit refunds only when a Deep Search fails to complete due to a system error (documented in the runbook).'),

  H2('5.6 Auto-endpoint generation (Paid add-on)'),
  bold('FR-5.6.1  ', 'When a user\'s Deep Search returns a red conflict, the system shall offer to generate 5 alternative names for ₹99 (or included free in the ₹500 bundle).'),
  bold('FR-5.6.2  ', 'The alternatives shall be generated by an LLM prompted with the original name, target industry, and the specific conflict reason.'),
  bold('FR-5.6.3  ', 'Each alternative shall be automatically re-verified across all 26 checks before being shown to the user; only alternatives with zero red conflicts shall be displayed.'),
];

// -----------------------------------------------------------------------------
// Section 6 — Non-functional
// -----------------------------------------------------------------------------
const nonFunc = [
  H1('6. Non-Functional Requirements'),
  H2('6.1 Performance'),
  bullet('P95 first-tile latency: less than 3 seconds.'),
  bullet('P95 full-scan completion: less than 90 seconds.'),
  bullet('WebSocket reconnect on drop: automatic, resumes tile streaming without losing prior tiles.'),
  H2('6.2 Reliability'),
  bullet('Every scanner family shall have its own retry policy and circuit breaker.'),
  bullet('When a data source is unavailable, the check shall be marked "Pending" and retried by a background job within 30 minutes; the user shall be emailed when the update is available.'),
  bullet('Target uptime: 99.5% monthly for the API, 99.9% for the marketing website.'),
  H2('6.3 Security'),
  bullet('All traffic served over HTTPS with HSTS enabled.'),
  bullet('JWT signed with rotating secrets; secrets stored in a managed vault.'),
  bullet('Passwords: not applicable (phone-OTP only).'),
  bullet('Admin console gated by TOTP 2FA and IP allow-list.'),
  bullet('Data encrypted at rest using AES-256 (managed database encryption).'),
  H2('6.4 Compliance'),
  bullet('DPDP Act 2023 compliant: explicit consent captured before OTP; user data deletion available on request; 90-day default retention for scan history.'),
  bullet('IT Act 2000 compliant: grievance officer designated; complaint response within 15 days.'),
  bullet('GST-registered entity; tax invoices issued for every transaction.'),
  bullet('Data residency: all customer data stored in India-region (AWS ap-south-1 or GCP asia-south1).'),
  H2('6.5 Scalability'),
  bullet('Target load: 10,000 concurrent scans without SLA degradation.'),
  bullet('Horizontal scale: worker pools sized independently per family; scale-out on queue depth threshold.'),
  bullet('Database: PostgreSQL 16 primary + read replica; scale to sharded write master by user_id at 1M users.'),
];

// -----------------------------------------------------------------------------
// Section 7 — UI/UX
// -----------------------------------------------------------------------------
const uiux = [
  H1('7. UI/UX Requirements'),
  H2('7.1 Design principles'),
  bullet('Editorial serif for headings (Fraunces), clean sans for body (Inter), monospace for labels and codes (JetBrains Mono), Devanagari for brand mark (Noto Sans Devanagari).'),
  bullet('Warm paper palette (#FAF8F3 background) with rust accent (#B8501C) and gold highlight (#E8C76A) — evokes traditional Indian paper documents, not sterile SaaS.'),
  bullet('Mobile-first responsive layout; every page fully usable on 360px screens.'),
  bullet('Never lose typed input on mode switch, page navigation, or credential prompt.'),
  H2('7.2 Core screens'),
  bullet('Home / Search: single-input hero, mode switcher (Business / Baby), catalogue preview of all 26 checks, results grid after search with locked/unlocked tiles.'),
  bullet('How It Works: 4-step pipeline explainer, FAQ accordion, CTAs to search and pricing.'),
  bullet('Pricing: 3-audience switcher (Founder / Parent / Agency), plan cards, agency lead form.'),
  bullet('Sign-In: 3-step OTP flow (phone → 6-digit code → success redirect), with optional intent banner reflecting the paid action user came from.'),
  bullet('Admin Console: dashboard, scan history, source usage tracking, baby PDF pipeline, payment reconciliation, agency leads kanban, audit log.'),
];

// -----------------------------------------------------------------------------
// Section 8 — Data model
// -----------------------------------------------------------------------------
const dataModel = [
  H1('8. Data Model'),
  H2('8.1 Core entities'),
  bold('users  ', '(id, phone, email, first_seen, credits_free, credits_bundle, credits_expires_at, jwt_version)'),
  bold('scans  ', '(id, user_id, name_input, name_normalised, mode, tier, status, verdict_score, started_at, completed_at)'),
  bold('scan_results  ', '(id, scan_id, check_key, family, tier, status, summary, detail, latency_ms, source_url, evidence_json)'),
  bold('billing_events  ', '(id, user_id, sku, amount_paise, gateway, gateway_txn_id, status, created_at)'),
  bold('agency_leads  ', '(id, name, email, company, team_size, notes, status, created_at, assigned_to)'),
  bold('audit_log  ', '(id, actor_type, actor_id, action, target_type, target_id, metadata_json, at)'),
];

// -----------------------------------------------------------------------------
// Section 9 — API surface
// -----------------------------------------------------------------------------
const apiSurface = [
  H1('9. API Surface'),
  H2('9.1 REST endpoints'),
  bullet('POST /v1/scan — submit a name for scanning'),
  bullet('GET  /v1/scans/:id — fetch consolidated result'),
  bullet('GET  /v1/scans/:id/pdf — 302 to signed PDF URL (paid only)'),
  bullet('POST /v1/auth/request-otp — send OTP to phone'),
  bullet('POST /v1/auth/verify-otp — exchange OTP for JWT'),
  bullet('GET  /v1/me — current user + credit balance'),
  bullet('POST /v1/billing/checkout — create Razorpay/Paytm order'),
  bullet('POST /v1/billing/razorpay-webhook — Razorpay webhook receiver'),
  bullet('POST /v1/billing/paytm-callback — Paytm return-URL callback'),
  bullet('POST /v1/agency-leads — agency contact form submission'),
  bullet('GET  /v1/healthz, /v1/readyz — health probes'),
  H2('9.2 WebSocket'),
  P('Endpoint: /v1/stream?scanId=<id>'),
  P('Emitted events:'),
  bullet('scan_started — { scanId, totalTiles, etaSeconds }'),
  bullet('result_event — { tileId, category, status, summary, detail, latencyMs }'),
  bullet('progress — { completed, total }'),
  bullet('hud_update — { verdictScore, clear, conflict, warn, pending }'),
  bullet('verdict_complete — full ScanVerdict object'),
  bullet('tile_error — { tileId, errorCode, retry }'),
  bullet('scan_failed — { reason, retryable }'),
];

// -----------------------------------------------------------------------------
// Section 10 — Metrics
// -----------------------------------------------------------------------------
const metrics = [
  H1('10. Analytics & Success Metrics'),
  H2('10.1 Product metrics'),
  bullet('Weekly active searches (WAS) — target 5,000 by end of Q2, 25,000 by end of Q4.'),
  bullet('Free-to-Paid conversion — target 4% of free searches lead to Deep Search purchase.'),
  bullet('Bundle attach rate — target 30% of Deep Search buyers upgrade to the ₹500 bundle within 30 days.'),
  bullet('Baby-mode share of searches — target 25% of total searches.'),
  bullet('Median full-scan latency — target under 60 seconds.'),
  H2('10.2 Commercial metrics'),
  bullet('Monthly gross revenue — target ₹5 lakhs by end of Q2.'),
  bullet('Gross margin per Deep Search — maintain above 80%.'),
  bullet('Customer acquisition cost (CAC) — under ₹120 per paying user.'),
  bullet('LTV/CAC — target above 3x within 6 months.'),
  H2('10.3 Instrumentation'),
  bullet('Posthog for product analytics (funnels, retention).'),
  bullet('Sentry for error tracking.'),
  bullet('Prometheus + Grafana for infrastructure metrics.'),
  bullet('BullMQ Dashboard for queue depth and worker health.'),
];

// -----------------------------------------------------------------------------
// Section 11 — Out of scope
// -----------------------------------------------------------------------------
const oos = [
  H1('11. Out of Scope (v1)'),
  bullet('Native mobile app (iOS or Android) — responsive web only.'),
  bullet('Sector-gated regulators (RBI, SEBI, IRDAI, NGO Darpan) — Phase 3.'),
  bullet('Additional social platforms (Reddit, Discord, Snapchat, Substack) — Phase 2.'),
  bullet('Additional marketplaces (Etsy, Meesho, Myntra, JioMart, ONDC) — Phase 2.'),
  bullet('Tracxn, Y Combinator, Product Hunt directory checks — Phase 2.'),
  bullet('Watch-list monitoring (re-scan when new registrations happen) — Phase 3.'),
  bullet('White-label / API for agencies — Phase 2.'),
  bullet('Multi-user workspaces — Phase 3.'),
];

// -----------------------------------------------------------------------------
// Section 12 — Roadmap
// -----------------------------------------------------------------------------
const roadmap = [
  H1('12. Roadmap'),
  H2('Phase 1 — Launch (v1)'),
  bullet('26 checks (as scoped in Section 5.2).'),
  bullet('Freemium model with ₹50 / ₹500 SKUs.'),
  bullet('Phone-OTP authentication.'),
  bullet('Razorpay primary + Paytm fallback.'),
  bullet('PDF evidence report.'),
  bullet('Admin console (basic).'),
  H2('Phase 2 — Growth (Q4 2026)'),
  bullet('Add Reddit, Discord, Snapchat, Substack, Threads, Telegram to social pool.'),
  bullet('Add Etsy, Meesho, Myntra, JioMart, ONDC to marketplace pool.'),
  bullet('Watch-list monitoring — email founder if a competitor registers a similar name later.'),
  bullet('Agency plans (Studio at ₹9,999/mo, Incubator, Enterprise).'),
  bullet('White-label PDF and API access.'),
  H2('Phase 3 — Depth (H1 2027)'),
  bullet('Sector-gated regulator checks (RBI, SEBI, IRDAI, FSSAI if reintroduced).'),
  bullet('Multi-user workspaces for agencies.'),
  bullet('Trademark class recommender based on business description.'),
  bullet('Post-incorporation companion products (compliance calendar, ROC filings alerts).'),
];

// -----------------------------------------------------------------------------
// Section 13 — Risks
// -----------------------------------------------------------------------------
const risks = [
  H1('13. Risks & Mitigations'),
  bold('R-1: MCA21 or IP India CAPTCHA changes. ', 'Mitigation: use pluggable CAPTCHA solver (2Captcha, Anti-Captcha) with vendor fallback. Add Trademarkia as trademark-source fallback.'),
  bold('R-2: Razorpay outage during peak. ', 'Mitigation: Paytm auto-failover with 5-minute health checks and 30-minute stickiness (implemented in src/payments/index.ts).'),
  bold('R-3: DPDP Act enforcement. ', 'Mitigation: appointed Data Protection Officer, published grievance officer contact, quarterly data-audit; user-initiated data deletion endpoint live from day one.'),
  bold('R-4: LinkedIn / X aggressive bot blocking. ', 'Mitigation: rotating residential proxy pool; degrade to "Pending" gracefully rather than showing false conflict.'),
  bold('R-5: Bhashini API quota changes. ', 'Mitigation: Google Cloud Translation as paid fallback for language coverage.'),
  bold('R-6: Free-tier abuse (bots scraping our results). ', 'Mitigation: token-bucket rate limit at 30 searches per IP per hour on free tier; captcha challenge on burst.'),
];

// -----------------------------------------------------------------------------
// Section 14 — Appendix
// -----------------------------------------------------------------------------
const appendix = [
  H1('14. Appendix'),
  H2('14.1 Glossary'),
  bold('MCA21 ', '— Ministry of Corporate Affairs e-governance portal for company registrations in India.'),
  bold('IP India ', '— Indian Patent Office / Trademarks Registry (ipindia.gov.in).'),
  bold('DPDP Act ', '— Digital Personal Data Protection Act, 2023, India\'s equivalent of GDPR.'),
  bold('RDAP ', '— Registration Data Access Protocol, the modern replacement for WHOIS.'),
  bold('Namkaran ', '— Hindu naming ceremony for a newborn, traditionally on the 11th day.'),
  bold('Chaldean numerology ', '— Ancient system assigning digits 1-8 to letters, used in Indian tradition for name analysis.'),
  bold('Bhashini ', '— Government of India\'s national language translation platform, covering 22 official languages.'),
  H2('14.2 Related documents'),
  bullet('Naam_Dekho_62_Checks.xlsx — original 62-check scope (superseded by this PRD).'),
  bullet('Naam_Dekho_Free_vs_Paid.xlsx — connector cost breakdown by tier.'),
  bullet('Naam_Dekho_Dev_Documentation.pdf — technical architecture and API contract deep-dive.'),
  bullet('Naam_Dekho_Legal_Policies.pdf — Privacy, Terms, Cookies, Cancellation, Payment Terms.'),
  bullet('Naam_Dekho_Copyright_Filing.pdf — copyright registration document for the platform IP.'),
  bullet('frontend-jsx/ — React scaffold for all 4 customer pages, wired to backend endpoints.'),
  bullet('backend/ — Node.js 20 + TypeScript + Fastify + Socket.IO service.'),
];

// -----------------------------------------------------------------------------
// Assemble document
// -----------------------------------------------------------------------------
const doc = new Document({
  creator: 'Naam Dekho Product Team',
  title: 'Naam Dekho — PRD v2',
  description: 'Product Requirements Document for Naam Dekho v1 launch',
  numbering: {
    config: [{
      reference: 'bullets',
      levels: [{
        level: 0,
        format: LevelFormat.BULLET,
        text: '•',
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 360, hanging: 240 } } },
      }],
    }],
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          children: [new TextRun({ text: 'Naam Dekho · PRD v2', size: 18, color: INK3, font: 'Calibri' })],
          alignment: AlignmentType.RIGHT,
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          children: [
            new TextRun({ text: 'Confidential · ', size: 16, color: INK3, italics: true, font: 'Calibri' }),
            new TextRun({ children: ['Page ', PageNumber.CURRENT], size: 16, color: INK3, font: 'Calibri' }),
          ],
          alignment: AlignmentType.CENTER,
        })],
      }),
    },
    children: [
      ...cover,
      ...execSummary,
      ...vision,
      ...users,
      ...journeys,
      ...funcReq,
      ...nonFunc,
      ...uiux,
      ...dataModel,
      ...apiSurface,
      ...metrics,
      ...oos,
      ...roadmap,
      ...risks,
      ...appendix,
    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('/tmp/_prd.docx', buf);
  console.log('OK: /tmp/_prd.docx, ' + buf.length + ' bytes');
});
