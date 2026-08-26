/**
 * Naam Dekho — Master Legal Policies Document
 *   1. Privacy Policy
 *   2. Terms of Use (User Policy)
 *   3. Cookies Policy
 *   4. Cancellation & Refund Policy
 *   5. Payment Terms (Razorpay primary, Paytm fallback)
 *
 * NOT LEGAL ADVICE — review with an Indian IP / consumer-law advocate before publishing.
 */
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageNumber, PageBreak,
  TableOfContents, TabStopType, TabStopPosition, VerticalAlign,
} = require("docx");

const OUT = path.join(__dirname, "Naam_Dekho_Legal_Policies.docx");

const INK = "0F1419", INK2 = "3D4751", INK3 = "6B7480";
const ACCENT = "B8501C", LINE = "D8D0BC";
const BG2 = "F3EFE5", OK = "1B5E20";
const SOFT_GREEN = "E7F2E9", SOFT_YELLOW = "FFF4D9";

const FONT = "Calibri";
const SERIF = "Cambria";

const p = (text, opts = {}) =>
  new Paragraph({
    spacing: { before: 0, after: 120, line: 300 },
    alignment: opts.align || AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, font: FONT, size: opts.size || 22, color: opts.color || INK, bold: opts.bold, italics: opts.italic })],
  });

const rich = (runs, opts = {}) =>
  new Paragraph({
    spacing: { before: opts.before || 0, after: opts.after || 120, line: 300 },
    alignment: opts.align || AlignmentType.JUSTIFIED,
    children: runs.map(r => typeof r === "string"
      ? new TextRun({ text: r, font: FONT, size: 22, color: INK })
      : new TextRun({ font: FONT, size: 22, color: INK, ...r }))
  });

const h1 = text => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 400, after: 240 },
  children: [new TextRun({ text, font: SERIF, size: 38, bold: true, color: INK })],
});
const h2 = text => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 300, after: 180 },
  children: [new TextRun({ text, font: SERIF, size: 28, bold: true, color: INK })],
});
const h3 = text => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 240, after: 140 },
  children: [new TextRun({ text, font: SERIF, size: 24, bold: true, color: INK2 })],
});

const bullet = (text, level = 0) => new Paragraph({
  numbering: { reference: "bullets", level },
  spacing: { after: 90, line: 280 },
  alignment: AlignmentType.JUSTIFIED,
  children: [new TextRun({ text, font: FONT, size: 22, color: INK })],
});

const numItem = (text, level = 0) => new Paragraph({
  numbering: { reference: "numbers", level },
  spacing: { after: 90, line: 280 },
  alignment: AlignmentType.JUSTIFIED,
  children: [new TextRun({ text, font: FONT, size: 22, color: INK })],
});

const blank = (size = 120) => new Paragraph({ spacing: { before: 0, after: size }, children: [new TextRun("")] });
const hr = () => new Paragraph({
  spacing: { before: 80, after: 80 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: LINE, space: 1 } },
  children: [new TextRun("")],
});
const pb = () => new Paragraph({ children: [new PageBreak()] });

const callout = (title, body) => new Paragraph({
  spacing: { before: 140, after: 200, line: 300 },
  shading: { type: ShadingType.CLEAR, fill: SOFT_YELLOW },
  border: { left: { style: BorderStyle.SINGLE, size: 18, color: ACCENT, space: 8 } },
  children: [
    new TextRun({ text: title + "  ", font: FONT, bold: true, size: 22, color: ACCENT }),
    new TextRun({ text: body, font: FONT, size: 22, color: INK }),
  ],
});

const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: LINE };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

const cell = (text, opts = {}) => new TableCell({
  borders: cellBorders,
  width: { size: opts.width, type: WidthType.DXA },
  shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
  verticalAlign: VerticalAlign.CENTER,
  margins: { top: 100, bottom: 100, left: 140, right: 140 },
  children: [new Paragraph({
    spacing: { before: 0, after: 0 },
    children: [new TextRun({ text, font: FONT, size: opts.size || 20, color: opts.color || INK, bold: opts.bold })],
  })],
});

const headerCell = (text, width) => cell(text, { width, fill: INK, color: "FAF8F3", bold: true, size: 19 });

const wideTable = (colWidths, rows) => new Table({
  width: { size: colWidths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
  columnWidths: colWidths,
  rows,
});

const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
const children = [];

// ═════════════════════════════════════════════════════════════
// COVER
// ═════════════════════════════════════════════════════════════
children.push(
  new Paragraph({ spacing: { before: 1600 }, children: [new TextRun("")] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [new TextRun({ text: "LEGAL POLICIES  ·  v1.0", font: FONT, size: 18, color: ACCENT, bold: true, characterSpacing: 80 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
    children: [new TextRun({ text: "NAAM DEKHO", font: SERIF, size: 84, bold: true, color: INK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
    children: [new TextRun({ text: "नाम देखो", font: SERIF, size: 36, italics: true, color: ACCENT })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 600 },
    children: [new TextRun({ text: "Privacy · Terms of Use · Cookies · Cancellation & Refund", font: SERIF, size: 22, italics: true, color: INK2 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER,
    border: { top: { style: BorderStyle.SINGLE, size: 8, color: ACCENT, space: 8 }, bottom: { style: BorderStyle.SINGLE, size: 8, color: ACCENT, space: 8 } },
    spacing: { after: 240 },
    children: [new TextRun({ text: "MASTER POLICIES DOCUMENT", font: FONT, size: 20, bold: true, color: INK, characterSpacing: 30 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 200 },
    children: [new TextRun({
      text: "This document sets out the complete legal-policy framework governing the use of the Naam Dekho platform — including the website at naamdekho.in, any subdomains, mobile applications, APIs and ancillary services (collectively, the \"Platform\"). It is drafted in accordance with the laws of the Republic of India, with primary reference to the Digital Personal Data Protection Act, 2023, the Information Technology Act, 2000, the Consumer Protection Act, 2019, the Contract Act, 1872, and the Indian Contract Act and rules made thereunder.",
      font: FONT, size: 20, italics: true, color: INK2 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1000, after: 100 },
    children: [new TextRun({ text: "Operating entity", font: FONT, size: 18, color: INK3 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
    children: [new TextRun({ text: "Naam Dekho Technologies Private Limited", font: FONT, size: 22, bold: true, color: INK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
    children: [new TextRun({ text: "[Registered address — to be inserted by the company at the time of publishing]", font: FONT, size: 18, italics: true, color: INK3 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
    children: [new TextRun({ text: "CIN: [to be inserted]  ·  GSTIN: [to be inserted]", font: FONT, size: 18, color: INK3 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 },
    children: [new TextRun({ text: `Effective date: ${today}  ·  Version 1.0  ·  Review cycle: every 12 months or upon material change`, font: FONT, size: 18, italics: true, color: INK3 })] }),
  pb(),
);

// TOC
children.push(
  h1("Table of Contents"),
  p("In Microsoft Word: right-click the table below and select Update Field to populate page numbers.", { italic: true, color: INK3, size: 18 }),
  new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-3" }),
  pb(),
);

// ═════════════════════════════════════════════════════════════
// PREAMBLE / DEFINITIONS
// ═════════════════════════════════════════════════════════════
children.push(
  h1("0.  Preamble and Common Definitions"),

  h2("0.1  Preamble"),
  p("Naam Dekho Technologies Private Limited (hereinafter \"Naam Dekho\", \"the Company\", \"we\", \"us\" or \"our\") operates an India-first name-availability and name-suitability verification platform that performs queries against multiple public registers, third-party application programming interfaces (APIs) and traditional naming systems, and presents a consolidated verdict to its users. The Platform is offered to two distinct audiences — founders/businesses (\"Startup mode\") and parents/families (\"Baby mode\") — and offers a free tier alongside paid tiers."),

  p("Because the Platform depends, by its very nature, on a large number of third-party data sources outside the Company's control — including but not limited to portals operated by the Government of India, by domain registries and registrars, by global social-media platforms, and by application marketplaces — these policies set out, with deliberate clarity, the boundaries of the service we offer, the limits of our liability for delays and inaccuracies arising from those third parties, and the rights and obligations of each User."),

  p("By accessing, browsing, registering on, or transacting upon the Platform, the User signifies unconditional acceptance of, and agrees to be bound by, these policies in their entirety. If the User does not agree with any portion of these policies, the User is requested to refrain from accessing or using the Platform."),

  h2("0.2  Common Definitions"),
  p("Throughout this document the following capitalised expressions shall, unless the context otherwise requires, have the meanings set out alongside them:"),
  wideTable([2200, 7160], [
    new TableRow({ children: [headerCell("Term", 2200), headerCell("Definition", 7160)] }),
    new TableRow({ children: [cell("Platform", { width: 2200, bold: true, fill: BG2 }), cell("The Naam Dekho website at naamdekho.in, any present or future subdomains, mobile applications, application programming interfaces, downloadable reports, and ancillary services.", { width: 7160 })] }),
    new TableRow({ children: [cell("User / You", { width: 2200, bold: true, fill: BG2 }), cell("Any natural or juridical person who accesses, browses, registers on, or transacts upon the Platform, in any tier (Free, Deep Scan, Keepsake, Shortlist, Founder Pro or Agency).", { width: 7160 })] }),
    new TableRow({ children: [cell("Free Tier", { width: 2200, bold: true, fill: BG2 }), cell("The tier offered without monetary consideration, providing surface-level checks across all sixty-two platforms with live result streaming but excluding the warmed-proxy deep scan and the downloadable PDF report.", { width: 7160 })] }),
    new TableRow({ children: [cell("Paid Tiers", { width: 2200, bold: true, fill: BG2 }), cell("The tiers offered against monetary consideration, namely: Deep Legal Scan (₹49 per name), Keepsake PDF Report (₹29 per name), Shortlist of Five (₹99 per set), Founder Pro (₹499 per month), and Agency (price by quotation).", { width: 7160 })] }),
    new TableRow({ children: [cell("Third-Party Sources", { width: 2200, bold: true, fill: BG2 }), cell("Any external data source consulted by the Platform, including without limitation Government registers (e.g. MCA21, IP India, Copyright, GST), domain registries, social-media platforms, application marketplaces, search engines, news indices and machine-translation services.", { width: 7160 })] }),
    new TableRow({ children: [cell("Result / Output", { width: 2200, bold: true, fill: BG2 }), cell("The information presented to the User by the Platform consequent to a search, comprising verdicts, status pills, summaries, transliterations, numerology readings, downloadable PDF reports and ancillary content.", { width: 7160 })] }),
    new TableRow({ children: [cell("Personal Data", { width: 2200, bold: true, fill: BG2 }), cell("Has the meaning ascribed to the expression in Section 2(t) of the Digital Personal Data Protection Act, 2023.", { width: 7160 })] }),
    new TableRow({ children: [cell("Applicable Laws", { width: 2200, bold: true, fill: BG2 }), cell("All Indian statutory enactments, rules, regulations, notifications, directions and circulars in force from time to time which apply to the Company or to the User in respect of use of the Platform, including the Information Technology Act, 2000, the Digital Personal Data Protection Act, 2023, the Indian Contract Act, 1872, the Consumer Protection Act, 2019, the Central Goods and Services Tax Act, 2017, and the Companies Act, 2013.", { width: 7160 })] }),
    new TableRow({ children: [cell("Force Majeure Event", { width: 2200, bold: true, fill: BG2 }), cell("Any event beyond the reasonable control of the Company, including without limitation acts of God, war, terrorism, civil disturbance, strikes, lock-outs, regulatory action, pandemic, internet or telecommunications outage, denial-of-service attack, and any outage, redesign, blocking, throttling or unavailability of any Third-Party Source.", { width: 7160 })] }),
  ]),

  pb(),
);

// ═════════════════════════════════════════════════════════════
// 1. PRIVACY POLICY
// ═════════════════════════════════════════════════════════════
children.push(
  h1("1.  Privacy Policy"),

  h2("1.1  Introduction"),
  p("This Privacy Policy explains how Naam Dekho collects, uses, stores, shares and protects the Personal Data of its Users. It is published pursuant to and in compliance with the Digital Personal Data Protection Act, 2023 (the \"DPDP Act\"), the Information Technology Act, 2000, and the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011."),
  p("This Privacy Policy forms an integral part of the Terms of Use set out in Part 2 of this document. The terms \"process\", \"processing\", \"Data Principal\" and \"Data Fiduciary\" shall have the meanings ascribed to them in the DPDP Act."),

  callout("Plain-language summary",
    "Free-tier searches collect almost nothing — only your IP address and the name you typed, both for a short period and only to fight abuse and improve service quality. Paid tiers collect your phone number, email and payment information so we can sign you in, charge you, and deliver your PDF report. We do not sell your data. We do not train models on your data. We store as little as possible, for as short as possible."),

  h2("1.2  Data we collect"),
  h3("1.2.1  Personal Data collected automatically"),
  bullet("Internet Protocol (IP) address of the device making the request."),
  bullet("Browser type, operating system, device type and screen resolution."),
  bullet("Referring URL, page navigation timestamps, and clickstream data within the Platform."),
  bullet("Approximate geographic location derived from IP address (city / state granularity)."),
  bullet("Cookie identifiers as described in the Cookies Policy in Part 3 of this document."),

  h3("1.2.2  Personal Data provided by the User"),
  bullet("The proposed business or baby name being checked (\"Search Input\")."),
  bullet("Optional industry/category indicator submitted by the User."),
  bullet("Phone number — required for sign-in to the Paid Tiers, captured by Firebase Authentication or our SMS provider via one-time-password (OTP) verification."),
  bullet("Email address — captured at sign-in or for receipt and PDF delivery."),
  bullet("Display name, profile image (if voluntarily provided)."),
  bullet("Payment metadata — gateway transaction identifier, amount, time, status. We do NOT store card numbers, CVV, UPI handles, account numbers, or full bank details; those are tokenised and held by Razorpay or Paytm Payment Services Private Limited (as applicable) in compliance with the Reserve Bank of India's directions on card-data storage."),
  bullet("For Agency leads: name, role, company name, firm type, work email, phone, expected monthly volume, monthly budget range, and any free-text notes submitted via the agency contact form."),
  bullet("Communications between the User and our support, partnerships or grievance teams (including the contents of emails, chats and call recordings, where lawful)."),

  h3("1.2.3  Personal Data we do NOT collect"),
  bullet("We do not knowingly collect Personal Data of children. Baby mode is a tool for parents/guardians and the names input therein are not associated with any identifiable child held by us. No date of birth, photograph, school, address, biometric or health information of a child is collected, requested or stored."),
  bullet("We do not collect financial-account, biometric, genetic, sexual-orientation, religion, political-belief, criminal-record or trade-union data (i.e. the categories ordinarily described as \"sensitive personal data\")."),
  bullet("Search Inputs submitted in the Free Tier are not associated with a User identity beyond the IP address; we do not build profiles on Free-Tier Users."),

  h2("1.3  Why we collect and how we use Personal Data"),
  p("We process Personal Data only for the following specified, explicit and legitimate purposes. For each purpose we identify the lawful basis under the DPDP Act:"),
  wideTable([3500, 2900, 2960], [
    new TableRow({ children: [headerCell("Purpose", 3500), headerCell("Categories of data used", 2900), headerCell("Lawful basis (DPDP Act §6 / §7)", 2960)] }),
    new TableRow({ children: [cell("Performing the requested search and returning a verdict", { width: 3500 }), cell("Search Input, optional industry, IP address", { width: 2900 }), cell("Performance of the requested service / Consent at the point of search", { width: 2960 })] }),
    new TableRow({ children: [cell("Sign-in to Paid Tiers via OTP", { width: 3500 }), cell("Phone, email, OTP, device id", { width: 2900 }), cell("Consent (specific to sign-in) — DPDP §6", { width: 2960 })] }),
    new TableRow({ children: [cell("Payment processing and GST invoicing", { width: 3500 }), cell("Phone, email, payment metadata, GSTIN (if provided)", { width: 2900 }), cell("Performance of contract / Statutory compliance — DPDP §7(b), §7(g)", { width: 2960 })] }),
    new TableRow({ children: [cell("Delivery of PDF report by email or download link", { width: 3500 }), cell("Phone or email, scan_id, R2 object key", { width: 2900 }), cell("Performance of contract", { width: 2960 })] }),
    new TableRow({ children: [cell("Customer support and grievance handling", { width: 3500 }), cell("Whatever the User shares while reporting an issue", { width: 2900 }), cell("Legitimate purposes — DPDP §7(i)", { width: 2960 })] }),
    new TableRow({ children: [cell("Fraud, abuse and rate-limit enforcement", { width: 3500 }), cell("IP address, device fingerprint, request patterns", { width: 2900 }), cell("Legitimate purposes — DPDP §7(i)", { width: 2960 })] }),
    new TableRow({ children: [cell("Service quality and aggregate analytics", { width: 3500 }), cell("De-identified or aggregated event logs", { width: 2900 }), cell("Legitimate purposes — DPDP §7(i) (no Personal Data after aggregation)", { width: 2960 })] }),
    new TableRow({ children: [cell("Communications about the User's transactions, account changes, security alerts and policy updates", { width: 3500 }), cell("Phone, email, account history", { width: 2900 }), cell("Performance of contract / Legitimate purposes", { width: 2960 })] }),
    new TableRow({ children: [cell("Marketing communications about new features", { width: 3500 }), cell("Email, name, tier", { width: 2900 }), cell("Consent (opt-in only, with clear opt-out)", { width: 2960 })] }),
    new TableRow({ children: [cell("Agency lead-generation and call-back", { width: 3500 }), cell("Agency contact form submissions", { width: 2900 }), cell("Consent (form-submission)", { width: 2960 })] }),
    new TableRow({ children: [cell("Legal compliance, regulator response, court orders", { width: 3500 }), cell("Whatever is lawfully called for", { width: 2900 }), cell("Statutory compliance — DPDP §7(g)", { width: 2960 })] }),
  ]),

  pb(),

  h2("1.4  How we share Personal Data"),
  p("We do not sell, rent, lease or trade Personal Data. We share Personal Data only with the following limited categories of recipients, each of whom is contractually bound to use the data solely for the purposes for which we shared it:"),
  bullet("Payment processors — Razorpay (Razorpay Software Private Limited) as the primary gateway and Paytm Payment Services Private Limited as the fallback gateway, for processing payments. Both are regulated entities under the Payment and Settlement Systems Act, 2007 and the Reserve Bank of India's directions on data storage of payment-system data."),
  bullet("Authentication providers — Google LLC (Firebase Authentication) and/or MSG91 Communication Private Limited for SMS/WhatsApp OTP delivery. These providers process phone numbers strictly to deliver and verify the OTP."),
  bullet("Infrastructure providers — Amazon Web Services India Private Limited (managed PostgreSQL, S3); Cloudflare, Inc. (edge, DNS, R2 storage, Pages); Hetzner Online GmbH (compute). Personal Data stored with these providers is encrypted at rest."),
  bullet("Observability and security vendors — Sentry, Grafana Labs, Better Stack for error monitoring and logging. Logs are scrubbed of Personal Data wherever feasible."),
  bullet("Professional advisors — chartered accountants, lawyers and auditors retained by the Company, bound by professional confidentiality obligations."),
  bullet("Law-enforcement and regulatory authorities — only upon lawful order, request or compulsion, and only to the extent so required."),
  bullet("Successors in interest — in the event of a merger, acquisition, reorganisation, sale of assets, or insolvency event of the Company, Personal Data may be transferred to the successor entity, which shall be bound by terms no less protective than this Privacy Policy."),

  h2("1.5  Third-Party Sources are not data recipients"),
  p("It is important to note that when the Platform performs a check against a Third-Party Source (for example, the MCA21 portal), no Personal Data of the User is transmitted to that source. The query consists only of the Search Input — i.e. the proposed name string itself — together with any technical headers necessary for the request. The User's identity remains private to the Platform."),

  h2("1.6  Cross-border data transfers"),
  p("Some of our infrastructure providers operate data-processing facilities outside India. To the extent that Personal Data is processed in a foreign jurisdiction, such processing shall be undertaken in compliance with Section 16 of the DPDP Act and any notification issued thereunder by the Central Government. We give preference to providers offering India-region data residency (such as AWS Mumbai, Cloudflare's APAC nodes) for the storage of Personal Data."),

  h2("1.7  Data retention"),
  p("We retain Personal Data only for as long as is necessary for the purposes for which it was collected, or as required by Applicable Laws. The following retention periods apply:"),
  wideTable([3500, 2900, 2960], [
    new TableRow({ children: [headerCell("Category", 3500), headerCell("Retention period", 2900), headerCell("Reason", 2960)] }),
    new TableRow({ children: [cell("Free-Tier Search Inputs (anonymous)", { width: 3500 }), cell("Hashed within 30 days; raw data deleted thereafter", { width: 2900 }), cell("Abuse detection, then irreversibly anonymised", { width: 2960 })] }),
    new TableRow({ children: [cell("User account data (phone, email, name)", { width: 3500 }), cell("Until account deletion + 90 days backup grace", { width: 2900 }), cell("Account access, customer support", { width: 2960 })] }),
    new TableRow({ children: [cell("Scan history of paid scans", { width: 3500 }), cell("3 years from the date of payment", { width: 2900 }), cell("Income-tax and GST records", { width: 2960 })] }),
    new TableRow({ children: [cell("Payment records and invoices", { width: 3500 }), cell("8 years (Section 36, CGST Act read with Rule 56)", { width: 2900 }), cell("Statutory requirement", { width: 2960 })] }),
    new TableRow({ children: [cell("PDF report objects on R2/S3", { width: 3500 }), cell("12 months from generation", { width: 2900 }), cell("User download convenience", { width: 2960 })] }),
    new TableRow({ children: [cell("Server logs (raw, with IP)", { width: 3500 }), cell("90 days", { width: 2900 }), cell("Section 67C, Information Technology Act — intermediaries", { width: 2960 })] }),
    new TableRow({ children: [cell("Agency lead-form submissions", { width: 3500 }), cell("24 months or until conversion / lapse", { width: 2900 }), cell("Sales lifecycle", { width: 2960 })] }),
    new TableRow({ children: [cell("Customer-support tickets and recordings", { width: 3500 }), cell("18 months", { width: 2900 }), cell("Quality assurance, training, dispute resolution", { width: 2960 })] }),
  ]),

  h2("1.8  Your rights as a Data Principal"),
  p("Under Chapter III of the DPDP Act, every Data Principal whose Personal Data is processed by us has the following rights, which we honour through dedicated channels:"),
  bullet("Right to obtain information about the categories of Personal Data being processed, the identities of Data Fiduciaries with whom such data has been shared, and a description of such Personal Data — Section 11, DPDP Act."),
  bullet("Right to correction, completion, updating and erasure of Personal Data which is inaccurate, incomplete or no longer necessary — Section 12."),
  bullet("Right to nominate any other individual to exercise the rights of the Data Principal in the event of the Data Principal's death or incapacity — Section 13."),
  bullet("Right of grievance redressal — Section 14."),
  bullet("Right to withdraw any consent previously given, at any time — Section 6(4) read with Section 6(6)."),
  bullet("To exercise any of the foregoing rights, please write to our Grievance Officer at the address set out in §1.13 below. We shall acknowledge receipt within 48 hours and respond substantively within 30 days, except where a longer period is permitted by law."),

  h2("1.9  Security of Personal Data"),
  p("We implement reasonable security practices commensurate with the nature, scope, context and purposes of the processing, in line with Rule 8 of the IT Rules, 2011 and Section 8(5) of the DPDP Act. Specific safeguards include:"),
  bullet("Transport-layer security — TLS 1.3 across all User-facing endpoints, HSTS, secure cookies, content-security policies."),
  bullet("At-rest encryption — AES-256 server-side encryption for the database (PostgreSQL), object storage (R2/S3) and full-disk encryption for compute instances."),
  bullet("Column-level encryption (pgcrypto) for phone and email columns; payment data tokenised and held by the gateways."),
  bullet("Role-based access control with least-privilege principle, multi-factor authentication for engineering and support staff, hardware-key requirements for production console access."),
  bullet("Network segmentation, virtual private clouds, security groups, and bastion-hosted SSH access only."),
  bullet("Quarterly third-party penetration testing, continuous dependency vulnerability scanning, mandatory secure-code-review for all production changes."),
  bullet("Incident-response plan with 72-hour notification to the Data Protection Board of India in the event of a personal-data breach, as required by Section 8(6) of the DPDP Act."),

  h2("1.10  Cookies and tracking technologies"),
  p("The Platform uses cookies and similar tracking technologies, as described in detail in Part 3 (Cookies Policy) below."),

  h2("1.11  Children's data"),
  p("The Platform is not directed at children under the age of eighteen (18), and we do not knowingly process the Personal Data of any child. Baby mode is intended for use by parents and guardians of newborns and minor children; the only data collected through Baby mode is the proposed name, which is not associated with any identifiable child. If a parent or guardian believes that we have inadvertently collected information that could identify a minor, they may write to our Grievance Officer at the address set out in §1.13 and we shall promptly delete such information."),

  h2("1.12  Updates to this Privacy Policy"),
  p("We may update this Privacy Policy from time to time to reflect changes in our practices, in our services, or in Applicable Laws. The Effective Date at the top of this document indicates when the policy was last updated. Material changes will be communicated to registered Users by email and through a prominent in-Platform notice. Continued use of the Platform after an updated policy comes into effect constitutes acceptance of the updated policy."),

  h2("1.13  Grievance Officer and Data Protection Officer"),
  p("Pursuant to Rule 5(9) of the IT Rules, 2011 and Section 8(9) of the DPDP Act, the following individual has been designated as the Grievance Officer of Naam Dekho:"),
  bullet("Name: [To be filled by the Company]"),
  bullet("Designation: Grievance Officer & Data Protection Officer"),
  bullet("Email: grievance@naamdekho.in"),
  bullet("Postal address: [Registered address of the Company, to be inserted]"),
  bullet("Phone (working hours, Monday–Friday, 10:00–18:00 IST): [To be inserted]"),
  bullet("Acknowledgement of receipt: within 48 hours. Substantive response: within 30 days from the date of receipt."),

  pb(),
);

// ═════════════════════════════════════════════════════════════
// 2. TERMS OF USE / USER POLICY
// ═════════════════════════════════════════════════════════════
children.push(
  h1("2.  Terms of Use (User Policy)"),

  h2("2.1  Acceptance of Terms"),
  p("These Terms of Use (\"Terms\") constitute a legally binding agreement between the User and Naam Dekho Technologies Private Limited. By accessing, browsing, registering on, or transacting upon the Platform, the User signifies unconditional acceptance of, and agrees to be bound by, these Terms, together with the Privacy Policy (Part 1), the Cookies Policy (Part 3), the Cancellation & Refund Policy (Part 4), and any additional terms posted on specific Platform pages from time to time."),
  p("These Terms are an electronic record within the meaning of Section 2(t) of the Information Technology Act, 2000, generated by computer system and not requiring any physical or digital signature in terms of Section 10A of the said Act."),

  h2("2.2  Eligibility"),
  bullet("Use of the Platform is permitted only to persons competent to contract within the meaning of the Indian Contract Act, 1872. Persons below the age of eighteen (18) years, undischarged insolvents, and persons of unsound mind may not transact upon Paid Tiers."),
  bullet("Use of the Platform by a User who is a juridical person (company, LLP, partnership, association, etc.) shall be construed as use by the authorised representative of such juridical person, who shall be deemed to have warranted the authority to bind the said juridical person."),
  bullet("Baby mode is intended for use only by parents, guardians or family elders of the child being named. No User may use Baby mode to research, compile, profile, market to, or identify any minor without the consent of the minor's parent or guardian."),
  bullet("Use of the Platform from any jurisdiction in which such use would be unlawful is expressly prohibited."),

  h2("2.3  Account registration and authentication"),
  bullet("The Free Tier may be used without account registration."),
  bullet("Paid Tiers require sign-in via phone-number-based one-time-password (OTP) authentication. The User warrants that the phone number supplied is lawfully held by the User."),
  bullet("The User is solely responsible for maintaining the confidentiality of access to the phone number, SIM, and OTP, and for all activity occurring under the User's account. The Company shall not be liable for any loss, damage or unauthorised access arising from the User's failure to maintain such confidentiality."),
  bullet("Each natural person may hold one account. Each agency or organisation may hold one organisational account."),

  h2("2.4  Scope and nature of the service"),

  callout("Critical disclosure",
    "Naam Dekho is a decision-support tool. The Results presented by the Platform are informational in nature and are NOT a substitute for legal, tax, accounting or naming consultancy advice. The User must consult a qualified professional — a chartered accountant, an advocate enrolled under the Advocates Act, 1961, a trademark agent, a registered numerologist or a naming consultant — before taking any binding step such as incorporation, trademark filing, domain purchase, brand-launch or formal naming of a child."),

  p("The Platform performs queries against publicly available data sources and traditional naming systems, and consolidates the results. The Platform does not:"),
  bullet("File any application, return, registration or document with any Government authority on behalf of the User."),
  bullet("Reserve, register or pay for any domain, trademark, social handle or company name."),
  bullet("Provide legal, tax, regulatory, financial or astrological advice."),
  bullet("Guarantee the registrability, distinctiveness or commercial success of any name."),
  bullet("Guarantee that a name found \"available\" today will remain available at a future point in time, or that a name found \"taken\" today will not be released at a future point in time."),

  h2("2.5  Third-Party Sources — disclaimers, delays and availability"),

  callout("This section is critical to your understanding of the service",
    "The Platform's output depends entirely on the availability, accuracy and responsiveness of Third-Party Sources. We do not control these sources. We do not guarantee that any source will be available at the time of your search, or that any source's data will be accurate, current or complete."),

  p("Without limiting the generality of the foregoing, the User acknowledges and accepts the following:"),

  h3("2.5.1  Source unavailability and downtime"),
  bullet("Government portals (MCA21, IP India, Copyright, GST, FSSAI, DPIIT and others) routinely experience scheduled and unscheduled downtime, redesigns, blocking of automated access, throttling, CAPTCHA challenges, infrastructure migrations and policy changes. We have no advance notice of, and no influence over, any such event."),
  bullet("Domain registries, registrars and WHOIS servers experience similar outages and rate-limiting."),
  bullet("Social-media platforms unilaterally and frequently change their public API contracts, terms of service, rate limits, authentication mechanisms and the data they expose."),
  bullet("Application marketplaces and brand registries similarly change their data formats, search indices and access policies."),
  bullet("When any source is unavailable, slow, returning errors, or has changed its format such that automated parsing fails, the corresponding tile on the User's result page shall display the status \"Checking…\", \"Pending\" or \"Source temporarily unavailable\", and the verdict shall be computed as if that source returned no result."),

  h3("2.5.2  Delays in result delivery"),
  bullet("The target time-to-verdict for a Free-Tier search is approximately four (4) seconds. The target time-to-verdict for a Deep Legal Scan is approximately forty (40) seconds. These are best-effort targets, not service-level guarantees."),
  bullet("Actual delivery time will vary based on the responsiveness of the Third-Party Sources being queried, network conditions, CAPTCHA solving latency, and platform load. Delays may extend to several minutes or, in exceptional cases involving widespread source outages, may result in incomplete delivery."),
  bullet("A delay or failure attributable wholly or in substantial part to any Third-Party Source shall not constitute a deficiency in service within the meaning of the Consumer Protection Act, 2019, and shall not entitle the User to any refund or compensation, save as expressly provided in the Cancellation & Refund Policy in Part 4 of this document."),

  h3("2.5.3  Accuracy of source data"),
  bullet("The data returned by Third-Party Sources is presented by us to the User in substantially the same form in which it was returned. We do not verify, audit or independently corroborate the contents of source databases."),
  bullet("Government registers are notoriously imperfect — they contain typographical errors, stale entries (e.g. companies struck off but still indexed), missing entries (e.g. recently filed trademarks not yet in the search index), and conflicting entries (e.g. names registered with multiple registries simultaneously)."),
  bullet("A search returning \"No conflict\" today does not exempt the User from the obligation to perform a formal pre-incorporation or pre-filing search with the relevant authority before taking any binding step."),

  h2("2.6  No warranty"),
  p("The Platform is provided on an \"as-is\" and \"as-available\" basis. To the maximum extent permitted by Applicable Laws, the Company expressly disclaims all warranties, conditions, representations and undertakings of any kind, whether express, implied, statutory or otherwise, including without limitation:"),
  bullet("Warranties of merchantability, fitness for a particular purpose, title and non-infringement."),
  bullet("Warranties that the Platform will be uninterrupted, error-free, timely, secure, or virus-free."),
  bullet("Warranties as to the accuracy, completeness, reliability, currency or non-misleading nature of any Result."),
  bullet("Warranties that any name found \"available\" by the Platform is registrable, distinctive, or free from objection by any third party or any examiner."),
  bullet("Warranties that the Chaldean numerology reading, the linguistic-landmine detection, or any other interpretive layer of the Platform will produce outcomes that the User finds favourable, accurate or consistent with traditional consultation."),

  h2("2.7  Limitation of liability"),

  callout("Maximum aggregate liability cap",
    "The Company's total aggregate liability arising out of or relating to the Platform, regardless of the form of action or the theory of liability, shall not in any event exceed the higher of (a) the aggregate fees paid by the User to the Company in the three (3) months immediately preceding the event giving rise to the claim, or (b) Indian Rupees One Thousand (₹1,000)."),

  p("Without limiting the foregoing, the Company shall not be liable for any:"),
  bullet("Indirect, special, incidental, consequential, exemplary or punitive damages of any kind, including loss of profits, loss of revenue, loss of business, loss of goodwill, loss of opportunity, loss of brand value, cost of rebranding, loss of customers, or loss of any business contract."),
  bullet("Damage suffered by the User on account of having relied on a Result that subsequently proved to be incomplete, stale or inaccurate, where such incompleteness, staleness or inaccuracy was attributable wholly or in part to a Third-Party Source."),
  bullet("Damage suffered by the User on account of any delay in the delivery of a Result, where such delay was attributable wholly or in part to a Third-Party Source or to a Force Majeure Event."),
  bullet("Damage suffered by the User on account of having proceeded with an incorporation, trademark filing, domain purchase, brand launch or formal naming of a child without first consulting a qualified professional."),
  bullet("Damage suffered by the User on account of the unauthorised access to or use of the User's account due to the User's failure to safeguard authentication credentials."),

  p("Nothing in this clause shall exclude or limit the Company's liability for: (a) death or personal injury caused by the Company's negligence; (b) fraud or fraudulent misrepresentation by the Company; or (c) any other liability which cannot lawfully be excluded or limited under Applicable Laws."),

  h2("2.8  User obligations and prohibited conduct"),
  p("The User undertakes that the User shall not, and shall not permit any third party to:"),
  bullet("Use the Platform in violation of any Applicable Laws or these Terms."),
  bullet("Use the Platform for any unlawful purpose, including the harassment, defamation, impersonation or doxxing of any person."),
  bullet("Use any automated means (including scrapers, bots, crawlers, spiders or scripts) to access the Platform, except where such access is performed under a written Agency / API agreement with the Company."),
  bullet("Probe, scan, test the vulnerability of, or breach the security or authentication measures of, the Platform."),
  bullet("Reverse-engineer, decompile, disassemble or attempt to derive the source code of any portion of the Platform."),
  bullet("Submit Search Inputs containing obscene, defamatory, racially or religiously offensive, or otherwise unlawful content."),
  bullet("Use the Platform's data, Results or PDF reports for any purpose other than the User's own bona fide name-evaluation purpose; in particular, the bulk redistribution, resale or use of Results for the construction of a competing service is expressly prohibited."),
  bullet("Use the Platform to conduct any prohibited or restricted activity, including in connection with money-laundering, terrorist financing, fraud or any criminal offence."),
  bullet("Interfere with the proper operation of the Platform by any means including the introduction of malicious code, the conduct of denial-of-service attacks, or the exploitation of any vulnerability."),

  h2("2.9  Intellectual property"),
  bullet("All intellectual property in the Platform — including without limitation the source code, the user interface design, the editorial content, the proprietary process flow, the Chaldean numerology engine and industry-fit overlay, the linguistic-landmine detection methodology, the brand, the trademarks, the trade dress and the documentation set — is the exclusive property of the Company, protected under the Copyright Act, 1957, the Trade Marks Act, 1999 and the Designs Act, 2000. All rights are reserved."),
  bullet("No portion of the Platform may be reproduced, distributed, modified, displayed, performed, published, communicated to the public, adapted or commercially exploited without the prior written consent of the Company, except (i) for the User's own non-commercial reference, (ii) for use of a single downloaded PDF report by the User and the User's professional advisor, and (iii) for any use expressly permitted by Applicable Laws."),
  bullet("Third-party trademarks referenced on the Platform are the property of their respective owners and are used only for the purpose of identifying the registers and platforms being searched, on a nominative-fair-use basis."),

  h2("2.10  User content and licence"),
  p("The User retains all rights in any content (Search Inputs, agency-form text, support messages) that the User submits to the Platform (\"User Content\"). The User grants to the Company a worldwide, royalty-free, non-exclusive, sublicensable and transferable licence to use, reproduce, modify, adapt, publish, translate, distribute and display the User Content solely to the extent necessary for the operation of the Platform, the delivery of the requested service, the production of de-identified statistics, and compliance with Applicable Laws."),

  h2("2.11  Indemnification"),
  p("The User shall indemnify, defend and hold harmless the Company, its directors, officers, employees, contractors and agents from and against any and all claims, demands, suits, proceedings, damages, losses, costs and expenses (including reasonable attorneys' fees) arising out of or in connection with: (a) the User's use of the Platform in violation of these Terms or Applicable Laws; (b) the User's submission of unlawful or infringing User Content; (c) the User's negligent or wrongful conduct; (d) any third-party claim against the Company that arises from such use, submission or conduct."),

  h2("2.12  Service availability, modifications and suspension"),
  bullet("The Platform is generally available 24x7, but the Company gives no warranty of uninterrupted availability. The Platform may be temporarily unavailable due to scheduled maintenance, unscheduled outages, infrastructure failure, third-party-dependency outage or Force Majeure Event."),
  bullet("The Company reserves the right to modify, suspend or discontinue any feature of the Platform at any time, with or without notice."),
  bullet("The Company reserves the right to suspend or terminate the access of any User who, in the Company's reasonable opinion, is in breach of these Terms, or whose conduct poses a security or reputational risk to the Platform."),

  h2("2.13  Force Majeure"),
  p("Neither party shall be liable for any failure or delay in the performance of any obligation under these Terms to the extent that such failure or delay is caused by a Force Majeure Event. The affected party shall give the other party prompt notice of the Force Majeure Event and shall use reasonable efforts to mitigate its effects. If a Force Majeure Event continues for more than thirty (30) consecutive days, either party may terminate the affected service by written notice."),

  h2("2.14  Governing law and dispute resolution"),
  bullet("These Terms shall be governed by and construed in accordance with the laws of the Republic of India, without regard to its conflict-of-laws principles."),
  bullet("Subject to the arbitration provision below, the courts at Bangalore, Karnataka shall have exclusive jurisdiction over all disputes arising out of or in connection with these Terms."),
  bullet("Any dispute, controversy or claim arising out of or in connection with these Terms, or the breach, termination or invalidity thereof, shall first be attempted to be resolved amicably through good-faith negotiation between the parties within thirty (30) days."),
  bullet("If amicable resolution fails, the dispute shall be referred to and finally resolved by arbitration in accordance with the Arbitration and Conciliation Act, 1996, by a sole arbitrator appointed by the Company. The seat and venue of arbitration shall be Bangalore. The language of the arbitration shall be English. The arbitral award shall be final and binding on the parties."),

  h2("2.15  Notices"),
  bullet("Notices to the Company shall be in writing and shall be sent to legal@naamdekho.in (with a copy to grievance@naamdekho.in for Personal-Data matters) or to the registered office address of the Company."),
  bullet("Notices to the User shall be sent to the email address or phone number associated with the User's account, or where no account exists, by posting on the Platform."),

  h2("2.16  Severability and waiver"),
  p("If any provision of these Terms is held to be invalid, illegal or unenforceable by a court of competent jurisdiction, such provision shall be severed and the remaining provisions shall continue in full force and effect. The failure of either party to enforce any provision of these Terms shall not constitute a waiver of that or any other provision."),

  h2("2.17  Entire agreement"),
  p("These Terms, together with the Privacy Policy, the Cookies Policy, the Cancellation & Refund Policy and any tier-specific additional terms, constitute the entire agreement between the User and the Company in respect of the Platform, and supersede all prior agreements, communications and representations."),

  pb(),
);

// ═════════════════════════════════════════════════════════════
// 3. COOKIES POLICY
// ═════════════════════════════════════════════════════════════
children.push(
  h1("3.  Cookies Policy"),

  h2("3.1  What are cookies"),
  p("A \"cookie\" is a small text file that a website places on the User's browser or device. Cookies allow the website to recognise the User on subsequent visits, remember the User's preferences, and enable certain functionality. Some cookies expire at the end of the browsing session (\"session cookies\"); others persist for a defined period (\"persistent cookies\")."),
  p("Similar tracking technologies (which we collectively refer to as \"cookies\" throughout this policy for simplicity) include: HTML5 local storage, IndexedDB, web beacons / pixel tags, and device fingerprinting."),

  h2("3.2  Categories of cookies we use"),

  h3("3.2.1  Strictly Necessary cookies"),
  p("These cookies are essential for the Platform to function. They are typically set in response to actions taken by the User which amount to a request for service, such as setting preferences, signing in, or filling in a form. They cannot be disabled without rendering the Platform substantially non-functional."),
  wideTable([2400, 2400, 2400, 2160], [
    new TableRow({ children: [headerCell("Cookie name", 2400), headerCell("Purpose", 2400), headerCell("Duration", 2400), headerCell("Set by", 2160)] }),
    new TableRow({ children: [cell("naamdekho-mode", { width: 2400 }), cell("Remembers Startup vs Baby mode selection", { width: 2400 }), cell("12 months", { width: 2400 }), cell("Naam Dekho (1st party)", { width: 2160 })] }),
    new TableRow({ children: [cell("nd_session", { width: 2400 }), cell("Sign-in session token (HttpOnly, Secure, SameSite=Lax)", { width: 2400 }), cell("Session / 30 days", { width: 2400 }), cell("Naam Dekho (1st party)", { width: 2160 })] }),
    new TableRow({ children: [cell("nd_csrf", { width: 2400 }), cell("Cross-Site Request Forgery protection token", { width: 2400 }), cell("Session", { width: 2400 }), cell("Naam Dekho (1st party)", { width: 2160 })] }),
    new TableRow({ children: [cell("__cf_bm", { width: 2400 }), cell("Cloudflare bot-management token", { width: 2400 }), cell("30 minutes", { width: 2400 }), cell("Cloudflare", { width: 2160 })] }),
    new TableRow({ children: [cell("rzp_*", { width: 2400 }), cell("Razorpay checkout session (set on checkout pages only)", { width: 2400 }), cell("Session", { width: 2400 }), cell("Razorpay", { width: 2160 })] }),
    new TableRow({ children: [cell("paytm_*", { width: 2400 }), cell("Paytm fallback gateway session (set on fallback checkout only)", { width: 2400 }), cell("Session", { width: 2400 }), cell("Paytm", { width: 2160 })] }),
  ]),

  h3("3.2.2  Functional cookies"),
  p("These cookies enable enhanced functionality and personalisation. They may be set by us or by third-party providers whose services we have added to our pages. If the User does not accept these cookies then some or all of these services may not function properly."),
  wideTable([2400, 2400, 2400, 2160], [
    new TableRow({ children: [headerCell("Cookie name", 2400), headerCell("Purpose", 2400), headerCell("Duration", 2400), headerCell("Set by", 2160)] }),
    new TableRow({ children: [cell("nd_last_search", { width: 2400 }), cell("Restores the last name searched, for convenience", { width: 2400 }), cell("30 days", { width: 2400 }), cell("Naam Dekho", { width: 2160 })] }),
    new TableRow({ children: [cell("nd_audience", { width: 2400 }), cell("Remembers pricing-page audience tab (founder / parent / agency)", { width: 2400 }), cell("3 months", { width: 2400 }), cell("Naam Dekho", { width: 2160 })] }),
    new TableRow({ children: [cell("nd_theme", { width: 2400 }), cell("Light / dark theme preference (future feature)", { width: 2400 }), cell("12 months", { width: 2400 }), cell("Naam Dekho", { width: 2160 })] }),
  ]),

  h3("3.2.3  Analytics & Performance cookies"),
  p("These cookies allow us to count visits and traffic sources, so we can measure and improve the performance of our Platform. They help us know which pages are the most and least popular and see how visitors move around the site. All information collected by these cookies is aggregated."),
  wideTable([2400, 2400, 2400, 2160], [
    new TableRow({ children: [headerCell("Cookie name", 2400), headerCell("Purpose", 2400), headerCell("Duration", 2400), headerCell("Set by", 2160)] }),
    new TableRow({ children: [cell("_pk_id.*", { width: 2400 }), cell("Self-hosted Plausible / Matomo visitor analytics", { width: 2400 }), cell("13 months", { width: 2400 }), cell("Naam Dekho (self-hosted)", { width: 2160 })] }),
    new TableRow({ children: [cell("_pk_ses.*", { width: 2400 }), cell("Self-hosted analytics session", { width: 2400 }), cell("30 minutes", { width: 2400 }), cell("Naam Dekho (self-hosted)", { width: 2160 })] }),
    new TableRow({ children: [cell("nd_perf", { width: 2400 }), cell("Real-user performance metrics (Web Vitals)", { width: 2400 }), cell("24 hours", { width: 2400 }), cell("Naam Dekho", { width: 2160 })] }),
  ]),

  h3("3.2.4  Marketing cookies (optional, only with consent)"),
  p("These cookies may be set through our site by our advertising or marketing partners. They may be used by those companies to build a profile of the User's interests and show relevant advertisements on other sites. We will not set marketing cookies without the User's explicit opt-in consent via the cookie consent banner."),
  wideTable([2400, 2400, 2400, 2160], [
    new TableRow({ children: [headerCell("Cookie name", 2400), headerCell("Purpose", 2400), headerCell("Duration", 2400), headerCell("Set by", 2160)] }),
    new TableRow({ children: [cell("_fbp", { width: 2400 }), cell("Meta (Facebook) advertising conversion measurement", { width: 2400 }), cell("3 months", { width: 2400 }), cell("Meta — only with consent", { width: 2160 })] }),
    new TableRow({ children: [cell("_gcl_au", { width: 2400 }), cell("Google Ads conversion measurement", { width: 2400 }), cell("3 months", { width: 2400 }), cell("Google — only with consent", { width: 2160 })] }),
  ]),

  h2("3.3  Cookie consent and management"),
  bullet("On the User's first visit to the Platform, a cookie-consent banner is presented. The User may (a) accept all cookies, (b) reject all non-essential cookies, or (c) customise category-level consent."),
  bullet("The User's choice is itself stored in a strictly-necessary cookie (nd_cookie_consent) for twelve (12) months, after which the User is re-prompted."),
  bullet("The User may revoke or modify consent at any time by clicking the \"Cookie settings\" link in the Platform footer."),
  bullet("Strictly-necessary cookies cannot be disabled through this mechanism; the User may disable them through the User's browser settings, but this will likely render the Platform non-functional."),

  h2("3.4  Browser-level controls"),
  p("Most modern browsers allow the User to view, manage, delete and block cookies. Please refer to the following help pages for instructions:"),
  bullet("Google Chrome — https://support.google.com/chrome/answer/95647"),
  bullet("Mozilla Firefox — https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer"),
  bullet("Apple Safari — https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac"),
  bullet("Microsoft Edge — https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"),
  p("Please note that disabling cookies, particularly strictly-necessary cookies, may impair or prevent the use of the Platform."),

  h2("3.5  Do Not Track signals"),
  p("Some browsers transmit \"Do Not Track\" signals to websites. As there is no consensus industry interpretation of Do Not Track signals, we do not respond to them at present. The User retains all controls described in §3.3 and §3.4."),

  h2("3.6  Updates to this Cookies Policy"),
  p("We may update this Cookies Policy from time to time. The Effective Date at the top of this document indicates when the policy was last updated. We will re-prompt for consent if our use of cookies materially expands."),

  pb(),
);

// ═════════════════════════════════════════════════════════════
// 4. CANCELLATION & REFUND POLICY
// ═════════════════════════════════════════════════════════════
children.push(
  h1("4.  Cancellation and Refund Policy"),

  h2("4.1  General principles"),
  p("This Cancellation and Refund Policy applies to all transactions concluded upon the Platform. It is drafted in accordance with the Consumer Protection Act, 2019, the Consumer Protection (E-Commerce) Rules, 2020, and the directions of the Reserve Bank of India applicable to digital-payment refunds."),
  p("The User is encouraged to read this policy in full before initiating any paid transaction."),

  h2("4.2  Tier-by-tier cancellation rules"),

  h3("4.2.1  Free Tier"),
  bullet("No charges apply; no cancellation or refund is necessary or available."),
  bullet("The User may cease using the Free Tier at any time."),

  h3("4.2.2  Deep Legal Scan (one-time payment of ₹49 per name)"),
  bullet("The Deep Legal Scan is a one-time, digital, immediately-delivered service. The User acknowledges that, upon successful payment and initiation of the scan, the service is deemed performed once results are streamed and the PDF is generated."),
  bullet("Refund eligibility: a full refund is available where the User submits a refund request within twenty-four (24) hours of the scan's completion, provided that (i) the PDF report has not been downloaded more than three (3) times, and (ii) the User does not request a refund on the basis of a delay attributable wholly or substantially to a Third-Party Source."),
  bullet("Where the User submits a refund request after twenty-four (24) hours, or where the PDF has been downloaded more than three (3) times, refunds are at the sole discretion of the Company and are typically not granted."),
  bullet("Where the scan itself materially failed (e.g., the Company's orchestrator was non-functional for the entire duration of the attempted scan, and not a Third-Party Source issue), a full refund is granted automatically upon written request."),

  h3("4.2.3  Keepsake PDF Report (one-time payment of ₹29 per name — Baby mode)"),
  bullet("Refund eligibility: a full refund is available where the User submits a refund request within twenty-four (24) hours of generation, provided that the PDF has not been downloaded more than once."),
  bullet("Where the PDF generation itself failed (e.g., file is corrupt or empty), a full refund is granted automatically upon written request."),

  h3("4.2.4  Shortlist of Five (one-time payment of ₹99 per set — Baby mode)"),
  bullet("Refund eligibility: same as the Keepsake PDF Report, with a download-count threshold of two (2)."),
  bullet("Partial refunds for individual names within a shortlist are not offered."),

  h3("4.2.5  Founder Pro (subscription of ₹499 per month)"),
  bullet("The User may cancel the subscription at any time. Cancellation takes effect at the end of the then-current billing cycle; no further charges shall be made thereafter."),
  bullet("Pro-rated refunds for unused portions of an already-paid month are available within seven (7) days of the first charge of the current billing cycle, provided that the User has consumed fewer than three (3) Deep Scans during that billing cycle."),
  bullet("Subsequent renewal cycles are not refundable on a pro-rata basis."),
  bullet("Auto-renewal can be disabled at any time from the User's account dashboard."),

  h3("4.2.6  Agency Tier (subscription or annual contract — price by quotation)"),
  bullet("Agency Tier subscriptions and contracts are governed by the master-service agreement (MSA) executed between the Company and the agency. The MSA shall set out the cancellation, refund, termination and renewal terms applicable to that agency."),
  bullet("Where there is any conflict between this policy and an executed MSA, the MSA shall prevail."),
  bullet("Where no MSA is in place and the agency has paid against an invoice, the refund terms applicable to Founder Pro shall apply by analogy, save that pro-rata refunds shall be available within fourteen (14) days."),

  h2("4.3  Delays attributable to Third-Party Sources — NOT eligible for refund"),

  callout("Important to understand",
    "The Company has performed substantial engineering and operational work to attempt your scan, regardless of whether a Third-Party Source returns timely results. The cost-of-goods of the scan is borne by the Company at the moment of dispatch. A refund will therefore not be granted on the ground that one or more Third-Party Sources were slow, unavailable or returned an unhelpful result, unless such failure was so widespread as to render the verdict materially incomplete."),

  bullet("\"Materially incomplete\" means: fewer than seventy percent (70%) of the platforms applicable to the User's mode returned a substantive (non-\"Checking\") response."),
  bullet("In such a materially-incomplete case, the User may either (a) re-run the scan at no additional cost within seven (7) days, or (b) request a full refund."),
  bullet("The Company's good-faith determination of \"materially incomplete\" shall be final, save that the User may escalate the determination through the dispute-resolution mechanism in §2.14."),

  h2("4.4  Payment-side failures"),
  bullet("Where a payment is debited from the User's bank account but the transaction status returned to the Platform is \"Failed\" or \"Pending\", no scan or service is rendered. The amount is auto-reversed by the payment gateway within typically three (3) to seven (7) working days. The User need not initiate any action; however, if the reversal does not appear within seven (7) working days, the User may write to support@naamdekho.in with the transaction reference."),
  bullet("Where the User has been charged twice for the same intended transaction (\"double debit\"), the duplicate charge shall be refunded in full within seven (7) working days of identification."),
  bullet("Where the payment gateway returns a chargeback initiated by the User (or by the User's card-issuing bank), the Company reserves the right to contest the chargeback on the basis of evidence of service delivery, and to suspend the User's account pending resolution."),

  h2("4.5  Refund mechanism"),
  bullet("Refunds are processed to the original instrument of payment. For UPI payments, refunds are credited to the same UPI handle. For card payments, refunds are credited to the same card; the time taken to reflect in the User's statement depends on the card-issuing bank (typically five (5) to ten (10) working days)."),
  bullet("Where the original instrument is no longer available (e.g., the card has been cancelled), the refund may be processed by bank transfer upon the User's request and against documentary proof of the original payment."),
  bullet("Refunds are not credited as Platform credits unless the User expressly elects this option."),
  bullet("Refunds are net of any applicable Goods and Services Tax (GST), which is also reversed in accordance with the CGST Act, 2017."),

  h2("4.6  Process to request a refund"),
  numItem("Write to refunds@naamdekho.in from the email associated with the account (or, for Free-Tier transactions, from the email used at the time of payment)."),
  numItem("Include in the email: (a) the scan ID or transaction ID, (b) the date of payment, (c) the reason for the refund request, (d) any supporting screenshots."),
  numItem("Acknowledgement of receipt: within forty-eight (48) hours. Substantive decision: within seven (7) working days. Credit to original instrument: within five (5) to ten (10) working days from decision, depending on instrument and bank."),
  numItem("Disputed refund decisions may be escalated by writing to grievance@naamdekho.in. The grievance redressal mechanism set out in §1.13 above shall apply."),

  h2("4.7  Fraud and abuse"),
  bullet("The Company reserves the right to deny refunds where, in its reasonable opinion, the refund request is fraudulent, abusive, or part of a pattern of repeated unjustified refund requests."),
  bullet("Where the Company suspects fraud, it may suspend the User's account pending investigation, and may report the matter to law-enforcement authorities."),

  pb(),
);

// ═════════════════════════════════════════════════════════════
// 5. PAYMENT TERMS (Razorpay + Paytm fallback)
// ═════════════════════════════════════════════════════════════
children.push(
  h1("5.  Payment Terms — Razorpay (primary) and Paytm (fallback)"),

  h2("5.1  Payment gateways"),
  p("All payments on the Platform are processed by third-party payment gateways. The Company itself does not handle, hold or store any payment-instrument data save the transaction metadata returned by the gateway."),
  bullet("Primary gateway: Razorpay (Razorpay Software Private Limited), a Payment Aggregator licensed by the Reserve Bank of India under the Guidelines on Regulation of Payment Aggregators and Payment Gateways dated 17 March 2020."),
  bullet("Fallback gateway: Paytm Payment Services Private Limited, also a Reserve-Bank-of-India-licensed Payment Aggregator. The fallback gateway is invoked automatically by the Platform in the event that the primary gateway is unavailable, returns an unrecoverable error, or rejects the User's instrument."),
  bullet("The User shall be clearly informed on the checkout page which gateway is being used for any given transaction. The User may, at the User's discretion, refresh the checkout page to retry on the primary gateway."),

  h2("5.2  Supported payment methods"),
  bullet("Unified Payments Interface (UPI) — including PhonePe, Google Pay, Paytm, Cred, and any other UPI-enabled application."),
  bullet("Debit and credit cards — Visa, Mastercard, Maestro, RuPay, American Express (subject to issuing-bank approval)."),
  bullet("Net Banking from over fifty (50) Indian banks."),
  bullet("Wallets — Paytm Wallet, PhonePe Wallet, Mobikwik, Amazon Pay, others as enabled by the gateway."),
  bullet("EMI on supported credit cards (for amounts above ₹2,000)."),
  bullet("International cards (Visa, Mastercard) for users transacting from outside India — subject to gateway support and applicable currency-conversion margins charged by the User's bank."),

  h2("5.3  Currency, GST and invoicing"),
  bullet("All prices displayed on the Platform are in Indian Rupees (₹ / INR) and are inclusive of Goods and Services Tax (GST) at the applicable rate."),
  bullet("For User-supplied Indian GSTIN, an invoice complying with the CGST Rules, 2017 (Form GST INV-1) shall be generated and emailed to the User within five (5) minutes of the successful transaction."),
  bullet("For Users without a GSTIN, a Bill of Supply or B2C tax invoice shall be generated."),
  bullet("Invoices are also accessible from the User's account dashboard for a period of eight (8) years from the date of payment, in compliance with Section 36 of the CGST Act, 2017."),
  bullet("Where the Buyer is established outside India and the supply qualifies as an export of services under Section 2(6) of the IGST Act, 2017, GST shall be charged at zero percent (0%) subject to the conditions of Section 16."),

  h2("5.4  Transaction security"),
  bullet("All payment transactions are conducted over TLS 1.2 or higher, with end-to-end encryption between the User's browser, the payment gateway, and the User's card-issuing bank."),
  bullet("Card data (PAN, CVV, expiry) is never transmitted to or stored by the Company. The gateway tokenises the card and provides only a transaction reference."),
  bullet("Three-Domain-Secure (3DS) authentication is mandatorily invoked for all Indian-card transactions in compliance with the Reserve Bank of India's directions."),
  bullet("For UPI transactions, two-factor authentication via the User's UPI PIN is mandatory."),

  h2("5.5  Failed transactions"),
  bullet("A transaction may fail for a variety of reasons, including but not limited to: insufficient funds, expired card, mismatched details, bank-side outage, exceeded daily limit, or gateway timeout."),
  bullet("Where a transaction fails before debit, no further action is required."),
  bullet("Where a transaction fails after debit (i.e., the User's account is debited but the Platform's payment status is recorded as \"Failed\"), the amount is auto-reversed by the gateway within typically three (3) to seven (7) working days. The User need not initiate any action."),
  bullet("Where the reversal has not occurred within seven (7) working days, the User may write to support@naamdekho.in with the transaction reference. The Company shall coordinate with the relevant gateway for resolution."),

  h2("5.6  Fallback gateway switching"),
  bullet("The Platform monitors the health and response-time of the primary gateway (Razorpay) continuously. Upon detection of degraded availability (defined as: error rate > 5% over a five-minute window, or median response time > 10 seconds), the Platform shall automatically switch new checkout sessions to the fallback gateway (Paytm)."),
  bullet("The User shall be informed of the gateway in use at the time of checkout. Pending transactions on the primary gateway are not migrated; they are allowed to complete or auto-reverse in the normal course."),
  bullet("After thirty (30) minutes of stable primary-gateway operation, new checkout sessions shall revert to the primary gateway."),
  bullet("In the rare event that both gateways are simultaneously unavailable, the Platform shall display a notice indicating the temporary inability to accept payments, and shall not levy any charge."),

  h2("5.7  Subscription billing (Founder Pro and Agency Tier)"),
  bullet("Recurring subscriptions are billed in advance on a monthly basis (or, for Agency Tier, as set out in the MSA)."),
  bullet("Auto-renewal is enabled by default at sign-up. The User may disable auto-renewal at any time from the account dashboard."),
  bullet("Failed renewals shall be retried up to three (3) times over five (5) days. If all retries fail, the subscription shall be suspended and the User notified by email."),
  bullet("The Company's recurring-billing mandate is established with the gateway in accordance with the Reserve Bank of India's directions on e-mandate processing dated 16 August 2019, as amended."),

  pb(),
);

// ═════════════════════════════════════════════════════════════
// 6. CONTACT
// ═════════════════════════════════════════════════════════════
children.push(
  h1("6.  Contact"),

  p("For any query, concern, complaint, refund request, data-subject right exercise, or other communication relating to these policies, please write to us at the most appropriate of the following addresses:"),
  wideTable([2800, 6560], [
    new TableRow({ children: [headerCell("Purpose", 2800), headerCell("Address", 6560)] }),
    new TableRow({ children: [cell("General queries", { width: 2800, bold: true, fill: BG2 }), cell("hello@naamdekho.in", { width: 6560 })] }),
    new TableRow({ children: [cell("Customer support", { width: 2800, bold: true, fill: BG2 }), cell("support@naamdekho.in", { width: 6560 })] }),
    new TableRow({ children: [cell("Refunds & cancellations", { width: 2800, bold: true, fill: BG2 }), cell("refunds@naamdekho.in", { width: 6560 })] }),
    new TableRow({ children: [cell("Privacy, DPDP rights, data-subject requests", { width: 2800, bold: true, fill: BG2 }), cell("grievance@naamdekho.in (Grievance Officer & Data Protection Officer)", { width: 6560 })] }),
    new TableRow({ children: [cell("Legal notices", { width: 2800, bold: true, fill: BG2 }), cell("legal@naamdekho.in", { width: 6560 })] }),
    new TableRow({ children: [cell("Agencies and partnerships", { width: 2800, bold: true, fill: BG2 }), cell("partners@naamdekho.in", { width: 6560 })] }),
    new TableRow({ children: [cell("Phone (Mon–Fri, 10:00–18:00 IST)", { width: 2800, bold: true, fill: BG2 }), cell("[To be filled by the Company]", { width: 6560 })] }),
    new TableRow({ children: [cell("Registered postal address", { width: 2800, bold: true, fill: BG2 }), cell("Naam Dekho Technologies Private Limited\n[Registered address, to be filled by the Company]", { width: 6560 })] }),
  ]),

  blank(280),
  hr(),
  p("This document was last updated on " + today + ". By using the Platform, you confirm that you have read, understood and accepted these policies. If you do not accept any portion of them, please do not use the Platform.", { italic: true, color: INK3 }),
  blank(240),
  hr(),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "— End of Master Legal Policies Document —", font: SERIF, italics: true, size: 22, color: INK3 })],
  }),
);

// ASSEMBLE
const doc = new Document({
  creator: "Naam Dekho Technologies Pvt Ltd — Legal",
  title: "Naam Dekho — Master Legal Policies Document v1.0",
  description: "Privacy Policy, Terms of Use, Cookies Policy, and Cancellation & Refund Policy.",
  styles: {
    default: { document: { run: { font: FONT, size: 22, color: INK } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 38, bold: true, font: SERIF, color: INK },
        paragraph: { spacing: { before: 400, after: 240 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: SERIF, color: INK },
        paragraph: { spacing: { before: 300, after: 180 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: SERIF, color: INK2 },
        paragraph: { spacing: { before: 240, after: 140 }, outlineLevel: 2 } },
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
      { reference: "numbers",
        levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
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
          children: [new TextRun({ text: "NAAM DEKHO · Legal Policies v1.0", font: FONT, size: 16, color: INK3, characterSpacing: 30 })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          children: [
            new TextRun({ text: "© 2026 Naam Dekho Technologies Pvt Ltd", font: FONT, size: 16, color: INK3, italics: true }),
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
  fs.writeFileSync(OUT, buf);
  console.log("Wrote:", OUT, "(", (buf.length / 1024).toFixed(1), "KB )");
});
