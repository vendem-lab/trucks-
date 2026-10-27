export const BRAND = {
  name: 'Haulway Union',
  fullName: "Haulway Drivers' Union",
  legalName: "Haulway Drivers' Union",
  tagline: 'One union. Every driver.',
  email: 'members@haulwayunion.org',
  phone: '+233 30 274 1180',
  memberLine: '+233 24 900 1180',
  address: 'Union House, 14 Kojo Thompson Road, Accra',
  hours: 'Mon–Fri · 08:00–17:00',
  founded: 2014,
  provisionalName: true
};

export const DEMO_STAFF = {
  email: 'admin@haulwayunion.org',
  password: 'union123',
  name: 'Ama Mensah',
  role: 'General Secretary'
};

export const DEMO_MEMBER = {
  email: 'member@haulwayunion.org',
  password: 'driver123',
  name: 'Kofi Mensah'
};

export const TIERS = [
  {
    id: 'independent',
    name: 'Independent driver',
    price: 60,
    period: 'month',
    tagline: 'For drivers employed by a transport operator.',
    description:
      'The core membership. Representation, the verified load board and every training course the union runs.',
    perks: [
      'Verified load board access',
      'Legal and disciplinary support',
      'Free safety and defensive driving courses',
      'Welfare fund eligibility'
    ]
  },
  {
    id: 'owner_operator',
    name: 'Owner-operator',
    price: 120,
    period: 'month',
    tagline: 'For drivers who own the truck they drive.',
    description:
      'Everything in independent membership plus contract review, fuel partner rebates and vehicle cover advice.',
    perks: [
      'Everything in independent membership',
      'Contract and rate review',
      'Fuel partner rebates',
      'Insurance and tyre discounts',
      'Priority load alerts'
    ],
    featured: true
  },
  {
    id: 'fleet',
    name: 'Fleet member',
    price: 450,
    period: 'month',
    tagline: 'For small fleets of two to ten vehicles.',
    description:
      'Covers the whole crew. Fleet-level dues, driver onboarding and a named union liaison for the business.',
    perks: [
      'Up to 10 drivers covered',
      'Named union liaison',
      'Group training sessions',
      'Compliance and records support',
      'Fleet load board access'
    ]
  }
];

export const TIER_BY_ID = Object.fromEntries(TIERS.map((tier) => [tier.id, tier]));

export const TIER_OPTIONS = TIERS.map((tier) => ({ id: tier.id, label: tier.name }));

export const MEMBER_STATUSES = [
  { id: 'active', label: 'Active' },
  { id: 'pending', label: 'Pending' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'expired', label: 'Expired' }
];

export const LOAD_STATUSES = [
  { id: 'open', label: 'Open' },
  { id: 'filled', label: 'Filled' },
  { id: 'closed', label: 'Closed' }
];

export const DUES_STATUSES = [
  { id: 'paid', label: 'Paid' },
  { id: 'due', label: 'Due' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'waived', label: 'Waived' }
];

export const EVENT_TYPES = [
  { id: 'meeting', label: 'Members meeting' },
  { id: 'training', label: 'Training' },
  { id: 'workshop', label: 'Workshop' },
  { id: 'conference', label: 'Conference' },
  { id: 'outreach', label: 'Outreach' }
];

export const NEWS_CATEGORIES = [
  { id: 'announcement', label: 'Announcement' },
  { id: 'industry', label: 'Industry' },
  { id: 'safety', label: 'Safety' },
  { id: 'member', label: 'Member wins' }
];

export const ALERT_FREQUENCIES = [
  { id: 'instant', label: 'As soon as a load is posted' },
  { id: 'daily', label: 'Daily digest' },
  { id: 'weekly', label: 'Weekly digest' }
];

export const PAYMENT_METHODS = [
  { id: 'momo', label: 'Mobile money' },
  { id: 'bank', label: 'Bank transfer' },
  { id: 'cash', label: 'Cash at the union office' }
];

export const ENQUIRY_TYPES = [
  { id: 'membership', label: 'Joining or renewing' },
  { id: 'dues', label: 'Dues and payments' },
  { id: 'legal', label: 'Legal or welfare support' },
  { id: 'training', label: 'Training and events' },
  { id: 'loads', label: 'Load board or a shipper' },
  { id: 'general', label: 'Something else' }
];

export const REGIONS = [
  'Greater Accra',
  'Ashanti',
  'Western',
  'Central',
  'Eastern',
  'Volta',
  'Northern',
  'Upper East',
  'Upper West',
  'Bono',
  'Bono East',
  'Ahafo',
  'Oti',
  'Savannah',
  'North East',
  'Western North'
];

export const TRAILER_TYPES = [
  'Dry van',
  'Reefer',
  'Flatbed',
  'Tanker',
  'Curtain-side',
  'Tipper',
  'Low bed',
  'Bus / passenger'
];

export const DUES_GRACE_DAYS = 14;

export const MEMBER_BENEFITS = [
  {
    icon: 'scale',
    title: 'Fair rates, negotiated together',
    copy: 'We publish benchmark rates by corridor and take unpaid invoices to the shipper when members are short-changed.'
  },
  {
    icon: 'clipboard',
    title: 'A load board you can trust',
    copy: 'Every load is checked before it is posted. No brokers with no cargo, no mystery deductions, no wasted trips.'
  },
  {
    icon: 'shield',
    title: 'Legal cover on the road',
    copy: 'A duty lawyer for police stops, licensing disputes, unfair dismissal and contract problems. One call, no fee.'
  },
  {
    icon: 'graduationCap',
    title: 'Training that pays for itself',
    copy: 'Defensive driving, load securing, fuel efficiency and hazmat refreshers — free or heavily subsidised for members.'
  },
  {
    icon: 'heart',
    title: 'A welfare fund for hard days',
    copy: 'Emergency support for hospital bills, bereavement and breakdowns, funded by members and audited every quarter.'
  },
  {
    icon: 'wallet',
    title: 'Dues you can see working',
    copy: 'Pay by mobile money, get a receipt every time and see exactly how member dues were spent at the AGM.'
  }
];

export const PILLARS = [
  {
    icon: 'handshake',
    title: 'Representation',
    copy: 'One voice in rate talks, licence hearings and negotiations with shippers and transport operators.'
  },
  {
    icon: 'shield',
    title: 'Protection',
    copy: 'Legal support, welfare cover and a member line that answers when something goes wrong on the road.'
  },
  {
    icon: 'chart',
    title: 'Better work',
    copy: 'Verified loads, benchmark rates and training that helps independent drivers earn more per kilometre.'
  }
];

export const LEADERSHIP = [
  {
    name: 'Ama Mensah',
    role: 'General Secretary',
    region: 'Greater Accra',
    bio: 'Twenty years in road transport, former long-haul driver and lead negotiator on the 2025 rate agreement.'
  },
  {
    name: 'Ibrahim Musah',
    role: 'Deputy Secretary',
    region: 'Northern',
    bio: 'Owner-operator on the Tamale corridor and the union’s voice on cross-border permits and axle-load rules.'
  },
  {
    name: 'Mary Adjei',
    role: 'Welfare Officer',
    region: 'Ashanti',
    bio: 'Runs the welfare fund and the member support line, with a background in community health and insurance.'
  },
  {
    name: 'Nii Armah',
    role: 'Training Coordinator',
    region: 'Greater Accra',
    bio: 'Hazmat and defensive driving instructor, working with the Driver and Vehicle Licensing Authority.'
  }
];

export const FAQS = [
  {
    question: 'Who can join the union?',
    answer:
      'Any professional driver or owner-operator working in Ghana can apply. You do not need to be employed by a unionised company. Applications are reviewed by the membership office, usually within two working days.'
  },
  {
    question: 'How much are dues?',
    answer:
      'Dues start at GH₵60 a month for independent drivers, GH₵120 for owner-operators and GH₵450 for a fleet of up to ten vehicles. You can pay monthly by mobile money or at the union office.'
  },
  {
    question: 'Do I need a smartphone to use the load board?',
    answer:
      'The board works in any modern browser. Members without a smartphone can call the member line and the office will read out matching loads or set up SMS alerts.'
  },
  {
    question: 'What happens if I miss a dues payment?',
    answer:
      'You get a 14-day grace period and two reminders. Legal cover pauses after that, but your membership and load board access are restored as soon as the outstanding amount is paid.'
  },
  {
    question: 'Is the union affiliated to a political party?',
    answer:
      'No. The union is independent and member-governed. We negotiate with whichever agency or operator we need to, and we do not endorse candidates or parties.'
  },
  {
    question: 'Can my family reach the union if I am in an accident?',
    answer:
      'Yes. Your emergency contact is stored on your member record and the 24-hour member line is staffed for exactly these situations.'
  }
];
