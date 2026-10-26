import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import Logo from './Logo.jsx';
import Icon from './Icon.jsx';
import { BRAND } from '../config.js';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/services', label: 'Services' },
  { to: '/fleet', label: 'Fleet' },
  { to: '/track', label: 'Track' },
  { to: '/contact', label: 'Contact' }
];

export default function SiteLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { session } = useAuth();

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="site">
      <header className="site-header">
        <div className="container nav-inner">
          <Logo />
          <nav className={`site-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
            <div className="nav-mobile-actions">
              <Link to="/track" className="btn btn-outline btn-block">Track a shipment</Link>
              <Link to="/quote" className="btn btn-primary btn-block">Get a quote</Link>
              {session && <Link to="/admin" className="btn btn-dark btn-block">Open dashboard</Link>}
            </div>
          </nav>
          <div className="nav-actions">
            <Link to="/track" className="nav-track-link">Track shipment</Link>
            <Link to="/quote" className="btn btn-primary btn-sm">
              Get a quote
              <Icon name="arrowRight" size={15} />
            </Link>
            <button
              type="button"
              className="nav-toggle"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              <Icon name={menuOpen ? 'close' : 'menu'} size={22} />
            </button>
          </div>
        </div>
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <Logo light showTagline />
            <p className="footer-copy">
              Reliable road freight across Ghana and the West African corridor. Dedicated trailers,
              cold chain and expedited runs — tracked from pickup to proof of delivery.
            </p>
            <div className="footer-contact">
              <a href={`mailto:${BRAND.email}`}><Icon name="mail" size={16} /> {BRAND.email}</a>
              <a href={`tel:${BRAND.phone.replace(/\s/g, '')}`}><Icon name="phone" size={16} /> {BRAND.phone}</a>
            </div>
          </div>

          <div className="footer-col">
            <h4>Company</h4>
            <Link to="/services">Services</Link>
            <Link to="/fleet">Our fleet</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/login">Admin login</Link>
          </div>

          <div className="footer-col">
            <h4>Shipping</h4>
            <Link to="/quote">Get a quote</Link>
            <Link to="/track">Track a shipment</Link>
            <Link to="/services">Cold chain</Link>
            <Link to="/services">Heavy haul</Link>
          </div>

          <div className="footer-col">
            <h4>Visit us</h4>
            <span><Icon name="mapPin" size={16} /> {BRAND.address}</span>
            <span><Icon name="clock" size={16} /> {BRAND.hours}</span>
            <span><Icon name="shield" size={16} /> Fully insured freight</span>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} {BRAND.legalName}. All rights reserved.</span>
          <span>Demo platform · data stays in your browser</span>
        </div>
      </footer>
    </div>
  );
}
