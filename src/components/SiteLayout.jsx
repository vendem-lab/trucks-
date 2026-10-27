import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import Logo from './Logo.jsx';
import Icon from './Icon.jsx';
import { BRAND } from '../config.js';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/loads', label: 'Load board' },
  { to: '/membership', label: 'Membership' },
  { to: '/news', label: 'News' },
  { to: '/events', label: 'Events' },
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

  const accountLink =
    session?.role === 'staff'
      ? { to: '/admin', label: 'Admin dashboard' }
      : session?.role === 'member'
        ? { to: '/portal', label: 'My portal' }
        : { to: '/login', label: 'Member login' };

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
              <Link to={accountLink.to} className="btn btn-outline btn-block">
                {accountLink.label}
              </Link>
              <Link to="/membership" className="btn btn-primary btn-block">
                Join the union
              </Link>
            </div>
          </nav>
          <div className="nav-actions">
            <Link to={accountLink.to} className="nav-account-link">
              <Icon name={session ? 'user' : 'lock'} size={15} /> {accountLink.label}
            </Link>
            <Link to="/membership" className="btn btn-primary btn-sm">
              Join the union
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
              An independent union for drivers and owner-operators in Ghana. We negotiate better
              rates, run a verified load board and stand with members when something goes wrong on
              the road.
            </p>
            <div className="footer-contact">
              <a href={`mailto:${BRAND.email}`}><Icon name="mail" size={16} /> {BRAND.email}</a>
              <a href={`tel:${BRAND.phone.replace(/\s/g, '')}`}><Icon name="phone" size={16} /> {BRAND.phone}</a>
            </div>
          </div>

          <div className="footer-col">
            <h2>The union</h2>
            <Link to="/about">Who we are</Link>
            <Link to="/about#leadership">Leadership</Link>
            <Link to="/membership">Join or renew</Link>
            <Link to="/contact">Contact the office</Link>
          </div>

          <div className="footer-col">
            <h2>Members</h2>
            <Link to="/loads">Load board</Link>
            <Link to="/loads#alerts">Job alerts</Link>
            <Link to="/portal/dues">Dues & payments</Link>
            <Link to={accountLink.to}>{accountLink.label}</Link>
          </div>

          <div className="footer-col">
            <h2>Visit us</h2>
            <span><Icon name="mapPin" size={16} /> {BRAND.address}</span>
            <span><Icon name="clock" size={16} /> {BRAND.hours}</span>
            <span><Icon name="phone" size={16} /> Member line {BRAND.memberLine}</span>
            <span><Icon name="shield" size={16} /> Independent and member-governed</span>
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
