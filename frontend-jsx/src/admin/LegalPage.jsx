import { useEffect, useState } from 'react'
import { adminApi } from './api.js'
import bundled from '../legal/index.js'

/**
 * Edit the five legal documents.
 *
 * Same draft → publish flow as the pricing screen, for the same reason: a
 * policy half-rewritten is worse than one merely out of date, because a
 * visitor cannot tell the difference. Nothing typed here is public until
 * Publish is pressed.
 *
 * The documents that ship inside the build stay available as a starting point
 * and as a way back. A page with no override renders the shipped copy, so an
 * empty database changes nothing a visitor sees.
 */

const FIELDS = [
  ['title', 'Title', 'Small HTML allowed — the <em> here is what makes part of the heading italic.'],
  ['sub', 'Subtitle', 'One or two lines under the heading.'],
  ['date', 'Effective date', 'Shown to visitors. Update this whenever the text changes.'],
]

export default function LegalPage() {
  const [docs, setDocs] = useState(null)
  const [slug, setSlug] = useState(null)
  const [form, setForm] = useState(null)
  const [server, setServer] = useState(null)     // { published, draft, updated_at, updated_by }
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const loadList = () =>
    adminApi.legalDocs().then(d => setDocs(d.documents)).catch(e => setErr(e.message))

  useEffect(() => { loadList() }, [])

  /* Opening a document prefers, in order: an unpublished draft, the published
     override, then the copy that shipped in the build. That order matches what
     you would expect to continue working on. */
  const open = async (s) => {
    setSlug(s); setMsg(null); setBusy(true)
    try {
      const row = await adminApi.legalDoc(s)
      setServer(row)
      const start = row.draft ?? row.published ?? bundled[s]
      setForm({
        slug: s,
        title: start?.title ?? '',
        sub: start?.sub ?? '',
        date: start?.date ?? '',
        html: start?.html ?? '',
      })
    } catch (e) {
      setMsg({ kind: 'err', text: e.message })
    } finally {
      setBusy(false)
    }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const run = async (fn, okText) => {
    setBusy(true); setMsg(null)
    try {
      const out = await fn()
      await loadList()
      if (slug) setServer(await adminApi.legalDoc(slug))
      setMsg({ kind: 'ok', text: okText, problems: out?.problems?.length ? out.problems : null })
      return out
    } catch (e) {
      // A refused publish carries the exact reasons; show them, not just "422".
      const problems = e.body?.problems
      setMsg({ kind: 'err', text: problems ? 'This document cannot be published yet:' : e.message, problems })
      return null
    } finally {
      setBusy(false)
    }
  }

  const loadShipped = () => {
    const b = bundled[slug]
    if (!b) return
    setForm({ slug, title: b.title, sub: b.sub, date: b.date, html: b.html })
    setMsg({ kind: 'ok', text: 'Loaded the copy that shipped with the build. Nothing is saved until you save the draft.' })
  }

  if (err) return <div style={S.wrap}><p style={S.err}>{err}</p></div>
  if (!docs) return <div style={S.wrap}><p style={S.dim}>Loading…</p></div>

  return (
    <div style={S.wrap}>
      <h1 style={S.h1}>Legal pages</h1>
      <p style={S.dim}>
        The five documents visitors can read. Edits are saved as a draft and stay private
        until published. Publishing runs the same checks that block a release, so a policy
        with an unfilled placeholder cannot go live.
      </p>

      <div style={S.list}>
        {docs.map(d => (
          <button
            key={d.slug}
            onClick={() => open(d.slug)}
            style={{ ...S.item, ...(slug === d.slug ? S.itemOn : null) }}
          >
            <div style={{ fontWeight: 600 }}>{d.label}</div>
            <div style={S.meta}>
              /{d.slug}
              {d.has_draft && <span style={S.tagDraft}>unpublished draft</span>}
              {d.edited && <span style={S.tagEdited}>edited here</span>}
              {!d.edited && !d.has_draft && <span style={S.tagShipped}>as shipped</span>}
            </div>
          </button>
        ))}
      </div>

      {form && (
        <div style={S.editor}>
          <div style={S.rowBetween}>
            <h2 style={S.h2}>{docs.find(d => d.slug === slug)?.label}</h2>
            <a href={`/${slug}`} target="_blank" rel="noreferrer" style={S.link}>
              View the live page ↗
            </a>
          </div>

          {server?.updated_at && (
            <p style={S.dim}>
              Last change {new Date(server.updated_at).toLocaleString('en-IN')}
              {server.updated_by ? ` by ${server.updated_by}` : ''}.
            </p>
          )}

          {msg && (
            <div style={msg.kind === 'ok' ? S.ok : S.err}>
              {msg.text}
              {msg.problems && (
                <ul style={{ margin: '8px 0 0 18px' }}>
                  {msg.problems.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              )}
            </div>
          )}

          {FIELDS.map(([k, label, hint]) => (
            <label key={k} style={S.field}>
              <span style={S.label}>{label}</span>
              <input style={S.input} value={form[k]} onChange={e => set(k, e.target.value)} />
              <span style={S.hint}>{hint}</span>
            </label>
          ))}

          <label style={S.field}>
            <span style={S.label}>Body</span>
            <textarea
              style={S.textarea}
              value={form.html}
              onChange={e => set('html', e.target.value)}
              spellCheck={false}
            />
            <span style={S.hint}>
              This is the whole page body as HTML. It also contains the row of five tabs
              across the top, the “On this page” list, and the previous/next links at the
              bottom — so if large blocks are deleted, check the page still navigates.
              Anything that could run code (script tags, onclick handlers) is stripped on save.
            </span>
          </label>

          <div style={S.actions}>
            <button
              style={S.primary}
              disabled={busy}
              onClick={() => run(() => adminApi.saveLegalDraft(slug, form), 'Draft saved. It is not public yet.')}
            >
              Save draft
            </button>
            <button
              style={S.publish}
              disabled={busy || !server?.draft}
              title={server?.draft ? '' : 'Save a draft first'}
              onClick={() => run(() => adminApi.publishLegal(slug), 'Published. The live page now shows this.')}
            >
              Publish
            </button>
            <button
              style={S.ghost}
              disabled={busy || !server?.draft}
              onClick={() => run(() => adminApi.discardLegal(slug), 'Draft discarded.')}
            >
              Discard draft
            </button>
            <button style={S.ghost} disabled={busy} onClick={loadShipped}>
              Load shipped copy
            </button>
            <button
              style={S.danger}
              disabled={busy || !server?.published}
              title={server?.published ? '' : 'This page already shows the shipped document'}
              onClick={async () => {
                if (!window.confirm('Put the shipped document back on the live page?')) return
                const ok = await run(() => adminApi.revertLegal(slug), 'Reverted. The live page shows the shipped document again.')
                if (ok) open(slug)
              }}
            >
              Revert to shipped
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const S = {
  wrap: { padding: '28px 34px', maxWidth: 1000 },
  h1: { fontFamily: "'Fraunces', serif", fontSize: 26, margin: '0 0 6px' },
  h2: { fontFamily: "'Fraunces', serif", fontSize: 20, margin: 0 },
  dim: { color: 'rgba(245,235,216,.6)', fontSize: 13, lineHeight: 1.6, margin: '0 0 18px' },
  list: { display: 'grid', gap: 8, marginBottom: 26 },
  item: {
    textAlign: 'left', padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
    background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)',
    color: '#f5ebd8', font: 'inherit',
  },
  itemOn: { borderColor: '#c98b2d', background: 'rgba(201,139,45,.10)' },
  meta: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
    color: 'rgba(245,235,216,.45)', marginTop: 4, display: 'flex', gap: 8, alignItems: 'center',
  },
  tagDraft: { color: '#e0b040', border: '1px solid rgba(224,176,64,.4)', borderRadius: 5, padding: '1px 6px' },
  tagEdited: { color: '#9ccfa0', border: '1px solid rgba(156,207,160,.4)', borderRadius: 5, padding: '1px 6px' },
  tagShipped: { color: 'rgba(245,235,216,.4)', border: '1px solid rgba(245,235,216,.18)', borderRadius: 5, padding: '1px 6px' },
  editor: { borderTop: '1px solid rgba(255,255,255,.10)', paddingTop: 22 },
  rowBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  link: { color: '#c98b2d', fontSize: 13 },
  field: { display: 'block', marginBottom: 16 },
  label: { display: 'block', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(245,235,216,.55)', marginBottom: 6 },
  hint: { display: 'block', fontSize: 12, color: 'rgba(245,235,216,.45)', marginTop: 6, lineHeight: 1.55 },
  input: {
    width: '100%', padding: '9px 11px', borderRadius: 8, font: 'inherit',
    background: 'rgba(0,0,0,.25)', border: '1px solid rgba(255,255,255,.12)', color: '#f5ebd8',
  },
  textarea: {
    width: '100%', minHeight: 380, padding: '11px 13px', borderRadius: 8,
    fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 1.6,
    background: 'rgba(0,0,0,.25)', border: '1px solid rgba(255,255,255,.12)', color: '#f5ebd8',
  },
  actions: { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 },
  primary: { padding: '9px 16px', borderRadius: 8, border: 0, background: '#c98b2d', color: '#12100d', fontWeight: 600, cursor: 'pointer' },
  publish: { padding: '9px 16px', borderRadius: 8, border: 0, background: '#7ea87f', color: '#12100d', fontWeight: 600, cursor: 'pointer' },
  ghost: { padding: '9px 16px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,.18)', color: '#f5ebd8', cursor: 'pointer' },
  danger: { padding: '9px 16px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(214,120,110,.5)', color: '#d6786e', cursor: 'pointer' },
  ok: { background: 'rgba(126,168,127,.12)', border: '1px solid rgba(126,168,127,.35)', color: '#bfe0c0', padding: '10px 12px', borderRadius: 8, marginBottom: 16, fontSize: 13 },
  err: { background: 'rgba(214,120,110,.12)', border: '1px solid rgba(214,120,110,.35)', color: '#e8a49c', padding: '10px 12px', borderRadius: 8, marginBottom: 16, fontSize: 13 },
}
