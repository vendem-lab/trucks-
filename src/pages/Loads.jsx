import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero.jsx';
import LoadCard from '../components/LoadCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Field from '../components/Field.jsx';
import Icon from '../components/Icon.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { ALERT_FREQUENCIES, VEHICLE_TYPES } from '../config.js';
import { addAlert, claimLoad, deleteAlert, updateAlert, useStore } from '../lib/store.js';
import { countAlertMatches } from '../lib/union.js';
import { useAuth } from '../context/authContext.js';
import { accountLinkFor } from '../lib/sessionLinks.js';
import { useToast } from '../context/ToastContext.jsx';

const STATUS_FILTERS = [
  { id: 'open', label: 'Open loads' },
  { id: 'filled', label: 'Filled' },
  { id: 'all', label: 'Everything' }
];

const EMPTY_ALERT = {
  origin: '',
  destination: '',
  trailerType: 'Any',
  minRate: '',
  frequency: 'instant'
};

export default function Loads() {
  const state = useStore();
  const { session } = useAuth();
  const account = accountLinkFor(session);
  const { push } = useToast();
  const [search, setSearch] = useState('');
  const [trailer, setTrailer] = useState('all');
  const [status, setStatus] = useState('open');
  const [alertForm, setAlertForm] = useState(EMPTY_ALERT);
  const [alertError, setAlertError] = useState('');

  const member =
    session?.role === 'member'
      ? state.members.find((entry) => entry.id === session.memberId)
      : null;
  const unlocked = member?.status === 'active';

  const alerts = useMemo(
    () =>
      member
        ? state.alerts
            .filter((alert) => alert.memberId === member.id)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        : [],
    [state.alerts, member]
  );

  const openCount = state.loads.filter((load) => load.status === 'open').length;
  const totalRate = state.loads
    .filter((load) => load.status === 'open')
    .reduce((sum, load) => sum + (Number(load.rate) || 0), 0);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return state.loads
      .filter((load) => {
        if (status !== 'all' && load.status !== status) return false;
        if (trailer !== 'all' && load.trailerType !== trailer) return false;
        if (!term) return true;
        return [load.reference, load.title, load.shipper, load.origin, load.destination]
          .join(' ')
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
  }, [state.loads, search, trailer, status]);

  const updateAlertForm = (key) => (event) => {
    setAlertForm((current) => ({ ...current, [key]: event.target.value }));
    setAlertError('');
  };

  const handleClaim = async (load) => {
    if (!member) {
      push('Sign in as a member to claim this load.', 'error');
      return;
    }
    if (!unlocked) {
      push('Your membership needs to be active before you can claim a load.', 'error');
      return;
    }
    try {
      const result = await claimLoad(load.id, member);
      if (result) {
      push(`Load ${load.reference} claimed. The shipper contact is now visible.`, 'success');
      } else {
      push('That load has already been filled.', 'error');
      }
    } catch (error) {
      push(error.message || 'Could not claim that load.', 'error');
    }
  };

  const handleAddAlert = async (event) => {
    event.preventDefault();
    if (!member) {
      push('Sign in as a member to set up job alerts.', 'error');
      return;
    }
    if (!alertForm.origin.trim() && !alertForm.destination.trim() && alertForm.trailerType === 'Any') {
      setAlertError('Add at least an origin, a destination or a vehicle type.');
      return;
    }
    try {
      await addAlert({
      ...alertForm,
      memberId: member.id,
      name: member.name,
      email: member.email,
      phone: member.phone
      });
      setAlertForm(EMPTY_ALERT);
      push('Job alert saved. We will match new loads against it.', 'success');
    } catch (error) {
      push(error.message || 'Could not save the job alert.', 'error');
    }
  };

  return (
    <>
      <PageHero
        eyebrow="Members only · verified daily"
        title="Loads that are checked before they reach you."
        description="Every shipper on this board is verified by the union office. Contact details unlock for members in good standing, and the union never takes a cut of your rate."
      >
        <div className="page-hero-actions">
          {session ? (
            <Link to={account.to} className="btn btn-primary">
              <Icon name="user" size={16} /> {account.label}
            </Link>
          ) : (
            <Link to="/membership" className="btn btn-primary">
              Join to unlock contacts <Icon name="arrowRight" size={16} />
            </Link>
          )}
          <a href="#alerts" className="btn btn-outline">
            <Icon name="bell" size={16} /> Set up job alerts
          </a>
        </div>
        <div className="board-summary">
          <div className="board-stat">
            <strong>{openCount}</strong>
            <span>loads open now</span>
          </div>
          <div className="board-stat">
            <strong>{state.loads.length}</strong>
            <span>posted this month</span>
          </div>
          <div className="board-stat">
            <strong>{new Set(state.loads.map((load) => load.shipper).filter(Boolean)).size}</strong>
            <span>verified shippers</span>
          </div>
        </div>
      </PageHero>

      <section className="section">
        <div className="container">
          <div className="board-head">
            <div>
              <span className="eyebrow">The board</span>
              <h2>Open freight across Ghana</h2>
              <p className="board-sub">
                {openCount} live loads worth {new Intl.NumberFormat('en-GH').format(totalRate)} GH₵
                in posted rates.
              </p>
            </div>
            {member ? (
              <div className="board-member">
                <StatusBadge status={member.status} />
                <div>
                  <strong>{member.name}</strong>
                  <span>{unlocked ? 'Contacts unlocked' : 'Contacts locked until dues are clear'}</span>
                </div>
              </div>
            ) : (
              <div className="board-member board-member-guest">
                <span className="board-member-icon"><Icon name="lock" size={17} /></span>
                <div>
                  <strong>Browsing as a guest</strong>
                  <span>Shipper contacts are hidden</span>
                </div>
              </div>
            )}
          </div>

          <div className="filter-bar loads-filter">
            <div className="filter-group">
              <div className="search-input">
                <Icon name="search" size={16} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search route, shipper or reference…"
                  aria-label="Search loads"
                />
              </div>
              <div className="chip-row">
                {STATUS_FILTERS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`chip ${status === item.id ? 'is-active' : ''}`}
                    onClick={() => setStatus(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="filter-group">
              <span className="filter-label"><Icon name="filter" size={13} /> Vehicle type</span>
              <div className="chip-row">
                <button
                  type="button"
                  className={`chip ${trailer === 'all' ? 'is-active' : ''}`}
                  onClick={() => setTrailer('all')}
                >
                  Any
                </button>
                {VEHICLE_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`chip ${trailer === type ? 'is-active' : ''}`}
                    onClick={() => setTrailer(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {state.loading ? (
            <div className="card">
              <p>Loading the load board…</p>
            </div>
          ) : filtered.length ? (
            <div className="load-grid">
              {filtered.map((load) => (
                <LoadCard
                  key={load.id}
                  load={load}
                  unlocked={unlocked}
                  showContact
                >
                  {load.status === 'open' && (
                    <>
                      {unlocked ? (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleClaim(load)}
                        >
                          <Icon name="check" size={15} /> Claim this load
                        </button>
                      ) : session?.role === 'staff' ? (
                        <Link to="/admin/loads" className="btn btn-outline btn-sm">
                          <Icon name="lock" size={14} /> Manage loads
                        </Link>
                      ) : (
                        <Link
                          to={session ? '/portal' : '/membership'}
                          className="btn btn-outline btn-sm"
                        >
                          <Icon name="lock" size={14} />{' '}
                          {session ? 'View membership status' : 'Join to claim'}
                        </Link>
                      )}
                      {unlocked ? (
                        <span className="load-lock load-lock-open">
                          <Icon name="phone" size={14} /> Contact visible
                        </span>
                      ) : (
                        <span className="load-lock">
                          <Icon name="lock" size={14} /> Members only
                        </span>
                      )}
                    </>
                  )}
                </LoadCard>
              ))}
            </div>
          ) : (
            <div className="card">
              <EmptyState
                icon="clipboard"
                title="No loads match those filters"
                description="Try clearing the search or choosing a different vehicle type. New loads are posted most weekday mornings."
                action={
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setSearch('');
                      setTrailer('all');
                      setStatus('open');
                    }}
                  >
                    Clear filters
                  </button>
                }
              />
            </div>
          )}

          <div className="load-board-note">
            <Icon name="shield" size={18} />
            <p>
              The union verifies the shipper, the rate and the pickup address before posting. If a
              load turns out to be different on the ground, call the member line and we will take it
              up with the shipper.
            </p>
            <Link to="/contact" className="card-link">
              Report a load <Icon name="arrowRight" size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className="section section-alt" id="alerts">
        <div className="container alerts-layout">
          <div className="alerts-copy">
            <span className="eyebrow">Job alerts</span>
            <h2>Stop refreshing the board.</h2>
            <p>
              Tell us the routes and rates you want and we will alert you when a matching load is
              posted. Choose instant alerts or a daily digest by SMS, email or both.
            </p>
            <ul className="check-list">
              <li><Icon name="check" size={16} /> Match by route, vehicle type and minimum rate</li>
              <li><Icon name="check" size={16} /> Instant, daily or weekly delivery</li>
              <li><Icon name="check" size={16} /> Pause any alert without deleting it</li>
            </ul>
            <div className="inline-note">
              <Icon name="smartphone" size={16} />
              <span>
                No smartphone? Call the member line and the office will set up SMS alerts for you.
              </span>
            </div>
          </div>

          {session?.role === 'staff' ? (
            <div className="card alerts-login">
              <span className="empty-icon"><Icon name="shield" size={26} /></span>
              <h3>Staff workspace</h3>
              <p>
                Job alerts belong to member accounts. Manage the load board and member alerts from
                the admin workspace.
              </p>
              <div className="alerts-login-actions">
                <Link to="/admin/loads" className="btn btn-primary">Manage loads</Link>
              </div>
            </div>
          ) : member ? (
            <div className="alerts-panel">
              <form className="card alert-form-card" onSubmit={handleAddAlert} noValidate>
                <div className="card-head">
                  <div>
                    <h3>New job alert</h3>
                    <p>We match this against every new load.</p>
                  </div>
                  <span className="card-chip">Member</span>
                </div>
                {alertError && (
                  <div className="form-error" role="alert">
                    <Icon name="alert" size={16} /> {alertError}
                  </div>
                )}
                <div className="form-grid">
                  <Field label="From" htmlFor="alert-origin">
                    <input
                      id="alert-origin"
                      value={alertForm.origin}
                      onChange={updateAlertForm('origin')}
                      placeholder="e.g. Tema"
                    />
                  </Field>
                  <Field label="To" htmlFor="alert-destination">
                    <input
                      id="alert-destination"
                      value={alertForm.destination}
                      onChange={updateAlertForm('destination')}
                      placeholder="e.g. Kumasi"
                    />
                  </Field>
                  <Field label="Vehicle type" htmlFor="alert-trailer">
                    <select
                      id="alert-trailer"
                      value={alertForm.trailerType}
                      onChange={updateAlertForm('trailerType')}
                    >
                      <option value="Any">Any vehicle</option>
                      {VEHICLE_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Minimum rate" htmlFor="alert-rate">
                    <div className="input-prefix">
                      <span>GH₵</span>
                      <input
                        id="alert-rate"
                        type="number"
                        min="0"
                        value={alertForm.minRate}
                        onChange={updateAlertForm('minRate')}
                        placeholder="e.g. 4500"
                      />
                    </div>
                  </Field>
                </div>
                <Field label="Delivery" htmlFor="alert-frequency">
                  <select
                    id="alert-frequency"
                    value={alertForm.frequency}
                    onChange={updateAlertForm('frequency')}
                  >
                    {ALERT_FREQUENCIES.map((frequency) => (
                      <option key={frequency.id} value={frequency.id}>{frequency.label}</option>
                    ))}
                  </select>
                </Field>
                <button type="submit" className="btn btn-primary btn-block">
                  <Icon name="bell" size={16} /> Save alert
                </button>
              </form>

              <div className="card alert-list-card">
                <div className="card-head">
                  <div>
                    <h3>Your alerts</h3>
                    <p>{alerts.length} saved · {alerts.filter((alert) => alert.active).length} active</p>
                  </div>
                  <Link to="/portal/alerts" className="card-link">
                    Manage <Icon name="arrowRight" size={14} />
                  </Link>
                </div>
                {alerts.length ? (
                  <ul className="alert-list">
                    {alerts.map((alert) => (
                      <li key={alert.id} className={alert.active ? '' : 'is-paused'}>
                        <div className="alert-item-main">
                          <strong>
                            {alert.origin || 'Anywhere'} <Icon name="arrowRight" size={12} />{' '}
                            {alert.destination || 'Anywhere'}
                          </strong>
                          <span>
                            {alert.trailerType} · min GH₵{alert.minRate || 0} ·{' '}
                            {ALERT_FREQUENCIES.find((entry) => entry.id === alert.frequency)?.label}
                          </span>
                          <span className="alert-matches">
                            <Icon name="spark" size={13} />{' '}
                            {countAlertMatches(state.loads, alert)} current matches
                          </span>
                        </div>
                        <div className="alert-actions">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={async () => {
                              try {
                                await updateAlert(alert.id, { active: !alert.active });
                                push(alert.active ? 'Alert paused.' : 'Alert resumed.', 'success');
                              } catch (error) {
                                push(error.message || 'Could not update the alert.', 'error');
                              }
                            }}
                          >
                            {alert.active ? 'Pause' : 'Resume'}
                          </button>
                          <button
                            type="button"
                            className="icon-btn icon-btn-danger"
                            onClick={async () => {
                              try {
                                await deleteAlert(alert.id);
                                push('Alert deleted.', 'success');
                              } catch (error) {
                                push(error.message || 'Could not delete the alert.', 'error');
                              }
                            }}
                            aria-label="Delete alert"
                          >
                            <Icon name="trash" size={15} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="alert-empty">You have not saved an alert yet.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="card alerts-login">
              <span className="empty-icon"><Icon name="bell" size={26} /></span>
              <h3>Sign in to set up alerts</h3>
              <p>
                Job alerts are a member benefit. Sign in with your member account, or join the union
                to get access to the board and alerts.
              </p>
              <div className="alerts-login-actions">
                <Link to="/login" className="btn btn-primary">Member login</Link>
                <Link to="/membership" className="btn btn-outline">Join the union</Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
