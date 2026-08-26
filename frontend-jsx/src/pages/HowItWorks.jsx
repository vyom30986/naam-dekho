import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSeo } from '../lib/useSeo.js'
import { usePricing } from '../lib/usePricing.js'

const STEPS = [
  { n: '01', title: 'You type the name', body: 'One box, one name. We tidy up the spacing and accents first, so a name typed two slightly different ways is still treated as the same name.' },
  { n: '02', title: 'We look everywhere at once', body: 'The name goes out to every check at the same time rather than one after another — registries, domains, handles, marketplaces and the language checks all run together.' },
  { n: '03', title: 'Each answer comes back plainly', body: 'Every check says one of four things: clear, worth a look, a real conflict, or could not be checked. Those add up into a single score, with the serious conflicts weighing most.' },
  { n: '04', title: 'You watch it fill in', body: 'Results appear as they arrive — you are not left staring at a spinner. Every check names the source it came from, so you can go and look for yourself.' },
]

/**
 * Grouped so 26 questions stay scannable. Every answer here must match what
 * the product actually does today — an FAQ that overclaims is worse than no
 * FAQ, because this is the page people read before they trust us.
 */
const FAQ_GROUPS = [
  {
    group: 'Getting started',
    items: [
      { q: 'How long does a search take?',
        a: 'A few seconds. A business search runs 30 checks and finishes in a few seconds; a baby-name search finishes in about one. Results appear as they arrive rather than all at the end.' },
      { q: 'Why do I have to sign in?',
        a: 'Because every search costs real money to run — we make live calls out to registries, domain registries and marketplaces on your behalf. Signing in ties those costs to an account, which is also what stops one person from draining the service for everyone. Signing in takes one tap with Google, and your first tokens are free.' },
      { q: 'Does checking a name reserve it for me?',
        a: 'No, and be careful of anyone who says otherwise. We only tell you what is free at this moment. Nothing is held for you — if a name matters, register the domain and file the trademark quickly, because a name that is free today can be gone next week.' },
      { q: 'Can I check a name that is not Indian?',
        a: 'Yes. Domains, handles, marketplaces and brand collisions work for any name. The parts specific to India — the scripts, the meaning across Indian languages, the numerology and the birth star — will simply have less to say about a name with no Indian root.' },
      { q: 'What if I disagree with a result?',
        a: 'Check it yourself — every result names its source, and where we can, we link straight to the page we read. If we got something wrong, tell us and we will fix the check rather than argue. We would rather lose one search than keep a wrong answer in the product.' },
    ],
  },
  {
    group: 'Tokens and payment',
    items: [
      { q: 'Why tokens instead of just rupees?',
        a: 'Because one name is rarely one search. Founders come back with three or four candidates; families work through fifteen before the namkaran. Paying per search means reaching for a card every time. One top-up covers the whole exercise, and the small checks cost proportionally less than the big ones.' },
      { q: 'Do tokens expire?',
        a: 'No. They sit in your account until you use them. There is no subscription, nothing to cancel and no monthly deadline to spend them by.' },
      { q: 'What if a search fails halfway — am I charged?',
        a: 'No. If a search fails on our side, the tokens are returned automatically. You are never charged for our fault. If a single check inside a working search could not be reached, that check is marked "not checked" and the rest of the search stands.' },
      { q: 'Can I buy more tokens right now?',
        a: 'Not yet — card and UPI payments are still being connected, so the "buy tokens" buttons are not live. Your free tokens work in full in the meantime. We would rather tell you this plainly than let you reach a checkout that does not work.' },
      { q: 'What is the difference between a Standard search and a Deep Search?',
        a: 'The Standard search covers everything we can check instantly and for free on the open web: domains, handles, app stores, brand collisions, language and numerology. The Deep Search adds the government registers, the Amazon India brand check, and five alternative names if your first choice is blocked.' },
    ],
  },
  {
    group: 'What we check',
    items: [
      { q: 'Which official registers do you check?',
        a: 'The company register and the trademark register across all 45 classes — not only your own class, because objections often come from a neighbouring one. Being straight with you: these two checks are not live yet. Neither register offers a public interface, so both need scraping work that is still in progress. Until it is done those tiles say so on your results rather than showing a number we have not verified. Sector regulators such as RBI and SEBI are not covered at all.' },
      { q: 'Do you check the exact handle, or similar ones too?',
        a: 'The exact handle. If you search "Ira", we report on @ira — not on @iraofficial or @ira_app. Loose matching sounds thorough but produces alarming results that are not really about your name, and you would stop trusting the green ticks.' },
      { q: 'Why does one check say "check this yourself"?',
        a: 'Some platforms actively block automated checks. Rather than guess, we give you a one-tap link and tell you exactly what to look for: if the page opens, the handle is taken; if it says "page not found", it is free. That takes you ten seconds and it is honest.' },
      { q: 'What does a "not checked" result mean?',
        a: 'That a source could not be reached, or that the founder has temporarily switched that check off because it was misbehaving. It never means "clear". A check that could not run says so, and it never counts towards your score in either direction.' },
      { q: 'Do you check other countries?',
        a: 'Not for company or trademark registers — those are India-only, which is the whole point of the product. Domains, social handles and the app stores are global by nature, so those results hold anywhere.' },
      { q: 'Do you suggest alternative names if mine is taken?',
        a: 'Yes, on the Deep Search. You can either give us up to five names of your own and have each checked in full, or let us suggest five. Either way every suggestion is re-checked against real domain and handle availability before you see it — a suggestion we have not verified is just noise.' },
      { q: 'Is my search private?',
        a: 'Yes. Your searches are stored securely, deleted after 90 days, and never sold or shared. You can delete your account and everything in it at any time from your account page, and it is a real deletion, not a flag. See our Privacy Policy.' },
    ],
  },
  {
    group: 'Baby names',
    items: [
      { q: 'Where does the meaning of a name come from?',
        a: 'From dictionaries and reference sources we can point at, never from invention. Where we have verified a meaning, we show it and name the source. Where we have not, the page shows no meaning at all rather than a pleasant-sounding guess — most baby-name sites do the opposite, and it is why two of them will give you two different meanings for the same name.' },
      { q: 'Why does my name show no meaning?',
        a: 'Because we have not been able to verify one from a source we trust. It is not a comment on the name. We are working through the list steadily, and a name with no meaning yet still gets its scripts, numerology, birth star, short forms and handle checks.' },
      { q: 'How is the numerology calculated?',
        a: 'By the Chaldean system, which is the one traditional Indian naming consultants use — not the Pythagorean system most Western sites use. We show the working: every letter, its value, the total, the root number and the ruling planet, so you or your family astrologer can check the arithmetic.' },
      { q: 'What is the Rashi and Nakshatra check based on?',
        a: 'The Avakahada chakra — the traditional table that maps the first syllable of a name to one of the 27 nakshatras and its moon sign. This is the same table used at a namkaran. It works from the name you type, not from a birth chart, so it tells you which star a name belongs to rather than which name suits a particular baby.' },
    ],
  },
  {
    group: 'Honest limits',
    items: [
      { q: 'Is this legal advice?',
        a: 'No. We show you what the public record says at the moment you search, with a link so you can see it yourself. Whether a name is safe to build a business on is a judgement for a trademark attorney or your company secretary. We name the source behind every check, which is meant to make their job faster and cheaper, not to replace them.' },
      { q: 'Can you guarantee the name is free to use?',
        a: 'No, and nobody honestly can. Registers lag behind reality, applications sit unpublished for weeks, and rights can exist through use without ever being registered. A clean search here means no conflict was visible today — it is a strong signal and a good filter, not a guarantee.' },
      { q: 'Is numerology science?',
        a: 'No, and we will not pretend otherwise. It is a tradition many Indian families and business owners genuinely care about, so we compute it properly and show the working. Treat it as one voice in the room. It is never the reason a name is marked as a problem.' },
      { q: 'Can I keep a copy of the results?',
        a: 'Yes. Every search shows its result on screen, with the source named behind every check, and your last fifty searches stay in your account. For baby names there is a designed certificate to print or share.' },
      { q: 'Do you handle names in Indian languages?',
        a: 'Yes. We write the name out in ten Indian scripts — Hindi, Marathi, Tamil, Telugu, Bengali, Gujarati, Punjabi, Kannada, Malayalam and Sanskrit — give its meaning where we can verify one, and flag names that mean something unfortunate in another Indian language. That last check is the one Western naming tools skip entirely.' },
      { q: 'Can agencies or CA firms use this for clients?',
        a: 'Yes, and several of the checks exist because that is who asked for them. A shared wallet, bulk searches and access from your own systems are available for firms doing this at volume — tell us your numbers on the pricing page and we will come back to you.' },
    ],
  },
]

// Flat list for the accordion's open/closed index.
const FAQ = FAQ_GROUPS.flatMap(g => g.items)

export default function HowItWorks() {
  useSeo({ title: 'How it works', description: 'How Naam Dekho checks a name — the company and trademark registers, domains, social handles, app stores, brand clashes, and what the name means across ten Indian languages.', path: '/how-it-works' })
  const [openFaq, setOpenFaq] = useState(0)
  // Prices come from the founder console, never typed into the page.
  const { pricing } = usePricing()
  const cost = pricing.costs
  const bonus = pricing.signupBonus
  const pack = pricing.packs[0] ?? { rupees: 50, tokens: 500 }

  return (
    <div className="container">
      <div className="page-hero">
        <div className="eyebrow">Behind the scenes · कैसे काम करता है</div>
        <h1 className="page-title">How Naam Dekho <em>actually works.</em></h1>
        <p className="page-sub">Every check runs at the same moment, so a search takes seconds rather than an afternoon. Here is what happens between typing the name and seeing the answer.</p>
      </div>

      {/* Pipeline */}
      <section className="module" style={{ borderBottom: 0 }}>
        <div className="grid cols-2">
          {STEPS.map(step => (
            <div key={step.n} className="tile" style={{ padding: 28 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 30, color: 'var(--accent)', fontWeight: 500 }}>{step.n}</div>
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 400, margin: '4px 0 0' }}>{step.title}</h3>
              <p style={{ color: 'var(--ink-3)', lineHeight: 1.6, fontSize: 14, margin: 0 }}>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture note */}
      <div className="lang-card" style={{ background: 'var(--bg-2)' }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 400, margin: '0 0 10px' }}>One slow source never holds up the rest</h3>
        <p className="lang-body" style={{ color: 'var(--ink-3)', marginBottom: 18 }}>
          Each check stands on its own. If the company register is having a slow day, your domain and
          handle results still arrive in seconds. And if something cannot be reached at all, we say so —
          the check is marked <span style={{ color: 'var(--warn-ink)', fontWeight: 500 }}>not checked</span> rather
          than quietly guessed. You should never have to wonder whether a green tick was real.
        </p>
        <div className="grid cols-3" style={{ gap: 10 }}>
          {['Company & trademark', 'Domain names', 'Social handles', 'App stores & marketplaces', 'Brand collisions', 'Language & numerology'].map(pool => (
            <div key={pool} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 16px', fontSize: 13.5 }}>{pool}</div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <section className="module" style={{ borderBottom: 0 }}>
        <div className="section-head" style={{ justifyContent: 'center' }}>
          <h2 className="section-title">Frequently asked</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 820, margin: '0 auto' }}>
          {FAQ.map((item, i) => {
            const isOpen = openFaq === i
            // A group heading appears above the first question of each group.
            const groupStart = FAQ_GROUPS.find(g => g.items[0] === item)
            return (
              <div key={i} style={{ display: 'contents' }}>
              {groupStart && (
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '.1em',
                  textTransform: 'uppercase', color: 'var(--ink-3)', marginTop: i === 0 ? 0 : 20, marginBottom: 2,
                }}>{groupStart.group}</div>
              )}
              <div className="tile" style={{ padding: 0, gap: 0 }}>
                <button
                  onClick={() => setOpenFaq(isOpen ? -1 : i)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', background: 'transparent', border: 0, textAlign: 'left', fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}
                >
                  <span>{item.q}</span>
                  <span style={{ color: 'var(--accent)', transition: 'transform .2s', transform: isOpen ? 'rotate(45deg)' : 'none', fontSize: 18 }}>+</span>
                </button>
                {isOpen && (
                  <div style={{ padding: '0 22px 18px', color: 'var(--ink-3)', lineHeight: 1.6, fontSize: 14 }}>{item.a}</div>
                )}
              </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* CTA */}
      <div className="cta-strip">
        <div>
          <h3>Try a search. <em>{bonus.toLocaleString('en-IN')} tokens free when you sign in.</em></h3>
          <p>
            Results appear in seconds. A standard search is {cost.business.standard} tokens,
            a Deep Search {cost.business.deep}, a baby name search {cost.baby.standard} — and
            ₹{pack.rupees} buys {pack.tokens.toLocaleString('en-IN')} more whenever you need them.
          </p>
        </div>
        <div className="cta-buttons">
          <Link to="/" className="cta-btn">Start searching <small>{bonus.toLocaleString('en-IN')} tokens free</small></Link>
          <Link to="/pricing" className="cta-btn outline">See pricing <small>in tokens</small></Link>
        </div>
      </div>
    </div>
  )
}
