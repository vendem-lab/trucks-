import { useMemo, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import Field from '../../components/Field.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Icon from '../../components/Icon.jsx';
import { EVENT_TYPES, REGIONS } from '../../config.js';
import {
  addEvent,
  deleteEvent,
  deleteRegistration,
  updateEvent,
  useStore
} from '../../lib/store.js';
import { eventDateRange, eventTime } from '../../lib/union.js';
import { formatCurrency, formatDateTime, initials } from '../../lib/format.js';
import { useToast } from '../../context/ToastContext.jsx';

function pad(value) {
  return String(value).padStart(2, '0');
}

function toInputDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function defaultStart() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(9, 0, 0, 0);
  return toInputDateTime(date.toISOString());
}

function emptyEvent() {
  return {
    title: '',
    type: 'meeting',
    description: '',
    location: '',
    region: 'Greater Accra',
    startDate: defaultStart(),
    endDate: '',
    capacity: '100',
    fee: '0',
    memberOnly: true,
    trainer: ''
  };
}

function toForm(event) {
  return {
    title: event.title || '',
    type: event.type || 'meeting',
    description: event.description || '',
    location: event.location || '',
    region: event.region || 'Greater Accra',
    startDate: toInputDateTime(event.startDate),
    endDate: toInputDateTime(event.endDate),
    capacity: String(event.capacity ?? ''),
    fee: String(event.fee ?? 0),
    memberOnly: Boolean(event.memberOnly),
    trainer: event.trainer || ''
  };
}

function typeLabel(id) {
  return EVENT_TYPES.find((entry) => entry.id === id)?.label || 'Event';
}

export default function EventsAdmin() {
  const state = useStore();
  const { push } = useToast();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyEvent);
  const [errors, setErrors] = useState({});
  const [detailId, setDetailId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [registrationToDelete, setRegistrationToDelete] = useState(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...state.events]
      .filter((event) => {
        if (typeFilter !== 'all' && event.type !== typeFilter) return false;
        if (!term) return true;
        return [event.title, event.location, event.region, event.trainer]
          .join(' ')
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  }, [state.events, search, typeFilter]);

  const detail = detailId ? state.events.find((event) => event.id === detailId) : null;
  const deleting = deleteId ? state.events.find((event) => event.id === deleteId) : null;
  const detailRegistrations = detail
    ? state.registrations
        .filter((registration) => registration.eventId === detail.id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    : [];

  const update = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyEvent());
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (event) => {
    setEditingId(event.id);
    setForm(toForm(event));
    setErrors({});
    setFormOpen(true);
    setDetailId(null);
  };

  const handleSave = (event) => {
    event.preventDefault();
    const next = {};
    if (!form.title.trim()) next.title = 'Add an event title.';
    if (!form.description.trim()) next.description = 'Describe what the event covers.';
    if (!form.location.trim()) next.location = 'Add a venue.';
    if (!form.startDate) next.startDate = 'Choose a start date and time.';
    if (!(Number(form.capacity) > 0)) next.capacity = 'Add a capacity.';
    if (form.endDate && new Date(form.endDate) <= new Date(form.startDate)) {
      next.endDate = 'The end must be after the start.';
    }
    setErrors(next);
    if (Object.keys(next).length) {
      push('Check the highlighted fields.', 'error');
      return;
    }

    const payload = {
      ...form,
      startDate: new Date(form.startDate).toISOString(),
      endDate: form.endDate ? new Date(form.endDate).toISOString() : '',
      capacity: Number(form.capacity) || 0,
      fee: Number(form.fee) || 0
    };

    if (editingId) {
      updateEvent(editingId, payload);
      push('Event updated.', 'success');
    } else {
      addEvent(payload);
      push('Event published to the events page.', 'success');
    }
    setFormOpen(false);
  };

  const handleDelete = () => {
    if (!deleting) return;
    deleteEvent(deleting.id);
    push('Event deleted.', 'success');
    setDeleteId(null);
    if (detailId === deleting.id) setDetailId(null);
  };

  const handleRemoveRegistration = () => {
    if (!registrationToDelete) return;
    deleteRegistration(registrationToDelete.id);
    push(`${registrationToDelete.name} removed from the event.`, 'success');
    setRegistrationToDelete(null);
  };

  const upcomingCount = state.events.filter(
    (event) => new Date(event.startDate).getTime() >= Date.now() - 86400000
  ).length;

  return (
    <div className="admin-page">
      <div className="admin-toolbar">
        <div className="admin-toolbar-filters">
          <div className="search-input">
            <Icon name="search" size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search events, venues or trainers…"
              aria-label="Search events"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            aria-label="Filter by event type"
          >
            <option value="all">All types</option>
            {EVENT_TYPES.map((type) => (
              <option key={type.id} value={type.id}>{type.label}</option>
            ))}
          </select>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <Icon name="plus" size={16} /> New event
        </button>
      </div>

      <div className="admin-count">
        <span>{filtered.length} of {state.events.length} events · {upcomingCount} upcoming</span>
      </div>

      <div className="card card-flush">
        {filtered.length ? (
          <div className="table-wrap">
            <table className="data-table admin-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Type</th>
                  <th>When</th>
                  <th>Venue</th>
                  <th>Registered</th>
                  <th>Fee</th>
                  <th className="table-actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((event) => {
                  const percent = event.capacity
                    ? Math.min(100, Math.round((event.registered / event.capacity) * 100))
                    : 0;
                  return (
                    <tr key={event.id}>
                      <td>
                        <button
                          type="button"
                          className="table-strong table-ref-button"
                          onClick={() => setDetailId(event.id)}
                        >
                          {event.title}
                        </button>
                        <span className="table-sub">
                          {event.memberOnly ? 'Members only' : 'Open to all'}
                        </span>
                      </td>
                      <td>{typeLabel(event.type)}</td>
                      <td>
                        {eventDateRange(event.startDate, event.endDate)}
                        <span className="table-sub">{eventTime(event.startDate)} start</span>
                      </td>
                      <td>
                        {event.location}
                        <span className="table-sub">{event.region}</span>
                      </td>
                      <td>
                        <span className="table-strong">{event.registered} / {event.capacity}</span>
                        <span className="table-sub">{percent}% full</span>
                      </td>
                      <td className="table-strong">
                        {event.fee ? formatCurrency(event.fee) : 'Free'}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => setDetailId(event.id)}
                            aria-label={`View ${event.title}`}
                          >
                            <Icon name="eye" size={16} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => openEdit(event)}
                            aria-label={`Edit ${event.title}`}
                          >
                            <Icon name="edit" size={16} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn icon-btn-danger"
                            onClick={() => setDeleteId(event.id)}
                            aria-label={`Delete ${event.title}`}
                          >
                            <Icon name="trash" size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon="calendar"
            title="No events match"
            description="Adjust the search or filters, or create a new meeting or training session."
            action={
              <button type="button" className="btn btn-primary" onClick={openCreate}>
                <Icon name="plus" size={16} /> New event
              </button>
            }
          />
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? 'Edit event' : 'New event'}
        subtitle={editingId ? 'Changes appear on the public events page.' : 'Publish a meeting, course or outreach.'}
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>Cancel</button>
            <button type="submit" form="event-form" className="btn btn-primary">
              {editingId ? 'Save changes' : 'Publish event'}
            </button>
          </>
        }
      >
        <form id="event-form" onSubmit={handleSave} className="modal-form" noValidate>
          <Field label="Event title" htmlFor="event-title" required error={errors.title}>
            <input
              id="event-title"
              value={form.title}
              onChange={update('title')}
              placeholder="e.g. Defensive driving refresher — Kumasi"
            />
          </Field>
          <div className="form-grid">
            <Field label="Type" htmlFor="event-type">
              <select id="event-type" value={form.type} onChange={update('type')}>
                {EVENT_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Region" htmlFor="event-region">
              <select id="event-region" value={form.region} onChange={update('region')}>
                {REGIONS.map((region) => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </Field>
            <Field label="Starts" htmlFor="event-start" required error={errors.startDate}>
              <input
                id="event-start"
                type="datetime-local"
                value={form.startDate}
                onChange={update('startDate')}
              />
            </Field>
            <Field label="Ends" htmlFor="event-end" error={errors.endDate} hint="Optional for single sessions.">
              <input
                id="event-end"
                type="datetime-local"
                value={form.endDate}
                onChange={update('endDate')}
              />
            </Field>
            <Field label="Venue" htmlFor="event-location" required error={errors.location}>
              <input
                id="event-location"
                value={form.location}
                onChange={update('location')}
                placeholder="e.g. Union House, Accra"
              />
            </Field>
            <Field label="Trainer or lead" htmlFor="event-trainer">
              <input
                id="event-trainer"
                value={form.trainer}
                onChange={update('trainer')}
                placeholder="e.g. Nii Armah"
              />
            </Field>
            <Field label="Capacity" htmlFor="event-capacity" required error={errors.capacity}>
              <input
                id="event-capacity"
                type="number"
                min="1"
                value={form.capacity}
                onChange={update('capacity')}
                placeholder="100"
              />
            </Field>
            <Field label="Fee" htmlFor="event-fee" hint="Leave at 0 for a free event.">
              <div className="input-prefix">
                <span>GH₵</span>
                <input
                  id="event-fee"
                  type="number"
                  min="0"
                  value={form.fee}
                  onChange={update('fee')}
                  placeholder="0"
                />
              </div>
            </Field>
          </div>
          <Field label="Description" htmlFor="event-description" required error={errors.description}>
            <textarea
              id="event-description"
              rows="4"
              value={form.description}
              onChange={update('description')}
              placeholder="What the session covers, who should attend and what to bring…"
            />
          </Field>
          <label className="switch-field">
            <input type="checkbox" checked={form.memberOnly} onChange={update('memberOnly')} />
            <span className="switch-ui" />
            <span>
              <strong>Members only</strong>
              <span>Only signed-in members can register for this event.</span>
            </span>
          </label>
        </form>
      </Modal>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetailId(null)}
        title={detail ? detail.title : 'Event'}
        subtitle={detail ? `${typeLabel(detail.type)} · ${eventDateRange(detail.startDate, detail.endDate)}` : ''}
        size="lg"
        footer={
          detail && (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setDeleteId(detail.id)}>
                <Icon name="trash" size={15} /> Delete event
              </button>
              <button type="button" className="btn btn-outline" onClick={() => openEdit(detail)}>
                <Icon name="edit" size={15} /> Edit event
              </button>
            </>
          )
        }
      >
        {detail && (
          <div className="event-detail">
            <dl className="detail-grid">
              <div><dt>Venue</dt><dd>{detail.location}</dd></div>
              <div><dt>Region</dt><dd>{detail.region}</dd></div>
              <div><dt>Starts</dt><dd>{formatDateTime(detail.startDate)}</dd></div>
              <div><dt>Ends</dt><dd>{detail.endDate ? formatDateTime(detail.endDate) : '—'}</dd></div>
              <div><dt>Trainer</dt><dd>{detail.trainer || '—'}</dd></div>
              <div><dt>Fee</dt><dd>{detail.fee ? formatCurrency(detail.fee) : 'Free'}</dd></div>
              <div><dt>Capacity</dt><dd>{detail.capacity} places</dd></div>
              <div><dt>Registered</dt><dd>{detail.registered} people</dd></div>
              <div><dt>Audience</dt><dd>{detail.memberOnly ? 'Members only' : 'Open to all'}</dd></div>
            </dl>

            {detail.description && (
              <p className="detail-notes">
                <Icon name="fileText" size={15} /> {detail.description}
              </p>
            )}

            <div className="event-registrations">
              <div className="member-dues-head">
                <h3>Registrations</h3>
                <span>{detailRegistrations.length} listed</span>
              </div>
              {detailRegistrations.length ? (
                <ul className="admin-mini-list">
                  {detailRegistrations.map((registration) => (
                    <li key={registration.id}>
                      <span className="avatar avatar-sm">{initials(registration.name)}</span>
                      <div>
                        <strong>{registration.name}</strong>
                        <span>{registration.email} · {registration.phone}</span>
                      </div>
                      <div className="admin-mini-right">
                        <span className="table-sub">{formatDateTime(registration.createdAt)}</span>
                        <button
                          type="button"
                          className="icon-btn icon-btn-danger"
                          onClick={() => setRegistrationToDelete(registration)}
                          aria-label={`Remove ${registration.name}`}
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="inline-empty">
                  <Icon name="users" size={16} /> No one has registered through the site yet.
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleteId(null)}
        title="Delete event?"
        subtitle={deleting ? deleting.title : ''}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button>
            <button type="button" className="btn btn-danger" onClick={handleDelete}>Delete event</button>
          </>
        }
      >
        <p className="confirm-copy">
          This removes the event and every registration attached to it. This cannot be undone.
        </p>
      </Modal>

      <Modal
        open={Boolean(registrationToDelete)}
        onClose={() => setRegistrationToDelete(null)}
        title="Remove registration?"
        subtitle={registrationToDelete ? `${registrationToDelete.name} · ${registrationToDelete.email}` : ''}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setRegistrationToDelete(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger" onClick={handleRemoveRegistration}>
              Remove registration
            </button>
          </>
        }
      >
        <p className="confirm-copy">
          The place is released back to the event and the person is removed from the registration list.
        </p>
      </Modal>
    </div>
  );
}
