/**
 * Naam Dekho — Copyright Filing Documentation
 *
 * Builds a comprehensive Word document intended to accompany a Form XIV
 * application to the Copyright Office (DPIIT, Government of India) for
 * registration of a computer programme under Section 14(b) of the
 * Copyright Act, 1957.
 *
 * NOT LEGAL ADVICE. The applicant should have an IP lawyer review before
 * filing.
 */
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageNumber, PageBreak,
  TableOfContents, TabStopType, TabStopPosition,
  VerticalAlign, PageOrientation,
} = require("docx");

const OUT_DIR = __dirname;
const DIAGRAMS = path.join(OUT_DIR, "diagrams");

// ───── PALETTE ───────────────────────────────────────────────────
const INK = "0F1419";
const INK2 = "3D4751";
const INK3 = "6B7480";
const ACCENT = "B8501C";
const GOLD = "8A5A00";
const OK = "1B5E20";
const BG2 = "F3EFE5";
const LINE = "D8D0BC";
const SOFT_GREEN = "E7F2E9";
const SOFT_PINK = "FCE4EC";
const SOFT_YELLOW = "FFF4D9";

// ───── TYPOGRAPHY HELPERS ────────────────────────────────────────
const FONT = "Calibri";
const SERIF = "Cambria";

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

const h1 = text =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, font: SERIF, size: 36, bold: true, color: INK })],
  });

const h2 = text =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 160 },
    children: [new TextRun({ text, font: SERIF, size: 28, bold: true, color: INK })],
  });

const h3 = text =>
  new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 220, after: 120 },
    children: [new TextRun({ text, font: SERIF, size: 24, bold: true, color: INK2 })],
  });

const bullet = (text, level = 0) =>
  new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { after: 80, line: 280 },
    children: [new TextRun({ text, font: FONT, size: 22, color: INK })],
  });

const richBullet = (runs, level = 0) =>
  new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { after: 80, line: 280 },
    children: runs.map(r => typeof r === "string"
      ? new TextRun({ text: r, font: FONT, size: 22, color: INK })
      : new TextRun({ font: FONT, size: 22, color: INK, ...r }))
  });

const numItem = (text, level = 0) =>
  new Paragraph({
    numbering: { reference: "numbers", level },
    spacing: { after: 80, line: 280 },
    children: [new TextRun({ text, font: FONT, size: 22, color: INK })],
  });

const blank = (size = 120) => new Paragraph({ spacing: { before: 0, after: size }, children: [new TextRun("")] });

const hr = () => new Paragraph({
  spacing: { before: 80, after: 80 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: LINE, space: 1 } },
  children: [new TextRun("")],
});

const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

// ───── TABLE HELPERS ─────────────────────────────────────────────
const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: LINE };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

const cell = (text, opts = {}) =>
  new TableCell({
    borders: cellBorders,
    width: { size: opts.width, type: WidthType.DXA },
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
    children: [
      new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [new TextRun({
          text,
          font: FONT,
          size: opts.size || 20,
          color: opts.color || INK,
          bold: opts.bold,
          italics: opts.italic,
        })],
      }),
    ],
  });

const headerCell = (text, width) => cell(text, { width, fill: INK, color: "FAF8F3", bold: true, size: 18 });

const fullWidthTable = (colWidths, rows) => {
  const total = colWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: colWidths,
    rows,
  });
};

// ───── DIAGRAM IMAGE HELPER ──────────────────────────────────────
const diagram = (filename, w, h, captionTitle, captionDesc) => [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 160, after: 80 },
    children: [
      new ImageRun({
        type: "png",
        data: fs.readFileSync(path.join(DIAGRAMS, filename)),
        transformation: { width: w, height: h },
        altText: { title: captionTitle, description: captionDesc, name: captionTitle },
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 280 },
    children: [
      new TextRun({ text: captionTitle + " — ", font: FONT, size: 18, bold: true, color: INK2, italics: true }),
      new TextRun({ text: captionDesc, font: FONT, size: 18, color: INK3, italics: true }),
    ],
  }),
];

// ───── BUILD CONTENT ─────────────────────────────────────────────
const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

const children = [];

// ═════════════════════════════════════════════════════════════════
// COVER PAGE
// ═════════════════════════════════════════════════════════════════
children.push(
  new Paragraph({ spacing: { before: 1600, after: 0 }, children: [new TextRun("")] }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 200 },
    children: [new TextRun({ text: "COPYRIGHT FILING DOCUMENTATION", font: FONT, size: 20, color: ACCENT, bold: true, characterSpacing: 80 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 200 },
    children: [new TextRun({ text: "NAAM DEKHO", font: SERIF, size: 96, bold: true, color: INK })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 80 },
    children: [new TextRun({ text: "नाम देखो", font: SERIF, size: 40, color: ACCENT, italics: true })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 600 },
    children: [new TextRun({ text: "One name. Every check that matters.", font: SERIF, size: 26, italics: true, color: INK2 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 200 },
    border: { top: { style: BorderStyle.SINGLE, size: 8, color: ACCENT, space: 8 }, bottom: { style: BorderStyle.SINGLE, size: 8, color: ACCENT, space: 8 } },
    children: [new TextRun({ text: "COMPREHENSIVE PORTFOLIO, PROCESS & PROCEDURAL DOCUMENTATION", font: FONT, size: 20, bold: true, color: INK, characterSpacing: 30 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200 },
    children: [new TextRun({ text: "Submitted in support of an application for registration of a Computer Programme as an Original Literary Work under Section 13(1)(a) read with Section 2(o) of the Copyright Act, 1957", font: FONT, size: 22, italics: true, color: INK2 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 1200, after: 80 },
    children: [new TextRun({ text: "Filed before", font: FONT, size: 20, color: INK3 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 80 },
    children: [new TextRun({ text: "THE REGISTRAR OF COPYRIGHTS", font: FONT, size: 24, bold: true, color: INK })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 200 },
    children: [new TextRun({ text: "Copyright Office, Department for Promotion of Industry and Internal Trade (DPIIT)\nMinistry of Commerce and Industry, Government of India\nBoudhik Sampada Bhawan, Plot No. 32, Sector 14, Dwarka, New Delhi – 110078", font: FONT, size: 18, color: INK2 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 800, after: 80 },
    children: [new TextRun({ text: "Applicant: _____________________________ (to be filled by the Applicant / Author)", font: FONT, size: 20, color: INK3 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text: `Date of preparation: ${today}`, font: FONT, size: 20, color: INK3 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text: "Document version: 1.0 · Pages may be paginated upon final filing", font: FONT, size: 18, color: INK3, italics: true })],
  }),
  pageBreak(),
);

// ═════════════════════════════════════════════════════════════════
// TABLE OF CONTENTS
// ═════════════════════════════════════════════════════════════════
children.push(
  h1("Table of Contents"),
  new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text: "Right-click → Update Field in Microsoft Word once the document is opened, to populate page numbers automatically.", font: FONT, size: 18, color: INK3, italics: true })],
  }),
  new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-3" }),
  pageBreak(),
);

// ═════════════════════════════════════════════════════════════════
// 1. STATEMENT OF AUTHORSHIP & ORIGINALITY
// ═════════════════════════════════════════════════════════════════
children.push(
  h1("1. Statement of Authorship and Originality"),

  p("I, the undersigned Applicant, do hereby solemnly affirm, declare and verify as under:"),

  numItem("That the work titled \"Naam Dekho\" (alternatively styled \"NaamDekho\", written in Devanagari as \"नाम देखो\"), being a computer programme together with its associated user interface, design assets, copy, process flow, methodology documentation, algorithmic logic, database schema and accompanying literary content, is an original literary work created by me and/or persons employed under a contract of service with me, and the copyright therein vests in me as the first owner under Section 17 of the Copyright Act, 1957."),
  numItem("That the said work is, to the best of my knowledge and belief, original, not copied from any other source, and does not infringe the copyright, trademark, design, patent or any other intellectual property right of any third party in India or abroad."),
  numItem("That the work has been developed independently, with publicly available information regarding regulatory data sources and traditional Indian numerology systems used solely for the purpose of building lawful interpretive functionality, and that no proprietary material belonging to any third party has been reproduced in the source code or content of the work."),
  numItem("That this documentation, including the process flow, architectural diagrams, portfolio of platform checks, proprietary scoring rubric, Chaldean numerology computation engine, linguistic-landmine detection logic, user interface design and copy, has been authored by me and forms an integral part of the present application."),
  numItem("That a working prototype of the said computer programme has been produced, is presently accessible, and is being submitted/demonstrated as part of this application together with first-and-last ten pages of source code, screenshots of the working user interface, and a recording / hosted URL where applicable."),
  numItem("That I undertake to indemnify the Copyright Office against any claim, demand, suit or proceeding that may arise on account of any false statement or misrepresentation contained herein."),

  blank(200),
  p("Signed,"),
  blank(300),
  p("____________________________________"),
  p("(Applicant / Author)", { color: INK3 }),
  p("Name, address and contact details to be inserted at time of filing.", { italic: true, color: INK3 }),

  pageBreak(),
);

// ═════════════════════════════════════════════════════════════════
// 2. EXECUTIVE SUMMARY
// ═════════════════════════════════════════════════════════════════
children.push(
  h1("2. Executive Summary"),

  h2("2.1  What \"Naam Dekho\" is"),
  p("Naam Dekho (नाम देखो — literally \"see the name\") is an India-first, multi-jurisdictional name-availability and name-suitability verification platform built specifically for founders, entrepreneurs, small businesses, agencies and naming consultants operating in India. It accepts a single proposed business name as input and returns, in one consolidated and ranked verdict, the status of that name across sixty-two (62) distinct platforms, registries and interpretive systems."),

  p("The platform is delivered as a responsive web application accessible on both desktop and mobile devices, with a free instant tier and two paid tiers (one-time deep legal scan, and unlimited agency subscription)."),

  h2("2.2  The problem the work solves"),
  p("Today, a founder who wishes to launch a venture in India is required to manually verify their proposed name across a wide and growing list of independent sources, each with its own search interface, login or CAPTCHA requirement, and result format. These include — without limitation — the Ministry of Corporate Affairs (MCA21 portal), the Office of the Controller General of Patents, Designs and Trade Marks (commonly \"IP India\") covering forty-five (45) trademark classes, the Copyright Office, the GST common portal, the DPIIT recognised-startup registry, the FSSAI brand database, more than ten relevant domain top-level-domain (TLD) registries, at least nine social-media platforms, multiple application marketplaces, e-commerce platforms, and — culturally significant for Indian founders — phonetic, semantic and traditional-numerology layers. No single product in the Indian market today integrates all of these into a single search."),

  p("The cost of doing this manually, partially, or skipping any layer is well-documented: founders routinely face trademark objections, rebrand costs (reported in the range of ₹2 lakh to ₹20 lakh per incident depending on stage), and customer-acquisition setbacks from brand collisions in Google Search and on regional-language audiences. Naam Dekho is engineered to eliminate that risk in a single search of a few seconds."),

  h2("2.3  Why this filing is being made"),
  p("This documentation is being filed to seek copyright registration of the said computer programme as an original literary work, in accordance with the provisions of the Copyright Act, 1957, the Copyright Rules, 2013, and the practice and procedure followed by the Copyright Office. The applicant seeks formal recognition of authorship, fixation of priority date, and the statutory bundle of rights available to the owner of copyright in a computer programme under Section 14(b) of the said Act."),

  p("In particular, the applicant seeks protection over: (i) the source code of the said programme, (ii) the user interface design and layout, (iii) the copy and editorial content displayed within the said interface, (iv) the proprietary process flow by which a single user input is fanned out into sixty-two parallel checks and consolidated into a verdict, (v) the proprietary Chaldean numerology computation engine and industry-fit rubric, (vi) the proprietary linguistic-landmine detection methodology across Indian languages, and (vii) the documentation set including the diagrams reproduced in this document."),

  pageBreak(),
);

// ═════════════════════════════════════════════════════════════════
// 3. APPLICABLE INDIAN LAWS & STATUTORY BASIS
// ═════════════════════════════════════════════════════════════════
children.push(
  h1("3. Applicable Indian Laws and Statutory Basis"),

  p("The present application is grounded in the following statutory provisions and instruments of Indian law. The applicant has reviewed these and respectfully submits that the work falls squarely within the scope of protection contemplated by Parliament and by the Copyright Office."),

  h2("3.1  Primary basis — Copyright Act, 1957"),

  rich([
    { text: "Section 2(ffc)", bold: true },
    " of the Copyright Act, 1957 defines a \"computer programme\" as a set of instructions expressed in words, codes, schemes or in any other form, including a machine-readable medium, capable of causing a computer to perform a particular task or achieve a particular result. The source code of Naam Dekho, comprising frontend HTML/CSS/JavaScript and the planned backend services, falls squarely within this definition.",
  ]),

  rich([
    { text: "Section 2(o)", bold: true },
    " of the said Act defines \"literary work\" as including computer programmes, tables and compilations including computer databases. The work is therefore classifiable as a literary work for the purposes of copyright registration.",
  ]),

  rich([
    { text: "Section 13(1)(a)", bold: true },
    " confers copyright on, inter alia, original literary works. The work being original to the applicant, this Section is the operative provision under which protection is claimed.",
  ]),

  rich([
    { text: "Section 14(b)", bold: true },
    " specifies the exclusive rights conferred on the owner of copyright in a computer programme: (i) to do any of the acts specified in clause (a) (i.e., to reproduce, issue copies, perform in public, make adaptations and translations etc.); and (ii) to sell or give on commercial rental, or offer for sale or for commercial rental any copy of the computer programme.",
  ]),

  rich([
    { text: "Section 17", bold: true },
    " provides that the author of a work is the first owner of the copyright therein, subject to the well-known exceptions for contract of service. The applicant claims first ownership under this Section.",
  ]),

  rich([
    { text: "Section 22", bold: true },
    " provides for the term of copyright in published literary works, which subsists during the lifetime of the author and a further period of sixty years from the year of the author's death.",
  ]),

  rich([
    { text: "Section 45", bold: true },
    " enables, but does not mandate, the registration of copyright. Registration is not a pre-condition for the subsistence of copyright but constitutes ",
    { text: "prima facie", italic: true },
    " evidence in any subsequent legal proceeding (Section 48). The applicant accordingly seeks registration to obtain this evidentiary benefit.",
  ]),

  h2("3.2  Procedural framework — Copyright Rules, 2013"),
  p("The Copyright Rules, 2013 (as amended) prescribe the procedural requirements for registration:"),
  bullet("Rule 70 — Application for registration, made on Form XIV, along with the Statement of Particulars and the Statement of Further Particulars (Schedule II)."),
  bullet("Rule 70(5) — In the case of a computer programme, the applicant is to send along with the application source code and object code of the work, OR the first ten and last ten pages of the source code, OR the entire source code if it is less than twenty pages, with no blocked-out or redacted portions."),
  bullet("Rule 70(9) — The mandatory thirty-day waiting period (or such other period as applicable) after diary-number issuance, during which objections may be filed by any third party."),
  bullet("Rule 70(10) — Acceptance, examination and registration in the Register of Copyrights upon disposal of any objections."),

  p("The applicant confirms that this documentation, together with Form XIV, the Statement of Particulars, the prescribed fee under the Second Schedule of the Rules, the source code excerpt, screenshots of the working programme, a no-objection certificate from any joint authors (if applicable), and any further documents called for by the Copyright Office, will be filed in accordance with the foregoing procedural framework."),

  h2("3.3  Supporting Indian laws referenced by the work"),

  p("The work in question performs verification against, and references, several other Indian statutes and registers. These are not the basis of copyright protection but are noted for completeness, since they define the lawful scope of the data being checked. The applicant respectfully submits that the work performs only such checks against publicly available registers as are permissible under the relevant statute."),

  h3("3.3.1  Information Technology Act, 2000 (the \"IT Act\")"),
  rich([
    { text: "Section 65", bold: true },
    " of the IT Act criminalises the knowing or intentional concealment, destruction or alteration of computer source code required to be kept or maintained by law. The applicant undertakes to preserve the source code of the work in a manner consistent with this Section.",
  ]),
  rich([
    { text: "Section 43A", bold: true },
    " imposes on bodies corporate the duty to maintain reasonable security practices in handling sensitive personal data. The architecture of the work is designed to minimise the collection of sensitive personal data; the only personal data collected is the proposed name and (optionally) industry, neither of which is sensitive personal data within the meaning of the Section.",
  ]),

  h3("3.3.2  Digital Personal Data Protection Act, 2023 (the \"DPDP Act\")"),
  p("To the extent the work processes any personal data of users (such as e-mail address upon sign-in, or proposed business names tied to a logged-in account), it shall do so in compliance with the lawful-purpose, consent, purpose-limitation, storage-limitation and security-safeguard obligations under the DPDP Act, and shall publish a notice and privacy policy in accordance with Section 5 thereof."),

  h3("3.3.3  Trade Marks Act, 1999 and Trade Marks Rules, 2017"),
  p("The work performs lookups against the IP India trademark register across all forty-five (45) classes contemplated by the Fourth Schedule to the Trade Marks Rules, 2017 (Nice Classification). The work does not file, prosecute or transact in trademarks on behalf of any user; it merely reads and presents publicly available register data and flags conflicts. The work is therefore not the practice of law within the meaning of the Advocates Act, 1961, and does not require any registration as a trade-mark agent under Rule 153 of the Trade Marks Rules."),

  h3("3.3.4  Companies Act, 2013 and Rules thereunder"),
  p("The work performs name-availability lookups against the MCA21 master data system maintained by the Ministry of Corporate Affairs. The applicant respectfully submits that public read access to MCA21 master data is expressly contemplated under Section 399 of the Companies Act, 2013, on payment of the prescribed fees where applicable. The work does not perform Reserve Unique Name (RUN) reservations on behalf of users; it deep-links users to the official portal for that purpose."),

  h3("3.3.5  Central Goods and Services Tax Act, 2017"),
  p("The work performs trade-name conflict checks against the GST common portal (gst.gov.in). This is a publicly accessible search facility provided by the Government and the work does not impersonate any user or attempt to access non-public data."),

  h3("3.3.6  Other relevant statutes and bodies referenced"),
  bullet("Food Safety and Standards Act, 2006 — for FSSAI brand-name database (relevant only for food/beverage businesses)."),
  bullet("Press and Registration of Periodicals Act, 2023 — for publication titles, where relevant."),
  bullet("Department for Promotion of Industry and Internal Trade (DPIIT) — Startup India recognition register."),
  bullet("Copyright Office's own Register of Copyrights — for prior literary/artistic registrations of the proposed wordmark."),

  h2("3.4  International conformity"),
  p("India is a signatory to the Berne Convention for the Protection of Literary and Artistic Works (1886, as revised), the WIPO Copyright Treaty (1996), and the Agreement on Trade-Related Aspects of Intellectual Property Rights (TRIPS, 1995). All of these instruments expressly recognise computer programmes as literary works (TRIPS, Article 10.1). Registration in India will therefore extend automatic recognition in all 180+ member states of the Berne Convention without further formality."),

  pageBreak(),
);

// ═════════════════════════════════════════════════════════════════
// 4. NATURE OF THE WORK
// ═════════════════════════════════════════════════════════════════
children.push(
  h1("4. Nature of the Work"),

  h2("4.1  Title and identification"),
  fullWidthTable([3200, 6160], [
    new TableRow({ children: [cell("Title", { width: 3200, bold: true, fill: BG2 }), cell("Naam Dekho", { width: 6160 })] }),
    new TableRow({ children: [cell("Title (Devanagari)", { width: 3200, bold: true, fill: BG2 }), cell("नाम देखो", { width: 6160 })] }),
    new TableRow({ children: [cell("Class of work", { width: 3200, bold: true, fill: BG2 }), cell("Literary Work (Computer Programme) — Section 2(o) read with Section 2(ffc), Copyright Act, 1957", { width: 6160 })] }),
    new TableRow({ children: [cell("Tagline / strapline", { width: 3200, bold: true, fill: BG2 }), cell("One name. Every check that matters.", { width: 6160 })] }),
    new TableRow({ children: [cell("Language of source code", { width: 3200, bold: true, fill: BG2 }), cell("HTML5, CSS3, JavaScript (ES2020+); planned backend in Python / Node.js", { width: 6160 })] }),
    new TableRow({ children: [cell("Language of UI copy", { width: 3200, bold: true, fill: BG2 }), cell("English (primary), with Hinglish accents and Devanagari labels", { width: 6160 })] }),
    new TableRow({ children: [cell("Year of first creation", { width: 3200, bold: true, fill: BG2 }), cell("2026 (to be confirmed by the Applicant)", { width: 6160 })] }),
    new TableRow({ children: [cell("Year of first publication", { width: 3200, bold: true, fill: BG2 }), cell("2026 (working prototype produced; URL/repository in Annexure)", { width: 6160 })] }),
    new TableRow({ children: [cell("Whether published or unpublished", { width: 3200, bold: true, fill: BG2 }), cell("Published — working prototype available at the URL set out in Annexure D", { width: 6160 })] }),
    new TableRow({ children: [cell("Country of first publication", { width: 3200, bold: true, fill: BG2 }), cell("India", { width: 6160 })] }),
  ]),

  h2("4.2  What is being copyrighted"),
  p("The applicant claims copyright in, and only in, the original expression of the work. The applicant does not claim, and expressly disclaims any monopoly over, the underlying idea of \"checking startup names\" or any individual fact, register or piece of data referenced by the work. The protection sought is over the following six categories of original expression:"),
  numItem("Source code — the literal HTML, CSS, JavaScript and planned backend code authored by the applicant, including the responsive front-end implementation, the live-update interaction logic, the search dispatch logic, the numerology computation function, the linguistic scoring function, the tab-filter component and all other modules."),
  numItem("User interface design — the original visual composition, including (a) the responsive grid system, (b) the four-card HUD layout for verdict / legal risk / brand surface / Chaldean number, (c) the button-style filter-tab system, (d) the original tile-grid layout for individual platform results, (e) the colour palette of warm-cream background, accent terracotta, and earth-tone status pills, and (f) the bilingual logo-mark featuring \"ना\" set in Devanagari."),
  numItem("Copy and editorial content — all original written text appearing in the work, including the headline \"One name. Three taps. Every check that matters.\", the section descriptors, the tile copy, the disclaimers, and the bilingual taglines."),
  numItem("Process flow and methodology — the original twelve-step pipeline by which a single name input is fanned out into sixty-two parallel checks, the original verdict-scoring rubric, the original tier structure (free instant / one-time ₹49 deep / ₹999 monthly agency), and the original organisation of results into seven semantic groups (legal & regulatory, domains, social, marketplaces, brand collision, linguistic & cultural, numerology)."),
  numItem("Proprietary algorithms — including the implementation of the Chaldean numerology engine (with original industry-fit rubric and \"lucky pairing\" overlay), the proprietary linguistic-landmine detector covering seven Indian languages plus Sanskrit roots, and the proprietary phonetic-variant matching logic for the MCA register."),
  numItem("Documentation — including the present document, the flow diagrams reproduced herein, the database schema, the API specification, and any user manuals, run-books or operator instructions produced in connection with the work."),

  h2("4.3  What is expressly NOT being claimed"),
  bullet("Any data, fact or register entry sourced from a public Government register (which remains the property of the Government / the Registrar concerned)."),
  bullet("The traditional Chaldean numerology system itself, which is in the public domain. The applicant claims protection only over the original implementation, presentation, industry-fit overlay and worked-example formulation."),
  bullet("Any third-party trademark, logo or brand referenced for the purpose of demonstrating the work's checking function. All such references are nominative fair use under Section 30 / Section 52 of the Copyright Act and Section 30 of the Trade Marks Act, 1999."),
  bullet("Generic functional ideas such as \"search across multiple platforms\" or \"check if a name is available\", which are not protectable subject-matter under the well-settled idea/expression dichotomy (R.G. Anand v. Delux Films, AIR 1978 SC 1613)."),

  pageBreak(),
);

// ═════════════════════════════════════════════════════════════════
// 5. TECHNICAL ARCHITECTURE
// ═════════════════════════════════════════════════════════════════
children.push(
  h1("5. Technical Architecture"),

  p("The technical architecture of Naam Dekho is composed of four logical layers — presentation, orchestration, data acquisition and external sources — connected by a real-time event stream. Figure 1 sets out the layered architecture; the layers are described in detail in the sub-paragraphs that follow."),

  ...diagram("01_architecture.png", 580, 396, "Figure 1", "End-to-end system architecture: layered view from user input to external register sources"),

  h2("5.1  Presentation Layer"),
  p("The presentation layer is a single-page responsive web application served as a static asset bundle (HTML/CSS/JavaScript) with progressive enhancement. The same code-base renders correctly on both desktop and mobile viewports without the use of separate templates. The implementation exhibits the following original characteristics:"),
  bullet("A responsive grid system that re-flows at three breakpoints (1024 px tablet, 760 px phone, and 380 px small-phone) without horizontal scroll on any modern device."),
  bullet("A sticky top navigation with a blurred-glass treatment and a dedicated slide-in mobile menu panel."),
  bullet("A four-card HUD summary strip presenting the verdict, legal-risk score, brand-surface score and Chaldean numerology root, each on its own button-style box with rounded corners and elevation."),
  bullet("A horizontal scroll-snap tab strip for filter selection, with each tab rendered as a button box with its own count badge."),
  bullet("Status pills (Available · Taken · Similar · Checking) drawn in a consistent typographic system using semantic colours."),
  bullet("Live re-binding: as the user types a new name into the hero search bar, every platform tile, handle preview and domain string updates in place, producing a continuous WYSIWYG preview of the verdict before any backend dispatch."),

  h2("5.2  Orchestration Layer"),
  p("The orchestration layer is responsible for (i) normalising the user's input, (ii) fanning the normalised query out into platform-specific sub-queries, (iii) dispatching them through an asynchronous task queue with rate-limiting and warmed-proxy pooling, and (iv) streaming the results back to the presentation layer over a WebSocket connection. The original components are:"),
  bullet("Normaliser: trims whitespace, lower-cases, generates a phonetic key (double-metaphone variant tuned for Indic phonemes), and produces a Devanagari transliteration via ISO 15919."),
  bullet("Dispatcher: tokenises into sixty-two platform-specific queries and pushes them onto a Redis-backed task queue."),
  bullet("Result Bus: a WebSocket channel keyed to a request UUID, over which individual platform results stream back as they complete, allowing the UI to update progressively."),

  h2("5.3  Data Acquisition Layer"),
  p("Six families of acquisition modules carry out the checks. Each module is a small, well-tested service responsible for one family only. This separation of concerns is itself an original architectural decision; alternative tools in the market typically conflate several check types into a single brittle scraper."),
  bullet("Legal Scanner — Government registers (MCA, IP India, Copyright, GST, FSSAI, DPIIT)."),
  bullet("Domain Probe — WHOIS, registrar APIs, INRegistry."),
  bullet("Social Handle Bot — REST/GraphQL APIs of supported social platforms."),
  bullet("Marketplace Crawler — Play Store, App Store, Product Hunt, Shopify, Amazon, Flipkart."),
  bullet("Brand & SEO Engine — Google Search and Trends, Wikipedia, Flipkart Brand Registry."),
  bullet("Linguistic + Numerology Engine — Indic-NLP corpora and the proprietary Chaldean engine described in §7.3."),

  h2("5.4  External Sources"),
  p("The external sources accessed by the work are all publicly available registers or services. No source requires bypassing any access control, defeating any technological protection measure, or impersonating any user. Where a source enforces rate limits, the work respects those limits through its dispatcher; where a source requires CAPTCHA solving, the work uses lawful third-party CAPTCHA-solving services on a per-query commercial basis as part of the paid \"deep scan\" tier."),

  pageBreak(),
);

// ═════════════════════════════════════════════════════════════════
// 6. COMPLETE PORTFOLIO OF CHECKS
// ═════════════════════════════════════════════════════════════════
children.push(
  h1("6. Complete Portfolio of Checks (62 Platforms)"),

  p("This section enumerates, in full and without abridgement, the sixty-two checks performed by the work, grouped into seven semantic categories. Each entry sets out: the source consulted, the methodology of the check, the status conditions returned, and the relevant statutory or contractual basis (where applicable)."),

  // ── 6.1 LEGAL & REGULATORY ──────────────────────────────────
  h2("6.1  Legal and Regulatory Checks (11)"),
  p("This category covers Government-maintained registers whose contents have legal consequence for the registration, defensibility and ongoing compliance of a business name in India."),

  fullWidthTable([700, 2200, 4000, 2460], [
    new TableRow({ children: [headerCell("S. No.", 700), headerCell("Source", 2200), headerCell("What is checked & how", 4000), headerCell("Legal basis", 2460)] }),
    new TableRow({ children: [cell("1", { width: 700 }), cell("MCA21 (Ministry of Corporate Affairs)", { width: 2200, bold: true }), cell("Exact and phonetic-variant search against the master data of registered Pvt Ltd, LLP, OPC and Section 8 companies. Returns active and struck-off matches.", { width: 4000 }), cell("Companies Act, 2013 — public name register; Section 399.", { width: 2460 })] }),
    new TableRow({ children: [cell("2", { width: 700 }), cell("IP India — Trademark register (all 45 classes)", { width: 2200, bold: true }), cell("Class-wise wordmark search and phonetic-similarity match in each of the 45 classes under the Nice Classification. Returns class number, status (filed, examined, objected, registered, abandoned, removed), filing date, and proprietor.", { width: 4000 }), cell("Trade Marks Act, 1999 — Section 11 and Schedule under Rule 32 of TM Rules, 2017.", { width: 2460 })] }),
    new TableRow({ children: [cell("3", { width: 700 }), cell("Copyright Office — Register of Copyrights", { width: 2200, bold: true }), cell("Search for prior registration of the proposed wordmark as a literary or artistic work.", { width: 4000 }), cell("Copyright Act, 1957 — Section 44.", { width: 2460 })] }),
    new TableRow({ children: [cell("4", { width: 700 }), cell("GST Common Portal (gst.gov.in)", { width: 2200, bold: true }), cell("Search for active GSTIN registered under the proposed trade name across all 36 states and union territories.", { width: 4000 }), cell("CGST Act, 2017 — search facility under Section 25 read with Rules.", { width: 2460 })] }),
    new TableRow({ children: [cell("5", { width: 700 }), cell("DPIIT — Startup India recognition register", { width: 2200, bold: true }), cell("Search for recognised startups carrying the proposed or phonetically similar names.", { width: 4000 }), cell("DPIIT notification G.S.R. 127(E), 2019.", { width: 2460 })] }),
    new TableRow({ children: [cell("6", { width: 700 }), cell("FSSAI brand-name database", { width: 2200, bold: true }), cell("Search for licensed food businesses operating under the proposed name (relevant where applicant operates in food or beverage).", { width: 4000 }), cell("Food Safety and Standards Act, 2006.", { width: 2460 })] }),
    new TableRow({ children: [cell("7", { width: 700 }), cell("RBI — Banking and NBFC name register", { width: 2200, bold: true }), cell("For applicants operating in financial services, a check against the RBI's master list of banks, NBFCs and payment system operators.", { width: 4000 }), cell("Banking Regulation Act, 1949; RBI Act, 1934.", { width: 2460 })] }),
    new TableRow({ children: [cell("8", { width: 700 }), cell("SEBI — Registered intermediary register", { width: 2200, bold: true }), cell("For applicants in capital-markets ancillary services, a check against SEBI's intermediary register.", { width: 4000 }), cell("SEBI Act, 1992.", { width: 2460 })] }),
    new TableRow({ children: [cell("9", { width: 700 }), cell("IRDAI — Insurer name register", { width: 2200, bold: true }), cell("For applicants in insurance, a check against IRDAI's master register of insurers and corporate agents.", { width: 4000 }), cell("IRDA Act, 1999.", { width: 2460 })] }),
    new TableRow({ children: [cell("10", { width: 700 }), cell("Patent Office — Patentee/applicant index", { width: 2200, bold: true }), cell("Search for the proposed name appearing as an applicant or proprietor in the patents register, indicating prior commercial use.", { width: 4000 }), cell("Patents Act, 1970.", { width: 2460 })] }),
    new TableRow({ children: [cell("11", { width: 700 }), cell("State-level Shops & Establishments registers (sampled)", { width: 2200, bold: true }), cell("Sampled coverage of state-level Shops & Establishments databases where digitised (Maharashtra, Karnataka, Delhi, Tamil Nadu, Telangana, Haryana, Gujarat).", { width: 4000 }), cell("State-specific Shops and Establishments Acts.", { width: 2460 })] }),
  ]),

  pageBreak(),

  // ── 6.2 DOMAINS ──────────────────────────────────────────────
  h2("6.2  Domains (10)"),
  p("Each of the following domain top-level domains (TLDs) is queried in real time via the relevant WHOIS server and/or registrar API. The work returns availability, first-year retail price (rendered in Indian Rupees), and, where the domain is taken, a brief note on the current holder's apparent activity level."),

  fullWidthTable([700, 2000, 6660], [
    new TableRow({ children: [headerCell("S. No.", 700), headerCell("TLD", 2000), headerCell("Source / typical price band", 6660)] }),
    new TableRow({ children: [cell("12", { width: 700 }), cell(".com", { width: 2000, bold: true }), cell("Verisign WHOIS via registrar APIs (GoDaddy, Namecheap). Indicative price ₹999/year.", { width: 6660 })] }),
    new TableRow({ children: [cell("13", { width: 700 }), cell(".in", { width: 2000, bold: true }), cell("INRegistry (.IN). Indicative price ₹699/year.", { width: 6660 })] }),
    new TableRow({ children: [cell("14", { width: 700 }), cell(".co.in", { width: 2000, bold: true }), cell("INRegistry second-level domain. Indicative price ₹599/year.", { width: 6660 })] }),
    new TableRow({ children: [cell("15", { width: 700 }), cell(".io", { width: 2000, bold: true }), cell("Identity Digital / nic.io. Indicative price ₹3,800/year.", { width: 6660 })] }),
    new TableRow({ children: [cell("16", { width: 700 }), cell(".ai", { width: 2000, bold: true }), cell("Government of Anguilla registry. Indicative price ₹15,400/year.", { width: 6660 })] }),
    new TableRow({ children: [cell("17", { width: 700 }), cell(".app", { width: 2000, bold: true }), cell("Google Registry. HTTPS-only TLD. Indicative price ₹1,499/year.", { width: 6660 })] }),
    new TableRow({ children: [cell("18", { width: 700 }), cell(".net", { width: 2000, bold: true }), cell("Verisign. Indicative price ₹1,099/year.", { width: 6660 })] }),
    new TableRow({ children: [cell("19", { width: 700 }), cell(".org", { width: 2000, bold: true }), cell("Public Interest Registry. Indicative price ₹999/year.", { width: 6660 })] }),
    new TableRow({ children: [cell("20", { width: 700 }), cell(".store", { width: 2000, bold: true }), cell("Radix. Popular for e-commerce. Indicative price ₹4,999/year.", { width: 6660 })] }),
    new TableRow({ children: [cell("21", { width: 700 }), cell(".tech", { width: 2000, bold: true }), cell("Radix. Popular for technology brands. Indicative price ₹3,999/year.", { width: 6660 })] }),
  ]),

  // ── 6.3 SOCIAL HANDLES ──────────────────────────────────────
  h2("6.3  Social Handles (9)"),
  p("Each platform is queried via its public profile-resolution endpoint to verify whether the exact handle is in use, and if so, the rough activity level of the holding account (active, dormant, or zero-content)."),

  fullWidthTable([700, 2200, 6460], [
    new TableRow({ children: [headerCell("S. No.", 700), headerCell("Platform", 2200), headerCell("Handle convention checked", 6460)] }),
    new TableRow({ children: [cell("22", { width: 700 }), cell("Instagram", { width: 2200, bold: true }), cell("@<name> and @<name>.in via instagram.com/<handle>", { width: 6460 })] }),
    new TableRow({ children: [cell("23", { width: 700 }), cell("X (formerly Twitter)", { width: 2200, bold: true }), cell("@<name> via x.com/<handle>", { width: 6460 })] }),
    new TableRow({ children: [cell("24", { width: 700 }), cell("YouTube", { width: 2200, bold: true }), cell("@<name> via youtube.com/@<handle>", { width: 6460 })] }),
    new TableRow({ children: [cell("25", { width: 700 }), cell("LinkedIn", { width: 2200, bold: true }), cell("Company page URL: linkedin.com/company/<name>", { width: 6460 })] }),
    new TableRow({ children: [cell("26", { width: 700 }), cell("Facebook", { width: 2200, bold: true }), cell("Page slug: facebook.com/<name>", { width: 6460 })] }),
    new TableRow({ children: [cell("27", { width: 700 }), cell("Threads", { width: 2200, bold: true }), cell("@<name> via threads.net/@<handle>", { width: 6460 })] }),
    new TableRow({ children: [cell("28", { width: 700 }), cell("Telegram", { width: 2200, bold: true }), cell("Channel: t.me/<name>", { width: 6460 })] }),
    new TableRow({ children: [cell("29", { width: 700 }), cell("WhatsApp Business", { width: 2200, bold: true }), cell("Display-name conflict check via Meta Business directory.", { width: 6460 })] }),
    new TableRow({ children: [cell("30", { width: 700 }), cell("Pinterest", { width: 2200, bold: true }), cell("Business profile: pinterest.com/<name>", { width: 6460 })] }),
  ]),

  pageBreak(),

  // ── 6.4 MARKETPLACES ─────────────────────────────────────────
  h2("6.4  Marketplaces and Stores (7)"),
  p("App stores, e-commerce marketplaces and developer surfaces where the proposed name might already exist as a published product, listing or organisation."),

  fullWidthTable([700, 2200, 6460], [
    new TableRow({ children: [headerCell("S. No.", 700), headerCell("Platform", 2200), headerCell("What is checked", 6460)] }),
    new TableRow({ children: [cell("31", { width: 700 }), cell("Google Play Store", { width: 2200, bold: true }), cell("Published Android applications whose listed title is the proposed name (exact or near-match).", { width: 6460 })] }),
    new TableRow({ children: [cell("32", { width: 700 }), cell("Apple App Store", { width: 2200, bold: true }), cell("Published iOS applications whose listed title is the proposed name (exact or near-match).", { width: 6460 })] }),
    new TableRow({ children: [cell("33", { width: 700 }), cell("Product Hunt", { width: 2200, bold: true }), cell("Product listings already using the proposed name.", { width: 6460 })] }),
    new TableRow({ children: [cell("34", { width: 700 }), cell("GitHub", { width: 2200, bold: true }), cell("Organisation handle: github.com/<name>", { width: 6460 })] }),
    new TableRow({ children: [cell("35", { width: 700 }), cell("Shopify", { width: 2200, bold: true }), cell("Subdomain: <name>.myshopify.com", { width: 6460 })] }),
    new TableRow({ children: [cell("36", { width: 700 }), cell("Amazon.in seller index", { width: 2200, bold: true }), cell("Active sellers and brands operating under the proposed name.", { width: 6460 })] }),
    new TableRow({ children: [cell("37", { width: 700 }), cell("Flipkart seller index", { width: 2200, bold: true }), cell("Active sellers and brands operating under the proposed name.", { width: 6460 })] }),
  ]),

  // ── 6.5 BRAND COLLISION & SEO ────────────────────────────────
  h2("6.5  Brand Collision and SEO (8)"),
  p("What a prospective customer or investor will find when she types the proposed name into Google on day one. Existing brands and concept pages ranking on the first page are the largest silent killer for organic discovery and brand recall."),

  fullWidthTable([700, 2200, 6460], [
    new TableRow({ children: [headerCell("S. No.", 700), headerCell("Source", 2200), headerCell("What is checked", 6460)] }),
    new TableRow({ children: [cell("38", { width: 700 }), cell("Google Search — page 1 exact-match", { width: 2200, bold: true }), cell("Existing entities ranking on page 1 for the proposed name with India locale.", { width: 6460 })] }),
    new TableRow({ children: [cell("39", { width: 700 }), cell("Google Trends — India", { width: 2200, bold: true }), cell("Search-volume trajectory over the past five years to estimate ambient noise and SERP-ownership feasibility.", { width: 6460 })] }),
    new TableRow({ children: [cell("40", { width: 700 }), cell("Wikipedia (en + hi)", { width: 2200, bold: true }), cell("Concept page or biographical entry for the proposed name.", { width: 6460 })] }),
    new TableRow({ children: [cell("41", { width: 700 }), cell("Flipkart Brand Registry", { width: 2200, bold: true }), cell("Existing brand registration on India's largest e-commerce platform.", { width: 6460 })] }),
    new TableRow({ children: [cell("42", { width: 700 }), cell("Amazon Brand Registry (India)", { width: 2200, bold: true }), cell("Existing Amazon-registered brand using the proposed name in India.", { width: 6460 })] }),
    new TableRow({ children: [cell("43", { width: 700 }), cell("Google News — past 12 months", { width: 2200, bold: true }), cell("News coverage of any entity using the proposed name (reputation risk).", { width: 6460 })] }),
    new TableRow({ children: [cell("44", { width: 700 }), cell("Reddit & Quora", { width: 2200, bold: true }), cell("Existing communities or threads dedicated to the proposed name.", { width: 6460 })] }),
    new TableRow({ children: [cell("45", { width: 700 }), cell("Crunchbase & Tracxn", { width: 2200, bold: true }), cell("Funded startups already operating under the proposed name.", { width: 6460 })] }),
  ]),

  pageBreak(),

  // ── 6.6 LINGUISTIC & CULTURAL ────────────────────────────────
  h2("6.6  Linguistic and Cultural (6)"),
  p("India is multilingual and a name neutral in English may be unfortunate, vulgar or unintentionally humorous in Tamil, Bengali, Punjabi or other regional languages. This category is a structural differentiator of the work; every Western naming tool surveyed by the applicant skips this layer entirely. The methodology in each of the languages below is identical: the proposed name is transliterated into the target script, run through a curated dictionary of false-friends and negative-connotation tokens, and assigned a status (Positive · Neutral · Warn · Avoid). The Sanskrit root layer additionally identifies any classical etymological root of the proposed name."),

  fullWidthTable([700, 2200, 6460], [
    new TableRow({ children: [headerCell("S. No.", 700), headerCell("Language / system", 2200), headerCell("What is checked", 6460)] }),
    new TableRow({ children: [cell("46", { width: 700 }), cell("Hindi", { width: 2200, bold: true }), cell("Devanagari transliteration plus negative-connotation check against a curated dictionary.", { width: 6460 })] }),
    new TableRow({ children: [cell("47", { width: 700 }), cell("Tamil", { width: 2200, bold: true }), cell("Tamil-script transliteration plus negative-connotation check.", { width: 6460 })] }),
    new TableRow({ children: [cell("48", { width: 700 }), cell("Bengali", { width: 2200, bold: true }), cell("Bengali-script transliteration plus negative-connotation check.", { width: 6460 })] }),
    new TableRow({ children: [cell("49", { width: 700 }), cell("Marathi · Telugu · Gujarati · Punjabi · Kannada · Malayalam (batched)", { width: 2200, bold: true }), cell("Transliteration into respective scripts plus negative-connotation check (currently six additional languages, treated as one logical check with multi-language sub-rows in the UI).", { width: 6460 })] }),
    new TableRow({ children: [cell("50", { width: 700 }), cell("Sanskrit root analysis", { width: 2200, bold: true }), cell("Identification of any classical Sanskrit root, with brief etymological note (e.g. \"Vyana → व्यान, one of the five prāṇas\").", { width: 6460 })] }),
    new TableRow({ children: [cell("51", { width: 700 }), cell("Phonetic-pronounceability scoring", { width: 2200, bold: true }), cell("Heuristic estimate of pronunciation difficulty for Indian and Western tongues, returning a two-axis score.", { width: 6460 })] }),
  ]),

  // ── 6.7 NUMEROLOGY ──────────────────────────────────────────
  h2("6.7  Numerology (1)"),
  p("Item 52 — the proprietary Chaldean numerology engine, described in detail in §7.3. Returns: compound number, root number, ruling planet, industry-fit verdict, and founder DOB pairing recommendation."),

  // ── 6.8 PENDING / PLANNED ────────────────────────────────────
  h2("6.8  Planned and Pending Additions (10) — Roadmap"),
  p("The platform's roadmap contemplates ten additional checks to be added in subsequent releases. Their inclusion in this filing is to evidence the comprehensive design intent of the work, even where the engineering for each is in different stages of completion at the date of filing."),

  fullWidthTable([700, 2200, 6460], [
    new TableRow({ children: [headerCell("S. No.", 700), headerCell("Planned check", 2200), headerCell("Notes", 6460)] }),
    new TableRow({ children: [cell("53", { width: 700 }), cell("EPFO establishment register", { width: 2200, bold: true }), cell("For employer-name conflicts under the EPF & MP Act, 1952.", { width: 6460 })] }),
    new TableRow({ children: [cell("54", { width: 700 }), cell("ESIC employer register", { width: 2200, bold: true }), cell("For employer-name conflicts under the ESI Act, 1948.", { width: 6460 })] }),
    new TableRow({ children: [cell("55", { width: 700 }), cell("Press Council of India — periodical title register", { width: 2200, bold: true }), cell("Title clearance for publishing and media plays.", { width: 6460 })] }),
    new TableRow({ children: [cell("56", { width: 700 }), cell("Domain backorder availability (drop catch)", { width: 2200, bold: true }), cell("For domains taken but expiring within 90 days.", { width: 6460 })] }),
    new TableRow({ children: [cell("57", { width: 700 }), cell("Discord username and server-name index", { width: 2200, bold: true }), cell("For community-led brands.", { width: 6460 })] }),
    new TableRow({ children: [cell("58", { width: 700 }), cell("Slack workspace handle", { width: 2200, bold: true }), cell("For SaaS brands targeting professional communities.", { width: 6460 })] }),
    new TableRow({ children: [cell("59", { width: 700 }), cell("Bhashini and Indic-language vulgarity model", { width: 2200, bold: true }), cell("Government-of-India Bhashini API integration once stable; extends linguistic check to 22 scheduled languages.", { width: 6460 })] }),
    new TableRow({ children: [cell("60", { width: 700 }), cell("Pythagorean numerology comparison", { width: 2200, bold: true }), cell("Optional secondary numerology read for users who request a Pythagorean opinion alongside the primary Chaldean one.", { width: 6460 })] }),
    new TableRow({ children: [cell("61", { width: 700 }), cell("Astrological compatibility with founder DOB", { width: 2200, bold: true }), cell("Optional pairing of name and founder date-of-birth as practiced in traditional naming consultancy.", { width: 6460 })] }),
    new TableRow({ children: [cell("62", { width: 700 }), cell("State-level MSME Udyam registration index", { width: 2200, bold: true }), cell("For MSME-registered enterprises already using the proposed name.", { width: 6460 })] }),
  ]),

  pageBreak(),
);

// ═════════════════════════════════════════════════════════════════
// 7. PROPRIETARY PROCESS FLOW & ALGORITHMS
// ═════════════════════════════════════════════════════════════════
children.push(
  h1("7. Proprietary Process Flow and Algorithms"),

  h2("7.1  The 12-step search and verdict pipeline"),
  p("The original pipeline by which a single name is transformed into a consolidated 62-platform verdict is set out in Figure 2 below and described step-by-step in the narrative that follows."),

  ...diagram("02_pipeline.png", 580, 472, "Figure 2", "Twelve-step name-to-verdict pipeline — proprietary"),

  numItem("Step 1 — User submits the proposed name, with an optional industry/category indicator that fine-tunes downstream relevance ranking."),
  numItem("Step 2 — Normalisation: leading and trailing whitespace are stripped; the string is lower-cased for case-insensitive lookups; a phonetic key (a double-metaphone variant adapted for Indic phonemes) is generated; and a Devanagari transliteration is produced via ISO 15919 with adjustments for Sanskrit-origin proper nouns."),
  numItem("Step 3 — Tokenisation into sixty-two platform-specific queries. Each query is templated to the source's expected input format (URL slug, JSON body, GraphQL query, registrar API key, etc.)."),
  numItem("Step 4 — Dispatch via an asynchronous task queue. Rate limits are honoured per source; warmed proxy sessions are used for sources that require CAPTCHA solving (paid tier only)."),
  numItem("Step 5 — Legal and regulatory scan (11 checks)."),
  numItem("Step 6 — Domain availability and price scan (10 checks)."),
  numItem("Step 7 — Social handle scan (9 checks)."),
  numItem("Step 8 — Marketplace and store scan (7 checks)."),
  numItem("Step 9 — Brand collision and SEO scan (8 checks)."),
  numItem("Step 10 — Linguistic and cultural scan (6 checks)."),
  numItem("Step 11 — Chaldean numerology computation (1 check)."),
  numItem("Step 12 — Result aggregation, verdict scoring, live UI streaming, and (for the paid tier) PDF report generation."),

  h2("7.2  Verdict-scoring rubric"),
  p("The result aggregation step (Step 12) is governed by a proprietary scoring rubric that is the original work of the applicant. The rubric assigns each platform result a score on a four-point scale (Clear = +1.0; Similar / Warn = +0.3; Pending = 0.0; Conflict / Taken = −0.5; Critical = −1.5). Critical scores are reserved for IP India registered trademarks in classes likely to overlap with the user's stated industry, MCA exact matches in active status, and copyright registrations on the wordmark itself. The sum is then normalised to a 0–100 brand-confidence score, with the headline copy (\"42/62 clear · 2 critical conflicts\") generated from the underlying tallies."),

  h2("7.3  Chaldean Numerology Engine — proprietary algorithm"),
  p("The Chaldean numerology engine is one of the most distinctive and culturally important components of the work, since it is the layer that traditional Indian naming consultants and family astrologers have used for generations to assess business-name suitability. Figure 3 sets out the engine in detail."),

  ...diagram("03_numerology.png", 580, 369, "Figure 3", "Proprietary Chaldean numerology computation engine"),

  p("The engine operates as follows:"),
  numItem("Step 1 — Letter-to-digit mapping using the traditional Chaldean assignment (A·I·J·Q·Y → 1; B·K·R → 2; C·G·L·S → 3; D·M·T → 4; E·H·N·X → 5; U·V·W → 6; O·Z → 7; F·P → 8). Note: 9 is intentionally omitted in the Chaldean system, being considered sacred."),
  numItem("Step 2 — Per-letter digit lookup, preserving the diacritic-stripped Latin transliteration of the proposed name."),
  numItem("Step 3 — Summation to produce the \"compound number\". The compound number carries an interpretive meaning of its own (e.g. 14 = \"Movement and combinations of people\"; 17 = \"Spiritual upliftment, immortality\"; 26 = \"Treachery, partnerships that fail\")."),
  numItem("Step 4 — Theosophic addition to reduce the compound to a single \"root number\" between 1 and 9. The root number maps to a ruling planet (1 = Sun, 2 = Moon, 3 = Jupiter, 4 = Uranus, 5 = Mercury, 6 = Venus, 7 = Neptune, 8 = Saturn, 9 = Mars)."),
  numItem("Step 5 — Industry-fit overlay (the applicant's proprietary contribution). Each root number is mapped to a set of industries for which the planet is historically considered favourable, and a set for which it is considered unfavourable. A founder-DOB lucky-pairing tag is generated for the user."),

  p("The applicant respectfully submits that while the underlying Chaldean system is in the public domain, the original contribution lies in (a) the industry-fit overlay derived from a proprietary review of Indian business-naming case studies, (b) the worked-example presentation chosen for the user interface, and (c) the integration of the founder-DOB pairing layer as a single-click overlay rather than a separate consultation. These elements together form copyrightable expression."),

  h2("7.4  Linguistic-landmine detector — proprietary algorithm"),
  p("The linguistic-landmine detector operates on the proposed name in the following sequence: (i) transliterate into each of the seven primary Indian scripts via ISO 15919, (ii) tokenise the transliteration and pass each token through a per-language curated dictionary of vulgar, derogatory or unintentionally humorous tokens, (iii) compute an edit-distance check against the curated dictionary to catch near-matches, (iv) flag any match with a status pill (Positive · Neutral · Warn · Avoid) and supply a one-line explanation. The curated dictionaries are the original work of the applicant, compiled through native-speaker consultation."),

  h2("7.5  User Journey and Tier Flow"),
  p("Figure 4 sets out the journey of a single user from arrival on the platform to upgrade into a paid tier, and the relationship between the three commercial tiers."),

  ...diagram("04_user_journey.png", 580, 369, "Figure 4", "Three-tier service portfolio and user-journey mapping"),

  p("The three tiers are:"),
  bullet("Tier 1 — Instant Check (Free). Open access. 62 surface checks. Verdict summary HUD. No PDF, no class-wise trademark breakdown, no warmed-proxy deep scan."),
  bullet("Tier 2 — Deep Legal Scan (One-time ₹49). Adds: warmed proxy sessions on MCA, IP India and Copyright with CAPTCHA solving; full class-wise trademark breakdown for the user-stated industry; downloadable PDF formatted for direct handover to a Chartered Accountant or advocate; a recorded scan ID for evidentiary use."),
  bullet("Tier 3 — Agency (Subscription ₹999/month). Adds to Tier 2: unlimited deep scans; CSV bulk upload for naming agencies clearing 20-50 names per client; white-labelled PDF output; API access; account-level analytics."),

  pageBreak(),
);

// ═════════════════════════════════════════════════════════════════
// 8. UI/UX & DESIGN DOCUMENTATION
// ═════════════════════════════════════════════════════════════════
children.push(
  h1("8. User Interface and Experience Documentation"),

  h2("8.1  Layout and component inventory"),
  p("The user interface of Naam Dekho is composed of the following original components, each laid out and styled by the applicant. The component inventory below is intended to identify protectable expression at the level of layout and visual hierarchy."),
  bullet("Sticky top navigation bar with bilingual logo lockup (Roman \"Naam Dekho\" with italicised \"Dekho\", set above a Devanagari subtitle \"नाम देखो · नाम चेक करो\"), three navigation links, and a primary call-to-action pill button."),
  bullet("Hero section with editorial-grade typography, eyebrow strap (\"One search · 62 platforms · poora desh, ek check\"), oversized italic headline, and a search input set in Cambria/Fraunces serif giving the search bar an editorial feel rather than a utility feel."),
  bullet("Four-card HUD summary strip presenting verdict, legal-risk score, brand-surface score and Chaldean number, each a rounded button-style box."),
  bullet("Horizontal scroll-snap tab strip with eight category tabs, each a rounded button-style box with its own count badge."),
  bullet("Per-category section header with a numeric chapter prefix (01, 02, 03 …) drawn in JetBrains Mono."),
  bullet("Tile-grid of platform results, each tile carrying a platform icon, platform name, status pill, summary detail and footer with source attribution and primary action link."),
  bullet("Class-wise trademark table that re-flows from a four-column desktop grid into card-style stacked rows on mobile."),
  bullet("Linguistic panel comprising a Devanagari preview card and a per-language status list."),
  bullet("Numerology section drawn against a dark-mode contrast panel with gold gradient typography, distinguishing it visually from the rest of the page and signalling its traditional-naming character."),
  bullet("Closing CTA strip and minimal footer."),

  h2("8.2  Design tokens"),
  p("The original design-token palette is as follows. Each token is a deliberate choice that contributes to the overall expression and is therefore claimed as part of the work."),

  fullWidthTable([3000, 2400, 3960], [
    new TableRow({ children: [headerCell("Token", 3000), headerCell("Value", 2400), headerCell("Role", 3960)] }),
    new TableRow({ children: [cell("Background — warm cream", { width: 3000, bold: true }), cell("#FAF8F3", { width: 2400 }), cell("Page background. Warm, calming, editorial.", { width: 3960 })] }),
    new TableRow({ children: [cell("Background secondary", { width: 3000, bold: true }), cell("#F3EFE5", { width: 2400 }), cell("Card surfaces and chip backgrounds.", { width: 3960 })] }),
    new TableRow({ children: [cell("Ink — primary text", { width: 3000, bold: true }), cell("#0F1419", { width: 2400 }), cell("Headings, body text.", { width: 3960 })] }),
    new TableRow({ children: [cell("Accent — terracotta", { width: 3000, bold: true }), cell("#B8501C", { width: 2400 }), cell("Italic emphasis, primary action accents, eyebrow text.", { width: 3960 })] }),
    new TableRow({ children: [cell("Available — green", { width: 3000, bold: true }), cell("#1B5E20 on #E7F2E9", { width: 2400 }), cell("Status pill — Clear / Available.", { width: 3960 })] }),
    new TableRow({ children: [cell("Taken — magenta-pink", { width: 3000, bold: true }), cell("#880E4F on #FCE4EC", { width: 2400 }), cell("Status pill — Taken / Conflict.", { width: 3960 })] }),
    new TableRow({ children: [cell("Warn — amber", { width: 3000, bold: true }), cell("#8A5A00 on #FFF4D9", { width: 2400 }), cell("Status pill — Similar / Warning.", { width: 3960 })] }),
    new TableRow({ children: [cell("Pending — pulse grey", { width: 3000, bold: true }), cell("#6B7480 on #EFEAD9", { width: 2400 }), cell("Status pill — Checking, with a pulsing animation.", { width: 3960 })] }),
    new TableRow({ children: [cell("Numerology gold", { width: 3000, bold: true }), cell("#E8C76A → #B8501C gradient", { width: 2400 }), cell("Special panel — root number numeral.", { width: 3960 })] }),
    new TableRow({ children: [cell("Serif typeface", { width: 3000, bold: true }), cell("Fraunces (web) / Cambria (print)", { width: 2400 }), cell("Headlines, large numerals, brand mark.", { width: 3960 })] }),
    new TableRow({ children: [cell("Sans typeface", { width: 3000, bold: true }), cell("Inter (web) / Calibri (print)", { width: 2400 }), cell("Body, UI labels.", { width: 3960 })] }),
    new TableRow({ children: [cell("Mono typeface", { width: 3000, bold: true }), cell("JetBrains Mono", { width: 2400 }), cell("Counts, labels, technical metadata.", { width: 3960 })] }),
    new TableRow({ children: [cell("Devanagari typeface", { width: 3000, bold: true }), cell("Noto Sans Devanagari", { width: 2400 }), cell("Logo subtitle, transliteration preview.", { width: 3960 })] }),
  ]),

  h2("8.3  Responsive behaviour"),
  p("The work is the first India-first name-checker, to the applicant's knowledge, to be designed mobile-first. Specifically:"),
  bullet("At 1024 px the four-card HUD reflows to a 2×2 grid; the tile grids contract from four-up to three-up."),
  bullet("At 760 px the navigation collapses into a slide-in panel; the search bar stacks (input above, full-width button below) for clean thumb reach; the trademark table reformats from a 4-column row to a stacked card layout; the linguistic rows reflow."),
  bullet("At 380 px the headline font reduces, the page padding tightens to 16 px, and the numerology numeral compresses to 120 px to remain proportional."),

  pageBreak(),
);

// ═════════════════════════════════════════════════════════════════
// 9. ORIGINALITY & DIFFERENTIATION
// ═════════════════════════════════════════════════════════════════
children.push(
  h1("9. Originality and Differentiation"),

  h2("9.1  Originality"),
  p("The work satisfies the originality requirement under Section 13(1)(a) of the Copyright Act, 1957, as interpreted by the Supreme Court in Eastern Book Company v. D.B. Modak (2008) 1 SCC 1 — namely, that the work must originate from the author and reflect a minimal degree of creativity and the exercise of skill and judgment. The applicant respectfully submits that the work plainly satisfies this standard: every aspect — the architecture, the source code, the user interface design, the copy, the proprietary 12-step pipeline, the verdict-scoring rubric, the Chaldean engine's industry-fit overlay, the linguistic dictionaries, the visual identity — has been authored by the applicant from first principles."),

  h2("9.2  Differentiation from prior art"),
  p("The applicant has surveyed the publicly available prior art and submits that no existing tool, Indian or foreign, combines the following five characteristics that are uniquely present in Naam Dekho. The applicant invites the Copyright Office and any subsequent court to consider this combination distinctive:"),

  fullWidthTable([700, 4200, 4460], [
    new TableRow({ children: [headerCell("S. No.", 700), headerCell("Differentiator", 4200), headerCell("Prior art comparison", 4460)] }),
    new TableRow({ children: [cell("1", { width: 700 }), cell("India-first comprehensive registry coverage — MCA, IP India 45 classes, Copyright, GST, FSSAI, DPIIT, RBI, SEBI, IRDAI all in one search.", { width: 4200 }), cell("Foreign tools (e.g. Namechk, Namecheckr, BrandSnag) cover only domains and global social handles. Indian tools (e.g. MCA portal, IP India search) cover only a single register each.", { width: 4460 })] }),
    new TableRow({ children: [cell("2", { width: 700 }), cell("Linguistic-landmine detection across 7+ Indian languages plus Sanskrit etymology.", { width: 4200 }), cell("No Western or Indian tool surveyed performs vulgarity / negative-connotation checks in regional Indian languages.", { width: 4460 })] }),
    new TableRow({ children: [cell("3", { width: 700 }), cell("Integrated Chaldean numerology engine with industry-fit overlay and founder-DOB pairing.", { width: 4200 }), cell("Numerology is typically a standalone consultancy service (paid, slow, opaque). No name-checker integrates it as a first-class column.", { width: 4460 })] }),
    new TableRow({ children: [cell("4", { width: 700 }), cell("Three-tier commercial model with one-time deep scan (₹49) producing a downloadable advocate-ready PDF.", { width: 4200 }), cell("Foreign tools are subscription-only and bundle thin reports. No equivalent India-priced one-time tier in the surveyed market.", { width: 4460 })] }),
    new TableRow({ children: [cell("5", { width: 700 }), cell("Live re-binding user interface where the entire 62-tile result page updates as the user types, before any backend dispatch.", { width: 4200 }), cell("Surveyed tools either require form submission and full page reload, or stream results in a separate panel rather than re-binding the existing layout.", { width: 4460 })] }),
  ]),

  h2("9.3  Why prior art does not preclude protection"),
  p("It is well-settled law that copyright protects expression and not idea (R.G. Anand v. Delux Films, AIR 1978 SC 1613). Even where the abstract concept of \"checking a name across multiple sources\" pre-exists, the applicant's particular expression of that concept — the specific selection of 62 sources, their grouping into seven semantic categories, the original 12-step pipeline, the proprietary scoring rubric, the visual layout, the copy, the integration of regional-language and traditional-numerology layers, and the responsive design — is sufficiently original to attract copyright. As Justice Sinha held in Eastern Book Company, the work need not exhibit \"creative spark\" in the sense of novelty in the patent sense; it need only originate from the author and be the product of skill and judgment."),

  pageBreak(),
);

// ═════════════════════════════════════════════════════════════════
// 10. WORKING PROTOTYPE & FIXATION
// ═════════════════════════════════════════════════════════════════
children.push(
  h1("10. Working Prototype, Fixation and Publication"),

  h2("10.1  Fixation"),
  p("Copyright subsists in a work as soon as it is fixed in a tangible medium of expression. The work has been fixed by the applicant in the following media: (i) source-code files (HTML, CSS, JavaScript), (ii) deployed and accessible at the URL set out in Annexure D, (iii) committed to a private source-code repository under the applicant's control, with timestamped commit history forming a contemporaneous record of authorship, and (iv) the present documentation."),

  h2("10.2  Working prototype"),
  p("A working prototype of the user interface and live-update behaviour has been produced and is accessible at the URL set out in Annexure D. The prototype demonstrates the entire result page including the four-card HUD, the eight filter tabs, all seven semantic sections, the trademark class-wise breakdown, the linguistic panel, the Chaldean numerology panel, the closing call-to-action strip and the footer. The prototype is responsive across desktop, tablet and mobile viewports."),

  h2("10.3  Publication and priority"),
  p("First publication has occurred in India. The country of first publication and the date thereof are accordingly to be entered on Form XIV. The applicant claims a priority date of first authorship corresponding to the earliest commit in the version-controlled source-code repository (the certificate of which forms part of Annexure D)."),

  h2("10.4  Reservation of rights"),
  p("Pending and subsequent to registration, the applicant reserves and shall enforce all rights conferred by Section 14(b) of the Copyright Act, 1957, including the exclusive right to reproduce, issue copies, perform in public, make adaptations and translations, and sell or give on commercial rental copies of the work. Any unauthorised reproduction or substantial adaptation of the work (whether of the source code, the user interface design, the copy, the process flow, the diagrams or the proprietary scoring rubric) will be actionable under Sections 51 and 55 of the said Act and may attract criminal penalties under Sections 63 to 66 of the said Act."),

  pageBreak(),
);

// ═════════════════════════════════════════════════════════════════
// 11. RISK, COMPLIANCE & DISCLAIMERS
// ═════════════════════════════════════════════════════════════════
children.push(
  h1("11. Compliance, Risk Register and Disclaimers"),

  h2("11.1  Compliance posture"),
  p("The work is designed to operate within the four corners of Indian law. The following compliance positions have been adopted and are documented for the record:"),
  bullet("Public-register scraping is limited to data that the underlying authority makes publicly searchable under its enabling statute. No login, credential, or CAPTCHA bypass is performed on registers that prohibit automated access."),
  bullet("Where a register accepts only manual queries, the work places the human-readable deep-link in the result tile and does not perform an automated lookup. The deep-scan tier (₹49) uses commercial CAPTCHA-solving services that the user authorises on a per-scan basis and bills as a third-party pass-through."),
  bullet("Personal data collection is minimised. The platform does not require sign-up for the free tier. For paid tiers, only the user's name, email and (where invoicing is required) GSTIN are collected and processed in accordance with the DPDP Act, 2023."),
  bullet("Third-party trademarks are referenced for nominative-fair-use purposes only — to identify the registers being searched — and not to imply endorsement or affiliation."),
  bullet("The work does not provide legal advice. The result PDF carries a clear disclaimer recommending that the user consult a Chartered Accountant or an advocate enrolled under the Advocates Act, 1961 before incorporation, trademark filing, or any other binding step."),

  h2("11.2  Risk register"),
  fullWidthTable([3200, 3000, 3160], [
    new TableRow({ children: [headerCell("Risk", 3200), headerCell("Likelihood × Impact", 3000), headerCell("Mitigation", 3160)] }),
    new TableRow({ children: [cell("Source format change (e.g. MCA portal redesign)", { width: 3200 }), cell("High × Medium", { width: 3000 }), cell("Modular scraper per source. Each scraper independently versioned and unit-tested. Status pill shows \"Checking…\" if a source temporarily fails.", { width: 3160 })] }),
    new TableRow({ children: [cell("CAPTCHA blocking by source", { width: 3200 }), cell("Medium × Low (paid tier only)", { width: 3000 }), cell("Warmed-proxy session pool with rotation; commercial CAPTCHA solver as fallback for paid tier only.", { width: 3160 })] }),
    new TableRow({ children: [cell("Trademark claim by a third party on the wordmark \"Naam Dekho\"", { width: 3200 }), cell("Low × High", { width: 3000 }), cell("Apply for trade mark in Class 35 (advertising, business management) and Class 42 (SaaS) once first publication is established. Apply in additional classes per category expansion.", { width: 3160 })] }),
    new TableRow({ children: [cell("Allegation that scraping breaches the Information Technology Act, 2000", { width: 3200 }), cell("Low × High", { width: 3000 }), cell("Strict observance of robots.txt and rate limits; written legal opinion procured prior to launch; sources accessed only as authorised by the relevant statute or terms.", { width: 3160 })] }),
    new TableRow({ children: [cell("Copyright infringement claim against the Chaldean overlay", { width: 3200 }), cell("Low × Medium", { width: 3000 }), cell("Industry-fit overlay is an original work of the applicant compiled by review of public-domain naming case studies; original presentation; this filing creates contemporaneous evidence of authorship.", { width: 3160 })] }),
  ]),

  h2("11.3  Limitation of liability"),
  p("The work is a decision-support tool and not a substitute for professional advice. The applicant intends to publish a Limitation-of-Liability clause within the platform's Terms of Use, in conformity with Section 73 of the Indian Contract Act, 1872 and Section 6 of the Consumer Protection Act, 2019, that limits the applicant's liability for any decision a user takes based on the work's output."),

  pageBreak(),
);

// ═════════════════════════════════════════════════════════════════
// 12. ANNEXURES
// ═════════════════════════════════════════════════════════════════
children.push(
  h1("12. Annexures"),

  h2("Annexure A — Source code excerpt"),
  p("To be submitted in compliance with Rule 70(5) of the Copyright Rules, 2013. The applicant will provide either (i) the first ten and last ten pages of the source code with no blocked-out portions, or (ii) the entire source code where it is less than twenty pages. The current prototype source listing for the front-end is appended separately to this document at the time of filing."),

  h2("Annexure B — Screenshots of the working prototype"),
  p("Screenshots of the prototype at three viewport widths (1440 px desktop, 768 px tablet, 390 px mobile) showing: hero search, four-card HUD, tab strip, all seven category sections, trademark table, linguistic panel, Chaldean numerology panel, CTA strip, footer. Annexed separately as Annexure B-1 through B-12."),

  h2("Annexure C — No-Objection Certificates (where applicable)"),
  p("Should there be any joint author of any portion of the work, a no-objection certificate signed by such joint author in the prescribed form. To be filed with Form XIV if applicable."),

  h2("Annexure D — Live prototype URL & repository attestation"),
  p("To be inserted by the Applicant: (i) URL at which the working prototype is accessible; (ii) read-only access details to the version-controlled source-code repository for examination; (iii) cryptographic hash (SHA-256) of the source-code archive as fixed at the date of this filing."),

  h2("Annexure E — Statement of Particulars (Form XIV, Schedule I)"),
  p("To be filed in the form prescribed by Schedule I to the Copyright Rules, 2013. The Statement of Particulars consists of fifteen numbered fields and is appended in a separate page-set as required by the Copyright Office."),

  h2("Annexure F — Power of Attorney / Authorisation"),
  p("If the application is filed through an agent or attorney, an executed power of attorney in the form prescribed under the Copyright Rules, 2013."),

  h2("Annexure G — Search Report of the Trade Marks Registry"),
  p("A search report obtained from the Trade Marks Registry for the wordmark \"Naam Dekho\" in classes 35, 41 and 42 — to evidence that the wordmark itself does not conflict with any prior trade mark registration."),

  pageBreak(),
);

// ═════════════════════════════════════════════════════════════════
// CLOSING DECLARATION
// ═════════════════════════════════════════════════════════════════
children.push(
  h1("13. Closing Declaration"),

  p("I, the Applicant herein, do hereby state on solemn affirmation that the contents of this document, comprising thirteen sections and seven annexures, are true and correct to the best of my knowledge, information and belief, and that this document, together with the prescribed Form XIV, the Statement of Particulars, the prescribed fee and all annexures, is being filed before the Registrar of Copyrights for the registration of the work titled \"Naam Dekho\" as an original literary work (computer programme) within the meaning of Section 2(o) read with Section 2(ffc) of the Copyright Act, 1957."),

  blank(280),
  p("Nothing in this document is to be construed as legal advice. The Applicant has independently sought, and shall continue to seek, legal counsel from an advocate enrolled under the Advocates Act, 1961, before filing and during the prosecution of this application.", { italic: true, color: INK3 }),

  blank(600),
  rich([
    { text: "Signed:", bold: true },
    "                                                                                ",
    { text: "Date:", bold: true },
    "                                  ",
    { text: "Place:", bold: true },
    "                              ",
  ]),
  blank(120),
  p("____________________________________"),
  p("(Applicant / Author / Authorised Signatory)", { color: INK3 }),
  blank(360),
  hr(),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "— End of Document —", font: SERIF, italics: true, size: 22, color: INK3 })],
  }),
);

// ═════════════════════════════════════════════════════════════════
// DOCUMENT ASSEMBLY
// ═════════════════════════════════════════════════════════════════
const doc = new Document({
  creator: "Naam Dekho — Applicant",
  title: "Naam Dekho — Copyright Filing Documentation",
  description: "Comprehensive process, portfolio and procedural documentation in support of an application for copyright registration of a computer programme under the Copyright Act, 1957.",
  styles: {
    default: {
      document: { run: { font: FONT, size: 22, color: INK } },
    },
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
        size: { width: 12240, height: 15840 }, // US Letter
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "NAAM DEKHO · Copyright Filing", font: FONT, size: 16, color: INK3, characterSpacing: 30 })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          children: [
            new TextRun({ text: "Confidential — for filing with the Registrar of Copyrights, DPIIT", font: FONT, size: 16, color: INK3, italics: true }),
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
  const out = path.join(OUT_DIR, "Naam_Dekho_Copyright_Filing.docx");
  fs.writeFileSync(out, buf);
  console.log("Wrote:", out, "(", (buf.length / 1024).toFixed(1), "KB )");
});
