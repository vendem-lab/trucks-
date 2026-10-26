import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Logo from './Logo.jsx';
import Icon from './Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useStore } from '../lib/store.js';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/admin/shipments', label: 'Shipments', icon: 'truck' },
  { to: '/admin/quotes', label: 'Quotes', icon: 'fileText' },
  { to: '/admin/fleet', label: 'Fleet', icon: 'route' },
  { to: '/admin/customers', label: 'Customers', icon: 'users' },
  { to: '/admin/messages', label: 'Messages', icon: 'message' },
  { to: '/admin/settings', label: 'Settings', icon: 'settings' }
];

const TITLES = {
  '/admin': { title: 'Dashboard', subtitle: 'A live view of freight moving through Haulway.' },
  '/admin/shipments': { title: 'Shipments', subtitle: 'Create, dispatch and update every load.' },
  '/admin/quotes': { title: 'Quotes', subtitle: 'Review incoming requests and convert them into shipments.' },
  '/admin/fleet': { title: 'Fleet', subtitle: 'Vehicles, drivers and maintenance status.' },
  '/admin/customers': { title: 'Customers', subtitle: 'The companies shipping with you.' },
  '/admin/messages': { title: 'Messages', subtitle: 'Enquiries from the contact form.' },
  '/admin/settings': { title: 'Settings', subtitle: 'Company details, rates and demo data.' }
};

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { session, logout } = useAuth();
  const { push } = useToast();
  const state = useStore();
  const unread = state.messages.filter((message) => !message.read).length;
  const meta = TITLES[location.pathname] || { title: 'Admin', subtitle: '' };

  useEffect(() => {
    setSidebarOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    push('Signed out of the dashboard.', 'success');
    navigate('/login', { replace: true });
  };

  return (
    <div className={`admin ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <aside className="admin-sidebar">
        <div className="admin-sidebar-head">
          <Logo to="/admin" light />
          <button type="button" className="icon-btn admin-sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <Icon name="close" size={18} />
          </button>
        </div>
        <nav className="admin-nav" aria-label="Admin navigation">
          <span className="admin-nav-label">Workspace</span>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `admin-nav-link ${isActive ? 'is-active' : ''}`}
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
              {item.to === '/admin/messages' && unread > 0 && <span className="admin-nav-badge">{unread}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar-foot">
          <Link to="/" className="admin-site-link">
            <Icon name="globe" size={16} /> View storefront
          </Link>
          <div className="admin-user">
            <span className="avatar">{session?.name?.slice(0, 1) || 'A'}</span>
            <div>
              <strong>{session?.name || 'Admin'}</strong>
              <span>{session?.role || 'Administrator'}</span>
            </div>
          </div>
          <button type="button" className="admin-logout" onClick={handleLogout}>
            <Icon name="logout" size={16} /> Sign out
          </button>
        </div>
      </aside>

      {sidebarOpen && <button type="button" className="admin-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close menu" />}

      <div className="admin-main">
        <header className="admin-topbar">
          <button type="button" className="icon-btn admin-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Icon name="menu" size={20} />
          </button>
          <div className="admin-title">
            <h1>{meta.title}</h1>
            <p>{meta.subtitle}</p>
          </div>
          <div className="admin-topbar-actions">
            <Link to="/quote" className="btn btn-outline btn-sm admin-hide-sm">
              <Icon name="plus" size={15} /> New quote
            </Link>
            <span className="admin-date">{new Date().toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
          </div>
        </header>

        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
