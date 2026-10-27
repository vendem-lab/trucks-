import { DUES_GRACE_DAYS } from '../config.js';

export function currentPeriod(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function formatPeriod(period) {
  if (!period) return '—';
  const [year, month] = String(period).split('-').map(Number);
  if (!year || !month) return period;
  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric'
  });
}

export function duesSummary(invoices = [], graceDays = DUES_GRACE_DAYS) {
  const sorted = [...invoices].sort((a, b) => String(b.period).localeCompare(String(a.period)));
  const current = sorted[0] || null;
  const outstanding = sorted.filter((invoice) => ['due', 'overdue'].includes(invoice.status));
  const totalOutstanding = outstanding.reduce((sum, invoice) => sum + (Number(invoice.amount) || 0), 0);
  const lastPaid = sorted.find((invoice) => invoice.status === 'paid') || null;
  const overdue = outstanding.find((invoice) => invoice.status === 'overdue') || null;

  let status = 'none';
  if (overdue) status = 'overdue';
  else if (current) status = current.status;

  return {
    current,
    status,
    outstanding,
    totalOutstanding,
    lastPaid,
    overdue,
    graceDays
  };
}

export function duesTone(status) {
  if (status === 'paid') return 'success';
  if (status === 'due') return 'warning';
  if (status === 'overdue') return 'danger';
  return 'muted';
}

export function matchesAlert(load, alert) {
  if (!load || load.status !== 'open') return false;
  if (alert.trailerType && alert.trailerType !== 'Any' && load.trailerType !== alert.trailerType) {
    return false;
  }
  const origin = String(alert.origin || '').trim().toLowerCase();
  const destination = String(alert.destination || '').trim().toLowerCase();
  if (origin && !String(load.origin).toLowerCase().includes(origin)) return false;
  if (destination && !String(load.destination).toLowerCase().includes(destination)) return false;
  if (Number(alert.minRate) > 0 && Number(load.rate) < Number(alert.minRate)) return false;
  return true;
}

export function countAlertMatches(loads, alert) {
  return loads.filter((load) => matchesAlert(load, alert)).length;
}

export function eventRegistrationFor(registrations, eventId, email) {
  const value = String(email || '').trim().toLowerCase();
  if (!value) return null;
  return (
    registrations.find(
      (entry) => entry.eventId === eventId && entry.email.toLowerCase() === value
    ) || null
  );
}

export function eventDateParts(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { day: '—', month: '—', year: '—' };
  return {
    day: date.toLocaleDateString('en-GB', { day: '2-digit' }),
    month: date.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
    year: String(date.getFullYear())
  };
}

export function eventTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function eventDateRange(start, end) {
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return '—';
  const endDate = end ? new Date(end) : null;
  const startText = startDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  if (!endDate || Number.isNaN(endDate.getTime())) return startText;
  const sameDay =
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate();
  if (sameDay) return `${startText} · ${eventTime(start)}–${eventTime(end)}`;
  return `${startText} – ${endDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })}`;
}
