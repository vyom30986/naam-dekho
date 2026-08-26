import { TLDS } from "../scanners/domain.js";
import { normaliseName } from "../lib/normalise.js";
import { slugify } from "../scripts/name-corpus.js";
import { ctaBlock, esc, renderSeoPage, seoSlug } from "./shell.js";
import type { SeoCtx, SeoDoc } from "./shell.js";

/**
 * The domain cluster — one page per ending we check, /domains/<tld>.html.
 *
 * This is the founder half of the product and until now it had no organic
 * surface at all: 537 pages answer "what does this baby name mean" and nothing
 * answers "is my startup name free, and what will the address cost me". The
 * queries are different in kind, too — a parent is browsing, a founder is
 * about to spend money — so these pages carry prices, a fit judgement, and the
 * mechanics of the check itself rather than lists of names.
 *
 * Every rupee figure on these pages comes from TLDS in scanners/domain.ts, the
 * same table the live tile prices from, and every claim about how a check
 * behaves is read off the scanner. The hand-written half — who an ending suits
 * and who it does not — carries no rupee figures and does no arithmetic:
 * prices belong to the table and the sums are generated, so a price change in
 * domain.ts can never leave a sentence here contradicting the table beside it.
 *
 * What these pages must never do is imply a live answer. They are static
 * files. "yourname.in is available" is a statement with a timestamp on it, and
 * a file built last Tuesday cannot make it. Every page says so in its own
 * words, twice.
 */

/**
 * RULE 2 THRESHOLD — an ending publishes only when it has both a priced row in
 * TLDS and a full profile below: what it is, at least two audiences it suits,
 * two it does not, two paragraphs of characterisation, and at least one
 * question that is specific to it.
 *
 * The threshold is a completeness test rather than a count because the corpus
 * does not feed this cluster; the risk here is the opposite one. Adding a
 * fifteenth ending to TLDS is a one-line edit, and if that alone minted a page
 * the page would be a price, a shared comparison table and a shared RDAP
 * explainer — the definition of a doorway page, and thirteen near-identical
 * siblings would drag down with it. So a new ending gets a page when somebody
 * has actually decided what it is for. All fourteen currently in TLDS clear
 * this, so the cluster emits fourteen pages today.
 */
function isPublishable(p: EndingProfile): boolean {
  return (
    p.suits.length >= 2 && p.avoid.length >= 2 && p.prose.length >= 2 && p.faqs.length >= 1
  );
}

/** Rows in the sample-address table, and the smallest corpus that earns one. */
const SAMPLE_ROWS = 8;

/** Sample labels are drawn from the shortest published names — the ones a
 *  founder would actually consider — not from wherever the alphabet lands. */
const SAMPLE_POOL = 40;

/** How far into the pool each successive page starts.
 *
 *  Three, not one window length: stepping a whole window wraps a pool of forty
 *  after five pages, and three of the fourteen endings would then open with a
 *  byte-identical list — the exact duplication rule 2 exists to avoid. A stride
 *  of three lands the fourteenth page at offset 39, inside the pool, so every
 *  ending gets a starting point of its own. */
const SAMPLE_STRIDE = 3;

const domainPath = (tld: string) => `/domains/${seoSlug(tld)}.html`;

/** Cross-cluster paths. /n/ is unconditional — every published name gets a
 *  page — and the trademark hub is the one every founder needs next. */
const NAME_INDEX = "/n/";
const TRADEMARK_HUB = "/trademark-class/";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const ordinal = (n: number): string => {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${suffix}`;
};

/** Prose lists — "media, trade and transit", not a CSV. */
const listJoin = (parts: string[], conjunction: "and" | "or" = "and") =>
  parts.length <= 1
    ? (parts[0] ?? "")
    : `${parts.slice(0, -1).join(", ")} ${conjunction} ${parts[parts.length - 1]}`;

/** table.data does not style links, so cell links carry the accent inline. */
const cellLink = (href: string, text: string) =>
  `<a href="${href}" style="color:var(--accent);text-decoration:none">${esc(text)}</a>`;

const bullets = (items: string[]) =>
  `<ul style="margin:9px 0 0;padding-left:18px;font-size:14px;color:var(--ink-2)">${items
    .map((i) => `<li style="margin-bottom:5px">${esc(i)}</li>`)
    .join("")}</ul>`;

interface EndingProfile {
  /** Joins to TLDS[].tld exactly. An ending in one and not the other is skipped. */
  tld: string;
  /** The tag under the h1 — what kind of ending this is. */
  kind: string;
  /** One factual sentence: what the ending is, not what we think of it. */
  what: string;
  /** Four or five words for the comparison table every page carries. */
  signal: string;
  suits: string[];
  avoid: string[];
  /** Characterisation. No prices and no multiples — see the file header. */
  prose: string[];
  /** Endings a customer types instead of this one. Costs traffic and email. */
  confusedWith: string[];
  /** Questions that only make sense for this ending. */
  faqs: Array<{ q: string; a: string }>;
}

/**
 * The judgements. These are the only sentences on the cluster nobody can
 * recompute, so they are the part that has to be worth reading: an ending is
 * described by what it does to the person who owns it — how it is heard on a
 * phone call, what it promises a customer, what it stops you growing into —
 * and never by an adjective.
 *
 * Factual claims are limited to things a reader can verify independently: who
 * runs a registry, which territory a country code belongs to, whether browsers
 * force HTTPS. Nothing here asserts a market share, a resale price or a
 * deliverability statistic, because we cannot check those and the product's
 * whole position is that we do not guess.
 *
 * A handful of entries do say where an ending sits relative to the others
 * ("among the dearest we check") because that is the defining fact about the
 * ending rather than a passing number. Those are the sentences to re-read if
 * TLDS is ever repriced from a live registrar feed — everything else on the
 * page recomputes itself.
 */
const PROFILES: EndingProfile[] = [
  {
    tld: "com",
    kind: "Legacy generic ending",
    what: "One of the original generic endings, in use since the mid-1980s, and still the one people type from memory.",
    signal: "The global default",
    suits: [
      "Anything sold outside India",
      "A name that will be typed from memory rather than clicked",
      "Anyone who expects to be looked up by an investor, a journalist or a procurement team",
    ],
    avoid: [
      "A founder who needs the exact dictionary word — those went two decades ago",
      "Anyone unwilling to coin a word, compound two, or add a syllable to get one",
    ],
    prose: [
      "A .com is where a customer's fingers go by default, and that is worth more than it looks. If you build on another ending while somebody else owns the matching .com, a share of your typed traffic and a share of your mistyped email arrive on their servers rather than yours — quietly, for as long as the brand lasts.",
      "The real cost of a .com is not the registration. It is that the word you want is almost certainly taken, so a free .com today is usually a coined word, a compound, or your name with a second word attached. That is a naming decision, not a purchase. Check the .com even when you intend to launch on .in: knowing who holds it tells you who you are going to be confused with.",
    ],
    confusedWith: ["in", "co", "net"],
    faqs: [
      {
        q: "I have launched on .in. Do I still need the .com?",
        a: "You need to know who owns it, which is not the same as needing to own it. If the .com sits unused with a registrar, you can live beside it. If it belongs to a working business in a related field, you will spend years being mistaken for them in search results, in email and in the minds of customers who half-remember your name — and that is a naming problem, not a domain problem.",
      },
      {
        q: "Is a .com better than a .in for an Indian company?",
        a: "Better at different things. A .com is understood everywhere and costs more in effort, because the label you want is probably gone. A .in is instantly legible to Indian customers, cheaper, and far likelier to be free in the exact word you wanted. If the business is India-first and the exact word matters, .in usually wins; if you sell abroad, the .com is worth the compromise on the word.",
      },
    ],
  },
  {
    tld: "in",
    kind: "India's country code",
    what: "India's country-code ending, run by NIXI, the National Internet Exchange of India. Registration is open to anyone — there is no residency test.",
    signal: "India-first",
    suits: [
      "A business whose customers, payments and deliveries are in India",
      "A D2C brand that wants to read as Indian rather than translated",
      "The practical first choice when the exact word is gone in .com",
    ],
    avoid: [
      "A company whose buyers are mostly abroad and will type .com by reflex",
      "A founder who assumes taking the .in secures the name — it secures one registry, and no more",
    ],
    prose: [
      "For a business that sells in India, .in costs nothing in recognition. Nobody here has to be told what it means, it fits on packaging, and it survives being read out over a phone line in one syllable. It is also the ending where the exact word you wanted still stands a reasonable chance of being free, which is the practical argument that usually decides it.",
      "Two things it does not do. It does not read as neutral to a buyer in Frankfurt or Chicago, who will assume there is a .com somewhere and go looking. And it does not reserve anything beyond itself: the .com, the .co.in, the handles and the trademark are separate registries with separate queues, and a name is only yours in the ones you actually paid for.",
    ],
    confusedWith: ["co.in", "com"],
    faqs: [
      {
        q: "Can a foreign company register a .in domain?",
        a: "Yes. .in has no residency or incorporation requirement — the registry accepts registrations from anywhere through accredited registrars, the same way .com does. The ending signals where you sell, not where you are registered.",
      },
      {
        q: "Is .in taken more or less often than .com?",
        a: "We cannot publish a figure we have not measured, and nobody should trust one that is asserted rather than counted. What we can say is what the check does: it queries both in the same pass, so you get the two answers side by side for your own name rather than a general claim about names.",
      },
    ],
  },
  {
    tld: "co.in",
    kind: "The company space inside .in",
    what: "A third-level space in the .in tree, historically the company space. Registration is open to anyone, exactly as .in is.",
    signal: "India, one level down",
    suits: [
      "An Indian entity that has lost the .in and still wants an Indian address",
      "Organisations whose existing letterheads, invoices and email already say co.in",
    ],
    avoid: [
      "Anything read aloud often — it is three extra syllables at every counter and every call",
      "A brand that prints its address on packaging, where the extra characters cost real space",
    ],
    prose: [
      "The saving against the .in is small and the cost is permanent: a second dot and four more characters on every invoice, every ad, every delivery slip and every time somebody spells the address out. Take .co.in because the .in is gone, not to save money.",
      "It is a genuinely separate registration, not an alias. Owning the .in does not give you the .co.in, and owning the .co.in does not stop somebody else taking the .in and collecting the customers who dropped the co. When you go with this one, price the .in beside it and decide deliberately.",
    ],
    confusedWith: ["in", "com"],
    faqs: [
      {
        q: "Is .co.in the same as .in?",
        a: "No. They are separate registrations under the same registry, and one does not include the other. A customer who types your name with .in and lands on somebody else's site has not made a mistake you can appeal — the two addresses simply belong to whoever registered each of them.",
      },
    ],
  },
  {
    tld: "org",
    kind: "Legacy generic ending",
    what: "Open to any registrant, with no eligibility test, but read by nearly everyone as a non-profit address.",
    signal: "Non-profit, by convention",
    suits: [
      "Section 8 companies, societies, trusts and foundations",
      "Industry bodies, standards groups and member associations",
      "Open-source projects and public-interest archives",
    ],
    avoid: [
      "A for-profit D2C brand — the convention is strong enough that .org above a checkout button reads as a mismatch",
      "Anyone hoping .org will lend a commercial site credibility; it mostly makes it look confused",
    ],
    prose: [
      "There is no eligibility test on .org — anybody may register one, non-profit or not. The convention has outlived that fact, which is the only thing that matters when you are choosing: your reader has an expectation about what sits behind a .org, and if your page is a product catalogue you are spending your first impression on explaining yourself.",
      "Where it works, it works well. A trust, an association or a public-interest project gets an ending that says what it is before the visitor has read a word, and it does so for the same money as the .com — so the choice here is about the signal rather than the budget.",
    ],
    confusedWith: ["com", "net"],
    faqs: [
      {
        q: "Can a private limited company register a .org domain?",
        a: "Yes — .org has no eligibility test. Whether it should is a separate question: the ending sets an expectation of a non-profit, and a company that takes it spends effort correcting an assumption instead of making a first impression.",
      },
    ],
  },
  {
    tld: "net",
    kind: "Legacy generic ending",
    what: "Originally intended for network operators; today read by most people as evidence that the .com was taken.",
    signal: "Reads as a second choice",
    suits: [
      "ISPs, hosting companies and connectivity businesses where the word is literal",
      "Infrastructure and network-operations products whose buyers are engineers",
    ],
    avoid: [
      "Consumer brands — the reader's first thought is that somebody else has your .com",
      "Anyone choosing it to save money; it is priced above the .com it would be standing in for",
    ],
    prose: [
      "The original meaning of .net has almost worn off, and what replaced it is an inference: a visitor who sees .net assumes there is a .com and that it is not yours. For a consumer brand that inference is a small tax on every impression.",
      "For a company that actually operates a network, the word does its old job perfectly well, and the association is a description rather than an apology. That is the test — if removing the ending from your sentence changes what your business does, .net is honest; if not, it is a substitute and it will read like one.",
    ],
    confusedWith: ["com", "org"],
    faqs: [
      {
        q: "Is .net a good substitute when the .com is taken?",
        a: "It is the most confusable substitute, which is the problem. Endings that look like near-misses of .com — .net, .co — inherit the confusion along with the traffic; an ending that is plainly different, like .in for an Indian business, sets its own expectation instead of inviting a comparison you lose.",
      },
    ],
  },
  {
    tld: "io",
    kind: "Country code borrowed by the software industry",
    what: "The country code of the British Indian Ocean Territory, adopted by developer tools because io reads as input/output.",
    signal: "Developer tools",
    suits: [
      "Developer tools, APIs and infrastructure products",
      "B2B software whose buyer and whose evaluator are both engineers",
    ],
    avoid: [
      "Anything sold to Indian consumers — you will spell it out on every phone call for the life of the brand",
      "A founder counting rupees: it is one of the dearest endings we check, for a signal your customers may not recognise",
    ],
    prose: [
      "Among engineers .io needs no explanation, and that is the whole of its value: it places the product in a category before the page loads. Outside that room it explains nothing, and every customer-facing use of the address becomes a small act of dictation.",
      "It is also a country code rather than a category. .io belongs to a territory, and a country-code ending's long-run future follows that territory's status rather than the software industry that borrowed it. That is not a reason to avoid it — it is a reason to know what you are building the brand on before you print it on anything.",
    ],
    confusedWith: ["ai", "com"],
    faqs: [
      {
        q: "Why do so many startups use .io?",
        a: "Because the short labels were still free when developer tools started needing them, and because io reads as input/output to the audience those tools sell to. It is a signal to a specific room. The moment your buyer is a shop owner or a parent rather than an engineer, the signal stops paying for itself.",
      },
    ],
  },
  {
    tld: "ai",
    kind: "Country code borrowed by the AI industry",
    what: "Anguilla's country-code ending, now read as a category marker by buyers of AI products.",
    signal: "AI, and priced like it",
    suits: [
      "A company whose product genuinely is an AI product, selling to buyers who read the ending as a category",
      "A funded B2B business for which the annual registration is a rounding error",
    ],
    avoid: [
      "A pre-revenue founder registering it to look like an AI company — it is by a wide margin the dearest ending we check",
      "Anyone selling to Indian consumers, who will hear the ending as two letters and ask you to repeat them",
    ],
    prose: [
      "The price is the demand. This ending costs what it costs because a category wants it, and the price block on this page sets out exactly what the same money would buy across the endings your customers already recognise.",
      "An ending cannot make a product an AI product. It can only make the claim — and the buyers who care about the claim are precisely the ones who will check it in the first demo. Registered for the right reason it is a piece of positioning; registered for the wrong one it is an annual bill for a label.",
    ],
    confusedWith: ["io", "com"],
    faqs: [
      {
        q: "Is a .ai domain worth the price?",
        a: "It is worth it when the ending saves you a sentence with a buyer who already reads it as a category, and it renews every year, so the question is not whether you can afford it once. Set it against the arithmetic in the price block on this page: the same money holds most of the table for a year, including the endings the rest of your customers will actually type.",
      },
    ],
  },
  {
    tld: "co",
    kind: "Country code sold as a short .com",
    what: "Colombia's country-code ending, marketed worldwide as a shorter stand-in for .com.",
    signal: "Short, and mistaken for .com",
    suits: [
      "A brand that wants a short international-looking address and has lost the .com",
      "Link shorteners and campaign addresses where every character counts",
    ],
    avoid: [
      "Anyone whose customers will type .com by reflex — you will be correcting people for the life of the brand",
      "A founder who thinks of it as the budget option; it is priced well above the .com it imitates",
    ],
    prose: [
      "The similarity to .com is the pitch and the problem in one. Two characters instead of three reads well on a business card and badly on a phone call, because the person on the other end has heard the longer ending ten thousand times and will type it.",
      "There is a defensive version of this that works: hold the .com as well and redirect it. That is a real strategy with a real annual cost, and it is worth pricing honestly rather than discovering later when the traffic is already going somewhere else.",
    ],
    confusedWith: ["com", "co.in"],
    faqs: [
      {
        q: "Is .co the same as .com?",
        a: "No. They are unrelated registries — .co is Colombia's country code — and each is registered separately by whoever gets there first. If your name is on .co and somebody else holds the matching .com, the typed traffic and the mistyped email are theirs, not yours.",
      },
    ],
  },
  {
    tld: "dev",
    kind: "Generic ending with HTTPS built in",
    what: "Run by Google and carried on the browsers' HSTS preload list, which means a .dev address will not load over plain HTTP at all — it needs a TLS certificate from the first day.",
    signal: "Engineering-facing, HTTPS only",
    suits: [
      "Developer-facing products, documentation sites and engineering blogs",
      "Internal tools and staging environments, where forced HTTPS is a feature rather than a chore",
    ],
    avoid: [
      "A non-technical business, whose customers read .dev as something still being built",
      "Anyone on hosting that cannot serve HTTPS, since there is no plain-HTTP fallback to limp along on",
    ],
    prose: [
      "The HSTS preload is the interesting part. Browsers refuse plain HTTP for the whole ending, so a misconfigured certificate is not a warning page your visitors click through — it is a site that does not load. That is a good constraint for an engineering team and an unforgiving one for anybody else.",
      "As a signal it is narrow and accurate: .dev says the audience is technical. Used for a documentation site or a developer portal beside a main brand, it does a job no other ending here does. Used as a company's only address it tells a non-technical customer nothing they can act on.",
    ],
    confusedWith: ["app", "com"],
    faqs: [
      {
        q: "Do I need an SSL certificate for a .dev domain?",
        a: "Yes, before the site works at all. The whole ending is on the HSTS preload list shipped inside browsers, so a browser will not even attempt plain HTTP for a .dev address. Plan the certificate into launch day rather than after it.",
      },
    ],
  },
  {
    tld: "app",
    kind: "Generic ending with HTTPS built in",
    what: "Also run by Google and also HSTS-preloaded, so HTTPS is mandatory rather than recommended.",
    signal: "Promises a download",
    suits: [
      "A product whose primary artefact really is a mobile app",
      "Download pages, deep links and app-support addresses beside a main brand",
    ],
    avoid: [
      "A services business or a consultancy with no app — the ending makes a promise the page then breaks",
      "Anyone who cannot serve HTTPS from day one, since browsers will not fall back to plain HTTP",
    ],
    prose: [
      "An ending is a sentence your customer finishes before reading the page. .app finishes it with a download, which is exactly right when there is one and a small broken promise when there is not.",
      "The HTTPS requirement is the same as .dev and worth the same planning: the certificate is not an improvement you schedule for later, it is the thing that makes the address resolve to a page in the first place.",
    ],
    confusedWith: ["dev", "com"],
    faqs: [
      {
        q: "Why will my .app site not open over http://?",
        a: "Because the ending is on the HSTS preload list built into browsers: for .app, HTTPS is not a preference the browser can be talked out of. Install a valid certificate and the address works; without one there is nothing to fall back to.",
      },
    ],
  },
  {
    tld: "store",
    kind: "Retail category ending",
    what: "A category ending that says shop before your name gets a chance to.",
    signal: "Retail, stated twice",
    suits: [
      "A D2C brand whose entire business is the storefront",
      "A retailer who has lost the .in and wants the category stated in the address",
    ],
    avoid: [
      "A founder with a tight catalogue budget — it is among the dearest endings here and it renews every year",
      "A business that may grow past retail into services, subscriptions or wholesale",
    ],
    prose: [
      "The signal is real: a customer reading the address knows what to expect. Whether it is worth paying for depends on whether your words already do that job — brands whose names contain what they sell are paying twice for one sentence.",
      "The bigger question is the one nobody asks at registration: an ending is a commitment, and a shop that later sells subscriptions has an address arguing with its own pricing page. Endings are cheap to buy and expensive to change once they are on packaging, invoices and a thousand printed labels.",
    ],
    confusedWith: ["shop", "com"],
    faqs: [
      {
        q: "Should a D2C brand take .store or .shop?",
        a: "They carry the same signal and are priced very differently — the price table on this page shows both, and the gap is the whole of the decision unless one of them holds the exact word you want and the other does not. Check both in one pass rather than picking on instinct.",
      },
    ],
  },
  {
    tld: "shop",
    kind: "Retail category ending",
    what: "The same retail signal as .store, at a very different price.",
    signal: "Retail, cheaper",
    suits: [
      "Small and mid-size D2C brands whose catalogue is the business",
      "Regional retailers who want the address to read as a shop in any language",
    ],
    avoid: [
      "B2B companies and services businesses, where the word describes nothing you sell",
      "A brand that expects to widen its offer — the ending will argue with you when you do",
    ],
    prose: [
      "Everything true of .store is true here at a materially lower price, which makes the choice between them mostly arithmetic and availability rather than taste.",
      "The narrowing is the thing to weigh. An ending that names your channel is useful while the channel is the business and awkward the moment it is one of several — and by then the address is on your packaging, your invoices and every courier label you have printed.",
    ],
    confusedWith: ["store", "com"],
    faqs: [
      {
        q: "Is .shop taken seriously for an Indian D2C brand?",
        a: "It reads as what it is — a shop — which is precisely the point for a brand whose business is the catalogue. The judgement to make is not about respectability but about scope: if the plan is to sell services or subscriptions within two years, an ending that names the shop will be the wrong label by then.",
      },
    ],
  },
  {
    tld: "tech",
    kind: "Category generic ending",
    what: "A category ending that suits businesses for which the word is literal.",
    signal: "Hardware, IT services",
    suits: [
      "Hardware, electronics and engineering firms",
      "IT services companies where technology is the service being sold, not the mood",
    ],
    avoid: [
      "A software startup competing for attention — buyers read .tech as the ending you took when nothing else was free",
      "Anyone comparing on price; it costs a multiple of the endings your customers already recognise",
    ],
    prose: [
      "Apply the same test as .net: if deleting the word from your description changes what the company does, the ending is doing honest work. A components manufacturer or an electronics distributor is described by it; a SaaS product is not, because in software every company is a tech company and the word has stopped selecting for anything.",
      "It is also priced well above the endings a customer recognises without thinking, so the signal has to be worth the difference the price table on this page sets out.",
    ],
    confusedWith: ["com", "io"],
    faqs: [
      {
        q: "Is .tech a good ending for a software startup?",
        a: "Rarely. In software the word describes everybody, so it selects for nothing, and the reader's inference is that the shorter endings were gone. For hardware, electronics or an engineering services firm the same word is a literal description and reads that way.",
      },
    ],
  },
  {
    tld: "xyz",
    kind: "Unrestricted generic ending",
    what: "The cheapest ending we check, with no eligibility restriction of any kind.",
    signal: "Cheap and unrestricted",
    suits: [
      "Side projects, campaign microsites, hackathon builds and link shorteners",
      "Anything that does not need to outlive the year you registered it in",
    ],
    avoid: [
      "Your primary address if you invoice enterprises or sell to government",
      "Anything that must send transactional email before you have tested how that email lands",
    ],
    prose: [
      "A low registration price is not a hidden bargain. It is what makes an ending easy to register in very large numbers, and reputation on the internet is shared by neighbourhood rather than earned purely on your own behaviour.",
      "That does not make it a bad ending — serious sites sit on it. It does mean that if your password resets, invoices and order confirmations have to arrive, you should test how they land before you commit the brand, not after. For a weekend project none of this applies and the price is the point.",
    ],
    confusedWith: ["com"],
    faqs: [
      {
        q: "Is .xyz safe to use for a business?",
        a: "Nothing about the ending is unsafe technically — it resolves and secures like any other. The risk is reputational and it lands on your email first: cheap endings are registered in bulk, and mail systems are trained on the aggregate rather than on you. Send yourself invoices and password resets from it for a week before you print it on anything.",
      },
    ],
  },
];

interface Ending extends EndingProfile {
  priceInr: number;
  path: string;
  /** Domain form as a reader writes it, e.g. ".co.in". */
  label: string;
}

export function buildDomainPages(ctx: SeoCtx): SeoDoc[] {
  // An ending needs a price AND a profile. Either alone is skipped, silently —
  // the build is not the place to discover that somebody added a TLD.
  const endings: Ending[] = TLDS.flatMap((t) => {
    const profile = PROFILES.find((p) => p.tld === t.tld);
    if (!profile || !isPublishable(profile)) return [];
    return [{ ...profile, priceInr: t.priceInr, path: domainPath(t.tld), label: `.${t.tld}` }];
  });

  const byPrice = [...endings].sort((a, b) => a.priceInr - b.priceInr || a.tld.localeCompare(b.tld));
  const samples = sampleLabels(ctx.corpus);

  return endings.map((e, i) => renderDomainPage(e, byPrice, samples, i, ctx.siteOrigin));
}

interface SampleLabel {
  name: string;
  /** Exactly what scanDomains() queries: normaliseName().alnumLower. */
  dnsLabel: string;
}

/**
 * Sample labels, built with the product's own normaliser rather than a local
 * regex — the point of the section is to show the string the check actually
 * sends, so anything less than the real function would be a nice-looking lie.
 */
function sampleLabels(corpus: SeoCtx["corpus"]): SampleLabel[] {
  const out: SampleLabel[] = [];
  for (const entry of corpus) {
    try {
      const dnsLabel = normaliseName(entry.name).alnumLower;
      if (dnsLabel.length >= 3) out.push({ name: entry.name, dnsLabel });
    } catch {
      // A name the normaliser rejects cannot be checked live either, so it has
      // no business being demonstrated here.
    }
  }
  return out
    .sort((a, b) => a.dnsLabel.length - b.dnsLabel.length || a.name.localeCompare(b.name))
    .slice(0, SAMPLE_POOL);
}

function renderDomainPage(
  e: Ending,
  byPrice: Ending[],
  pool: SampleLabel[],
  index: number,
  siteOrigin: string,
): SeoDoc {
  const total = byPrice.length;
  const cheaperCount = byPrice.filter((o) => o.priceInr < e.priceInr).length;
  const rank = cheaperCount + 1;
  const tied = byPrice.filter((o) => o.tld !== e.tld && o.priceInr === e.priceInr);

  // "1st cheapest" and "14th cheapest" are both things nobody says. The two
  // ends of the table get the words a person would use; everything between
  // them keeps the ordinal, which is the only way to state a middle position.
  const rankLabel = tied.length
    ? `joint ${ordinal(rank)} cheapest of ${total}`
    : rank === 1
      ? `cheapest of ${total}`
      : rank === total
        ? `dearest of ${total}`
        : `${ordinal(rank)} cheapest of ${total}`;
  const rankShort =
    !tied.length && rank === 1
      ? "Cheapest"
      : !tied.length && rank === total
        ? "Dearest"
        : `${ordinal(rank)} cheapest`;

  const com = byPrice.find((o) => o.tld === "com");
  const cheapest = byPrice[0];
  const dearest = byPrice[byPrice.length - 1];
  const sumAll = byPrice.reduce((a, o) => a + o.priceInr, 0);

  // ── Price arithmetic, all of it generated ──────────────────────────
  // Past about three times the .com a percentage stops being readable — nobody
  // pictures 1,442% — so the gap switches to a multiple at that point.
  const vsCom =
    com && com.tld !== e.tld
      ? (() => {
          const ratio = e.priceInr / com.priceInr;
          const pct = Math.round((ratio - 1) * 100);
          // .org and .com are priced level today, and "₹0 more, 0% above" is
          // the sort of sentence that makes a reader distrust the whole table.
          const same = e.priceInr === com.priceInr;
          return {
            same,
            // The card headline: what the difference is.
            headline: same
              ? "Same price"
              : `${inr(Math.abs(e.priceInr - com.priceInr))} ${e.priceInr > com.priceInr ? "more" : "less"}`,
            // The line under it: how big that difference is.
            gap: same
              ? `The same first-year price as ${com.label}`
              : ratio >= 3
                ? `${ratio.toFixed(1).replace(/\.0$/, "")}× the ${com.label} price`
                : `${Math.abs(pct)}% ${pct >= 0 ? "above" : "below"} the ${com.label} price`,
            // The FAQ sentence, which needs a verb rather than a fragment.
            sentence: same
              ? `That is the same first-year price as ${com.label}.`
              : `That is ${inr(Math.abs(e.priceInr - com.priceInr))} ${e.priceInr > com.priceInr ? "more" : "less"} than ${com.label}.`,
          };
        })()
      : null;

  // What the same money holds across the other endings — cheapest first, which
  // is the comparison a founder deciding between one dear ending and a spread
  // is actually making.
  const basket: Ending[] = [];
  let basketTotal = 0;
  for (const o of byPrice) {
    if (o.tld === e.tld) continue;
    if (basketTotal + o.priceInr > e.priceInr) break;
    basket.push(o);
    basketTotal += o.priceInr;
  }
  const basketSentence =
    basket.length >= 2
      ? `${inr(e.priceInr)} — one ${e.label} for a year — also covers ${listJoin(
          basket.map((o) => o.label),
        )} together, ${inr(basketTotal)} for ${basket.length} endings, with ${inr(
          e.priceInr - basketTotal,
        )} left over.`
      : "";

  const tieSentence = tied.length
    ? `It is priced level with ${listJoin(tied.map((o) => o.label))}, which is why the rank above says joint.`
    : "";

  const spreadSentence =
    cheapest && dearest
      ? `Across the ${total} endings the check queries, the range runs from ${cheapest.label} at ${inr(
          cheapest.priceInr,
        )} to ${dearest.label} at ${inr(dearest.priceInr)}; holding all ${total} for one year would cost ${inr(
          sumAll,
        )}.`
      : "";

  // ── Sample addresses ───────────────────────────────────────────────
  // Rotated by the ending's own position so the fourteen pages do not open with
  // the same eight names, and drawn from the shortest labels because length is
  // the thing a founder is weighing when they look at an address.
  // Sorted again after the window is cut: the window can wrap the end of the
  // pool, and the caption under the table promises shortest first.
  const rows =
    pool.length >= SAMPLE_ROWS
      ? Array.from(
          { length: SAMPLE_ROWS },
          (_, k) => pool[(index * SAMPLE_STRIDE + k) % pool.length],
        ).sort((a, b) => a.dnsLabel.length - b.dnsLabel.length || a.name.localeCompare(b.name))
      : [];

  const sampleRows = rows
    .map((s) => {
      const full = `${s.dnsLabel}${e.label}`;
      return `          <tr>
            <td>${cellLink(`/n/${slugify(s.name)}.html`, s.name)}</td>
            <td style="font-family:'JetBrains Mono',monospace">${esc(full)}</td>
            <td class="num">${full.length}</td>
          </tr>`;
    })
    .join("\n");

  // ── The comparison table every page carries ────────────────────────
  const priceRows = byPrice
    .map((o) => {
      const here = o.tld === e.tld;
      const cell = here
        ? `<strong>${esc(o.label)}</strong>`
        : cellLink(o.path, o.label);
      return `          <tr${here ? ` style="background:var(--paper-2)"` : ""}>
            <td>${cell}</td>
            <td class="num">${here ? `<strong>${inr(o.priceInr)}</strong>` : inr(o.priceInr)}</td>
            <td>${esc(o.signal)}</td>
          </tr>`;
    })
    .join("\n");

  // ── Endings a customer types instead ───────────────────────────────
  const confused = e.confusedWith
    .map((t) => byPrice.find((o) => o.tld === t))
    .filter((o): o is Ending => Boolean(o));
  const one = confused.length === 1;
  const confusedHtml = confused.length
    ? `    <p class="note">${one ? "The ending" : "Endings"} a customer will type instead of ${esc(e.label)}: ${confused
        .map((o) => `<a href="${o.path}" style="color:var(--accent);text-decoration:none">${esc(o.label)}</a> at ${inr(o.priceInr)}`)
        .join(", ")}. Whoever owns ${one ? "it" : "those"} collects the traffic and the mistyped email you paid to earn, so price ${one ? "it" : "them"} before you decide, not after.</p>`
    : "";

  // ── FAQ ────────────────────────────────────────────────────────────
  const faqs: Array<{ q: string; a: string }> = [
    {
      q: `How do I check whether a ${e.label} domain is available?`,
      a:
        `Query RDAP, not your browser. RDAP is the Registration Data Access Protocol, the JSON service that has replaced WHOIS: a request to https://rdap.org/domain/yourname${e.label} returns 404 when the registry holds no registration record, which means the name is free, and 200 with the registration data as JSON when it is taken. ` +
        `Typing the address into a browser proves nothing — a registered domain with no website loads nothing at all, which looks identical to a name nobody owns. Naam Dekho runs the RDAP lookup for ${e.label} and the other ${total - 1} endings in one pass when you check a name.`,
    },
    {
      q: `What does a ${e.label} domain cost in India?`,
      a:
        `${inr(e.priceInr)} for the first year on the indicative table this page is built from, making it the ${rankLabel}. ` +
        (vsCom
          ? `${vsCom.sentence} `
          : `Every other ending on this page is compared against it. `) +
        `First-year prices are the discounted ones at most registrars and renewals are usually dearer, so use these to compare endings against each other and take the registrar's checkout page as the number you actually pay.`,
    },
    {
      q: `Who should use ${e.label}, and who should not?`,
      a: `It suits: ${e.suits.join("; ")}. It does not suit: ${e.avoid.join("; ")}.`,
    },
    ...e.faqs,
    {
      q: `Can this page tell me whether a particular ${e.label} name is free?`,
      a: "No, and no static page can. This file was built ahead of time and serves the same bytes to everyone; registrations and expiries happen by the minute, so any specific answer printed here would be stale before it was read. The lookup runs live in the product — type a name and every ending is queried at that moment.",
    },
  ];

  const faqHtml = faqs
    .map(
      (f) => `    <h3 style="font-family:Fraunces,serif;font-size:19px;font-weight:500;margin:22px 0 2px">${esc(f.q)}</h3>
    <p>${esc(f.a)}</p>`,
    )
    .join("\n");

  // ── Internal links ─────────────────────────────────────────────────
  const siblingLinks = byPrice
    .filter((o) => o.tld !== e.tld)
    .map((o) => `      <a href="${o.path}">${esc(o.label)} — ${inr(o.priceInr)}</a>`)
    .join("\n");

  // Both target queries in one line: the price question and the availability
  // question. The brand suffix matches the rest of the site's titles.
  const title = `${e.label} domain price in India — ${inr(e.priceInr)} first year, and how to check availability | Naam Dekho`;

  const metaDesc =
    `${e.label} costs ${inr(e.priceInr)} for the first year (indicative) — the ${rankLabel} endings we check. ` +
    `Who the ending suits and who it does not, how RDAP — the JSON successor to WHOIS — answers whether a name is registered, ` +
    `and the first-year price of all ${total} endings side by side.`;

  const body = `
  <h1>${esc(e.label)} domain — price in India and how availability is checked</h1>
  <p class="lede">${esc(e.what)}</p>
  <p class="lede">Below: what ${esc(e.label)} costs against the other ${total - 1} endings we check, who it suits and who it does not, and exactly how a lookup answers “is this name free” — including what the answer is when the lookup itself fails.</p>

  <div class="tags">
    <span class="tag">${esc(inr(e.priceInr))} first year</span>
    <span class="tag">${esc(rankLabel)}</span>
    <span class="tag">${esc(e.kind)}</span>
    <span class="tag">Checked over RDAP</span>
  </div>

  <section>
    <h2>What ${esc(e.label)} costs</h2>
    <p class="sub">Indicative first-year prices, from the same table the live check prices its tiles from.</p>
    <div class="cards">
      <div class="card">
        <div class="k">First year</div>
        <div class="v">${esc(inr(e.priceInr))}</div>
        <div class="n">Indicative, per year</div>
      </div>
      <div class="card">
        <div class="k">Against the ${total}</div>
        <div class="v" style="font-size:24px">${esc(rankShort)}</div>
        <div class="n">${tied.length ? `Level with ${esc(listJoin(tied.map((o) => o.label)))}` : `of the ${total} endings we check`}</div>
      </div>
      <div class="card">
        <div class="k">${vsCom ? `Against ${esc(com?.label ?? ".com")}` : "The benchmark"}</div>
        <div class="v" style="font-size:24px">${
          vsCom ? esc(vsCom.headline) : "—"
        }</div>
        <div class="n">${
          vsCom
            ? esc(vsCom.gap)
            : "Every other ending on this page is measured against it"
        }</div>
      </div>
    </div>
    <div class="prose" style="margin-top:16px">
      <p>${esc(spreadSentence)}${tieSentence ? ` ${esc(tieSentence)}` : ""}</p>
      ${basketSentence ? `<p>${esc(basketSentence)}</p>` : ""}
    </div>
    <p class="note">These are indicative rupee prices carried in our own table so endings can be compared against each other. They are not a registrar quote. They are also first-year prices: most registrars discount the first year and charge more at renewal, and a domain is a rental you pay every year for as long as the brand exists.</p>
  </section>

  <section>
    <h2>Who ${esc(e.label)} suits</h2>
    <p class="sub">And who it does not. The judgement is ours; the prices above are not.</p>
    <div class="cards">
      <div class="card">
        <div class="k">Suits</div>
        ${bullets(e.suits)}
      </div>
      <div class="card">
        <div class="k">Does not suit</div>
        ${bullets(e.avoid)}
      </div>
    </div>
    <div class="prose" style="margin-top:16px">
${e.prose.map((p) => `      <p>${esc(p)}</p>`).join("\n")}
    </div>
${confusedHtml}
  </section>

  <section>
    <h2>How a ${esc(e.label)} name is actually checked</h2>
    <p class="sub">RDAP — the protocol that replaced WHOIS — and what we report when it does not answer.</p>
    <div class="prose">
      <p>WHOIS was a text service: every registry formatted its reply differently, and telling “no such domain” apart from “the registry is having a bad afternoon” meant parsing English. RDAP, the Registration Data Access Protocol, is the JSON replacement the industry has moved to. It runs over ordinary HTTPS and answers with ordinary HTTP status codes, which is what makes an automated check trustworthy: a 404 is a defined answer rather than a sentence somebody has to interpret.</p>
      <p>A check for a ${esc(e.label)} name is one request to <span style="font-family:'JetBrains Mono',monospace">https://rdap.org/domain/yourname${esc(e.label)}</span>. rdap.org is a bootstrap service: it looks up which registry runs the ending and redirects the query to that registry's own RDAP server, and the status code that comes back is the registry's own. When the domain exists, the JSON that comes back carries the registration events — including the expiry date, where the registry publishes one. Some registries publish it and some do not, so we print it when it is there and leave the field out when it is not, rather than filling it with an estimate.</p>
      <p>All ${total} endings are queried in parallel, so checking a name costs one wait rather than ${total}. Answers are cached for five minutes and the outbound requests are rate-limited on our side — a bucket of sixty, refilling ten a second — because rdap.org is a free public service and staying a polite client of it is what keeps the check working.</p>
    </div>
    <div class="table-scroll" style="margin-top:16px">
      <table class="data">
        <thead>
          <tr><th>What the lookup returns</th><th>What it means</th><th>What we report</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>404</td>
            <td>The registry holds no registration record for the name</td>
            <td>Free, with the first-year price beside it</td>
          </tr>
          <tr>
            <td>200</td>
            <td>The name is registered; the JSON carries its registration events</td>
            <td>Taken, with the expiry date when the registry publishes one</td>
          </tr>
          <tr>
            <td>Any other status</td>
            <td>A reply we cannot read as an answer</td>
            <td>Taken — we would rather be cautious than call something free on a response we did not understand</td>
          </tr>
          <tr>
            <td>Timeout or network error</td>
            <td>No reply within five seconds</td>
            <td>“Could not be checked just now.” Never free</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="note">The rule behind the last two rows is worth stating plainly: “available” is the answer somebody spends money on, so it only ever comes from a real reply. A failed lookup is reported as a failed lookup.</p>
  </section>
${
  sampleRows
    ? `
  <section>
    <h2>What a name looks like as a ${esc(e.label)} address</h2>
    <p class="sub">The label is built the same way the live check builds it: lowercased, with everything that is not a letter or a digit removed — so “Chai &amp; Co” is queried as chaico.</p>
    <div class="table-scroll">
      <table class="data">
        <thead>
          <tr><th>Published name</th><th>The address that would be queried</th><th>Characters</th></tr>
        </thead>
        <tbody>
${sampleRows}
        </tbody>
      </table>
    </div>
    <p class="note">These are strings, not answers. We are showing you exactly what a check would send to the registry for ${esc(e.label)}; whether any of them is free today is a question only a live lookup can answer. Names drawn from <a href="${NAME_INDEX}">our published corpus</a>, shortest labels first.</p>
  </section>`
    : ""
}

  <section>
    <h2>All ${total} endings, first-year price</h2>
    <p class="sub">Every ending the check queries, cheapest first. The same table appears on each of these pages, so whichever one you landed on carries the whole picture.</p>
    <div class="table-scroll">
      <table class="data">
        <thead>
          <tr><th>Ending</th><th>First year</th><th>What it signals</th></tr>
        </thead>
        <tbody>
${priceRows}
        </tbody>
      </table>
    </div>
    <p class="note">Prices are indicative and first-year. Renewal rates are set by the registrar, not by us, and are usually higher than the first year — check the renewal price on the registrar's own page before you commit a brand to an ending.</p>
  </section>

  <section>
    <h2>What a free domain does not settle</h2>
    <p class="sub">A domain is the fastest check and the weakest claim. Three registers can each stop a name that every registrar would happily sell you.</p>
    <div class="prose">
      <p><strong>The company register.</strong> A company name is approved by the MCA through its own name-reservation step, and the registrar can refuse a name that sits too close to a company already on the register. That decision is made on the register, not on the internet: a free ${esc(e.label)} tells you nothing about it, and a name you have already printed is an expensive thing to lose at incorporation.</p>
      <p><strong>Trademark classes.</strong> A trademark is registered per class — 45 of them, goods in 1 to 34 and services in 35 to 45 — and a mark registered in your class can stop you using a name even when every ending in the table above is free. The reverse holds too: a mark in a class unrelated to yours usually cannot. Registering a domain creates no trademark right whatsoever, and taking one that matches somebody else's registered mark is a way to lose the domain rather than a way to keep the name. Start with <a href="${TRADEMARK_HUB}">the 45 classes and what falls in each</a>.</p>
      <p><strong>Handles and listings.</strong> Social handles are first-come and entirely unrelated to the domain registry — Instagram, X, YouTube, LinkedIn and Facebook each have their own queue, and so do the App Store, Play, GitHub, Shopify and Amazon India. A name is only usefully yours when the address, the handles and the register agree, which is why the check runs them together rather than one at a time.</p>
    </div>
  </section>

  <section class="prose">
    <h2>Questions founders ask about ${esc(e.label)}</h2>
${faqHtml}
  </section>

${ctaBlock(
  `Have a name in mind for ${e.label}?`,
  `All ${total} endings are queried live over RDAP in one pass, alongside the social handles and the marketplace listings — with the price beside every ending that comes back free.`,
)}

  <section class="hub-sec">
    <h2>The other ${total - 1} endings</h2>
    <p class="sub">Cheapest first. Each page carries this same price table and the same explanation of the check.</p>
    <div class="grid-links">
${siblingLinks}
    </div>

    <p class="sub" style="margin-top:24px">Before you register</p>
    <div class="related">
      <a href="${TRADEMARK_HUB}">All 45 trademark classes</a>
      <a href="${NAME_INDEX}">The published name corpus</a>
      <a href="/how-it-works">What the check actually does</a>
    </div>
  </section>
`;

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  // The endings printed in the comparison table, in the order they are printed.
  // No prices in the markup: we do not sell domains, and an Offer here would
  // claim we do.
  const listLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Domain endings Naam Dekho checks, cheapest first",
    numberOfItems: byPrice.length,
    itemListElement: byPrice.map((o, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: o.label,
      url: `${siteOrigin}${o.path}`,
    })),
  };

  return {
    path: e.path,
    html: renderSeoPage({
      title,
      metaDesc,
      path: e.path,
      siteOrigin,
      // Two levels, not three. This cluster has no index page, and a crumb
      // pointing at a directory the build never wrote is a 404 in the one
      // element of the page a crawler is guaranteed to follow.
      crumbs: [
        { label: "Home", href: "/" },
        { label: `${e.label} domain` },
      ],
      jsonLd: [faqLd, listLd],
      body,
    }),
    priority: "0.8",
    changefreq: "monthly",
  };
}
