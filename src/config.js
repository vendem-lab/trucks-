export const BRAND = {
  name: 'Haulway',
  legalName: 'Haulway Logistics Ltd',
  tagline: 'Freight, moved intelligently.',
  email: 'hello@haulway.co',
  phone: '+233 30 000 0000',
  address: '12 Harbour Road, Tema, Ghana',
  hours: 'Mon–Sat · 07:00–19:00',
  founded: 2016
};

export const DEMO_ADMIN = {
  email: 'admin@haulway.co',
  password: 'haulway123',
  name: 'Ama Mensah',
  role: 'Operations Director'
};

export const SERVICES = [
  {
    id: 'ftl',
    name: 'Full Truckload',
    short: 'FTL',
    icon: 'truck',
    tagline: 'One trailer, dedicated to your cargo.',
    description:
      'A dedicated vehicle from pickup to delivery. Best for high-volume freight that needs direct routing and predictable transit times.',
    base: 1200,
    perKm: 8.5,
    perTon: 95,
    includedTons: 12,
    transit: '2–4 days',
    features: ['Dedicated trailer', 'Direct routing', 'GPS tracking', 'Loading assistance']
  },
  {
    id: 'ltl',
    name: 'Part Load / LTL',
    short: 'LTL',
    icon: 'package',
    tagline: 'Pay only for the space you use.',
    description:
      'Share trailer space with other shippers and pay by weight and distance. A cost-effective option for smaller consignments.',
    base: 350,
    perKm: 4.2,
    perTon: 65,
    includedTons: 2,
    transit: '3–6 days',
    features: ['Shared trailer', 'Per-tonne pricing', 'Consolidated routing', 'Proof of delivery']
  },
  {
    id: 'reefer',
    name: 'Refrigerated',
    short: 'Reefer',
    icon: 'snowflake',
    tagline: 'Cold chain, kept cold.',
    description:
      'Temperature-controlled trailers for food, pharmaceuticals and perishables, with continuous monitoring from pickup to drop-off.',
    base: 1800,
    perKm: 11.5,
    perTon: 120,
    includedTons: 8,
    transit: '2–4 days',
    features: ['Temperature monitoring', 'Pre-cooled trailer', 'Hygiene certified', 'Live alerts']
  },
  {
    id: 'express',
    name: 'Expedited',
    short: 'Express',
    icon: 'bolt',
    tagline: 'When every hour counts.',
    description:
      'Priority dispatch, minimal stops and a dedicated support line for time-critical freight that cannot wait for a standard schedule.',
    base: 950,
    perKm: 12.5,
    perTon: 80,
    includedTons: 5,
    transit: '12–48 hrs',
    features: ['Priority dispatch', 'Direct route', 'Dedicated support', 'Live ETA updates']
  },
  {
    id: 'flatbed',
    name: 'Flatbed & Heavy Haul',
    short: 'Flatbed',
    icon: 'flatbed',
    tagline: 'Built for the awkward loads.',
    description:
      'Open-deck trailers for machinery, construction materials and oversized equipment, with permits and escort coordination handled for you.',
    base: 1500,
    perKm: 9.8,
    perTon: 110,
    includedTons: 15,
    transit: '3–6 days',
    features: ['Open deck', 'Permit coordination', 'Load securing', 'Escort support']
  },
  {
    id: 'warehouse',
    name: 'Warehousing',
    short: 'Storage',
    icon: 'warehouse',
    tagline: 'Somewhere safe to pause.',
    description:
      'Short and long-term storage with inbound handling, inventory counts and distribution across our partner network.',
    base: 0,
    perKm: 0,
    perTon: 0,
    includedTons: 0,
    transit: 'Flexible',
    features: ['Secure storage', 'Inventory counts', 'Inbound handling', 'Distribution']
  }
];

export const PRICED_SERVICES = SERVICES.filter((service) => service.id !== 'warehouse');

export const SERVICE_BY_ID = Object.fromEntries(SERVICES.map((service) => [service.id, service]));

export const SHIPMENT_STATUSES = [
  { id: 'booked', label: 'Booked' },
  { id: 'picked_up', label: 'Picked up' },
  { id: 'in_transit', label: 'In transit' },
  { id: 'out_for_delivery', label: 'Out for delivery' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' }
];

export const STATUS_BY_ID = Object.fromEntries(SHIPMENT_STATUSES.map((status) => [status.id, status]));

export const QUOTE_STATUSES = [
  { id: 'new', label: 'New' },
  { id: 'reviewed', label: 'Reviewed' },
  { id: 'converted', label: 'Converted' },
  { id: 'declined', label: 'Declined' }
];

export const FLEET_STATUSES = [
  { id: 'available', label: 'Available' },
  { id: 'on_route', label: 'On route' },
  { id: 'maintenance', label: 'Maintenance' }
];

export const VEHICLE_TYPES = ['Dry Van', 'Reefer', 'Flatbed', 'Tanker', 'Curtain-side'];
