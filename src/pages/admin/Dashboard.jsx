import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../../components/StatCard.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Icon from '../../components/Icon.jsx';
import { MEMBER_STATUSES, TIER_BY_ID } from '../../config.js';
import { useStore } from '../../lib/store.js';
import { formatCurrency, formatDate, formatShortDate, timeAgo } from '../../lib/format.js';
import { currentPeriod, formatPeriod } from '../../lib/union.js';

export default function Dashboard() {
  const state = useStore();

  const stats = useMemo(() => {
    const activeMembers = state.members.filter((member) => member.status === 'active');
    const pendingMembers = state.members.filter((member) => member.status === 'pending');
    const openLoads = state.loads.filter((load) => load.status === 'open');
    const unread = state.messages.filter((message) => !message.read);
    const period = currentPeriod();
    const collected = state.dues
      .filter((invoice) => invoice.status === 'paid' && invoice.period === period)
      .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
    const outstanding = state.dues
      .filter((invoice) => ['due', 'overdue'].includes(invoice.status))
      .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
    const overdue = state.dues.filter((invoice) => invoice.status === 'overdue');
    return { activeMembers, pendingMembers, openLoads, unread, collected, outstanding, overdue, period };
  }, [state]);

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const total = state.dues
        .filter((invoice) => invoice.status === 'paid' && invoice.period === period)
        .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
      return {
        key: period,
        label: date.toLocaleDateString('en-GB', { month: 'short' }),
        total
      };
    });
  }, [state.dues]);

  const maxTotal = Math.max(...months.map((month) => month.total), 1);

  const statusCounts = MEMBER_STATUSES.map((status) => ({
    ...status,
    count: state.members.filter((member) => member.status === status.id).length
  }));

  const recentMembers = useMemo(
    () =>
      [...state.members]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 6),
    [state.members]
  );

  const duesAttention = useMemo(
    () =>
      [...state.dues]
        .filter((invoice) => ['overdue', 'due'].includes(invoice.status))
        .sort((a, b) => {
          if (a.status !== b.status) return a.status === 'overdue' ? -1 : 1;
          return String(a.dueDate).localeCompare(String(b.dueDate));
        })
        .slice(0, 5),
    [state.dues]
  );

  const recentLoads = useMemo(
    () =>
      [...state.loads]
        .sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt))
        .slice(0, 5),
    [state.loads]
  );

  return (
    <div className="admin-page">
      <div className="admin-stat-grid">
        <StatCard
          icon="users"
          label="Active members"
          value={stats.activeMembers.length}
          hint={`${state.members.length} records in total`}
          tone="brand"
        />
        <StatCard
          icon="idCard"
          label="Pending applications"
          value={stats.pendingMembers.length}
          hint={stats.pendingMembers.length ? 'Waiting for review' : 'Nothing waiting'}
          tone="amber"
        />
        <StatCard
          icon="clipboard"
          label="Open loads"
          value={stats.openLoads.length}
          hint={`${state.loads.filter((load) => load.status === 'filled').length} filled this month`}
          tone="violet"
        />
        <StatCard
          icon="wallet"
          label="Dues collected"
          value={formatCurrency(stats.collected)}
          hint={`${formatPeriod(stats.period)} · ${formatCurrency(stats.outstanding)} outstanding`}
          tone="green"
        />
      </div>

      <div className="admin-grid admin-grid-main">
        <section className="card chart-card">
          <div className="card-head">
            <div>
              <h2>Dues collected</h2>
              <p>Last six months, by invoice period.</p>
            </div>
            <span className="card-chip">GH₵</span>
          </div>
          <div className="bar-chart" role="img" aria-label="Monthly dues collected bar chart">
            {months.map((month) => (
              <div key={month.key} className="bar-column">
                <span className="bar-value">{month.total ? formatCurrency(month.total) : '—'}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ height: `${Math.max(4, (month.total / maxTotal) * 100)}%` }}
                  />
                </div>
                <span className="bar-label">{month.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h2>Membership snapshot</h2>
              <p>Where the register stands right now.</p>
            </div>
          </div>
          <ul className="snapshot-list">
            {statusCounts.map((status) => {
              const total = state.members.length || 1;
              return (
                <li key={status.id}>
                  <div className="snapshot-head">
                    <StatusBadge status={status.id} />
                    <strong>{status.count}</strong>
                  </div>
                  <div className="snapshot-track">
                    <span
                      className={`snapshot-fill snapshot-${status.id}`}
                      style={{ width: `${(status.count / total) * 100}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="admin-snapshot-foot">
            <Link to="/admin/members" className="card-link">
              Open the register <Icon name="arrowRight" size={14} />
            </Link>
          </div>
        </section>
      </div>

      <div className="admin-grid admin-grid-main">
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Recent applications</h2>
              <p>Newest member records first.</p>
            </div>
            <Link to="/admin/members" className="card-link">
              View all <Icon name="arrowRight" size={14} />
            </Link>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Region</th>
                  <th>Tier</th>
                  <th>Joined</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentMembers.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <span className="table-strong">{member.name}</span>
                      <span className="table-sub">{member.memberNumber}</span>
                    </td>
                    <td>{member.region}</td>
                    <td>{TIER_BY_ID[member.tier]?.name || member.tier}</td>
                    <td>{formatShortDate(member.joinedAt)}</td>
                    <td><StatusBadge status={member.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="admin-stack">
          <section className="card">
            <div className="card-head">
              <div>
                <h2>Dues needing attention</h2>
                <p>Overdue first, then invoices due.</p>
              </div>
              <Link to="/admin/dues" className="card-link">
                Dues desk <Icon name="arrowRight" size={14} />
              </Link>
            </div>
            {duesAttention.length ? (
              <ul className="admin-mini-list">
                {duesAttention.map((invoice) => (
                  <li key={invoice.id}>
                    <span className="avatar avatar-sm">{invoice.memberName.slice(0, 1)}</span>
                    <div>
                      <strong>{invoice.memberName}</strong>
                      <span>{invoice.reference} · due {formatDate(invoice.dueDate)}</span>
                    </div>
                    <div className="admin-mini-right">
                      <strong>{formatCurrency(invoice.amount)}</strong>
                      <StatusBadge status={invoice.status} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="inline-empty">
                <Icon name="checkCircle" size={18} /> Every invoice is settled.
              </div>
            )}
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <h2>Unread enquiries</h2>
                <p>Messages from the public form.</p>
              </div>
              <Link to="/admin/enquiries" className="card-link">
                Inbox <Icon name="arrowRight" size={14} />
              </Link>
            </div>
            {stats.unread.length ? (
              <ul className="admin-mini-list">
                {stats.unread.slice(0, 3).map((message) => (
                  <li key={message.id}>
                    <span className="avatar avatar-sm">{message.name.slice(0, 1)}</span>
                    <div>
                      <strong>{message.subject}</strong>
                      <span>{message.name} · {timeAgo(message.createdAt)}</span>
                    </div>
                    <Icon name="message" size={16} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="inline-empty">
                <Icon name="checkCircle" size={18} /> Every enquiry has been read.
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="admin-grid admin-grid-main">
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Recent loads</h2>
              <p>The newest postings on the board.</p>
            </div>
            <Link to="/admin/loads" className="card-link">
              Manage loads <Icon name="arrowRight" size={14} />
            </Link>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Route</th>
                  <th>Rate</th>
                  <th>Posted</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentLoads.map((load) => (
                  <tr key={load.id}>
                    <td>
                      <span className="table-ref">{load.reference}</span>
                      <span className="table-sub">{load.shipper}</span>
                    </td>
                    <td>
                      <span className="table-route">
                        {load.origin} <Icon name="arrowRight" size={12} /> {load.destination}
                      </span>
                      <span className="table-sub">{load.trailerType}</span>
                    </td>
                    <td className="table-strong">{formatCurrency(load.rate)}</td>
                    <td>{timeAgo(load.postedAt)}</td>
                    <td><StatusBadge status={load.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h2>Quick actions</h2>
              <p>Common union office tasks.</p>
            </div>
          </div>
          <div className="quick-actions">
            <Link to="/admin/members" className="quick-action">
              <span className="quick-action-icon"><Icon name="users" size={18} /></span>
              <div>
                <strong>Review applications</strong>
                <span>{stats.pendingMembers.length} waiting for approval</span>
              </div>
              <Icon name="chevronRight" size={16} />
            </Link>
            <Link to="/admin/loads?new=1" className="quick-action">
              <span className="quick-action-icon"><Icon name="clipboard" size={18} /></span>
              <div>
                <strong>Post a load</strong>
                <span>Add a verified shipper load</span>
              </div>
              <Icon name="chevronRight" size={16} />
            </Link>
            <Link to="/admin/dues" className="quick-action">
              <span className="quick-action-icon"><Icon name="wallet" size={18} /></span>
              <div>
                <strong>Record a payment</strong>
                <span>{stats.overdue.length} overdue invoices</span>
              </div>
              <Icon name="chevronRight" size={16} />
            </Link>
            <Link to="/admin/news" className="quick-action">
              <span className="quick-action-icon"><Icon name="megaphone" size={18} /></span>
              <div>
                <strong>Publish an update</strong>
                <span>{state.news.length} articles live</span>
              </div>
              <Icon name="chevronRight" size={16} />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
