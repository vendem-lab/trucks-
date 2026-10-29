import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero.jsx';
import Field from '../components/Field.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import { EVENT_TYPES } from '../config.js';
import { isDemoMode, registerForEvent, useStore } from '../lib/store.js';
import { eventDateParts, eventDateRange, eventTime } from '../lib/union.js';
import { formatCurrency, isValidEmail, isValidPhone } from '../lib/format.js';
import { useAuth } from '../context/authContext.js';
import { useToast } from '../context/ToastContext.jsx';

const EMPTY_REGISTRATION = { name: '', email: '', phone: '' };

function typeLabel(id) {
  return EVENT_TYPES.find((entry) => entry.id === id)?.label || 'Event';
}

function isPast(event) {
  return new Date(event.endDate || event.startDate).getTime() < Date.now() - 86400000;
}

export default function Events() {
  const state = useStore();
  const { session } = useAuth();
  const { push } = useToast();
  const [type, setType] = useState('all');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_REGISTRATION);
  const [errors, setErrors] = useState({});

  const member =
    session?.role === 'member'
      ? state.members.find((entry) => entry.id === session.memberId)
      : null;

  const filtered = useMemo(() => {
    return [...state.events]
      .filter((event) => type === 'all' || event.type === type)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  }, [state.events, type]);

  const upcoming = filtered.filter((event) => !isPast(event));
  const past = filtered.filter(isPast).reverse();

  const openRegistration = (event) => {
    if (!isDemoMode() && !session) {
      push('Sign in before registering for an event.', 'error');
      return;
    }
    if (event.memberOnly && !member) {
      push('Sign in as a member to register for this event.', 'error');
      return;
    }
    setSelected(event);
    setForm({
      name: member?.name || '',
      email: member?.email || '',
      phone: member?.phone || ''
    });
    setErrors({});
  };

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const registeredFor = (event) =>
    state.registrations.some(
      (registration) =>
        registration.eventId === event.id &&
        String(registration.email || '').toLowerCase() === String(member?.email || session?.email || '').toLowerCase()
    );

  const handleRegister = async (event) => {
    event.preventDefault();
    if (!selected) return;
    const next = {};
    if (!form.name.trim()) next.name = 'Enter your full name.';
    if (!isValidEmail(form.email)) next.email = 'Enter a valid email address.';
    if (!isValidPhone(form.phone)) next.phone = 'Enter a phone number.';
    setErrors(next);
    if (Object.keys(next).length) return;

    try {
      const result = await registerForEvent(selected.id, {
        ...form,
        memberId: member?.id || ''
      });
      if (!result.ok && result.error) {
        push(result.error, 'error');
        return;
      }
      if (!result.ok) {
        push(
          result.duplicate
            ? 'You are already registered for this event.'
            : result.error || 'Registration failed.',
          'error'
        );
        return;
      }
      push(`You are registered for ${selected.title}.`, 'success');
      setSelected(null);
    } catch (error) {
      const messages = {
        'functions/already-exists': 'You are already registered for this event.',
        'functions/failed-precondition': 'Your account must have an active membership to register for this event.',
        'functions/permission-denied': 'Your account is not allowed to register for this event.',
        'functions/resource-exhausted': 'This event is full.',
        'functions/unavailable': 'Registration is temporarily unavailable. Try again shortly.',
        'functions/deadline-exceeded': 'Registration took too long. Check your registration before trying again.',
        'functions/internal': 'Registration could not be completed. Please try again or contact the union office.'
      };
      const message = error.code === 'functions/not-found'
        ? /registerForEvent/i.test(error.message || '')
          ? 'The registration service is not deployed. Please contact the site administrator.'
          : 'This event could not be found. Refresh the page and try again.'
        : messages[error.code] || error.message || 'Registration failed.';
      push(message, 'error');
    }
  };

  return (
    <>
      <PageHero
        eyebrow="Events & training"
        title="Meet the people who will stand with you."
        description="Members’ meetings, safety courses and the Annual General Meeting. Most training is free for members, and travel support is available for regional events."
      >
        <div className="page-hero-actions">
          <a href="#upcoming" className="btn btn-primary">
            See upcoming events <Icon name="arrowRight" size={16} />
          </a>
          <Link to="/membership" className="btn btn-outline">Join to attend</Link>
        </div>
      </PageHero>

      <section className="section" id="upcoming">
        <div className="container">
          <h2 className="sr-only">Upcoming events</h2>
          <div className="events-filter">
            <div className="chip-row">
              <button
                type="button"
                className={`chip ${type === 'all' ? 'is-active' : ''}`}
                onClick={() => setType('all')}
              >
                All events
              </button>
              {EVENT_TYPES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`chip ${type === item.id ? 'is-active' : ''}`}
                  onClick={() => setType(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <span className="events-count">
              {upcoming.length} upcoming
            </span>
          </div>

          {state.loading ? (
            <div className="card">
              <p>Loading events…</p>
            </div>
          ) : upcoming.length ? (
            <div className="event-list">
              {upcoming.map((event) => {
                const parts = eventDateParts(event.startDate);
                const spaces = Math.max((Number(event.capacity) || 0) - (Number(event.registered) || 0), 0);
                const percent = event.capacity
                  ? Math.min(100, Math.round((event.registered / event.capacity) * 100))
                  : 0;
                const registered = registeredFor(event);
                return (
                  <article key={event.id} className="event-card">
                    <div className="event-card-date">
                      <strong>{parts.day}</strong>
                      <span>{parts.month}</span>
                      <span className="event-card-year">{parts.year}</span>
                    </div>
                    <div className="event-card-main">
                      <div className="event-card-head">
                        <div>
                          <span className="event-type">{typeLabel(event.type)}</span>
                          <h3>{event.title}</h3>
                        </div>
                        {event.memberOnly ? (
                          <span className="badge badge-brand">Members only</span>
                        ) : (
                          <span className="badge badge-info">Open to all</span>
                        )}
                      </div>
                      <p className="event-card-copy">{event.description}</p>
                      <div className="event-card-meta">
                        <span><Icon name="calendar" size={14} /> {eventDateRange(event.startDate, event.endDate)}</span>
                        <span><Icon name="mapPin" size={14} /> {event.location}</span>
                        <span><Icon name="user" size={14} /> {event.trainer}</span>
                        <span><Icon name="wallet" size={14} /> {event.fee ? formatCurrency(event.fee) : 'Free'}</span>
                      </div>
                      <div className="event-capacity">
                        <div className="event-capacity-head">
                          <span>{event.registered} registered · {spaces} places left</span>
                          <span>{percent}% full</span>
                        </div>
                        <div className="event-capacity-track">
                          <span style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="event-card-actions">
                      {registered ? (
                        <span className="event-registered">
                          <Icon name="checkCircle" size={16} /> Registered
                        </span>
                      ) : spaces === 0 ? (
                        <span className="event-registered event-registered-full">Fully booked</span>
                      ) : event.memberOnly && !member ? (
                        <Link to="/login" className="btn btn-primary btn-sm">
                          Sign in to register
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => openRegistration(event)}
                        >
                          Register <Icon name="arrowRight" size={14} />
                        </button>
                      )}
                      <span className="event-card-time">
                        <Icon name="clock" size={13} /> {eventTime(event.startDate)}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="card">
              <div className="empty-state">
                <span className="empty-icon"><Icon name="calendar" size={26} /></span>
                <h3>No upcoming events in this category</h3>
                <p>Try another category. New meetings and courses are added after each regional committee meeting.</p>
                <button type="button" className="btn btn-outline" onClick={() => setType('all')}>
                  Show all events
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {past.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <div className="section-head">
              <div>
                <span className="eyebrow">Recently held</span>
                <h2>Past events</h2>
              </div>
              <p className="section-lede">
                Reports and materials from past sessions are available from the union office.
              </p>
            </div>
            <div className="event-past-grid">
              {past.map((event) => {
                const parts = eventDateParts(event.startDate);
                return (
                  <article key={event.id} className="event-past-card">
                    <span className="event-past-date">{parts.day} {parts.month} {parts.year}</span>
                    <h3>{event.title}</h3>
                    <p>{event.description}</p>
                    <div className="event-past-meta">
                      <span><Icon name="mapPin" size={13} /> {event.location}</span>
                      <span>{event.registered} attended</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="cta-band">
        <div className="container cta-inner">
          <div>
            <h2>Training is how we make the road safer.</h2>
            <p>
              Members get free or subsidised places on every course. If you need transport support to
              attend, ask the training desk when you register.
            </p>
          </div>
          <div className="cta-actions">
            <Link to="/membership" className="btn btn-primary btn-lg">
              Join the union <Icon name="arrowRight" size={18} />
            </Link>
            <Link to="/contact" className="btn btn-ghost btn-lg">Ask about training</Link>
          </div>
        </div>
      </section>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `Register for ${selected.title}` : 'Register'}
        subtitle={selected ? eventDateRange(selected.startDate, selected.endDate) : ''}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setSelected(null)}>
              Cancel
            </button>
            <button type="submit" form="event-registration-form" className="btn btn-primary">
              Confirm registration
            </button>
          </>
        }
      >
        {selected && (
          <form id="event-registration-form" onSubmit={handleRegister} className="modal-form" noValidate>
            <div className="inline-note">
              <Icon name="mapPin" size={16} />
              <span>{selected.location} · {eventTime(selected.startDate)} start</span>
            </div>
            <div className="form-grid">
              <Field label="Full name" htmlFor="reg-name" required error={errors.name}>
                <input id="reg-name" value={form.name} onChange={update('name')} placeholder="Your name" />
              </Field>
              <Field label="Email" htmlFor="reg-email" required error={errors.email}>
                <input id="reg-email" type="email" value={form.email} onChange={update('email')} placeholder="you@example.com" />
              </Field>
            </div>
            <Field label="Phone" htmlFor="reg-phone" required error={errors.phone}>
              <input id="reg-phone" type="tel" value={form.phone} onChange={update('phone')} placeholder="+233 24 000 0000" />
            </Field>
            <p className="join-terms">
              {selected.fee
                ? `The fee is ${formatCurrency(selected.fee)}, payable at the venue.`
                : 'This event is free for members.'}{' '}
              We will send a reminder by SMS before the event.
            </p>
          </form>
        )}
      </Modal>
    </>
  );
}
