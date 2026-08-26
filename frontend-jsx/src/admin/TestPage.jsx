import { useEffect, useState } from 'react'
import { adminApi } from './api.js'
import { C } from './AdminShell.jsx'

/**
 * The founder's test bench: top up your own wallet, flip price preview on and
 * off, and jump into the product exactly as a customer would see it.
 *
 * Test searches are real searches — they count in the stats (founder decision,
 * 4 Aug 2026), so remember that "Aarav × 9" on the dashboard may be you.
 */
export default function TestPage() {
  const [me, setMe] = useState(null)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(localStorage.getItem('nd_price_preview') === '1')

  const load = () => adminApi.me().then(setMe).catch(() => {})
  useEffect(() => { load() }, [])

  const topUp = async (amount) => {
    setBusy(true); setMsg(null)
    try {
      const out = await adminApi.grantTokens(me.email, amount, 'founder test wallet')
      setMsg({ kind: 'ok', text: `Topped up — your balance is now ${out.balance.toLocaleString('en-IN')} tokens.` })
      await load()
    } catch (e) { setMsg({ kind: 'err', text: e.message }) } finally { setBusy(false) }
  }

  const togglePreview = () => {
    const next = !preview
    if (next) localStorage.setItem('nd_price_preview', '1')
    else localStorage.removeItem('nd_price_preview')
    setPreview(next)
  }

  return (
    <>
      {C.h1('Test menu', 'Try the product as your customers meet it — with a wallet that never embarrasses you mid-demo.')}

      {msg && <p className="a-note" style={{ margin: 0, ...(msg.kind === 'ok' ? C.ok : C.err) }}>{msg.text}</p>}

      <div className="a-fields">
        <div className="a-card">
          <div className="a-label">Your test wallet</div>
          <div className="a-num">
            {me ? `${me.tokens.balance.toLocaleString('en-IN')} tokens` : '…'}
          </div>
          <div className="a-actions">
            <button className="a-btn" disabled={busy || !me?.email} onClick={() => topUp(10000)}>+10,000</button>
            <button className="a-btn a-btn--ghost" disabled={busy || !me?.email} onClick={() => topUp(1000)}>+1,000</button>
          </div>
          <p style={{ fontSize: 'var(--t-micro)', color: 'var(--ink-3)', marginTop: 10 }}>
            Grants are audited. Your searches count in the dashboard numbers — remember that when reading them.
          </p>
        </div>

        <div className="a-card">
          <div className="a-label">Price preview</div>
          <div style={{ fontSize: 14, marginTop: 8 }}>
            {preview
              ? 'ON — the customer site shows your DRAFT prices (only to you).'
              : 'Off — the site shows published prices, same as customers.'}
          </div>
          <button className={preview ? 'a-btn' : 'a-btn a-btn--ghost'} onClick={togglePreview}>
            {preview ? 'Turn preview off' : 'Turn preview on'}
          </button>
        </div>

        <div className="a-card">
          <div className="a-label">See it as a customer</div>
          <div className="a-stack">
            <a href="/" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontSize: 14 }}>Home — run a real search ↗</a>
            <a href="/pricing" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontSize: 14 }}>Pricing page ↗</a>
            <a href="/pricing?audience=parent" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontSize: 14 }}>Pricing — parents ↗</a>
            <a href="/how-it-works" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontSize: 14 }}>How it works ↗</a>
          </div>
          <p style={{ fontSize: 'var(--t-micro)', color: 'var(--ink-3)', marginTop: 10 }}>
            To see the signed-out view, open a private/incognito window instead.
          </p>
        </div>
      </div>
    </>
  )
}
