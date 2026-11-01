import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero.jsx';
import LoadCard from '../components/LoadCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Field from '../components/Field.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { ALERT_FREQUENCIES, BRAND, VEHICLE_TYPES } from '../config.js';
import {
  addAlert,
  claimLoad,
  deleteAlert,
  markLoadDelivered,
  submitLoadRequest,
  updateAlert,
  useStore
} from '../lib/store.js';
import { countAlertMatches } from '../lib/union.js';
import {
  checkLoadRequestRate,
  emptyLoadRequest,
  readLoadRequestTimes,
  recordLoadRequestTime,
  validateLoadRequest
} from '../lib/loadRequests.js';
import { validateDelivery } from '../lib/deliveries.js';
import { compressVehiclePhoto } from '../lib/image.js';
import { useAuth } from '../context/authContext.js';
import { accountLinkFor } from '../lib/sessionLinks.js';
import { useToast } from '../context/ToastContext.jsx';

const STATUS_FILTERS = [
  { id: 'open', label: 'Open loads' },
  { id: 'filled', label: 'Claimed' },
  { id: 'delivered', label: 'Delivered' },
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
  const [requestForm, setRequestForm] = useState(() => emptyLoadRequest());
  const [requestErrors, setRequestErrors] = useState({});
  const [requestError, setRequestError] = useState('');
  const [requestSent, setRequestSent] = useState(null);
  const [deliveryLoad, setDeliveryLoad] = useState(null);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [deliveryPhoto, setDeliveryPhoto] = useState('');
  const [deliveryErrors, setDeliveryErrors] = useState({});
  const [photoBusy, setPhotoBusy] = useState(false);

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

  const openDelivery = (load) => {
    setDeliveryLoad(load);
    setDeliveryNote('');
    setDeliveryPhoto('');
    setDeliveryErrors({});
  };

  const handleDeliveryPhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoBusy(true);
    setDeliveryErrors((current) => ({ ...current, photo: '' }));
    try {
      const dataUrl = await compressVehiclePhoto(file);
      setDeliveryPhoto(dataUrl);
    } catch (error) {
      setDeliveryErrors((current) => ({ ...current, photo: error.message }));
    } finally {
      setPhotoBusy(false);
      event.target.value = '';
    }
  };

  const handleMarkDelivered = async (event) => {
    event.preventDefault();
    if (!deliveryLoad) return;
    const errors = validateDelivery({ note: deliveryNote, photo: deliveryPhoto });
    setDeliveryErrors(errors);
    if (Object.keys(errors).length) return;
    try {
      await markLoadDelivered(deliveryLoad.id, member, {
        note: deliveryNote,
        photo: deliveryPhoto
      });
      push(
        `Load ${deliveryLoad.reference} marked delivered. The shipper can now confirm it.`,
        'success'
      );
      setDeliveryLoad(null);
    } catch (error) {
      push(error.message || 'Could not record the delivery.', 'error');
    }
  };

  const handleAddAlert = async (event) => {    event.preventDefault();
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

  const updateRequestForm = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setRequestForm((current) => ({ ...current, [key]: value }));
    setRequestError('');
    setRequestErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const handlePostLoad = async (event) => {
    event.preventDefault();
    // Honeypot: real shippers never fill this hidden field.
    if (String(requestForm.website || '').trim()) {
      setRequestSent({ reference: '' });
      return;
    }

    const errors = validateLoadRequest(requestForm);
    setRequestErrors(errors);
    if (Object.keys(errors).length) {
      push('Check the highlighted fields before submitting.', 'error');
      return;
    }

    const limit = checkLoadRequestRate(readLoadRequestTimes());
    if (!limit.allowed) {
      const minutes = Math.max(1, Math.ceil(limit.retryAfterMs / 60000));
      setRequestError(
        `You have sent several requests. Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`
      );
      return;
    }

    try {
      const saved = await submitLoadRequest(requestForm);
      recordLoadRequestTime();
      setRequestSent(saved);
      setRequestForm(emptyLoadRequest());
      setRequestErrors({});
      push('Load request received. The union office will review it.', 'success');
    } catch (error) {
      setRequestError(error.message || 'Could not submit the load request. Please try again.');
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
          <a href="#post-load" className="btn btn-outline">
            <Icon name="plus" size={16} /> Post a load
          </a>
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
                  contact={
                    (state.loadContacts || []).find((entry) => entry.loadId === load.id) || null
                  }
                  unlocked={unlocked}
                  showContact
                >
                  {load.status === 'filled' && load.filledById === member?.id && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => openDelivery(load)}
                    >
                      <Icon name="checkCircle" size={15} /> Mark as delivered
                    </button>
                  )}
                  {load.status === 'delivered' && load.filledById === member?.id && (
                    <span className="load-lock load-lock-open">
                      <Icon name="clock" size={14} /> Awaiting shipper confirmation
                    </span>
                  )}
                  {load.status === 'disputed' && load.filledById === member?.id && (
                    <span className="load-lock">
                      <Icon name="alert" size={14} /> Shipper reported a problem
                    </span>
                  )}
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
            <Link to="/confirm-delivery" className="card-link">
              Confirm a delivery <Icon name="arrowRight" size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className="section" id="post-load">
        <div className="container post-load-layout">
          <div className="post-load-copy">
            <span className="eyebrow">For shippers</span>
            <h2>Have freight to move?</h2>
            <p>
              Send the details and the union office will check the shipper, rate and pickup address
              before publishing the load to verified drivers. There is no fee and the union never
              takes a cut of the rate.
            </p>
            <ul className="check-list">
              <li><Icon name="check" size={16} /> Reviewed on weekdays, usually within one working day</li>
              <li><Icon name="check" size={16} /> Contact details stay hidden from the public board</li>
              <li><Icon name="check" size={16} /> You are contacted if anything needs clarifying</li>
            </ul>
            <div className="inline-note">
              <Icon name="shield" size={16} />
              <span>
                We reject unverified brokers, upfront-fee requests and loads without a clear pickup
                address.
              </span>
            </div>
          </div>

          <div className="card post-load-card">
            {requestSent ? (
              <div className="post-load-success">
                <span className="quote-success-icon">
                  <Icon name="checkCircle" size={30} />
                </span>
                <h2>Request received</h2>
                <p>
                  {requestSent.reference ? (
                    <>Your reference is <strong>{requestSent.reference}</strong>. </>
                  ) : null}
                  The union office checks the shipper, the rate and the pickup address before the
                  load appears on the board. We will contact you if anything needs clarifying.
                </p>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setRequestSent(null)}
                >
                  Post another load
                </button>
              </div>
            ) : (
              <form onSubmit={handlePostLoad} noValidate>
                <div className="card-head">
                  <div>
                    <h2>Post a load for review</h2>
                    <p>Free for shippers. Every request is checked before it goes live.</p>
                  </div>
                  <span className="card-chip">Shippers</span>
                </div>

                {requestError && (
                  <div className="form-error" role="alert">
                    <Icon name="alert" size={16} /> {requestError}
                  </div>
                )}

                <div className="form-grid">
                  <Field label="Cargo" htmlFor="request-title" required error={requestErrors.title}>
                    <input
                      id="request-title"
                      value={requestForm.title}
                      onChange={updateRequestForm('title')}
                      placeholder="e.g. Palletted building materials"
                    />
                  </Field>
                  <Field label="Shipper / company" htmlFor="request-shipper" required error={requestErrors.shipper}>
                    <input
                      id="request-shipper"
                      value={requestForm.shipper}
                      onChange={updateRequestForm('shipper')}
                      placeholder="e.g. BuildRight Construction"
                      autoComplete="organization"
                    />
                  </Field>
                  <Field label="Contact name" htmlFor="request-contact" required error={requestErrors.contactName}>
                    <input
                      id="request-contact"
                      value={requestForm.contactName}
                      onChange={updateRequestForm('contactName')}
                      placeholder="Who should the office call?"
                      autoComplete="name"
                    />
                  </Field>
                  <Field label="Contact phone" htmlFor="request-phone" required error={requestErrors.contactPhone}>
                    <input
                      id="request-phone"
                      type="tel"
                      value={requestForm.contactPhone}
                      onChange={updateRequestForm('contactPhone')}
                      placeholder="+233 24 000 0000"
                      autoComplete="tel"
                    />
                  </Field>
                  <Field label="Contact email" htmlFor="request-email" required error={requestErrors.contactEmail}>
                    <input
                      id="request-email"
                      type="email"
                      value={requestForm.contactEmail}
                      onChange={updateRequestForm('contactEmail')}
                      placeholder="ops@shipper.com"
                      autoComplete="email"
                    />
                  </Field>
                  <Field label="Vehicle type" htmlFor="request-vehicle" required error={requestErrors.vehicleType}>
                    <select
                      id="request-vehicle"
                      value={requestForm.vehicleType}
                      onChange={updateRequestForm('vehicleType')}
                    >
                      {VEHICLE_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Pickup from" htmlFor="request-origin" required error={requestErrors.origin}>
                    <input
                      id="request-origin"
                      value={requestForm.origin}
                      onChange={updateRequestForm('origin')}
                      placeholder="e.g. Tema"
                    />
                  </Field>
                  <Field label="Deliver to" htmlFor="request-destination" required error={requestErrors.destination}>
                    <input
                      id="request-destination"
                      value={requestForm.destination}
                      onChange={updateRequestForm('destination')}
                      placeholder="e.g. Kumasi"
                    />
                  </Field>
                  <Field label="Weight" htmlFor="request-weight" required error={requestErrors.weightTons}>
                    <div className="input-suffix">
                      <input
                        id="request-weight"
                        type="number"
                        min="0.1"
                        max="100"
                        step="0.1"
                        value={requestForm.weightTons}
                        onChange={updateRequestForm('weightTons')}
                        placeholder="18"
                      />
                      <span>t</span>
                    </div>
                  </Field>
                  <Field label="Rate offered" htmlFor="request-rate" required error={requestErrors.rate}>
                    <div className="input-prefix">
                      <span>GH₵</span>
                      <input
                        id="request-rate"
                        type="number"
                        min="1"
                        value={requestForm.rate}
                        onChange={updateRequestForm('rate')}
                        placeholder="6200"
                      />
                    </div>
                  </Field>
                  <Field label="Pickup date" htmlFor="request-pickup" required error={requestErrors.pickupDate}>
                    <input
                      id="request-pickup"
                      type="date"
                      value={requestForm.pickupDate}
                      onChange={updateRequestForm('pickupDate')}
                    />
                  </Field>
                  <Field label="Delivery date" htmlFor="request-delivery" error={requestErrors.deliveryDate}>
                    <input
                      id="request-delivery"
                      type="date"
                      value={requestForm.deliveryDate}
                      onChange={updateRequestForm('deliveryDate')}
                    />
                  </Field>
                </div>

                <Field
                  label="Loading requirements"
                  htmlFor="request-requirements"
                  hint="Straps, temperature, permits, loading crew or access notes."
                  error={requestErrors.requirements}
                >
                  <textarea
                    id="request-requirements"
                    rows="3"
                    value={requestForm.requirements}
                    onChange={updateRequestForm('requirements')}
                    placeholder="Anything the driver needs to know before accepting…"
                  />
                </Field>

                <div className="hp-field" aria-hidden="true">
                  <label htmlFor="request-website">Website</label>
                  <input
                    id="request-website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={requestForm.website}
                    onChange={updateRequestForm('website')}
                  />
                </div>

                <label className={`check-field ${requestErrors.consent ? 'is-invalid' : ''}`}>
                  <input
                    type="checkbox"
                    checked={requestForm.consent}
                    onChange={updateRequestForm('consent')}
                  />
                  <span>I confirm I am authorised to post this load and the details are accurate.</span>
                </label>
                {requestErrors.consent && (
                  <span className="field-error check-error">{requestErrors.consent}</span>
                )}

                <button type="submit" className="btn btn-primary btn-block">
                  <Icon name="shield" size={16} /> Submit for review
                </button>
                <p className="post-load-foot">
                  Need to change a request? Call the office on {BRAND.phone} and quote the reference
                  shown after you submit.
                </p>
              </form>
            )}
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

      <Modal
        open={Boolean(deliveryLoad)}
        onClose={() => setDeliveryLoad(null)}
        title="Mark this load delivered"
        subtitle={
          deliveryLoad
            ? `${deliveryLoad.reference} · ${deliveryLoad.origin} → ${deliveryLoad.destination}`
            : ''
        }
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDeliveryLoad(null)}>
              Cancel
            </button>
            <button type="submit" form="delivery-form" className="btn btn-primary" disabled={photoBusy}>
              <Icon name="checkCircle" size={15} /> Confirm delivery
            </button>
          </>
        }
      >
        {deliveryLoad && (
          <form id="delivery-form" onSubmit={handleMarkDelivered} className="modal-form" noValidate>
            <p className="confirm-copy">
              The shipper is asked to confirm this delivery using reference{' '}
              <strong>{deliveryLoad.reference}</strong>. The union office sees your note and photo
              before the load is closed.
            </p>
            <Field
              label="Delivery note"
              htmlFor="delivery-note"
              required
              error={deliveryErrors.note}
              hint="Where and when it was offloaded, and who signed for it."
            >
              <textarea
                id="delivery-note"
                rows="3"
                value={deliveryNote}
                onChange={(event) => {
                  setDeliveryNote(event.target.value);
                  setDeliveryErrors((current) => ({ ...current, note: '' }));
                }}
                placeholder="Offloaded at the Kumasi yard at 14:20. Waybill signed by the store keeper."
              />
            </Field>
            <Field
              label="Proof of delivery photo"
              htmlFor="delivery-photo"
              hint="Optional. A photo of the signed waybill or the offloaded cargo."
              error={deliveryErrors.photo}
            >
              <input
                id="delivery-photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleDeliveryPhoto}
              />
            </Field>
            {photoBusy && <p className="field-hint">Preparing the photo…</p>}
            {deliveryPhoto && (
              <div className="delivery-photo-preview">
                <img src={deliveryPhoto} alt="Proof of delivery preview" />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setDeliveryPhoto('')}
                >
                  Remove photo
                </button>
              </div>
            )}
          </form>
        )}
      </Modal>
    </>
  );
}
