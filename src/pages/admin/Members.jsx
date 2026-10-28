import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../../components/Modal.jsx';
import Field from '../../components/Field.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Icon from '../../components/Icon.jsx';
import {
  MEMBER_STATUSES,
  REGIONS,
  TIERS,
  TIER_BY_ID,
  TRAILER_TYPES
} from '../../config.js';
import {
  addMember,
  deleteMember,
  isDemoMode,
  setMemberStatus,
  updateMember,
  useStore
} from '../../lib/store.js';
import { approveApplication } from '../../lib/auth.js';
import { duesSummary, formatPeriod } from '../../lib/union.js';
import { formatCurrency, formatDate, isValidEmail, isValidPhone } from '../../lib/format.js';
import { useToast } from '../../context/ToastContext.jsx';

const EMPTY = {
  name: '',
  email: '',
  phone: '',
  password: 'driver123',
  tier: 'independent',
  status: 'active',
  region: 'Greater Accra',
  city: '',
  vehicleType: 'Dry van',
  vehiclePlate: '',
  licenseNumber: '',
  emergencyName: '',
  emergencyPhone: '',
  notes: ''
};

function toForm(member) {
  return {
    name: member.name || '',
    email: member.email || '',
    phone: member.phone || '',
    password: '',
    tier: member.tier || 'independent',
    status: member.status || 'active',
    region: member.region || 'Greater Accra',
    city: member.city || '',
    vehicleType: member.vehicleType || 'Dry van',
    vehiclePlate: member.vehiclePlate || '',
    licenseNumber: member.licenseNumber || '',
    emergencyName: member.emergencyName || '',
    emergencyPhone: member.emergencyPhone || '',
    notes: member.notes || ''
  };
}

export default function Members() {
  const state = useStore();
  const demo = isDemoMode();
  const { push } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formErrors, setFormErrors] = useState({});
  const [detailId, setDetailId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return state.members.filter((member) => {
      if (statusFilter !== 'all' && member.status !== statusFilter) return false;
      if (tierFilter !== 'all' && member.tier !== tierFilter) return false;
      if (!term) return true;
      return [member.name, member.email, member.memberNumber, member.region, member.city, member.phone]
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [state.members, search, statusFilter, tierFilter]);

  const detail = detailId ? state.members.find((member) => member.id === detailId) : null;
  const deleting = deleteId ? state.members.find((member) => member.id === deleteId) : null;

  const detailDues = detail
    ? state.dues.filter((invoice) => invoice.memberId === detail.id)
    : [];
  const detailSummary = duesSummary(detailDues);
  const detailAlerts = detail
    ? state.alerts.filter((alert) => alert.memberId === detail.id)
    : [];
  const applications = state.applications || [];
  const pendingApplications = applications.filter((application) => application.status !== 'approved');

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setFormErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (member) => {
    setEditingId(member.id);
    setForm(toForm(member));
    setFormErrors({});
    setFormOpen(true);
    setDetailId(null);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = 'Name is required.';
    if (!isValidEmail(form.email)) next.email = 'Enter a valid email.';
    if (!isValidPhone(form.phone)) next.phone = 'Enter a valid phone number.';
    if (!form.city.trim()) next.city = 'City is required.';
    if (!form.vehiclePlate.trim()) next.vehiclePlate = 'Registration is required.';
    if (!form.licenseNumber.trim()) next.licenseNumber = 'Licence number is required.';
    if (!editingId && form.password.length < 6) next.password = 'Use at least 6 characters.';
    if (editingId && form.password && form.password.length < 6) next.password = 'Use at least 6 characters.';
    setFormErrors(next);
    if (Object.keys(next).length) {
      push('Check the highlighted fields.', 'error');
      return;
    }

    if (editingId) {
      const patch = { ...form };
      if (!patch.password) delete patch.password;
      delete patch.status;
      if (!demo) {
        push('Ask the member to update their profile. Staff can change status here.', 'error');
        return;
      }
      updateMember(editingId, patch);
      push('Member record updated.', 'success');
    } else {
      if (!demo) {
        push('In live mode, new accounts must be created through the public application form.', 'error');
        return;
      } else {
        const created = addMember(form);
        if (form.status === 'active') setMemberStatus(created.id, 'active');
        push(`Member ${created.memberNumber} added.`, 'success');
      }
    }
    setFormOpen(false);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteMember(deleting.id);
    } catch (error) {
      push(error.message || 'Could not remove this member.', 'error');
      return;
    }
    push(`${deleting.name} removed from the register.`, 'success');
    setDeleteId(null);
    if (detailId === deleting.id) setDetailId(null);
  };

  const handleApproveApplication = async (application) => {
    try {
      await approveApplication(application.id);
      push(`Application for ${application.name} approved.`, 'success');
    } catch (error) {
      push(error.message || 'Could not approve application.', 'error');
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
              placeholder="Search name, number, email or region…"
              aria-label="Search members"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            {MEMBER_STATUSES.map((status) => (
              <option key={status.id} value={status.id}>{status.label}</option>
            ))}
          </select>
          <select
            value={tierFilter}
            onChange={(event) => setTierFilter(event.target.value)}
            aria-label="Filter by tier"
          >
            <option value="all">All tiers</option>
            {TIERS.map((tier) => (
              <option key={tier.id} value={tier.id}>{tier.name}</option>
            ))}
          </select>
        </div>
        {demo && (
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Icon name="plus" size={16} /> Add member
          </button>
        )}
      </div>

      {pendingApplications.length > 0 && <section className="card" aria-label="Pending membership applications">
        <div className="card-head"><div><h2>New applications</h2><p>{pendingApplications.length} awaiting staff review</p></div></div>
        <div className="table-wrap"><table className="data-table admin-table"><thead><tr><th>Applicant</th><th>Contact</th><th>Tier</th><th>Vehicle</th><th>Action</th></tr></thead>
          <tbody>{pendingApplications.map((application) => <tr key={application.id}>
            <td><strong>{application.name}</strong><span className="table-sub">{application.region}, {application.city}</span></td>
            <td>{application.email}<span className="table-sub">{application.phone}</span></td>
            <td>{TIER_BY_ID[application.tier]?.name || application.tier}</td>
            <td>{application.vehicleType}<span className="table-sub">{application.vehiclePlate}</span></td>
            <td><button type="button" className="btn btn-primary btn-sm" onClick={() => handleApproveApplication(application)}><Icon name="check" size={14} /> Approve</button></td>
          </tr>)}</tbody></table></div>
      </section>}

      <div className="admin-count">
        <span>{filtered.length} of {state.members.length} members</span>
      </div>

      <div className="card card-flush">
        {filtered.length ? (
          <div className="table-wrap">
            <table className="data-table admin-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Contact</th>
                  <th>Region</th>
                  <th>Tier</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th className="table-actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <button
                        type="button"
                        className="table-ref table-ref-button"
                        onClick={() => setDetailId(member.id)}
                      >
                        {member.memberNumber}
                      </button>
                      <span className="table-sub">{member.name}</span>
                    </td>
                    <td>
                      <span className="table-strong">{member.phone}</span>
                      <span className="table-sub">{member.email}</span>
                    </td>
                    <td>
                      {member.region}
                      <span className="table-sub">{member.city}</span>
                    </td>
                    <td>{TIER_BY_ID[member.tier]?.name || member.tier}</td>
                    <td>{formatDate(member.joinedAt)}</td>
                    <td><StatusBadge status={member.status} /></td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => setDetailId(member.id)}
                          aria-label={`View ${member.name}`}
                        >
                          <Icon name="eye" size={16} />
                        </button>
                        {demo && (
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => openEdit(member)}
                            aria-label={`Edit ${member.name}`}
                          >
                            <Icon name="edit" size={16} />
                          </button>
                        )}
                        {demo && (
                          <button
                            type="button"
                            className="icon-btn icon-btn-danger"
                            onClick={() => setDeleteId(member.id)}
                            aria-label={`Delete ${member.name}`}
                          >
                            <Icon name="trash" size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon="users"
            title="No members match"
            description="Adjust the search or filters, or add a member manually."
            action={
              demo ? (
                <button type="button" className="btn btn-primary" onClick={openCreate}>
                  <Icon name="plus" size={16} /> Add member
                </button>
              ) : undefined
            }
          />
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? 'Edit member' : 'Add member'}
        subtitle={editingId ? 'Update the member record below.' : 'Create a member record directly.'}
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="member-form" className="btn btn-primary">
              {editingId ? 'Save changes' : 'Add member'}
            </button>
          </>
        }
      >
        <form id="member-form" onSubmit={handleSave} className="modal-form" noValidate>
          <div className="form-grid">
            <Field label="Full name" htmlFor="member-name" required error={formErrors.name}>
              <input id="member-name" value={form.name} onChange={update('name')} placeholder="e.g. Kofi Mensah" />
            </Field>
            <Field label="Email" htmlFor="member-email" required error={formErrors.email}>
              <input id="member-email" type="email" value={form.email} onChange={update('email')} placeholder="member@example.com" />
            </Field>
            <Field label="Phone" htmlFor="member-phone" required error={formErrors.phone}>
              <input id="member-phone" type="tel" value={form.phone} onChange={update('phone')} placeholder="+233 24 000 0000" />
            </Field>
            <Field
              label={editingId ? 'Reset password' : 'Temporary password'}
              htmlFor="member-password"
              error={formErrors.password}
              hint={editingId ? 'Leave blank to keep the current password.' : 'The member can change this after signing in.'}
            >
              <input id="member-password" type="password" value={form.password} onChange={update('password')} />
            </Field>
            <Field label="Tier" htmlFor="member-tier">
              <select id="member-tier" value={form.tier} onChange={update('tier')}>
                {TIERS.map((tier) => (
                  <option key={tier.id} value={tier.id}>{tier.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Status" htmlFor="member-status" hint={editingId ? 'Use the detail panel to change status.' : ''}>
              <select id="member-status" value={form.status} onChange={update('status')} disabled={Boolean(editingId)}>
                {MEMBER_STATUSES.map((status) => (
                  <option key={status.id} value={status.id}>{status.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Region" htmlFor="member-region">
              <select id="member-region" value={form.region} onChange={update('region')}>
                {REGIONS.map((region) => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </Field>
            <Field label="City or town" htmlFor="member-city" required error={formErrors.city}>
              <input id="member-city" value={form.city} onChange={update('city')} placeholder="e.g. Tema" />
            </Field>
            <Field label="Vehicle type" htmlFor="member-vehicle">
              <select id="member-vehicle" value={form.vehicleType} onChange={update('vehicleType')}>
                {TRAILER_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </Field>
            <Field label="Vehicle registration" htmlFor="member-plate" required error={formErrors.vehiclePlate}>
              <input id="member-plate" value={form.vehiclePlate} onChange={update('vehiclePlate')} placeholder="GT 4821-24" />
            </Field>
            <Field label="Licence number" htmlFor="member-licence" required error={formErrors.licenseNumber}>
              <input id="member-licence" value={form.licenseNumber} onChange={update('licenseNumber')} placeholder="DL-448201" />
            </Field>
            <Field label="Emergency contact" htmlFor="member-emergency-name">
              <input id="member-emergency-name" value={form.emergencyName} onChange={update('emergencyName')} placeholder="Name" />
            </Field>
            <Field label="Emergency phone" htmlFor="member-emergency-phone">
              <input id="member-emergency-phone" type="tel" value={form.emergencyPhone} onChange={update('emergencyPhone')} placeholder="+233 24 000 0000" />
            </Field>
          </div>
          <Field label="Notes" htmlFor="member-notes">
            <textarea id="member-notes" rows="3" value={form.notes} onChange={update('notes')} placeholder="Routes, case notes or anything the office should know…" />
          </Field>
        </form>
      </Modal>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetailId(null)}
        title={detail ? detail.name : 'Member'}
        subtitle={detail ? `${detail.memberNumber} · ${TIER_BY_ID[detail.tier]?.name || detail.tier}` : ''}
        size="lg"
        footer={
          detail && (
            <>
              {demo && (
                <button type="button" className="btn btn-ghost" onClick={() => setDeleteId(detail.id)}>
                  <Icon name="trash" size={15} /> Delete
                </button>
              )}
              {demo && (
                <button type="button" className="btn btn-outline" onClick={() => openEdit(detail)}>
                  <Icon name="edit" size={15} /> Edit details
                </button>
              )}
            </>
          )
        }
      >
        {detail && (
          <div className="member-detail">
            <div className="member-detail-head">
              <div className="member-detail-identity">
                <span className="avatar avatar-lg">{detail.name.slice(0, 1)}</span>
                <div>
                  <strong>{detail.name}</strong>
                  <span>{detail.email} · {detail.phone}</span>
                </div>
              </div>
              <StatusBadge status={detail.status} />
            </div>

            <div className="member-detail-actions">
              {detail.status !== 'active' && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    const result = setMemberStatus(detail.id, 'active');
                    Promise.resolve(result).then(() => push(`${detail.name} is now active.`, 'success')).catch((error) => push(error.message || 'Could not update member status.', 'error'));
                  }}
                >
                  <Icon name="check" size={14} /> Approve / reactivate
                </button>
              )}
              {detail.status === 'active' && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    const result = setMemberStatus(detail.id, 'suspended');
                    Promise.resolve(result).then(() => push(`${detail.name} suspended.`, 'success')).catch((error) => push(error.message || 'Could not update member status.', 'error'));
                  }}
                >
                  Suspend
                </button>
              )}
              <Link to="/admin/dues" className="btn btn-outline btn-sm">
                <Icon name="wallet" size={14} /> Dues desk
              </Link>
            </div>

            <dl className="detail-grid">
              <div><dt>Region</dt><dd>{detail.region}</dd></div>
              <div><dt>City</dt><dd>{detail.city}</dd></div>
              <div><dt>Joined</dt><dd>{formatDate(detail.joinedAt)}</dd></div>
              <div><dt>Vehicle</dt><dd>{detail.vehicleType}</dd></div>
              <div><dt>Registration</dt><dd>{detail.vehiclePlate}</dd></div>
              <div><dt>Licence</dt><dd>{detail.licenseNumber}</dd></div>
              <div><dt>Emergency contact</dt><dd>{detail.emergencyName || '—'}</dd></div>
              <div><dt>Emergency phone</dt><dd>{detail.emergencyPhone || '—'}</dd></div>
              <div><dt>Alerts</dt><dd>{detailAlerts.length} saved</dd></div>
            </dl>

            <div className="member-dues-panel">
              <div className="member-dues-head">
                <h3>Dues</h3>
                <span>
                  {detailSummary.totalOutstanding > 0
                    ? `${formatCurrency(detailSummary.totalOutstanding)} outstanding`
                    : detailDues.length
                      ? 'Paid up'
                      : 'Not billed yet'}
                </span>
              </div>
              {detailDues.length ? (
                <ul className="member-dues-list">
                  {detailDues
                    .slice()
                    .sort((a, b) => String(b.period).localeCompare(String(a.period)))
                    .slice(0, 4)
                    .map((invoice) => (
                      <li key={invoice.id}>
                        <div>
                          <strong>{invoice.reference}</strong>
                          <span>{formatPeriod(invoice.period)} · due {formatDate(invoice.dueDate)}</span>
                        </div>
                        <div className="member-dues-right">
                          <strong>{formatCurrency(invoice.amount)}</strong>
                          <StatusBadge status={invoice.status} />
                        </div>
                      </li>
                    ))}
                </ul>
              ) : (
                <div className="inline-empty">
                  <Icon name="wallet" size={16} /> No invoices on this record.
                </div>
              )}
            </div>

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
        title="Remove member?"
        subtitle={deleting ? `${deleting.name} · ${deleting.memberNumber}` : ''}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button>
            <button type="button" className="btn btn-danger" onClick={handleDelete}>Remove member</button>
          </>
        }
      >
        <p className="confirm-copy">
          This removes the member, their dues invoices, alerts and event registrations. This cannot be
          undone.
        </p>
      </Modal>
    </div>
  );
}
