"""Generate pricing.html and sign-in.html — uses write-then-rename to dodge orphan inodes."""
import os

OUT = os.path.dirname(os.path.abspath(__file__))


def safe_write(filename, content):
    path = os.path.join(OUT, filename)
    tmp = os.path.join(OUT, "_tmp_" + filename)
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(content)
    os.rename(tmp, path)
    print(f"Wrote {path} ({len(content)//1024} KB)")


SHARED_CSS = """
  :root{
    --bg:#FAF8F3; --bg-2:#F3EFE5; --ink:#0F1419; --ink-2:#3D4751; --ink-3:#6B7480;
    --line:#E5DFD0; --line-2:#D8D0BC; --accent:#B8501C; --accent-2:#7A2E0E;
    --ok-bg:#E7F2E9; --ok-ink:#1B5E20; --warn-bg:#FFF4D9; --warn-ink:#8A5A00; --gold:#E8C76A;
    --radius:14px; --radius-lg:18px;
    --shadow-sm:0 1px 2px rgba(15,20,25,0.04), 0 4px 12px -4px rgba(15,20,25,0.06);
    --shadow-md:0 1px 0 rgba(15,20,25,0.04), 0 12px 32px -16px rgba(15,20,25,0.12);
  }
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
  html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
  html,body{margin:0;padding:0;background:var(--bg);color:var(--ink);font-family:'Inter',ui-sans-serif,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
  body{background:radial-gradient(900px 500px at 80% -200px, rgba(184,80,28,0.06), transparent 60%), var(--bg);min-height:100vh}
  a{color:inherit;text-decoration:none}
  button{font-family:inherit;cursor:pointer}
  .container{max-width:1180px;margin:0 auto;padding:0 24px}

  nav.topnav{display:flex;align-items:center;justify-content:space-between;padding:20px 0;border-bottom:1px solid var(--line);position:sticky;top:0;background:rgba(250,248,243,0.85);backdrop-filter:blur(12px);z-index:50}
  .logo{display:flex;align-items:center;gap:12px}
  .logo-mark{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,var(--accent) 0%,var(--accent-2) 100%);display:grid;place-items:center;color:#fff;font-family:'Noto Sans Devanagari',serif;font-weight:600;font-size:17px}
  .logo-text{display:flex;flex-direction:column;line-height:1}
  .logo-text .name{font-family:'Fraunces',serif;font-weight:500;font-size:20px;letter-spacing:-0.02em}
  .logo-text .name em{font-style:italic;color:var(--accent);font-weight:500}
  .logo-text .deva{font-family:'Noto Sans Devanagari',serif;font-size:11px;color:var(--ink-3);margin-top:2px}
  .nav-right{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--ink-2)}
  .nav-right a.nav-link{padding:8px 14px;border-radius:8px;font-weight:500;transition:background .15s}
  .nav-right a.nav-link:hover{background:var(--bg-2)}
  .nav-right a.nav-link.active{color:var(--ink);background:var(--bg-2)}
  .nav-cta{padding:10px 18px;border:1px solid var(--ink);border-radius:999px;background:var(--ink);color:var(--bg);font-weight:500;font-size:13px}

  .page-hero{padding:64px 0 36px;text-align:center;border-bottom:1px solid var(--line)}
  .eyebrow{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:0.14em;margin-bottom:18px}
  h1.page-title{font-family:'Fraunces',serif;font-weight:400;font-size:clamp(36px,5vw,58px);line-height:1.05;letter-spacing:-0.025em;margin:0 0 16px;max-width:880px;margin-left:auto;margin-right:auto}
  h1.page-title em{font-style:italic;color:var(--accent)}
  .page-sub{font-size:clamp(15px,1.6vw,17px);color:var(--ink-2);max-width:660px;margin:0 auto;line-height:1.6}

  section{padding:56px 0;border-bottom:1px solid var(--line)}
  .pricing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:8px}
  .plan{background:#fff;border:2px solid var(--line);border-radius:var(--radius-lg);padding:32px;display:flex;flex-direction:column;gap:18px;box-shadow:var(--shadow-sm);transition:transform .2s, border-color .2s, box-shadow .2s;position:relative}
  .plan:hover{transform:translateY(-3px);border-color:var(--ink-3);box-shadow:var(--shadow-md)}
  .plan.featured{border-color:var(--accent);background:linear-gradient(180deg, #FFF4D9 0%, #fff 60%)}
  .plan.featured::before{content:"Most popular";position:absolute;top:-12px;right:24px;background:var(--accent);color:#fff;font-size:11px;font-weight:500;padding:5px 12px;border-radius:999px;font-family:'JetBrains Mono',monospace;letter-spacing:0.08em}
  .plan-tier{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--ink-3);text-transform:uppercase;letter-spacing:0.12em}
  .plan-name{font-family:'Fraunces',serif;font-size:28px;font-weight:500;margin:0;line-height:1.15}
  .plan-name em{font-style:italic;color:var(--accent)}
  .plan-price{display:flex;align-items:baseline;gap:8px;margin:6px 0}
  .plan-price .amt{font-family:'Fraunces',serif;font-size:48px;font-weight:400;line-height:1;letter-spacing:-0.02em}
  .plan-price .per{font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--ink-3)}
  .plan-desc{font-size:14px;color:var(--ink-2);line-height:1.6;min-height:60px}
  .plan-cta{background:var(--ink);color:#FAF8F3;padding:14px 22px;border-radius:12px;font-weight:500;font-size:14px;display:flex;justify-content:center;align-items:center;gap:8px;text-decoration:none;transition:transform .15s, background .15s}
  .plan-cta:hover{transform:translateY(-1px);background:var(--accent)}
  .plan.featured .plan-cta{background:var(--accent)}
  .plan-cta.outline{background:transparent;color:var(--ink);border:1px solid var(--ink)}
  .plan-cta.outline:hover{background:var(--ink);color:#FAF8F3}
  .plan-features{display:flex;flex-direction:column;gap:10px;padding-top:14px;border-top:1px dashed var(--line);list-style:none;padding-left:0;margin:0}
  .plan-features li{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;color:var(--ink-2);line-height:1.5}
  .plan-features .tick{width:20px;height:20px;border-radius:50%;background:var(--ok-bg);color:var(--ok-ink);display:grid;place-items:center;font-size:11px;flex-shrink:0;font-weight:600}
  .plan-features .x{width:20px;height:20px;border-radius:50%;background:var(--bg-2);color:var(--ink-3);display:grid;place-items:center;font-size:11px;flex-shrink:0}

  .audience-tabs{display:flex;justify-content:center;padding:28px 0 0;gap:8px}
  .audience-pill{padding:11px 22px;border-radius:999px;background:#fff;border:1px solid var(--line-2);font-weight:500;font-size:14px;color:var(--ink-2);cursor:pointer;display:inline-flex;align-items:center;gap:8px;box-shadow:var(--shadow-sm);transition:all .2s;font-family:inherit;border-width:1px}
  .audience-pill:hover{border-color:var(--ink-3);transform:translateY(-1px)}
  .audience-pill.active{background:var(--ink);color:#FAF8F3;border-color:var(--ink)}
  .audience-pill .deva{font-family:'Noto Sans Devanagari',serif;font-size:13px;opacity:0.7}

  body[data-audience="corporate"] .parent-only, body[data-audience="corporate"] .agency-only{display:none}
  body[data-audience="parent"] .corp-only, body[data-audience="parent"] .agency-only{display:none}
  body[data-audience="agency"] .corp-only, body[data-audience="agency"] .parent-only{display:none}

  .agency-section{background:linear-gradient(135deg, #1A1410 0%, #2A1A0E 100%);color:#F5EBD8;padding:80px 0;border-bottom:0}
  .agency-section h2{font-family:'Fraunces',serif;font-size:clamp(28px,4vw,42px);font-weight:400;margin:0 0 16px;color:#F5EBD8;line-height:1.1}
  .agency-section h2 em{color:var(--gold);font-style:italic}
  .agency-section .lead{font-size:16px;color:#C5B58A;max-width:560px;line-height:1.65;margin:0 0 32px}
  .agency-grid{display:grid;grid-template-columns:1fr 1.1fr;gap:60px;align-items:start}
  .agency-info ul{padding-left:0;list-style:none;margin:0;display:flex;flex-direction:column;gap:14px}
  .agency-info li{display:flex;gap:12px;align-items:flex-start;color:#C5B58A;font-size:14.5px;line-height:1.55}
  .agency-info .num{font-family:'Fraunces',serif;font-weight:500;font-size:13px;background:rgba(232,199,106,0.15);color:var(--gold);width:28px;height:28px;border-radius:50%;display:grid;place-items:center;flex-shrink:0}
  .agency-info b{color:#F5EBD8;font-weight:500;display:block;margin-bottom:2px}
  form.agency-form{background:rgba(245,235,216,0.04);border:1px solid rgba(245,235,216,0.12);border-radius:var(--radius-lg);padding:32px;display:flex;flex-direction:column;gap:18px}
  form.agency-form h3{font-family:'Fraunces',serif;font-size:22px;font-weight:500;margin:0;color:#F5EBD8}
  .form-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .form-field{display:flex;flex-direction:column;gap:6px}
  .form-field label{font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#8A7E5E}
  .form-field input, .form-field select, .form-field textarea{background:rgba(245,235,216,0.08);border:1px solid rgba(245,235,216,0.15);color:#F5EBD8;border-radius:10px;padding:14px 16px;font-size:14px;font-family:inherit;outline:none;transition:border-color .15s, background .15s}
  .form-field input:focus, .form-field select:focus, .form-field textarea:focus{border-color:var(--gold);background:rgba(245,235,216,0.12)}
  .form-field input::placeholder, .form-field textarea::placeholder{color:#6B7480}
  .form-field textarea{min-height:96px;resize:vertical;font-family:inherit}
  .form-field select option{background:#1A1410;color:#F5EBD8}
  .agency-submit{background:var(--gold);color:#1A1410;border:0;padding:16px 28px;border-radius:12px;font-weight:600;font-size:15px;cursor:pointer;display:inline-flex;justify-content:center;align-items:center;gap:10px;transition:transform .15s, background .15s;margin-top:8px}
  .agency-submit:hover{transform:translateY(-1px);background:#fff}
  .agency-form .small{font-size:11px;color:#6B7480;line-height:1.6;margin-top:4px}
  .form-success{display:none;padding:24px;border-radius:12px;background:rgba(27,94,32,0.2);border:1px solid #6FA572;color:#9CC2A2;font-size:14px;line-height:1.6;text-align:center}
  .form-success b{color:var(--gold);display:block;margin-bottom:4px;font-family:'Fraunces',serif;font-size:18px}

  .site-footer{background:#0F1419;color:#C5B58A;padding:56px 0 24px;margin-top:40px}
  .footer-grid{display:grid;grid-template-columns:1.8fr 1fr 1fr 1fr;gap:36px;padding-bottom:36px;border-bottom:1px solid rgba(245,235,216,0.1)}
  .footer-brand .logo-text .name{color:#F5EBD8}
  .footer-brand .logo-text .name em{color:var(--gold)}
  .footer-brand .logo-text .deva{color:#8A7E5E}
  .footer-tagline{font-size:13px;color:#8A9099;max-width:340px;margin:18px 0 0;line-height:1.6}
  .footer-col h4{font-family:'Fraunces',serif;font-size:14px;font-weight:500;color:#F5EBD8;margin:0 0 14px}
  .footer-col a{display:block;color:#8A9099;font-size:13px;padding:5px 0;transition:color .15s}
  .footer-col a:hover{color:var(--gold)}
  .footer-bottom{padding-top:20px;font-size:11px;color:#6B7480;font-family:'JetBrains Mono',monospace;text-align:center}

  @media (max-width: 1024px){
    .pricing-grid{grid-template-columns:1fr;gap:14px}
    .agency-grid{grid-template-columns:1fr;gap:36px}
    .footer-grid{grid-template-columns:1fr 1fr}
  }
  @media (max-width: 760px){
    .container{padding:0 18px}
    .nav-right .nav-link{display:none}
    section{padding:40px 0}
    .audience-tabs{gap:6px;overflow-x:auto;padding:24px 0 0;scrollbar-width:none}
    .audience-pill{padding:10px 16px;font-size:13px;flex-shrink:0}
    .plan{padding:26px}
    .plan-price .amt{font-size:42px}
    .form-row{grid-template-columns:1fr}
    .footer-grid{grid-template-columns:1fr;gap:24px}
    .agency-section{padding:48px 0}
  }
"""

NAV_HTML = """<nav class="topnav">
  <div class="container" style="display:contents">
    <a href="index.html" class="logo">
      <span class="logo-mark">ना</span>
      <span class="logo-text">
        <span class="name">Naam <em>Dekho</em></span>
        <span class="deva">नाम देखो · नाम चेक करो</span>
      </span>
    </a>
    <div class="nav-right">
      <a href="how-it-works.html" class="nav-link">How it works</a>
      <a href="pricing.html" class="nav-link {p_active}">Pricing</a>
      <a href="pricing.html#agencies" class="nav-link">For agencies</a>
      <a href="sign-in.html" class="nav-cta">Sign in</a>
    </div>
  </div>
</nav>
"""

FOOTER_HTML = """<footer class="site-footer">
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
      <a href="mailto:partners@naamdekho.in">partners@naamdekho.in</a>
    </div>
  </div>
  <div class="container footer-bottom">© 2026 Naam Dekho Technologies Pvt Ltd · नाम देखो · All rights reserved</div>
</footer>
"""

PRICING_HTML = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>Pricing — Naam Dekho</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+Devanagari:wght@400;500;600&display=swap" rel="stylesheet" />
<style>""" + SHARED_CSS + """</style>
</head>
<body data-audience="corporate">
""" + NAV_HTML.replace("{p_active}", "active") + """
<header class="page-hero">
  <div class="container">
    <div class="eyebrow">— Pricing</div>
    <h1 class="page-title">Free forever for the search. <em>Pay only for legal-grade proof.</em></h1>
    <p class="page-sub">No subscription wall to see your verdict. Pay ₹49 once when you actually need the deep scan, or subscribe at agency rates if you name brands or babies for a living.</p>
    <div class="audience-tabs" role="tablist">
      <button class="audience-pill active" data-aud="corporate">Founders & startups</button>
      <button class="audience-pill" data-aud="parent">Parents <span class="deva">माता-पिता</span></button>
      <button class="audience-pill" data-aud="agency">Agencies & API</button>
    </div>
  </div>
</header>

<section class="corp-only">
  <div class="container">
    <div class="pricing-grid">
      <div class="plan">
        <div class="plan-tier">Free · forever</div>
        <h2 class="plan-name">Instant Check</h2>
        <div class="plan-price"><span class="amt">₹0</span><span class="per">/ unlimited names</span></div>
        <p class="plan-desc">All 62 surface checks across every register, TLD, social, marketplace, brand and language. Live streamed verdict. No signup required.</p>
        <a href="index.html" class="plan-cta outline">Start a free search →</a>
        <ul class="plan-features">
          <li><span class="tick">✓</span>62-platform surface check</li>
          <li><span class="tick">✓</span>Live result streaming</li>
          <li><span class="tick">✓</span>All 7 Indian languages + Sanskrit</li>
          <li><span class="tick">✓</span>Chaldean numerology</li>
          <li><span class="x">−</span>No deep scan</li>
          <li><span class="x">−</span>No PDF report</li>
        </ul>
      </div>
      <div class="plan featured">
        <div class="plan-tier">One-time payment</div>
        <h2 class="plan-name">Deep <em>Legal Scan</em></h2>
        <div class="plan-price"><span class="amt">₹49</span><span class="per">/ per name</span></div>
        <p class="plan-desc">For the one name you actually want to incorporate. CAPTCHA-solved deep checks, full class-wise trademark breakdown, advocate-ready PDF.</p>
        <a href="sign-in.html?intent=deep-scan" class="plan-cta">Run deep legal scan →</a>
        <ul class="plan-features">
          <li><span class="tick">✓</span>Everything in Instant Check</li>
          <li><span class="tick">✓</span>Warmed proxy sessions</li>
          <li><span class="tick">✓</span>CAPTCHA solving</li>
          <li><span class="tick">✓</span>Class-wise TM breakdown</li>
          <li><span class="tick">✓</span>Downloadable PDF</li>
          <li><span class="tick">✓</span>Scan ID for evidence</li>
        </ul>
      </div>
      <div class="plan">
        <div class="plan-tier">Monthly · cancel anytime</div>
        <h2 class="plan-name">Founder Pro</h2>
        <div class="plan-price"><span class="amt">₹499</span><span class="per">/ month</span></div>
        <p class="plan-desc">For serial founders, accelerators and student entrepreneurs. Twenty deep scans included monthly.</p>
        <a href="sign-in.html?intent=founder-pro" class="plan-cta outline">Subscribe</a>
        <ul class="plan-features">
          <li><span class="tick">✓</span>Everything in Deep Legal Scan</li>
          <li><span class="tick">✓</span>20 deep scans / month</li>
          <li><span class="tick">✓</span>Extra scans at ₹39 each</li>
          <li><span class="tick">✓</span>Save & compare names</li>
          <li><span class="tick">✓</span>Register-change alerts</li>
          <li><span class="tick">✓</span>Priority support · 24h SLA</li>
        </ul>
      </div>
    </div>
  </div>
</section>

<section class="parent-only">
  <div class="container">
    <div class="pricing-grid">
      <div class="plan">
        <div class="plan-tier">Free · forever</div>
        <h2 class="plan-name">Instant Name Check</h2>
        <div class="plan-price"><span class="amt">₹0</span><span class="per">/ unlimited names</span></div>
        <p class="plan-desc">Pronunciation, meaning across seven Indian languages, Sanskrit root, Chaldean numerology, and live social handle availability.</p>
        <a href="index.html?mode=baby" class="plan-cta outline">Check a baby name →</a>
        <ul class="plan-features">
          <li><span class="tick">✓</span>Pronunciation report with IPA</li>
          <li><span class="tick">✓</span>Meaning across 7 Indian languages</li>
          <li><span class="tick">✓</span>Sanskrit root analysis</li>
          <li><span class="tick">✓</span>Chaldean numerology</li>
          <li><span class="tick">✓</span>Live social handle scan</li>
          <li><span class="x">−</span>No keepsake PDF</li>
        </ul>
      </div>
      <div class="plan featured">
        <div class="plan-tier">One-time payment</div>
        <h2 class="plan-name">Keepsake <em>PDF Report</em></h2>
        <div class="plan-price"><span class="amt">₹29</span><span class="per">/ per name</span></div>
        <p class="plan-desc">A beautifully formatted PDF for the family. Pronunciation guide, meaning, etymology, numerology, and reserved social handles.</p>
        <a href="sign-in.html?intent=keepsake" class="plan-cta">Generate keepsake →</a>
        <ul class="plan-features">
          <li><span class="tick">✓</span>Everything in Instant</li>
          <li><span class="tick">✓</span>Beautifully formatted PDF</li>
          <li><span class="tick">✓</span>Full Sanskrit etymology</li>
          <li><span class="tick">✓</span>Founder/parent DOB pairing</li>
          <li><span class="tick">✓</span>Detailed Chaldean reading</li>
          <li><span class="tick">✓</span>Print-ready</li>
        </ul>
      </div>
      <div class="plan">
        <div class="plan-tier">One-time payment</div>
        <h2 class="plan-name">Shortlist of Five</h2>
        <div class="plan-price"><span class="amt">₹99</span><span class="per">/ five-name set</span></div>
        <p class="plan-desc">Picking between five favourites? Get a side-by-side comparison PDF — same depth as the keepsake.</p>
        <a href="sign-in.html?intent=shortlist" class="plan-cta outline">Compare five →</a>
        <ul class="plan-features">
          <li><span class="tick">✓</span>Up to 5 names side-by-side</li>
          <li><span class="tick">✓</span>Comparison matrix · 4 dimensions</li>
          <li><span class="tick">✓</span>Recommended ranking</li>
          <li><span class="tick">✓</span>Sibling compatibility check</li>
          <li><span class="tick">✓</span>Individual keepsake PDFs included</li>
        </ul>
      </div>
    </div>
  </div>
</section>

<section class="agency-only agency-section" id="agencies">
  <div class="container">
    <div class="agency-grid">
      <div class="agency-info">
        <div class="eyebrow" style="color:var(--gold)">— For Agencies & API access</div>
        <h2>Naming firms, CA practices, brand-strategy houses & developers — <em>let's talk pricing.</em></h2>
        <p class="lead">Every agency has a different volume, category mix, and output requirement. Drop us your details and we will call you within one working day to design a plan that actually fits.</p>
        <ul>
          <li><span class="num">1</span><div><b>Volume-based plans from ₹3 per name</b>Bulk packages of 100, 500, 5,000 and 50,000 deep scans.</div></li>
          <li><span class="num">2</span><div><b>White-labelled PDF</b>Your logo and contact block on every report.</div></li>
          <li><span class="num">3</span><div><b>API access — REST + WebSocket</b>OpenAPI spec, sandboxed staging, full audit logs.</div></li>
          <li><span class="num">4</span><div><b>CSV bulk upload</b>20–500 candidate names, ranked CSV back.</div></li>
          <li><span class="num">5</span><div><b>Dedicated account manager</b>Phone, email, WhatsApp.</div></li>
          <li><span class="num">6</span><div><b>India-first compliance</b>DPDP-Act-compliant, MSA + DPA available.</div></li>
        </ul>
      </div>
      <form class="agency-form" id="agencyForm" novalidate>
        <h3>Tell us about your firm — we'll call within 24 hours.</h3>
        <div class="form-row">
          <div class="form-field"><label>Your name</label><input id="afName" type="text" placeholder="Full name" required /></div>
          <div class="form-field"><label>Your role</label><input id="afRole" type="text" placeholder="Founder, partner…" /></div>
        </div>
        <div class="form-row">
          <div class="form-field"><label>Company / firm</label><input id="afCompany" type="text" placeholder="Company name" required /></div>
          <div class="form-field"><label>Firm type</label><select><option>Naming / brand-strategy agency</option><option>Chartered Accountancy firm</option><option>Law / IP firm</option><option>Trademark agent</option><option>Accelerator / VC firm</option><option>SaaS / Developer (API)</option><option>Other</option></select></div>
        </div>
        <div class="form-row">
          <div class="form-field"><label>Work email</label><input id="afEmail" type="email" placeholder="you@firm.com" required /></div>
          <div class="form-field"><label>Phone (with country code)</label><input id="afPhone" type="tel" placeholder="+91 98765 43210" required /></div>
        </div>
        <div class="form-row">
          <div class="form-field"><label>Expected monthly volume</label><select><option>Under 50 names / month</option><option>50 – 200 names / month</option><option>200 – 1,000 names / month</option><option>1,000 – 5,000 names / month</option><option>Over 5,000 names / month</option></select></div>
          <div class="form-field"><label>Monthly budget range (₹)</label><select><option>Under ₹10,000</option><option>₹10,000 – ₹50,000</option><option>₹50,000 – ₹2,00,000</option><option>Over ₹2,00,000</option><option>Open / depends on plan</option></select></div>
        </div>
        <div class="form-field"><label>Anything else (optional)</label><textarea placeholder="Client mix, current workflow, API needs, contract timeline…"></textarea></div>
        <button type="submit" class="agency-submit">Request a callback →</button>
        <div class="small">By submitting this form you consent to Naam Dekho contacting you about agency plans. See our <a href="privacy.html" style="color:var(--gold)">privacy policy</a>.</div>
      </form>
      <div class="form-success" id="agencySuccess">
        <b>Thank you, we've received your request.</b>
        Our partnerships team will call you within one working day. If you don't hear from us, write to <a href="mailto:partners@naamdekho.in" style="color:var(--gold)">partners@naamdekho.in</a>.
      </div>
    </div>
  </div>
</section>

""" + FOOTER_HTML + """
<script>
const aud = document.querySelectorAll('.audience-pill');
function setAudience(a) {
  document.body.dataset.audience = a;
  aud.forEach(b => b.classList.toggle('active', b.dataset.aud === a));
  if (a === 'agency') {
    setTimeout(() => document.getElementById('agencies')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
aud.forEach(b => b.addEventListener('click', () => setAudience(b.dataset.aud)));
if (location.hash === '#agencies') setAudience('agency');

const form = document.getElementById('agencyForm');
const success = document.getElementById('agencySuccess');
form?.addEventListener('submit', e => {
  e.preventDefault();
  const required = ['afName','afCompany','afEmail','afPhone'];
  let ok = true;
  required.forEach(id => {
    const f = document.getElementById(id);
    if (!f.value.trim()) { f.style.borderColor = '#E89AB3'; ok = false; }
    else f.style.borderColor = '';
  });
  if (!ok) return;
  form.style.display = 'none';
  success.style.display = 'block';
  success.scrollIntoView({ behavior: 'smooth', block: 'center' });
});
</script>
</body>
</html>
"""


SIGNIN_HTML = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>Sign in — Naam Dekho</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+Devanagari:wght@400;500;600&display=swap" rel="stylesheet" />
<style>
  :root{--bg:#FAF8F3;--bg-2:#F3EFE5;--ink:#0F1419;--ink-2:#3D4751;--ink-3:#6B7480;--line:#E5DFD0;--line-2:#D8D0BC;--accent:#B8501C;--accent-2:#7A2E0E;--ok-ink:#1B5E20;--gold:#E8C76A;--shadow-md:0 1px 0 rgba(15,20,25,0.04), 0 12px 32px -16px rgba(15,20,25,0.12);--shadow-lg:0 1px 0 rgba(15,20,25,0.04), 0 32px 80px -24px rgba(15,20,25,0.28)}
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:var(--bg);color:var(--ink);font-family:'Inter',ui-sans-serif,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
  body{background:radial-gradient(800px 500px at 80% 10%, rgba(184,80,28,0.08), transparent 60%), radial-gradient(700px 500px at 0% 80%, rgba(232,199,106,0.08), transparent 60%), var(--bg);min-height:100vh;display:flex;flex-direction:column}
  a{color:inherit;text-decoration:none}
  .container{max-width:1180px;margin:0 auto;padding:0 24px;width:100%}
  nav.topnav{display:flex;align-items:center;justify-content:space-between;padding:20px 0;border-bottom:1px solid var(--line)}
  .logo{display:flex;align-items:center;gap:12px}
  .logo-mark{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,var(--accent) 0%,var(--accent-2) 100%);display:grid;place-items:center;color:#fff;font-family:'Noto Sans Devanagari',serif;font-weight:600;font-size:17px}
  .logo-text{display:flex;flex-direction:column;line-height:1}
  .logo-text .name{font-family:'Fraunces',serif;font-weight:500;font-size:20px;letter-spacing:-0.02em}
  .logo-text .name em{font-style:italic;color:var(--accent);font-weight:500}
  .logo-text .deva{font-family:'Noto Sans Devanagari',serif;font-size:11px;color:var(--ink-3);margin-top:2px}
  .nav-back{font-size:13px;color:var(--ink-3);display:flex;align-items:center;gap:6px}
  .nav-back:hover{color:var(--ink)}
  main{flex:1;display:grid;place-items:center;padding:60px 0}
  .auth-wrap{width:100%;max-width:440px;margin:0 auto}
  .auth-card{background:#fff;border:1px solid var(--line-2);border-radius:20px;padding:40px;box-shadow:var(--shadow-lg)}
  .auth-head{text-align:center;margin-bottom:32px}
  .eyebrow{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:0.14em;margin-bottom:14px}
  h1{font-family:'Fraunces',serif;font-weight:400;font-size:32px;letter-spacing:-0.02em;line-height:1.15;margin:0 0 10px}
  h1 em{font-style:italic;color:var(--accent)}
  .sub{font-size:14px;color:var(--ink-3);line-height:1.55;margin:0}
  .field{display:flex;flex-direction:column;gap:8px;margin-bottom:18px}
  .field label{font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:var(--ink-3)}
  .phone-input{display:flex;align-items:stretch;background:var(--bg-2);border:1px solid var(--line-2);border-radius:12px;overflow:hidden;transition:border-color .15s, background .15s}
  .phone-input:focus-within{border-color:var(--ink);background:#fff}
  .phone-cc{padding:14px 14px;font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:500;color:var(--ink);background:transparent;border:0;border-right:1px solid var(--line);display:flex;align-items:center;gap:6px;outline:none;flex-shrink:0;cursor:pointer}
  .phone-input input{flex:1;border:0;outline:0;background:transparent;padding:14px 16px;font-size:18px;color:var(--ink);font-family:inherit;letter-spacing:0.02em}
  .phone-input input::placeholder{color:var(--ink-3)}
  .otp-boxes{display:flex;gap:10px;justify-content:center;margin:6px 0 12px}
  .otp-box{width:48px;height:56px;border:1px solid var(--line-2);background:var(--bg-2);border-radius:12px;font-family:'Fraunces',serif;font-size:28px;text-align:center;font-weight:500;color:var(--ink);outline:none;transition:border-color .15s, background .15s}
  .otp-box:focus{border-color:var(--ink);background:#fff;box-shadow:0 0 0 4px rgba(184,80,28,0.1)}
  .submit-btn{width:100%;background:var(--ink);color:#FAF8F3;border:0;padding:16px 22px;border-radius:12px;font-weight:500;font-size:15px;cursor:pointer;display:flex;justify-content:center;align-items:center;gap:8px;transition:transform .15s, background .15s;min-height:54px;font-family:inherit}
  .submit-btn:hover{transform:translateY(-1px);background:var(--accent)}
  .submit-btn:disabled{background:var(--ink-3);cursor:not-allowed;transform:none}
  .helper{margin-top:18px;font-size:13px;color:var(--ink-3);text-align:center;line-height:1.6}
  .helper a{color:var(--accent);font-weight:500}
  .resend{background:none;border:0;color:var(--accent);font-weight:500;font-size:13px;cursor:pointer;padding:0;font-family:inherit}
  .resend:disabled{color:var(--ink-3);cursor:not-allowed}
  .trust-row{display:flex;justify-content:center;gap:18px;margin-top:22px;font-size:11px;color:var(--ink-3);font-family:'JetBrains Mono',monospace;flex-wrap:wrap}
  .trust-row span{display:inline-flex;align-items:center;gap:5px}
  .steps-bar{display:flex;justify-content:center;gap:8px;margin-bottom:24px}
  .step-dot{width:24px;height:4px;border-radius:2px;background:var(--line)}
  .step-dot.active{background:var(--accent)}
  .step-dot.done{background:var(--ok-ink)}
  .step-pane{display:none}
  .step-pane.active{display:block;animation:fadeIn .25s ease}
  @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  .intent-banner{background:linear-gradient(180deg, #FFF4D9 0%, #fff 100%);border:1px solid var(--gold);border-radius:12px;padding:14px 16px;font-size:13px;color:var(--ink);margin-bottom:24px;display:flex;align-items:center;gap:10px;line-height:1.5}
  .intent-banner b{color:var(--accent);font-weight:500}
  .phone-echo{background:var(--bg-2);border:1px solid var(--line);border-radius:10px;padding:12px 16px;font-family:'JetBrains Mono',monospace;font-size:14px;color:var(--ink);display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
  .phone-echo button{background:none;border:0;color:var(--accent);font-weight:500;font-size:13px;cursor:pointer;font-family:inherit;padding:0}
  footer.mini{padding:24px 0;color:var(--ink-3);font-size:11px;text-align:center;font-family:'JetBrains Mono',monospace;border-top:1px solid var(--line)}
  @media (max-width: 480px){
    .container{padding:0 18px}
    .auth-card{padding:28px 22px;border-radius:16px}
    h1{font-size:26px}
    .otp-box{width:42px;height:50px;font-size:24px}
  }
</style>
</head>
<body>
<nav class="topnav">
  <div class="container" style="display:contents">
    <a href="index.html" class="logo">
      <span class="logo-mark">ना</span>
      <span class="logo-text">
        <span class="name">Naam <em>Dekho</em></span>
        <span class="deva">नाम देखो</span>
      </span>
    </a>
    <a href="index.html" class="nav-back">← Back to home</a>
  </div>
</nav>
<main>
  <div class="container auth-wrap">
    <div class="auth-card">
      <div class="steps-bar">
        <div class="step-dot active" id="dot1"></div>
        <div class="step-dot" id="dot2"></div>
        <div class="step-dot" id="dot3"></div>
      </div>
      <div class="intent-banner" id="intentBanner" style="display:none">
        <span id="intentText"></span>
      </div>
      <div class="step-pane active" id="step1">
        <div class="auth-head">
          <div class="eyebrow">— Sign in</div>
          <h1>Welcome to <em>Naam Dekho</em></h1>
          <p class="sub">Sign in with your phone number. We'll send a 6-digit OTP via SMS.</p>
        </div>
        <form id="phoneForm" autocomplete="off">
          <div class="field">
            <label>Mobile number</label>
            <div class="phone-input">
              <select class="phone-cc" id="cc">
                <option value="+91">🇮🇳 +91</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+971">🇦🇪 +971</option>
                <option value="+65">🇸🇬 +65</option>
              </select>
              <input id="phone" type="tel" inputmode="numeric" pattern="[0-9]*" maxlength="10" placeholder="98765 43210" required />
            </div>
          </div>
          <button type="submit" class="submit-btn">Send OTP →</button>
        </form>
        <div class="trust-row">
          <span>🔒 Bank-grade encryption</span>
          <span>✓ DPDP Act compliant</span>
          <span>🇮🇳 India-region storage</span>
        </div>
        <p class="helper">By continuing, you agree to our <a href="terms.html">Terms</a> and <a href="privacy.html">Privacy Policy</a>.</p>
      </div>
      <div class="step-pane" id="step2">
        <div class="auth-head">
          <div class="eyebrow">— Verify</div>
          <h1>Enter the <em>6-digit code</em></h1>
          <p class="sub">We sent it to <b id="phoneDisplay">+91 98765 43210</b>.</p>
        </div>
        <div class="phone-echo">
          <span id="phoneEcho">+91 98765 43210</span>
          <button id="changePhoneBtn">Change</button>
        </div>
        <form id="otpForm" autocomplete="off">
          <div class="field">
            <label style="text-align:center">Enter OTP</label>
            <div class="otp-boxes">
              <input class="otp-box" maxlength="1" autocomplete="one-time-code" />
              <input class="otp-box" maxlength="1" />
              <input class="otp-box" maxlength="1" />
              <input class="otp-box" maxlength="1" />
              <input class="otp-box" maxlength="1" />
              <input class="otp-box" maxlength="1" />
            </div>
          </div>
          <button type="submit" class="submit-btn" id="verifyBtn" disabled>Verify & continue →</button>
        </form>
        <p class="helper">
          Didn't receive it?
          <button class="resend" id="resendBtn" disabled>Resend in <span id="resendTimer">30</span>s</button>
        </p>
      </div>
      <div class="step-pane" id="step3">
        <div class="auth-head">
          <div class="eyebrow" style="color:var(--ok-ink)">— Signed in</div>
          <h1>You're <em>in</em>.</h1>
          <p class="sub">Taking you back to the search…</p>
        </div>
        <a href="index.html" class="submit-btn" style="text-decoration:none">Continue →</a>
      </div>
    </div>
  </div>
</main>
<footer class="mini">© 2026 Naam Dekho Technologies Pvt Ltd · नाम देखो</footer>
<script>
const INTENT = new URLSearchParams(location.search).get('intent');
const intents = {
  'deep-scan': 'After signing in, your <b>₹49 Deep Legal Scan</b> will be ready to launch.',
  'keepsake':  'After signing in, your <b>₹29 Keepsake PDF</b> will be ready to generate.',
  'shortlist': 'After signing in, your <b>₹99 Shortlist of Five</b> comparison will be ready.',
  'founder-pro': 'After signing in, you can subscribe to <b>Founder Pro</b> at ₹499/month.',
};
if (INTENT && intents[INTENT]) {
  document.getElementById('intentBanner').style.display = 'flex';
  document.getElementById('intentText').innerHTML = intents[INTENT];
}
const panes = ['step1','step2','step3'].map(id => document.getElementById(id));
const dots = ['dot1','dot2','dot3'].map(id => document.getElementById(id));
function gotoStep(i) {
  panes.forEach((p,idx) => p.classList.toggle('active', idx === i));
  dots.forEach((d,idx) => { d.classList.toggle('active', idx === i); d.classList.toggle('done', idx < i); });
}
const phoneForm = document.getElementById('phoneForm');
phoneForm.addEventListener('submit', e => {
  e.preventDefault();
  const cc = document.getElementById('cc').value;
  const num = document.getElementById('phone').value.trim();
  if (num.length < 7) return;
  const formatted = cc + ' ' + (num.length === 10 ? num.replace(/(\\d{5})(\\d{5})/, '$1 $2') : num);
  document.getElementById('phoneDisplay').textContent = formatted;
  document.getElementById('phoneEcho').textContent = formatted;
  gotoStep(1);
  setTimeout(() => document.querySelector('.otp-box').focus(), 200);
  startResendTimer();
});
const otpBoxes = document.querySelectorAll('.otp-box');
const verifyBtn = document.getElementById('verifyBtn');
otpBoxes.forEach((box, i) => {
  box.addEventListener('input', () => {
    box.value = box.value.replace(/\\D/g, '').slice(0, 1);
    if (box.value && i < otpBoxes.length - 1) otpBoxes[i + 1].focus();
    verifyBtn.disabled = ![...otpBoxes].every(b => b.value);
  });
  box.addEventListener('keydown', e => {
    if (e.key === 'Backspace' && !box.value && i > 0) otpBoxes[i - 1].focus();
  });
});
document.getElementById('otpForm').addEventListener('submit', e => {
  e.preventDefault();
  const code = [...otpBoxes].map(b => b.value).join('');
  if (code.length !== 6) return;
  verifyBtn.disabled = true;
  verifyBtn.innerHTML = 'Verifying…';
  setTimeout(() => {
    gotoStep(2);
    setTimeout(() => { location.href = 'index.html'; }, 1600);
  }, 700);
});
document.getElementById('changePhoneBtn').addEventListener('click', () => {
  gotoStep(0);
  otpBoxes.forEach(b => b.value = '');
  verifyBtn.disabled = true;
});
const resendBtn = document.getElementById('resendBtn');
let resendInterval;
function startResendTimer() {
  clearInterval(resendInterval);
  let secs = 30;
  resendBtn.disabled = true;
  resendBtn.innerHTML = 'Resend in <span id="resendTimer">' + secs + '</span>s';
  resendInterval = setInterval(() => {
    secs--;
    if (secs <= 0) {
      clearInterval(resendInterval);
      resendBtn.disabled = false;
      resendBtn.textContent = 'Resend OTP';
    } else {
      document.getElementById('resendTimer').textContent = secs;
    }
  }, 1000);
}
resendBtn.addEventListener('click', () => { if (!resendBtn.disabled) startResendTimer(); });
</script>
</body>
</html>
"""

safe_write("pricing.html", PRICING_HTML)
safe_write("sign-in.html", SIGNIN_HTML)
print("\nDone — pricing.html and sign-in.html written.")
