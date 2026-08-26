/**
 * Google Identity Services loader.
 *
 * Loads Google's script once, renders their official button, and hands the
 * resulting ID token to our backend. The token is NOT trusted here — the
 * server verifies its signature against Google's public keys before issuing
 * a session. This file only moves the token; all authority lives server-side.
 */

const GSI_SRC = 'https://accounts.google.com/gsi/client'
let loader = null

/** Load the GSI script once; repeat callers share the same promise. */
export function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (loader) return loader
  loader = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GSI_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('gsi_load_failed')))
      return
    }
    const s = document.createElement('script')
    s.src = GSI_SRC
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => { loader = null; reject(new Error('gsi_load_failed')) }
    document.head.appendChild(s)
  })
  return loader
}

/**
 * Render Google's button into `el`.
 * `onCredential` receives the raw ID token to POST to our backend.
 */
export async function renderGoogleButton(el, clientId, onCredential, onError) {
  try {
    await loadGoogleScript()
  } catch {
    onError?.('Could not reach Google. Check your connection and try again.')
    return
  }
  if (!window.google?.accounts?.id) {
    onError?.('Google sign-in is unavailable right now.')
    return
  }
  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => {
      if (response?.credential) onCredential(response.credential)
      else onError?.('Google did not return a sign-in token.')
    },
    // We verify server-side; FedCM is Google's newer, less intrusive flow.
    use_fedcm_for_prompt: true,
    auto_select: false,
  })
  window.google.accounts.id.renderButton(el, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'rectangular',
    logo_alignment: 'center',
    width: 320,
  })
}
