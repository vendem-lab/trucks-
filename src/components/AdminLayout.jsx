import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Logo from './Logo.jsx';
import Icon from './Icon.jsx';
import { useAuth } from '../context/authContext.js';
import { useToast } from '../context/ToastContext.jsx';
import { useStore } from '../lib/store.js';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/admin/members', label: 'Members', icon: 'users' },
  { to: '/admin/loads', label: 'Loads', icon: 'clipboard' },
  { to: '/admin/dues', label: 'Dues', icon: 'wallet' },
  { to: '/admin/news', label: 'News', icon: 'megaphone' },
  { to: '/admin/events', label: 'Events', icon: 'calendar' },
  { to: '/admin/enquiries', label: 'Enquiries', icon: 'message' },
  { to: '/admin/settings', label: 'Settings', icon: 'settings' }
];

const TITLES = {
  '/admin': { title: 'Dashboard', subtitle: 'Membership, loads and dues at a glance.' },
  '/admin/members': { title: 'Members', subtitle: 'Applications, profiles and membership status.' },
  '/admin/loads': { title: 'Load board', subtitle: 'Post verified loads and track who claimed them.' },
  '/admin/dues': { title: 'Dues', subtitle: 'Invoices, payments and outstanding balances.' },
  '/admin/news': { title: 'News', subtitle: 'Announcements and updates published to the site.' },
  '/admin/events': { title: 'Events & training', subtitle: 'Meetings, courses and registrations.' },
  '/admin/enquiries': { title: 'Enquiries', subtitle: 'Messages from the public contact form.' },
  '/admin/settings': { title: 'Settings', subtitle: 'Union details, dues rules and platform data.' }
};

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { session, logout } = useAuth();
  const { push } = useToast();
  const state = useStore();
  const pending =
    state.members.filter((member) => member.status === 'pending').length +
    (state.applications || []).filter((application) => application.status === 'pending').length;
  const unread = state.messages.filter((message) => !message.read).length;
  const meta = TITLES[location.pathname] || { title: 'Admin', subtitle: '' };

  useEffect(() => {
    setSidebarOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    push('Signed out of the union workspace.', 'success');
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
          <span className="admin-nav-label">Union workspace</span>
          {NAV.map((item) => {
            const badge =
              item.to === '/admin/members' ? pending : item.to === '/admin/enquiries' ? unread : 0;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `admin-nav-link ${isActive ? 'is-active' : ''}`}
              >
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
                {badge > 0 && <span className="admin-nav-badge">{badge}</span>}
              </NavLink>
            );
          })}
        </nav>
        <div className="admin-sidebar-foot">
          <Link to="/" className="admin-site-link">
            <Icon name="globe" size={16} /> View public site
          </Link>
          <div className="admin-user">
            <span className="avatar">{session?.name?.slice(0, 1) || 'A'}</span>
            <div>
              <strong>{session?.name || 'Union staff'}</strong>
              <span>{session?.staffRole || 'Administrator'}</span>
            </div>
          </div>
          <button type="button" className="admin-logout" onClick={handleLogout}>
            <Icon name="logout" size={16} /> Sign out
          </button>
        </div>
      </aside>

      {sidebarOpen && <button type="button" className="admin-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close menu" />}

      <main className="admin-main">
        <header className="admin-topbar">
          <button type="button" className="icon-btn admin-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Icon name="menu" size={20} />
          </button>
          <div className="admin-title">
            <h1>{meta.title}</h1>
            <p>{meta.subtitle}</p>
          </div>
          <div className="admin-topbar-actions">
            <Link to="/admin/loads?new=1" className="btn btn-outline btn-sm admin-hide-sm">
              <Icon name="plus" size={15} /> New load
            </Link>
            <span className="admin-date">{new Date().toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
          </div>
        </header>

        <div className="admin-content">
          {state.loading ? <div className="card">Loading union data…</div> : <Outlet />}
        </div>
      </main>
    </div>
  );
}
