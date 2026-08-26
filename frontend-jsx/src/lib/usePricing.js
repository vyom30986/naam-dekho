import { useState, useEffect } from 'react'

const API_ORIGIN = import.meta.env.DEV ? 'http://localhost:3000' : ''

/**
 * Live prices from GET /v1/pricing — published in the founder console, read
 * here. The compiled DEFAULTS below are the launch prices and the fallback
 * when the backend is unreachable; they must match backend
 * src/lib/settings.ts DEFAULT_PRICING.
 *
 * Price preview (founder only): when localStorage nd_price_preview === '1',
 * the request carries the session token and ?preview=1, and the backend
 * serves the DRAFT — but only to an admin account. Customers can set the
 * flag and see nothing different.
 */
export const DEFAULT_PRICING = {
  signupBonus: 500,
  costs: {
    business: { standard: 50, deep: 350 },
    baby: { standard: 25, deep: 300 },
  },
  addons: { keepsake: 300, shortlist: 1000 },
  packs: [
    { id: 'pack-500', rupees: 50, tokens: 500, label: '500 tokens' },
    { id: 'pack-5000', rupees: 500, tokens: 5000, label: '5,000 tokens' },
  ],
}

let cached = null // Promise — one fetch per page load, shared by every component
let current = { pricing: DEFAULT_PRICING, preview: false }
const listeners = new Set()

function fetchPricing() {
  const wantPreview = localStorage.getItem('nd_price_preview') === '1'
  const token = localStorage.getItem('nd_token')
  const headers = wantPreview && token ? { Authorization: `Bearer ${token}` } : {}
  return fetch(`${API_ORIGIN}/v1/pricing${wantPreview ? '?preview=1' : ''}`, { headers })
    .then(res => (res.ok ? res.json() : null))
    .then(data => {
      if (data?.pricing) current = { pricing: data.pricing, preview: !!data.preview }
      for (const fn of listeners) fn(current)
      return current
    })
    .catch(() => current) // offline — defaults stand
}

export function usePricing() {
  const [state, setState] = useState(current)
  useEffect(() => {
    listeners.add(setState)
    if (!cached) cached = fetchPricing()
    return () => { listeners.delete(setState) }
  }, [])
  return state // { pricing, preview }
}
