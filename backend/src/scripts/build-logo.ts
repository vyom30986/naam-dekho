/**
 * Regenerates src/brand/logo-data.ts from the artwork in assets/brand/.
 *
 *   npm run build:logo
 *
 * WHY THIS EXISTS
 * ---------------
 * The mark on the certificate used to be redrawn by hand in SVG — a circle, a
 * rotated rectangle, and the letters set as <text> in Noto Sans Devanagari. It
 * broke twice: once because the letterforms overlapped at 14mm, and once
 * because a renderer without the font substituted its own. Every redrawing was
 * a fresh chance to get the founder's logo subtly wrong.
 *
 * So the logo is no longer drawn. It is the founder's own artwork file, encoded
 * once into a TypeScript constant that the certificate embeds verbatim. There
 * are no fonts to be missing, no paths to be mistyped, and no second version
 * that can drift from the first.
 *
 * The .png (or .svg) in assets/brand/ stays in the repo as the human-readable
 * source of truth. This script derives the constant from it, and the test in
 * __tests__/brand/logo.test.ts re-derives it and fails if the two ever part
 * company — so replacing the artwork without regenerating cannot ship quietly.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
/** <backend>/assets/brand — src/scripts is two levels below the package root. */
export const ASSET_DIR = join(HERE, "..", "..", "assets", "brand");
const OUT = join(HERE, "..", "brand", "logo-data.ts");

/** Formats we will embed. Anything else is a mistake we want to hear about. */
const MIME: Record<string, string> = {
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

/**
 * Reads the artwork file out of assets/brand.
 *
 * Exported so the test can do exactly what this script does and compare — the
 * test must not reimplement the encoding, or it would only be testing itself.
 */
export function readArtwork(): { file: string; mime: string; bytes: Buffer } {
  const files = readdirSync(ASSET_DIR).filter((f) => extname(f).toLowerCase() in MIME);
  if (files.length === 0) {
    throw new Error(`No brand artwork in ${ASSET_DIR} — expected a .png or .svg of the logo.`);
  }
  if (files.length > 1) {
    // Two logo files is how a project ends up shipping the wrong one.
    throw new Error(`More than one artwork file in ${ASSET_DIR}: ${files.join(", ")}. Keep exactly one.`);
  }
  const file = files[0];
  return { file, mime: MIME[extname(file).toLowerCase()], bytes: readFileSync(join(ASSET_DIR, file)) };
}

/** PNG pixel dimensions, straight out of the IHDR chunk. Purely informational. */
function pngSize(b: Buffer): string {
  const isPng = b.length > 24 && b.readUInt32BE(0) === 0x89504e47;
  return isPng ? `${b.readUInt32BE(16)}×${b.readUInt32BE(20)}` : "";
}

export function buildLogoModule(): string {
  const { file, mime, bytes } = readArtwork();
  const base64 = bytes.toString("base64");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const dims = pngSize(bytes);

  return `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Source:   assets/brand/${file}${dims ? `  (${dims})` : ""}
 * Regenerate: npm run build:logo
 *
 * This is the founder's logo artwork, byte for byte. It is embedded rather than
 * redrawn so that no renderer, missing font or well-meaning edit can change how
 * the mark looks. See src/scripts/build-logo.ts for the full reasoning.
 */

/** SHA-256 of the source artwork. The test compares this against the file. */
export const LOGO_SHA256 = ${JSON.stringify(sha256)};

/** Source file name, for error messages. */
export const LOGO_SOURCE = ${JSON.stringify(file)};

/** The artwork as a data URI, ready to drop into an <img src>. */
export const LOGO_DATA_URI =
  "data:${mime};base64," +
${wrap(base64)};
`;
}

/** Breaks the payload into source lines so the file stays diffable and lintable. */
function wrap(b64: string, width = 96): string {
  const lines: string[] = [];
  for (let i = 0; i < b64.length; i += width) lines.push(`  ${JSON.stringify(b64.slice(i, i + width))}`);
  return lines.join(" +\n");
}

// Run as a script (never on import — the test imports the helpers above).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const source = buildLogoModule();
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, source);
  const { file, bytes } = readArtwork();
  console.log(`  wrote src/brand/logo-data.ts from ${file} (${(bytes.length / 1024).toFixed(1)} KB${pngSize(bytes) ? ", " + pngSize(bytes) : ""})`);
}
