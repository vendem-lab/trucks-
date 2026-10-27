import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Field from '../../components/Field.jsx';
import Icon from '../../components/Icon.jsx';
import { ALERT_FREQUENCIES, TRAILER_TYPES } from '../../config.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { addAlert, deleteAlert, updateAlert, useStore } from '../../lib/store.js';
import { countAlertMatches, matchesAlert } from '../../lib/union.js';
import { formatCurrency, formatDate } from '../../lib/format.js';

const EMPTY = {
  origin: '',
  destination: '',
  trailerType: 'Any',
  minRate: '',
  frequency: 'instant'
};

export default function Alerts() {
  const { session } = useAuth();
  const state = useStore();
  const { push } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  const member = state.members.find((entry) => entry.id === session?.memberId);

  const alerts = useMemo(
    () =>
      state.alerts
        .filter((alert) => alert.memberId === member?.id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [state.alerts, member]
  );

  const openLoads = state.loads.filter((load) => load.status === 'open');
  const matchedLoads = openLoads
    .filter((load) => alerts.some((alert) => alert.active && matchesAlert(load, alert)))
    .sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt))
    .slice(0, 4);

  if (!member) return null;

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setError('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.origin.trim() && !form.destination.trim() && form.trailerType === 'Any') {
      setError('Add at least an origin, a destination or a trailer type.');
      return;
    }
    addAlert({
      ...form,
      memberId: member.id,
      name: member.name,
      email: member.email,
      phone: member.phone
    });
    setForm(EMPTY);
    push('Job alert created.', 'success');
  };

  return (
    <div className="portal-page">
      <div className="portal-alerts-layout">
        <div className="portal-stack">
          <section className="card alert-form-card">
            <div className="card-head">
              <div>
                <h2>New job alert</h2>
                <p>We check every new load against your saved routes.</p>
              </div>
              <span className="card-chip">{alerts.filter((alert) => alert.active).length} active</span>
            </div>
            {error && (
              <div className="form-error" role="alert">
                <Icon name="alert" size={16} /> {error}
              </div>
            )}
            <form onSubmit={handleSubmit} noValidate>
              <div className="form-grid">
                <Field label="From" htmlFor="portal-alert-origin">
                  <input
                    id="portal-alert-origin"
                    value={form.origin}
                    onChange={update('origin')}
                    placeholder="e.g. Tema"
                  />
                </Field>
                <Field label="To" htmlFor="portal-alert-destination">
                  <input
                    id="portal-alert-destination"
                    value={form.destination}
                    onChange={update('destination')}
                    placeholder="e.g. Kumasi"
                  />
                </Field>
                <Field label="Trailer type" htmlFor="portal-alert-trailer">
                  <select
                    id="portal-alert-trailer"
                    value={form.trailerType}
                    onChange={update('trailerType')}
                  >
                    <option value="Any">Any trailer</option>
                    {TRAILER_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Minimum rate" htmlFor="portal-alert-rate">
                  <div className="input-prefix">
                    <span>GH₵</span>
                    <input
                      id="portal-alert-rate"
                      type="number"
                      min="0"
                      value={form.minRate}
                      onChange={update('minRate')}
                      placeholder="e.g. 4500"
                    />
                  </div>
                </Field>
              </div>
              <Field label="How often?" htmlFor="portal-alert-frequency">
                <select
                  id="portal-alert-frequency"
                  value={form.frequency}
                  onChange={update('frequency')}
                >
                  {ALERT_FREQUENCIES.map((frequency) => (
                    <option key={frequency.id} value={frequency.id}>{frequency.label}</option>
                  ))}
                </select>
              </Field>
              <button type="submit" className="btn btn-primary">
                <Icon name="bell" size={16} /> Save alert
              </button>
            </form>
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <h2>Your alerts</h2>
                <p>Pause an alert without losing it.</p>
              </div>
            </div>
            {alerts.length ? (
              <ul className="alert-list alert-list-portal">
                {alerts.map((alert) => {
                  const count = countAlertMatches(openLoads, alert);
                  return (
                    <li key={alert.id} className={alert.active ? '' : 'is-paused'}>
                      <div className="alert-item-main">
                        <strong>
                          {alert.origin || 'Anywhere'} <Icon name="arrowRight" size={12} />{' '}
                          {alert.destination || 'Anywhere'}
                        </strong>
                        <span>
                          {alert.trailerType} · min {formatCurrency(alert.minRate)} ·{' '}
                          {ALERT_FREQUENCIES.find((entry) => entry.id === alert.frequency)?.label}
                        </span>
                        <span className="alert-matches">
                          <Icon name="spark" size={13} /> {count} current matches · created{' '}
                          {formatDate(alert.createdAt)}
                        </span>
                      </div>
                      <div className="alert-actions">
                        <span className={`badge ${alert.active ? 'badge-success' : 'badge-muted'}`}>
                          {alert.active ? 'Active' : 'Paused'}
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            Promise.resolve(updateAlert(alert.id, { active: !alert.active })).catch((error) => push(error.message, 'error'));
                            push(alert.active ? 'Alert paused.' : 'Alert resumed.', 'success');
                          }}
                        >
                          {alert.active ? 'Pause' : 'Resume'}
                        </button>
                        <button
                          type="button"
                          className="icon-btn icon-btn-danger"
                          onClick={() => {
                              Promise.resolve(deleteAlert(alert.id)).catch((error) => push(error.message, 'error'));
                            push('Alert deleted.', 'success');
                          }}
                          aria-label="Delete alert"
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="inline-empty">
                <Icon name="bell" size={18} /> No alerts yet. Create one above and we will start matching new loads.
              </div>
            )}
          </section>
        </div>

        <aside className="portal-stack">
          <section className="card">
            <div className="card-head">
              <div>
                <h2>Matching loads now</h2>
                <p>Open loads that fit an active alert.</p>
              </div>
              <Link to="/loads" className="card-link">
                Board <Icon name="arrowRight" size={14} />
              </Link>
            </div>
            {matchedLoads.length ? (
              <ul className="portal-load-list">
                {matchedLoads.map((load) => (
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
                <Icon name="clipboard" size={18} /> No matches right now. New loads are posted most weekday mornings.
              </div>
            )}
          </section>

          <section className="card alert-help-card">
            <span className="service-icon"><Icon name="smartphone" size={22} /></span>
            <h3>Prefer SMS?</h3>
            <p>
              Alerts can be sent by SMS as well as email. Call the member line and the office will add
              your number to the alert list.
            </p>
            <Link to="/contact" className="btn btn-outline btn-block btn-sm">Contact the office</Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
