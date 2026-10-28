import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import StatusBadge from './StatusBadge.jsx';
import { useAuth } from '../context/authContext.js';
import { useToast } from '../context/ToastContext.jsx';
import { useStore } from '../lib/store.js';
import { TIER_BY_ID } from '../config.js';
import { initials } from '../lib/format.js';

const TABS = [
  { to: '/portal', label: 'Overview', icon: 'dashboard', end: true },
  { to: '/portal/profile', label: 'My profile', icon: 'user' },
  { to: '/portal/dues', label: 'Dues & payments', icon: 'wallet' },
  { to: '/portal/alerts', label: 'Job alerts', icon: 'bell' }
];

export default function MemberLayout() {
  const { session, logout } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const state = useStore();
  const member = state.members.find((entry) => entry.id === session?.memberId);

  if (!member) {
    if (state.loading) {
      return (
        <section className="section">
          <div className="container container-narrow">
            <div className="card">Loading your member record…</div>
          </div>
        </section>
      );
    }
    return (
      <section className="section">
        <div className="container container-narrow">
          <div className="card portal-missing">
            <span className="empty-icon"><Icon name="alert" size={26} /></span>
            <h2>We could not find your member record</h2>
            <p>
              The record may still be loading, or it may have been removed. Call the union office on
              the member line and we will check it.
            </p>
            <Link to="/contact" className="btn btn-primary">Contact the union</Link>
          </div>
        </div>
      </section>
    );
  }

  const tier = TIER_BY_ID[member.tier] || TIER_BY_ID.independent;

  const handleLogout = async () => {
    await logout();
    push('Signed out of the member portal.', 'success');
    navigate('/login', { replace: true });
  };

  return (
    <>
      <section className="portal-head">
        <div className="container portal-head-inner">
          <div className="portal-identity">
            <span className="avatar avatar-lg">{initials(member.name)}</span>
            <div>
              <span className="eyebrow">Member portal</span>
              <h1>{member.name}</h1>
              <div className="portal-meta">
                <span>{member.memberNumber}</span>
                <span>{tier.name}</span>
                <StatusBadge status={member.status} />
              </div>
            </div>
          </div>
          <div className="portal-head-actions">
            <Link to="/loads" className="btn btn-primary">
              <Icon name="clipboard" size={16} /> Browse the load board
            </Link>
            <button type="button" className="btn btn-ghost" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </div>
        <div className="container portal-tabs">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) => `portal-tab ${isActive ? 'is-active' : ''}`}
            >
              <Icon name={tab.icon} size={16} />
              {tab.label}
            </NavLink>
          ))}
        </div>
      </section>

      <main className="container portal-content">
        {member.status === 'pending' && (
          <div className="inline-note inline-note-info portal-pending">
            <Icon name="clock" size={16} />
            <span>
              Your application is with the union office. Complete your profile now — load contacts,
              dues and benefits unlock as soon as a staff member approves your membership.
            </span>
          </div>
        )}
        <Outlet />
      </main>
    </>
  );
}
