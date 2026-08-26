import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo.jsx'
import { renderGoogleButton } from '../lib/googleSignIn.js'

const INTENT_BANNERS = {
  'deep-scan':  <>After signing in, your <b>₹50 Deep Search</b> will be ready to launch.</>,
  'bundle-12':  <>After signing in, your <b>₹500 Bundle of 12 Deep Searches</b> will be ready to buy.</>,
  'keepsake':   <>After signing in, your <b>₹29 Keepsake PDF</b> will be ready to generate.</>,
  'shortlist':  <>After signing in, your <b>₹99 Shortlist of Five</b> comparison will be ready.</>,
}

// Backend origin — direct in dev, same-origin in production
const API_ORIGIN = import.meta.env.DEV ? 'http://localhost:3000' : ''

// Public by design — the Client ID ships in the page. Authority is server-side.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

export default function SignIn() {
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const intent = searchParams.get('intent')
  const googleBtnRef = useRef(null)
  const rendered = useRef(false)

  /**
   * Send Google's ID token to our backend, which verifies its signature
   * against Google's public keys before trusting anything in it. The token
   * is never trusted client-side.
   */
  const completeSignIn = async (credential) => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_ORIGIN}/v1/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      })
      if (res.status === 503) throw new Error('Google sign-in is not set up on the server yet.')
      if (!res.ok) throw new Error('Google could not sign you in. Please try again.')
      const data = await res.json()
      localStorage.setItem('nd_token', data.id_token)
      setStep(2)
      setTimeout(() => navigate(intent === 'deep-scan' ? '/' : '/account'), 1200)
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Render Google's official button once the node exists.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || step !== 0 || rendered.current || !googleBtnRef.current) return
    rendered.current = true
    renderGoogleButton(googleBtnRef.current, GOOGLE_CLIENT_ID, completeSignIn, setError)
    // completeSignIn is stable for this mount; re-running would double-render
    // Google's button into the same node.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])


  return (
    <div className="signin-page min-h-screen flex flex-col">
      <nav className="signin-bar">
        <div className="max-w-[1180px] mx-auto px-6 flex items-center justify-between py-5">
          <Link to="/" className="flex items-center">
            <BrandLogo height={40} />
          </Link>
          <Link to="/" className="signin-back text-sm">← Back to home</Link>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-[440px] mx-auto">
          <div className="signin-card rounded-[20px] p-10">
            {/* Step indicator */}
            <div className="flex justify-center gap-2 mb-6">
              {[0, 2].map(i => (
                <div
                  key={i}
                  className={`signin-dot ${
                    i < step ? 'is-done' : i === step ? 'is-now' : ''
                  }`}
                />
              ))}
            </div>

            {intent && INTENT_BANNERS[intent] && (
              <div className="signin-note mb-6 p-4 rounded-xl text-sm leading-relaxed">
                {INTENT_BANNERS[intent]}
              </div>
            )}

            {/* Step 0 — Google sign-in (replaced phone OTP, 4 Aug 2026) */}
            {step === 0 && (
              <>
                <div className="text-center mb-8">
                  <div className="font-mono text-[11px] tracking-[0.14em] text-accent uppercase mb-3">Sign in</div>
                  <h1 className="font-serif font-normal text-[32px] tracking-tight leading-tight">
                    Welcome to <em className="italic text-accent">Naam Dekho</em>
                  </h1>
                  <p className="mt-3 text-sm text-ink-3 leading-relaxed">
                    Continue with your Google account. One tap — no password, no OTP to wait for.
                  </p>
                </div>

                {/* Google renders its own button into this node */}
                <div className="flex justify-center min-h-[44px]" ref={googleBtnRef} />

                {!GOOGLE_CLIENT_ID && (
                  <div className="mt-4 p-4 rounded-xl border border-no-line bg-no-bg text-sm leading-relaxed">
                    <b>Google sign-in is not configured yet.</b>
                    <div className="mt-1 text-ink-2">
                      Add <code>VITE_GOOGLE_CLIENT_ID</code> to the frontend and{' '}
                      <code>GOOGLE_CLIENT_ID</code> to <code>backend/.env</code>, then restart.
                    </div>
                  </div>
                )}

                {loading && (
                  <p className="mt-4 text-center text-sm text-ink-3">Signing you in…</p>
                )}
                {error && (
                  <p className="mt-4 text-center text-sm" style={{ color: 'var(--no-ink)' }}>{error}</p>
                )}

                <p className="mt-7 text-center text-[11px] text-ink-3 leading-relaxed">
                  New here? Signing in creates your account and adds{' '}
                  <b>500 free tokens</b> — one Deep Search plus three Standard searches. By continuing you agree to our{' '}
                  <Link to="/terms" className="text-accent">Terms</Link> and{' '}
                  <Link to="/privacy" className="text-accent">Privacy Policy</Link>.
                </p>
              </>
            )}


            {/* Step 2 — success */}
            {step === 2 && (
              <div className="text-center py-6">
                <div className="font-mono text-[11px] tracking-[0.14em] text-ok uppercase mb-3">Signed in</div>
                <h1 className="font-serif font-normal text-[32px] tracking-tight">
                  You're <em className="italic text-accent">in</em>.
                </h1>
                <p className="mt-3 text-sm text-ink-3">Taking you back to the search…</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="signin-foot py-6 text-center text-[11px] font-mono text-ink-3">
        © 2026 Beyond Quantum Technologies Private Limited · नाम देखो
      </footer>
    </div>
  )
}
