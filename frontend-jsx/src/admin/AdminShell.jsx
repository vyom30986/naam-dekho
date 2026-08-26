import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { adminApi } from './api.js'
import './admin.css'

/**
 * The founder console shell — deliberately NOT the customer site's look.
 *
 * Dark sidebar, mono labels, no marketing chrome. The founder should always
 * know at a glance which world they are standing in: the warm paper-white
 * site sells; this dark console runs the business.
 *
 * Layout and type live in admin.css. Only the shell chrome is styled here,
 * because it is a single fixed frame rather than something pages compose.
 */
const S = {
  shell: { display: 'flex', minHeight: '100vh', background: '#12100d', color: '#f5ebd8' },
  side: {
    width: 232, flexShrink: 0, borderRight: '1px solid rgba(245,235,216,.12)',
    padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 1,
    position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
  },
  brand: { padding: '0 20px 20px', borderBottom: '1px solid rgba(245,235,216,.12)', marginBottom: 16 },
  link: {
    display: 'block', padding: '10px 20px', color: 'rgba(245,235,216,.66)',
    fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: '.06em',
    textDecoration: 'none', borderLeft: '2px solid transparent',
  },
  linkActive: { color: '#f5ebd8', background: 'rgba(245,235,216,.06)', borderLeft: '2px solid #c98b2d' },
  // 32px gutter, matching the sidebar's 20px plus the eye's expectation of a
  // wider margin against a content column.
  main: { flex: 1, padding: '32px', minWidth: 0 },
  foot: { marginTop: 'auto', padding: '16px 20px', fontSize: 11, color: 'rgba(245,235,216,.4)', fontFamily: "'JetBrains Mono', monospace" },
}

const LINKS = [
  ['/admin', 'Dashboard', true],
  ['/admin/pricing', 'Pricing', false],
  ['/admin/corpus', 'Name pages', false],
  ['/admin/seo', 'SEO pages', false],
  ['/admin/checks', 'Checks', false],
  ['/admin/users', 'Users', false],
  ['/admin/api', 'API keys', false],
  ['/admin/audit', 'Audit log', false],
  ['/admin/test', 'Test menu', false],
  // Last on purpose. It is opened a few times a year, and it is the one
  // screen where a mis-click changes who can read the customers' data.
  ['/admin/access', 'Admin access', false],
]

export default function AdminShell() {
  const [gate, setGate] = useState({ state: 'checking', error: null })
  const navigate = useNavigate()

  useEffect(() => {
    if (!localStorage.getItem('nd_token')) { navigate('/sign-in'); return }
    adminApi.stats()
      .then(() => setGate({ state: 'ok', error: null }))
      .catch(e => {
        if (e.status === 401) { navigate('/sign-in'); return }
        setGate({ state: 'denied', error: e.message })
      })
  }, [navigate])

  if (gate.state === 'checking') {
    return <div style={{ ...S.shell, alignItems: 'center', justifyContent: 'center' }}>Opening the console…</div>
  }
  if (gate.state === 'denied') {
    return (
      <div style={{ ...S.shell, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 480, textAlign: 'center', padding: 24 }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 26, marginBottom: 10 }}>Not your console</div>
          <p style={{ color: 'rgba(245,235,216,.66)', fontSize: 14, lineHeight: 1.6 }}>{gate.error}</p>
          <Link to="/" style={{ color: '#c98b2d' }}>← Back to the site</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="admin" style={S.shell}>
      <aside style={S.side}>
        <div style={S.brand}>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 19 }}>Naam Dekho</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '.14em', color: '#c98b2d', textTransform: 'uppercase', marginTop: 3 }}>
            Founder console
          </div>
        </div>
        {LINKS.map(([to, label, end]) => (
          <NavLink key={to} to={to} end={end}
            style={({ isActive }) => (isActive ? { ...S.link, ...S.linkActive } : S.link)}>
            {label}
          </NavLink>
        ))}
        <div style={S.foot}>
          <Link to="/" style={{ color: 'rgba(245,235,216,.5)', textDecoration: 'none' }}>← Customer site</Link>
        </div>
      </aside>
      <main style={S.main}>
        {/* .a-page gives every page the same column width and the same
            vertical rhythm between sections, so pages cannot drift apart. */}
        <div className="a-page">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

/**
 * Shared console primitives.
 *
 * The style objects are kept as thin aliases onto the CSS classes so the
 * pages that already spread them (`{...C.card}`) keep working unchanged —
 * this was a presentation fix, and rewriting every page's markup would have
 * risked the behaviour the founder asked me not to touch. New markup should
 * use the class names directly.
 */
export const C = {
  h1: (text, sub) => (
    <header className="a-head">
      <h1>{text}</h1>
      {sub && <p>{sub}</p>}
    </header>
  ),
  // Kept for pages that spread these into style={{...}}. Values now match
  // admin.css exactly, so a spread card and a .a-card are indistinguishable.
  card: {
    background: 'rgba(245,235,216,.045)', border: '1px solid rgba(245,235,216,.12)',
    borderRadius: 10, padding: '1rem',
  },
  label: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: '0.625rem', letterSpacing: '.1em',
    textTransform: 'uppercase', color: 'rgba(245,235,216,.48)', lineHeight: 1.4,
  },
  input: {
    background: '#1c1915', border: '1px solid rgba(245,235,216,.22)', borderRadius: 8,
    color: '#f5ebd8', padding: '0.5rem 0.75rem', fontSize: '0.875rem', width: '100%', outline: 'none',
  },
  btn: {
    background: '#c98b2d', color: '#12100d', border: '1px solid transparent', borderRadius: 8,
    padding: '0.5rem 1rem', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
    lineHeight: 1.4, whiteSpace: 'nowrap',
  },
  btnGhost: {
    background: 'transparent', color: '#f5ebd8', border: '1px solid rgba(245,235,216,.22)',
    borderRadius: 8, padding: '0.5rem 1rem', fontSize: '0.8125rem', cursor: 'pointer',
    lineHeight: 1.4, whiteSpace: 'nowrap',
  },
  ok: { color: '#7fbf6a' },
  warn: { color: '#e3a13c' },
  err: { color: '#e07a6a' },
}
