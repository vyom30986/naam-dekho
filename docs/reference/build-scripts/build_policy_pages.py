"""Generate 5 separate policy HTML pages with shared design."""
import os

OUT = os.path.dirname(os.path.abspath(__file__))

# ── Tabs definition (used across all 5 pages) ───────────────────────
TABS = [
    ("privacy",      "Privacy Policy",        "1", "privacy.html"),
    ("terms",        "Terms of Use",          "2", "terms.html"),
    ("cookies",      "Cookies Policy",        "3", "cookies.html"),
    ("cancellation", "Cancellation & Refund", "4", "cancellation-refund.html"),
    ("payments",     "Payment Terms",         "5", "payment-terms.html"),
]

# ── Shared CSS (kept identical across all 5 pages) ──────────────────
SHARED_CSS = """
  :root{
    --bg:#FAF8F3; --bg-2:#F3EFE5; --ink:#0F1419; --ink-2:#3D4751; --ink-3:#6B7480;
    --line:#E5DFD0; --line-2:#D8D0BC; --accent:#B8501C; --accent-2:#7A2E0E;
    --ok-bg:#E7F2E9; --ok-ink:#1B5E20; --warn-bg:#FFF4D9; --warn-ink:#8A5A00;
    --gold:#E8C76A;
    --radius:14px; --radius-lg:18px;
    --shadow-sm:0 1px 2px rgba(15,20,25,0.04), 0 4px 12px -4px rgba(15,20,25,0.06);
    --shadow-md:0 1px 0 rgba(15,20,25,0.04), 0 12px 32px -16px rgba(15,20,25,0.12);
  }
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
  html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
  html,body{margin:0;padding:0;background:var(--bg);color:var(--ink);font-family:'Inter',ui-sans-serif,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
  body{background:radial-gradient(900px 500px at 80% -200px, rgba(184,80,28,0.05), transparent 60%), var(--bg);min-height:100vh}
  a{color:inherit;text-decoration:none}
  .container{max-width:1180px;margin:0 auto;padding:0 24px}

  /* Nav */
  nav.topnav{display:flex;align-items:center;justify-content:space-between;padding:20px 0;border-bottom:1px solid var(--line);position:sticky;top:0;background:rgba(250,248,243,0.9);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);z-index:50}
  .logo{display:flex;align-items:center;gap:12px}
  .logo-mark{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,var(--accent) 0%,var(--accent-2) 100%);display:grid;place-items:center;color:#fff;font-family:'Noto Sans Devanagari',serif;font-weight:600;font-size:17px}
  .logo-text{display:flex;flex-direction:column;line-height:1}
  .logo-text .name{font-family:'Fraunces',serif;font-weight:500;font-size:20px;letter-spacing:-0.02em}
  .logo-text .name em{font-style:italic;color:var(--accent);font-weight:500}
  .logo-text .deva{font-family:'Noto Sans Devanagari',serif;font-size:11px;color:var(--ink-3);margin-top:2px}
  .nav-right{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--ink-2)}
  .nav-right a.nav-link{padding:8px 14px;border-radius:8px;font-weight:500;transition:background .15s}
  .nav-right a.nav-link:hover{background:var(--bg-2)}
  .nav-cta{padding:10px 18px;border:1px solid var(--ink);border-radius:999px;background:var(--ink);color:var(--bg);font-weight:500;font-size:13px}

  /* Hero */
  .page-hero{padding:56px 0 28px;text-align:center;border-bottom:1px solid var(--line)}
  .eyebrow{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:0.14em;margin-bottom:14px}
  h1.page-title{font-family:'Fraunces',serif;font-weight:400;font-size:clamp(32px,4.5vw,52px);line-height:1.05;letter-spacing:-0.025em;margin:0 0 14px;max-width:880px;margin-left:auto;margin-right:auto}
  h1.page-title em{font-style:italic;color:var(--accent)}
  .page-sub{font-size:15px;color:var(--ink-2);max-width:640px;margin:0 auto;line-height:1.65}
  .effective-date{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--ink-3);text-transform:uppercase;letter-spacing:0.1em;margin-top:14px}

  /* Policy tab strip — links to other pages */
  .policy-tabs-wrap{position:sticky;top:75px;background:rgba(250,248,243,0.96);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:30;padding:18px 0;border-bottom:1px solid var(--line)}
  .policy-tabs{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none}
  .policy-tabs::-webkit-scrollbar{display:none}
  .policy-tab{
    padding:11px 18px;border-radius:12px;background:#fff;border:1px solid var(--line);
    font-weight:500;font-size:13.5px;color:var(--ink-2);cursor:pointer;display:inline-flex;align-items:center;gap:8px;
    box-shadow:var(--shadow-sm);transition:all .2s;white-space:nowrap;flex-shrink:0;font-family:inherit;text-decoration:none;
  }
  .policy-tab:hover{border-color:var(--ink-3);transform:translateY(-1px);color:var(--ink)}
  .policy-tab.active{background:var(--ink);color:#FAF8F3;border-color:var(--ink);box-shadow:0 4px 14px -4px rgba(15,20,25,0.3)}
  .policy-tab .num{font-family:'JetBrains Mono',monospace;font-size:10px;background:var(--bg-2);padding:3px 7px;border-radius:5px;color:var(--ink-3)}
  .policy-tab.active .num{background:rgba(255,255,255,0.15);color:#FAF8F3}

  /* Content */
  .policy-section{padding:48px 0 64px}
  .policy-layout{display:grid;grid-template-columns:240px 1fr;gap:48px;align-items:flex-start}

  /* Sidebar */
  .policy-toc{position:sticky;top:160px;font-size:13px;line-height:1.7}
  .policy-toc h4{font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:var(--ink-3);margin:0 0 10px}
  .policy-toc a{display:block;color:var(--ink-3);padding:5px 10px;border-radius:6px;margin-bottom:2px;transition:all .15s;border-left:2px solid transparent}
  .policy-toc a:hover{color:var(--ink);background:var(--bg-2)}
  .policy-toc a.current{color:var(--accent);background:var(--bg-2);border-left-color:var(--accent);font-weight:500}

  /* Body */
  .policy-body{max-width:780px}
  .policy-body h2{font-family:'Fraunces',serif;font-weight:500;font-size:clamp(24px,3vw,32px);letter-spacing:-0.02em;margin:0 0 18px;line-height:1.2;scroll-margin-top:200px}
  .policy-body h3{font-family:'Fraunces',serif;font-weight:500;font-size:22px;margin:42px 0 12px;line-height:1.25;scroll-margin-top:200px}
  .policy-body h4{font-family:'Fraunces',serif;font-weight:500;font-size:18px;margin:28px 0 10px;line-height:1.25;color:var(--ink-2)}
  .policy-body p{font-size:15.5px;line-height:1.75;color:var(--ink-2);margin:0 0 14px}
  .policy-body p b, .policy-body li b{color:var(--ink);font-weight:600}
  .policy-body ul{margin:6px 0 18px;padding-left:0;list-style:none}
  .policy-body ul li{font-size:15px;line-height:1.7;color:var(--ink-2);margin:0 0 10px;padding-left:24px;position:relative}
  .policy-body ul li::before{content:"";position:absolute;left:6px;top:11px;width:6px;height:6px;border-radius:50%;background:var(--accent)}
  .policy-body ol{margin:6px 0 18px;padding-left:24px}
  .policy-body ol li{font-size:15px;line-height:1.7;color:var(--ink-2);margin:0 0 10px}

  /* Tables */
  .policy-body table{width:100%;border-collapse:collapse;margin:18px 0 28px;font-size:13.5px;border:1px solid var(--line);border-radius:12px;overflow:hidden}
  .policy-body th{background:var(--ink);color:#FAF8F3;text-align:left;padding:12px 14px;font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-family:'JetBrains Mono',monospace}
  .policy-body td{padding:12px 14px;border-top:1px solid var(--line);color:var(--ink-2);vertical-align:top;line-height:1.55}
  .policy-body td b{color:var(--ink);font-weight:500}

  /* Callout */
  .callout{background:var(--warn-bg);border-left:4px solid var(--accent);padding:18px 22px;border-radius:0 12px 12px 0;margin:22px 0}
  .callout-title{font-family:'Fraunces',serif;font-weight:600;font-size:15px;color:var(--accent);margin:0 0 6px;display:flex;align-items:center;gap:8px}
  .callout p{font-size:14.5px;color:var(--ink);margin:0;line-height:1.65}

  /* Plain-language summary */
  .plain-summary{background:var(--ok-bg);border:1px solid var(--ok-ink);border-radius:12px;padding:16px 20px;margin:18px 0}
  .plain-summary .label{font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:var(--ok-ink);font-weight:600;margin-bottom:6px}
  .plain-summary p{margin:0;color:var(--ok-ink);font-size:14.5px;line-height:1.6}

  /* Next-prev navigation */
  .policy-nav-bottom{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:48px 0 0;padding-top:32px;border-top:1px solid var(--line)}
  .policy-nav-bottom a{padding:18px 22px;background:#fff;border:1px solid var(--line);border-radius:14px;transition:all .2s;display:flex;flex-direction:column;gap:4px}
  .policy-nav-bottom a:hover{border-color:var(--ink-3);transform:translateY(-2px);box-shadow:var(--shadow-md)}
  .policy-nav-bottom .label{font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:var(--ink-3)}
  .policy-nav-bottom .name{font-family:'Fraunces',serif;font-weight:500;font-size:18px;color:var(--ink)}
  .policy-nav-bottom .next{text-align:right}

  /* Footer */
  .site-footer{background:#0F1419;color:#C5B58A;padding:48px 0 24px;margin-top:40px}
  .footer-grid{display:grid;grid-template-columns:1.8fr 1fr 1fr 1fr;gap:36px;padding-bottom:32px;border-bottom:1px solid rgba(245,235,216,0.1)}
  .footer-brand .logo-text .name{color:#F5EBD8}
  .footer-brand .logo-text .name em{color:var(--gold)}
  .footer-brand .logo-text .deva{color:#8A7E5E}
  .footer-tagline{font-size:13px;color:#8A9099;max-width:340px;margin:16px 0 0;line-height:1.6}
  .footer-col h4{font-family:'Fraunces',serif;font-size:14px;font-weight:500;color:#F5EBD8;margin:0 0 12px}
  .footer-col a{display:block;color:#8A9099;font-size:13px;padding:4px 0;transition:color .15s}
  .footer-col a:hover{color:var(--gold)}
  .footer-bottom{padding-top:20px;font-size:11px;color:#6B7480;font-family:'JetBrains Mono',monospace;text-align:center}

  /* Responsive */
  @media (max-width: 1024px){
    .policy-layout{grid-template-columns:1fr}
    .policy-toc{position:static;display:none}
    .footer-grid{grid-template-columns:1fr 1fr}
  }
  @media (max-width: 760px){
    .container{padding:0 18px}
    .nav-right .nav-link{display:none}
    .page-hero{padding:36px 0 24px}
    .policy-tabs-wrap{top:69px;padding:14px 0}
    .policy-tabs{margin:0 -18px;padding:0 18px}
    .policy-tab{padding:10px 14px;font-size:13px}
    .policy-section{padding:32px 0 48px}
    .policy-body h2{font-size:24px}
    .policy-body h3{font-size:18px;margin:32px 0 10px}
    .policy-body p, .policy-body ul li, .policy-body ol li{font-size:14.5px}
    .policy-body table{font-size:12px}
    .policy-body th, .policy-body td{padding:8px 10px}
    .policy-nav-bottom{grid-template-columns:1fr;gap:10px}
    .policy-nav-bottom .next{text-align:left}
    .footer-grid{grid-template-columns:1fr;gap:24px}
  }
"""

NAV = """
<nav class="topnav">
  <div class="container" style="display:contents">
    <a href="index.html" class="logo">
      <span class="logo-mark">ना</span>
      <span class="logo-text">
        <span class="name">Naam <em>Dekho</em></span>
        <span class="deva">नाम देखो</span>
      </span>
    </a>
    <div class="nav-right">
      <a href="how-it-works.html" class="nav-link">How it works</a>
      <a href="pricing.html" class="nav-link">Pricing</a>
      <a href="pricing.html#agencies" class="nav-link">For agencies</a>
      <a href="sign-in.html" class="nav-cta">Sign in</a>
    </div>
  </div>
</nav>
"""

FOOTER = """
<footer class="site-footer">
  <div class="container footer-grid">
    <div class="footer-brand">
      <a href="index.html" class="logo">
        <span class="logo-mark">ना</span>
        <span class="logo-text">
          <span class="name">Naam <em>Dekho</em></span>
          <span class="deva">नाम देखो</span>
        </span>
      </a>
      <p class="footer-tagline">India's first all-in-one name verification platform. From boardroom to baby cot — one search, every check that matters.</p>
    </div>
    <div class="footer-col">
      <h4>Product</h4>
      <a href="index.html">Home</a>
      <a href="how-it-works.html">How it works</a>
      <a href="pricing.html">Pricing</a>
      <a href="sign-in.html">Sign in</a>
    </div>
    <div class="footer-col">
      <h4>Legal</h4>
      <a href="privacy.html">Privacy policy</a>
      <a href="terms.html">Terms of use</a>
      <a href="cookies.html">Cookies policy</a>
      <a href="cancellation-refund.html">Cancellation & refund</a>
      <a href="payment-terms.html">Payment terms</a>
    </div>
    <div class="footer-col">
      <h4>Contact</h4>
      <a href="mailto:hello@naamdekho.in">hello@naamdekho.in</a>
      <a href="mailto:support@naamdekho.in">support@naamdekho.in</a>
      <a href="mailto:refunds@naamdekho.in">refunds@naamdekho.in</a>
      <a href="mailto:grievance@naamdekho.in">grievance@naamdekho.in</a>
    </div>
  </div>
  <div class="container footer-bottom">© 2026 Naam Dekho Technologies Pvt Ltd · नाम देखो · All rights reserved</div>
</footer>
"""

SCRIPT = """
<script>
  // Active anchor in side TOC as user scrolls
  const allTocLinks = document.querySelectorAll('.toc-link');
  const allHeadings = document.querySelectorAll('.policy-body h2, .policy-body h3');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting && e.target.id) {
        const id = e.target.id;
        allTocLinks.forEach(l => l.classList.toggle('current', l.getAttribute('href') === '#' + id));
      }
    });
  }, { rootMargin: '-180px 0px -70% 0px' });
  allHeadings.forEach(h => h.id && observer.observe(h));
</script>
"""


def render_tabs(current_id):
    pills = []
    for tid, label, num, href in TABS:
        cls = "policy-tab active" if tid == current_id else "policy-tab"
        pills.append(f'<a href="{href}" class="{cls}"><span class="num">{num}</span>{label}</a>')
    return f'''
<div class="policy-tabs-wrap">
  <div class="container">
    <div class="policy-tabs" role="tablist">
      {"".join(pills)}
    </div>
  </div>
</div>
'''


def render_prev_next(current_id):
    ids = [t[0] for t in TABS]
    idx = ids.index(current_id)
    prev_tab = TABS[idx - 1] if idx > 0 else None
    next_tab = TABS[idx + 1] if idx < len(TABS) - 1 else None
    parts = ['<div class="policy-nav-bottom">']
    if prev_tab:
        parts.append(f'<a href="{prev_tab[3]}"><span class="label">← Previous</span><span class="name">{prev_tab[1]}</span></a>')
    else:
        parts.append('<span></span>')
    if next_tab:
        parts.append(f'<a href="{next_tab[3]}" class="next"><span class="label">Next →</span><span class="name">{next_tab[1]}</span></a>')
    else:
        parts.append('<span></span>')
    parts.append('</div>')
    return "".join(parts)


def render_page(current_id, page_title, hero_title_html, hero_sub, toc_items, body_html, head_title):
    toc = "".join([f'<a href="#{i_id}" class="toc-link{" current" if idx == 0 else ""}">{label}</a>'
                   for idx, (i_id, label) in enumerate(toc_items)])
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#FAF8F3" />
<title>{head_title} — Naam Dekho</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+Devanagari:wght@400;500;600&display=swap" rel="stylesheet" />
<style>{SHARED_CSS}</style>
</head>
<body>

{NAV}

<header class="page-hero">
  <div class="container">
    <div class="eyebrow">— Legal</div>
    <h1 class="page-title">{hero_title_html}</h1>
    <p class="page-sub">{hero_sub}</p>
    <div class="effective-date">Effective date — 15 May 2026  ·  Version 1.0</div>
  </div>
</header>

{render_tabs(current_id)}

<section class="policy-section">
  <div class="container policy-layout">
    <aside class="policy-toc">
      <h4>On this page</h4>
      {toc}
    </aside>
    <div class="policy-body">
      {body_html}
      {render_prev_next(current_id)}
    </div>
  </div>
</section>

{FOOTER}
{SCRIPT}
</body>
</html>
"""


# ──────────────────────────────────────────────────────────────────
# PRIVACY POLICY CONTENT
# ──────────────────────────────────────────────────────────────────
privacy_body = """
<h2 id="intro">1. Privacy Policy</h2>
<p>This Privacy Policy explains how <b>Naam Dekho Technologies Private Limited</b> ("Naam Dekho", "we", "us") collects, uses, stores, shares and protects the Personal Data of its users. It is published pursuant to and in compliance with the <b>Digital Personal Data Protection Act, 2023</b> (the "DPDP Act"), the <b>Information Technology Act, 2000</b>, and the <b>Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011</b>.</p>

<div class="plain-summary">
  <div class="label">⌘ Plain-language summary</div>
  <p>Free-tier searches collect almost nothing — only your IP address and the name you typed, both for a short period and only to fight abuse and improve quality. Paid tiers collect your phone number, email and payment information so we can sign you in, charge you, and deliver your PDF report. <b>We do not sell your data. We do not train models on your data. We store as little as possible, for as short as possible.</b></p>
</div>

<h3 id="collect">Data we collect</h3>
<h4>Automatically collected</h4>
<ul>
  <li>IP address, browser type, operating system, device type, screen resolution</li>
  <li>Referring URL, page navigation timestamps, clickstream data within the Platform</li>
  <li>Approximate geographic location derived from IP (city / state granularity)</li>
  <li>Cookie identifiers — see our <a href="cookies.html" style="color:var(--accent)">Cookies Policy</a></li>
</ul>

<h4>Provided by you</h4>
<ul>
  <li>The proposed business or baby name being checked ("Search Input")</li>
  <li>Optional industry/category indicator</li>
  <li>Phone number — required for sign-in to Paid Tiers (Firebase Authentication or MSG91 via OTP)</li>
  <li>Email address — captured at sign-in or for receipt and PDF delivery</li>
  <li>Display name, profile image (if voluntarily provided)</li>
  <li>Payment metadata — gateway transaction ID, amount, time, status. <b>We do NOT store card numbers, CVV, UPI handles, account numbers, or full bank details</b> — those are tokenised by Razorpay (primary) or Paytm (fallback) under RBI directions</li>
  <li>Agency lead-form data — name, role, company, firm type, email, phone, volume estimate, budget range, notes</li>
  <li>Support communications — emails, chats, call recordings (where lawful)</li>
</ul>

<h4>We do NOT collect</h4>
<ul>
  <li><b>Children's data.</b> Baby mode is for parents/guardians. We do not collect any date of birth, photograph, school, address, biometric or health information of a child</li>
  <li><b>Sensitive personal data.</b> No financial-account, biometric, genetic, sexual-orientation, religion, political-belief, criminal-record or trade-union data</li>
  <li><b>Free-Tier profiles.</b> Free-Tier Search Inputs are not associated with a user identity beyond the IP address; we do not build profiles on Free-Tier users</li>
</ul>

<h3 id="use">How we use your data — and our lawful basis</h3>
<table>
  <thead><tr><th>Purpose</th><th>Data used</th><th>Lawful basis (DPDP Act)</th></tr></thead>
  <tbody>
    <tr><td><b>Perform the requested search</b></td><td>Search Input, IP</td><td>Performance / Consent §6</td></tr>
    <tr><td><b>Sign-in via OTP</b></td><td>Phone, email, OTP</td><td>Consent §6</td></tr>
    <tr><td><b>Payment processing & GST invoicing</b></td><td>Phone, email, txn metadata, GSTIN</td><td>Contract / Statutory §7(b), §7(g)</td></tr>
    <tr><td><b>Deliver PDF report</b></td><td>Email/phone, scan_id, object key</td><td>Performance of contract</td></tr>
    <tr><td><b>Customer support</b></td><td>What you share</td><td>Legitimate purpose §7(i)</td></tr>
    <tr><td><b>Fraud, abuse, rate-limit</b></td><td>IP, device fingerprint</td><td>Legitimate purpose §7(i)</td></tr>
    <tr><td><b>Aggregate analytics</b></td><td>De-identified event logs</td><td>Legitimate (no Personal Data after aggregation)</td></tr>
    <tr><td><b>Transactional comms</b></td><td>Phone, email</td><td>Performance of contract</td></tr>
    <tr><td><b>Marketing</b></td><td>Email, name, tier</td><td>Consent — opt-in only, clear opt-out</td></tr>
    <tr><td><b>Legal compliance, court orders</b></td><td>What is lawfully called for</td><td>Statutory §7(g)</td></tr>
  </tbody>
</table>

<h3 id="share">Who we share with</h3>
<p><b>We do not sell, rent or trade Personal Data.</b> We share only with the following limited categories of recipients, each contractually bound to use the data solely for the purposes for which we shared it:</p>
<ul>
  <li><b>Payment processors</b> — Razorpay (primary) and Paytm Payment Services (fallback) — both RBI-licensed Payment Aggregators</li>
  <li><b>Authentication providers</b> — Firebase Authentication and/or MSG91 — strictly to deliver and verify OTPs</li>
  <li><b>Infrastructure providers</b> — AWS India (managed PG/S3), Cloudflare (edge, R2), Hetzner (compute) — all data encrypted at rest</li>
  <li><b>Observability vendors</b> — Sentry, Grafana Labs, Better Stack — logs scrubbed of Personal Data where feasible</li>
  <li><b>Professional advisors</b> — CAs, lawyers, auditors — bound by professional confidentiality</li>
  <li><b>Law-enforcement / regulators</b> — only on lawful order or compulsion</li>
  <li><b>Successors in interest</b> — in case of merger/acquisition, the successor is bound by terms no less protective than this policy</li>
</ul>

<h3 id="thirdparty">Third-Party Sources are NOT data recipients</h3>
<p>When the Platform checks a Third-Party Source (e.g. MCA21, IP India), <b>no Personal Data of yours is transmitted to that source</b>. The query consists only of the Search Input — the proposed name string — together with the technical headers necessary for the request. Your identity remains private to the Platform.</p>

<h3 id="transfer">Cross-border data transfers</h3>
<p>Some of our infrastructure providers operate facilities outside India. To the extent that Personal Data is processed in a foreign jurisdiction, such processing is undertaken in compliance with Section 16 of the DPDP Act. We give preference to providers offering India-region data residency (AWS Mumbai, Cloudflare APAC).</p>

<h3 id="retain">Data retention</h3>
<table>
  <thead><tr><th>Category</th><th>Retention</th><th>Reason</th></tr></thead>
  <tbody>
    <tr><td>Free-Tier Search Inputs (anonymous)</td><td>Hashed within 30 days</td><td>Abuse detection, then anonymised</td></tr>
    <tr><td>User account data (phone, email, name)</td><td>Until deletion + 90 days backup grace</td><td>Account access</td></tr>
    <tr><td>Paid scan history</td><td>3 years from payment</td><td>IT and GST records</td></tr>
    <tr><td>Payment records, invoices</td><td>8 years (CGST Act §36)</td><td>Statutory requirement</td></tr>
    <tr><td>PDF reports on R2/S3</td><td>12 months from generation</td><td>Download convenience</td></tr>
    <tr><td>Server logs (with IP)</td><td>90 days</td><td>IT Act §67C — intermediaries</td></tr>
    <tr><td>Agency lead-form submissions</td><td>24 months or until conversion</td><td>Sales lifecycle</td></tr>
    <tr><td>Support tickets, recordings</td><td>18 months</td><td>QA, training, dispute</td></tr>
  </tbody>
</table>

<h3 id="rights">Your rights as a Data Principal</h3>
<p>Under Chapter III of the DPDP Act, you have the following rights, which we honour through dedicated channels:</p>
<ul>
  <li><b>Right to information</b> — about categories processed, recipients shared with, and a description of such data (§11)</li>
  <li><b>Right to correction / erasure</b> of inaccurate or unnecessary data (§12)</li>
  <li><b>Right to nominate</b> another individual to exercise rights on your behalf in case of death or incapacity (§13)</li>
  <li><b>Right of grievance redressal</b> (§14)</li>
  <li><b>Right to withdraw consent</b> at any time (§6(4))</li>
  <li><b>Acknowledgement within 48 hours; substantive response within 30 days.</b> Write to <a href="mailto:grievance@naamdekho.in" style="color:var(--accent)">grievance@naamdekho.in</a></li>
</ul>

<h3 id="security">Security of your data</h3>
<p>We implement reasonable security practices commensurate with the nature and purposes of processing, in line with IT Rules 2011 Rule 8 and DPDP Act §8(5):</p>
<ul>
  <li>TLS 1.3 on all User-facing endpoints; HSTS; secure cookies; content-security policy</li>
  <li>AES-256 at-rest encryption for PostgreSQL, R2/S3 and full-disk compute</li>
  <li>Column-level encryption (pgcrypto) for phone and email columns</li>
  <li>Role-based access control, least-privilege, multi-factor auth for staff, hardware keys for production</li>
  <li>VPC segmentation, security groups, bastion-only SSH</li>
  <li>Quarterly third-party pen-test, continuous dependency scanning, secure-code review</li>
  <li>Incident-response plan with 72-hour Data Protection Board notification under DPDP §8(6)</li>
</ul>

<h3 id="children">Children's data</h3>
<p>The Platform is not directed at children under the age of 18, and we do not knowingly process the Personal Data of any child. Baby mode is intended for parents and guardians; the only data collected through Baby mode is the proposed name, which is not associated with any identifiable child. If you believe we have inadvertently collected information that could identify a minor, write to grievance@naamdekho.in and we will promptly delete such information.</p>

<h3 id="updates">Updates to this policy</h3>
<p>We may update this Privacy Policy from time to time to reflect changes in our practices, in our services, or in Applicable Laws. The Effective Date at the top of this page indicates when the policy was last updated. <b>Material changes will be communicated to registered Users by email and through a prominent in-Platform notice.</b> Continued use after an update constitutes acceptance.</p>

<h3 id="contact">Grievance Officer & Data Protection Officer</h3>
<p>Pursuant to IT Rules 2011 Rule 5(9) and DPDP Act §8(9), the following individual is designated as our Grievance Officer:</p>
<ul>
  <li><b>Name:</b> [To be filled by the Company]</li>
  <li><b>Designation:</b> Grievance Officer & Data Protection Officer</li>
  <li><b>Email:</b> <a href="mailto:grievance@naamdekho.in" style="color:var(--accent)">grievance@naamdekho.in</a></li>
  <li><b>Postal address:</b> [Registered address of the Company]</li>
  <li><b>Phone (working hours, Mon–Fri, 10:00–18:00 IST):</b> [To be filled]</li>
  <li><b>Acknowledgement:</b> within 48 hours.  <b>Substantive response:</b> within 30 days.</li>
</ul>
"""

privacy_toc = [
    ("intro", "Introduction"),
    ("collect", "Data we collect"),
    ("use", "How we use it"),
    ("share", "Who we share with"),
    ("thirdparty", "Third-Party Sources"),
    ("transfer", "Cross-border transfers"),
    ("retain", "Data retention"),
    ("rights", "Your rights"),
    ("security", "Security"),
    ("children", "Children's data"),
    ("updates", "Updates"),
    ("contact", "Grievance Officer"),
]

# ──────────────────────────────────────────────────────────────────
# TERMS OF USE CONTENT
# ──────────────────────────────────────────────────────────────────
terms_body = """
<h2 id="accept">2. Terms of Use</h2>
<p>These Terms of Use constitute a legally binding agreement between <b>you</b> and <b>Naam Dekho Technologies Private Limited</b>. By accessing, browsing, registering on, or transacting upon the Platform, you signify unconditional acceptance and agree to be bound by these Terms, together with the <a href="privacy.html" style="color:var(--accent)">Privacy Policy</a>, the <a href="cookies.html" style="color:var(--accent)">Cookies Policy</a>, the <a href="cancellation-refund.html" style="color:var(--accent)">Cancellation & Refund Policy</a> and the <a href="payment-terms.html" style="color:var(--accent)">Payment Terms</a>. These Terms are an electronic record within the meaning of Section 2(t) of the Information Technology Act, 2000.</p>

<h3 id="eligible">Eligibility</h3>
<ul>
  <li>Use of the Platform is permitted only to persons competent to contract under the Indian Contract Act, 1872. Persons below 18, undischarged insolvents, and persons of unsound mind may not transact upon Paid Tiers.</li>
  <li>Use by a juridical person (company, LLP, partnership, association) is deemed use by its authorised representative, who warrants authority to bind that juridical person.</li>
  <li>Baby mode is intended only for parents, guardians or family elders of the child being named. <b>You may not use Baby mode to research, compile, profile, market to, or identify any minor without parental consent.</b></li>
  <li>Use from any jurisdiction in which such use would be unlawful is expressly prohibited.</li>
</ul>

<h3 id="account">Account registration and authentication</h3>
<ul>
  <li>Free Tier may be used without account registration.</li>
  <li>Paid Tiers require sign-in via phone-number OTP. You warrant that the phone number supplied is lawfully held by you.</li>
  <li>You are solely responsible for the confidentiality of your phone, SIM and OTP, and for all activity under your account.</li>
  <li>Each natural person may hold one account; each agency may hold one organisational account.</li>
</ul>

<h3 id="scope">Scope and nature of the service</h3>
<div class="callout">
  <div class="callout-title">⚠ Critical disclosure</div>
  <p>Naam Dekho is a <b>decision-support tool</b>. The Results we present are informational in nature and are <b>not a substitute for legal, tax, accounting or naming consultancy advice</b>. You must consult a qualified professional — a CA, an advocate, a trademark agent, or a registered naming consultant — before incorporation, trademark filing, domain purchase, brand launch, or formal naming of a child.</p>
</div>
<p>The Platform performs queries against publicly available data sources and consolidates the results. <b>The Platform does NOT:</b></p>
<ul>
  <li>File any application, return, registration or document with any Government authority on your behalf</li>
  <li>Reserve, register or pay for any domain, trademark, social handle or company name</li>
  <li>Provide legal, tax, regulatory, financial or astrological advice</li>
  <li>Guarantee the registrability, distinctiveness or commercial success of any name</li>
  <li>Guarantee that a name found "available" today will remain available later, or that a name found "taken" today will not be released later</li>
</ul>

<h3 id="thirdparty">Third-Party Sources — disclaimers, delays and availability</h3>
<div class="callout">
  <div class="callout-title">⚠ This section is critical to your understanding of the service</div>
  <p>The Platform's output depends entirely on the availability, accuracy and responsiveness of Third-Party Sources. <b>We do not control these sources. We do not guarantee that any source will be available at the time of your search, or that any source's data will be accurate, current or complete.</b></p>
</div>

<h4>Source unavailability and downtime</h4>
<ul>
  <li><b>Government portals</b> (MCA21, IP India, Copyright, GST, FSSAI, DPIIT and others) routinely experience scheduled and unscheduled downtime, redesigns, blocking of automated access, throttling, CAPTCHA challenges, infrastructure migrations and policy changes. <b>We have no advance notice of, and no influence over, any such event.</b></li>
  <li><b>Domain registries, registrars and WHOIS servers</b> experience similar outages and rate-limiting.</li>
  <li><b>Social-media platforms</b> unilaterally and frequently change their public API contracts, terms, rate limits, authentication and the data they expose.</li>
  <li>When a source is unavailable, slow or returning errors, the corresponding tile displays "Checking…", "Pending" or "Source temporarily unavailable", and the verdict is computed as if that source returned no result.</li>
</ul>

<h4>Delays in result delivery</h4>
<ul>
  <li>Target time for Free-Tier scan: ~ <b>4 seconds</b>. Target for Deep Legal Scan: ~ <b>40 seconds</b>. These are <b>best-effort targets, not service-level guarantees</b>.</li>
  <li>Actual delivery time will vary based on Third-Party Source responsiveness, network conditions, CAPTCHA latency, and platform load. Delays may extend to several minutes or, exceptionally, result in incomplete delivery.</li>
  <li><b>A delay or failure attributable wholly or in substantial part to any Third-Party Source shall not constitute a deficiency in service within the meaning of the Consumer Protection Act, 2019, and shall not entitle you to a refund or compensation</b>, except as expressly provided in the Cancellation & Refund Policy.</li>
</ul>

<h4>Accuracy of source data</h4>
<ul>
  <li>Data returned by Third-Party Sources is presented in substantially the same form in which it was returned. <b>We do not verify, audit or independently corroborate the contents of source databases.</b></li>
  <li>Government registers are imperfect — they contain typographical errors, stale entries, missing entries (e.g. recently filed trademarks not yet indexed), and conflicting entries.</li>
  <li>A search returning "No conflict" today does not exempt you from the obligation to perform a formal pre-incorporation or pre-filing search before any binding step.</li>
</ul>

<h3 id="warranty">No warranty</h3>
<p>The Platform is provided on an <b>"as-is" and "as-available"</b> basis. To the maximum extent permitted by Applicable Laws, we expressly disclaim all warranties, whether express, implied, statutory or otherwise, including warranties of merchantability, fitness for a particular purpose, title and non-infringement; warranties that the Platform will be uninterrupted, error-free, timely, secure or virus-free; warranties as to the accuracy, completeness, reliability, currency or non-misleading nature of any Result; and warranties that the Chaldean numerology reading, linguistic-landmine detection or any other interpretive layer will produce outcomes you find favourable.</p>

<h3 id="liability">Limitation of liability</h3>
<div class="callout">
  <div class="callout-title">⚠ Maximum aggregate liability cap</div>
  <p>Our total aggregate liability arising out of or relating to the Platform, regardless of the form of action or the theory of liability, shall not in any event exceed <b>the higher of (a) the aggregate fees paid by you to us in the three (3) months immediately preceding the event giving rise to the claim, or (b) Indian Rupees One Thousand (₹1,000)</b>.</p>
</div>
<p>Without limiting the foregoing, we shall not be liable for any:</p>
<ul>
  <li>Indirect, special, incidental, consequential, exemplary or punitive damages — including lost profits, revenue, business, goodwill, opportunity, brand value, rebrand costs, lost customers or contracts</li>
  <li>Damage from relying on a Result that proved incomplete, stale or inaccurate where the issue was attributable to a Third-Party Source</li>
  <li>Damage from any delay attributable to a Third-Party Source or Force Majeure Event</li>
  <li>Damage from proceeding with an incorporation, trademark filing or formal child-naming without consulting a qualified professional</li>
  <li>Damage from unauthorised access to your account due to your failure to safeguard credentials</li>
</ul>
<p>Nothing in this clause excludes liability for (a) death or personal injury caused by our negligence; (b) fraud or fraudulent misrepresentation; or (c) any other liability which cannot lawfully be excluded under Applicable Laws.</p>

<h3 id="conduct">Prohibited conduct</h3>
<p>You undertake that you shall not, and shall not permit any third party to:</p>
<ul>
  <li>Use the Platform in violation of any Applicable Laws or these Terms</li>
  <li>Use the Platform for harassment, defamation, impersonation or doxxing of any person</li>
  <li>Use any automated means (scrapers, bots, crawlers) to access the Platform, except under a written Agency / API agreement with us</li>
  <li>Probe, scan, test the vulnerability of, or breach the security of the Platform</li>
  <li>Reverse-engineer, decompile or disassemble any portion of the Platform</li>
  <li>Submit Search Inputs containing obscene, defamatory, racially or religiously offensive or unlawful content</li>
  <li>Use Results or PDF reports for any purpose other than your own bona fide name-evaluation — bulk redistribution, resale or use of Results to construct a competing service is expressly prohibited</li>
  <li>Use the Platform in connection with money-laundering, terrorist financing, fraud or any criminal offence</li>
  <li>Interfere with the proper operation of the Platform — including DDoS, malicious code, or vulnerability exploitation</li>
</ul>

<h3 id="ip">Intellectual property</h3>
<ul>
  <li>All intellectual property in the Platform — source code, UI design, editorial content, the proprietary 12-step process flow, the Chaldean numerology engine and industry-fit overlay, the linguistic-landmine methodology, the brand, the trademarks, the trade dress and the documentation — is our exclusive property under the Copyright Act 1957, the Trade Marks Act 1999 and the Designs Act 2000. <b>All rights reserved.</b></li>
  <li>No portion may be reproduced, distributed, modified or commercially exploited without our prior written consent, except (i) for your own non-commercial reference, (ii) for a single downloaded PDF report used by you and your professional advisor, and (iii) for any use permitted by Applicable Laws.</li>
  <li>Third-party trademarks referenced are the property of their respective owners and are used only on a nominative-fair-use basis.</li>
</ul>

<h3 id="indemnity">Indemnification</h3>
<p>You shall indemnify, defend and hold harmless Naam Dekho, our directors, officers, employees, contractors and agents from and against any and all claims, demands, suits, proceedings, damages, losses, costs and expenses (including reasonable attorneys' fees) arising out of or in connection with: (a) your use of the Platform in violation of these Terms or Applicable Laws; (b) your submission of unlawful or infringing User Content; (c) your negligent or wrongful conduct; (d) any third-party claim arising from such use, submission or conduct.</p>

<h3 id="availability">Service availability, modifications and suspension</h3>
<ul>
  <li>The Platform is generally available 24×7 but we give <b>no warranty of uninterrupted availability</b>. The Platform may be temporarily unavailable due to scheduled maintenance, unscheduled outages, infrastructure failure, third-party-dependency outage or Force Majeure.</li>
  <li>We reserve the right to modify, suspend or discontinue any feature at any time, with or without notice.</li>
  <li>We may suspend or terminate access of any User who, in our reasonable opinion, is in breach of these Terms or poses a security or reputational risk.</li>
</ul>

<h3 id="force">Force Majeure</h3>
<p>Neither party shall be liable for any failure or delay caused by a Force Majeure Event — including acts of God, war, terrorism, civil disturbance, strikes, regulatory action, pandemic, internet or telecommunications outage, denial-of-service attack, and <b>any outage, redesign, blocking, throttling or unavailability of any Third-Party Source</b>. If a Force Majeure Event continues for more than 30 consecutive days, either party may terminate the affected service by written notice.</p>

<h3 id="law">Governing law and dispute resolution</h3>
<ul>
  <li>These Terms shall be governed by the laws of the Republic of India.</li>
  <li>Subject to arbitration, the courts at <b>Bangalore, Karnataka</b> shall have exclusive jurisdiction.</li>
  <li>Any dispute shall first be attempted amicably for 30 days. Failing that, the dispute shall be referred to and finally resolved by arbitration under the Arbitration and Conciliation Act, 1996, by a sole arbitrator. Seat and venue: Bangalore. Language: English.</li>
</ul>
"""

terms_toc = [
    ("accept", "Acceptance"),
    ("eligible", "Eligibility"),
    ("account", "Account & sign-in"),
    ("scope", "Scope & nature"),
    ("thirdparty", "Third-Party delays"),
    ("warranty", "No warranty"),
    ("liability", "Limitation of liability"),
    ("conduct", "Prohibited conduct"),
    ("ip", "Intellectual property"),
    ("indemnity", "Indemnity"),
    ("availability", "Availability"),
    ("force", "Force majeure"),
    ("law", "Governing law"),
]

# ──────────────────────────────────────────────────────────────────
# COOKIES POLICY CONTENT
# ──────────────────────────────────────────────────────────────────
cookies_body = """
<h2 id="what">3. Cookies Policy</h2>
<p>A "cookie" is a small text file that a website places on your browser or device. Cookies allow the website to recognise you on subsequent visits, remember your preferences, and enable certain functionality. Some cookies expire at the end of the session ("session cookies"); others persist for a defined period ("persistent cookies"). For simplicity, we use "cookies" to refer to all tracking technologies, including HTML5 local storage, IndexedDB, web beacons / pixel tags, and device fingerprinting.</p>

<h3 id="cats">Categories we use</h3>

<h4>Strictly Necessary cookies</h4>
<p>Essential for the Platform to function. Cannot be disabled without rendering the Platform substantially non-functional.</p>
<table>
  <thead><tr><th>Cookie</th><th>Purpose</th><th>Duration</th><th>Set by</th></tr></thead>
  <tbody>
    <tr><td><b>naamdekho-mode</b></td><td>Remembers Startup vs Baby mode</td><td>12 months</td><td>Naam Dekho</td></tr>
    <tr><td><b>nd_session</b></td><td>Sign-in session token (HttpOnly, Secure, SameSite=Lax)</td><td>Session / 30 days</td><td>Naam Dekho</td></tr>
    <tr><td><b>nd_csrf</b></td><td>CSRF protection token</td><td>Session</td><td>Naam Dekho</td></tr>
    <tr><td><b>__cf_bm</b></td><td>Cloudflare bot-management</td><td>30 minutes</td><td>Cloudflare</td></tr>
    <tr><td><b>rzp_*</b></td><td>Razorpay checkout session</td><td>Session</td><td>Razorpay</td></tr>
    <tr><td><b>paytm_*</b></td><td>Paytm fallback gateway session</td><td>Session</td><td>Paytm</td></tr>
  </tbody>
</table>

<h4>Functional cookies</h4>
<p>Enable enhanced functionality and personalisation. If you disable these, some services may not function properly.</p>
<table>
  <thead><tr><th>Cookie</th><th>Purpose</th><th>Duration</th><th>Set by</th></tr></thead>
  <tbody>
    <tr><td><b>nd_last_search</b></td><td>Restores last name searched</td><td>30 days</td><td>Naam Dekho</td></tr>
    <tr><td><b>nd_audience</b></td><td>Pricing audience tab</td><td>3 months</td><td>Naam Dekho</td></tr>
    <tr><td><b>nd_theme</b></td><td>Light/dark theme preference</td><td>12 months</td><td>Naam Dekho</td></tr>
  </tbody>
</table>

<h4>Analytics & Performance cookies</h4>
<p>Help us count visits and traffic sources, so we can measure and improve performance. All info collected is aggregated.</p>
<table>
  <thead><tr><th>Cookie</th><th>Purpose</th><th>Duration</th><th>Set by</th></tr></thead>
  <tbody>
    <tr><td><b>_pk_id.*</b></td><td>Self-hosted Plausible / Matomo visitor analytics</td><td>13 months</td><td>Naam Dekho (self-hosted)</td></tr>
    <tr><td><b>_pk_ses.*</b></td><td>Analytics session</td><td>30 minutes</td><td>Naam Dekho (self-hosted)</td></tr>
    <tr><td><b>nd_perf</b></td><td>Real-user performance metrics (Web Vitals)</td><td>24 hours</td><td>Naam Dekho</td></tr>
  </tbody>
</table>

<h4>Marketing cookies — only with consent</h4>
<p>May be set by advertising or marketing partners to show relevant ads on other sites. <b>We will not set marketing cookies without your explicit opt-in via the cookie consent banner.</b></p>
<table>
  <thead><tr><th>Cookie</th><th>Purpose</th><th>Duration</th><th>Set by</th></tr></thead>
  <tbody>
    <tr><td><b>_fbp</b></td><td>Meta (Facebook) advertising conversion measurement</td><td>3 months</td><td>Meta — only with consent</td></tr>
    <tr><td><b>_gcl_au</b></td><td>Google Ads conversion measurement</td><td>3 months</td><td>Google — only with consent</td></tr>
  </tbody>
</table>

<h3 id="consent">Consent and management</h3>
<ul>
  <li>On your first visit, a cookie-consent banner is presented. You may (a) accept all cookies, (b) reject all non-essential, or (c) customise category-level consent.</li>
  <li>Your choice is stored for 12 months in a strictly-necessary cookie (nd_cookie_consent), after which you are re-prompted.</li>
  <li>You may revoke or modify consent at any time by clicking the "Cookie settings" link in the footer.</li>
  <li>Strictly-necessary cookies cannot be disabled through this mechanism — you may disable them through browser settings, but this will likely render the Platform non-functional.</li>
</ul>

<h3 id="browser">Browser-level controls</h3>
<p>Most modern browsers allow you to view, manage, delete and block cookies:</p>
<ul>
  <li><b>Chrome</b> — <a href="https://support.google.com/chrome/answer/95647" style="color:var(--accent)">support.google.com/chrome/answer/95647</a></li>
  <li><b>Firefox</b> — <a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" style="color:var(--accent)">support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer</a></li>
  <li><b>Safari</b> — <a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" style="color:var(--accent)">support.apple.com/guide/safari/manage-cookies-sfri11471/mac</a></li>
  <li><b>Edge</b> — <a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" style="color:var(--accent)">support.microsoft.com</a></li>
</ul>
<p>Please note that disabling cookies, particularly strictly-necessary cookies, may impair or prevent the use of the Platform.</p>

<h3 id="dnt">Do Not Track signals</h3>
<p>Some browsers transmit "Do Not Track" signals. As there is no industry-consensus interpretation, we do not respond to them at present. You retain all controls described above.</p>

<h3 id="updates">Updates to this Cookies Policy</h3>
<p>We may update this policy from time to time. The Effective Date at the top indicates the last update. We will re-prompt for consent if our use of cookies materially expands.</p>
"""

cookies_toc = [
    ("what", "What are cookies"),
    ("cats", "Categories we use"),
    ("consent", "Consent & management"),
    ("browser", "Browser controls"),
    ("dnt", "Do Not Track"),
    ("updates", "Updates"),
]

# ──────────────────────────────────────────────────────────────────
# CANCELLATION & REFUND POLICY
# ──────────────────────────────────────────────────────────────────
refunds_body = """
<h2 id="principles">4. Cancellation & Refund Policy</h2>
<p>This policy applies to all transactions concluded upon the Platform. It is drafted in accordance with the <b>Consumer Protection Act, 2019</b>, the <b>Consumer Protection (E-Commerce) Rules, 2020</b>, and the directions of the Reserve Bank of India applicable to digital-payment refunds. Read it in full before initiating any paid transaction.</p>

<h3 id="tiers">Tier-by-tier cancellation rules</h3>

<h4>Free Tier</h4>
<ul>
  <li>No charges apply; no cancellation or refund is necessary or available.</li>
  <li>You may cease using the Free Tier at any time.</li>
</ul>

<h4>Deep Legal Scan — ₹49 per name (one-time)</h4>
<ul>
  <li>Refund eligible where you request within <b>24 hours</b> of scan completion, and (i) the PDF has not been downloaded more than <b>3 times</b>, and (ii) you are not requesting refund on the basis of a delay attributable wholly or substantially to a Third-Party Source.</li>
  <li>After 24 hours or 3+ downloads — at our sole discretion, typically not granted.</li>
  <li>Where the scan itself materially failed (orchestrator non-functional for the entire duration, NOT a Third-Party Source issue), full refund automatically.</li>
</ul>

<h4>Keepsake PDF Report — ₹29 per name (Baby mode)</h4>
<ul>
  <li>Refund eligible where you request within <b>24 hours</b> of generation, and the PDF has not been downloaded more than <b>once</b>.</li>
  <li>If PDF generation itself failed (corrupt or empty), full refund automatic.</li>
</ul>

<h4>Shortlist of Five — ₹99 per set (Baby mode)</h4>
<ul>
  <li>Same as Keepsake PDF Report, with a download threshold of <b>2</b>.</li>
  <li>Partial refunds for individual names within a shortlist are not offered.</li>
</ul>

<h4>Founder Pro — ₹499 / month (subscription)</h4>
<ul>
  <li>Cancel any time; cancellation takes effect at end of the current billing cycle; no further charges.</li>
  <li>Pro-rated refunds for unused portion of an already-paid month available within <b>7 days</b> of the first charge of the current cycle, provided you have consumed fewer than <b>3 Deep Scans</b> in that cycle.</li>
  <li>Subsequent renewal cycles are not refundable on a pro-rata basis.</li>
  <li>Auto-renewal can be disabled any time from your account dashboard.</li>
</ul>

<h4>Agency Tier — by quotation</h4>
<ul>
  <li>Governed by the master-service agreement (MSA) executed between us. The MSA sets out cancellation, refund, termination and renewal terms.</li>
  <li>Where there is conflict between this policy and an executed MSA, the MSA prevails.</li>
  <li>Where no MSA is in place, Founder Pro terms apply by analogy, save that pro-rata refunds are available within 14 days.</li>
</ul>

<h3 id="thirdparty">Delays attributable to Third-Party Sources — NOT eligible for refund</h3>
<div class="callout">
  <div class="callout-title">⚠ Important to understand</div>
  <p>We perform substantial engineering and operational work to attempt your scan, regardless of whether a Third-Party Source returns timely results. <b>The cost-of-goods of the scan is borne by us at the moment of dispatch. A refund will therefore not be granted on the ground that one or more Third-Party Sources were slow, unavailable or returned an unhelpful result</b>, unless the failure was so widespread as to render the verdict materially incomplete.</p>
</div>
<ul>
  <li><b>"Materially incomplete"</b> means fewer than <b>70%</b> of the platforms applicable to your mode returned a substantive (non-"Checking") response.</li>
  <li>In a materially-incomplete case, you may either (a) re-run the scan at no additional cost within 7 days, or (b) request a full refund.</li>
  <li>Our good-faith determination of "materially incomplete" shall be final, save that you may escalate via the dispute-resolution mechanism in the <a href="terms.html#law" style="color:var(--accent)">Terms of Use</a>.</li>
</ul>

<h3 id="payment">Payment-side failures</h3>
<ul>
  <li>Where payment is debited but the transaction status returned to us is "Failed" or "Pending", no service is rendered. The amount is auto-reversed by the gateway within 3–7 working days.</li>
  <li>If reversal does not appear within 7 working days, write to support@naamdekho.in with the transaction reference.</li>
  <li>Double-debit charges shall be refunded in full within 7 working days of identification.</li>
  <li>For chargebacks initiated by you or your bank, we reserve the right to contest with evidence of service delivery, and to suspend your account pending resolution.</li>
</ul>

<h3 id="mechanism">Refund mechanism</h3>
<ul>
  <li>Refunds processed to the <b>original instrument</b> of payment. UPI → same UPI handle. Card → same card (typically 5–10 working days to reflect, bank-dependent).</li>
  <li>If the original instrument is unavailable (e.g. card cancelled), refund by bank transfer upon request and documentary proof of the original payment.</li>
  <li>Refunds are not credited as Platform credits unless you expressly elect this option.</li>
  <li>Refunds are net of applicable GST, which is reversed in accordance with CGST Act 2017.</li>
</ul>

<h3 id="process">Process to request a refund</h3>
<ol>
  <li>Write to <b><a href="mailto:refunds@naamdekho.in" style="color:var(--accent)">refunds@naamdekho.in</a></b> from the email associated with the account.</li>
  <li>Include: (a) scan ID or transaction ID, (b) date of payment, (c) reason, (d) any supporting screenshots.</li>
  <li><b>Acknowledgement:</b> within 48 hours. <b>Substantive decision:</b> within 7 working days. <b>Credit to original instrument:</b> 5–10 working days from decision.</li>
  <li>Disputed decisions may be escalated to <a href="mailto:grievance@naamdekho.in" style="color:var(--accent)">grievance@naamdekho.in</a>.</li>
</ol>

<h3 id="fraud">Fraud and abuse</h3>
<ul>
  <li>We reserve the right to deny refunds where, in our reasonable opinion, the request is fraudulent, abusive or part of a pattern of repeated unjustified requests.</li>
  <li>Where we suspect fraud, we may suspend your account pending investigation and report the matter to law-enforcement authorities.</li>
</ul>
"""

refunds_toc = [
    ("principles", "General principles"),
    ("tiers", "Tier-by-tier rules"),
    ("thirdparty", "3rd-party delays"),
    ("payment", "Payment failures"),
    ("mechanism", "Refund mechanism"),
    ("process", "Request a refund"),
    ("fraud", "Fraud & abuse"),
]

# ──────────────────────────────────────────────────────────────────
# PAYMENT TERMS
# ──────────────────────────────────────────────────────────────────
payments_body = """
<h2 id="gateways">5. Payment Terms — Razorpay & Paytm</h2>
<p>All payments on the Platform are processed by third-party payment gateways. We do not handle, hold or store any payment-instrument data save the transaction metadata returned by the gateway.</p>
<ul>
  <li><b>Primary gateway: Razorpay</b> (Razorpay Software Private Limited) — a Payment Aggregator licensed by the Reserve Bank of India under the Guidelines on Regulation of Payment Aggregators and Payment Gateways dated 17 March 2020.</li>
  <li><b>Fallback gateway: Paytm Payment Services Private Limited</b> — also an RBI-licensed Payment Aggregator. The fallback is invoked automatically when the primary is unavailable, returns an unrecoverable error, or rejects your instrument.</li>
  <li>You will be informed on the checkout page which gateway is being used. You may refresh the page to retry on the primary gateway.</li>
</ul>

<h3 id="methods">Supported payment methods</h3>
<ul>
  <li><b>UPI</b> — PhonePe, Google Pay, Paytm, Cred, any UPI-enabled app</li>
  <li><b>Debit and credit cards</b> — Visa, Mastercard, Maestro, RuPay, AmEx (subject to issuing-bank approval)</li>
  <li><b>Net Banking</b> from 50+ Indian banks</li>
  <li><b>Wallets</b> — Paytm Wallet, PhonePe Wallet, Mobikwik, Amazon Pay</li>
  <li><b>EMI</b> on supported credit cards (for amounts above ₹2,000)</li>
  <li><b>International cards</b> for users transacting from outside India — subject to gateway support and applicable currency-conversion margins charged by your bank</li>
</ul>

<h3 id="currency">Currency, GST and invoicing</h3>
<ul>
  <li>All prices in <b>Indian Rupees (₹ / INR)</b>, inclusive of GST at the applicable rate.</li>
  <li>For user-supplied Indian GSTIN, a CGST-Rules-2017-compliant invoice (Form GST INV-1) is generated and emailed within 5 minutes of successful payment.</li>
  <li>For users without a GSTIN, a Bill of Supply or B2C tax invoice is generated.</li>
  <li>Invoices accessible from your account dashboard for <b>8 years</b> from payment, per CGST Act §36.</li>
  <li>Where you are established outside India and the supply qualifies as export of services under IGST Act §2(6), GST is charged at <b>0%</b> subject to §16 conditions.</li>
</ul>

<h3 id="security">Transaction security</h3>
<ul>
  <li>All payment transactions over <b>TLS 1.2 or higher</b>, with end-to-end encryption between your browser, the gateway and your card-issuing bank.</li>
  <li>Card data (PAN, CVV, expiry) is <b>never transmitted to or stored by us</b>. The gateway tokenises the card and provides only a transaction reference.</li>
  <li>Three-Domain-Secure (<b>3DS</b>) authentication is mandatorily invoked for all Indian-card transactions per RBI directions.</li>
  <li>For UPI transactions, two-factor authentication via your UPI PIN is mandatory.</li>
</ul>

<h3 id="failed">Failed transactions</h3>
<ul>
  <li>A transaction may fail for many reasons — insufficient funds, expired card, mismatched details, bank-side outage, exceeded daily limit, gateway timeout.</li>
  <li>Where it fails <b>before debit</b>, no further action required.</li>
  <li>Where it fails <b>after debit</b>, the amount is auto-reversed by the gateway within 3–7 working days. No action required from you.</li>
  <li>If reversal has not occurred within 7 working days, write to <a href="mailto:support@naamdekho.in" style="color:var(--accent)">support@naamdekho.in</a>.</li>
</ul>

<h3 id="fallback">Fallback gateway switching — Razorpay → Paytm</h3>
<ul>
  <li>We continuously monitor Razorpay's health and response-time. Upon detection of degraded availability (<b>error rate > 5% over a 5-minute window, or median response > 10 seconds</b>), new checkout sessions automatically switch to Paytm.</li>
  <li>You are informed of the gateway at checkout. Pending transactions on the primary gateway are not migrated — they complete or auto-reverse normally.</li>
  <li>After <b>30 minutes</b> of stable primary-gateway operation, new sessions revert to the primary.</li>
  <li>In the rare event both gateways are simultaneously unavailable, the Platform displays a notice and does not levy any charge.</li>
</ul>

<h3 id="subscription">Subscription billing — Founder Pro & Agency</h3>
<ul>
  <li>Recurring subscriptions billed in advance monthly (or as set out in the MSA for Agency Tier).</li>
  <li>Auto-renewal is enabled by default at sign-up. You may disable it any time from the dashboard.</li>
  <li>Failed renewals are retried up to 3 times over 5 days. If all retries fail, the subscription is suspended and you are notified by email.</li>
  <li>Our recurring-billing mandate is established with the gateway in accordance with RBI directions on e-mandate processing dated 16 August 2019, as amended.</li>
</ul>

<h3 id="cancellation-link">Cancellation, refunds and chargebacks</h3>
<p>For the rules and process governing cancellations, refunds, double-debits, chargebacks and disputed transactions, see the <a href="cancellation-refund.html" style="color:var(--accent)">Cancellation & Refund Policy</a>.</p>
"""

payments_toc = [
    ("gateways", "Payment gateways"),
    ("methods", "Supported methods"),
    ("currency", "Currency, GST, invoicing"),
    ("security", "Transaction security"),
    ("failed", "Failed transactions"),
    ("fallback", "Fallback switching"),
    ("subscription", "Subscription billing"),
    ("cancellation-link", "Cancellation & refunds"),
]


# ──────────────────────────────────────────────────────────────────
# RENDER & SAVE
# ──────────────────────────────────────────────────────────────────
pages = [
    ("privacy",      "privacy.html",
     "Privacy Policy",
     "Our <em>Privacy Policy</em>.",
     "How we collect, use, store, share and protect your Personal Data — drafted under the DPDP Act, 2023, the IT Act, 2000, and applicable IT Rules.",
     privacy_toc, privacy_body),
    ("terms",        "terms.html",
     "Terms of Use",
     "Our <em>Terms of Use</em>.",
     "The agreement between you and Naam Dekho — what we promise, what you accept, and the boundaries of the service. Drafted under Indian contract and consumer law.",
     terms_toc, terms_body),
    ("cookies",      "cookies.html",
     "Cookies Policy",
     "Our <em>Cookies Policy</em>.",
     "What we use cookies for, how to manage them, and which third-party cookies appear on the Platform.",
     cookies_toc, cookies_body),
    ("cancellation", "cancellation-refund.html",
     "Cancellation & Refund",
     "<em>Cancellation</em> & Refund Policy.",
     "Tier-by-tier cancellation and refund rules, the third-party-delay carve-out, and the process to request a refund.",
     refunds_toc, refunds_body),
    ("payments",     "payment-terms.html",
     "Payment Terms",
     "Our <em>Payment Terms</em>.",
     "Razorpay (primary) and Paytm (fallback), supported methods, GST invoicing, transaction security, failed-transaction handling, and subscription billing.",
     payments_toc, payments_body),
]

for tab_id, filename, head_title, hero_title, hero_sub, toc, body in pages:
    html = render_page(tab_id, head_title, hero_title, hero_sub, toc, body, head_title)
    path = os.path.join(OUT, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Wrote {path} ({len(html)//1024} KB)")

print("\nDone — 5 separate policy pages built.")
