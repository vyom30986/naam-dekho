import logoLight from '../assets/naam-dekho-logo.png'
import logoDark from '../assets/naam-dekho-logo-dark.png'

/**
 * The Naam Dekho mark — the founder's own artwork, not a redrawing of it.
 *
 * This used to be a hand-built SVG: the magnifier as a stroked circle, the
 * handle as a rotated rectangle, and the letterforms set as <text> in Noto Sans
 * Devanagari and Inter. It broke twice. On a dark ground the near-black ink
 * disappeared and only "Naam" was visible; at nav size the four letterforms
 * inside the lens collapsed into a blot. Each fix was another redrawing, which
 * is another chance to get someone's logo subtly wrong.
 *
 * So the rule the certificate already follows applies here too: the bytes of
 * the supplied file, embedded, never redrawn. The dark file is that same
 * artwork recoloured pixel by pixel — black ink to cream, the lens interior to
 * the page's own dark so the glass reads as glass rather than a headlight, and
 * every orange pixel left exactly as it was drawn. Regenerate it with
 * scratchpad/dark-logo.cjs if the artwork is ever replaced.
 *
 * Both files are always in the DOM and CSS chooses between them, because the
 * theme has three states: an explicit choice stamps data-theme on <html>, and
 * the default "follow my device" setting stamps nothing at all. Choosing in
 * JavaScript would mean tracking a media query here, and would still show the
 * wrong one for a frame on load.
 */
export default function BrandLogo({ height = 40, dark = false }) {
  /* The artwork is 480×242, so only the height is pinned and the width follows.
     Pinning both is how a future file of a different shape gets stretched. */
  /* No `display` here on purpose. An inline style outranks every stylesheet
     rule, so setting display:block inline made BOTH files render at once and
     the theme switch below was silently dead. The class owns display. */
  const style = { height, width: 'auto' }

  // The footer is dark whatever the page theme is, so it asks for the dark file
  // outright rather than letting the theme decide.
  if (dark) return <img src={logoDark} alt="Naam Dekho" style={style} />

  return (
    <>
      <img className="brandmark brandmark--light" src={logoLight} alt="Naam Dekho" style={style} />
      <img className="brandmark brandmark--dark" src={logoDark} alt="" aria-hidden="true" style={style} />
    </>
  )
}
