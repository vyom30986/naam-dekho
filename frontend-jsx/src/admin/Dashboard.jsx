import { useEffect, useState } from 'react'
import { adminApi } from './api.js'
import { C } from './AdminShell.jsx'

function Metric({ label, value, note }) {
  return (
    <div className="a-card">
      <div className="a-label">{label}</div>
      <div className="a-num">{value}</div>
      {note && <div className="a-note">{note}</div>}
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    adminApi.stats().then(setStats).catch(e => setError(e.message))
    adminApi.recent().then(d => setRecent(d.scans ?? [])).catch(() => {})
  }, [])

  if (error) return <div style={C.err}>{error}</div>
  if (!stats) return <div>Loading the numbers…</div>

  const maxDaily = Math.max(1, ...(stats.daily_searches ?? []).map(d => d.searches))

  return (
    <>
      {C.h1('The numbers', `Read-only figures · updated ${new Date(stats.generated_at).toLocaleString('en-IN')}`)}

      <div className="a-metrics">
        <Metric label="Signups" value={stats.users.total} note={`${stats.users.last_24_hours} in 24h`} />
        <Metric label="Searches" value={stats.scans.total} note={`${stats.scans.last_24_hours} in 24h`} />
        <Metric label="Deep searches" value={stats.scans.deep_searches} />
        <Metric label="Tokens outstanding" value={(stats.users.tokens_outstanding ?? 0).toLocaleString('en-IN')} note="Unspent, all accounts" />
        <Metric label="Average verdict" value={`${stats.scans.average_verdict}/100`} />
      </div>

      <div className="a-card">
        <div className="a-label">Revenue</div>
        <div className="a-body">{stats.revenue.note}</div>
      </div>

      {stats.daily_searches?.length > 0 && (
        <div className="a-card">
          <div className="a-label">Searches — last 14 days</div>
          <div className="a-chart">
            {stats.daily_searches.map(d => (
              <div key={d.day} className="a-chart__col" title={`${d.day}: ${d.searches}`}>
                <div className="a-chart__bar" style={{ height: `${(d.searches / maxDaily) * 100}%` }} />
                <div className="a-chart__tick">{d.day.slice(8)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.top_names?.length > 0 && (
        <div className="a-card">
          <div className="a-label">Most-searched names</div>
          <div className="a-actions">
            {stats.top_names.map(n => (
              <span key={n.name} className="a-chip" style={{ borderRadius: 20, textTransform: 'none', letterSpacing: 0, fontSize: '0.8125rem', fontFamily: 'inherit', color: 'var(--ink-2)' }}>
                {n.name} <b style={{ color: 'var(--accent)' }}>{n.searches}</b>
              </span>
            ))}
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <div className="a-card">
          <div className="a-label">Latest searches</div>
          <div className="a-stack">
            {recent.slice(0, 15).map(s => (
              <div key={s.scanId} className="a-row" style={{ borderBottom: '1px solid var(--line)', paddingBottom: 'var(--s2)' }}>
                <span className="a-serif a-title">{s.name}</span>
                <span className="a-meta">
                  {new Date(s.startedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  {' · '}{s.mode}{' · '}{s.tier}{' · '}{s.score ?? '—'}/100
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
