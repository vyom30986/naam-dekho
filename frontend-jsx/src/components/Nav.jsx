import { NavLink, Link } from 'react-router-dom'
import { useState } from 'react'
import BrandLogo from './BrandLogo.jsx'
import { useMe } from '../lib/useMe.js'
import { useTheme } from '../lib/useTheme.js'

export function Logo({ dark = false, height = 44, tagline = true }) {
  // Easter egg. The mark is a magnifying glass held over a name, so on the
  // fifth click it does what it is drawn doing: a lens of light sweeps the
  // letters, and the phrase the founder named the company for appears.
  // Navigation is never blocked — the click still goes home, as it should.
  const [taps, setTaps] = useState(0)
  const [inspecting, setInspecting] = useState(false)

  const onTap = () => {
    const next = taps + 1
    if (next >= 5) {
      setTaps(0)
      setInspecting(true)
      setTimeout(() => setInspecting(false), 4000)
    } else {
      setTaps(next)
    }
  }

  return (
    <Link
      to="/"
      className="logo"
      onClick={onTap}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}
    >
      <BrandLogo height={height} dark={dark} />
      {inspecting && <span className="nd-glass" aria-hidden="true" />}
      {/* Bilingual tagline from the original site — part of the brand mark,
          not decoration. Hidden on narrow screens where it would crowd. */}
      {tagline && (
        <span
          className="logo-tagline"
          style={{
            fontFamily: "'Noto Sans Devanagari', serif",
            fontSize: 12,
            lineHeight: 1.3,
            color: dark ? 'rgba(245,235,216,.62)' : 'var(--ink-3)',
            borderLeft: `1px solid ${dark ? 'rgba(245,235,216,.22)' : 'var(--line)'}`,
            paddingLeft: 12,
            whiteSpace: 'nowrap',
          }}
        >
          नाम देखो · नाम चेक करो
        </span>
      )}
      {inspecting && (
        <span className="nd-egg">नाम में क्या रखा है? · बहुत कुछ.</span>
      )}
    </Link>
  )
}


/**
 * Light, dark, or follow the device.
 *
 * Three states rather than two, because the honest default is the one the
 * customer's phone is already set to — a naming app is opened at odd hours.
 * The half-filled circle is that default; sun and moon are explicit choices.
 */
function ThemeToggle() {
  const { theme, cycle } = useTheme()
  const label =
    theme === 'system' ? 'Theme: follows your device'
      : theme === 'dark' ? 'Theme: dark'
        : 'Theme: light'
  return (
    <button type="button" className="theme-btn" onClick={cycle} aria-label={label} title={label}>
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      ) : theme === 'light' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none"/></svg>
      )}
    </button>
  )
}
export default function Nav() {
  const [open, setOpen] = useState(false)
  const me = useMe() // null = signed out / not loaded yet

  const signedIn = me !== null
  const credits = me?.tokens?.balance ?? 0
  // Just the part before the @ — the full address is too long for a nav bar,
  // and it is the founder's own screen, not a public profile.
  const who = me?.email ? me.email.split('@')[0] : null

  const linkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`

  return (
    <>
      {/* The bar is sticky and full-width; the container inside it keeps the
          content aligned with the rest of the page. The background used to sit
          on the <nav>, which is inside the 1240px container — so the bar was a
          floating block in the middle of the screen rather than a bar. */}
      <div className="topbar">
        <div className="container">
          <nav className="topnav">
          <Logo />
          <div className="nav-right">
            {signedIn && (
              <Link to="/account" className={`nav-credits${credits < 50 ? ' low' : ''}`} title="Your account & tokens">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                <span className="credits-count"><b>{credits.toLocaleString('en-IN')}</b> tokens</span>
              </Link>
            )}
            <NavLink to="/how-it-works" className={linkClass}>How it works</NavLink>
            <NavLink to="/pricing" className={linkClass}>Pricing</NavLink>
            <NavLink to="/pricing?audience=agency" className="nav-link">For agencies</NavLink>
            {me?.is_admin && <NavLink to="/admin" className={linkClass}>Console</NavLink>}
            <ThemeToggle />
            {/* Signed in? Then "Sign in" is nonsense — show who you are instead. */}
            {signedIn
              ? <Link to="/account" className="nav-cta" title={me.email ?? 'Your account'}>{who ?? 'Account'}</Link>
              : <Link to="/sign-in" className="nav-cta">Sign in</Link>}
            <button className="nav-toggle" onClick={() => setOpen(true)} aria-label="Open menu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>
            </button>
          </div>
        </nav>
      </div>
      </div>

      {/* Mobile menu overlay */}
      <div className={`mobile-menu${open ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
        <div className="mobile-menu-panel">
          <div className="mobile-menu-head">
            <Logo height={36} />
            <button className="menu-close" onClick={() => setOpen(false)} aria-label="Close menu">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>
            </button>
          </div>
          <Link to="/how-it-works" onClick={() => setOpen(false)}>How it works</Link>
          <Link to="/pricing" onClick={() => setOpen(false)}>Pricing</Link>
          <Link to="/pricing?audience=agency" onClick={() => setOpen(false)}>For agencies</Link>
          {me?.is_admin && <Link to="/admin" onClick={() => setOpen(false)}>Console</Link>}
          {signedIn
            ? <Link to="/account" onClick={() => setOpen(false)} className="nav-cta">
                {who ?? 'Account'} · {credits.toLocaleString('en-IN')} tokens
              </Link>
            : <Link to="/sign-in" onClick={() => setOpen(false)} className="nav-cta">Sign in</Link>}
        </div>
      </div>
    </>
  )
}
