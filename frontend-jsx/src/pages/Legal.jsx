import { useEffect, useState } from 'react'
import docs from '../legal/index.js'
import { useSeo } from '../lib/useSeo.js'

const API_ORIGIN = import.meta.env.DEV ? 'http://localhost:3000' : ''

const stripTags = (s = '') => s.replace(/<[^>]*>/g, '').trim()

/**
 * Legal / policy pages — content ported verbatim from the approved
 * Naam_Dekho_Legal_Policies documents ("Do not deviate").
 *
 * The document shipped in this bundle renders immediately, then is replaced if
 * the console has published an edited version. That order is deliberate: these
 * pages are required to be reachable by both the DPDP Act and Razorpay's KYC,
 * so they must never wait on, or be broken by, a network call. Every way the
 * request can fail — offline, no override stored, database down, API not
 * running — lands in the same place: keep showing what shipped.
 *
 * The HTML is still trusted content, but it is no longer only ours: an admin
 * can now write it from the console. It is stripped of anything executable on
 * the way into the database (see backend/src/lib/legalDocs.ts), because
 * console access can be delegated, and "may edit a policy" must not quietly
 * mean "may run script in every visitor's browser".
 */
export default function Legal({ slug }) {
  /* The fetched document is stored WITH the slug it belongs to, rather than
     being cleared when the slug changes. Clearing would mean setting state
     synchronously inside the effect, and a stale response arriving after a
     navigation would still show the previous policy under the new heading.
     Comparing on read makes both problems impossible. */
  const [override, setOverride] = useState(null)

  useEffect(() => {
    let alive = true
    fetch(`${API_ORIGIN}/v1/legal/${slug}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (alive && d?.document) setOverride({ slug, doc: d.document }) })
      .catch(() => { /* the bundled copy is already on screen */ })
    return () => { alive = false }
  }, [slug])

  const doc = (override?.slug === slug ? override.doc : null) ?? docs[slug]

  useSeo({
    title: stripTags(doc?.title) || 'Legal',
    description: stripTags(doc?.sub) || undefined,
    path: `/${slug}`,
  })

  useEffect(() => { window.scrollTo(0, 0) }, [slug])

  if (!doc) return null

  return (
    <div>
      <header className="page-hero">
        <div className="container">
          <div className="eyebrow">— Legal</div>
          <h1 className="page-title" dangerouslySetInnerHTML={{ __html: doc.title }} />
          <p className="page-sub" dangerouslySetInnerHTML={{ __html: doc.sub }} />
          <div className="effective-date" dangerouslySetInnerHTML={{ __html: doc.date }} />
        </div>
      </header>
      <div dangerouslySetInnerHTML={{ __html: doc.html }} />
    </div>
  )
}
