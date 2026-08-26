import { Outlet, Link } from 'react-router-dom'
import Nav from './Nav.jsx'
import Footer from './Footer.jsx'
import { usePricing } from '../lib/usePricing.js'


export default function Layout() {
  // Only ever true for an admin who switched preview on: the backend refuses
  // to serve a draft to anyone else. Without this banner it is far too easy to
  // read unpublished prices as live ones and believe a publish already happened.
  const { preview } = usePricing()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {preview && (
        <div style={{
          background: '#c98b2d', color: '#12100d', textAlign: 'center',
          padding: '7px 16px', fontSize: 13, fontWeight: 600,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          PREVIEW — these are unpublished draft prices. Customers still see the live ones.{' '}
          <Link to="/admin/pricing" style={{ color: '#12100d', textDecoration: 'underline' }}>
            Publish or discard →
          </Link>
        </div>
      )}
      <Nav />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
