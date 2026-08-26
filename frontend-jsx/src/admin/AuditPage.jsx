import { useEffect, useState } from 'react'
import { adminApi } from './api.js'
import { C } from './AdminShell.jsx'

/** Append-only record of every console change. Nothing here can be edited — that is the point. */
export default function AuditPage() {
  const [entries, setEntries] = useState(null)
  const [error, setError] = useState(null)
  const [open, setOpen] = useState(null)

  useEffect(() => {
    adminApi.audit().then(d => setEntries(d.entries)).catch(e => setError(e.message))
  }, [])

  if (error) return <div style={C.err}>{error}</div>
  if (!entries) return <div>Loading the log…</div>

  return (
    <>
      {C.h1('Audit log', `${entries.length} most recent changes. Append-only — nothing in the product can edit or delete a row.`)}
      <div className="a-stack">
        {entries.map(e => (
          <div key={e.id} className="a-card a-card--tight">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', cursor: 'pointer', flexWrap: 'wrap' }}
              onClick={() => setOpen(open === e.id ? null : e.id)}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 'var(--t-sm)' }}>
                <b style={{ color: 'var(--accent)' }}>{e.action}</b>
                {e.entity && <span style={{ color: 'var(--ink-2)' }}> · {e.entity}</span>}
              </span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 'var(--t-micro)', color: 'var(--ink-3)' }}>
                {e.actor} · {new Date(e.at).toLocaleString('en-IN')}
              </span>
            </div>
            {open === e.id && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                <div>
                  <div style={C.label}>Before</div>
                  <pre style={{ fontSize: 'var(--t-micro)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--ink-2)', background: '#1c1915', borderRadius: 8, padding: 10, marginTop: 4, maxHeight: 240, overflow: 'auto' }}>{JSON.stringify(e.before, null, 1) ?? '—'}</pre>
                </div>
                <div>
                  <div style={C.label}>After</div>
                  <pre style={{ fontSize: 'var(--t-micro)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--ink-2)', background: '#1c1915', borderRadius: 8, padding: 10, marginTop: 4, maxHeight: 240, overflow: 'auto' }}>{JSON.stringify(e.after, null, 1) ?? '—'}</pre>
                </div>
              </div>
            )}
          </div>
        ))}
        {entries.length === 0 && <div style={{ color: 'var(--ink-3)' }}>No changes recorded yet.</div>}
      </div>
    </>
  )
}
