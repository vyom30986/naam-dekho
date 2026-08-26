import { useEffect } from 'react'

const SITE = 'Naam Dekho'

function setMeta(selector, attr, value) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    const [, key, val] = selector.match(/\[(\w+)="([^"]+)"\]/) ?? []
    if (key && val) el.setAttribute(key, val)
    document.head.appendChild(el)
  }
  el.setAttribute(attr, value)
}

function setLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * Per-route title, description, canonical and Open Graph tags.
 *
 * A single-page app serves one index.html to every route, so without this
 * every page would share one title — which is the single most common way an
 * SPA loses search traffic. Google renders JavaScript, so setting these on
 * mount is picked up; the name pages under /n/ are static HTML precisely
 * because they must not depend on that.
 *
 * Pass `noindex` for anything private (account, admin).
 */
export function useSeo({ title, description, path, noindex = false, jsonLd = null }) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE}` : SITE
    document.title = fullTitle

    if (description) {
      setMeta('meta[name="description"]', 'content', description)
      setMeta('meta[property="og:description"]', 'content', description)
    }
    setMeta('meta[property="og:title"]', 'content', fullTitle)
    setMeta('meta[property="og:type"]', 'content', 'website')
    setMeta('meta[name="twitter:card"]', 'content', 'summary_large_image')

    if (path) {
      const url = `${window.location.origin}${path}`
      setLink('canonical', url)
      setMeta('meta[property="og:url"]', 'content', url)
    }

    // Private pages must never be indexed, even if someone links to them.
    const robots = document.head.querySelector('meta[name="robots"]')
    if (noindex) {
      setMeta('meta[name="robots"]', 'content', 'noindex, nofollow')
    } else if (robots) {
      robots.remove()
    }

    let ldTag = null
    if (jsonLd) {
      ldTag = document.createElement('script')
      ldTag.type = 'application/ld+json'
      ldTag.textContent = JSON.stringify(jsonLd)
      document.head.appendChild(ldTag)
    }
    return () => { if (ldTag) ldTag.remove() }
  }, [title, description, path, noindex, jsonLd])
}

/** Organisation + site search markup — used once, on the homepage. */
export const HOME_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: SITE,
      alternateName: 'नाम देखो',
      url: 'https://naamdekho.net',
      description: 'India-first name verification for founders and parents.',
    },
    {
      '@type': 'WebSite',
      name: SITE,
      url: 'https://naamdekho.net',
      inLanguage: 'en-IN',
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: 'https://naamdekho.net/?q={search_term_string}' },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
}
