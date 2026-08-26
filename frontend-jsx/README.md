# Naam Dekho — Frontend (React + Vite + Tailwind)

Production-ready JSX scaffold for the 4 customer-facing pages of Naam Dekho, wired to the existing Node.js backend.

## Pages

| Route | File | Purpose |
|---|---|---|
| `/` | `src/pages/Home.jsx` | Landing / search — mode switcher (Startup/Baby), 4-card HUD, tab strip, credits |
| `/how-it-works` | `src/pages/HowItWorks.jsx` | 4-step pipeline explanation, FAQ accordion, CTAs |
| `/pricing` | `src/pages/Pricing.jsx` | 3-audience switcher (Founders / Parents / Agencies), pricing cards, agency lead form |
| `/sign-in` | `src/pages/SignIn.jsx` | 3-step phone OTP flow (phone → OTP → success) with intent banner |

Legal routes (`/privacy`, `/terms`, `/cookies`, `/cancellation-refund`, `/payment-terms`) are stubbed as redirects; drop in the existing HTML content or convert to JSX in a second pass.

## Quick start

```bash
cd frontend-jsx
npm install
npm run dev
```

Opens at `http://localhost:5173`. All `/v1/*` requests are proxied to the Node backend at `http://localhost:3000` (see `vite.config.js`).

## Folder structure

```
frontend-jsx/
├── index.html                    Fonts + root mount
├── package.json                  React 18 + Router 6 + Tailwind 3 + Vite 5
├── vite.config.js                Dev server + /v1 proxy to backend
├── tailwind.config.js            Design tokens (colours, fonts) matching HTML prototypes
├── postcss.config.js
└── src/
    ├── main.jsx                  Entry — BrowserRouter mount
    ├── App.jsx                   Route table
    ├── index.css                 Tailwind directives + base body styles
    ├── components/
    │   ├── Layout.jsx            <Nav /> + <Outlet /> + <Footer />
    │   ├── Nav.jsx               Top nav (mobile-responsive burger)
    │   └── Footer.jsx            4-column footer with all inter-page links
    └── pages/
        ├── Home.jsx
        ├── HowItWorks.jsx
        ├── Pricing.jsx
        └── SignIn.jsx            Standalone layout — no Nav/Footer
```

## Design tokens

All colours, fonts and spacing match the existing HTML prototypes:

- `bg` `#FAF8F3` (paper) · `ink` `#0F1419` (typography)
- `accent` `#B8501C` (rust) · `gold` `#E8C76A`
- `line` `#E5DFD0` (borders)
- Fonts: **Fraunces** (serif headings), **Inter** (body), **JetBrains Mono** (labels/mono UI), **Noto Sans Devanagari** (नाम देखो)

Tokens are declared in `tailwind.config.js`, so you can use `bg-accent`, `text-ink-3`, `border-line-2` directly.

## API integration — TODOs marked in code

Every place the frontend should hit the backend is marked with a `TODO:` comment. Endpoints to wire:

| Page | Endpoint | Method | Purpose |
|---|---|---|---|
| Home | `/v1/scan` | POST | Start a scan; returns `{ scanId }` |
| Home | `/v1/stream?scanId=...` | WebSocket | Live-stream results into HUD + tab strip |
| Home | `/v1/me` | GET | Fetch user credit balance |
| Pricing | `/v1/billing/checkout` | POST | Razorpay/Paytm intent creation |
| Pricing | `/v1/agency-leads` | POST | Agency contact form |
| SignIn | `/v1/auth/request-otp` | POST | Send OTP via MSG91 |
| SignIn | `/v1/auth/verify-otp` | POST | Exchange OTP for JWT; store in `localStorage` |

## Hyperlink map (all links wired)

**Nav** (all pages, sticky):
- Logo → `/`
- How it works → `/how-it-works`
- Pricing → `/pricing`
- Sign in → `/sign-in`

**Footer** (all pages):
- Product column: Search `/`, How it works `/how-it-works`, Pricing `/pricing`, Agencies `/pricing#agency`
- Company column: Contact `mailto:hello@naamdekho.in`, Careers `mailto:careers@naamdekho.in`, Press `mailto:press@naamdekho.in`, Social handles (IG/X/LinkedIn/YouTube)
- Legal column: Privacy `/privacy`, Terms `/terms`, Cookies `/cookies`, Cancellation `/cancellation-refund`, Payment `/payment-terms`

**Home page**:
- CTA cards → `/pricing`, `/how-it-works`
- "Top up" credits link → `/pricing`
- Bottom "See how it works" → `/how-it-works`

**HowItWorks page**:
- Bottom CTAs → `/` (search) and `/pricing`

**Pricing page**:
- Founder plans → `/sign-in?intent=free`, `/sign-in?intent=deep-scan`, `/sign-in?intent=founder-pro`
- Parent plans → `/sign-in?intent=free`, `/sign-in?intent=keepsake`, `/sign-in?intent=shortlist`
- Agency plans → `#agency-form` (in-page anchor)
- FAQ mini-block → `mailto:hello@naamdekho.in`, `/how-it-works`

**SignIn page**:
- Back to home → `/`
- Terms link → `/terms`
- Privacy link → `/privacy`
- Post-success → `navigate('/')`
- `?intent=<key>` query param triggers a gold banner showing what the user will get after signing in

## Mobile responsiveness

Every page collapses cleanly to a single column below `md:` (768 px). Nav has a hamburger toggle. Pricing cards stack. HUD grid becomes 2×2 on mobile, 4×1 on desktop.

## What still needs building (Phase 2)

- [ ] Live WebSocket integration on Home (scan tiles streaming in)
- [ ] Razorpay + Paytm checkout modals wired on Pricing
- [ ] Convert the 5 legal HTML pages into JSX components (currently stubbed as redirects)
- [ ] Add proper 404 page
- [ ] Baby-name-specific results view (currently shares layout with business)
- [ ] Auth guard on `/results/:scanId` route (yet to be built)
- [ ] Toast notifications for errors and success states
- [ ] Sentry / error boundary wrapper

## Design constraints for dev team

- **Never redirect during search** — results stream live via WebSocket; the URL should stay on `/`
- **Preserve typed name** — never reset the input field when mode is switched or when results come in
- **Credit balance** must appear on every logged-in page in the top-right
- **All prices in paise** in API calls — display as `₹49` but send `4900`
- **DPDP Act consent** must be captured before OTP is sent (checkbox is TODO)

## Contact

Frontend questions → `hello@naamdekho.in`
Backend integration → see `backend/README.md` in the sibling folder
