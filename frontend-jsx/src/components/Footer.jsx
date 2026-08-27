import { Link } from 'react-router-dom'
import { Logo } from './Nav.jsx'
import { useMe } from '../lib/useMe.js'

export default function Footer() {
  const me = useMe()

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Logo dark height={48} />
          <p className="footer-tagline">
            India's first all-in-one name verification platform. From boardroom to baby cot —
            one search, every check that matters.
          </p>
          <div className="footer-social" aria-label="Social media">
            <a href="https://www.instagram.com/naam_dekho/" target="_blank" rel="noreferrer" aria-label="Instagram" className="social-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            </a>
            <a href="https://www.facebook.com/profile.php?id=61593043492826" target="_blank" rel="noreferrer" aria-label="Facebook" className="social-btn">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.91h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94z"/></svg>
            </a>
            <a href="https://www.linkedin.com/in/naamdekho-815364430/" target="_blank" rel="noreferrer" aria-label="LinkedIn" className="social-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
            </a>
            <a href="https://youtube.com/@naamdekho" target="_blank" rel="noreferrer" aria-label="YouTube" className="social-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>
            </a>
            <a href="https://wa.me/916386609425" target="_blank" rel="noreferrer" aria-label="WhatsApp" className="social-btn">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
            </a>
          </div>
        </div>

        <div className="footer-col">
          <h4>Product</h4>
          <Link to="/">Home</Link>
          <Link to="/how-it-works">How it works</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/pricing?audience=agency">For agencies</Link>
          {/* Same reasoning as the nav: "Sign in" makes no sense to someone
              who is already signed in. */}
          {me ? <Link to="/account">Your account</Link> : <Link to="/sign-in">Sign in</Link>}
        </div>

        <div className="footer-col">
          <h4>Use cases</h4>
          <Link to="/">Startup naming</Link>
          <Link to="/">Baby naming</Link>
          <Link to="/pricing?audience=agency">Naming agencies</Link>
          <Link to="/pricing?audience=agency">CA &amp; legal firms</Link>
        </div>

        {/*
          * The static SEO cluster — 697 generated pages under public/.
          *
          * Plain <a>, never <Link>. These files sit outside the SPA; a
          * client-side navigation hands the path to the router, which has no
          * matching route and sends the visitor to the catch-all redirect
          * back home.
          *
          * Until this column existed the 697 pages were orphans: named in
          * sitemap.xml and linked from nowhere on the site. A sitemap entry
          * alone is the weakest discovery signal there is, and it passes no
          * internal link equity at all. This is the path in.
          */}
        <div className="footer-col footer-explore">
          <h4>Explore</h4>
          <a href="/explore/">Everything we publish</a>
          <a href="/n/">Baby names A–Z</a>
          <a href="/numerology/">Chaldean numerology</a>
          <a href="/nakshatra/">All 27 nakshatras</a>
          <a href="/rashi/">The 12 rashis</a>
          <a href="/trademark-class/">45 trademark classes</a>
          <a href="/domains/">Domain prices in India</a>
          <a href="/script/">Your name in 9 scripts</a>
        </div>

        <div className="footer-col">
          <h4>Legal</h4>
          <Link to="/privacy">Privacy policy</Link>
          <Link to="/terms">Terms of use</Link>
          <Link to="/cookies">Cookies policy</Link>
          <Link to="/cancellation-refund">Cancellation &amp; refund</Link>
          <Link to="/payment-terms">Payment terms</Link>
        </div>

        <div className="footer-col footer-contact">
          <h4>Talk to us</h4>
          {/* One published address, and it is a mailbox that exists. Three
              addresses on a domain we do not serve mail for meant every
              "contact us" route was a dead end — and the IT Rules require a
              grievance contact that actually receives mail. */}
          <p><b>Email</b><a href="mailto:naamdekho.global@gmail.com">naamdekho.global@gmail.com</a></p>
          <p className="footer-addr">Beyond Quantum Technologies Private Limited<br/>Lucknow, Uttar Pradesh, India</p>
        </div>
      </div>

      <div className="container footer-bottom">
        <span>© 2026 Beyond Quantum Technologies Private Limited · नाम देखो</span>
        <span className="footer-meta">Made with care for Indian founders &amp; families</span>
      </div>
    </footer>
  )
}
