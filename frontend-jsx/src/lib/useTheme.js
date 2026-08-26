import { useEffect, useState } from 'react'

/**
 * Light, dark, or whatever the device says.
 *
 * Three states rather than two. 'system' stamps nothing on <html>, so the
 * stylesheet's prefers-color-scheme query decides — which means a customer who
 * has never touched the toggle gets the theme their phone is already in. An
 * explicit choice stamps data-theme and overrides the device in both
 * directions.
 *
 * The stored value is read in index.html before React mounts; without that the
 * page paints cream for one frame and then flips, which looks broken on a
 * phone at night.
 */
const KEY = 'nd.theme'
const ORDER = ['system', 'light', 'dark']

export function applyTheme(theme) {
  const el = document.documentElement
  if (theme === 'system') el.removeAttribute('data-theme')
  else el.setAttribute('data-theme', theme)
}

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(KEY) || 'system' } catch { return 'system' }
  })

  useEffect(() => {
    applyTheme(theme)
    try { localStorage.setItem(KEY, theme) } catch { /* private mode — the choice just does not persist */ }
  }, [theme])

  const cycle = () => setTheme(t => ORDER[(ORDER.indexOf(t) + 1) % ORDER.length])
  return { theme, cycle }
}
