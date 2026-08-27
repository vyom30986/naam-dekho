import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import HowItWorks from './pages/HowItWorks.jsx'
import Pricing from './pages/Pricing.jsx'
import SignIn from './pages/SignIn.jsx'
import Legal from './pages/Legal.jsx'
import Account from './pages/Account.jsx'
import AdminShell from './admin/AdminShell.jsx'
import AdminDashboard from './admin/Dashboard.jsx'
import AdminPricing from './admin/PricingPage.jsx'
import AdminCorpus from './admin/CorpusPage.jsx'
import AdminSeo from './admin/SeoPage.jsx'
import AdminChecks from './admin/ChecksPage.jsx'
import AdminUsers from './admin/UsersPage.jsx'
import AdminAudit from './admin/AuditPage.jsx'
import AdminTest from './admin/TestPage.jsx'
import AdminApi from './admin/ApiPage.jsx'
import AdminAccess from './admin/AccessPage.jsx'
import AdminLegal from './admin/LegalPage.jsx'

export default function App() {
  return (
    <Routes>
      {/* Sign-in is standalone (no site chrome) */}
      <Route path="/sign-in" element={<SignIn />} />

      {/* All other pages share the Layout (nav + footer) */}
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/pricing" element={<Pricing />} />
      </Route>

      {/* Legal pages — required for DPDP compliance and Razorpay KYC */}
      <Route element={<Layout />}>
        <Route path="/privacy" element={<Legal slug="privacy" />} />
        <Route path="/terms" element={<Legal slug="terms" />} />
        <Route path="/cookies" element={<Legal slug="cookies" />} />
        <Route path="/cancellation-refund" element={<Legal slug="cancellation-refund" />} />
        <Route path="/payment-terms" element={<Legal slug="payment-terms" />} />
        <Route path="/account" element={<Account />} />
      </Route>

      {/* Founder console — its own shell, deliberately NOT the customer layout.
          Gated server-side by ADMIN_EMAILS; the shell double-checks on mount. */}
      <Route path='/admin' element={<AdminShell />}>
        <Route index element={<AdminDashboard />} />
        <Route path='pricing' element={<AdminPricing />} />
        <Route path='corpus' element={<AdminCorpus />} />
        <Route path='seo' element={<AdminSeo />} />
        <Route path='checks' element={<AdminChecks />} />
        <Route path='users' element={<AdminUsers />} />
        <Route path='api' element={<AdminApi />} />
        <Route path='audit' element={<AdminAudit />} />
        <Route path='test' element={<AdminTest />} />
        <Route path='legal' element={<AdminLegal />} />
        <Route path='access' element={<AdminAccess />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
