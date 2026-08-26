/**
 * The Naam Dekho mark, as it appears on anything we print or render.
 *
 * There is exactly one of these in the backend, and it is the founder's own
 * artwork embedded as data — not a redrawing of it.
 *
 * The mark on the certificate was previously hand-built in SVG: a stroked
 * circle for the lens, a rotated rounded rectangle for the handle, and the
 * letterforms set as <text> in Noto Sans Devanagari. That approach failed
 * twice. At 14mm the letters overlapped into a blot, and on any renderer
 * without the font the glyphs were substituted by something else entirely.
 * Both times the fix was another redrawing, which is another chance to get
 * someone's logo subtly wrong.
 *
 * So: no drawing. The bytes of the supplied file, encoded once by
 * src/scripts/build-logo.ts, embedded verbatim. Nothing here depends on a
 * font, a network fetch, or a file being present at runtime.
 *
 * To change the logo: replace the file in assets/brand/, run
 * `npm run build:logo`, and commit both. The test in __tests__/brand/logo.test.ts
 * fails if you do one without the other.
 */
import { LOGO_DATA_URI, LOGO_SHA256, LOGO_SOURCE } from "./logo-data.js";

export { LOGO_DATA_URI, LOGO_SHA256, LOGO_SOURCE };

export interface MarkOptions {
  /** Printed width in millimetres. Height follows the artwork's own ratio. */
  widthMm: number;
  /** 1 = full strength. The certificate foot sits it back a little. */
  opacity?: number;
  /** Extra class, for whatever stylesheet is placing it. */
  className?: string;
}

/**
 * The mark as an <img>, sized in mm so it prints at a known physical size.
 *
 * An <img> rather than an inline <svg> on purpose: it cannot inherit a stray
 * fill, stroke or font-family from the page it lands in, which is how a mark
 * picks up a colour nobody chose.
 *
 * Height is deliberately left to the browser. Pinning both axes is how artwork
 * gets stretched when someone later swaps in a file of a different shape.
 */
export function logoMark({ widthMm, opacity = 1, className = "" }: MarkOptions): string {
  const cls = ["brandmark", className].filter(Boolean).join(" ");
  const style = [
    `width:${widthMm}mm`,
    "height:auto",
    opacity === 1 ? "" : `opacity:${opacity}`,
    // Never let a stylesheet's `img{max-width:100%}` shrink it below its
    // intended physical size on a narrow render.
    "flex-shrink:0",
  ]
    .filter(Boolean)
    .join(";");

  return `<img class="${cls}" src="${LOGO_DATA_URI}" alt="Naam Dekho" style="${style}">`;
}
