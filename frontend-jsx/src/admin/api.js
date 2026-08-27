const API_ORIGIN = import.meta.env.DEV ? 'http://localhost:3000' : ''

/**
 * Thin admin API client. Every call carries the session token; a 401 clears
 * it (stale token must not leave the console claiming you are signed in),
 * and a 403 surfaces which account the server actually saw.
 */
async function call(path, options = {}) {
  const token = localStorage.getItem('nd_token')
  let res
  try {
    res = await fetch(`${API_ORIGIN}/v1${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    })
  } catch (cause) {
    // fetch only rejects when the request never left the browser: the API is
    // not running, the machine is offline, or CORS blocked it. Chrome words
    // all three as "Failed to fetch", and every screen in this console used
    // to print that string verbatim, which said nothing about which of the
    // three it was. The usual cause by far is the API simply not being
    // started, so the message says where to look.
    // status 0 keeps this distinct from any real HTTP status handled below.
    throw Object.assign(
      new Error('Cannot reach the API. Check that the backend is running on port 3000.'),
      { status: 0, cause },
    )
  }
  if (res.status === 401) {
    // Not every 401 means the session died. The API-keys screen answers 401
    // for "wrong second password" and "locked" — treating those as an expired
    // session signed the founder out of the whole console for mistyping a
    // password, and then swallowed the correct attempt that followed.
    const body = await res.json().catch(() => ({}))
    const secondPasswordProblem = body.error === 'wrong_password' || body.error === 'locked'
    if (!secondPasswordProblem) {
      localStorage.removeItem('nd_token')
      throw Object.assign(new Error('Signed out — sign in again.'), { status: 401 })
    }
    throw Object.assign(
      new Error(body.error === 'wrong_password' ? 'That password is not right.' : 'Locked.'),
      { status: 401, body },
    )
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw Object.assign(
      new Error(
        body.signed_in_as
          ? `You are signed in as ${body.signed_in_as}, which is not on the admin list.`
          : body.message ?? body.error ?? `Request failed (${res.status})`,
      ),
      { status: res.status, body },
    )
  }
  return res.json()
}

/**
 * The API-keys unlock, held in memory only.
 *
 * Deliberately NOT localStorage: a 15-minute key that survives closing the
 * browser is not a 15-minute key. Close the tab and the screen re-locks.
 *
 * It is also discarded whenever the screen is left, so opening "API keys"
 * always asks for the password — an unlock is for the visit you are making,
 * not for the rest of the session.
 */
let unlockToken = null

export const adminApi = {
  hasUnlock: () => unlockToken !== null,

  /** Throw the unlock away. Called on entering and leaving the keys screen. */
  lockApiKeys: () => { unlockToken = null },

  unlockApiKeys: async (password) => {
    const out = await call('/admin/api-keys/unlock', { method: 'POST', body: JSON.stringify({ password }) })
    unlockToken = out.unlock
    return out
  },

  apiKeys: () => call('/admin/api-keys', { headers: unlockToken ? { 'X-Api-Unlock': unlockToken } : {} }),

  /**
   * Change the second password. Requires either the current password or a
   * FRESH Google sign-in — a session alone is deliberately not enough, since
   * a session alone is exactly what this password exists to defend against.
   */
  changeApiPassword: ({ newPassword, currentPassword, credential }) =>
    call('/admin/api-keys/password', {
      method: 'POST',
      body: JSON.stringify({ newPassword, currentPassword, credential }),
    }),

  replaceApiKey: (envName, value) =>
    call(`/admin/api-keys/${encodeURIComponent(envName)}`, {
      method: 'PUT',
      headers: unlockToken ? { 'X-Api-Unlock': unlockToken } : {},
      body: JSON.stringify({ value }),
    }),

  stats: () => call('/admin/stats'),
  recent: () => call('/admin/recent'),
  users: () => call('/admin/users'),
  audit: () => call('/admin/audit'),

  pricing: () => call('/admin/settings/pricing'),
  saveDraft: (draft) => call('/admin/settings/pricing/draft', { method: 'PUT', body: JSON.stringify(draft) }),
  publish: () => call('/admin/settings/pricing/publish', { method: 'POST' }),
  discard: () => call('/admin/settings/pricing/discard', { method: 'POST' }),

  /* Legal documents. Draft -> publish -> discard, the same shape as pricing.
     'revert' throws the override away and puts the shipped document back. */
  legalDocs: () => call('/admin/legal'),
  legalDoc: (slug) => call(`/admin/legal/${slug}`),
  saveLegalDraft: (slug, doc) =>
    call(`/admin/legal/${slug}/draft`, { method: 'PUT', body: JSON.stringify(doc) }),
  publishLegal: (slug) => call(`/admin/legal/${slug}/publish`, { method: 'POST' }),
  discardLegal: (slug) => call(`/admin/legal/${slug}/discard`, { method: 'POST' }),
  revertLegal: (slug) => call(`/admin/legal/${slug}/revert`, { method: 'POST' }),

  scanners: () => call('/admin/scanners'),
  setScanners: (disabled) => call('/admin/scanners', { method: 'PUT', body: JSON.stringify({ disabled }) }),
  features: () => call('/admin/features'),
  setFeatures: (disabled) => call('/admin/features', { method: 'PUT', body: JSON.stringify({ disabled }) }),

  grantTokens: (email, amount, note) =>
    call('/admin/tokens/grant', { method: 'POST', body: JSON.stringify({ email, amount, note }) }),

  corpus: () => call('/admin/corpus'),
  saveName: (slug, entry) => call(`/admin/corpus/${encodeURIComponent(slug)}`, { method: 'PUT', body: JSON.stringify(entry) }),
  deleteName: (slug) => call(`/admin/corpus/${encodeURIComponent(slug)}`, { method: 'DELETE' }),
  importNames: (names) => call('/admin/corpus/import', { method: 'POST', body: JSON.stringify({ names }) }),

  seo: () => call('/admin/seo'),

  /*
   * Who can open the console. Reading is open to any admin; writing is
   * refused by the server for anyone who is not an owner, and refusing there
   * rather than here is what makes the rule true no matter which client asks.
   *
   * The address rides in the path on DELETE, so it is encoded: an email may
   * contain characters a URL reads as structure, and an unencoded one would
   * quietly address some other row or none at all.
   */
  access: () => call('/admin/access'),
  grantAccess: (body) => call('/admin/access', { method: 'POST', body: JSON.stringify(body) }),
  revokeAccess: (email) => call('/admin/access/' + encodeURIComponent(email), { method: 'DELETE' }),

  me: () => call('/me'),
}
