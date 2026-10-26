const LABELS = {
  booked: 'Booked',
  picked_up: 'Picked up',
  in_transit: 'In transit',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  new: 'New',
  reviewed: 'Reviewed',
  converted: 'Converted',
  declined: 'Declined',
  available: 'Available',
  on_route: 'On route',
  maintenance: 'Maintenance'
};

const TONES = {
  booked: 'info',
  picked_up: 'warning',
  in_transit: 'brand',
  out_for_delivery: 'violet',
  delivered: 'success',
  cancelled: 'danger',
  new: 'brand',
  reviewed: 'warning',
  converted: 'success',
  declined: 'muted',
  available: 'success',
  on_route: 'brand',
  maintenance: 'warning'
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
