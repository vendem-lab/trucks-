export const TIER_PRICES = {
  independent: { name: 'Independent driver', price: 60 },
  owner_operator: { name: 'Owner-operator', price: 120 },
  fleet: { name: 'Fleet member', price: 450 }
};

export const DEFAULTS = {
  name: "Haulway Drivers' Union",
  phone: '+233 24 900 1180',
  email: 'members@haulwayunion.org',
  address: 'Union House, 14 Kojo Thompson Road, Accra',
  hours: 'Mon-Fri, 08:00-17:00',
  graceDays: 14
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
  return `GH₵${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
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
    name: settings.unionName || DEFAULTS.name,
    phone: settings.phone || settings.memberLine || DEFAULTS.phone,
    email: settings.email || DEFAULTS.email,
    address: settings.address || DEFAULTS.address,
    hours: settings.hours || DEFAULTS.hours,
    graceDays: Number(settings.duesGraceDays ?? DEFAULTS.graceDays)
  };
}

export function tierPriceList() {
  return Object.values(TIER_PRICES)
    .map((tier) => `${tier.name} ${formatCedis(tier.price)} a month`)
    .join('; ');
}
