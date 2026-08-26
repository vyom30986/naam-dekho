import { useEffect, useState } from 'react'
import { adminApi } from './api.js'
import { C } from './AdminShell.jsx'

/**
 * Draft → preview → publish. Nothing here touches customers until Publish:
 * edits save as a draft, "Preview on site" opens the real site showing draft
 * prices (admin-only), and Publish is one deliberate click with the diff
 * spelled out beside it.
 */
const FIELDS = [
  ['costs.business.standard', 'Standard search (business)', 'tokens'],
  ['costs.business.deep', 'Deep Search (business)', 'tokens'],
  ['costs.baby.standard', 'Baby name search', 'tokens'],
  ['costs.baby.deep', 'Full naming report', 'tokens'],
  ['addons.keepsake', 'Keepsake add-on', 'tokens'],
  ['addons.shortlist', 'Shortlist of Five', 'tokens'],
  ['signupBonus', 'Signup gift', 'tokens, once'],
]

const get = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj)
const setPath = (obj, path, value) => {
  const clone = JSON.parse(JSON.stringify(obj))
  const keys = path.split('.')
  let cur = clone
  for (const k of keys.slice(0, -1)) cur = cur[k]
  cur[keys[keys.length - 1]] = value
  return clone
}

export default function PricingPage() {
  const [published, setPublished] = useState(null)
  const [form, setForm] = useState(null) // the draft being edited
  const [hasDraft, setHasDraft] = useState(false)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = () => adminApi.pricing().then(row => {
    setPublished(row.published)
    setForm(row.draft ?? row.published)
    setHasDraft(row.draft !== null)
  }).catch(e => setMsg({ kind: 'err', text: e.message }))

  useEffect(() => { load() }, [])

  if (!form || !published) return <div>Loading pricing…</div>

  const changed = FIELDS.filter(([p]) => get(form, p) !== get(published, p))
  const packsChanged = JSON.stringify(form.packs) !== JSON.stringify(published.packs)

  const act = async (fn, okText) => {
    setBusy(true); setMsg(null)
    try {
      await fn()
      await load()
      setMsg({ kind: 'ok', text: okText })
    } catch (e) {
      setMsg({ kind: 'err', text: e.message })
    } finally { setBusy(false) }
  }

  return (
    <>
      {C.h1('Pricing', 'Edits save as a draft. Customers see nothing until you press Publish.')}

      <div className="a-fields">
        {FIELDS.map(([path, label, unit]) => {
          const value = get(form, path)
          const live = get(published, path)
          return (
            <div key={path} style={C.card}>
              <div className="a-label">{label}</div>
              <input
                type="number" min="0" value={value}
                onChange={e => setForm(setPath(form, path, Math.max(0, Math.trunc(Number(e.target.value) || 0))))}
                className="a-input" style={{ fontSize: '1.25rem', fontFamily: "'Fraunces', serif" }}
              />
              <div style={{ fontSize: 'var(--t-micro)', marginTop: 6, color: value !== live ? 'var(--warn)' : 'var(--ink-3)' }}>
                {value !== live ? `live: ${live} → draft: ${value}` : `live · ${unit}`}
              </div>
            </div>
          )
        })}
      </div>

      <div className="a-card">
        <div style={C.label}>Token packs</div>
        {form.packs.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 'var(--t-sm)', width: 90 }}>{p.id}</span>
            <label style={{ fontSize: 'var(--t-sm)' }}>₹ <input type="number" min="1" value={p.rupees} style={{ ...C.input, width: 90, display: 'inline-block' }}
              onChange={e => { const packs = [...form.packs]; packs[i] = { ...p, rupees: Math.max(1, Math.trunc(Number(e.target.value) || 1)) }; setForm({ ...form, packs }) }} /></label>
            <label style={{ fontSize: 'var(--t-sm)' }}>tokens <input type="number" min="1" value={p.tokens} style={{ ...C.input, width: 110, display: 'inline-block' }}
              onChange={e => { const packs = [...form.packs]; packs[i] = { ...p, tokens: Math.max(1, Math.trunc(Number(e.target.value) || 1)), label: `${Math.max(1, Math.trunc(Number(e.target.value) || 1)).toLocaleString('en-IN')} tokens` }; setForm({ ...form, packs }) }} /></label>
            <span style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-3)' }}>₹{(p.rupees / p.tokens).toFixed(2)}/token</span>
          </div>
        ))}
        {packsChanged && <div style={{ fontSize: 'var(--t-micro)', marginTop: 8, color: 'var(--warn)' }}>pack changes in draft</div>}
      </div>

      <div className="a-actions">
        <button className="a-btn" disabled={busy}
          onClick={() => act(() => adminApi.saveDraft(form), 'Draft saved. Preview it on the site, then publish.')}>
          Save draft
        </button>
        <button className="a-btn a-btn--ghost" disabled={busy}
          onClick={() => {
            localStorage.setItem('nd_price_preview', '1')
            window.open('/pricing', '_blank')
          }}>
          Preview on site ↗
        </button>
        <button className="a-btn a-btn--go" disabled={busy || !hasDraft}
          onClick={() => act(() => adminApi.publish(), 'Published. Live everywhere within 30 seconds.')}>
          Publish{changed.length + (packsChanged ? 1 : 0) > 0 ? ` (${changed.length + (packsChanged ? 1 : 0)} change${changed.length + (packsChanged ? 1 : 0) === 1 ? '' : 's'})` : ''}
        </button>
        <button className="a-btn a-btn--ghost" disabled={busy || !hasDraft}
          onClick={() => act(() => adminApi.discard(), 'Draft discarded — the site keeps its current prices.')}>
          Discard draft
        </button>
        {hasDraft && <span style={{ fontSize: 'var(--t-sm)', color: 'var(--warn)' }}>Unpublished draft exists</span>}
      </div>

      {msg && <p className="a-note" style={{ margin: 0, ...(msg.kind === 'ok' ? C.ok : C.err) }}>{msg.text}</p>}

      <p style={{ marginTop: 18, fontSize: 'var(--t-sm)', color: 'var(--ink-3)', maxWidth: 560 }}>
        Preview uses your admin session: the customer site shows draft prices only to you
        (an orange banner marks preview mode). Turn it off from the Test menu or by publishing.
      </p>
    </>
  )
}
