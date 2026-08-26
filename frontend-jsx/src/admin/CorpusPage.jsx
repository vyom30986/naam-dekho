import { useEffect, useMemo, useState } from 'react'
import { adminApi } from './api.js'
import { C } from './AdminShell.jsx'

const BLANK = { name: '', gender: 'unisex', origin: '', meaning: '', meaningSource: '', meaningUrl: '', verified: false, published: true }

/**
 * The two labels the review queue moves a row between.
 *
 * The proposal label must not survive approval. If it did, a row would end up
 * verified and still saying "needs review" as its source — and the source is
 * the line the public page prints as its authority, so months later that
 * sentence would be read as a citation by the one person who knows it isn't.
 */
const PROPOSAL_SOURCE = 'Gemini proposal — needs review'
const EDITORIAL_SOURCE = 'Naam Dekho editorial'

/**
 * Which pile a row is in.
 *
 * Read from the data — meaning present, verified flag — and deliberately NOT
 * by matching the pipeline's source string. The string is one batch job's
 * artefact; the rule underneath it is the public page's rule, that an
 * unverified meaning is not printed. Any unverified meaning is waiting for a
 * human whatever wrote it, and a row the founder half-edited by hand must
 * land in the queue too.
 */
const stateOf = (n) => (!n.meaning ? 'none' : n.verified ? 'verified' : 'review')

const VIEWS = [
  ['all', 'All'],
  ['review', 'Needs review'],
  ['verified', 'Verified'],
  ['none', 'No meaning'],
]

/**
 * The PUT replaces the whole row, so every write sends every field. One
 * builder for the form's Save and for the queue's one-click writes: the API
 * validates gender against an enum and meaningUrl as a real URL, and a second
 * hand-rolled payload is where a stray '' eventually gets through.
 */
const payload = (e) => ({
  name: e.name.trim(),
  gender: e.gender || null,
  origin: e.origin || null,
  meaning: e.meaning || null,
  meaningSource: e.meaningSource || null,
  meaningUrl: e.meaningUrl || null,
  verified: !!e.verified,
  published: !!e.published,
})

/** The API refuses this too. Checked here so the founder finds out at typing time, not at save time. */
const needsSource = (e) => !!(e.verified && e.meaning && !e.meaningSource)

/**
 * The name-page corpus, and the queue of meanings waiting on a human.
 *
 * A meaning renders on the public page only when verified with a source, so
 * the pipeline's proposals are invisible to customers until someone here
 * approves one. That is what makes a one-click Approve safe to offer: the
 * risk of the queue is a slow founder, not a wrong page.
 */
export default function CorpusPage() {
  const [names, setNames] = useState(null)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState(null) // null until the first load picks the landing view
  const [editing, setEditing] = useState(null) // {slug, entry} | {slug:null, entry} for new
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const [acting, setActing] = useState(null) // slug currently being approved or rejected

  const load = () => adminApi.corpus()
    .then(d => {
      setNames(d.names)
      // Land on the work, but only on the very first load. Re-deriving this
      // after every write would drag the founder back to "Needs review" each
      // time they stepped out of it — and would switch the view out from
      // under them the moment an approve emptied the queue.
      setFilter(f => f ?? (d.names.some(n => stateOf(n) === 'review') ? 'review' : 'all'))
    })
    .catch(e => setMsg({ kind: 'err', text: e.message }))
  useEffect(() => { load() }, [])

  const view = filter ?? 'all'

  // Counted over the whole corpus, never over the search. These numbers are
  // the workload; narrowing them to whatever is typed in the box would make
  // the queue look finished.
  const counts = useMemo(() => {
    const c = { all: 0, review: 0, verified: 0, none: 0 }
    for (const n of names ?? []) { c.all++; c[stateOf(n)]++ }
    return c
  }, [names])

  const filtered = useMemo(() => {
    if (!names) return []
    const needle = q.trim().toLowerCase()
    return names.filter(n =>
      (view === 'all' || stateOf(n) === view) &&
      (!needle || n.name.toLowerCase().includes(needle)))
  }, [names, q, view])

  const save = async () => {
    const e = editing.entry
    if (!e.name.trim()) { setMsg({ kind: 'err', text: 'A name is required.' }); return }
    if (needsSource(e)) { setMsg({ kind: 'err', text: 'A verified meaning must name its source.' }); return }
    setBusy(true); setMsg(null)
    try {
      const slug = editing.slug ?? e.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      await adminApi.saveName(slug, payload(e))
      setEditing(null)
      await load()
      setMsg({ kind: 'ok', text: 'Saved. Regenerate pages from the Test menu when you are done editing.' })
    } catch (err) { setMsg({ kind: 'err', text: err.message }) } finally { setBusy(false) }
  }

  /**
   * One write, and everything that could move under the cursor held still.
   *
   * Clearing this queue is a few hundred clicks in one sitting, so the screen
   * is built to stay where it was between them:
   *
   *  · `names` is replaced, never set back to null, so the refresh after each
   *    write patches the rows in place (keyed by slug) rather than unmounting
   *    the list behind "Loading the corpus…" and dropping the scroll to the top.
   *  · only the row being written is disabled, via `acting`. A page-wide busy
   *    flag greys out every other Approve for the length of the request, and
   *    the click the founder has already started gets swallowed.
   *  · success is silent. A note appearing above the list pushes every row
   *    down by its own height, and at queue speed the next click then lands
   *    on the wrong name. The chip counts and the progress bar are the
   *    receipt. Failures still speak up — by then the founder has stopped.
   */
  const review = async (n, change) => {
    const entry = { ...n, ...change }
    if (needsSource(entry)) { setMsg({ kind: 'err', text: 'A verified meaning must name its source.' }); return }
    setActing(n.slug)
    try {
      await adminApi.saveName(n.slug, payload(entry))
      await load()
    } catch (err) {
      setMsg({ kind: 'err', text: err.message })
    } finally { setActing(null) }
  }

  // A human has now read the gloss, so the row carries a human's authority.
  const approve = (n) => review(n, { verified: true, meaningSource: EDITORIAL_SOURCE })

  // Reject empties the meaning rather than flagging it: "no meaning yet" is a
  // state the public page already handles honestly, and a kept-but-wrong
  // gloss is one careless verify away from being printed. `published` is left
  // alone — the page stays up, it just stops claiming to know the meaning.
  const reject = (n) => review(n, { meaning: null, meaningSource: null, meaningUrl: null, verified: false })

  const remove = async (slug) => {
    if (!window.confirm(`Delete the page for "${slug}"? This cannot be undone.`)) return
    setBusy(true)
    try { await adminApi.deleteName(slug); await load() } catch (err) { setMsg({ kind: 'err', text: err.message }) } finally { setBusy(false) }
  }

  if (!names) return <div>Loading the corpus…</div>

  const published = names.filter(n => n.published).length
  const pct = (n) => (counts.all ? (n / counts.all) * 100 : 0)

  return (
    <>
      {C.h1('Name pages', `${counts.all} names · ${published} published`)}

      <div className="a-card">
        <div className="a-label">Meanings</div>
        <div style={{ fontSize: 'var(--t-base)', color: 'var(--ink-2)', lineHeight: 1.55 }}>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 'var(--t-md)', color: 'var(--ink)' }}>{counts.verified}</span>
          {' '}of {counts.all} names have a verified meaning
          {counts.review > 0 && <> · <span className="is-warn">{counts.review} still need review</span></>}
          {counts.none > 0 && <> · <span className="is-muted">{counts.none} with none at all</span></>}
        </div>
        {/* Two segments, not one. The question the founder is actually asking
            is "how much is done, and how much is still on my desk" — and the
            no-meaning remainder is not work he can clear by clicking. */}
        <div style={{ display: 'flex', height: 4, borderRadius: 2, background: 'var(--line)', overflow: 'hidden' }}>
          <div style={{ width: `${pct(counts.verified)}%`, background: 'var(--ok)' }} />
          <div style={{ width: `${pct(counts.review)}%`, background: 'var(--warn)' }} />
        </div>
      </div>

      <div className="a-actions">
        {VIEWS.map(([key, label]) => (
          <button
            key={key}
            className={view === key ? 'a-btn a-btn--sm' : 'a-btn a-btn--ghost a-btn--sm'}
            aria-pressed={view === key}
            onClick={() => setFilter(key)}
          >
            {label}<span style={{ opacity: 0.65, marginLeft: 6 }}>{counts[key]}</span>
          </button>
        ))}
      </div>

      <div className="a-actions">
        <input placeholder="Search names…" value={q} onChange={e => setQ(e.target.value)} className="a-input" style={{ maxWidth: 260 }} />
        <button className="a-btn a-btn--ghost" onClick={() => setEditing({ slug: null, entry: { ...BLANK } })}>+ Add a name</button>
      </div>

      {msg && <p className="a-note" style={{ margin: 0, ...(msg.kind === 'ok' ? C.ok : C.err) }}>{msg.text}</p>}

      {editing && (
        <div className="a-card a-card--accent">
          <div className="a-label">{editing.slug ? `Editing ${editing.slug}` : 'New name'}</div>
          <div className="a-fields">
            <label className="a-field a-note">Name<input className="a-input" value={editing.entry.name} onChange={e => setEditing({ ...editing, entry: { ...editing.entry, name: e.target.value } })} /></label>
            <label className="a-field a-note">Gender
              <select className="a-input" value={editing.entry.gender ?? ''} onChange={e => setEditing({ ...editing, entry: { ...editing.entry, gender: e.target.value } })}>
                <option value="boy">boy</option><option value="girl">girl</option><option value="unisex">unisex</option>
              </select>
            </label>
            <label className="a-field a-note">Origin<input className="a-input" value={editing.entry.origin ?? ''} onChange={e => setEditing({ ...editing, entry: { ...editing.entry, origin: e.target.value } })} /></label>
            <label className="a-field a-note" style={{ gridColumn: '1 / -1' }}>Meaning<input className="a-input" value={editing.entry.meaning ?? ''} onChange={e => setEditing({ ...editing, entry: { ...editing.entry, meaning: e.target.value } })} /></label>
            <label className="a-field a-note">Meaning source (e.g. en.wiktionary.org)<input className="a-input" value={editing.entry.meaningSource ?? ''} onChange={e => setEditing({ ...editing, entry: { ...editing.entry, meaningSource: e.target.value } })} /></label>
            <label className="a-field a-note">Source URL<input className="a-input" value={editing.entry.meaningUrl ?? ''} onChange={e => setEditing({ ...editing, entry: { ...editing.entry, meaningUrl: e.target.value } })} /></label>
          </div>
          <div className="a-actions">
            <label className="a-note"><input type="checkbox" checked={!!editing.entry.verified} onChange={e => setEditing({ ...editing, entry: { ...editing.entry, verified: e.target.checked } })} /> meaning verified (needs a source)</label>
            <label className="a-note"><input type="checkbox" checked={!!editing.entry.published} onChange={e => setEditing({ ...editing, entry: { ...editing.entry, published: e.target.checked } })} /> published</label>
            <button className="a-btn" disabled={busy} onClick={save}>Save</button>
            <button className="a-btn a-btn--ghost" disabled={busy} onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="a-stack">
        {filtered.map(n => {
          const state = stateOf(n)
          const working = acting === n.slug
          return (
            <div key={n.slug} className="a-card a-card--tight a-row">
              <div className="a-row__main">
                <div>
                  <span style={{ fontFamily: "'Fraunces', serif", fontSize: 17 }}>{n.name}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 'var(--t-micro)', color: 'var(--ink-3)', marginLeft: 10 }}>
                    {n.gender ?? '—'} · {n.origin ?? 'origin unknown'}
                  </span>
                </div>
                <div style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', lineHeight: 1.5 }}>
                  {n.meaning || <em className="is-muted">no meaning recorded</em>}
                </div>
                {/* The citation, one click away. Approving without opening it
                    is the founder's call, but he should never have to go
                    hunting for the page the gloss came from. */}
                {n.meaningSource && (
                  <div className="a-meta">
                    {n.meaningUrl ? (
                      <a href={n.meaningUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                        {n.meaningSource} ↗
                      </a>
                    ) : (
                      <span className={n.meaningSource === PROPOSAL_SOURCE ? 'is-warn' : undefined}>
                        {n.meaningSource}
                        {n.meaningSource === PROPOSAL_SOURCE && ' · no citation to check it against'}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="a-row__side">
                {state === 'verified' && <span className="a-chip a-chip--ok">✓ verified</span>}
                {state === 'review' && <span className="a-chip a-chip--warn">needs review</span>}
                {state === 'none' && <span className="a-chip">no meaning</span>}
                <span style={{ fontSize: 'var(--t-micro)', color: n.published ? 'var(--ink-2)' : 'var(--ink-3)' }}>
                  {n.published ? 'published' : 'hidden'}
                </span>
                {state === 'review' && (
                  <>
                    <button className="a-btn a-btn--go a-btn--sm" disabled={working} onClick={() => approve(n)}>
                      {working ? '…' : 'Approve'}
                    </button>
                    {/* Ghost, not danger: red belongs to Delete, the one button
                        here that takes a page off the site. A queue where the
                        button you press fifty times a session is red teaches
                        you to stop reading red. And no confirm dialog — it
                        only clears a proposal the public never saw, and a
                        confirm on every reject is what makes a queue of
                        hundreds unusable. */}
                    <button className="a-btn a-btn--ghost a-btn--sm" disabled={working} onClick={() => reject(n)}>
                      Reject
                    </button>
                  </>
                )}
                <button className="a-btn a-btn--ghost a-btn--sm" onClick={() => setEditing({ slug: n.slug, entry: { ...n } })}>Edit</button>
                <button className="a-btn a-btn--danger a-btn--sm" onClick={() => remove(n.slug)}>Delete</button>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div style={{ color: 'var(--ink-3)', fontSize: 'var(--t-base)' }}>
            {q.trim()
              ? 'No names match.'
              : view === 'review'
                ? 'Nothing left to review.'
                : 'Nothing in this view.'}
          </div>
        )}
      </div>
    </>
  )
}
