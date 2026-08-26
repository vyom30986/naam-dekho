import { useEffect, useState } from 'react'
import { adminApi } from './api.js'
import { C } from './AdminShell.jsx'

/**
 * The static SEO pages.
 *
 * They are built by `npm run build:names` and deliberately left out of the
 * customer navigation, so nothing on the site shows they exist — and nothing
 * on the site would show a build that quietly stopped producing them. This
 * screen is the only place they are visible.
 *
 * The number that decides whether any of this works is the gap between pages
 * on disk and URLs in the sitemap. A page nobody links to and the sitemap does
 * not name has no route in at all: it is a file on a server, not a page on the
 * internet. That gap is why the screen exists, so it is stated first and
 * loudly rather than left for the founder to work out from two counts.
 */

/*
 * A plain <a>, never react-router's <Link>. These are static files sitting
 * outside the SPA — a client-side navigation would hand the path to the
 * router, which has no matching route and sends it to the catch-all redirect
 * back to the home page. The founder would conclude the page was missing.
 */
const LINK = {
  color: 'var(--accent)', textDecoration: 'none',
  fontFamily: 'var(--mono)', fontSize: 'var(--t-sm)',
}

const builtOn = (iso) => {
  if (!iso) return null
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function SeoPage() {
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [copied, setCopied] = useState(null)   // 'ok' | 'manual'

  useEffect(() => {
    adminApi.seo().then(setData).catch(e => setErr(e.message))
  }, [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.buildCommand)
      setCopied('ok')
    } catch {
      // The clipboard API is refused outside a secure context, which is how
      // this console is reached whenever it is opened over the LAN by IP.
      // The block is selectable either way, so say that instead of failing
      // silently under a button that appears to have worked.
      setCopied('manual')
    }
  }

  // A failed load must not sit on "Loading…" forever — the founder would read
  // a dead endpoint as a slow one and wait.
  if (err) {
    return (
      <>
        {C.h1('SEO pages', 'The pages that exist only for search engines.')}
        <p className="a-note" style={{ margin: 0, ...C.err }}>{err}</p>
      </>
    )
  }
  if (!data) return <div>Loading the SEO pages…</div>

  const { clusters = [], totalPages = 0, sitemapUrls = 0, sitemapAt, buildCommand } = data
  const gap = totalPages - sitemapUrls

  return (
    <>
      {C.h1(
        'SEO pages',
        `${totalPages.toLocaleString('en-IN')} pages on disk · ${sitemapUrls.toLocaleString('en-IN')} URLs in the sitemap`,
      )}

      {/* The headline verdict. Ordered worst first: nothing built at all beats
          nothing indexed, which beats a partial index. */}
      {totalPages === 0 ? (
        <div className="a-card a-card--accent">
          <div className="a-label">Nothing is built</div>
          <p className="a-body" style={{ margin: 0, ...C.warn }}>
            No SEO pages exist on disk. Every cluster below is empty until the build command
            at the bottom of this page is run.
          </p>
        </div>
      ) : sitemapUrls === 0 ? (
        <div className="a-card a-card--accent">
          <div className="a-label">The sitemap has not been generated</div>
          <div className="a-num" style={C.warn}>{totalPages.toLocaleString('en-IN')}</div>
          <p className="a-body" style={{ margin: 0, ...C.warn }}>
            pages are on disk and no sitemap names any of them. These pages are not linked from
            anywhere on the site, so the sitemap is the only way a crawler learns they exist —
            without it, every one of them is invisible to search.
          </p>
        </div>
      ) : gap > 0 ? (
        <div className="a-card a-card--accent">
          <div className="a-label">Pages no crawler will be told about</div>
          <div className="a-num" style={C.warn}>{gap.toLocaleString('en-IN')}</div>
          <p className="a-body" style={{ margin: 0, ...C.warn }}>
            {gap.toLocaleString('en-IN')} of the {totalPages.toLocaleString('en-IN')} pages on disk
            are missing from the sitemap. Nothing links to them either, so those pages will not be
            found — they are built, served, and unreachable. Re-run the build to regenerate the
            sitemap alongside the pages.
          </p>
        </div>
      ) : (
        <div className="a-card">
          <div className="a-label">Sitemap</div>
          <p className="a-body" style={{ margin: 0 }}>
            <span style={C.ok}>All {totalPages.toLocaleString('en-IN')} pages are named in the sitemap.</span>
            {sitemapUrls > totalPages && ` The sitemap lists ${sitemapUrls.toLocaleString('en-IN')} URLs in total — the extra ones are the ordinary site pages.`}
            {sitemapAt && ` Written ${builtOn(sitemapAt)}.`}
          </p>
        </div>
      )}

      <section className="a-section">
        <h2>Clusters</h2>
        <p className="a-note">
          Each cluster is a folder of pre-rendered HTML. Open a sample to see exactly what a
          visitor or a crawler is served.
        </p>
        <div className="a-stack">
          {clusters.map(c => {
            const built = c.pages > 0
            const when = builtOn(c.builtAt)
            return (
              <div key={c.key} className="a-card">
                <div className="a-row">
                  <div className="a-row__main">
                    {/* The label is the way into the cluster, but only once
                        there is something behind it — linking an empty folder
                        just sends the founder to a 404. */}
                    {built ? (
                      <a href={c.url} target="_blank" rel="noopener noreferrer" className="a-title" style={{ ...LINK, fontSize: 'var(--t-md)' }}>
                        {c.label} ↗
                      </a>
                    ) : (
                      <span className="a-title" style={C.warn}>{c.label}</span>
                    )}
                    <span className="a-note">{c.what}</span>
                    <span className="a-meta">{c.dir}</span>
                  </div>
                  <div className="a-row__side">
                    {built ? (
                      <div style={{ textAlign: 'right' }}>
                        <span className="a-serif" style={{ fontSize: 'var(--t-lg)' }}>
                          {c.pages.toLocaleString('en-IN')}
                        </span>
                        <span className="a-meta"> pages</span>
                        <div className="a-meta">{when ? `built ${when}` : 'build time not recorded'}</div>
                      </div>
                    ) : (
                      <span className="a-chip a-chip--warn">not built yet</span>
                    )}
                  </div>
                </div>

                {built ? (
                  (c.sample ?? []).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s2) var(--s4)' }}>
                      {c.sample.map(u => (
                        <a key={u} href={u} target="_blank" rel="noopener noreferrer" style={LINK}>{u}</a>
                      ))}
                    </div>
                  )
                ) : (
                  <p className="a-body" style={{ margin: 0, ...C.warn }}>
                    Zero pages. Not an empty success — nothing has been generated into{' '}
                    <code style={{ fontFamily: 'var(--mono)', fontSize: 'var(--t-sm)' }}>{c.dir}</code>,
                    so every URL in this cluster answers 404 today.
                  </p>
                )}
              </div>
            )
          })}
          {clusters.length === 0 && (
            <div className="a-note">No clusters are configured.</div>
          )}
        </div>
      </section>

      <section className="a-section">
        <h2>Rebuilding</h2>
        <p className="a-note">
          These pages are static files. Nothing on this screen changes them, and neither does
          editing the corpus — the counts above only move when this command is run on the server.
        </p>
        <div className="a-card">
          <div
            style={{
              fontFamily: 'var(--mono)', fontSize: 'var(--t-base)', color: 'var(--ink)',
              background: 'var(--field)', border: '1px solid var(--line-2)', borderRadius: 8,
              padding: 'var(--s3)', overflowX: 'auto', whiteSpace: 'pre',
              userSelect: 'all',   // one click selects the whole command
            }}
          >
            {buildCommand}
          </div>
          <div className="a-actions">
            <button className="a-btn a-btn--ghost a-btn--sm" onClick={copy}>Copy</button>
            {copied === 'ok' && <span className="a-meta" style={C.ok}>copied</span>}
            {copied === 'manual' && (
              <span className="a-meta" style={C.warn}>
                the browser refused the clipboard here — select the line above and copy it
              </span>
            )}
          </div>
        </div>
      </section>

      <p className="a-note" style={{ margin: 0, maxWidth: '62ch' }}>
        These pages are intentionally absent from the site navigation: there is no menu item and
        no link to them anywhere on the customer site. They are not hidden content — the file a
        search engine is served is the same file a person is served, byte for byte. Unlinked, not
        cloaked.
      </p>
    </>
  )
}
