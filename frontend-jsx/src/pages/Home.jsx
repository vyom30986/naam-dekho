import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import { useSeo, HOME_JSON_LD } from '../lib/useSeo.js'
import { useMe, refreshMe } from '../lib/useMe.js'
import { usePricing, DEFAULT_PRICING } from '../lib/usePricing.js'

// Backend origin — Vite dev proxies aren't used for WebSocket, so talk to the
// API directly in dev; same-origin in production.
const API_ORIGIN = import.meta.env.DEV ? 'http://localhost:3000' : ''

// Baby-mode tiles reuse backend checks under different tile ids
/** Baby mode only. Matches corpus_names.gender so the two vocabularies agree. */
const GENDERS = [['boy', 'Boy'], ['girl', 'Girl'], ['unisex', 'Either']]

const BABY_ID_MAP = {
  'lin-mean': 'b-mean',
  'lin-land': 'b-land',
  'lin-pron': 'b-pron',
  'lin-num': 'b-num',
  'soc-ig': 'b-ig',
  'soc-yt': 'b-yt',
  'soc-fb': 'b-fb',
}

/**
 * FULL CATALOGUE — every check we run per search. Backend tileIds must match
 * these keys exactly. 33 on a business Deep Search, 30 on a Standard.
 * `tier: 'free'` → shown to everyone · `tier: 'paid'` → locked until Deep Search.
 * No sample/demo data anywhere — tiles only ever show real scan results.
 */
const CATALOGUE = {
  business: [
    // FREE — Domains, ONE TILE PER ENDING (4 Aug 2026). Bundled tiles could
    // only say "3 taken, 3 available", which is useless when the question is
    // whether .ai specifically is free. Same lookups, clearer answer.
    { key: 'dom-com',   family: 'Domain', label: '.com', icon: '.com', source: 'rdap.org', tier: 'free', what: "The one that still matters most to customers and investors. Checked live against the global registry." },
    { key: 'dom-in',    family: 'Domain', label: '.in', icon: '.in', source: 'rdap.org', tier: 'free', what: "India's own ending. Often free when .com is long gone, and it signals an Indian business." },
    { key: 'dom-coin',  family: 'Domain', label: '.co.in', icon: '.co', source: 'rdap.org', tier: 'free', what: "The commercial Indian ending — the usual fallback when .in itself is taken." },
    { key: 'dom-org',   family: 'Domain', label: '.org', icon: '.org', source: 'rdap.org', tier: 'free', what: "Expected of non-profits and foundations, and often held defensively by companies." },
    { key: 'dom-net',   family: 'Domain', label: '.net', icon: '.net', source: 'rdap.org', tier: 'free', what: "The old alternative to .com. Less sought after now, which is exactly why it is often still free." },
    { key: 'dom-io',    family: 'Domain', label: '.io', icon: '.io', source: 'rdap.org', tier: 'free', what: "The default for developer tools and SaaS. Expensive, and taken quickly for short names." },
    { key: 'dom-ai',    family: 'Domain', label: '.ai', icon: '.ai', source: 'rdap.org', tier: 'free', what: "The most fought-over ending right now, and the priciest. Worth knowing before you commit to an AI-adjacent name." },
    { key: 'dom-co',    family: 'Domain', label: '.co', icon: '.co', source: 'rdap.org', tier: 'free', what: "The common escape when .com is gone. Short, recognised, and reads as a company." },
    { key: 'dom-dev',   family: 'Domain', label: '.dev', icon: '.dev', source: 'rdap.org', tier: 'free', what: "For engineering brands and documentation sites. Requires HTTPS, which is no longer a hurdle." },
    { key: 'dom-app',   family: 'Domain', label: '.app', icon: '.app', source: 'rdap.org', tier: 'free', what: "Reads unmistakably as a product. Popular with mobile-first brands." },
    { key: 'dom-store', family: 'Domain', label: '.store', icon: '.st', source: 'rdap.org', tier: 'free', what: "For retail and D2C. Pricier than most, and worth it only if you actually sell direct." },
    { key: 'dom-shop',  family: 'Domain', label: '.shop', icon: '.sh', source: 'rdap.org', tier: 'free', what: "The cheaper commerce ending, and widely understood by shoppers." },
    { key: 'dom-tech',  family: 'Domain', label: '.tech', icon: '.te', source: 'rdap.org', tier: 'free', what: "Common with Indian technology startups, and usually free even for short names." },
    { key: 'dom-xyz',   family: 'Domain', label: '.xyz', icon: '.xy', source: 'rdap.org', tier: 'free', what: "The cheapest way to hold a name while you decide. Some audiences still read it as unserious." },

    // FREE — Social handles
    { key: 'soc-ig', family: 'Social', label: 'Instagram', icon: 'IG', source: 'instagram.com', tier: 'free', what: "The handle your customers will actually look for first. Exact match only." },
    { key: 'soc-x',  family: 'Social', label: 'X (Twitter)', icon: 'X', source: 'x.com', tier: 'free', what: "Where founders announce, and where journalists check you exist." },
    { key: 'soc-yt', family: 'Social', label: 'YouTube', icon: 'YT', source: 'youtube.com', tier: 'free', what: "The channel handle, reserved early even if you have nothing to upload yet." },
    { key: 'soc-li', family: 'Social', label: 'LinkedIn', icon: 'in', source: 'linkedin.com', tier: 'free', what: "The company page slug — the first thing a B2B buyer or investor searches." },
    { key: 'soc-fb', family: 'Social', label: 'Facebook', icon: 'FB', source: 'facebook.com', tier: 'free', what: "Still the widest reach in small-town India, and the page slug is first-come." },

    // FREE — Marketplace
    { key: 'mp-play',  family: 'Marketplace', label: 'Google Play Store', icon: 'PS', source: 'play.google.com', tier: 'free', what: "Is there already an app with this exact name? A collision here confuses your users and Play Store search." },
    { key: 'mp-apple', family: 'Marketplace', label: 'Apple App Store', icon: 'AS', source: 'apps.apple.com', tier: 'free', what: "The same check on iOS, where an exact-name clash can block your listing." },
    { key: 'mp-shop',  family: 'Marketplace', label: 'Shopify subdomain', icon: 'Sh', source: 'shopify.com', tier: 'free', what: "yourname.myshopify.com — taken quietly by squatters far more often than founders expect." },
    { key: 'mp-gh',    family: 'Marketplace', label: 'GitHub username', icon: 'GH', source: 'github.com', tier: 'free', what: "Your engineers will want this on day one. Also a strong squatting signal." },
    { key: 'mp-ph',    family: 'Marketplace', label: 'Product Hunt', icon: 'PH', source: 'producthunt.com', tier: 'free', what: "Has someone already launched under this name? Tells you what press and search will surface." },

    // FREE — Brand & Search
    { key: 'br-wiki', family: 'Brand', label: 'Wikipedia + Wikidata', icon: 'W', source: 'wikipedia.org', tier: 'free', what: "Is this name already a person, a place, or a concept? Decides whether you can ever own the search result." },
    { key: 'br-cse',  family: 'Brand', label: 'Web search (top 3)', icon: '⌕', source: 'search.brave.com', tier: 'free', what: "What a customer sees on page one when they Google you. Existing brands here are the silent killer." },

    // FREE — Linguistic
    { key: 'lin-num',  family: 'Linguistic', label: 'Chaldean Numerology', icon: '5', source: 'in-house engine', tier: 'free', what: "The traditional Chaldean reading — compound number, root number, ruling planet and the fields it favours." },
    { key: 'lin-mean', family: 'Linguistic', label: 'Meaning (10 langs)', icon: 'व्य', source: 'bhashini.gov.in', tier: 'free', what: "The name written across ten Indian scripts, plus any root meaning we can identify." },
    { key: 'lin-land', family: 'Linguistic', label: 'Landmine dictionary', icon: '!', source: 'in-house dataset', tier: 'free', what: "A name that is neutral in English can be unfortunate in Tamil or Bengali. This is the layer Western tools skip." },
    { key: 'lin-pron', family: 'Linguistic', label: 'Pronunciation score', icon: '♪', source: 'in-house engine', tier: 'free', what: "Will people say it the same way twice? Syllable count and ease, for Indian and non-Indian speakers." },

    // PAID — Legal (locked)
    { key: 'leg-mca', family: 'Legal', label: 'MCA21 Company Register', icon: 'M', source: 'mca.gov.in', tier: 'paid', what: "The company register. This is where you find the conflict that costs ₹2L in rebranding later." },
    { key: 'leg-tm',  family: 'Legal', label: 'IP India Trademark (45 classes)', icon: '₹', source: 'ipindia.gov.in', tier: 'paid', what: "All 45 trademark classes, not just yours — because objections come from adjacent classes." },

    // PAID — Marketplace (locked)
    { key: 'mp-amzn',  family: 'Marketplace', label: 'Amazon India Brand', icon: 'Az', source: 'amazon.in', tier: 'paid', what: "Is the brand name already registered on Amazon India? Matters before you ever list a product." },

    // PAID — Deep Search bonus
    { key: 'alt-gen', family: 'Bonus', label: '5 verified alternatives — ours or yours', icon: '✦', source: 'AI + re-verification', tier: 'paid', what: "Bring your own shortlist of up to five, or let us suggest — every name re-verified against real domain and handle checks." },
  ],
  baby: [
    // FREE
    { key: 'b-mean', family: 'Meaning', label: 'Meaning across 10 Indian languages', icon: 'व्य', source: 'bhashini.gov.in', tier: 'free', what: "The name written across ten Indian scripts, with any root meaning we can identify." },
    { key: 'b-land', family: 'Meaning', label: 'Landmine dictionary (7 langs)', icon: '!', source: 'in-house dataset', tier: 'free', what: "Checks the name against a seven-language dictionary of unfortunate meanings, before the namkaran." },
    { key: 'b-pron', family: 'Pronunciation', label: 'Pronunciation ease score', icon: '♪', source: 'in-house engine', tier: 'free', what: "Will the family say it the same way? Will their school friends? A name is its sound, repeated for a lifetime." },
    { key: 'b-num',  family: 'Numerology', label: 'Chaldean numerology', icon: '5', source: 'in-house engine', tier: 'free', what: "The traditional Chaldean reading — root number, ruling planet, and what the vibrations are said to favour." },
    { key: 'b-rashi', family: 'Astrology', label: 'Rashi & Nakshatra', icon: '☾', source: 'Avakahada chakra', tier: 'free', what: "Give the date of birth and we work it the way a pandit does — the moon's star at birth, and the syllables tradition suggests. Without a date, we tell you which star this name's first syllable belongs to." },
    { key: 'b-nick', family: 'Everyday', label: 'Nickname & short forms', icon: '❋', source: 'in-house engine', tier: 'free', what: "The short forms this name will naturally take at home and in school." },
    { key: 'b-sib',  family: 'Everyday', label: 'Sibling name harmony', icon: '∞', source: 'in-house engine', tier: 'free', what: "How the name sounds beside a sibling's — alliteration, rhyme, rhythm and numerology together." },
    { key: 'b-ig',   family: 'Handles', label: 'Instagram handle (future baby)', icon: 'IG', source: 'instagram.com', tier: 'free', what: "Reserve the handle now, for the person they will become." },
    { key: 'b-yt',   family: 'Handles', label: 'YouTube channel handle', icon: 'YT', source: 'youtube.com', tier: 'free', what: "The channel handle, held for later." },
    // The engine has always checked Facebook in baby mode — the result simply
    // had nowhere to land, so it was thrown away on arrival. No new scan work.
    { key: 'b-fb',   family: 'Handles', label: 'Facebook page name', icon: 'FB', source: 'facebook.com', tier: 'free', what: "The page slug is first-come, and Facebook is still where most of the extended family will be." },
    // (Gmail availability removed — there is no honest way to check it without
    //  trying to create the account, so we refuse to show guesses.)

    // PAID
    { key: 'b-kp',  family: 'Bonus', label: 'Keepsake PDF (designed A4 + IG square)', icon: '⎙', source: 'keepsake', tier: 'paid', what: "A designed A4 certificate and an Instagram square — scripts, numerology, nakshatra and nicknames." },
    { key: 'b-alt', family: 'Bonus', label: '5 similar name suggestions', icon: '✦', source: 'AI + re-verification', tier: 'paid', what: "Five names in the same spirit, each checked the same way." },
  ],
}

/** Section layout per family — numbering, copy and grid width from the prototype. */
const SECTIONS = {
  business: [
    { family: 'Legal', num: '01', title: 'Legal & Regulatory', cols: 'cols-3', desc: 'Government sources. This is where you find blockers that cost you ₹2L in rebrand later. The Deep Search runs MCA21 and all 45 trademark classes via warmed sessions + CAPTCHA solvers.' },
    { family: 'Domain', num: '02', title: 'Domains', cols: '', desc: 'Live availability via RDAP — the modern WHOIS. Grouped by the endings that matter, with first-year pricing and a one-click path to registration.' },
    { family: 'Social', num: '03', title: 'Social handles', cols: '', desc: 'Exact handle availability — what your brand will look like on every platform that matters in India.' },
    { family: 'Marketplace', num: '04', title: 'Marketplaces & stores', cols: '', desc: 'App stores, e-commerce and developer surfaces where your name might already exist as a published product.' },
    { family: 'Brand', num: '05', title: 'Brand collision & SEO', cols: 'cols-2', desc: "What people will find when they Google your name on day one. Existing brands ranking on page 1 are the silent killer for organic discovery." },
    { family: 'Linguistic', num: '06', title: 'Linguistic & cultural', cols: 'cols-3', desc: "India is multilingual. A name that's neutral in English can be unfortunate in Tamil or Bengali. This is the layer every Western naming tool skips.", skipKeys: ['lin-num'] },
    // 07 = Numerology showpiece (rendered specially)
    { family: 'Bonus', num: '08', title: 'Deep Search bonus', cols: 'cols-2', desc: 'Included with every Deep Search — verified alternative names when your first choice is blocked.' },
  ],
  baby: [
    { family: 'Meaning', num: '01', title: 'Meaning & cultural safety', cols: 'cols-2', desc: 'Meaning across 10 Indian languages, and the 7-language landmine dictionary that catches unfortunate connotations before the namkaran.' },
    { family: 'Pronunciation', num: '02', title: 'Pronunciation', cols: 'cols-2', desc: 'Will the family say it the same way? Will their school friends? A name is the sound of itself, repeated tens of thousands of times.' },
    { family: 'Numerology', num: '03', title: 'Numerology', cols: 'cols-2', desc: 'Traditional Chaldean reading — root number, ruling planet, and what the vibrations say.' },
    { family: 'Astrology', num: '04', title: 'Rashi & Nakshatra', cols: 'cols-2', desc: 'Which birth star and moon sign this starting syllable traditionally belongs to, by the Avakahada chakra. The janam-kundli from the birth time is always the authoritative source — this is the traditional table, read in reverse.' },
    { family: 'Everyday', num: '05', title: 'Everyday use', cols: 'cols-2', desc: 'How the name will actually live at home — the short forms family will use, and how it sounds alongside a sibling\'s name.' },
    { family: 'Handles', num: '06', title: 'Their future handles', cols: 'cols-3', desc: 'Reserve the social handles now, for when they grow up.' },
    { family: 'Bonus', num: '07', title: 'Certificates', cols: 'cols-2', desc: 'A single-page certificate, included with your naming report — the name, what it means, its numerology and its birth star, ready to print or frame.' },
  ],
}

const MODES = {
  business: { placeholder: "Type your startup's name…" },
  baby:     { placeholder: "Type your baby's name…" },
}

/**
 * The trademark classes that matter to most Indian startups, from the Nice
 * Classification. The descriptions are real and useful on their own — they
 * tell a founder which classes they would actually need to file in.
 *
 * Per-class STATUS is not shown until the IP India connection is live. We
 * will not print an invented "Clear" or "Objected" against a legal register.
 */
const TM_CLASSES = [
  { cls: '09', name: 'Software, electronics, mobile apps' },
  { cls: '35', name: 'Advertising, business management', note: 'high overlap with most startups' },
  { cls: '36', name: 'Financial services, insurance, fintech' },
  { cls: '38', name: 'Telecom, broadcasting, messaging' },
  { cls: '41', name: 'Education, entertainment, training' },
  { cls: '42', name: 'SaaS, cloud, scientific & tech services' },
  { cls: '44', name: 'Medical, health, hygiene services' },
]

// Token prices — must match backend/src/lib/tokens.ts
// Tier names — must match the z.enum in backend/src/api/scan.ts and the
// scan_tier enum in the database. Named constants because sending a string
// literal the backend no longer recognises is exactly how every search on the
// site broke on 4 Aug 2026: 'free' was renamed to 'standard' everywhere except
// the two call sites on this page.
const TIER_STANDARD = 'standard'
const TIER_DEEP = 'deep'
const TIER_SHORTLIST = 'shortlist'

// Options chosen to line up with the traditional vocabulary in
// backend/src/lib/numerology.ts (INDUSTRY_FIT + INDUSTRY_SYNONYMS), so every
// pick gives the matcher something real to compare. "Agriculture" and friends
// are still listed even though every root is neutral on them — an honest
// "neutral" beats a list that hides the industries we can't speak to.
const INDUSTRIES = [
  'SaaS / Tech', 'Media & Entertainment', 'E-commerce & Retail',
  'Fintech & Banking', 'Insurance', 'Education & EdTech', 'Publishing',
  'Healthcare & Wellness', 'Hospitality & Travel', 'Food & Beverage',
  'Fashion & Luxury', 'Beauty & Personal care', 'Construction & Engineering',
  'Real estate', 'Manufacturing', 'Logistics & Mobility', 'Sports & Fitness',
  'Defence & Security', 'Consulting & Services', 'Spirituality & Religion',
  'Government & Politics', 'Gaming & Esports', 'Children & Toys', 'Agriculture',
]

/**
 * Everything the two modes say about price, in one place.
 *
 * A founder buying a Deep Search and a parent buying a naming keepsake are not
 * the same customer and should not read the same sentences. Until 4 Aug 2026
 * the baby side quietly inherited the startup wording — parents were shown
 * "premium checks are locked, unlock for ₹50", which is both the wrong price
 * and the wrong tone for a namkaran.
 *
 * The WORDING lives here; the NUMBERS come from GET /v1/pricing, published in
 * the founder console. Hardcoding the costs here is what let the page and the
 * charge drift apart before — now the site literally cannot show a price the
 * backend will not charge.
 */
const COPY = {
  business: {
    unlockLabel: 'Deep Search',
    searchLabel: 'Standard search',
    lockedNote: 'runs on the Deep Search',
    lockedIn: 'included in the Deep Search',
    bannerFree: 'Standard search',
    bannerPaid: 'Deep Search — unlocked',
    unlockCta: 'Run the Deep Search',
  },
  baby: {
    unlockLabel: 'full naming report',
    searchLabel: 'Name search',
    lockedNote: 'part of the full naming report',
    lockedIn: 'included in the full naming report',
    bannerFree: 'Name search',
    bannerPaid: 'Full naming report — unlocked',
    unlockCta: 'Create the full naming report',
  },
}

/**
 * Green / amber / red, per language.
 *
 * "Clear" is deliberately quieter than "good": a name with nothing bad in
 * Telugu has not earned a green tick, it has simply passed. Only a real
 * recorded meaning gets the full green.
 */
const GRADE = {
  good:      { label: 'Good meaning',  bar: '#3f9e5a', ink: 'var(--ok-ink)', bg: 'rgba(63,158,90,.07)' },
  neutral:   { label: 'Neutral',       bar: '#c9902d', ink: 'var(--warn-ink)', bg: 'rgba(201,144,45,.07)' },
  clear:     { label: 'Nothing bad',   bar: 'var(--line)', ink: 'var(--ink-2)', bg: 'var(--bg-2)' },
  bad:       { label: 'Unfortunate',   bar: '#d1483a', ink: 'var(--no-ink)', bg: 'rgba(209,72,58,.08)' },
  unchecked: { label: 'Not checked',   bar: 'var(--line)', ink: 'var(--ink-3)', bg: 'transparent' },
}

/**
 * Score colour along the same red → amber → green ramp as the bar, so the
 * number and its position on the scale always agree.
 */
function scoreColour(score) {
  if (score >= 8.5) return '#3f9e5a'   // green
  if (score >= 7) return '#6a9e4a'     // green-leaning
  if (score >= 5.5) return '#c9902d'   // amber
  if (score >= 4) return '#d1732f'     // orange
  return '#d1483a'                     // red
}

/** One honest word for the number — no praise a 5/10 has not earned. */
function scoreWord(score) {
  if (score >= 9.5) return 'Effortless to say'
  if (score >= 8.5) return 'Easy to say'
  if (score >= 7) return 'Says fine, minor snags'
  if (score >= 5.5) return 'Takes a moment'
  if (score >= 4) return 'People will stumble'
  return 'Expect it to be shortened'
}

/** Wording + the live published costs for one mode. */
function pricingFor(mode, live) {
  const costs = live?.costs?.[mode] ?? DEFAULT_PRICING.costs[mode]
  const addons = live?.addons ?? DEFAULT_PRICING.addons ?? {}
  return {
    ...COPY[mode],
    searchCost: costs.standard,
    unlockCost: costs.deep,
    // Published by the server so a price change in the founder console reaches
    // the button without a rebuild.
    shortlistCost: addons.shortlist ?? 1000,
  }
}

/**
 * What actually went wrong, in words the customer can act on.
 *
 * Same incident: the API answered 400 in one millisecond and the screen said
 * "could not reach the scan engine", sending us hunting for a network fault
 * that did not exist. A request the server REFUSED and a server we could not
 * REACH are different failures and must never share a sentence.
 */
function scanErrorMessage(err) {
  if (err?.status === 429) return 'Too many searches from this connection. Wait a minute, then try again.'
  if (err?.status === 400) return 'The scan engine refused that request — this is a bug on our side, not something you typed wrongly. Nothing was charged.'
  if (err?.status >= 500) return 'The scan engine hit an error. Nothing was charged — please try again in a moment.'
  if (err?.status) return `The scan engine refused the request (error ${err.status}). Nothing was charged.`
  return 'Could not reach the scan engine. Check your connection and try again.'
}

const PILL = {
  // 'idle' = no search run yet. The tile explains what the check does; it
  // must never look like a result.
  idle:    { cls: 'info', label: '—' },
  ok:      { cls: 'ok', label: 'Clear' },
  no:      { cls: 'no', label: 'Conflict' },
  warn:    { cls: 'warn', label: 'Warning' },
  info:    { cls: 'info', label: 'Info' },
  pending: { cls: 'pending', label: 'Checking…' },
  // A check that FINISHED without an answer — the source blocked us. Saying
  // "Checking…" forever would be a lie. It used to read "Check yourself",
  // which sounds like we gave up; the Deep Search DOES answer this one, so the
  // pill now names the search that gets it (founder, 6 Aug 2026).
  manual:  { cls: 'warn', label: 'Deep Search' },
}

/**
 * Real session — the same shared account the nav and footer read.
 *
 * It used to keep its own private copy, so spending tokens on a search left
 * the nav showing the old balance until the next full page load. refresh()
 * now updates every component at once.
 */
/**
 * What each server refusal means, in the customer's terms.
 *
 * Every one of these says what happened and what to do. None of them says
 * "something went wrong", which is what the page used to say for all of them.
 */
const FIVE_ERRORS = {
  not_your_scan: 'This search belongs to a different account. Sign in with the account that ran it.',
  report_required: 'The certificate comes with the full naming report — buy that first.',
  insufficient_tokens: 'Not enough tokens for this. Top up and try again — nothing was charged.',
  feature_off: 'Certificates are switched off at the moment. Nothing was charged.',
  baby_scans_only: 'This certificate is for baby names only.',
  invalid_name: 'We could not read that name. Check the spelling and try again.',
  invalid_body: 'Something in the form was not accepted. Check the name and try again.',
  _offline: 'We could not reach the server. Check your connection — nothing was charged.',
  _default: (status) => `That did not work (error ${status}). Nothing was charged — try again in a moment.`,
}

const useSession = () => {
  const me = useMe()
  return {
    isLoggedIn: me !== null,
    tokens: me?.tokens?.balance ?? 0,
    phone: me?.phone ?? null,
    /*
     * The bearer token itself.
     *
     * Three call sites already read `session.token` to build an Authorization
     * header — and it was never on this object, so the header was silently
     * omitted every time. Nothing broke while no route checked ownership. The
     * moment one did, it answered 403 and the page reported "that did not work".
     */
    token: (() => { try { return localStorage.getItem('nd_token') } catch { return null } })(),
    refresh: refreshMe,
  }
}

/*
 * What the hero paragraph is allowed to claim.
 *
 * Each phrase names the checks it depends on. Switch every one of them off in
 * the console and the phrase disappears from the sentence — because the
 * paragraph was a hardcoded string, and on the day MCA21 and IP India were
 * switched off it went on promising both to every visitor on the homepage.
 *
 * Ordered as the sentence reads. The last phrase is set apart with an em dash,
 * so it is kept separate rather than joined with a comma.
 */
const HERO_CLAIMS = {
  business: [
    { text: 'Domains', keys: ['dom-com', 'dom-in', 'dom-org', 'dom-app'] },
    { text: 'social handles', keys: ['soc-ig', 'soc-x', 'soc-yt', 'soc-li', 'soc-fb'] },
    { text: 'the MCA registry', keys: ['leg-mca'] },
    { text: 'IP India trademark across all 45 classes', keys: ['leg-tm'] },
    { text: 'Play Store', keys: ['mp-play'] },
    { text: 'brand collisions', keys: ['br-wiki', 'br-cse'] },
    { text: 'linguistic landmines', keys: ['lin-land'] },
  ],
  baby: [
    { text: 'meaning across ten Indian scripts', keys: ['b-mean'] },
    { text: 'the seven-language landmine dictionary', keys: ['b-land'] },
    { text: 'pronunciation', keys: ['b-pron'] },
    { text: 'the birth star', keys: ['b-rashi'] },
    { text: 'the handles they will want later', keys: ['b-ig', 'b-yt', 'b-fb'] },
  ],
}

/** The numerology read is the tail of the sentence, so it is handled apart. */
const HERO_TAIL = { business: 'lin-num', baby: 'b-num' }

/**
 * Builds the sentence from whatever is still switched on.
 *
 * Returns null when nothing survives — better no sentence than a sentence
 * that promises nothing.
 */
function heroSentence(mode, disabledChecks) {
  const live = (HERO_CLAIMS[mode] ?? []).filter(c => c.keys.some(k => !disabledChecks.has(k)))
  if (live.length === 0) return null
  const parts = live.map(c => c.text)
  const numerology = !disabledChecks.has(HERO_TAIL[mode])
  // When the numerology tail is there it supplies the 'and', so the list must
  // not supply one too — otherwise the sentence ends '...and landmines — and a
  // Chaldean read'.
  const list = parts.length === 1 || numerology
    ? parts.join(', ')
    : `${parts.slice(0, -1).join(', ')}${parts.length > 2 ? ',' : ''} and ${parts[parts.length - 1]}`
  return numerology
    ? `${list} — and a Chaldean numerology read. All in one shot.`
    : `${list}. All in one shot.`
}
export default function Home() {
  useSeo({
    title: 'One name. Every check that matters.',
    description: 'India-first name verification. Check a startup or baby name across government registries, domains, social handles, marketplaces, brand collisions, 10 Indian scripts and Chaldean numerology — in one search.',
    path: '/',
    jsonLd: HOME_JSON_LD,
  })
  const [mode, setMode] = useState('business')
  // Seeded straight from ?q= (arriving from a name page) so we never have to
  // setState inside an effect just to fill the box.
  const [name, setName] = useState(() => new URLSearchParams(window.location.search).get('q')?.trim() ?? '')
  const [siblingName, setSiblingName] = useState('') // baby mode — optional harmony comparison
  const [industry, setIndustry] = useState('')
  const [birthDate, setBirthDate] = useState('')   // baby mode — real birth-star reading
  const [birthTime, setBirthTime] = useState('')       // business mode — optional, feeds the numerology fit
  const [scanned, setScanned] = useState(false) // land on the clean search page — the report only appears after a real scan
  const [activeTab, setActiveTab] = useState('All')
  const [isPaidView, setIsPaidView] = useState(false)
  // Which tier the scan on screen was bought at — the shortlist tier already
  // includes the one-page certificate.
  const [scanTier, setScanTier] = useState(TIER_STANDARD)
  const [live, setLive] = useState(null)      // null | 'scanning' | 'done'
  const [scanError, setScanError] = useState(null)
  const [results, setResults] = useState({})
  const [verdict, setVerdict] = useState(null)
  const [scanId, setScanId] = useState(null)
  // Baby mode, optional. Its only job is to make the five suggested
  // alternatives relevant — a boys list for a boy. Not stored on the scan.
  const [gender, setGender] = useState("")
  // One A4 sheet at the CSS reference 96dpi: 210mm = 793.7px. The frame is
  // capped here and centred, because the sheet inside it is a fixed physical
  // width — left to fill a wider tile the frame kept the sheet at natural size
  // in its top-left corner and padded the rest with dead space.
  const SHEET_PX = 794

  // The certificate sheet, fetched as bare HTML and shown in an iframe so its
  // stylesheet cannot collide with the report page (both use .name, .prose…).
  const [certHtml, setCertHtml] = useState(null)
  const [certState, setCertState] = useState("idle") // idle | loading | ready | error
  const certFrame = useRef(null)


  // The Shortlist of Five — the 1,000-token second certificate.
  const fiveFrame = useRef(null)
  const [fiveHtml, setFiveHtml] = useState(null)
  const [fiveState, setFiveState] = useState('idle') // idle | confirm | loading | ready | error
  const [fiveError, setFiveError] = useState(null)
  const [finalName, setFinalName] = useState('')
  const [firstAkshar, setFirstAkshar] = useState('')

  /**
   * Clear everything belonging to the previous scan's certificates.
   *
   * This is the fix for certificates coming out in the wrong name. startScan()
   * cleared the scan-RESULT state — results, verdict, scanId, the alternatives
   * — because that state existed when it was written. The certificate state
   * was added later and never joined the list, so seven fields survived a new
   * search: both rendered sheets, their flow state, the pandit's akshar, and
   * finalName.
   *
   * finalName was the damaging one. generateFive() reads
   * `finalName || displayName || name`, so once a name had been typed into
   * "Which name did you finally choose?" it won every certificate generated
   * afterwards — for every name searched thereafter, for the rest of the
   * session. Type one name into that box and every later certificate carries
   * it, whatever the customer actually searched.
   *
   * Kept as one named function rather than seven loose lines in startScan so
   * the next per-scan field added above has an obvious place to go, and so the
   * reason is recorded where the resetting happens.
   */
  const clearCertificates = () => {
    setFinalName('')
    setFirstAkshar('')
    setFiveHtml(null)
    setFiveState('idle')
    setFiveError(null)
    setCertHtml(null)
    setCertState('idle')
  }

  const [altState, setAltState] = useState(null)
  const [altData, setAltData] = useState(null)
  // null = not chosen yet · 'own' = customer supplies names · 'suggest' = we do
  const [altMode, setAltMode] = useState(null)
  const [ownNames, setOwnNames] = useState(['', '', '', '', ''])
  const [showSignIn, setShowSignIn] = useState(false)
  const socketRef = useRef(null)
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const session = useSession()

  /*
   * Fetch the certificate once the parent has the full report.
   *
   * ?embed=1 returns the bare sheet with no page chrome. It goes into an
   * iframe because the sheet styles .name, .prose and .facts — all class names
   * this page uses too, and one stylesheet would quietly eat the other.
   */
  useEffect(() => {
    if (mode !== 'baby' || !isPaidView || !scanId) return
    let alive = true
    const url = `${API_ORIGIN}/v1/scans/${scanId}/keepsake?embed=1`
      + (birthDate ? `&bornOn=${encodeURIComponent(birthDate)}` : '')
    fetch(url, { headers: session.token ? { Authorization: `Bearer ${session.token}` } : {} })
      .then(r => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then(html => { if (alive) { setCertHtml(html); setCertState('ready') } })
      .catch(() => { if (alive) setCertState('error') })
    return () => { alive = false }
  }, [mode, isPaidView, scanId, birthDate, session.token])

  /**
   * The certificate panel — a box in its own section, not a takeover.
   *
   * Printing targets the iframe rather than the page, so the customer gets the
   * sheet alone on A4 instead of the whole report with a certificate in the
   * middle of it. Every browser's print dialog offers "Save as PDF", which is
   * why no PDF renderer is installed on the server.
   */
  const printCertificate = () => {
    const w = certFrame.current?.contentWindow
    if (!w) return
    w.focus()
    w.print()
  }

  // Derived, not stored. Setting state at the top of an effect is the pattern
  // React now warns about — and there is nothing here a render cannot work out.
  const certLoading = mode === 'baby' && isPaidView && Boolean(scanId) && !certHtml && certState !== 'error'

  /*
   * The Shortlist of Five.
   *
   * The names go up in the request rather than being read back from the scan:
   * the chosen name may be one the parent has just typed, and the considered
   * names may be ones they edited a moment ago. Both are on screen here.
   */
  const generateFive = async () => {
    if (!scanId || fiveState === 'loading') return
    const chosen = (finalName || displayName || name).trim()
    if (!chosen) return
    setFiveState('loading')
    try {
      const res = await fetch(`${API_ORIGIN}/v1/scans/${scanId}/certificate-five?embed=1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}),
        },
        body: JSON.stringify({
          name: chosen,
          ...(gender ? { gender } : {}),
          ...(birthDate ? { birthDate } : {}),
          ...(birthTime ? { birthTime } : {}),
          ...(firstAkshar.trim() ? { firstAkshar: firstAkshar.trim() } : {}),
          considered: (altData?.suggestions ?? []).slice(0, 5).map(s => ({
            name: s.name,
            meaning: s.meaning ?? null,
            startsWith: s.startsWith ?? null,
          })),
        }),
      })
      if (!res.ok) {
        /*
         * The server names every failure it returns. Swallowing that and
         * printing "that did not work" cost a full debugging round on a 403
         * — so whatever it says is what the customer is told.
         */
        const why = await res.json().catch(() => ({}))
        setFiveError(FIVE_ERRORS[why.error] ?? FIVE_ERRORS._default(res.status))
        setFiveState('error')
        return
      }
      setFiveHtml(await res.text())
      setFiveState('ready')
      session.refresh()
    } catch {
      setFiveError(FIVE_ERRORS._offline)
      setFiveState('error')
    }
  }

  const printFive = () => {
    const w = fiveFrame.current?.contentWindow
    if (!w) return
    w.focus()
    w.print()
  }

  /*
   * Only offered once there are names to put on it. A certificate of five with
   * nothing to list is not a thing to sell.
   */
  const renderFive = () => {
    const names = altData?.suggestions ?? []
    /*
     * Always rendered, never null.
     *
     * It used to return null until the shortlist was finished, which meant a
     * paid product simply did not exist on the page until a parent completed
     * a step nobody had told them about. The founder reported it three times
     * as "not showing", and each time it was working exactly as written.
     * A thing you sell has to be visible before it is ready.
     */
    const ready = altState === 'done' && names.length > 0
    return (
      <div className="tile" style={{ gridColumn: '1 / -1', gap: 14 }} key="five">
        <div className="tile-head">
          <div className="tile-platform">
            <div className="tile-icon">✦</div>
            <span className="pname">The Shortlist of Five — a certificate of the names you weighed</span>
          </div>
          <span className={`pill ${fiveState === 'ready' ? 'ok' : fiveState === 'loading' ? 'pending' : 'info'}`}>
            {fiveState === 'ready' ? 'Ready' : fiveState === 'loading' ? 'Writing…' : `${price.shortlistCost} tokens`}
          </span>
        </div>

        {/* Nothing to make a certificate of yet. Say so, and say what to do. */}
        {!ready && fiveState !== 'ready' && (
          <>
            <div className="tile-detail">
              Two printed pages: the name you chose, what it means across India, and the four
              or five names you considered before settling on it.
            </div>
            <div className="tile-detail" style={{
              padding: '12px 14px', borderRadius: 10, background: 'var(--bg-2)',
              border: '1px dashed var(--line-2, var(--line))', color: 'var(--ink-2)',
            }}>
              First choose your five names in <b>“5 similar name suggestions”</b> above — your own,
              or ours. The certificate is made from them, so it needs them before it can be written.
            </div>
          </>
        )}

        {ready && (fiveState === 'idle' || fiveState === 'confirm') && (
          <>
            <div className="tile-detail">
              Two printed pages: the name you chose, what it means across India, and the
              {' '}{names.length} name{names.length === 1 ? '' : 's'} you considered before settling on it.
            </div>
            <label className="tile-detail" style={{ display: 'grid', gap: 6 }}>
              <span>Which name did you finally choose?</span>
              <input
                type="text"
                value={finalName}
                placeholder={displayName || name}
                onChange={e => setFinalName(e.target.value)}
                aria-label="The name you finally chose"
                style={{ padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 8, font: 'inherit' }}
              />
              <small style={{ color: 'var(--ink-3)' }}>
                Leave it as it is if you chose the name you searched for.
              </small>
            </label>
            <label className="tile-detail" style={{ display: 'grid', gap: 6 }}>
              <span>The first akshar, if a pandit gave you one</span>
              <input
                type="text"
                value={firstAkshar}
                placeholder="optional — e.g. bhe"
                onChange={e => setFirstAkshar(e.target.value)}
                aria-label="First akshar given by a pandit"
                style={{ padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 8, font: 'inherit', maxWidth: 220 }}
              />
            </label>
            <button type="button" className="nd-btn" onClick={generateFive} style={{ justifySelf: 'start' }}>
              Create the certificate — {price.shortlistCost ?? 1000} tokens
            </button>
          </>
        )}

        {fiveState === 'loading' && (
          <div className="tile-detail">Reading the name, writing the passage, setting the pages…</div>
        )}
        {fiveState === 'error' && (
          <>
            <div className="tile-detail" style={{ color: 'var(--no-ink)' }}>
              {fiveError ?? FIVE_ERRORS._default('unknown')}
            </div>
            <button type="button" className="nd-btn" style={{ justifySelf: 'start' }}
              onClick={() => { setFiveError(null); setFiveState('idle') }}>
              Try again
            </button>
          </>
        )}

        {fiveState === 'ready' && fiveHtml && (
          <>
            <div style={{
              borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line)',
              background: 'var(--surface)', boxShadow: 'var(--shadow-sm)',
              maxWidth: SHEET_PX, marginInline: 'auto', width: '100%',
            }}>
              <iframe
                ref={fiveFrame}
                title="Shortlist of Five"
                srcDoc={fiveHtml}
                style={{ width: '100%', aspectRatio: '210 / 604', border: 0, display: 'block' }}
              />
            </div>
            <div className="tile-foot" style={{ alignItems: 'center', maxWidth: SHEET_PX, marginInline: 'auto', width: '100%' }}>
              <span>Two A4 pages · print or save</span>
              <button onClick={printFive} className="nd-btn">Download as PDF</button>
            </div>
          </>
        )}
      </div>
    )
  }
  const renderCertificate = () => (
    <div className="tile" style={{ gridColumn: '1 / -1', gap: 14 }} key="certificate">
      <div className="tile-head">
        <div className="tile-platform">
          <div className="tile-icon">✎</div>
          <span className="pname">Your naming certificate</span>
        </div>
        <span className="pill ok">Included</span>
      </div>

      {certLoading && (
        <div className="tile-detail">Preparing the certificate…</div>
      )}
      {certState === 'error' && (
        <div className="tile-detail">
          The certificate could not be prepared just now. Nothing was charged —
          reload the page and it will try again.
        </div>
      )}
      {certState === 'ready' && certHtml && (
        <>
          <div style={{
            borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line)',
            background: 'var(--surface)', boxShadow: 'var(--shadow-sm)',
            maxWidth: SHEET_PX, marginInline: 'auto', width: '100%',
          }}>
            <iframe
              ref={certFrame}
              title="Naming certificate"
              srcDoc={certHtml}
              style={{ width: '100%', aspectRatio: '210 / 297', border: 0, display: 'block' }}
            />
          </div>
          <div className="tile-foot" style={{ alignItems: 'center', maxWidth: SHEET_PX, marginInline: 'auto', width: '100%' }}>
            <span>A4 · print or save</span>
            <button
              onClick={printCertificate}
              className="nd-btn"
              style={{ padding: '10px 18px', fontSize: 13, borderRadius: 10 }}
            >
              Download as PDF
            </button>
          </div>
        </>
      )}
    </div>
  )
  const [searchParams] = useSearchParams()

  /*
   * Checks the founder has switched off in the console.
   *
   * Fetched before any scan runs, so a switched-off check is left OUT of the
   * layout rather than appearing as a tile that never fills in. The console
   * still lists every check — this only governs what the public sees.
   *
   * The ids the server stores are its own tile ids. In baby mode the catalogue
   * renames some of them (soc-ig → b-ig), so they are mapped back before use.
   */
  const [disabledChecks, setDisabledChecks] = useState(() => new Set())
  useEffect(() => {
    let live = true
    fetch(`${API_ORIGIN}/v1/checks/disabled`)
      .then(r => (r.ok ? r.json() : { disabled: [] }))
      .then(d => {
        if (!live) return
        const keys = (d.disabled ?? []).map(id => BABY_ID_MAP[id] ?? id)
        setDisabledChecks(new Set(keys))
      })
      .catch(() => { /* a check-list we cannot fetch means show everything */ })
    return () => { live = false }
  }, [])

  const catalogue = CATALOGUE[mode].filter(c => !disabledChecks.has(c.key))
  // The homepage promise, assembled from the checks that are actually running.
  const heroSub = heroSentence(mode, disabledChecks)
  const sections = SECTIONS[mode]

  /*
   * Section numbers, computed rather than written down.
   *
   * They used to be hardcoded ('01'…'08'), so switching a check off left a hole
   * in the sequence — the page would run 01, 03, 04 and look broken. The number
   * now comes from position among the sections that actually have something to
   * show, so removing Legal turns Domains into 01 (founder, 6 Aug 2026).
   *
   * Computed over ALL populated sections, not the tab-filtered ones: picking a
   * single tab should not renumber that section to 01, because the number is
   * part of how the customer refers to it.
   */
  const sectionNumbers = (() => {
    const populated = sections.filter(sec =>
      CATALOGUE[mode].some(c =>
        c.family === sec.family &&
        !disabledChecks.has(c.key) &&
        !(sec.skipKeys ?? []).includes(c.key),
      ),
    )
    const order = []
    for (const sec of populated) {
      order.push(sec.family)
      // The numerology showpiece is its own numbered block, sitting after the
      // linguistic section in business mode.
      if (mode === 'business' && sec.family === 'Linguistic') order.push('__numerology__')
    }
    return new Map(order.map((fam, i) => [fam, String(i + 1).padStart(2, '0')]))
  })()
  const families = [...new Set(catalogue.map(c => c.family))]
  const freeCount = catalogue.filter(c => c.tier === 'free').length
  const paidCount = catalogue.filter(c => c.tier === 'paid').length
  const { pricing: livePricing } = usePricing()
  const price = pricingFor(mode, livePricing)
  const displayName = name.trim()

  // Close the stream when leaving the page
  useEffect(() => () => socketRef.current?.disconnect(), [])

  // ⌘K / Ctrl-K focuses the search — a prototype detail worth keeping
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // `overrideName` is used when the name is not yet in state — e.g. arriving
  // from a name page, where setName() has not flushed yet.
  const startScan = async (tier, overrideName) => {
    setScanTier(tier)
    const scanName = (overrideName ?? name).trim()
    socketRef.current?.disconnect()
    setResults({})
    setVerdict(null)
    setScanId(null)
    setAltState(null)
    setAltData(null)
    setAltMode(null)
    setOwnNames(["", "", "", "", ""])
    clearCertificates()
    setScanned(true)

    const headers = { 'Content-Type': 'application/json' }
    const token = localStorage.getItem('nd_token')
    if (token) headers.Authorization = `Bearer ${token}`

    const res = await fetch(`${API_ORIGIN}/v1/scan`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: scanName,
        mode,
        tier,
        ...(mode === 'baby' && siblingName.trim() ? { siblingName: siblingName.trim() } : {}),
        ...(mode === 'business' && industry ? { industry } : {}),
        ...(mode === 'baby' && gender ? { gender } : {}),
        ...(mode === 'baby' && birthDate ? { birthDate } : {}),
        ...(mode === 'baby' && birthDate && birthTime ? { birthTime } : {}),
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw Object.assign(new Error('scan_rejected'), { code: err.error, status: res.status })
    }
    const { scan_id } = await res.json()
    setScanId(scan_id)
    setLive('scanning')

    const socket = io(API_ORIGIN, {
      path: '/v1/stream',
      query: { scanId: scan_id },
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket
    socket.on('result_event', (tile) => {
      const key = mode === 'baby' ? (BABY_ID_MAP[tile.tileId] ?? tile.tileId) : tile.tileId
      setResults(prev => ({ ...prev, [key]: tile }))
    })
    socket.on('verdict_complete', (v) => {
      setVerdict(v)
      setLive('done')
      socket.disconnect()
    })
    socket.on('scan_failed', () => {
      setScanned(false)
      setLive(null)
      setScanError('The scan hit a problem mid-way. Please try again.')
      socket.disconnect()
    })
  }

  // Arriving from a name page (/n/aarav.html → /?q=Aarav): the box is already
  // seeded above, so just run the scan. Declared AFTER startScan so there is
  // no access-before-declaration.
  const autoRan = useRef(false)
  useEffect(() => {
    const q = searchParams.get('q')?.trim()
    if (!q || autoRan.current) return
    autoRan.current = true
    let cancelled = false
    startScan(TIER_STANDARD, q)
      // This search spends tokens too — without the refresh the nav keeps
      // showing the balance from before the page loaded.
      .then(() => { if (!cancelled) refreshMe() })
      .catch(err => {
        // NOT guarded by `cancelled`. React's dev StrictMode mounts, unmounts
        // and remounts immediately, so the cleanup sets cancelled=true while
        // the first (and only, thanks to autoRan) request is still in flight.
        // Guarding here swallowed every failure on the /?q= path — a 401
        // produced a page of empty tiles and no explanation at all.
        if (err?.status === 401) { setShowSignIn(true); setScanned(false); setLive(null); return }
        setScanned(false)
        setLive(null)
        setScanError(scanErrorMessage(err))
      })
    return () => { cancelled = true }
    // Intentionally keyed on the query only — startScan is recreated every
    // render and must not retrigger the scan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleSearch = async (e) => {
    e.preventDefault()
    // Every search costs tokens, so every search needs an account. Visitors
    // browse the whole page freely; the gate appears only when they act.
    if (!session.isLoggedIn) { setShowSignIn(true); return }
    // Mode-aware: a baby search costs 25, not 50 — the wrong constant here
    // sends a parent with 30 tokens to the pricing page for no reason.
    if (session.tokens < price.searchCost) { navigate('/pricing?reason=out-of-tokens'); return }
    if (!name.trim()) {
      setScanError('Type a name first — then press Check.')
      inputRef.current?.focus()
      return
    }
    setIsPaidView(false)
    setScanError(null)
    try {
      await startScan(TIER_STANDARD)
      session.refresh() // the search just spent tokens — keep the nav honest
    } catch (err) {
      if (err.status === 401) { setShowSignIn(true); return }
      if (err.status === 402) { navigate('/pricing?reason=out-of-tokens'); return }
      // No fake results, ever — return to the landing state with an honest error.
      setScanned(false)
      setLive(null)
      setScanError(scanErrorMessage(err))
    }
  }

  /**
   * `names` present → verify the customer's own shortlist (any count, 1–5).
   * `names` absent  → we generate and verify five.
   */
  const handleAlternatives = async (names) => {
    if (!scanId || altState === 'loading') return
    setAltState('loading')
    try {
      const res = await fetch(`${API_ORIGIN}/v1/scans/${scanId}/alternatives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Gender and the sibling's name only exist on this page: POST /v1/scan
        // accepts neither, so the scan record cannot supply them. Sent here so
        // the suggestions can use them; neither is required.
        body: JSON.stringify({
          ...(names?.length ? { names } : {}),
          ...(mode === 'baby' && gender ? { gender } : {}),
          ...(mode === 'baby' && siblingName.trim() ? { siblingName: siblingName.trim() } : {}),
        }),
      })
      if (!res.ok) throw new Error('alt_failed')
      setAltData(await res.json())
      setAltState('done')
    } catch {
      setAltState('error')
    }
  }

  /*
   * The Shortlist of Five, from the strip above the paywall.
   *
   * This was a <Link> straight to the pricing page. It sent everyone there,
   * including a parent holding twenty-four thousand tokens, because nothing
   * in it ever read a balance. What the button is actually promising is two
   * purchases — the naming report, which produces the five names, and then
   * the certificate itself — so it prices both, checks once, and only routes
   * to pricing when the money genuinely is not there.
   */
  const handleShortlist = async () => {
    if (!session.isLoggedIn) { setShowSignIn(true); return }

    /*
     * One price, not two. The shortlist is its own TIER — 1,000 tokens that
     * include the naming report rather than sitting on top of it. Founder's
     * decision, 22 Aug 2026, when the button briefly read 1,300.
     */
    const needed = isPaidView ? 0 : price.shortlistCost
    if (needed && session.tokens < needed) {
      navigate(`/pricing?audience=parent&reason=out-of-tokens&need=${needed}`)
      return
    }

    if (!isPaidView) {
      try {
        await startScan(TIER_SHORTLIST)
        setIsPaidView(true)
        session.refresh()
      } catch (err) {
        if (err.status === 401) { setShowSignIn(true); return }
        if (err.status === 402) { navigate('/pricing?audience=parent&reason=out-of-tokens'); return }
        setScanned(false)
        setLive(null)
        setScanError(scanErrorMessage(err))
        return
      }
    }

    /*
     * The certificate is made from five names, and the five names come from
     * the shortlist tile. Rather than charging here and asking for them
     * afterwards, take them to it — the tile asks the one question that has
     * to be answered first: their own names, or ours.
     */
    setTimeout(() => {
      document.querySelector('[data-shortlist]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 400)
  }
  const handleUnlock = async () => {
    if (!session.isLoggedIn) { setShowSignIn(true); return }
    if (session.tokens < price.unlockCost) { navigate(mode === 'business' ? '/pricing' : '/pricing?audience=parent'); return }
    try {
      await startScan(TIER_DEEP)
      setIsPaidView(true)
      session.refresh()
    } catch (err) {
      if (err.status === 401) { navigate('/sign-in?intent=deep-scan'); return }
      if (err.status === 402) { navigate('/pricing'); return }
      setScanned(false)
      setLive(null)
      setScanError(scanErrorMessage(err))
    }
  }

  const switchMode = (m) => {
    setMode(m)
    setScanned(false) // back to the clean search page — a report needs a real scan
    setActiveTab('All')
    setIsPaidView(false)
    setLive(null)
    setScanError(null)
    setResults({})
    setVerdict(null)
  }

  /** Resolve what a tile should display — real results only, never demo data. */
  const tileState = (check) => {
    const liveResult = results[check.key]
    if (liveResult) return { status: liveResult.status, detail: liveResult.summary, raw: liveResult.detail, latencyMs: liveResult.latencyMs, actionUrl: liveResult.actionUrl, source: liveResult.source }
    // Before any search runs: describe what the check does. That is real
    // information about the product — never a pretend result.
    if (!live) return { status: 'idle', detail: check.what ?? '' }
    return { status: 'pending', detail: live === 'done' ? 'Source not yet connected' : 'Checking…' }
  }

  // ── Summary strip (computed from live tiles once scanning) ──────
  const visible = catalogue.filter(c => c.tier === 'free' || isPaidView)
  // The strip counts CHECKS. The Bonus family — the keepsake PDF, the verified
  // alternatives — are things we produce for you, not questions we answer about
  // the name, and no scanner ever returns a result for them. Counting them made
  // the denominator two larger than the number of things actually checked.
  const states = visible
    .filter(c => c.family !== 'Bonus')
    .map(c => ({ check: c, s: tileState(c) }))
  const nClear = states.filter(x => x.s.status === 'ok').length
  const nConflict = states.filter(x => x.s.status === 'no').length
  const nWarn = states.filter(x => x.s.status === 'warn').length
  // 'info' is not a failure to answer. The birth star, the nicknames and the
  // sibling harmony all reply — they simply reply with a reading rather than a
  // pass or a fail. Lumping them in with genuinely unanswered checks told the
  // parent we could not check three things we had in fact just checked.
  const nInfo = states.filter(x => x.s.status === 'info').length
  const nUnknown = states.length - nClear - nConflict - nWarn - nInfo

  /*
   * What the headline counts as "clear".
   *
   * A reading is not a failure. The birth star, the short forms and the sibling
   * harmony all answered — they answered with a reading rather than a pass, and
   * there is nothing in any of them for a parent to go and fix. Counting them
   * apart from the passes meant a name with three conflicts out of ten reported
   * "4 / 10 clear", which reads as six problems. It is seven.
   */
  const nSettled = nClear + nInfo

  /*
   * ...and what it counts them OUT OF.
   *
   * Not every check comes back. A handle probe can hit a bot-wall, a source can
   * be down — those tiles say so on their face, and they are evidence neither
   * for the name nor against it. Once the scan is finished the fraction is
   * taken over the checks that actually answered, and the ones that did not are
   * named in the line underneath rather than silently counted as failures.
   *
   * While the scan is still running the denominator stays at the full total, so
   * the bar fills towards a fixed target instead of shifting under itself.
   */
  const nAnswered = states.length - nUnknown
  const denom = live === 'done' && nAnswered > 0 ? nAnswered : states.length
  const pct = (n) => denom ? Math.round((n / denom) * 100) : 0

  /**
   * The line under "4 / 11 clear".
   *
   * Every number here is counted over `states` — the same tiles the headline
   * counts — so the parts always add up to the total. It used to read
   * `verdict.conflict`, which the engine computes across every check it ran,
   * including ones the current mode never puts on screen. That is how
   * "4 / 11 clear" could sit directly above "4 conflicts to resolve" and leave
   * three tiles silently unaccounted for.
   *
   * The score stays as the engine reported it, but is shown as an approximate
   * percentage: it is a rounded figure, damped by how many sources answered,
   * so a precise-looking "25/100" claimed an accuracy it does not have.
   */
  const summaryDetail = () => {
    const parts = []
    if (nConflict) parts.push(`${nConflict} conflict${nConflict === 1 ? '' : 's'} to resolve`)
    if (nWarn) parts.push(`${nWarn} worth a look`)
    if (!nConflict && !nWarn) parts.push('Everything we could check came back clear')
    // Named, never dropped. These sit outside the fraction now, so this line is
    // the only place the customer can learn they exist.
    if (nUnknown) parts.push(`${nUnknown} we could not check on this search`)
    if (nInfo) parts.push(`${nInfo} of these ${nInfo === 1 ? 'is a reading' : 'are readings'} rather than a pass`)
    if (verdict) parts.push(`verdict ≈ ${verdict.score}%`)
    return parts.join(' · ')
  }

  const legalStates = states.filter(x => x.check.family === 'Legal')
  const legalConflicts = legalStates.filter(x => x.s.status === 'no').length
  const legalRisk = !isPaidView ? 'Unknown' : legalConflicts > 0 ? 'High' : 'Low'
  /*
   * Are the government-registry checks switched on at all?
   *
   * When the founder switches them off, the tiles disappear — but the copy that
   * PROMISES them used to stay, so the page went on advertising MCA21 and the
   * trademark search while running neither. Naming a check we are not
   * performing is the misleading-claim problem in miniature, so every mention
   * is gated on this.
   */
  const hasLegalChecks = catalogue.some(c => c.family === 'Legal')
  const brandWarn = states.filter(x => x.check.family === 'Brand' && (x.s.status === 'no' || x.s.status === 'warn')).length
  const numDetail = results[mode === 'baby' ? 'b-num' : 'lin-num']?.detail ?? null
  // Baby-mode summary cards
  const rashiDetail = results['b-rashi']?.detail?.rashi ? results['b-rashi'].detail : null
  const landmineStatus = results['b-land']?.status ?? null

  const tabList = ['All', ...families]
  const famCount = (fam) => catalogue.filter(c => c.family === fam).length

  // ── Tile renderers ──────────────────────────────────────────────
  const renderTile = (check) => {
    const isLocked = check.tier === 'paid' && !isPaidView

    // PAID CHECK, NOT YET UNLOCKED
    // The tile is fully readable — what the check is, what it does, which
    // source it uses. Only the RESULT is withheld. Nothing is blurred, because
    // a buyer should be able to see exactly what they are paying for.
    if (isLocked) {
      return (
        <div key={check.key} className="tile locked" onClick={handleUnlock} role="button" tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleUnlock() } }}
          aria-label={`${check.label} — ${price.lockedIn}, ${price.unlockCost} tokens`}>
          <div className="tile-head">
            <div className="tile-platform"><div className="tile-icon">{check.icon}</div><span className="pname">{check.label}</span></div>
            <span className="pill locked-pill">🔒 {price.unlockCost}</span>
          </div>
          <div className="tile-detail">{check.what}</div>
          <div className="locked-result">
            <span className="lr-label">Result</span>
            <span className="lr-mask" aria-hidden="true">▨▨▨▨▨▨▨▨</span>
            <span className="lr-note">{price.lockedNote}</span>
          </div>
          <div className="tile-foot">
            <span>{check.source}</span>
            <a className="lr-cta">Unlock — {price.unlockCost} tokens →</a>
          </div>
        </div>
      )
    }

    /*
     * Baby mode's shortlist of five.
     *
     * Same two doors as the business tile — bring your own, or let us suggest —
     * but everything behind them differs. The suggestions come from the birth
     * star's syllables, the numerology and the child's gender, and each one is
     * checked for meaning and against the landmine dictionary rather than for a
     * free domain. A parent is choosing a name, not a namespace.
     */
    if (isPaidView && check.key === 'b-alt' && scanId) {
      const filled = ownNames.filter(n => n.trim()).length
      return (
        <div key={check.key} className="tile" data-shortlist style={{ gridColumn: '1 / -1' }}>
          <div className="tile-head">
            <div className="tile-platform"><div className="tile-icon">{check.icon}</div><span className="pname">{check.label}</span></div>
            <span className={`pill ${altState === 'done' ? 'ok' : altState === 'loading' ? 'pending' : 'info'}`}>
              {altState === 'done' ? 'Ready' : altState === 'loading' ? 'Working…' : 'Your choice'}
            </span>
          </div>

          {altState === null && altMode === null && (
            <>
              <div className="tile-detail">
                Do you already have five names in mind, or would you like us to suggest five?
                {birthDate
                  ? ' Ours follow the syllables your baby\u2019s birth star favours, alongside the numerology.'
                  : ' Add a date of birth above and ours will follow the syllables the birth star favours.'}
              </div>
              <div className="two-up">
                <button type="button" className="nd-btn" onClick={() => setAltMode('own')}>I already have names</button>
                <button type="button" className="nd-btn" onClick={() => { setAltMode('suggest'); handleAlternatives() }}>Suggest five for me</button>
              </div>
            </>
          )}

          {altState === null && altMode === 'own' && (
            <>
              <div className="tile-detail">
                Enter up to five. Fill only as many as you have — we check exactly what you give us,
                and your certificate shows those names, in your order.
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {ownNames.map((v, i) => (
                  <input
                    key={i}
                    type="text"
                    value={v}
                    placeholder={`Name ${i + 1}`}
                    onChange={e => { const next = [...ownNames]; next[i] = e.target.value; setOwnNames(next) }}
                    aria-label={`Your shortlisted name ${i + 1}`}
                    style={{ padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 8, font: 'inherit' }}
                  />
                ))}
                <button
                  type="button"
                  className="nd-btn"
                  onClick={() => handleAlternatives(ownNames.filter(n => n.trim()))}
                  disabled={filled === 0}
                >
                  Check {filled || ''} {filled === 1 ? 'name' : 'names'}
                </button>
                {/* Choosing "I already have names" used to be a one-way door:
                    nothing cleared altMode, so a parent who picked it could not
                    get back to the other option without reloading and paying
                    for the search again. */}
                <button
                  type="button"
                  onClick={() => setAltMode(null)}
                  style={{
                    background: 'none', border: 0, padding: '4px 0', font: 'inherit',
                    fontSize: 13, color: 'var(--ink-3)', cursor: 'pointer',
                    textDecoration: 'underline', justifySelf: 'start',
                  }}
                >
                  ← Actually, suggest five for me
                </button>
              </div>
            </>
          )}

          {altState === 'loading' && (
            <div className="tile-detail">Reading each name for meaning, and against the landmine dictionary…</div>
          )}
          {altState === 'error' && (
            <div className="tile-detail" style={{ color: 'var(--no-ink)' }}>
              That did not work just now. Nothing was charged — try again in a moment.
            </div>
          )}

          {altState === 'done' && altData && (
            <>
              <div className="tile-detail" style={{ fontStyle: 'italic' }}>
                {altData.source === 'yours'
                  ? 'Your names, in your order — we have not re-ranked them.'
                  : 'Five in the same spirit. Anything that means something unfortunate in the seven languages never reaches this list.'}
              </div>
              <div className="alt-list">
                {(altData.suggestions ?? []).map(s => (
                  <div key={s.name} className="alt-row" style={{ alignItems: 'flex-start' }}>
                    <span className="an">
                      {s.name}
                      {s.startsWith && (
                        <small style={{ marginLeft: 8, color: 'var(--accent)', fontWeight: 500 }}>
                          ★ starts with “{s.startsWith}”
                        </small>
                      )}
                      <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 2, fontWeight: 400 }}>
                        {s.meaning || 'No meaning we could confirm'}
                      </div>
                    </span>
                    <span className="as ok" style={{ whiteSpace: 'nowrap' }}>
                      {s.saidAs}{s.planet ? ` · ${s.planet.glyph} ${s.root}` : ` · ${s.root}`}
                    </span>
                  </div>
                ))}
              </div>
              {(altData.suggestions ?? []).length === 0 && (
                <div className="tile-detail">
                  We could not put five together just now. Nothing was charged — try again, or enter your own.
                </div>
              )}
              {altData.rejected?.length > 0 && (
                <div className="tile-detail" style={{ color: 'var(--no-ink)' }}>
                  Left out: {altData.rejected.map(r => `${r.name} — ${r.reason}`).join(' · ')}
                </div>
              )}
              <div className="tile-detail" style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
                Checked for {altData.checkedDepth}.
              </div>
              {/* Re-running costs nothing — the five names are included in the
                  naming report already paid for — so there is no reason to trap
                  someone with a list they did not want. */}
              <button
                type="button"
                onClick={() => { setAltState(null); setAltMode(null); setAltData(null) }}
                style={{
                  background: 'none', border: 0, padding: '4px 0', font: 'inherit',
                  fontSize: 13, color: 'var(--ink-3)', cursor: 'pointer',
                  textDecoration: 'underline', justifySelf: 'start',
                }}
              >
                ← Start these five again
              </button>
            </>
          )}

          <div className="tile-foot">
            <span>{check.source}</span>
            {altState === 'done' ? <span>included with your naming report</span> : <span>included</span>}
          </div>
        </div>
      )
    }
    // Bonus tiles get live actions once the Deep Search is unlocked
    if (isPaidView && check.key === 'alt-gen' && scanId) {
      return (
        <div key={check.key} className="tile">
          <div className="tile-head">
            <div className="tile-platform"><div className="tile-icon">{check.icon}</div><span className="pname">{check.label}</span></div>
            <span className={`pill ${altState === 'done' ? 'ok' : altState === 'loading' ? 'pending' : 'info'}`}>
              {altState === 'done' ? 'Verified' : altState === 'loading' ? 'Working…' : 'On demand'}
            </span>
          </div>
          {/* The customer chooses: their own shortlist, or ours. */}
          {altState === null && altMode === null && (
            <>
              <div className="tile-detail">Have you already shortlisted names, or would you like us to suggest some? Either way, every name is re-checked against real registries before you see it.</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => setAltMode('own')} className="sb-btn ghost">I have my own names</button>
                <button onClick={() => { setAltMode('suggest'); handleAlternatives() }} className="sb-btn">Suggest 5 for me</button>
              </div>
            </>
          )}

          {altState === null && altMode === 'own' && (
            <>
              <div className="tile-detail">
                Enter up to five. Fill only as many as you have — we check exactly what you give us, and your certificate shows those names, in your order.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {ownNames.map((v, i) => (
                  <input
                    key={i}
                    type="text"
                    value={v}
                    maxLength={64}
                    onChange={e => { const next = [...ownNames]; next[i] = e.target.value; setOwnNames(next) }}
                    placeholder={`Name ${i + 1}${i > 1 ? ' (optional)' : ''}`}
                    aria-label={`Your shortlisted name ${i + 1}`}
                    style={{ padding: '9px 13px', fontSize: 14, border: '1px solid var(--hairline)', borderRadius: 9, background: 'var(--surface)', color: 'var(--ink)', outline: 'none' }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleAlternatives(ownNames.filter(n => n.trim()))}
                  className="sb-btn"
                  disabled={ownNames.every(n => !n.trim())}
                >
                  Check {ownNames.filter(n => n.trim()).length || ''} {ownNames.filter(n => n.trim()).length === 1 ? 'name' : 'names'}
                </button>
                <button onClick={() => setAltMode(null)} className="sb-btn ghost">Back</button>
              </div>
            </>
          )}

          {altState === 'loading' && (
            <div className="tile-detail">Checking each name against real registries… ~20 seconds</div>
          )}
          {altState === 'error' && (
            <div className="tile-detail" style={{ color: 'var(--no-ink)' }}>Could not generate right now — try again.</div>
          )}
          {altState === 'done' && altData && (
            <>
              {altData.source === 'your-own' && (
                <div className="tile-detail" style={{ fontStyle: 'italic' }}>
                  Your {altData.alternatives.length} name{altData.alternatives.length === 1 ? '' : 's'}, in your order — we have not re-ranked them.
                </div>
              )}
              <div className="alt-list">
                {altData.alternatives.map(alt => (
                  <div key={alt.name} className="alt-row">
                    <span className="an">{alt.name}</span>
                    <span className={`as ${alt.conflicts === 0 ? 'ok' : 'warn'}`}>
                      {alt.conflicts === 0 ? `✓ ${alt.clear} checks clear` : `${alt.conflicts} conflict${alt.conflicts === 1 ? '' : 's'}`}
                    </span>
                  </div>
                ))}
              </div>
              {altData.rejected?.length > 0 && (
                <div className="tile-detail" style={{ color: 'var(--no-ink)' }}>
                  Could not check: {altData.rejected.map(r => `${r.input} (${r.reason})`).join(' · ')}
                </div>
              )}
            </>
          )}
          <div className="tile-foot"><span>{check.source}</span><span>{price.lockedIn}</span></div>
        </div>
      )
    }

    const s = tileState(check)
    // Once the scan is done, a still-pending tile is not "checking" — the
    // source refused us. Label it for what it is.
    const unanswered = s.status === 'pending' && live === 'done'
    const pill = unanswered ? PILL.manual : (PILL[s.status] ?? PILL.pending)
    const statusCls = s.status === 'ok' ? ' ok' : s.status === 'no' ? ' no' : s.status === 'warn' ? ' warn' : ''
    // A light travels this tile's border only while ITS check is genuinely
    // still running — not once the scan has finished and the source simply
    // never answered. A spinner that never stops is a lie.
    const scanningCls = s.status === 'pending' && live === 'scanning' ? ' is-scanning' : ''

    // Instagram/Facebook block robots — when our check can't get a straight
    // answer, hand the user a one-click way to see for themselves (free,
    // honest, and faster than any scraper).
    // The meaning tile carries the name written in every Indian script —
    // the headline of this check, so show them all rather than a preview.
    const scripts = (check.key === 'lin-mean' || check.key === 'b-mean')
      ? (s.raw?.transliterations ?? [])
      : []

    // The landmine and pronunciation tiles used to render a single sentence
    // and then stretch to match the meaning tile's height — two large empty
    // boxes. Both checks already return the working; it was simply never
    // shown. Showing it also makes the verdict arguable instead of oracular.
    const landmineLangs = (check.key === 'lin-land' || check.key === 'b-land')
      ? (s.raw?.languages ?? [])
      : []
    const breakdown = (check.key === 'lin-land' || check.key === 'b-land')
      ? (s.raw?.breakdown ?? null)
      : null
    const aiReadings = (check.key === 'lin-land' || check.key === 'b-land')
      ? (s.raw?.aiReadings ?? [])
      : []
    const pronFactors = (check.key === 'lin-pron' || check.key === 'b-pron')
      ? (s.raw?.factors ?? [])
      : []
    const pronSplit = (check.key === 'lin-pron' || check.key === 'b-pron')
      ? (s.raw?.pretty ?? null)
      : null
    const pronScore = (check.key === 'lin-pron' || check.key === 'b-pron')
      ? (typeof s.raw?.score === 'number' ? s.raw.score : null)
      : null

    const handle = displayName.toLowerCase().replace(/[^a-z0-9]/g, '')
    const manualCheck =
      live && s.status === 'pending' && check.key === 'soc-ig' ? { url: `https://www.instagram.com/${handle}/`, label: 'Check on Instagram →' }
      : live && s.status === 'pending' && check.key === 'soc-fb' ? { url: `https://www.facebook.com/${handle}`, label: 'Check on Facebook →' }
      : null

    return (
      <div key={check.key} className={`tile${statusCls}${scanningCls}`}>
        <div className="tile-head">
          <div className="tile-platform"><div className="tile-icon">{check.icon}</div><span className="pname">{check.label}</span></div>
          <span className={`pill ${pill.cls}`}>{pill.label}</span>
        </div>

        {/* Pronunciation score, directly under the heading. The bar is the
            full red→amber→green scale with a marker at this name's position,
            so the number is read against the range rather than in isolation. */}
        {pronScore !== null && (
          <div style={{ marginTop: 2 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: 34, lineHeight: 1, color: scoreColour(pronScore) }}>
                {pronScore}
              </span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--ink-3)' }}>/ 10</span>
              <span style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--ink-2)' }}>{scoreWord(pronScore)}</span>
            </div>
            <div style={{
              position: 'relative', height: 8, borderRadius: 999, marginTop: 8,
              background: 'linear-gradient(90deg, #d1483a 0%, #e8a33d 50%, #3f9e5a 100%)',
            }}>
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute', top: -3, left: `${(pronScore / 10) * 100}%`,
                  transform: 'translateX(-50%)', width: 4, height: 14, borderRadius: 2,
                  background: 'var(--ink)', border: '2px solid var(--surface)', boxSizing: 'content-box',
                }}
              />
            </div>
          </div>
        )}

        <div className="tile-detail">
          {/* This used to open with "the platform blocks automated checks",
              which reads as a dead end. It is not one — the Deep Search gets
              a real answer here. Lead with that, then give the free-search
              customer the one-tap way to see it now. */}
          {manualCheck
            ? <>
                <b>The Deep Search checks this one.</b>{' '}
                {'Meta shows our server a login wall, so a free search cannot tell taken from free — '}
                {'and we will not guess. Tap below to look yourself: if the page opens, @'}{handle}
                {' is taken; if it says "page not found", it’s free.'}
              </>
            : s.detail}
        </div>
        {scripts.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))', gap: 8, marginTop: 4 }}>
            {scripts.map(sc => (
              <div key={sc.code} style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{sc.name}</div>
                <div style={{ fontSize: 17, lineHeight: 1.5, marginTop: 1 }}>{sc.text}</div>
              </div>
            ))}
          </div>
        )}

        {/* The name, broken into the smaller names it is built from.
            Divyom is Divya + Om. Every part here was verified on its own
            before any of it was shown — the splitter proposes, the meaning
            check decides, and fewer than two survivors means nothing is
            shown at all. */}
        {breakdown?.parts?.length >= 2 && (
          <div style={{
            marginTop: 6, padding: '12px 14px', borderRadius: 10,
            background: 'var(--bg-2)', border: '1px solid var(--line)',
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, letterSpacing: '.08em',
              textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8,
            }}>Built from</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {breakdown.parts.map((p, i) => (
                <span key={p.text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {i > 0 && <span style={{ color: 'var(--accent)', fontSize: 18, fontWeight: 300 }}>+</span>}
                  <span>
                    <span style={{ fontFamily: "'Fraunces', serif", fontSize: 19, lineHeight: 1.1 }}>{p.text}</span>
                    <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ink-2)', marginTop: 2 }}>{p.meaning}</span>
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
        {/* Landmine — one row per language, saying what was found and why.
            A language with no dictionary yet says so; it is never counted as
            clear just to fill the row. */}
        {landmineLangs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
            {landmineLangs.map(l => {
              const g = GRADE[l.grade] ?? GRADE.unchecked
              return (
                <div key={l.language} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '8px 10px', paddingLeft: 10, borderRadius: 8,
                  background: g.bg, borderLeft: `3px solid ${g.bar}`,
                  opacity: l.grade === 'unchecked' ? 0.6 : 1,
                }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, letterSpacing: '.06em',
                    textTransform: 'uppercase', color: 'var(--ink-3)', minWidth: 62, paddingTop: 2,
                  }}>{l.language}</span>
                  <span style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--ink-2)', flex: 1 }}>
                    <b style={{ color: g.ink }}>{g.label}</b>{' — '}{l.verdict}
                    {/* Where the meaning came from. A reading nobody has checked
                        must never look like one we verified by hand. */}
                    {l.meaningSource === 'ai' && (
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                        letterSpacing: '.06em', textTransform: 'uppercase',
                        color: 'var(--ink-3)', border: '1px dashed var(--line)',
                        borderRadius: 4, padding: '1px 5px', marginLeft: 7, whiteSpace: 'nowrap',
                      }}>AI reading</span>
                    )}
                    {!l.meaning && l.grade === 'clear' && (
                      <span style={{ color: 'var(--ink-3)' }}> ({l.patterns} words checked)</span>
                    )}
                  </span>
                </div>
              )
            })}

            {/* A machine's reading, under its own heading and in its own
                visual language. The rows above are our verified dictionary;
                these are not, and the customer must be able to tell. */}
            {aiReadings.length > 0 && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--line)' }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, letterSpacing: '.08em',
                  textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6,
                }}>
                  Four more languages — AI reading, no dictionary of ours yet
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {aiReadings.map(r => {
                    const g = GRADE[r.sentiment] ?? GRADE.neutral
                    return (
                      <div key={r.language} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 10px',
                        borderRadius: 8, background: 'transparent',
                        border: `1px dashed ${r.sentiment === 'bad' ? g.bar : 'var(--line)'}`,
                      }}>
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, letterSpacing: '.06em',
                          textTransform: 'uppercase', color: 'var(--ink-3)', minWidth: 62, paddingTop: 2,
                        }}>{r.language}</span>
                        <span style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--ink-2)', flex: 1 }}>
                          <b style={{ color: g.ink }}>{g.label}</b>{' — '}{r.meaning}
                        </span>
                      </div>
                    )
                  })}
                </div>
                {aiReadings.length > 0 && (
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.45 }}>
                    Worth a second opinion from someone who speaks the language — we have not verified these
                    the way we verify the readings above.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Pronunciation — the split, then each factor with its reason. */}
        {pronFactors.length > 0 && (
          <>
            {pronSplit && (
              <div style={{
                fontFamily: "'Fraunces', serif", fontSize: 26, letterSpacing: '.01em',
                padding: '10px 12px', borderRadius: 8, background: 'var(--bg-2)',
                border: '1px solid var(--line)', marginTop: 4, textAlign: 'center',
              }}>
                {pronSplit}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>
              {pronFactors.map(f => (
                <div key={f.label} style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{f.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{f.value}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.45, marginTop: 2 }}>{f.note}</div>
                </div>
              ))}
            </div>
          </>
        )}
        <div className="tile-foot">
          <span>{s.source || check.source}</span>
          {manualCheck
            ? <a href={manualCheck.url} target="_blank" rel="noreferrer">{manualCheck.label}</a>
            : s.actionUrl
              ? <a href={s.actionUrl} target="_blank" rel="noreferrer">View →</a>
              : <span>{s.latencyMs ? `${s.latencyMs} ms` : live === 'scanning' ? '···' : '—'}</span>}
        </div>
      </div>
    )
  }

  // ── Trademark class-wise breakdown (inside section 01) ──────────
  const renderTmTable = () => {
    const tm = results['leg-tm']
    // Only a real, non-pending trademark result may drive this table.
    const liveClassData = tm && tm.status !== 'pending' && Array.isArray(tm.detail?.classes)
      ? tm.detail.classes
      : null

    return (
      <div className="tm-wrap" key="tm-table">
        <div className="tm-label">Trademark — class-wise breakdown (top relevant classes shown)</div>
        <div className="tm-table">
          <div className="tm-row head">
            <span>Class</span><span>Description</span><span>Status</span><span>Action</span>
          </div>
          {TM_CLASSES.map(c => {
            const hit = liveClassData?.find(x => String(x.cls) === c.cls)
            return (
              <div className="tm-row" key={c.cls}>
                <span className="tm-class">{c.cls}</span>
                <span className="tm-name">
                  <b>{c.name}</b>{c.note && <> · {c.note}</>}
                </span>
                <span className="tm-status">
                  {hit
                    ? <span className={`pill ${PILL[hit.status]?.cls ?? 'pending'}`}>{PILL[hit.status]?.label ?? hit.status}</span>
                    : isPaidView
                      ? <span className="pill pending">Awaiting IP India</span>
                      : <span className="pill info">🔒 Deep Search</span>}
                </span>
                <a className="tm-action" href={`https://tmrsearch.ipindia.gov.in/tmrpublicsearch/frmmain.aspx`} target="_blank" rel="noreferrer">
                  Search class →
                </a>
              </div>
            )
          })}
        </div>
        <p className="tm-note">
          {liveClassData
            ? 'Status shown per class from the IP India register.'
            : isPaidView
              ? 'Class-by-class status arrives once the IP India connection is live. Until then, use the per-class links to check the official register yourself — we will not print a status we have not verified.'
              : 'The Deep Search runs all 45 classes, not just these seven — objections most often come from an adjacent class you did not think to check.'}
        </p>
      </div>
    )
  }

  // ── Numerology showpiece (07) ───────────────────────────────────
  const renderNumerology = () => {
    const d = numDetail
    const root = d?.root ?? '·'
    const planet = d?.planet?.name ?? '—'
    const glyph = d?.planet?.glyph ?? ''
    const compound = d?.compound
    const good = d?.industryFit?.good ?? []
    const avoid = d?.industryFit?.avoid ?? []
    const lucky = d?.luckyDobSums ?? []
    // Only claim favourability when we compared against the customer's OWN
    // industry. The old `good.length > 0` was true for every root — a verdict
    // that can never be anything else is not a verdict.
    const fit = d?.industryVerdict ?? null // 'favourable' | 'neutral' | 'avoid' | null
    const forIndustry = d?.industry ?? null
    return (
      <section className="module" key="numerology">
        <div className="section-head">
          <h2 className="section-title"><span className="num">{sectionNumbers.get("__numerology__") ?? "07"}</span>Numerology <span className="tag">Chaldean system</span></h2>
          <p className="section-desc">Used by traditional Indian business naming consultants. Reduces letters to a single root number with industry-fit interpretation.</p>
        </div>
        <div className="numerology">
          <div className="num-grid">
            <div className="num-big-wrap">
              <div className="num-label center">Root number</div>
              <div className="num-big">{root}</div>
            </div>
            <div>
              <div className="num-label">{displayName ? `Chaldean reading for "${displayName}"` : 'Chaldean reading'}</div>
              <h3 className="num-title">{d?.compoundMeaning ? <em>{d.compoundMeaning}</em> : <>The reading appears <em>after your scan.</em></>}</h3>
              <p className="num-desc">
                {d
                  ? <>
                      {Array.isArray(d.letters) && Array.isArray(d.digits) && d.letters.length === d.digits.length
                        ? d.letters.map((ch, i) => `${ch}(${d.digits[i]})`).join(' + ')
                        : Array.isArray(d.letters) ? d.letters.join(' · ') : ''}
                      {' '}= <b>{compound}</b> → root <b>{root}</b>. Ruled by <b>{planet} {glyph}</b>.
                    </>
                  : 'Type a name and press Check — the in-house Chaldean engine reduces every letter to its traditional value.'}
              </p>
              {(good.length > 0 || avoid.length > 0) && (
                <div className="num-fit">
                  {good.map(g => <span key={g} className="match">{g}</span>)}
                  {avoid.map(a => <span key={a}>{a}</span>)}
                </div>
              )}
            </div>
            <div className="num-verdict">
              <div className="num-stat">
                <div className="k">Compound number</div>
                <div className="v">{compound ?? '—'}</div>
              </div>
              <div className="num-stat">
                <div className="k">Ruling planet</div>
                <div className="v">{planet} {glyph && `· ${glyph}`}</div>
              </div>
              <div className="num-stat">
                <div className="k">{forIndustry ? `Verdict for ${forIndustry}` : 'Verdict'}</div>
                <div className={`v${fit === 'favourable' ? ' gold' : ''}`}>
                  {!d ? '—'
                    : fit === 'favourable' ? `Favourable for ${forIndustry}`
                    : fit === 'avoid' ? `Traditionally not favoured for ${forIndustry}`
                    : fit === 'neutral' ? `Neutral for ${forIndustry} — one signal among many`
                    : 'Pick your industry above the search box for a verdict'}
                </div>
              </div>
              <div className="num-stat">
                <div className="k">Lucky pairing</div>
                <div className="v">{lucky.length ? `Founder DOB sum ${lucky.join(', ')} strengthens this name` : '—'}</div>
              </div>
            </div>
          </div>
          <div className="num-foot">
            <span>Chaldean system · not Pythagorean</span>
            <span>Interpretive, not deterministic — one signal among many.</span>
          </div>
        </div>
      </section>
    )
  }

  return (
    <div className="container">
      {/* MODE SWITCHER */}
      <div className="mode-bar">
        <div className="mode-switcher" role="tablist">
          <button className={`mode-pill${mode === 'business' ? ' active' : ''}`} onClick={() => switchMode('business')} role="tab">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21V8l9-5 9 5v13"/><path d="M9 21V11h6v10"/></svg>
            Startup / Business
          </button>
          <button className={`mode-pill${mode === 'baby' ? ' active' : ''}`} onClick={() => switchMode('baby')} role="tab">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="4"/><path d="M5 21c0-4 3-7 7-7s7 3 7 7"/><circle cx="9" cy="8" r="0.6" fill="currentColor"/><circle cx="15" cy="8" r="0.6" fill="currentColor"/></svg>
            Baby Name <span className="deva">शिशु</span>
          </button>
        </div>
      </div>

      {/* HERO */}
      <header className="hero">
        {mode === 'business' ? (
          <>
            <div className="eyebrow">One search · 33 checks · <em>poora desh, ek check</em></div>
            <h1 className="hero-title">One name. <em>Every check that matters.</em></h1>
            {heroSub && <p className="sub">{heroSub}</p>}
          </>
        ) : (
          <>
            <div className="eyebrow">Naam rakhne se pehle · zaroori checks · <em>pyaar se</em></div>
            <h1 className="hero-title">Naming your little one? <em>Get every part right.</em></h1>
            <p className="sub">Will the name be easy to pronounce? Does it mean something unfortunate in another Indian language? What does traditional Chaldean numerology say? And is the social handle still free for when they grow up?</p>
          </>
        )}

        <form className="search" onSubmit={handleSearch} autoComplete="off">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={MODES[mode].placeholder}
            aria-label="Name to check"
          />
          <button type="submit" className="search-btn" disabled={live === 'scanning'}>
            {live === 'scanning' ? 'Scanning…' : mode === 'business' ? 'Check everywhere' : 'Check the name'}
            <span className="kbd">↵</span>
          </button>
        </form>
        {mode === 'baby' && (
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {/* Optional, and it says what it is for. An optional field with no
                stated purpose reads as collection for its own sake — and this
                one is about a child, so it earns its place or it goes. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', width: '100%' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
                Whose name is it?
              </span>
              {GENDERS.map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setGender(gender === v ? '' : v)}
                  aria-pressed={gender === v}
                  style={{
                    padding: '7px 14px', fontSize: 13, borderRadius: 999, cursor: 'pointer',
                    border: `1px solid ${gender === v ? 'var(--accent)' : 'var(--line)'}`,
                    background: gender === v ? 'var(--accent)' : 'var(--surface)',
                    color: gender === v ? 'var(--on-accent)' : 'var(--ink-2)',
                    fontWeight: gender === v ? 600 : 400,
                  }}
                >{label}</button>
              ))}
              <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
                optional — it only shapes the alternative names we suggest
              </span>
            </div>
            <input
              type="text"
              value={siblingName}
              onChange={e => setSiblingName(e.target.value)}
              placeholder="Sibling's name (optional) — we'll check how the two sound together"
              aria-label="Sibling name for harmony comparison"
              style={{ width: 'min(420px, 100%)', padding: '10px 16px', fontSize: 14, border: '1px solid var(--hairline)', borderRadius: 10, background: 'var(--surface)', color: 'var(--ink)', outline: 'none' }}
            />
            {/* Birth details turn the Avakahada chakra the right way round: the
                star at birth prescribes the syllables, which is how a pandit
                actually works. Both optional — a family without the time still
                gets an answer, with the uncertainty stated. */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
                  Date of birth (optional)
                </span>
                <input
                  type="date"
                  value={birthDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={e => setBirthDate(e.target.value)}
                  aria-label="Baby's date of birth, for the birth star"
                  style={{ padding: '9px 14px', fontSize: 14, border: '1px solid var(--hairline)', borderRadius: 10, background: 'var(--surface)', color: birthDate ? 'var(--ink)' : 'var(--ink-3)', outline: 'none' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 3, opacity: birthDate ? 1 : 0.55 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
                  Time (sharpens it)
                </span>
                <input
                  type="time"
                  value={birthTime}
                  disabled={!birthDate}
                  onChange={e => setBirthTime(e.target.value)}
                  aria-label="Baby's time of birth, for an exact birth star"
                  style={{ padding: '9px 14px', fontSize: 14, border: '1px solid var(--hairline)', borderRadius: 10, background: 'var(--surface)', color: birthTime ? 'var(--ink)' : 'var(--ink-3)', outline: 'none' }}
                />
              </label>
            </div>
            {/* Both kinds of parent reach this box, and the date means something
                different to each. In India the name is usually chosen for the
                namkaran on the sixth day, so the birth date already exists;
                elsewhere the name is more often settled before the birth. The
                field stays optional for that reason, and says so — rather than
                letting the second group wonder what they are missing. */}
            {!birthDate && (
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', width: '100%' }}>
                Already arrived? The date gives the real birth star, calculated from the
                Moon's position. Still expecting? Leave it blank — every other check runs
                exactly the same.
              </div>
            )}
            {birthDate && !birthTime && (
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', width: '100%' }}>
                The moon changes star roughly once a day — a birth time makes the reading exact.
              </div>
            )}
          </div>
        )}
        {mode === 'business' && (
          <div style={{ marginTop: 12 }}>
            {/* Optional. Feeds the numerology check so its verdict is about
                YOUR industry, not a generic list. */}
            <select
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              aria-label="Your industry (optional) — sharpens the numerology reading"
              style={{ width: 'min(420px, 100%)', padding: '10px 14px', fontSize: 14, border: '1px solid var(--hairline)', borderRadius: 10, background: 'var(--surface)', color: industry ? 'var(--ink)' : 'var(--ink-3)', outline: 'none' }}
            >
              <option value="">Industry (optional) — for the numerology fit</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
        )}
        {scanError && (
          <div style={{ marginTop: 14, maxWidth: 760, padding: '12px 16px', borderRadius: 12, border: '1px solid var(--no-line)', background: 'linear-gradient(180deg, var(--no-bg) 0%, #fff 90%)', color: 'var(--no-ink)', fontSize: 13.5 }}>
            {scanError}
          </div>
        )}
        <div className="hint">
          <span className="kbd-hint"><kbd>⌘K</kbd> open anywhere</span>
          {mode === 'business'
            ? <span><span className="dot"></span> {freeCount} instant checks · {price.searchCost} tokens</span>
            : <span><span className="dot"></span> {freeCount} instant checks · {price.searchCost} tokens</span>}
          {mode === 'business'
            ? <span><span className="dot"></span> {hasLegalChecks ? 'Deep Search adds MCA21 + trademark' : 'Deep Search adds the full report'} · {price.unlockCost} tokens</span>
            : <span><span className="dot"></span> Full naming report with keepsake · {price.unlockCost} tokens</span>}
          <span><span className="dot"></span> Results stream live</span>
        </div>
        {/* How tokens work */}
        <div className="hint" style={{ marginTop: 10 }}>
          <span>✨ Sign in → 500 free tokens</span>
          <span>🔍 {price.searchLabel} → {price.searchCost} tokens</span>
          <span>🔬 {mode === 'business' ? 'Deep Search' : 'Full naming report'} → {price.unlockCost} tokens</span>
          <span>💳 ₹50 → 500 tokens</span>
        </div>
      </header>

      {/* The full sectioned layout is ALWAYS on the page — that density is the
          design. The summary strip is always present too, matching the original
          site's layout; before a search its values read "—" rather than showing
          numbers for a name nobody has typed. */}
      <>
        <>
          {/* SUMMARY STRIP */}
          <div className="summary">
            <div>
              <div className="label">{displayName ? `Verdict for "${displayName}"` : 'Verdict'}</div>
              <div className="big">
                {scanned ? <><em>{nSettled}</em> / {denom} clear</> : <><em>—</em> / {states.length} checks</>}
              </div>
              <div className="bar">
                <span className="g" style={{ width: `${scanned ? pct(nSettled) : 0}%` }}></span>
                <span className="p" style={{ width: `${scanned ? pct(nConflict) : 0}%` }}></span>
                <span className="w" style={{ width: `${scanned ? pct(nWarn) : 0}%` }}></span>
                <span className="x" style={{ width: `${scanned ? pct(nUnknown) : 0}%` }}></span>
              </div>
              <div className="meta">
                {!scanned && 'Type a name and press Check — results stream in live.'}
                {scanned && live === 'scanning' && 'Scanning — results streaming in live…'}
                {scanned && live === 'done' && summaryDetail()}
              </div>
            </div>
            {/* Cards 2 and 3 are per-mode. Legal risk and brand collisions are
                what keeps a FOUNDER awake; a parent at a namkaran cares about
                the birth star and whether the name means something unfortunate
                in another language. Showing "MCA21 + 45 TM classes" on the
                baby side was founder wording leaking through. */}
            {mode === 'business' && hasLegalChecks ? (
              <div>
                <div className="label">Legal risk</div>
                <div className={`big${scanned && legalRisk === 'High' ? ' bad' : ''}`}><em>{scanned ? legalRisk : '—'}</em></div>
                <div className="meta">
                  {!scanned
                    ? 'MCA21 + all 45 trademark classes run on the Deep Search.'
                    : isPaidView
                      ? (legalConflicts > 0 ? 'Conflicts found in government registries' : 'MCA21 + Trademark clear')
                      : 'MCA21 + all 45 TM classes run on the Deep Search'}
                </div>
              </div>
            ) : mode === 'baby' ? (
              <div>
                <div className="label">Rashi &amp; Nakshatra</div>
                <div className="big"><em>{scanned && rashiDetail ? rashiDetail.rashi : '—'}</em></div>
                <div className="meta">
                  {!scanned
                    ? "Birth star and moon sign from the name's first syllable."
                    : rashiDetail
                      ? `${rashiDetail.nakshatra} nakshatra · syllable "${rashiDetail.syllable}"`
                      : 'This spelling falls outside the traditional syllable tables.'}
                </div>
              </div>
            ) : null}
            {mode === 'business' ? (
              <div>
                <div className="label">Brand surface</div>
                <div className="big">
                  {!scanned ? '—' : brandWarn > 0
                    ? <span className="big-note" style={{ fontSize: 34, fontFamily: 'Fraunces, serif', fontStyle: 'normal', color: 'var(--warn-ink)' }}>Busy</span>
                    : 'Clean'}
                </div>
                <div className="meta">{!scanned ? 'Who already ranks on page one for this name.' : brandWarn > 0 ? 'Existing entities rank for this name — check the Brand section' : 'No major Google or Wikipedia collision detected'}</div>
              </div>
            ) : (
              <div>
                <div className="label">Language check</div>
                <div className="big">
                  {!scanned ? '—' : landmineStatus === 'ok'
                    ? 'Clear'
                    : <span className="big-note" style={{ fontSize: 34, fontFamily: 'Fraunces, serif', fontStyle: 'normal', color: 'var(--warn-ink)' }}>Caution</span>}
                </div>
                <div className="meta">
                  {!scanned
                    ? 'Checked against unfortunate meanings in 7 Indian languages.'
                    : landmineStatus === 'ok'
                      ? 'No negative meaning found across 7 languages'
                      : 'A meaning to know about — see the Meaning section'}
                </div>
              </div>
            )}
            <div>
              <div className="label">Chaldean number</div>
              {mode === 'business' ? (
                <>
                  <div className="big">
                    <em>{numDetail?.root ?? '—'}</em>{' '}
                    <span className="big-note">
                      {numDetail?.industryVerdict === 'favourable' ? 'favourable'
                        : numDetail?.industryVerdict === 'avoid' ? 'not favoured'
                        : numDetail?.industryVerdict === 'neutral' ? 'neutral'
                        : ''}
                    </span>
                  </div>
                  <div className="meta">
                    {numDetail?.industryVerdict
                      ? numDetail.industryVerdict === 'favourable'
                        ? `Favourable for ${numDetail.industry}`
                        : numDetail.industryVerdict === 'avoid'
                          ? `Root ${numDetail.root} traditionally avoids ${numDetail.industry} — favours: ${numDetail.industryFit.good.slice(0, 2).join(', ')}`
                          : `Neutral for ${numDetail.industry} — traditionally favours: ${numDetail.industryFit.good.slice(0, 2).join(', ')}`
                      : numDetail
                        ? `Traditionally favours: ${numDetail.industryFit?.good?.slice(0, 3).join(', ')}`
                        : 'Root number, ruling planet and industry fit.'}
                  </div>
                </>
              ) : (
                <>
                  {/* No "industry fit" for a baby — the traditional reading is
                      the number and its ruling planet. */}
                  <div className="big"><em>{numDetail?.root ?? '—'}</em> {numDetail?.planet && <span className="big-note">{numDetail.planet.glyph}</span>}</div>
                  <div className="meta">{numDetail?.planet ? `Ruled by ${numDetail.planet.name} — compound ${numDetail.compound}` : 'Root number and ruling planet, the traditional way.'}</div>
                </>
              )}
            </div>
          </div>
        </>

        {/* UNLOCK / STATUS BANNER — only meaningful once a scan has run */}
        {scanned && (
          <div className={`scan-banner${isPaidView ? ' paid' : ''}`}>
            <div>
              <div className="sb-label">
                {isPaidView ? price.bannerPaid : price.bannerFree}
                {live === 'scanning' && ' · live'}
                {live === 'done' && verdict && ` · verdict ≈ ${verdict.score}%`}
              </div>
              <div className="sb-text">
                {isPaidView
                  ? mode === 'business'
                    ? <>Showing all <b>{catalogue.filter(c => c.family !== 'Bonus').length}</b> checks{hasLegalChecks ? ' including MCA21, Trademark and Amazon brand' : ''}.</>
                    : <>Showing every check, with the keepsake certificate and name suggestions below.</>
                  : mode === 'business'
                    ? <>Showing <b>{freeCount}</b> checks. <b>{paidCount}</b> more run on the Deep Search — <b>{price.unlockCost} tokens</b>.</>
                    : <>Showing <b>{freeCount}</b> checks. The full naming report adds the keepsake certificate and name suggestions — <b>{price.unlockCost} tokens</b>.</>}
              </div>
            </div>
            {!isPaidView && (
              <div className="sb-actions">
                <button onClick={handleUnlock} className="sb-btn">{price.unlockCta} · {price.unlockCost} tokens</button>
                <Link to={mode === 'business' ? '/pricing' : '/pricing?audience=parent'} className="sb-btn ghost">See plans</Link>
              </div>
            )}
          </div>
        )}

        {/*
          * The Shortlist of Five, offered in its own banner rather than as a
          * third button on the one above — it is a different document at a
          * different price, and crowding it in beside the naming report reads
          * as an upsell on an upsell.
          *
          * Baby mode only: there is no shortlist certificate for a company.
          */}
        {scanned && mode === 'baby' && (
          <div className="scan-banner" style={{ marginTop: 12 }}>
            <div>
              <div className="sb-label">Shortlist of five · two printed pages</div>
              <div className="sb-text">
                {isPaidView
                  ? <>The certificate of the names you weighed — the one you chose, what it means across
                      India, and the four or five you considered before settling — <b>{price.shortlistCost} tokens</b>.</>
                  : <>The certificate of the names you weighed, and <b>the full naming report with it</b> —
                      <b> {price.shortlistCost} tokens</b> for both.</>}
              </div>
            </div>
            <div className="sb-actions">
              <button onClick={handleShortlist} className="sb-btn">Create the Shortlist of Five · {price.shortlistCost} tokens</button>
              <Link to="/pricing?audience=parent" className="sb-btn ghost">See plans</Link>
            </div>
          </div>
        )}
      </>

      {/* FILTER TABS */}
          <div className="tabs-wrap" style={{ marginTop: 24 }}>
            <div className="tabs" role="tablist">
              {tabList.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`tab${activeTab === tab ? ' active' : ''}`}>
                  {tab} <span className="count">{tab === 'All' ? catalogue.length : famCount(tab)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* SECTIONS (numerology showpiece slots in as 07, before the bonus section) */}
          {sections
            .filter(sec => activeTab === 'All' || sec.family === activeTab)
            .flatMap(sec => {
              const secChecks = catalogue.filter(c => c.family === sec.family && !(sec.skipKeys ?? []).includes(c.key))
              if (secChecks.length === 0) return []
              const section = (
                <section className="module" key={sec.family}>
                  <div className="section-head">
                    <h2 className="section-title"><span className="num">{sectionNumbers.get(sec.family) ?? sec.num}</span>{sec.title}</h2>
                    <p className="section-desc">{sec.desc}</p>
                  </div>
                  <div className={`grid ${sec.cols}`.trim()}>
                    {secChecks.map(renderTile)}
                  </div>
                  {/* Class-wise trademark table sits inside 01, as on the original site */}
                  {mode === 'business' && sec.family === 'Legal' && renderTmTable()}
                  {/* The certificate sits in its own section rather than
                      taking over the page. */}
                  {/* The Shortlist comes first: it is built from the five
                      suggestions in the tile immediately above it, so it belongs
                      next to them rather than below an unrelated certificate. */}
                  {mode === 'baby' && sec.family === 'Bonus' && isPaidView && renderFive()}
                  {/* The one-page certificate is part of what the 1,000-token tier
                      buys, so someone who bought that tier is not offered it again
                      as a separate thing. */}
                  {mode === 'baby' && sec.family === 'Bonus' && isPaidView && scanTier !== TIER_SHORTLIST && renderCertificate()}
                </section>
              )
              // Insert 07 · Numerology right after the Linguistic section
              if (mode === 'business' && sec.family === 'Linguistic') return [section, renderNumerology()]
              return [section]
            })}

      {/* CTA STRIP */}
      {!isPaidView && (
        <div className="cta-strip">
              <div>
                {mode === 'business' ? (
                  <>
                    <h3>The Standard search shows you the surface. <em>Run the Deep Search to be sure.</em></h3>
                    <p>{hasLegalChecks
                      ? 'The Deep Search runs MCA21 and IP India trademark across all 45 classes with CAPTCHA solving, checks Amazon and Flipkart brand registries, and generates 5 verified alternative names.'
                      : 'The Deep Search checks Amazon and Flipkart brand registries and generates 5 verified alternative names.'}</p>
                  </>
                ) : (
                  <>
                    <h3>The naming-day keepsake. <em>A beautiful PDF for the family.</em></h3>
                    <p>Pronunciation guide, language-by-language meaning, traditional Chaldean numerology reading and reserved social handles — formatted as a gentle keepsake for the whole family.</p>
                  </>
                )}
              </div>
              <div className="cta-buttons">
                {mode === 'business' ? (
                  <>
                    <button onClick={handleUnlock} className="cta-btn">Run the Deep Search <small>{price.unlockCost} tokens</small></button>
                    <Link to="/pricing" className="cta-btn outline">Token packs <small>₹50 → 500 tokens</small></Link>
                  </>
                ) : (
                  <>
                    <button onClick={handleUnlock} className="cta-btn">Full naming report <small>{price.unlockCost} tokens</small></button>
                    <button onClick={handleShortlist} className="cta-btn outline">Shortlist of Five <small>{price.shortlistCost} tokens</small></button>
                  </>
                )}
              </div>
            </div>
      )}

      {/* Sign-in gate — shown when a visitor tries to search without an account.
          They can read the whole page; only the act of searching needs tokens. */}
      {showSignIn && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowSignIn(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center',
            background: 'rgba(26,25,23,.55)', backdropFilter: 'blur(3px)', padding: 20,
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Sign in to search"
        >
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18,
            padding: '32px 30px', maxWidth: 420, width: '100%', textAlign: 'center',
            boxShadow: '0 24px 60px -20px rgba(0,0,0,.35)',
          }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--accent)' }}>
              Sign in to search
            </div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 500, margin: '10px 0 8px', lineHeight: 1.2 }}>
              Get <em style={{ color: 'var(--accent)', fontStyle: 'normal' }}>500 tokens</em> free
            </h3>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, margin: '0 0 6px' }}>
              Sign in with Google and we'll add 500 tokens to your account — enough for
              one Deep Search plus three Standard searches, or ten Standard searches.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 18, margin: '18px 0 22px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--ink-3)' }}>
              <span>Standard · {price.searchCost}</span>
              <span>Deep · {price.unlockCost}</span>
            </div>
            <Link to="/sign-in" className="cta-btn" style={{ display: 'block', textAlign: 'center' }}>
              Continue with Google
            </Link>
            <button
              onClick={() => setShowSignIn(false)}
              style={{ marginTop: 12, background: 'transparent', border: 0, color: 'var(--ink-3)', fontSize: 13, cursor: 'pointer' }}
            >
              Keep looking around
            </button>
            <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 14, lineHeight: 1.5 }}>
              Tokens never expire. No card needed to start.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
