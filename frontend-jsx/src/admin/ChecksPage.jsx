import { useEffect, useState } from 'react'
import { adminApi } from './api.js'
import { C } from './AdminShell.jsx'

/**
 * Kill switches for individual checks. A disabled check still shows its tile
 * on every scan — honestly marked "temporarily switched off" — so customers
 * see we skipped it rather than wondering where it went.
 *
 * Keep ids in sync with the CATALOGUE in pages/Home.jsx and the tileIds the
 * backend emits.
 */
const CHECKS = [
  ['Domains', [
    ['dom-com', '.com'], ['dom-in', '.in / .co.in'], ['dom-org', '.org/.net/.io/.ai/.co/.dev'], ['dom-app', '.app/.store/.shop/.tech/.xyz'],
  ]],
  ['Social', [
    ['soc-ig', 'Instagram'], ['soc-x', 'X (Twitter)'], ['soc-yt', 'YouTube'], ['soc-li', 'LinkedIn'], ['soc-fb', 'Facebook'], ['soc-wa', 'WhatsApp (info tile)'],
  ]],
  ['Marketplace', [
    ['mp-play', 'Google Play'], ['mp-apple', 'App Store'], ['mp-shop', 'Shopify'], ['mp-gh', 'GitHub'], ['mp-ph', 'Product Hunt'], ['mp-amzn', 'Amazon India Brand (paid)'], ['mp-flip', 'Flipkart (info tile)'],
  ]],
  ['Brand & search', [
    ['br-wiki', 'Wikipedia + Wikidata'], ['br-cse', 'Web search (top 3)'],
  ]],
  ['Linguistic', [
    ['lin-mean', 'Meaning + 10 scripts'], ['lin-land', 'Landmine dictionary'], ['lin-pron', 'Pronunciation'], ['lin-num', 'Chaldean numerology'],
  ]],
  ['Legal (Deep Search)', [
    ['leg-mca', 'MCA21 Company Register'], ['leg-tm', 'IP India Trademark'],
  ]],
]

export default function ChecksPage() {
  const [disabled, setDisabled] = useState(null)
  const [features, setFeatures] = useState(null)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    adminApi.scanners().then(d => setDisabled(new Set(d.disabled))).catch(e => setMsg({ kind: 'err', text: e.message }))
    adminApi.features().then(d => setFeatures(d.features)).catch(e => setMsg({ kind: 'err', text: e.message }))
  }, [])

  if (!disabled) return <div>Loading check states…</div>

  const toggle = async (id) => {
    const next = new Set(disabled)
    if (next.has(id)) next.delete(id); else next.add(id)
    setBusy(true); setMsg(null)
    try {
      await adminApi.setScanners([...next])
      setDisabled(next)
      setMsg({ kind: 'ok', text: next.has(id) ? `${id} switched OFF — its tile now says "temporarily switched off".` : `${id} back on.` })
    } catch (e) { setMsg({ kind: 'err', text: e.message }) } finally { setBusy(false) }
  }

  /*
   * A feature is not a check. Switching off a check hides one row of a
   * result; switching off a feature stops a purchase and makes the route
   * answer 503. They are kept in separate lists so a mis-click cannot do
   * the second while meaning the first.
   */
  const toggleFeature = async (id) => {
    if (!features) return
    const next = features.map(f => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    setBusy(true); setMsg(null)
    try {
      await adminApi.setFeatures(next.filter(f => !f.enabled).map(f => f.id))
      setFeatures(next)
      const now = next.find(f => f.id === id)
      setMsg({
        kind: 'ok',
        text: now.enabled
          ? `${now.label} is back on sale.`
          : `${now.label} switched OFF — customers get a plain "switched off at the moment" message, and are not charged.`,
      })
    } catch (e) { setMsg({ kind: 'err', text: e.message }) } finally { setBusy(false) }
  }

  return (
    <>
      {C.h1('Checks', 'Switch a broken or credit-hungry check off. Its tile stays visible, honestly marked — never a guessed result.')}
      {msg && <p className="a-note" style={{ margin: 0, ...(msg.kind === 'ok' ? C.ok : C.err) }}>{msg.text}</p>}
      <div className="a-fields">
        {features && (
          <div className="a-card" style={{ borderColor: 'rgba(184,80,28,.45)' }}>
            <div className="a-label">Things we sell</div>
            <p className="a-note" style={{ margin: '0 0 10px' }}>
              These are purchases, not checks. Switching one off stops it being sold and
              nobody is charged — the route answers with a plain message instead.
            </p>
            <div className="a-stack">
              {features.map(f => (
                <label key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, fontSize: 'var(--t-sm)', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                  <span style={{ color: f.enabled ? 'var(--ink)' : 'var(--ink-3)' }}>
                    {f.label} <code style={{ fontSize: 'var(--t-micro)', color: 'rgba(245,235,216,.35)' }}>{f.id}</code>
                  </span>
                  <input type="checkbox" checked={f.enabled} disabled={busy} onChange={() => toggleFeature(f.id)} />
                </label>
              ))}
            </div>
          </div>
        )}
        {CHECKS.map(([family, checks]) => (
          <div key={family} className="a-card">
            <div className="a-label">{family}</div>
            <div className="a-stack">
              {checks.map(([id, label]) => {
                const off = disabled.has(id)
                return (
                  <label key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--t-sm)', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                    <span style={{ color: off ? 'var(--ink-3)' : 'var(--ink)' }}>
                      {label} <code style={{ fontSize: 'var(--t-micro)', color: 'rgba(245,235,216,.35)' }}>{id}</code>
                    </span>
                    <input type="checkbox" checked={!off} disabled={busy} onChange={() => toggle(id)} />
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
