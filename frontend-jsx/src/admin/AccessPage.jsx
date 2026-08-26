import { useEffect, useState } from 'react'
import { adminApi } from './api.js'
import { C } from './AdminShell.jsx'

/**
 * Who can open this console, and who is allowed to change that list.
 *
 * There are two kinds of entry, and keeping them apart is the whole point of
 * the screen:
 *
 *  OWNER    an address in ADMIN_EMAILS on the server. It cannot be removed
 *           from here by anyone, including another owner. An access screen
 *           that can delete its own owner is one click from locking the
 *           founder out of his own product for good, with no way back except
 *           a deploy. So that button is not built, not even disabled.
 *  GRANTED  a row in admin_grants, let in by an owner and revocable by an
 *           owner. This is how an outside dev team gets in without being
 *           handed the product's own Google account, and how they are shown
 *           back out when the work is finished.
 *
 * Any admin may read the list, including a granted one: a person should be
 * able to see who else can read their data. Only an owner may change it. The
 * server enforces that; this screen simply stops offering controls that would
 * always come back 403, because a control that always fails reads as a broken
 * console rather than as a rule.
 */

/*
 * The server's own words, wherever it has any.
 *
 * Every response on this endpoint carries a human "message" except two: a 400
 * for an address that is not an address, and a 404 for a row that is already
 * gone. Those two arrive as a bare code, which is not a sentence anybody
 * should be shown. Everything else is written on the server, and the server's
 * wording is the wording that will still be correct after this screen has
 * been rewritten, so it wins over anything invented here.
 */
const said = (e) => {
  const code = e?.body?.error
  if (code === 'invalid_body') return 'That does not look like an email address.'
  if (code === 'not_found') return 'That address is not on the granted list. Someone may have removed it already.'
  return e.message
}

const grantedOn = (iso) => (iso
  ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  : 'date not recorded')

export default function AccessPage() {
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(null)   // 'grant', or the address being removed
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')

  /*
   * `first` decides who owns a failure. The very first load has nothing to
   * show behind it, so an error is the whole screen. Every later load is a
   * refresh underneath a list that is still on screen and a note saying what
   * just happened; replacing all of that with an error page would throw away
   * the receipt for the access change the founder just made.
   */
  const load = (first = false) => adminApi.access()
    .then(setData)
    .catch(e => (first ? setErr(e.message) : setMsg({ kind: 'err', text: e.message })))

  useEffect(() => { load(true) }, [])

  const grant = async () => {
    const address = email.trim()
    if (!address) { setMsg({ kind: 'err', text: 'An email address is required.' }); return }
    setBusy('grant'); setMsg(null)
    try {
      await adminApi.grantAccess({ email: address, note: note.trim() || undefined })
      setEmail(''); setNote('')
      setMsg({ kind: 'ok', text: `${address} can now open this console.` })
    } catch (e) {
      setMsg({ kind: 'err', text: said(e) })
    } finally {
      setBusy(null)
      /*
       * Refresh whether the write succeeded or not. A refusal is usually the
       * server knowing something this page does not yet: the address was
       * already an owner, or the row was removed from another browser. That
       * is exactly when a list left as it was becomes misleading about who
       * can read the customers' data.
       */
      await load()
    }
  }

  const revoke = async (address) => {
    /*
     * A real access change, decided from one line in a list of similar lines.
     * The address goes inside the question because "Remove this admin?" does
     * not tell the founder which row the cursor was over.
     */
    if (!window.confirm(`Remove ${address}? They lose access to this console straight away.`)) return
    setBusy(address); setMsg(null)
    try {
      await adminApi.revokeAccess(address)
      setMsg({ kind: 'ok', text: `${address} can no longer open this console.` })
    } catch (e) {
      setMsg({ kind: 'err', text: said(e) })
    } finally {
      setBusy(null)
      await load()
    }
  }

  // A failed first load must not sit on "Loading…" forever: the founder would
  // read a dead endpoint as a slow one and wait for a list that never comes.
  if (err) {
    return (
      <>
        {C.h1('Admin access', 'Who can open this console.')}
        <p className="a-note" style={{ margin: 0, ...C.err }}>{err}</p>
      </>
    )
  }
  if (!data) return <div>Loading the access list…</div>

  const { you, youAreOwner, owners = [], granted = [] } = data
  const total = data.total ?? owners.length + granted.length

  /*
   * Compared without case. Google hands back whatever the person typed into
   * the sign-in box, and the grants table stores whatever an owner typed into
   * the form below; the two are the same account either way, and a missing
   * "you" marker on your own row is precisely the confusion this marker is
   * here to prevent.
   */
  const isYou = (address) => !!you && String(address).toLowerCase() === String(you).toLowerCase()

  return (
    <>
      {C.h1('Admin access', `${total} ${total === 1 ? 'person' : 'people'} can open this console`)}

      <p className="a-note" style={{ margin: 0, maxWidth: '62ch' }}>
        There are two ways in. Owners are the addresses set in ADMIN_EMAILS on the server: they
        cannot be removed from this screen by anyone, including another owner. Granted admins are
        let in from this screen by an owner, and an owner can take that access back at any time.
        Everyone listed here sees the same customer data, which is why everyone listed here is
        visible to everyone else.
      </p>

      {msg && (
        <p className="a-note" style={{ margin: 0, ...(msg.kind === 'ok' ? C.ok : C.err) }}>{msg.text}</p>
      )}

      {/* Said once, calmly, and then the screen simply does not show controls
          it knows the server will refuse. Nothing here is hidden from a
          granted admin: they can read every row, they just cannot move one. */}
      {!youAreOwner && (
        <div className="a-card">
          <div className="a-label">Read only</div>
          <p className="a-body" style={{ margin: 0 }}>
            You are signed in as a granted admin, so this list is yours to read but not to change.
            Only an owner account can grant or remove access.
          </p>
        </div>
      )}

      <section className="a-section">
        <h2>Owners</h2>
        <p className="a-note">
          Set in the server environment rather than in the database, so nothing running in the
          browser can reach them.
        </p>
        <div className="a-stack">
          {owners.map(o => (
            <div key={o.email} className="a-card a-card--tight a-row">
              <div className="a-row__main">
                <div style={{ fontSize: 'var(--t-base)' }}>{o.email}</div>
                <div className="a-meta">from {o.source}</div>
              </div>
              <div className="a-row__side">
                {isYou(o.email) && <span className="a-chip">you</span>}
                <span className="a-chip">owner</span>
                {/* Where a granted row carries its Remove button. A button
                    that exists and always fails is worse than no button: it
                    teaches the founder that the console is unreliable, and it
                    puts "lock myself out" one misread dialog away. */}
                <span className="a-meta">set in the environment</span>
              </div>
            </div>
          ))}
          {owners.length === 0 && (
            <p className="a-body" style={{ margin: 0, ...C.warn }}>
              ADMIN_EMAILS is empty, so no account here is permanent. Every admin on this screen
              could be removed by whoever is signed in, and there would be no owner left to let
              anyone back in.
            </p>
          )}
        </div>
        <p className="a-note">
          Owner access cannot be revoked from the console, by anyone, including another owner. To
          change who is an owner, edit ADMIN_EMAILS in the server environment and restart the app.
        </p>
      </section>

      <section className="a-section">
        <h2>Granted access</h2>
        <p className="a-note">
          The people an owner has let in: an outside developer, a contractor, anyone who needs the
          console without being handed the product's own Google account. Remove one on the day
          they stop needing it, not on the day someone remembers.
        </p>
        <div className="a-stack">
          {granted.map(g => (
            <div key={g.email} className="a-card a-card--tight a-row">
              <div className="a-row__main">
                <div style={{ fontSize: 'var(--t-base)' }}>{g.email}</div>
                {/* The note is usually the only record of why this address was
                    ever let in, so its absence is worth stating rather than
                    leaving as a blank line. */}
                <div style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', lineHeight: 1.5 }}>
                  {g.note || <em className="is-muted">no note</em>}
                </div>
                <div className="a-meta">
                  granted by {g.grantedBy || 'unknown'} · {grantedOn(g.grantedAt)}
                </div>
              </div>
              <div className="a-row__side">
                {isYou(g.email) && <span className="a-chip">you</span>}
                {/* The server decides what may be removed and this screen only
                    reflects it. Granted rows arrive removable, but if one ever
                    stops being, the button goes with it instead of standing
                    there waiting to fail. */}
                {youAreOwner && g.removable !== false && (
                  <button
                    className="a-btn a-btn--danger a-btn--sm"
                    disabled={busy === g.email}
                    onClick={() => revoke(g.email)}
                  >
                    {busy === g.email ? '…' : 'Remove'}
                  </button>
                )}
              </div>
            </div>
          ))}
          {granted.length === 0 && (
            <p className="a-body" style={{ margin: 0 }}>
              Nobody outside the owner accounts can open this console. That is a normal, safe
              state and not a problem to fix: access is granted when someone outside needs it,
              and taken back when their work is done.
            </p>
          )}
        </div>
      </section>

      {youAreOwner && (
        <section className="a-section">
          <h2>Grant access</h2>
          <p className="a-note">
            Use the Google account the person actually signs in with; any other address will
            simply never match anyone. They will see everything an owner sees, apart from the
            ability to change this list.
          </p>
          <div className="a-card">
            <div className="a-fields">
              <label className="a-field a-note">
                Email
                <input
                  className="a-input"
                  type="email"
                  autoComplete="off"
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </label>
              <label className="a-field a-note">
                Note (optional)
                <input
                  className="a-input"
                  placeholder="Dev team, Ravi"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </label>
            </div>
            <div className="a-actions">
              <button className="a-btn" disabled={busy === 'grant'} onClick={grant}>
                {busy === 'grant' ? 'Granting…' : 'Grant access'}
              </button>
              <span className="a-note">
                The note is what tells you months later why this address is on the list.
              </span>
            </div>
          </div>
        </section>
      )}

      <p className="a-note" style={{ margin: 0, maxWidth: '62ch' }}>
        When a team is coming in, grant each person their own address rather than sharing one.
        Shared logins cannot be taken back one at a time: removing the person who left also
        removes everyone still working.
      </p>
    </>
  )
}
