import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { adminApi } from './api.js'
import { C } from './AdminShell.jsx'
import { loadGoogleScript } from '../lib/googleSignIn.js'

/**
 * API keys and what they cost.
 *
 * Two deliberate constraints, both visible to the person using the page:
 *
 * 1. Keys are WRITE-ONLY. You see sk_live_…a7f9 and can replace it; you can
 *    never read one back. Someone who gets into your session can break the
 *    payments — which you notice in minutes — but cannot walk off with the
 *    secret.
 * 2. The money is OUR ESTIMATE. We count our own calls and multiply by the
 *    published rate. Said plainly on the page, because a number that looks
 *    like an invoice and isn't one is worse than no number.
 */
/**
 * What the console says about a key, and in what colour.
 *
 * Red is spent sparingly on purpose. The backend only reports "failing"
 * after five failures spanning at least half an hour with no success between
 * them, because one rate-limited Gemini call already writes three failure
 * rows. A panel that is red every day from ordinary throttling is a panel
 * nobody reads.
 */
const HEALTH = {
  failing:        { label: 'NOT WORKING', fg: '#F5C0C0', bg: 'rgba(190,60,60,.20)', bd: 'rgba(230,90,90,.55)' },
  was_failing:    { label: 'WAS FAILING', fg: '#E8C76A', bg: 'rgba(200,160,60,.16)', bd: 'rgba(232,199,106,.45)' },
  working:        { label: 'WORKING',     fg: '#A8D8B0', bg: 'rgba(70,150,90,.16)',  bd: 'rgba(120,200,140,.40)' },
  no_data:        { label: 'NOT MEASURED', fg: 'rgba(245,235,216,.55)', bg: 'rgba(245,235,216,.06)', bd: 'rgba(245,235,216,.18)' },
  not_configured: { label: 'MISSING',     fg: 'rgba(245,235,216,.45)', bg: 'rgba(245,235,216,.05)', bd: 'rgba(245,235,216,.15)' },
}

const onDay = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function HealthChip({ usage }) {
  const h = HEALTH[usage?.health] ?? HEALTH.no_data
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, letterSpacing: '.1em',
        padding: '3px 8px', borderRadius: 999, whiteSpace: 'nowrap',
        color: h.fg, background: h.bg, border: `1px solid ${h.bd}`,
      }}>{h.label}</span>
      {usage?.failingSince && (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: h.fg, opacity: .85 }}>
          since {onDay(usage.failingSince)}
        </span>
      )}
    </span>
  )
}
export default function ApiPage() {
  const [unlocked, setUnlocked] = useState(false)
  const [password, setPassword] = useState('')
  const [data, setData] = useState(null)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(null)   // env name being replaced
  const [newValue, setNewValue] = useState('')
  const [newPw, setNewPw] = useState('')
  const [curPw, setCurPw] = useState('')
  const [showKeys, setShowKeys] = useState(false)  // the per-key breakdown
  const [forgot, setForgot] = useState(false)      // recovery shown on the lock screen
  const googleBtnRef = useRef(null)
  // React Router hands out a fresh key on every navigation, including one to
  // the page you are already on — so pressing "API keys" in the sidebar
  // re-locks even when it does not remount the component.
  const { key: navKey } = useLocation()

  const changePassword = async ({ currentPassword, credential }) => {
    setBusy(true); setMsg(null)
    try {
      const out = await adminApi.changeApiPassword({ newPassword: newPw, currentPassword, credential })
      setNewPw(''); setCurPw('')
      setForgot(false)   // back to the password box, which now takes the new one
      setMsg({
        kind: 'ok',
        text: `Password changed — verified by ${out.verified_by === 'google_reauth' ? 'Google' : 'your current password'}. ${out.note}`,
      })
    } catch (err) {
      setMsg({ kind: 'err', text: err.message })
    } finally { setBusy(false) }
  }

  /**
   * Re-authenticate with Google, then change the password with that fresh
   * token. Google is asked for a brand-new sign-in rather than a cached
   * session, because the server refuses any token older than five minutes.
   */
  const verifyWithGoogle = async () => {
    setMsg(null)
    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
      if (!clientId) {
        setMsg({ kind: 'err', text: 'Google sign-in is not configured in this build — use the current password instead.' })
        return
      }
      await loadGoogleScript()
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: ({ credential }) => changePassword({ credential }),
        auto_select: false,
      })
      // Render a real button: Google blocks the silent prompt in many browsers.
      if (googleBtnRef.current) {
        googleBtnRef.current.innerHTML = ''
        window.google.accounts.id.renderButton(googleBtnRef.current, { theme: 'filled_black', size: 'large', text: 'signin_with' })
        setMsg({ kind: 'ok', text: 'Press the Google button below to verify, and the password will change straight after.' })
      }
    } catch {
      setMsg({ kind: 'err', text: 'Could not start Google verification. Use the current password instead.' })
    }
  }

  const load = () => adminApi.apiKeys()
    .then(d => { setData(d); setUnlocked(true) })
    .catch(e => {
      if (e.status === 401) { setUnlocked(false); return }
      setMsg({ kind: 'err', text: e.message })
    })

  /**
   * Always ask for the password on arrival.
   *
   * The unlock lives in memory, so without this it survived navigating away
   * and back: open the Dashboard, press API keys, and you were straight in
   * with no password.
   *
   * Two halves, because there are two ways to arrive:
   *   · mounting (from another page) — the effect below
   *   · pressing the sidebar link while already here, which does NOT remount —
   *     the render-time reset, React's documented way to reset state when an
   *     input changes.
   */
  const [seenNav, setSeenNav] = useState(navKey)
  if (seenNav !== navKey) {
    setSeenNav(navKey)
    adminApi.lockApiKeys()
    setUnlocked(false)
    setData(null)
    setMsg(null)
  }

  useEffect(() => {
    adminApi.lockApiKeys()               // discard anything inherited
    return () => adminApi.lockApiKeys()  // and on the way out
  }, [])

  const unlock = async (e) => {
    e.preventDefault()
    setBusy(true); setMsg(null)
    try {
      await adminApi.unlockApiKeys(password)
      setPassword('')
      await load()
    } catch (err) {
      setMsg({ kind: 'err', text: err.message })
    } finally { setBusy(false) }
  }

  const save = async (envName) => {
    if (!newValue.trim()) return
    setBusy(true); setMsg(null)
    try {
      const out = await adminApi.replaceApiKey(envName, newValue.trim())
      setEditing(null); setNewValue('')
      await load()
      setMsg({ kind: 'ok', text: `${envName} replaced — now ${out.masked}. ${out.note}` })
    } catch (err) {
      setMsg({ kind: 'err', text: err.message })
    } finally { setBusy(false) }
  }

  // ── Locked ──────────────────────────────────────────────────────
  if (!unlocked) {
    return (
      <>
        {C.h1('API keys', 'Locked behind a second password, separate from your sign-in.')}
        <form onSubmit={unlock} className="a-card" style={{ maxWidth: '27rem' }}>
          <div className="a-label">Second password</div>
          <input
            type="password" autoFocus value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Second password" className="a-input"
          />
          <button type="submit" className="a-btn" style={{ alignSelf: 'flex-start' }} disabled={busy || !password}>
            {busy ? 'Checking…' : 'Unlock'}
          </button>
          {msg && <p className="a-note" style={{ margin: 0, ...(msg.kind === 'ok' ? C.ok : C.err) }}>{msg.text}</p>}
          <p className="a-note" style={{ margin: 0 }}>
            Separate from your Google sign-in on purpose — holding a session is not enough to
            reach the keys. The unlock lasts 15 minutes.
          </p>

          {/* Recovery, ON THE LOCK SCREEN.
              The server has always allowed a forgotten password to be reset by
              verifying with Google, but the button lived inside the unlocked
              page — behind the very lock it was meant to open. Anyone who
              forgot the password was stuck editing .env on the server. */}
          {!forgot ? (
            <button
              type="button"
              className="a-btn a-btn--ghost a-btn--sm"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => { setForgot(true); setMsg(null) }}
            >
              Forgotten it?
            </button>
          ) : (
            <div className="a-stack" style={{ borderTop: '1px solid var(--line)', paddingTop: 'var(--s3)' }}>
              <div className="a-label">Set a new password by verifying with Google</div>
              <input
                type="password"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="New password — 12+ characters, not all digits"
                className="a-input"
              />
              <button
                type="button"
                className="a-btn"
                style={{ alignSelf: 'flex-start' }}
                disabled={busy || newPw.length < 12}
                onClick={verifyWithGoogle}
              >
                Verify with Google &amp; set it
              </button>
              <div ref={googleBtnRef} />
              <p className="a-note" style={{ margin: 0 }}>
                Only the Google accounts on the admin list can do this, and the sign-in must be
                completed within five minutes — an older one is refused. If Google is unavailable,
                the password can still be changed directly in <code>backend/.env</code> on the server.
              </p>
            </div>
          )}
        </form>
      </>
    )
  }

  if (!data) return <div>Loading…</div>

  const totalEstimate = data.usage.reduce((s, u) => s + u.estimatedRupees, 0)
  const totalCalls = data.usage.reduce((s, u) => s + u.calls, 0)
  const maxDaily = Math.max(1, ...(data.daily ?? []).map(d => d.calls))
  const byProvider = Object.fromEntries(data.usage.map(u => [u.id, u]))

  return (
    <>
      {C.h1('API keys & spend', 'Keys can be replaced but never read back. Costs are our estimate — see the note below.')}

      {msg && (
        <p className="a-note" style={{ margin: 0, ...(msg.kind === 'ok' ? C.ok : C.err) }}>{msg.text}</p>
      )}

      {/* Headline numbers */}
      <div className="a-metrics">
        <div className="a-card">
          <div className="a-label">Estimated spend</div>
          <div className="a-num">
            ₹{totalEstimate.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-3)', marginTop: 2 }}>all time, our estimate</div>
        </div>
        <div className="a-card">
          <div className="a-label">Calls made</div>
          <div className="a-num">
            {totalCalls.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-3)', marginTop: 2 }}>across every provider</div>
        </div>
        {/* Clickable: the count alone does not say WHICH ones are in. */}
        <div
          className="a-card"
          role="button"
          tabIndex={0}
          aria-expanded={showKeys}
          onClick={() => setShowKeys(v => !v)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowKeys(v => !v) } }}
          style={{ cursor: 'pointer' }}
        >
          <div className="a-label">Keys configured</div>
          <div className="a-num">
            {data.keys.filter(k => k.set).length}<span style={{ fontSize: 18, color: 'var(--ink-3)' }}>/{data.keys.length}</span>
          </div>
          <div style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-3)', marginTop: 2 }}>
            {showKeys ? 'Hide the list' : 'See which ones'}
          </div>
        </div>
      </div>

      {/* The full list, in place: what is in, what is still missing, and
          what each one costs you by being absent. Configured first, each
          ticked on the right. */}
      {showKeys && (
        <div className="a-card">
          <div className="a-label">
            All {data.keys.length} keys — {data.keys.filter(k => k.set).length} in place
          </div>
          <div className="a-stack">
            {[...data.keys]
              // Configured first, then alphabetical inside each group, so the
              // list reads as "done… still to do" rather than shuffling about.
              .sort((a, b) => (b.set ? 1 : 0) - (a.set ? 1 : 0) || a.label.localeCompare(b.label))
              .map(k => {
                const usage = byProvider[k.provider]
                return (
                  <div
                    key={k.env}
                    className="a-row"
                    style={{
                      padding: 'var(--s2) var(--s3)',
                      borderRadius: 8,
                      background: k.set ? 'rgba(127,191,106,.06)' : 'transparent',
                      border: `1px solid ${k.set ? 'rgba(127,191,106,.22)' : 'var(--line)'}`,
                    }}
                  >
                    <div className="a-row__main">
                      <span className="a-title" style={{ color: k.set ? 'var(--ink)' : 'var(--ink-2)' }}>
                        {k.label}
                      </span>
                      <span className="a-meta">
                        {k.set
                          ? <>{k.masked}{usage?.calls > 0 && ` · ${usage.calls.toLocaleString('en-IN')} calls`}</>
                          : usage?.where ?? 'Not set up yet'}
                      </span>
                    </div>
                    <div className="a-row__side">
                      {k.set
                        ? <span className="is-ok" style={{ fontSize: '1rem', lineHeight: 1 }} title="Configured">✓</span>
                        : <span className="a-chip">missing</span>}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {data.daily?.length > 0 && (
        <div className="a-card">
          <div className="a-label">Calls per day — last 30 days</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 90, marginTop: 12 }}>
            {data.daily.map(d => (
              <div key={d.day} title={`${d.day}: ${d.calls} calls`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: '100%', height: `${(d.calls / maxDaily) * 100}%`, minHeight: 2, background: 'var(--accent)', borderRadius: '3px 3px 0 0', opacity: .85 }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-provider spend */}
      <h2 className="a-serif" style={{ fontSize: 'var(--t-lg)', margin: 0 }}>
        Where the money goes
      </h2>
      <div className="a-stack">
        {data.usage.map(u => (
          <div key={u.id} className="a-card a-card--tight">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15 }}>
                {u.label}
                {!u.configured && <span style={{ ...C.warn, fontSize: 'var(--t-micro)', marginLeft: 8 }}>not set up</span>}
              </span>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: 19 }}>
                {u.rupeesPerCall === 0
                  ? <span style={{ ...C.ok, fontSize: 14 }}>free</span>
                  : `₹${u.estimatedRupees.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
              </span>
            </div>
            <div style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', marginTop: 3 }}>
              {u.where}
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 'var(--t-micro)', color: 'var(--ink-3)', marginTop: 6 }}>
              {u.calls.toLocaleString('en-IN')} calls · {u.callsLast30.toLocaleString('en-IN')} in 30 days
              {u.failures > 0 && <span style={C.err}> · {u.failures} failed</span>}
              {u.lastUsed && ` · last used ${new Date(u.lastUsed).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
            </div>
            <div style={{ fontSize: 'var(--t-micro)', color: 'rgba(245,235,216,.42)', marginTop: 4, lineHeight: 1.45 }}>
              {u.basis}
            </div>
          </div>
        ))}
      </div>

      {/* The keys themselves, split by whether they can produce a bill.
          Not "is it costing anything today" — three of the paid accounts bill
          nothing right now only because nothing calls them yet. The useful
          question is which keys can generate an invoice. */}
      {['paid', 'free'].map(tier => {
        const inTier = data.keys.filter(k => (k.tier ?? 'free') === tier)
        if (inTier.length === 0) return null
        return (
        <div key={tier} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <h2 className="a-serif" style={{ fontSize: 'var(--t-lg)', margin: 0 }}>
        {tier === 'paid' ? 'Keys that can cost money' : 'Free keys'}
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 'var(--t-micro)', color: 'var(--ink-3)', marginLeft: 10 }}>
          {inTier.length}
        </span>
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {inTier.map(k => {
          const usage = byProvider[k.provider]
          return (
            <div key={k.env} className="a-card a-card--tight">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 220 }}>
                  <div style={{ fontSize: 'var(--t-base)' }}>{k.label}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 'var(--t-micro)', color: 'var(--ink-3)', marginTop: 2 }}>
                    {k.env}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 'var(--t-sm)',
                    color: k.set ? 'var(--ink)' : 'rgba(245,235,216,.35)',
                  }}>
                    {k.masked ?? 'not set'}
                  </span>
                  {usage && usage.calls > 0 && (
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 'var(--t-micro)', color: 'var(--ink-3)' }}>
                      {usage.calls.toLocaleString('en-IN')} calls
                    </span>
                  )}
                  <HealthChip usage={usage} />
                  <button
                    style={{ ...C.btnGhost, padding: '5px 12px', fontSize: 12 }}
                    onClick={() => { setEditing(editing === k.env ? null : k.env); setNewValue('') }}
                  >
                    {k.set ? 'Replace' : 'Add'}
                  </button>
                </div>
              </div>

              {editing === k.env && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <input
                    type="text" autoFocus value={newValue} onChange={e => setNewValue(e.target.value)}
                    placeholder={`Paste the new ${k.label}`}
                    style={{ ...C.input, flex: '1 1 280px' }}
                  />
                  <button className="a-btn" disabled={busy || !newValue.trim()} onClick={() => save(k.env)}>Save</button>
                  <button className="a-btn a-btn--ghost" onClick={() => { setEditing(null); setNewValue('') }}>Cancel</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
        </div>
        )
      })}

      {/* Changing the second password */}
      <h2 className="a-serif" style={{ fontSize: 'var(--t-lg)', margin: 0 }}>
        Change the second password
      </h2>
      <div className="a-card" style={{ maxWidth: '35rem' }}>
        <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', margin: '0 0 14px', lineHeight: 1.55 }}>
          Being signed in is not enough — that is the whole point of this password. Confirm the
          current one, or verify with Google if you have forgotten it.
        </p>

        <label style={{ display: 'block', marginBottom: 10 }}>
          <span style={C.label}>New password</span>
          <input
            type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
            placeholder="12+ characters, not all digits" style={{ ...C.input, marginTop: 5 }}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={C.label}>Current password</span>
          <input
            type="password" value={curPw} onChange={e => setCurPw(e.target.value)}
            placeholder="Leave blank to verify with Google instead" style={{ ...C.input, marginTop: 5 }}
          />
        </label>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            style={C.btn}
            disabled={busy || newPw.length < 12 || !curPw}
            onClick={() => changePassword({ currentPassword: curPw })}
          >
            Change password
          </button>
          <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>or</span>
          <button
            style={C.btnGhost}
            disabled={busy || newPw.length < 12}
            onClick={verifyWithGoogle}
          >
            Verify with Google & change
          </button>
        </div>
        <div ref={googleBtnRef} style={{ marginTop: 12 }} />

        <p style={{ fontSize: 'var(--t-micro)', color: 'var(--ink-3)', marginTop: 12, lineHeight: 1.5 }}>
          Google verification must be completed within five minutes — an older sign-in is refused,
          so a token sitting in browser storage cannot be used to change this.
        </p>
      </div>

      <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-3)', marginTop: 20, maxWidth: 640, lineHeight: 1.55 }}>
        {data.cost_note}
      </p>
      <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-3)', marginTop: 8, maxWidth: 640, lineHeight: 1.55 }}>
        Keys are shown masked and can never be read back from this screen — only replaced. Every
        replacement is recorded in the audit log with the masked shape, never the secret itself.
      </p>
    </>
  )
}
