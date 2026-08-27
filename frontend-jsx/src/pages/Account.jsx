import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSeo } from '../lib/useSeo.js'
import { forgetMe } from '../lib/useMe.js'

const API_ORIGIN = import.meta.env.DEV ? 'http://localhost:3000' : ''

export default function Account() {
  useSeo({ title: 'Your account', path: '/account', noindex: true })
  const [me, setMe] = useState(null)
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('nd_token')
    if (!token) { navigate('/sign-in'); return }
    const headers = { Authorization: `Bearer ${token}` }
    Promise.all([
      fetch(`${API_ORIGIN}/v1/me`, { headers }).then(r => (r.ok ? r.json() : null)),
      fetch(`${API_ORIGIN}/v1/me/scans`, { headers }).then(r => (r.ok ? r.json() : { scans: [] })),
    ])
      .then(([meData, scanData]) => {
        if (!meData) { localStorage.removeItem('nd_token'); navigate('/sign-in'); return }
        setMe(meData)
        setScans(scanData.scans ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [navigate])

  const signOut = () => {
    localStorage.removeItem('nd_token')
    // Otherwise the nav keeps showing your name and token balance until the
    // next full page load.
    forgetMe()
    navigate('/')
  }

  const deleteEverything = async () => {
    setDeleting(true)
    try {
      const token = localStorage.getItem('nd_token')
      const res = await fetch(`${API_ORIGIN}/v1/me`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        localStorage.removeItem('nd_token')
        forgetMe()
        navigate('/')
      }
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="container" style={{ padding: '80px 0', textAlign: 'center', color: 'var(--ink-3)' }}>Loading your account…</div>
  }
  if (!me) return null

  return (
    <div className="container">
      <div className="page-hero" style={{ textAlign: 'left' }}>
        <div className="eyebrow">Your account</div>
        {/* Google sign-in is the only way in, so phone is null for every
            account created since 6 Aug 2026 and this heading rendered blank.
            Email is what we actually know about you. */}
        <h1 className="page-title" style={{ margin: 0 }}>{me.email ?? me.phone ?? 'Your account'}</h1>
        <p className="page-sub" style={{ margin: '12px 0 0' }}>
          {/* Tokens are the live balance and what a search actually spends.
              This line used to show only credits — the legacy pre-token shape
              the API still sends — so an account holding 15,425 tokens read
              as "0 Deep Search credits remaining" and looked empty. */}
          <b style={{ color: 'var(--accent)' }}>{me.tokens.balance.toLocaleString('en-IN')}</b>
          {' '}token{me.tokens.balance === 1 ? '' : 's'} remaining
          {me.credits.total > 0 && (
            <>
              {' '}· <b style={{ color: 'var(--accent)' }}>{me.credits.total}</b> Deep Search credit{me.credits.total === 1 ? '' : 's'}
              {me.credits.bundle > 0 && me.credits.bundle_expires_at && (
                <> · bundle expires {new Date(me.credits.bundle_expires_at).toLocaleDateString('en-IN')}</>
              )}
            </>
          )}
          {' '}· <Link to="/pricing" style={{ color: 'var(--accent)', fontWeight: 500 }}>top up</Link>
        </p>
      </div>

      {/* Scan history */}
      <section className="module" style={{ borderBottom: 0 }}>
        <div className="section-head">
          <h2 className="section-title">Your searches</h2>
          <p className="section-desc">Your last 50 searches.</p>
        </div>
        {scans.length === 0 ? (
          <div className="tile" style={{ padding: 28, textAlign: 'center', color: 'var(--ink-3)' }}>
            No searches yet — <Link to="/" style={{ color: 'var(--accent)', fontWeight: 500 }}>run your first check</Link>.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {scans.map(s => (
              <div key={s.scan_id} className="tile" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20 }}>{s.name}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: 'var(--ink-3)', marginTop: 3 }}>
                    {new Date(s.started_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {' '}· {s.mode === 'baby' ? 'Baby name' : 'Business'} · {s.tier === 'standard' ? 'Standard' : 'Deep Search'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {s.verdict_score !== null && (
                    <span className={`pill ${s.conflict > 0 ? 'warn' : 'ok'}`}>
                      {s.clear} clear · {s.conflict} conflict{s.conflict === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Account actions */}
      <section className="module" style={{ borderBottom: 0, paddingTop: 0 }}>
        <div className="section-head">
          <h2 className="section-title">Account</h2>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={signOut} className="sb-btn ghost">Sign out</button>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              style={{ background: 'transparent', border: '1px solid var(--no-line)', color: 'var(--no-ink)', padding: '11px 20px', borderRadius: 10, fontSize: 13.5, fontWeight: 500 }}>
              Delete my account & data
            </button>
          ) : (
            <div className="tile" style={{ borderColor: 'var(--no-line)', background: 'linear-gradient(180deg,var(--no-bg) 0%,#fff 90%)', maxWidth: 560 }}>
              <div style={{ fontWeight: 500 }}>This permanently deletes your account, credits, and every search — as promised under the DPDP Act. It cannot be undone.</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button onClick={deleteEverything} disabled={deleting}
                  style={{ background: 'var(--no-ink)', color: '#fff', border: 0, padding: '10px 18px', borderRadius: 10, fontSize: 13.5, fontWeight: 500 }}>
                  {deleting ? 'Deleting…' : 'Yes, delete everything'}
                </button>
                <button onClick={() => setConfirmDelete(false)} className="sb-btn ghost">Keep my account</button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
