import { Link } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import StatCard from '../../components/StatCard.jsx';
import { TIER_BY_ID } from '../../config.js';
import { useAuth } from '../../context/authContext.js';
import { useStore } from '../../lib/store.js';
import { countAlertMatches, duesSummary, duesTone, eventDateParts } from '../../lib/union.js';
import { formatCurrency, formatDate } from '../../lib/format.js';

export default function PortalOverview() {
  const { session } = useAuth();
  const state = useStore();
  const member = state.members.find((entry) => entry.id === session?.memberId);

  if (!member) return null;

  const tier = TIER_BY_ID[member.tier] || TIER_BY_ID.independent;
  const invoices = state.dues
    .filter((invoice) => invoice.memberId === member.id)
    .sort((a, b) => String(b.period).localeCompare(String(a.period)));
  const summary = duesSummary(invoices);
  const alerts = state.alerts.filter((alert) => alert.memberId === member.id);
  const activeAlerts = alerts.filter((alert) => alert.active);
  const matches = state.loads.filter(
    (load) => load.status === 'open' && activeAlerts.some((alert) => countAlertMatches([load], alert))
  );
  const registrations = state.registrations.filter((registration) => registration.memberId === member.id);
  const upcomingEvents = state.events
    .filter((event) => new Date(event.startDate).getTime() >= Date.now() - 86400000)
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    .slice(0, 3);

  const profileFields = [
    member.phone,
    member.city,
    member.region,
    member.vehicleType,
    member.vehiclePlate,
    member.licenseNumber,
    member.emergencyName,
    member.emergencyPhone
  ];
  const complete = Math.round(
    (profileFields.filter((value) => String(value || '').trim()).length / profileFields.length) * 100
  );

  return (
    <div className="portal-page">
      <div className="portal-stat-grid">
        <StatCard
          icon="wallet"
          label="Dues status"
          value={
            summary.status === 'none'
              ? 'Not billed'
              : summary.totalOutstanding > 0
                ? formatCurrency(summary.totalOutstanding)
                : 'Paid up'
          }
          hint={
            summary.status === 'none'
              ? 'First invoice follows approval'
              : summary.totalOutstanding > 0
                ? 'Outstanding balance'
                : 'No balance outstanding'
          }
          tone={
            summary.status === 'none' ? 'brand' : summary.status === 'overdue' ? 'amber' : 'green'
          }
        />
        <StatCard
          icon="clipboard"
          label="Loads for you"
          value={matches.length}
          hint={`${activeAlerts.length} active ${activeAlerts.length === 1 ? 'alert' : 'alerts'}`}
          tone="brand"
        />
        <StatCard
          icon="calendar"
          label="Events booked"
          value={registrations.length}
          hint={`${upcomingEvents.length} coming up`}
          tone="violet"
        />
        <StatCard
          icon="idCard"
          label="Profile complete"
          value={`${complete}%`}
          hint={complete === 100 ? 'Everything is up to date' : 'Add your missing details'}
          tone={complete === 100 ? 'green' : 'amber'}
        />
      </div>

      <div className="portal-grid">
        <div className="portal-stack">
          <section className="card portal-membership">
            <div className="portal-membership-head">
              <div>
                <span className="eyebrow">Your membership</span>
                <h2>{tier.name}</h2>
                <p>{tier.tagline}</p>
              </div>
              <StatusBadge status={member.status} />
            </div>
            <dl className="portal-detail-list">
              <div><dt>Member number</dt><dd>{member.memberNumber}</dd></div>
              <div><dt>Monthly dues</dt><dd>{formatCurrency(tier.price)}</dd></div>
              <div><dt>Region</dt><dd>{member.region}</dd></div>
              <div><dt>Joined</dt><dd>{formatDate(member.joinedAt)}</dd></div>
              <div><dt>Vehicle</dt><dd>{member.vehicleType} · {member.vehiclePlate || '—'}</dd></div>
              <div><dt>Member line</dt><dd>24/7 support</dd></div>
            </dl>
            <div className="portal-membership-foot">
              <Link to="/portal/profile" className="btn btn-outline btn-sm">
                <Icon name="edit" size={14} /> Update my details
              </Link>
              <Link to="/portal/dues" className="btn btn-primary btn-sm">
                <Icon name="wallet" size={14} /> View dues
              </Link>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <h2>Dues snapshot</h2>
                <p>Your last three invoices.</p>
              </div>
              <Link to="/portal/dues" className="card-link">
                Full statement <Icon name="arrowRight" size={14} />
              </Link>
            </div>
            {summary.totalOutstanding > 0 && (
              <div className={`inline-note ${summary.status === 'overdue' ? 'inline-note-danger' : ''}`}>
                <Icon name="alert" size={16} />
                <span>
                  {formatCurrency(summary.totalOutstanding)} is outstanding.
                  {summary.status === 'overdue'
                    ? ' Legal cover is paused until this is cleared.'
                    : ` You have a ${summary.graceDays}-day grace period.`}
                </span>
              </div>
            )}
            <ul className="portal-dues-list">
              {invoices.slice(0, 3).map((invoice) => (
                <li key={invoice.id}>
                  <div>
                    <strong>{invoice.reference}</strong>
                    <span>{invoice.period} · due {formatDate(invoice.dueDate)}</span>
                  </div>
                  <div className="portal-dues-right">
                    <strong>{formatCurrency(invoice.amount)}</strong>
                    <StatusBadge status={invoice.status} />
                  </div>
                </li>
              ))}
              {!invoices.length && <li className="portal-empty-row">No invoices yet.</li>}
            </ul>
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <h2>Loads matching your alerts</h2>
                <p>Based on your saved routes and rates.</p>
              </div>
              <Link to="/loads" className="card-link">
                Load board <Icon name="arrowRight" size={14} />
              </Link>
            </div>
            {matches.length ? (
              <ul className="portal-load-list">
                {matches.slice(0, 3).map((load) => (
                  <li key={load.id}>
                    <div>
                      <strong>{load.title}</strong>
                      <span>{load.origin} → {load.destination} · {load.trailerType}</span>
                    </div>
                    <div className="portal-load-right">
                      <strong>{formatCurrency(load.rate)}</strong>
                      <Link to="/loads" className="card-link">View</Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="inline-empty">
                <Icon name="bell" size={18} /> No current load matches your alerts. New loads are posted most weekday mornings.
              </div>
            )}
          </section>
        </div>

        <aside className="portal-stack">
          <section className="card portal-quick">
            <div className="card-head">
              <div>
                <h2>Quick actions</h2>
                <p>The things members use most.</p>
              </div>
            </div>
            <div className="quick-actions">
              <Link to="/portal/dues" className="quick-action">
                <span className="quick-action-icon"><Icon name="banknote" size={18} /></span>
                <div>
                  <strong>Pay dues</strong>
                  <span>{summary.totalOutstanding > 0 ? `${formatCurrency(summary.totalOutstanding)} outstanding` : 'Nothing outstanding'}</span>
                </div>
                <Icon name="chevronRight" size={16} />
              </Link>
              <Link to="/portal/alerts" className="quick-action">
                <span className="quick-action-icon"><Icon name="bell" size={18} /></span>
                <div>
                  <strong>Manage job alerts</strong>
                  <span>{activeAlerts.length} active</span>
                </div>
                <Icon name="chevronRight" size={16} />
              </Link>
              <Link to="/events" className="quick-action">
                <span className="quick-action-icon"><Icon name="calendar" size={18} /></span>
                <div>
                  <strong>Training & events</strong>
                  <span>{upcomingEvents.length} upcoming</span>
                </div>
                <Icon name="chevronRight" size={16} />
              </Link>
              <Link to="/contact" className="quick-action">
                <span className="quick-action-icon"><Icon name="shield" size={18} /></span>
                <div>
                  <strong>Get legal help</strong>
                  <span>Call the member line</span>
                </div>
                <Icon name="chevronRight" size={16} />
              </Link>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <h2>Coming up</h2>
                <p>Events and meetings.</p>
              </div>
              <Link to="/events" className="card-link">
                All <Icon name="arrowRight" size={14} />
              </Link>
            </div>
            <ul className="portal-event-list">
              {upcomingEvents.map((event) => {
                const parts = eventDateParts(event.startDate);
                return (
                  <li key={event.id}>
                    <span className="event-date">
                      <strong>{parts.day}</strong>
                      <span>{parts.month}</span>
                    </span>
                    <div>
                      <strong>{event.title}</strong>
                      <span><Icon name="mapPin" size={12} /> {event.location}</span>
                    </div>
                  </li>
                );
              })}
              {!upcomingEvents.length && <li className="portal-empty-row">No upcoming events.</li>}
            </ul>
          </section>

          <section className={`card portal-status-card portal-status-${duesTone(summary.status)}`}>
            <h3>Member support</h3>
            <p>
              If something has gone wrong on the road, do not wait for office hours. The member line is
              staffed around the clock.
            </p>
            <a href="tel:+233249001180" className="btn btn-outline btn-block">
              <Icon name="phone" size={15} /> +233 24 900 1180
            </a>
          </section>
        </aside>
      </div>
    </div>
  );
}
