import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSeo } from '../lib/useSeo.js'

const API_ORIGIN = import.meta.env.DEV ? 'http://localhost:3000' : ''

/**
 * Defined at module scope on purpose. A component declared inside a render
 * function is a brand-new type on every render, so React unmounts and
 * remounts it each time — losing DOM state and thrashing the tree.
 */
function Metric({ label, value, note }) {
  return (
    <div className="tile" style={{ gap: 2 }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{label}</div>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 34, lineHeight: 1.1 }}>{value}</div>
      {note && <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{note}</div>}
    </div>
  )
}

/**
 * Founder's console. Read-only.
 *
 * Access is by Google email: sign in normally, and the backend checks your
 * address against ADMIN_EMAILS in .env. Nothing on this page can change or
 * delete data — it exists so the founder can see the business without asking.
 */
export default function Admin() {
  useSeo({ title: "Founder's console", path: '/admin', noindex: true })
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('nd_token')
    if (!token) { navigate('/sign-in'); return }
    const headers = { Authorization: `Bearer ${token}` }

    Promise.all([
      fetch(`${API_ORIGIN}/v1/admin/stats`, { headers }),
      fetch(`${API_ORIGIN}/v1/admin/recent`, { headers }),
    ])
      .then(async ([sRes, rRes]) => {
        if (sRes.status === 403) {
          // Name the account. With two Google accounts in one browser, the
          // chooser can silently pick the other one and "not an admin" tells
          // you nothing about which address was actually used.
          const body = await sRes.json().catch(() => ({}))
          throw new Error(
            body.signed_in_as
              ? `You are signed in as ${body.signed_in_as}, which is not on the admin list.`
              : 'This account is not an admin.'
          )
        }
        if (sRes.status === 401) { navigate('/sign-in'); return }
        if (sRes.status === 503) {
          const body = await sRes.json().catch(() => ({}))
          throw new Error(body.message ?? 'Admin is not configured yet. Add ADMIN_PHONES to the backend .env file.')
        }
        if (!sRes.ok) throw new Error('Could not load the figures.')
        setStats(await sRes.json())
        if (rRes.ok) setRecent((await rRes.json()).scans ?? [])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [navigate])

  if (loading) {
    return <div className="container" style={{ padding: '80px 0', textAlign: 'center', color: 'var(--ink-3)' }}>Loading your figures…</div>
  }

  if (error) {
    return (
      <div className="container" style={{ padding: '60px 0' }}>
        <div className="tile" style={{ maxWidth: 620, borderColor: 'var(--no-line)', background: 'linear-gradient(180deg,var(--no-bg) 0%,#fff 90%)' }}>
          <div style={{ fontWeight: 500, marginBottom: 6 }}>{error}</div>
          <div style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>
            To grant access, add the Google email you sign in with to{' '}
            <code>ADMIN_EMAILS</code> in <code>backend/.env</code> (comma-separated for
            more than one), then restart the backend.
          </div>
          <Link to="/" style={{ color: 'var(--accent)', fontWeight: 500, marginTop: 10 }}>← Back to the site</Link>
        </div>
      </div>
    )
  }

  const maxDaily = Math.max(1, ...(stats.daily_searches ?? []).map(d => d.searches))

  return (
    <div className="container">
      <div className="page-hero" style={{ textAlign: 'left' }}>
        <div className="eyebrow">Founder's console</div>
        <h1 className="page-title" style={{ margin: 0 }}>The numbers</h1>
        <p className="page-sub" style={{ margin: '10px 0 0' }}>
          Read-only. Updated {new Date(stats.generated_at).toLocaleString('en-IN')}.
        </p>
      </div>

      <section className="module" style={{ borderBottom: 0 }}>
        <div className="section-head"><h2 className="section-title">People</h2></div>
        <div className="preview-grid">
          <Metric label="Total signups" value={stats.users.total} />
          <Metric label="Last 7 days" value={stats.users.last_7_days} />
          <Metric label="Last 24 hours" value={stats.users.last_24_hours} />
          <Metric label="Tokens outstanding" value={(stats.users.tokens_outstanding ?? 0).toLocaleString('en-IN')} note="Unspent, across all accounts" />
        </div>
      </section>

      <section className="module" style={{ borderBottom: 0, paddingTop: 0 }}>
        <div className="section-head"><h2 className="section-title">Searches</h2></div>
        <div className="preview-grid">
          <Metric label="Total" value={stats.scans.total} />
          <Metric label="Last 7 days" value={stats.scans.last_7_days} />
          <Metric label="Deep Searches" value={stats.scans.deep_searches} note="350-token tier" />
          <Metric label="Average verdict" value={`${stats.scans.average_verdict}/100`} />
          <Metric label="Business" value={stats.scans.business} />
          <Metric label="Baby names" value={stats.scans.baby} />
        </div>
      </section>

      <section className="module" style={{ borderBottom: 0, paddingTop: 0 }}>
        <div className="section-head">
          <h2 className="section-title">Revenue</h2>
        </div>
        <div className="tile" style={{ maxWidth: 620 }}>
          <div style={{ fontWeight: 500 }}>No payments taken yet.</div>
          <div style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>{stats.revenue.note}</div>
        </div>
      </section>

      {stats.daily_searches?.length > 0 && (
        <section className="module" style={{ borderBottom: 0, paddingTop: 0 }}>
          <div className="section-head">
            <h2 className="section-title">Last 14 days</h2>
            <p className="section-desc">Searches per day.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 130, padding: '0 2px' }}>
            {stats.daily_searches.map(d => (
              <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }} title={`${d.day}: ${d.searches}`}>
                <div style={{ width: '100%', height: `${(d.searches / maxDaily) * 100}%`, minHeight: 3, background: 'var(--accent)', borderRadius: '4px 4px 0 0', opacity: .85 }} />
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--ink-3)' }}>{d.day.slice(8)}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {stats.top_names?.length > 0 && (
        <section className="module" style={{ borderBottom: 0, paddingTop: 0 }}>
          <div className="section-head">
            <h2 className="section-title">Most-searched names</h2>
            <p className="section-desc">The best guide to which name pages to publish next.</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {stats.top_names.map(n => (
              <span key={n.name} className="pill" style={{ fontSize: 13 }}>
                {n.name} <b style={{ color: 'var(--accent)' }}>{n.searches}</b>
              </span>
            ))}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section className="module" style={{ borderBottom: 0, paddingTop: 0 }}>
          <div className="section-head">
            <h2 className="section-title">Latest searches</h2>
            <p className="section-desc">Spot-check that results look right.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recent.slice(0, 25).map(s => (
              <div key={s.scanId} className="tile" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, padding: '12px 16px' }}>
                <div>
                  <span style={{ fontFamily: "'Fraunces', serif", fontSize: 18 }}>{s.name}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: 'var(--ink-3)', marginLeft: 10 }}>
                    {new Date(s.startedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {' · '}{s.mode === 'baby' ? 'Baby' : 'Business'}{' · '}{s.tier === 'standard' ? 'Standard' : 'Deep'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {s.score !== null && <span className={`pill ${s.conflicts > 0 ? 'warn' : 'ok'}`}>{s.score}/100</span>}
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: 'var(--ink-3)' }}>{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
