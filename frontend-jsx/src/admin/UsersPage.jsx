import { useEffect, useState } from 'react'
import { adminApi } from './api.js'
import { C } from './AdminShell.jsx'

export default function UsersPage() {
  const [rows, setRows] = useState(null)
  const [msg, setMsg] = useState(null)
  const [grant, setGrant] = useState(null) // email being granted
  const [amount, setAmount] = useState(500)
  const [busy, setBusy] = useState(false)

  const load = () => adminApi.users().then(d => setRows(d.users)).catch(e => setMsg({ kind: 'err', text: e.message }))
  useEffect(() => { load() }, [])

  if (!rows) return <div>Loading users…</div>

  const doGrant = async (email) => {
    setBusy(true); setMsg(null)
    try {
      const out = await adminApi.grantTokens(email, amount, 'granted from the console')
      setMsg({ kind: 'ok', text: `Granted ${amount.toLocaleString('en-IN')} tokens to ${email} — balance now ${out.balance.toLocaleString('en-IN')}.` })
      setGrant(null)
      await load()
    } catch (e) { setMsg({ kind: 'err', text: e.message }) } finally { setBusy(false) }
  }

  return (
    <>
      {C.h1('Users', `${rows.length} accounts, newest first. Token grants are audited.`)}
      {msg && <p className="a-note" style={{ margin: 0, ...(msg.kind === 'ok' ? C.ok : C.err) }}>{msg.text}</p>}
      <div className="a-stack">
        {rows.map(u => (
          <div key={u.id} className="a-card a-card--tight a-row">
            <div className="a-row__main">
              <div style={{ fontSize: 'var(--t-base)' }}>{u.email ?? u.phone ?? u.id}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 'var(--t-micro)', color: 'var(--ink-3)', marginTop: 2 }}>
                joined {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {u.searches} search{u.searches === 1 ? '' : 'es'}
              </div>
            </div>
            <div className="a-row__side">
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: 18 }}>{u.tokens.toLocaleString('en-IN')} <small style={{ fontSize: 'var(--t-micro)', color: 'var(--ink-3)' }}>tokens</small></span>
              {u.email && (grant === u.email ? (
                <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="number" min="1" value={amount} onChange={e => setAmount(Math.max(1, Math.trunc(Number(e.target.value) || 1)))} style={{ ...C.input, width: 100 }} />
                  <button className="a-btn a-btn--sm" disabled={busy} onClick={() => doGrant(u.email)}>Grant</button>
                  <button className="a-btn a-btn--ghost a-btn--sm" onClick={() => setGrant(null)}>×</button>
                </span>
              ) : (
                <button className="a-btn a-btn--ghost a-btn--sm" onClick={() => { setGrant(u.email); setAmount(500) }}>+ tokens</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
