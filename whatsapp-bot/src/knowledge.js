export const TIER_PRICES = {
  independent: { name: 'Independent driver', price: 60 },
  owner_operator: { name: 'Owner-operator', price: 120 },
  fleet: { name: 'Fleet member', price: 450 }
};

export function tierLabel(tier) {
  return TIER_PRICES[tier]?.name || String(tier || 'member').replace(/_/g, ' ');
}

export function statusLabel(status) {
  const map = {
    active: 'active',
    pending: 'pending approval',
    suspended: 'suspended',
    expired: 'expired'
  };
  return map[status] || String(status || '').replace(/_/g, ' ');
}

export function formatCedis(value) {
  return `GHS ${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Static facts the model may use, with live settings taking priority. */
export function unionFacts(settings = {}) {
  return {
    name: settings.unionName || "Haulway Drivers' Union",
    phone: settings.phone || settings.memberLine || '',
    email: settings.email || 'members@haulwayunion.org',
    address: settings.address || 'Union House, Accra',
    hours: settings.hours || 'Mon-Fri, 08:00-17:00',
    graceDays: Number(settings.duesGraceDays ?? 14)
  };
}

export function tierPriceList() {
  return Object.values(TIER_PRICES)
    .map((tier) => `${tier.name} ${formatCedis(tier.price)} a month`)
    .join('; ');
}
