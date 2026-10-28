import { useMemo, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import StatCard from '../../components/StatCard.jsx';
import Modal from '../../components/Modal.jsx';
import { PAYMENT_METHODS } from '../../config.js';
import { useAuth } from '../../context/authContext.js';
import { useToast } from '../../context/ToastContext.jsx';
import { markDuesPaid, useStore } from '../../lib/store.js';
import { duesSummary, formatPeriod } from '../../lib/union.js';
import { formatCurrency, formatDate } from '../../lib/format.js';

export default function Dues() {
  const { session } = useAuth();
  const state = useStore();
  const { push } = useToast();
  const [payTarget, setPayTarget] = useState(null);
  const [method, setMethod] = useState('momo');

  const member = state.members.find((entry) => entry.id === session?.memberId);

  const invoices = useMemo(
    () =>
      state.dues
        .filter((invoice) => invoice.memberId === member?.id)
        .sort((a, b) => String(b.period).localeCompare(String(a.period))),
    [state.dues, member]
  );

  const summary = duesSummary(invoices);
  const paidTotal = invoices
    .filter((invoice) => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const paidCount = invoices.filter((invoice) => invoice.status === 'paid').length;

  if (!member) return null;

  const handlePay = async () => {
    if (!payTarget) return;
    try {
      await markDuesPaid(payTarget.id, method);
    } catch (error) {
      push(error.message || 'Could not record the payment.', 'error');
      return;
    }
    push(
      `Payment of ${formatCurrency(payTarget.amount)} recorded for ${formatPeriod(payTarget.period)}.`,
      'success'
    );
    setPayTarget(null);
  };

  const downloadStatement = () => {
    const rows = [
      ['Reference', 'Period', 'Amount (GHS)', 'Status', 'Due date', 'Paid at', 'Method'],
      ...invoices.map((invoice) => [
        invoice.reference,
        invoice.period,
        invoice.amount,
        invoice.status,
        invoice.dueDate,
        invoice.paidAt ? formatDate(invoice.paidAt) : '',
        invoice.method || ''
      ])
    ];
    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${member.memberNumber}-dues-statement.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    push('Statement downloaded.', 'success');
  };

  return (
    <div className="portal-page dues-page">
      <div className="dues-summary-grid">
        <StatCard
          icon="wallet"
          label="Outstanding"
          value={formatCurrency(summary.totalOutstanding)}
          hint={
            summary.totalOutstanding > 0
              ? `${summary.outstanding.length} invoice(s) open`
              : invoices.length
                ? 'You are fully paid up'
                : 'No invoice raised yet'
          }
          tone={summary.status === 'overdue' ? 'amber' : 'green'}
        />
        <StatCard
          icon="checkCircle"
          label="Paid this year"
          value={formatCurrency(paidTotal)}
          hint={`${paidCount} payment(s) recorded`}
          tone="green"
        />
        <StatCard
          icon="calendar"
          label="Current period"
          value={summary.current ? formatPeriod(summary.current.period) : '—'}
          hint={summary.current ? `Due ${formatDate(summary.current.dueDate)}` : 'No invoice yet'}
          tone="brand"
        />
        <StatCard
          icon="clock"
          label="Grace period"
          value={`${summary.graceDays} days`}
          hint="Before legal cover pauses"
          tone="violet"
        />
      </div>

      {summary.totalOutstanding > 0 ? (
        <section className={`card dues-hero ${summary.status === 'overdue' ? 'dues-hero-overdue' : ''}`}>
          <div className="dues-hero-copy">
            <span className="eyebrow">Payment due</span>
            <h2>
              {summary.status === 'overdue'
                ? 'Your membership needs a payment'
                : 'Your next dues payment'}
            </h2>
            <p>
              {summary.status === 'overdue'
                ? 'Legal cover and some benefits are paused while the balance is outstanding. Pay now to restore your full membership.'
                : `You have ${summary.graceDays} days from the due date before legal cover pauses. Paying early keeps everything active.`}
            </p>
          </div>
          <div className="dues-hero-amount">
            <span>Total outstanding</span>
            <strong>{formatCurrency(summary.totalOutstanding)}</strong>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setPayTarget(summary.outstanding[0]);
                setMethod('momo');
              }}
            >
              <Icon name="banknote" size={16} /> Pay now
            </button>
          </div>
        </section>
      ) : invoices.length === 0 ? (
        <section className="card dues-hero">
          <div className="dues-hero-copy">
            <span className="eyebrow">No invoices yet</span>
            <h2>Your dues record is being set up</h2>
            <p>
              The union office raises your first invoice once your application is approved. Nothing
              is owed in the meantime, and load board access unlocks at the same time.
            </p>
          </div>
          <div className="dues-hero-amount">
            <span className="dues-clear-icon"><Icon name="clock" size={30} /></span>
            <strong>GH₵0</strong>
          </div>
        </section>
      ) : (
        <section className="card dues-hero dues-hero-clear">
          <div className="dues-hero-copy">
            <span className="eyebrow">All clear</span>
            <h2>Your dues are up to date</h2>
            <p>
              Thank you. Your legal cover, load board access and welfare eligibility are all active.
              Your next invoice appears at the start of the month.
            </p>
          </div>
          <div className="dues-hero-amount">
            <span className="dues-clear-icon"><Icon name="checkCircle" size={32} /></span>
            <strong>Paid up</strong>
          </div>
        </section>
      )}

      <section className="card dues-table-card">
        <div className="card-head">
          <div>
            <h2>Statement</h2>
            <p>Every invoice on your member record.</p>
          </div>
          <div className="dues-table-actions">
            <button type="button" className="btn btn-outline btn-sm" onClick={downloadStatement}>
              <Icon name="download" size={14} /> Download CSV
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Period</th>
                <th>Amount</th>
                <th>Due date</th>
                <th>Status</th>
                <th>Paid</th>
                <th className="table-actions-col">Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td><span className="table-ref">{invoice.reference}</span></td>
                  <td>{formatPeriod(invoice.period)}</td>
                  <td className="table-strong">{formatCurrency(invoice.amount)}</td>
                  <td>{formatDate(invoice.dueDate)}</td>
                  <td><StatusBadge status={invoice.status} /></td>
                  <td>
                    {invoice.paidAt ? (
                      <span>
                        {formatDate(invoice.paidAt)}
                        <span className="table-sub">
                          {PAYMENT_METHODS.find((entry) => entry.id === invoice.method)?.label || invoice.method}
                        </span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {['due', 'overdue'].includes(invoice.status) ? (
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setPayTarget(invoice);
                            setMethod('momo');
                          }}
                        >
                          Pay
                        </button>
                      </div>
                    ) : (
                      <span className="dues-no-action">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {!invoices.length && (
                <tr>
                  <td colSpan="7">
                    <div className="inline-empty">
                      <Icon name="wallet" size={18} /> No invoices have been issued yet.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="dues-method-note">
          <Icon name="smartphone" size={16} />
          <span>
            Payments are recorded instantly for the union office. No money moves through this site and
            no payment details are collected.
          </span>
        </div>
      </section>

      <Modal
        open={Boolean(payTarget)}
        onClose={() => setPayTarget(null)}
        title="Record a dues payment"
        subtitle={payTarget ? `${payTarget.reference} · ${formatPeriod(payTarget.period)}` : ''}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setPayTarget(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handlePay}>
              <Icon name="check" size={15} /> Confirm payment
            </button>
          </>
        }
      >
        {payTarget && (
          <div className="dues-pay">
            <div className="dues-pay-amount">
              <span>Amount due</span>
              <strong>{formatCurrency(payTarget.amount)}</strong>
              <span>Due {formatDate(payTarget.dueDate)}</span>
            </div>
            <div className="dues-pay-methods">
              {PAYMENT_METHODS.map((option) => (
                <label
                  key={option.id}
                  className={`dues-method ${method === option.id ? 'is-selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    value={option.id}
                    checked={method === option.id}
                    onChange={() => setMethod(option.id)}
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
            <p className="dues-pay-note">
              This records a payment for the union office. No money moves through this site and no
              payment details are collected.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
