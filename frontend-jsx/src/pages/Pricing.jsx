import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useSeo } from '../lib/useSeo.js'
import { usePricing } from '../lib/usePricing.js'

const API_ORIGIN = import.meta.env.DEV ? 'http://localhost:3000' : ''

// Rupee figures are DERIVED from the live token prices and the pack rate —
// never typed twice. A published price change updates both columns at once.
const rupees = (tokens, rate) => {
  const r = tokens * rate
  return r < 10 ? `₹${r.toFixed(2).replace(/.00$/, '')}` : `₹${Math.round(r).toLocaleString('en-IN')}`
}

const AUDIENCES = {
  founder: {
    label: 'Founders',
    deva: 'संस्थापक',
    tagline: 'Startup and business owners',
    note: 'One currency for everything. Sign in and 500 tokens land in your account — enough for a Deep Search plus three Standard searches, and they never expire.',
    plans: [
      {
        tier: 'Every search',
        name: <>Standard <em>search</em></>,
        amt: '50',
        per: 'tokens · ₹5',
        desc: 'All 20 instant checks — the ones that answer "is this name actually free?"',
        featured: false,
        features: ['14 domain endings, each checked separately', 'Instagram, X, YouTube, LinkedIn, Facebook', 'Play Store, App Store, GitHub, Shopify, Product Hunt', 'Wikipedia, web search, numerology, 10 Indian scripts'],
        cta: 'Start with 500 free tokens', ctaTo: '/sign-in',
      },
      {
        tier: 'Before you incorporate',
        name: <>Deep <em>Search</em></>,
        amt: '350',
        per: 'tokens · ₹35',
        desc: 'Everything above, plus the government registries that actually block a name.',
        featured: true,
        features: ['All 33 checks — MCA21 company register', 'IP India Trademark, all 45 classes', 'Amazon India brand registry', 'Five alternatives — ours or your own shortlist'],
        cta: 'Get started', ctaTo: '/sign-in?intent=deep-scan',
      },
    ],
  },
  parent: {
    label: 'Parents',
    deva: 'माता-पिता',
    tagline: 'For newborns and namkaran ceremonies',
    note: 'Name searches are half price for parents, because families compare fifteen names before they settle on one. Your 500 free tokens cover twenty of them.',
    plans: [
      {
        tier: 'Every name you consider',
        name: <>Name <em>search</em></>,
        amt: '25',
        per: 'tokens · ₹2.50',
        desc: 'Meaning, pronunciation, numerology and the birth star — for as many names as the family suggests.',
        featured: false,
        features: ['The name written in 10 Indian scripts', 'Chaldean numerology — root number and ruling planet', 'Rashi & Nakshatra by the Avakahada chakra', 'Nicknames, sibling harmony, pronunciation', 'Landmine check across 7 languages'],
        cta: 'Start with 500 free tokens', ctaTo: '/sign-in',
      },
      {
        tier: 'For the one you choose',
        name: <>Full naming <em>report</em></>,
        amt: '300',
        per: 'tokens · ₹30',
        desc: 'The full search plus the designed certificate — A4 to frame, and a square for Instagram.',
        featured: true,
        features: ['Everything in a name search', 'Designed keepsake certificate, print-ready', 'Instagram square for the announcement', 'The search itself is included — cheaper than buying both'],
        cta: 'Get started', ctaTo: '/sign-in?intent=keepsake',
      },
      {
        tier: 'When the family disagrees',
        name: <>Shortlist <em>of Five</em></>,
        amt: '1,000',
        per: 'tokens · ₹100',
        desc: 'Five names — yours or ours — each checked in full and set side by side.',
        featured: false,
        features: ['Five names, each fully checked', 'Bring your own shortlist, or let us suggest', 'Compared side by side on one sheet', 'Fewer than five is fine — you are charged for what you use'],
        cta: 'Get started', ctaTo: '/sign-in?intent=shortlist',
      },
    ],
  },
  agency: {
    label: 'For agencies',
    deva: 'एजेंसी',
    tagline: 'Naming consultancies, CA firms and brand studios',
    note: 'High-volume token pricing, a shared team wallet and API access. Tell us your volume and we will come back with a quote.',
    plans: [],
  },
}

export default function Pricing() {
  useSeo({ title: 'Pricing — 500 free tokens to start', description: 'One token wallet for everything. Standard search 50 tokens, Deep Search 350, baby name search 25. Sign in and get 500 tokens free — they never expire. ₹50 buys 500 tokens.', path: '/pricing' })
  // The audience lives in the URL, so nav links like /pricing?audience=agency
  // work even when we're already on this page — and the pills update the URL.
  const [searchParams, setSearchParams] = useSearchParams()
  const urlAudience = searchParams.get('audience')
  const audience = AUDIENCES[urlAudience] ? urlAudience : 'founder'
  const setAudience = (key) => setSearchParams(key === 'founder' ? {} : { audience: key })
  const [leadStatus, setLeadStatus] = useState(null)
  const { pricing } = usePricing()
  const COST = {
    standard: pricing.costs.business.standard,
    deep: pricing.costs.business.deep,
    babySearch: pricing.costs.baby.standard,
    babyReport: pricing.costs.baby.deep,
    keepsake: pricing.addons.keepsake,
    shortlist: pricing.addons.shortlist,
  }
  const SIGNUP_BONUS = pricing.signupBonus
  const pack = pricing.packs[0] ?? { rupees: 50, tokens: 500 }
  const RATE = pack.rupees / pack.tokens   // ₹ per token
  const cfg = AUDIENCES[audience]

  const submitLead = async (e) => {
    e.preventDefault()
    setLeadStatus('sending')
    const form = new FormData(e.target)
    const data = Object.fromEntries(form.entries())
    try {
      const res = await fetch(`${API_ORIGIN}/v1/agency-leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          company: data.company,
          expected_volume: data.teamSize,
          notes: data.notes || undefined,
        }),
      })
      if (!res.ok) throw new Error('lead_failed')
      setLeadStatus('sent')
    } catch {
      setLeadStatus('error')
    }
  }

  return (
    <div className="container">
      {/* PAGE HERO */}
      <div className="page-hero">
        <div className="eyebrow">Pricing · कीमत</div>
        <h1 className="page-title">One wallet. <em>Every naming journey.</em></h1>
        <p className="page-sub">Sign in and 500 tokens are yours — no card, nothing to cancel. Spend them on whatever you need, and they never expire. All prices include GST.</p>

        {/* AUDIENCE SWITCHER */}
        <div className="audience-tabs">
          {Object.entries(AUDIENCES).map(([key, val]) => (
            <button key={key} onClick={() => setAudience(key)} className={`audience-pill${audience === key ? ' active' : ''}`}>
              {val.label} <span className="deva">{val.deva}</span>
            </button>
          ))}
        </div>
        <p style={{ marginTop: 14, color: 'var(--ink-3)', fontSize: 14 }}>{cfg.tagline}</p>
      </div>

      {/* PLAN CARDS */}
      {cfg.plans.length > 0 && (
        <>
          <div className="pricing-grid" style={{ marginTop: 40 }}>
            {cfg.plans.map((plan, i) => (
              <div key={i} className={`plan${plan.featured ? ' featured' : ''}`}>
                <div className="plan-tier">{plan.tier}</div>
                <h3 className="plan-name">{plan.name}</h3>
                <div className="plan-price">
                  <span className="amt">{plan.amt}</span>
                  <span className="per">{plan.per}</span>
                </div>
                <p className="plan-desc">{plan.desc}</p>
                <Link to={plan.ctaTo} className="plan-cta">{plan.cta} →</Link>
                <ul className="plan-features">
                  {plan.features.map(f => (
                    <li key={f}><span className="tick">✓</span><span>{f}</span></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {cfg.note && <p className="pricing-note">{cfg.note}</p>}
        </>
      )}

      {/* TOKEN PACKS — how you actually top up */}
      {audience !== 'agency' && (
        <section className="module" style={{ borderBottom: 0 }}>
          <div className="section-head" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8 }}>
            <h2 className="section-title" style={{ justifyContent: 'center' }}>Topping up</h2>
            <p className="section-desc" style={{ maxWidth: 560 }}>
              Tokens never expire, so there is nothing to use up before a deadline
              and no subscription to remember to cancel.
            </p>
          </div>

          <div className="pricing-grid" style={{ marginTop: 26 }}>
            <div className="plan">
              <div className="plan-tier">On signing in</div>
              <h3 className="plan-name">500 <em>free</em></h3>
              <div className="plan-price"><span className="amt">₹0</span><span className="per">one per account</span></div>
              <p className="plan-desc">
                {audience === 'parent'
                  ? 'Twenty name searches, or a full naming report with change left over.'
                  : 'A Deep Search plus three Standard searches, or ten Standard searches.'}
              </p>
              <Link to="/sign-in" className="plan-cta">Claim your tokens →</Link>
            </div>

            <div className="plan featured">
              <div className="plan-tier">Top-up</div>
              <h3 className="plan-name">500 <em>tokens</em></h3>
              <div className="plan-price"><span className="amt">₹50</span><span className="per">₹0.10 per token</span></div>
              <p className="plan-desc">
                {audience === 'parent'
                  ? 'Another twenty name searches, or a report for the name you choose.'
                  : 'Another Deep Search with change, or ten more Standard searches.'}
              </p>
              <Link to="/sign-in?intent=tokens-500" className="plan-cta">Buy 500 tokens →</Link>
            </div>

            <div className="plan">
              <div className="plan-tier">For a longer search</div>
              <h3 className="plan-name">5,000 <em>tokens</em></h3>
              <div className="plan-price"><span className="amt">₹500</span><span className="per">₹0.10 per token</span></div>
              <p className="plan-desc">
                Ten times the tokens for ten times the price — same rate, fewer trips
                to the checkout.
              </p>
              <Link to="/sign-in?intent=tokens-5000" className="plan-cta">Buy 5,000 tokens →</Link>
            </div>
          </div>

          {/* The full price list, so nothing is hidden */}
          <div className="tm-wrap" style={{ marginTop: 34 }}>
            <div className="tm-label">What everything costs, in tokens</div>
            <div className="tm-table">
              <div className="tm-row head"><span>Tokens</span><span>What you get</span><span>In rupees</span><span></span></div>
              {[
                [COST.standard, 'Standard search — 30 checks'],
                [COST.deep, 'Deep Search — 33 checks and five verified alternatives'],
                [COST.babySearch, 'Baby name search — 12 checks'],
                [COST.babyReport, 'Full naming report — search + keepsake certificate'],
                [COST.shortlist, 'Shortlist of Five — five names compared'],
              ].map(([tokens, what]) => (
                <div className="tm-row" key={what}>
                  <span className="tm-class">{tokens.toLocaleString('en-IN')}</span>
                  <span className="tm-name">{what}</span>
                  <span className="tm-status" style={{ color: 'var(--ink-3)' }}>{rupees(tokens, RATE)}</span>
                  <span></span>
                </div>
              ))}
            </div>
            <p className="tm-note">
              Your {SIGNUP_BONUS} free tokens work on any of these. Nothing expires, and
              a search that fails on our side is refunded automatically.
            </p>
          </div>
        </section>
      )}

      {/* AGENCY — dark section */}
      {audience === 'agency' && (
        <div className="agency-section" id="agency-form">
          <div className="agency-grid">
            <div className="agency-info">
              <h2>Naming at <em>agency scale.</em></h2>
              <p className="lead">Studios, brand consultancies, CA firms and incubators run dozens of name checks a month. We price that on volume, with white-label reports on the roadmap.</p>
              <ul>
                <li><span className="num">1</span><span><b>Studio — from ₹9,999/month</b>Bulk searches, priority queue, dedicated support channel.</span></li>
                <li><span className="num">2</span><span><b>Incubator — seat-based</b>Cohort dashboards and founder-facing shared reports.</span></li>
                <li><span className="num">3</span><span><b>Enterprise — annual</b>Dedicated infrastructure and custom SLAs.</span></li>
              </ul>
            </div>

            {leadStatus === 'sent' ? (
              <div className="agency-ok">
                Thanks — we've received your enquiry and will be in touch within one business day.
              </div>
            ) : (
              <form className="agency-form" onSubmit={submitLead}>
                <h3>Talk to sales</h3>
                <div className="form-row">
                  <div className="form-field">
                    <label>Name</label>
                    <input required name="name" placeholder="Your name" />
                  </div>
                  <div className="form-field">
                    <label>Work email</label>
                    <input required type="email" name="email" placeholder="you@agency.in" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label>Phone</label>
                    <input required type="tel" name="phone" placeholder="+91 98765 43210" />
                  </div>
                  <div className="form-field">
                    <label>Company</label>
                    <input required name="company" placeholder="Agency / firm name" />
                  </div>
                </div>
                <div className="form-field">
                  <label>Team size</label>
                  <select name="teamSize" defaultValue="1–5">
                    <option>1–5</option><option>6–20</option><option>21–50</option><option>50+</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>What are you looking to solve?</label>
                  <textarea name="notes" rows="4" placeholder="Roughly how many names do you check per month?" />
                </div>
                {leadStatus === 'error' && (
                  <div style={{ color: '#E89AB3', fontSize: 13 }}>Could not send — check the fields and try again.</div>
                )}
                <button type="submit" disabled={leadStatus === 'sending'} className="agency-submit">
                  {leadStatus === 'sending' ? 'Sending…' : 'Send enquiry →'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* FAQ mini */}
      <div style={{ margin: '64px 0 24px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>
        Questions about pricing?{' '}
        <a href="mailto:naamdekho.global@gmail.com" style={{ color: 'var(--accent)', fontWeight: 500 }}>Email naamdekho.global@gmail.com</a>{' '}
        or{' '}
        <Link to="/how-it-works" style={{ color: 'var(--accent)', fontWeight: 500 }}>read how it works</Link>.
      </div>
    </div>
  )
}
