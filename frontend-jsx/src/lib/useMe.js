import { useState, useEffect } from 'react'

const API_ORIGIN = import.meta.env.DEV ? 'http://localhost:3000' : ''

/**
 * The signed-in account — one copy, shared by everything that displays it.
 *
 * The nav, the footer and the search page all need to know who you are and
 * how many tokens you have left. When they each kept their own copy, a search
 * would spend 50 tokens and the nav would go on showing the old balance until
 * a full page reload. One cached value with subscribers keeps them in step.
 */
let cached = null        // Promise<me|null> — in flight or resolved
let current = null       // the last resolved value, for components mounting late
const listeners = new Set()

function notify(me) {
  current = me
  for (const fn of listeners) fn(me)
}

function fetchMe() {
  const token = localStorage.getItem('nd_token')
  if (!token) return Promise.resolve(null)

  return fetch(`${API_ORIGIN}/v1/me`, { headers: { Authorization: `Bearer ${token}` } })
    .then(res => {
      // A token the server no longer accepts is worse than no token: it leaves
      // the site claiming you are signed in while every call behind it 401s.
      if (res.status === 401) { localStorage.removeItem('nd_token'); return null }
      return res.ok ? res.json() : null
    })
    .catch(() => null) // backend offline — treat as signed out rather than guess
}

function loadMe() {
  if (!cached) cached = fetchMe().then(me => { notify(me); return me })
  return cached
}

/** Re-read the account — call after anything that changes the token balance. */
export function refreshMe() {
  cached = fetchMe().then(me => { notify(me); return me })
  return cached
}

/** Forget the account — call on sign-out, so the nav stops showing a name. */
export function forgetMe() {
  cached = null
  notify(null)
}

export function useMe() {
  const [me, setMe] = useState(current)

  useEffect(() => {
    listeners.add(setMe)
    loadMe()
    return () => { listeners.delete(setMe) }
  }, [])

  return me
}
