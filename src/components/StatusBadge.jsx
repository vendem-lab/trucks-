const LABELS = {
  active: 'Active',
  pending: 'Pending',
  suspended: 'Suspended',
  expired: 'Expired',
  open: 'Open',
  filled: 'Filled',
  closed: 'Closed',
  paid: 'Paid',
  due: 'Due',
  overdue: 'Overdue',
  waived: 'Waived',
  upcoming: 'Upcoming',
  past: 'Past',
  draft: 'Draft'
};

const TONES = {
  active: 'success',
  pending: 'warning',
  suspended: 'danger',
  expired: 'muted',
  open: 'brand',
  filled: 'success',
  closed: 'muted',
  paid: 'success',
  due: 'warning',
  overdue: 'danger',
  waived: 'muted',
  upcoming: 'info',
  past: 'muted',
  draft: 'muted'
};

export default function StatusBadge({ status, label, dot = true }) {
  const tone = TONES[status] || 'muted';
  return (
    <span className={`badge badge-${tone}`}>
      {dot && <span className="badge-dot" aria-hidden="true" />}
      {label || LABELS[status] || status}
    </span>
  );
}
