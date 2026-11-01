import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../../components/Modal.jsx';
import Field from '../../components/Field.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Icon from '../../components/Icon.jsx';
import { LOAD_REQUEST_STATUSES, VEHICLE_TYPES } from '../../config.js';
import {
  approveLoadRequest,
  deleteLoadRequest,
  rejectLoadRequest,
  useStore
} from '../../lib/store.js';
import { formatCurrency, formatDate, formatShortDate, timeAgo } from '../../lib/format.js';
import { calculateRoadDistance } from '../../lib/routeDistance.js';
import { useAuth } from '../../context/authContext.js';
import { useToast } from '../../context/ToastContext.jsx';

function approveFormFrom(request) {
  return {
    title: request?.title || '',
    distanceKm: '',
    trailerType: request?.vehicleType || 'Dry van',
    weightTons: request?.weightTons !== undefined ? String(request.weightTons) : '',
    rate: request?.rate !== undefined ? String(request.rate) : '',
    pickupDate: request?.pickupDate || '',
    deliveryDate: request?.deliveryDate || ''
  };
}

export default function LoadRequests() {
  const state = useStore();
  const { session } = useAuth();
  const { push } = useToast();
  const requests = state.loadRequests || [];

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [detailId, setDetailId] = useState(null);
  const [approveId, setApproveId] = useState(null);
  const [approveForm, setApproveForm] = useState(() => approveFormFrom(null));
  const [approveErrors, setApproveErrors] = useState({});
  const [calculatingDistance, setCalculatingDistance] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const pendingCount = requests.filter((request) => request.status === 'pending').length;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return requests
      .filter((request) => {
        if (statusFilter !== 'all' && request.status !== statusFilter) return false;
        if (!term) return true;
        return [
          request.reference,
          request.title,
          request.shipper,
          request.origin,
          request.destination,
          request.contactName
        ]
          .join(' ')
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [requests, search, statusFilter]);

  const detail = detailId ? requests.find((request) => request.id === detailId) : null;
  const approving = approveId ? requests.find((request) => request.id === approveId) : null;
  const rejecting = rejectId ? requests.find((request) => request.id === rejectId) : null;
  const deleting = deleteId ? requests.find((request) => request.id === deleteId) : null;

  const updateApprove = (key) => (event) => {
    setApproveForm((current) => ({ ...current, [key]: event.target.value }));
    setApproveErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  function openApprove(request) {
    setApproveId(request.id);
    setApproveForm(approveFormFrom(request));
    setApproveErrors({});
    setDetailId(null);
  }

  function openReject(request) {
    setRejectId(request.id);
    setRejectReason('');
    setRejectError('');
    setDetailId(null);
  }

  const handleCalculateDistance = async () => {
    if (!approving) return;
    setCalculatingDistance(true);
    try {
      const distanceKm = await calculateRoadDistance(approving.origin, approving.destination);
      setApproveForm((current) => ({ ...current, distanceKm: String(distanceKm) }));
      setApproveErrors((current) => {
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

  const handleApprove = async (event) => {
    event.preventDefault();
    if (!approving) return;

    const next = {};
    if (!approveForm.title.trim()) next.title = 'Give the load a title.';
    if (!(Number(approveForm.distanceKm) > 0)) next.distanceKm = 'Add the road distance.';
    if (!(Number(approveForm.weightTons) > 0)) next.weightTons = 'Add a weight.';
    if (!(Number(approveForm.rate) > 0)) next.rate = 'Add a rate.';
    if (!approveForm.pickupDate) next.pickupDate = 'Pickup date is required.';
    setApproveErrors(next);
    if (Object.keys(next).length) {
      push('Check the highlighted fields.', 'error');
      return;
    }

    try {
      const result = await approveLoadRequest(approving.id, session?.name, approveForm);
      push(`Request ${approving.reference} approved. Load ${result.load.reference} is live.`, 'success');
      setApproveId(null);
    } catch (error) {
      push(error.message || 'Could not approve the request.', 'error');
    }
  };

  const handleReject = async () => {
    if (!rejecting) return;
    if (rejectReason.trim().length < 5) {
      setRejectError('Add a short reason so the shipper can be told why.');
      return;
    }
    try {
      await rejectLoadRequest(rejecting.id, rejectReason, session?.name);
      push(`Request ${rejecting.reference} rejected.`, 'success');
      setRejectId(null);
      setRejectReason('');
    } catch (error) {
      push(error.message || 'Could not reject the request.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteLoadRequest(deleting.id);
      push(`Request ${deleting.reference} deleted.`, 'success');
      setDeleteId(null);
      if (detailId === deleting.id) setDetailId(null);
    } catch (error) {
      push(error.message || 'Could not delete the request.', 'error');
    }
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
              placeholder="Search reference, shipper or route…"
              aria-label="Search load requests"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by request status"
          >
            <option value="all">All requests</option>
            {LOAD_REQUEST_STATUSES.map((status) => (
              <option key={status.id} value={status.id}>{status.label}</option>
            ))}
          </select>
        </div>
        <Link to="/admin/loads" className="btn btn-outline">
          <Icon name="clipboard" size={16} /> Load board
        </Link>
      </div>

      <div className="admin-count">
        <span>
          {filtered.length} of {requests.length} requests · {pendingCount} waiting for review
        </span>
      </div>

      <div className="card card-flush">
        {filtered.length ? (
          <div className="table-wrap">
            <table className="data-table admin-table load-request-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Shipper</th>
                  <th>Route</th>
                  <th>Vehicle</th>
                  <th>Pickup</th>
                  <th>Rate</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th className="table-actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <button
                        type="button"
                        className="table-ref table-ref-button"
                        onClick={() => setDetailId(request.id)}
                      >
                        {request.reference}
                      </button>
                      <span className="table-sub">{request.title}</span>
                    </td>
                    <td>
                      {request.shipper}
                      <span className="table-sub">{request.contactName}</span>
                    </td>
                    <td>
                      <span className="table-route">
                        {request.origin} <Icon name="arrowRight" size={12} /> {request.destination}
                      </span>
                      <span className="table-sub">{request.weightTons} t</span>
                    </td>
                    <td>{request.vehicleType}</td>
                    <td>{formatShortDate(request.pickupDate)}</td>
                    <td className="table-strong">{formatCurrency(request.rate)}</td>
                    <td>{timeAgo(request.createdAt)}</td>
                    <td><StatusBadge status={request.status} /></td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => setDetailId(request.id)}
                          aria-label={`View ${request.reference}`}
                        >
                          <Icon name="eye" size={16} />
                        </button>
                        {request.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              className="icon-btn icon-btn-success"
                              onClick={() => openApprove(request)}
                              aria-label={`Approve ${request.reference}`}
                            >
                              <Icon name="check" size={16} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn icon-btn-danger"
                              onClick={() => openReject(request)}
                              aria-label={`Reject ${request.reference}`}
                            >
                              <Icon name="close" size={16} />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className="icon-btn icon-btn-danger"
                          onClick={() => setDeleteId(request.id)}
                          aria-label={`Delete ${request.reference}`}
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
            title={statusFilter === 'pending' ? 'No requests waiting' : 'No requests match'}
            description={
              statusFilter === 'pending'
                ? 'New public load submissions will appear here for review.'
                : 'Adjust the search or status filter to find a request.'
            }
            action={
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                }}
              >
                Show all requests
              </button>
            }
          />
        )}
      </div>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetailId(null)}
        title={detail ? detail.reference : 'Load request'}
        subtitle={detail ? `${detail.title} · ${detail.shipper}` : ''}
        size="lg"
        footer={
          detail && (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setDeleteId(detail.id)}>
                <Icon name="trash" size={15} /> Delete
              </button>
              {detail.status === 'approved' && detail.loadReference && (
                <Link to="/admin/loads" className="btn btn-outline">
                  <Icon name="clipboard" size={15} /> Load board
                </Link>
              )}
              {detail.status === 'pending' && (
                <>
                  <button type="button" className="btn btn-outline" onClick={() => openReject(detail)}>
                    <Icon name="close" size={15} /> Reject
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => openApprove(detail)}>
                    <Icon name="check" size={15} /> Approve &amp; publish
                  </button>
                </>
              )}
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
              <div><dt>Vehicle type</dt><dd>{detail.vehicleType}</dd></div>
              <div><dt>Weight</dt><dd>{detail.weightTons} t</dd></div>
              <div><dt>Pickup</dt><dd>{formatDate(detail.pickupDate)}</dd></div>
              <div><dt>Delivery</dt><dd>{formatDate(detail.deliveryDate)}</dd></div>
              <div><dt>Submitted</dt><dd>{timeAgo(detail.createdAt)}</dd></div>
              <div><dt>Contact</dt><dd>{detail.contactName}<br />{detail.contactPhone}</dd></div>
              <div><dt>Email</dt><dd>{detail.contactEmail || '—'}</dd></div>
              <div><dt>Reviewed</dt><dd>{detail.reviewedAt ? timeAgo(detail.reviewedAt) : '—'}</dd></div>
              <div><dt>Reviewed by</dt><dd>{detail.reviewedBy || '—'}</dd></div>
              <div><dt>Linked load</dt><dd>{detail.loadReference || '—'}</dd></div>
              <div><dt>Source</dt><dd>Public form</dd></div>
            </dl>

            {detail.requirements && (
              <p className="detail-notes">
                <Icon name="clipboard" size={15} /> {detail.requirements}
              </p>
            )}
            {detail.rejectionReason && (
              <p className="detail-notes">
                <Icon name="alert" size={15} /> Rejected: {detail.rejectionReason}
              </p>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(approving)}
        onClose={() => setApproveId(null)}
        title="Approve and publish"
        subtitle={approving ? `${approving.reference} · ${approving.shipper}` : ''}
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setApproveId(null)}>
              Cancel
            </button>
            <button type="submit" form="request-approve-form" className="btn btn-primary">
              <Icon name="check" size={15} /> Publish load
            </button>
          </>
        }
      >
        {approving && (
          <form id="request-approve-form" onSubmit={handleApprove} className="modal-form" noValidate>
            <p className="confirm-copy">
              Publishing creates a live load on the public board. Contact details stay hidden until an
              active member claims it.
            </p>
            <div className="form-grid">
              <Field label="Load title" htmlFor="request-approve-title" required error={approveErrors.title}>
                <input
                  id="request-approve-title"
                  value={approveForm.title}
                  onChange={updateApprove('title')}
                />
              </Field>
              <Field label="Distance" htmlFor="request-approve-distance" required error={approveErrors.distanceKm}>
                <div className="input-suffix">
                  <input
                    id="request-approve-distance"
                    type="number"
                    min="1"
                    value={approveForm.distanceKm}
                    onChange={updateApprove('distanceKm')}
                    placeholder="240"
                  />
                  <span>km</span>
                </div>
              </Field>
              <div className="route-distance-control">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={handleCalculateDistance}
                  disabled={calculatingDistance || !approving.origin || !approving.destination}
                >
                  <Icon name="route" size={15} />{' '}
                  {calculatingDistance ? 'Calculating…' : 'Calculate road distance'}
                </button>
                <span>
                  Distance only · ©{' '}
                  <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
                    OpenStreetMap contributors
                  </a>{' '}
                  · routing by{' '}
                  <a href="https://project-osrm.org/" target="_blank" rel="noreferrer">OSRM</a>
                </span>
              </div>
              <Field label="Weight" htmlFor="request-approve-weight" required error={approveErrors.weightTons}>
                <div className="input-suffix">
                  <input
                    id="request-approve-weight"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={approveForm.weightTons}
                    onChange={updateApprove('weightTons')}
                  />
                  <span>t</span>
                </div>
              </Field>
              <Field label="Vehicle type" htmlFor="request-approve-vehicle">
                <select
                  id="request-approve-vehicle"
                  value={approveForm.trailerType}
                  onChange={updateApprove('trailerType')}
                >
                  {VEHICLE_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </Field>
              <Field label="Rate" htmlFor="request-approve-rate" required error={approveErrors.rate}>
                <div className="input-prefix">
                  <span>GH₵</span>
                  <input
                    id="request-approve-rate"
                    type="number"
                    min="1"
                    value={approveForm.rate}
                    onChange={updateApprove('rate')}
                  />
                </div>
              </Field>
              <Field label="Pickup date" htmlFor="request-approve-pickup" required error={approveErrors.pickupDate}>
                <input
                  id="request-approve-pickup"
                  type="date"
                  value={approveForm.pickupDate}
                  onChange={updateApprove('pickupDate')}
                />
              </Field>
              <Field label="Delivery date" htmlFor="request-approve-delivery">
                <input
                  id="request-approve-delivery"
                  type="date"
                  value={approveForm.deliveryDate}
                  onChange={updateApprove('deliveryDate')}
                />
              </Field>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(rejecting)}
        onClose={() => setRejectId(null)}
        title="Reject this request?"
        subtitle={rejecting ? `${rejecting.reference} · ${rejecting.shipper}` : ''}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setRejectId(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger" onClick={handleReject}>
              Reject request
            </button>
          </>
        }
      >
        <p className="confirm-copy">
          The request will be closed and will not appear on the load board. Add a short reason for the
          office record.
        </p>
        <Field label="Reason" htmlFor="request-reject-reason" required error={rejectError}>
          <textarea
            id="request-reject-reason"
            rows="3"
            value={rejectReason}
            onChange={(event) => {
              setRejectReason(event.target.value);
              setRejectError('');
            }}
            placeholder="e.g. Unverified broker or incomplete pickup address."
          />
        </Field>
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleteId(null)}
        title="Delete this request?"
        subtitle={deleting ? `${deleting.reference} · ${deleting.shipper}` : ''}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDeleteId(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger" onClick={handleDelete}>
              Delete request
            </button>
          </>
        }
      >
        <p className="confirm-copy">
          This removes the request from the review queue. It cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
