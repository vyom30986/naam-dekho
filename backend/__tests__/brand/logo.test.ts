/**
 * Guards on the brand mark.
 *
 * The mark on the certificate has now broken twice, both times because it was
 * being *drawn* rather than embedded — once from overlapping letterforms at
 * small size, once from a missing font. These tests exist so that the third
 * time is caught here rather than on a certificate somebody printed.
 *
 * What they enforce:
 *   1. The committed constant still matches the artwork file it came from.
 *   2. The certificate embeds that constant.
 *   3. Nothing in the certificate draws a mark out of text and shapes again.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { LOGO_DATA_URI, LOGO_SHA256, LOGO_SOURCE, logoMark } from "../../src/brand/logo.js";
import { buildLogoModule, readArtwork } from "../../src/scripts/build-logo.js";
import { renderCertificateHtml } from "../../src/pdf/certificate.js";
import type { CertificateData } from "../../src/pdf/certificate-data.js";

/** A certificate's worth of plausible data — no network, no database. */
const SAMPLE: CertificateData = {
  name: "Aarav",
  devanagari: "आरव",
  scripts: [
    { name: "Devanagari", text: "आरव" },
    { name: "Bengali", text: "আরব" },
  ],
  prose: "A short, verified reading of the name.",
  root: 2,
  compound: 11,
  planet: { name: "Moon", glyph: "☾" },
  saidAs: "Aa·rav",
  syllables: 2,
  shortForms: ["Aaru", "Aari"],
  birthStar: { nakshatra: "Uttara Ashadha", symbol: "🐘", rashi: "Makara (Capricorn)" },
  issuedAt: new Date("2026-08-22T00:00:00Z"),
};

describe("brand mark", () => {
  it("the committed constant still matches the artwork file", () => {
    const { bytes, file } = readArtwork();
    expect(file, "assets/brand holds a different file than the constant was built from").toBe(LOGO_SOURCE);
    expect(
      createHash("sha256").update(bytes).digest("hex"),
      "assets/brand artwork changed — run `npm run build:logo` and commit src/brand/logo-data.ts",
    ).toBe(LOGO_SHA256);
  });

  it("regenerating produces byte-identical output", async () => {
    // Catches the other half of the same mistake: someone hand-editing the
    // generated module so it no longer matches what the script would emit.
    const { readFile } = await import("node:fs/promises");
    const { fileURLToPath } = await import("node:url");
    const onDisk = await readFile(fileURLToPath(new URL("../../src/brand/logo-data.ts", import.meta.url)), "utf8");
    expect(buildLogoModule().replace(/\r\n/g, "\n")).toBe(onDisk.replace(/\r\n/g, "\n"));
  });

  it("is embedded as data, so nothing has to be fetched or installed", () => {
    expect(LOGO_DATA_URI.startsWith("data:image/")).toBe(true);
    expect(LOGO_DATA_URI).toContain(";base64,");
    // A few hundred bytes would mean the artwork went missing and something
    // substituted a placeholder.
    expect(LOGO_DATA_URI.length).toBeGreaterThan(2000);
  });

  it("renders an <img> at a physical width, with the height left free", () => {
    const html = logoMark({ widthMm: 30 });
    expect(html).toContain("width:30mm");
    expect(html).toContain("height:auto");
    expect(html).toContain('alt="Naam Dekho"');
  });
});

describe("the certificate uses that mark and does not draw its own", () => {
  const html = renderCertificateHtml(SAMPLE, {});

  it("embeds the real artwork", () => {
    expect(html).toContain(LOGO_DATA_URI);
  });

  it("draws no letterform in a font the renderer may not have", () => {
    // The old mark set its letters as SVG <text> in Noto Sans Devanagari. On a
    // machine without that font the glyphs were substituted, which is exactly
    // the failure this whole change exists to prevent. The certificate's body
    // type may still name fonts — it has real fallbacks — but no <text> element
    // may appear inside an SVG, because that is where the mark lived.
    const svgs = html.match(/<svg[\s\S]*?<\/svg>/g) ?? [];
    const withText = svgs.filter((s) => /<text[\s>]/.test(s));
    // The numerology wheel legitimately labels its wedges; the mark must not
    // be among them. Anything carrying the brand name is the mark.
    const brandy = withText.filter((s) => /नाम|देखो|क|अ|Naam|Dekho/.test(s));
    expect(brandy, "a brand mark is being drawn from text again").toEqual([]);
  });

  it("carries the mark in both the standalone and embedded renders", () => {
    expect(renderCertificateHtml(SAMPLE, { embedded: true })).toContain(LOGO_DATA_URI);
  });
});
