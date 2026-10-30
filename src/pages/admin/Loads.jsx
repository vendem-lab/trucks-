import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Modal from '../../components/Modal.jsx';
import Field from '../../components/Field.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Icon from '../../components/Icon.jsx';
import { LOAD_STATUSES, VEHICLE_TYPES } from '../../config.js';
import {
  addLoad,
  deleteLoad,
  reopenLoad,
  updateLoad,
  useStore
} from '../../lib/store.js';
import { formatCurrency, formatDate, formatShortDate, timeAgo } from '../../lib/format.js';
import { calculateRoadDistance } from '../../lib/routeDistance.js';
import { useToast } from '../../context/ToastContext.jsx';

function todayPlus(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function emptyLoad() {
  return {
    title: '',
    shipper: '',
    origin: '',
    destination: '',
    distanceKm: '',
    trailerType: 'Dry van',
    weightTons: '',
    rate: '',
    pickupDate: todayPlus(1),
    deliveryDate: todayPlus(2),
    status: 'open',
    requirements: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    notes: ''
  };
}

function loadToForm(load) {
  return {
    title: load.title || '',
    shipper: load.shipper || '',
    origin: load.origin || '',
    destination: load.destination || '',
    distanceKm: String(load.distanceKm ?? ''),
    trailerType: load.trailerType || 'Dry van',
    weightTons: String(load.weightTons ?? ''),
    rate: load.rate !== undefined && load.rate !== null ? String(load.rate) : '',
    pickupDate: load.pickupDate || '',
    deliveryDate: load.deliveryDate || '',
    status: load.status || 'open',
    requirements: load.requirements || '',
    contactName: load.contactName || '',
    contactPhone: load.contactPhone || '',
    contactEmail: load.contactEmail || '',
    notes: load.notes || ''
  };
}

export default function LoadsAdmin() {
  const state = useStore();
  const { push } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [trailerFilter, setTrailerFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyLoad);
  const [formErrors, setFormErrors] = useState({});
  const [detailId, setDetailId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [calculatingDistance, setCalculatingDistance] = useState(false);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      openCreate();
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return state.loads.filter((load) => {
      if (statusFilter !== 'all' && load.status !== statusFilter) return false;
      if (trailerFilter !== 'all' && load.trailerType !== trailerFilter) return false;
      if (!term) return true;
      return [load.reference, load.title, load.shipper, load.origin, load.destination]
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [state.loads, search, statusFilter, trailerFilter]);

  const detail = detailId ? state.loads.find((load) => load.id === detailId) : null;
  const deleting = deleteId ? state.loads.find((load) => load.id === deleteId) : null;

  function openCreate() {
    setEditingId(null);
    setForm(emptyLoad());
    setFormErrors({});
    setFormOpen(true);
  }

  function openEdit(load) {
    setEditingId(load.id);
    setForm(loadToForm(load));
    setFormErrors({});
    setFormOpen(true);
    setDetailId(null);
  }

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setFormErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const handleCalculateDistance = async () => {
    setCalculatingDistance(true);
    try {
      const distanceKm = await calculateRoadDistance(form.origin, form.destination);
      setForm((current) => ({ ...current, distanceKm: String(distanceKm) }));
      setFormErrors((current) => {
        const next = { ...current };
        delete next.distanceKm;
        return next;
      });
      push(`Estimated driving distance: ${distanceKm} km.`, 'success');
    } catch (error) {
      push(error.message || 'Could not calculate the distance.', 'error');
    } finally {
      setCalculatingDistance(false);
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.title.trim()) next.title = 'Give the load a title.';
    if (!form.shipper.trim()) next.shipper = 'Shipper name is required.';
    if (!form.origin.trim()) next.origin = 'Origin is required.';
    if (!form.destination.trim()) next.destination = 'Destination is required.';
    if (!(Number(form.distanceKm) > 0)) next.distanceKm = 'Add a distance.';
    if (!(Number(form.weightTons) > 0)) next.weightTons = 'Add a weight.';
    if (!(Number(form.rate) > 0)) next.rate = 'Add a rate.';
    if (!form.pickupDate) next.pickupDate = 'Pickup date is required.';
    if (!form.contactName.trim()) next.contactName = 'Add a contact name.';
    if (!form.contactPhone.trim()) next.contactPhone = 'Add a contact phone.';
    setFormErrors(next);
    if (Object.keys(next).length) {
      push('Check the highlighted fields.', 'error');
      return;
    }

    try {
      if (editingId) {
        await updateLoad(editingId, form);
        push('Load updated.', 'success');
      } else {
        const load = await addLoad(form);
        push(`Load ${load.reference} posted.`, 'success');
      }
    } catch (error) {
      push(error.message || 'Could not save the load.', 'error');
      return;
    }
    setFormOpen(false);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteLoad(deleting.id);
    } catch (error) {
      push(error.message || 'Could not delete the load.', 'error');
      return;
    }
    push(`Load ${deleting.reference} deleted.`, 'success');
    setDeleteId(null);
    if (detailId === deleting.id) setDetailId(null);
  };

  return (
    <div className="admin-page">
      <div className="admin-toolbar">
        <div className="admin-toolbar-filters">
          <div className="search-input">
            <Icon name="search" size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search reference, shipper or city…"
              aria-label="Search loads"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            {LOAD_STATUSES.map((status) => (
              <option key={status.id} value={status.id}>{status.label}</option>
            ))}
          </select>
          <select
            value={trailerFilter}
            onChange={(event) => setTrailerFilter(event.target.value)}
            aria-label="Filter by vehicle type"
          >
            <option value="all">All vehicle types</option>
            {VEHICLE_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <Icon name="plus" size={16} /> New load
        </button>
      </div>

      <div className="admin-count">
        <span>{filtered.length} of {state.loads.length} loads</span>
      </div>

      <div className="card card-flush">
        {filtered.length ? (
          <div className="table-wrap">
            <table className="data-table admin-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Shipper</th>
                  <th>Route</th>
                  <th>Vehicle type</th>
                  <th>Pickup</th>
                  <th>Rate</th>
                  <th>Status</th>
                  <th className="table-actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((load) => (
                  <tr key={load.id}>
                    <td>
                      <button
                        type="button"
                        className="table-ref table-ref-button"
                        onClick={() => setDetailId(load.id)}
                      >
                        {load.reference}
                      </button>
                      <span className="table-sub">{load.title}</span>
                    </td>
                    <td>{load.shipper}</td>
                    <td>
                      <span className="table-route">
                        {load.origin} <Icon name="arrowRight" size={12} /> {load.destination}
                      </span>
                      <span className="table-sub">{load.distanceKm} km</span>
                    </td>
                    <td>
                      {load.trailerType}
                      <span className="table-sub">{load.weightTons} t</span>
                    </td>
                    <td>{formatShortDate(load.pickupDate)}</td>
                    <td className="table-strong">{formatCurrency(load.rate)}</td>
                    <td><StatusBadge status={load.status} /></td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => setDetailId(load.id)}
                          aria-label={`View ${load.reference}`}
                        >
                          <Icon name="eye" size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => openEdit(load)}
                          aria-label={`Edit ${load.reference}`}
                        >
                          <Icon name="edit" size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn icon-btn-danger"
                          onClick={() => setDeleteId(load.id)}
                          aria-label={`Delete ${load.reference}`}
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon="clipboard"
            title="No loads match"
            description="Adjust the search or filters, or post a new load."
            action={
              <button type="button" className="btn btn-primary" onClick={openCreate}>
                <Icon name="plus" size={16} /> New load
              </button>
            }
          />
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? 'Edit load' : 'Post a load'}
        subtitle={editingId ? 'Update the posting below.' : 'Only post loads you have verified with the shipper.'}
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="load-form" className="btn btn-primary">
              {editingId ? 'Save changes' : 'Post load'}
            </button>
          </>
        }
      >
        <form id="load-form" onSubmit={handleSave} className="modal-form" noValidate>
          <div className="form-grid">
            <Field label="Load title" htmlFor="load-title" required error={formErrors.title}>
              <input id="load-title" value={form.title} onChange={update('title')} placeholder="e.g. Palletted building materials" />
            </Field>
            <Field label="Shipper" htmlFor="load-shipper" required error={formErrors.shipper}>
              <input id="load-shipper" value={form.shipper} onChange={update('shipper')} placeholder="e.g. BuildRight Construction" />
            </Field>
            <Field label="Origin" htmlFor="load-origin" required error={formErrors.origin}>
              <input id="load-origin" value={form.origin} onChange={update('origin')} placeholder="e.g. Tema" />
            </Field>
            <Field label="Destination" htmlFor="load-destination" required error={formErrors.destination}>
              <input id="load-destination" value={form.destination} onChange={update('destination')} placeholder="e.g. Kumasi" />
            </Field>
            <Field label="Distance" htmlFor="load-distance" required error={formErrors.distanceKm}>
              <div className="input-suffix">
                <input id="load-distance" type="number" min="1" value={form.distanceKm} onChange={update('distanceKm')} placeholder="240" />
                <span>km</span>
              </div>
            </Field>
            <div className="route-distance-control">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleCalculateDistance}
                disabled={calculatingDistance || !form.origin.trim() || !form.destination.trim()}
              >
                <Icon name="route" size={15} /> {calculatingDistance ? 'Calculating…' : 'Calculate road distance'}
              </button>
              <span>
                Distance only · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>
                {' '}· routing by <a href="https://project-osrm.org/" target="_blank" rel="noreferrer">OSRM</a>
              </span>
            </div>
            <Field label="Weight" htmlFor="load-weight" required error={formErrors.weightTons}>
              <div className="input-suffix">
                <input id="load-weight" type="number" min="0.1" step="0.1" value={form.weightTons} onChange={update('weightTons')} placeholder="18" />
                <span>t</span>
              </div>
            </Field>
            <Field label="Vehicle type" htmlFor="load-trailer">
              <select id="load-trailer" value={form.trailerType} onChange={update('trailerType')}>
                {VEHICLE_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </Field>
            <Field label="Rate" htmlFor="load-rate" required error={formErrors.rate}>
              <div className="input-prefix">
                <span>GH₵</span>
                <input id="load-rate" type="number" min="0" value={form.rate} onChange={update('rate')} placeholder="6200" />
              </div>
            </Field>
            <Field label="Pickup date" htmlFor="load-pickup" required error={formErrors.pickupDate}>
              <input id="load-pickup" type="date" value={form.pickupDate} onChange={update('pickupDate')} />
            </Field>
            <Field label="Delivery date" htmlFor="load-delivery">
              <input id="load-delivery" type="date" value={form.deliveryDate} onChange={update('deliveryDate')} />
            </Field>
            <Field label="Status" htmlFor="load-status">
              <select id="load-status" value={form.status} onChange={update('status')}>
                {LOAD_STATUSES.map((status) => (
                  <option key={status.id} value={status.id}>{status.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Contact name" htmlFor="load-contact" required error={formErrors.contactName}>
              <input id="load-contact" value={form.contactName} onChange={update('contactName')} placeholder="Shipper contact" />
            </Field>
            <Field label="Contact phone" htmlFor="load-contact-phone" required error={formErrors.contactPhone}>
              <input id="load-contact-phone" type="tel" value={form.contactPhone} onChange={update('contactPhone')} placeholder="+233 24 000 0000" />
            </Field>
            <Field label="Contact email" htmlFor="load-contact-email">
              <input id="load-contact-email" type="email" value={form.contactEmail} onChange={update('contactEmail')} placeholder="ops@shipper.com" />
            </Field>
          </div>
          <Field label="Requirements" htmlFor="load-requirements">
            <textarea id="load-requirements" rows="2" value={form.requirements} onChange={update('requirements')} placeholder="Straps, temperature, permits, loading crew…" />
          </Field>
          <Field label="Office notes" htmlFor="load-notes">
            <textarea id="load-notes" rows="2" value={form.notes} onChange={update('notes')} placeholder="Internal notes about this load…" />
          </Field>
        </form>
      </Modal>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetailId(null)}
        title={detail ? detail.reference : 'Load'}
        subtitle={detail ? `${detail.title} · ${detail.shipper}` : ''}
        size="lg"
        footer={
          detail && (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setDeleteId(detail.id)}>
                <Icon name="trash" size={15} /> Delete
              </button>
              {detail.status !== 'open' && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={async () => {
                    try {
                      await reopenLoad(detail.id);
                      push(`${detail.reference} is open again.`, 'success');
                    } catch (error) {
                      push(error.message || 'Could not reopen the load.', 'error');
                    }
                  }}
                >
                  <Icon name="refresh" size={15} /> Reopen
                </button>
              )}
              <button type="button" className="btn btn-outline" onClick={() => openEdit(detail)}>
                <Icon name="edit" size={15} /> Edit
              </button>
            </>
          )
        }
      >
        {detail && (
          <div className="load-detail">
            <div className="shipment-detail-head">
              <StatusBadge status={detail.status} />
              <span>{formatCurrency(detail.rate)}</span>
            </div>

            <dl className="detail-grid">
              <div><dt>Route</dt><dd>{detail.origin} → {detail.destination}</dd></div>
              <div><dt>Distance</dt><dd>{detail.distanceKm} km</dd></div>
              <div><dt>Vehicle type</dt><dd>{detail.trailerType}</dd></div>
              <div><dt>Weight</dt><dd>{detail.weightTons} t</dd></div>
              <div><dt>Pickup</dt><dd>{formatDate(detail.pickupDate)}</dd></div>
              <div><dt>Delivery</dt><dd>{formatDate(detail.deliveryDate)}</dd></div>
              <div><dt>Contact</dt><dd>{detail.contactName}<br />{detail.contactPhone}</dd></div>
              <div><dt>Email</dt><dd>{detail.contactEmail || '—'}</dd></div>
              <div><dt>Posted</dt><dd>{timeAgo(detail.postedAt)}</dd></div>
              <div><dt>Claimed by</dt><dd>{detail.filledBy || '—'}</dd></div>
              <div><dt>Claimed at</dt><dd>{detail.filledAt ? formatDate(detail.filledAt) : '—'}</dd></div>
            </dl>

            {detail.requirements && (
              <p className="detail-notes">
                <Icon name="clipboard" size={15} /> {detail.requirements}
              </p>
            )}
            {detail.notes && (
              <p className="detail-notes">
                <Icon name="fileText" size={15} /> {detail.notes}
              </p>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleteId(null)}
        title="Delete load?"
        subtitle={deleting ? `${deleting.reference} · ${deleting.shipper}` : ''}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button>
            <button type="button" className="btn btn-danger" onClick={handleDelete}>Delete load</button>
          </>
        }
      >
        <p className="confirm-copy">
          This removes the posting from the load board. This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
