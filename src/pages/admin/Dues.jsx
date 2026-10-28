import { useMemo, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import Field from '../../components/Field.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import StatCard from '../../components/StatCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Icon from '../../components/Icon.jsx';
import { DUES_STATUSES, PAYMENT_METHODS, TIER_BY_ID } from '../../config.js';
import {
  addDues,
  deleteDues,
  markDuesPaid,
  setDuesStatus,
  useStore
} from '../../lib/store.js';
import { currentPeriod, formatPeriod } from '../../lib/union.js';
import { formatCurrency, formatDate } from '../../lib/format.js';
import { useToast } from '../../context/ToastContext.jsx';

function endOfMonth(period) {
  const [year, month] = String(period || currentPeriod()).split('-').map(Number);
  return new Date(year, month, 0).toISOString().slice(0, 10);
}

export default function DuesAdmin() {
  const state = useStore();
  const { push } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(() => ({
    memberId: '',
    period: currentPeriod(),
    amount: '',
    dueDate: endOfMonth(currentPeriod()),
    status: 'due',
    note: ''
  }));
  const [formErrors, setFormErrors] = useState({});
  const [payTarget, setPayTarget] = useState(null);
  const [payMethod, setPayMethod] = useState('momo');
  const [deleteId, setDeleteId] = useState(null);

  const periods = useMemo(
    () => [...new Set(state.dues.map((invoice) => invoice.period))].sort().reverse(),
    [state.dues]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return state.dues
      .filter((invoice) => {
        if (statusFilter !== 'all' && invoice.status !== statusFilter) return false;
        if (periodFilter !== 'all' && invoice.period !== periodFilter) return false;
        if (!term) return true;
        return [invoice.reference, invoice.memberName, invoice.period, invoice.memberId]
          .join(' ')
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => {
        if (a.period !== b.period) return String(b.period).localeCompare(String(a.period));
        return String(a.memberName).localeCompare(String(b.memberName));
      });
  }, [state.dues, search, statusFilter, periodFilter]);

  const deleting = deleteId ? state.dues.find((invoice) => invoice.id === deleteId) : null;
  const current = currentPeriod();
  const collected = state.dues
    .filter((invoice) => invoice.status === 'paid' && invoice.period === current)
    .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const outstanding = state.dues
    .filter((invoice) => ['due', 'overdue'].includes(invoice.status))
    .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const overdueCount = state.dues.filter((invoice) => invoice.status === 'overdue').length;
  const paidCount = state.dues.filter((invoice) => invoice.status === 'paid').length;

  const update = (key) => (event) => {
    setForm((currentForm) => ({ ...currentForm, [key]: event.target.value }));
    setFormErrors((currentErrors) => {
      if (!currentErrors[key]) return currentErrors;
      const next = { ...currentErrors };
      delete next[key];
      return next;
    });
  };

  const handleMemberChange = (event) => {
    const memberId = event.target.value;
    const member = state.members.find((entry) => entry.id === memberId);
    const tier = member ? TIER_BY_ID[member.tier] : null;
    setForm((currentForm) => ({
      ...currentForm,
      memberId,
      amount: currentForm.amount || (tier ? String(tier.price) : '')
    }));
    setFormErrors((currentErrors) => {
      if (!currentErrors.memberId) return currentErrors;
      const next = { ...currentErrors };
      delete next.memberId;
      return next;
    });
  };

  const openCreate = () => {
    setForm({
      memberId: '',
      period: currentPeriod(),
      amount: '',
      dueDate: endOfMonth(currentPeriod()),
      status: 'due',
      note: ''
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const handleCreate = (event) => {
    event.preventDefault();
    const next = {};
    if (!form.memberId) next.memberId = 'Choose a member.';
    if (!form.period) next.period = 'Choose a period.';
    if (!(Number(form.amount) > 0)) next.amount = 'Add an amount.';
    if (!form.dueDate) next.dueDate = 'Add a due date.';
    setFormErrors(next);
    if (Object.keys(next).length) {
      push('Check the highlighted fields.', 'error');
      return;
    }
    const invoice = addDues(form);
    push(`Invoice ${invoice.reference} created.`, 'success');
    setFormOpen(false);
  };

  const handlePay = async () => {
    if (!payTarget) return;
    try {
      await markDuesPaid(payTarget.id, payMethod);
    } catch (error) {
      push(error.message || 'Could not record the payment.', 'error');
      return;
    }
    push(`${payTarget.reference} marked paid by ${PAYMENT_METHODS.find((entry) => entry.id === payMethod)?.label}.`, 'success');
    setPayTarget(null);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteDues(deleting.id);
    } catch (error) {
      push(error.message || 'Could not delete the invoice.', 'error');
      return;
    }
    push(`Invoice ${deleting.reference} deleted.`, 'success');
    setDeleteId(null);
  };

  return (
    <div className="admin-page">
      <div className="admin-stat-grid">
        <StatCard
          icon="wallet"
          label="Collected this month"
          value={formatCurrency(collected)}
          hint={formatPeriod(current)}
          tone="green"
        />
        <StatCard
          icon="banknote"
          label="Outstanding"
          value={formatCurrency(outstanding)}
          hint={`${state.dues.filter((invoice) => ['due', 'overdue'].includes(invoice.status)).length} invoices open`}
          tone="amber"
        />
        <StatCard
          icon="alert"
          label="Overdue"
          value={overdueCount}
          hint="Needs follow-up"
          tone="violet"
        />
        <StatCard
          icon="checkCircle"
          label="Payments recorded"
          value={paidCount}
          hint={`${state.dues.length} invoices in total`}
          tone="brand"
        />
      </div>

      <div className="admin-toolbar">
        <div className="admin-toolbar-filters">
          <div className="search-input">
            <Icon name="search" size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search member, reference or period…"
              aria-label="Search dues"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            {DUES_STATUSES.map((status) => (
              <option key={status.id} value={status.id}>{status.label}</option>
            ))}
          </select>
          <select
            value={periodFilter}
            onChange={(event) => setPeriodFilter(event.target.value)}
            aria-label="Filter by period"
          >
            <option value="all">All periods</option>
            {periods.map((period) => (
              <option key={period} value={period}>{formatPeriod(period)}</option>
            ))}
          </select>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <Icon name="plus" size={16} /> New invoice
        </button>
      </div>

      <div className="admin-count">
        <span>{filtered.length} of {state.dues.length} invoices</span>
      </div>

      <div className="card card-flush">
        {filtered.length ? (
          <div className="table-wrap">
            <table className="data-table admin-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Member</th>
                  <th>Period</th>
                  <th>Amount</th>
                  <th>Due date</th>
                  <th>Status</th>
                  <th>Paid</th>
                  <th className="table-actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((invoice) => (
                  <tr key={invoice.id}>
                    <td><span className="table-ref">{invoice.reference}</span></td>
                    <td>
                      <span className="table-strong">{invoice.memberName}</span>
                      <span className="table-sub">
                        {state.members.find((member) => member.id === invoice.memberId)?.memberNumber || '—'}
                      </span>
                    </td>
                    <td>{formatPeriod(invoice.period)}</td>
                    <td className="table-strong">{formatCurrency(invoice.amount)}</td>
                    <td>{formatDate(invoice.dueDate)}</td>
                    <td><StatusBadge status={invoice.status} /></td>
                    <td>
                      {invoice.paidAt ? (
                        <>
                          {formatDate(invoice.paidAt)}
                          <span className="table-sub">
                            {PAYMENT_METHODS.find((entry) => entry.id === invoice.method)?.label || invoice.method}
                          </span>
                        </>
                      ) : '—'}
                    </td>
                    <td>
                      <div className="table-actions">
                        {['due', 'overdue'].includes(invoice.status) && (
                          <>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => {
                                setPayTarget(invoice);
                                setPayMethod('momo');
                              }}
                            >
                              Pay
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={async () => {
                                try {
                                  await setDuesStatus(invoice.id, 'waived');
                                  push(`${invoice.reference} waived.`, 'success');
                                } catch (error) {
                                  push(error.message || 'Could not waive the invoice.', 'error');
                                }
                              }}
                            >
                              Waive
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className="icon-btn icon-btn-danger"
                          onClick={() => setDeleteId(invoice.id)}
                          aria-label={`Delete ${invoice.reference}`}
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
            icon="wallet"
            title="No invoices match"
            description="Adjust the filters or create a new dues invoice."
            action={
              <button type="button" className="btn btn-primary" onClick={openCreate}>
                <Icon name="plus" size={16} /> New invoice
              </button>
            }
          />
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="New dues invoice"
        subtitle="Raise an invoice against a member record."
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>Cancel</button>
            <button type="submit" form="dues-form" className="btn btn-primary">Create invoice</button>
          </>
        }
      >
        <form id="dues-form" onSubmit={handleCreate} className="modal-form" noValidate>
          <Field label="Member" htmlFor="dues-member" required error={formErrors.memberId}>
            <select id="dues-member" value={form.memberId} onChange={handleMemberChange}>
              <option value="">Choose a member…</option>
              {state.members
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} · {member.memberNumber}
                  </option>
                ))}
            </select>
          </Field>
          <div className="form-grid">
            <Field label="Period" htmlFor="dues-period" required error={formErrors.period}>
              <input
                id="dues-period"
                type="month"
                value={form.period}
                onChange={(event) => {
                  update('period')(event);
                  setForm((currentForm) => ({
                    ...currentForm,
                    period: event.target.value,
                    dueDate: endOfMonth(event.target.value)
                  }));
                }}
              />
            </Field>
            <Field label="Amount" htmlFor="dues-amount" required error={formErrors.amount}>
              <div className="input-prefix">
                <span>GH₵</span>
                <input id="dues-amount" type="number" min="0" value={form.amount} onChange={update('amount')} placeholder="120" />
              </div>
            </Field>
            <Field label="Due date" htmlFor="dues-due" required error={formErrors.dueDate}>
              <input id="dues-due" type="date" value={form.dueDate} onChange={update('dueDate')} />
            </Field>
            <Field label="Status" htmlFor="dues-status">
              <select id="dues-status" value={form.status} onChange={update('status')}>
                {DUES_STATUSES.filter((status) => status.id !== 'paid').map((status) => (
                  <option key={status.id} value={status.id}>{status.label}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Note" htmlFor="dues-note">
            <textarea id="dues-note" rows="2" value={form.note} onChange={update('note')} placeholder="Optional note for the member record…" />
          </Field>
        </form>
      </Modal>

      <Modal
        open={Boolean(payTarget)}
        onClose={() => setPayTarget(null)}
        title="Record payment"
        subtitle={payTarget ? `${payTarget.reference} · ${payTarget.memberName}` : ''}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setPayTarget(null)}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handlePay}>
              <Icon name="check" size={15} /> Mark paid
            </button>
          </>
        }
      >
        {payTarget && (
          <div className="dues-pay">
            <div className="dues-pay-amount">
              <span>Amount</span>
              <strong>{formatCurrency(payTarget.amount)}</strong>
              <span>{formatPeriod(payTarget.period)} · due {formatDate(payTarget.dueDate)}</span>
            </div>
            <div className="dues-pay-methods">
              {PAYMENT_METHODS.map((option) => (
                <label
                  key={option.id}
                  className={`dues-method ${payMethod === option.id ? 'is-selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="admin-payment-method"
                    value={option.id}
                    checked={payMethod === option.id}
                    onChange={() => setPayMethod(option.id)}
                  />
                  <span className="dues-method-icon">
                    <Icon
                      name={option.id === 'momo' ? 'smartphone' : option.id === 'bank' ? 'banknote' : 'building'}
                      size={18}
                    />
                  </span>
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleteId(null)}
        title="Delete invoice?"
        subtitle={deleting ? `${deleting.reference} · ${deleting.memberName}` : ''}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button>
            <button type="button" className="btn btn-danger" onClick={handleDelete}>Delete invoice</button>
          </>
        }
      >
        <p className="confirm-copy">
          This removes the invoice from the member’s statement. This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
