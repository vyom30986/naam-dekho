import { useEffect } from 'react'
import docs from '../legal/index.js'
import { useSeo } from '../lib/useSeo.js'

const stripTags = (s = '') => s.replace(/<[^>]*>/g, '').trim()

/**
 * Legal / policy pages — content ported verbatim from the approved
 * Naam_Dekho_Legal_Policies documents ("Do not deviate"). The HTML is our
 * own trusted, build-time content, not user input.
 */
export default function Legal({ slug }) {
  const doc = docs[slug]

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
