import { calculateEstimate } from './pricing.js';

const FLOW = ['booked', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'];

const STEP_NOTES = {
  booked: 'Booking confirmed and trailer assigned',
  picked_up: 'Cargo collected at origin',
  in_transit: 'Departed origin hub',
  out_for_delivery: 'Arrived at destination hub',
  delivered: 'Delivered and signed for'
};

function at(daysOffset, hour = 9, minute = 0) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString();
}

function dateOnly(daysOffset) {
  return at(daysOffset).slice(0, 10);
}

function timeline(status, startDaysAgo, note = '') {
  if (status === 'cancelled') {
    return [
      { status: 'booked', at: at(-startDaysAgo), note: 'Booking confirmed' },
      { status: 'cancelled', at: at(-startDaysAgo + 1), note: note || 'Cancelled by customer' }
    ];
  }
  const index = FLOW.indexOf(status);
  return FLOW.slice(0, index + 1).map((step, stepIndex) => ({
    status: step,
    at: at(-startDaysAgo + stepIndex),
    note: step === 'delivered' && note ? note : STEP_NOTES[step]
  }));
}

export function buildSeed() {
  const year = new Date().getFullYear();

  const customers = [
    { id: 'cus-1', company: 'AgroPlus Ltd', contact: 'Kojo Antwi', email: 'kojo@agroplus.gh', phone: '+233 24 111 2200', city: 'Tema', since: '2021-03-12', notes: 'Weekly produce runs to Kumasi.' },
    { id: 'cus-2', company: 'BuildRight Construction', contact: 'Esi Owusu', email: 'esi@buildright.gh', phone: '+233 20 445 9911', city: 'Accra', since: '2020-08-04', notes: 'Flatbed and heavy haul specialist.' },
    { id: 'cus-3', company: 'ColdChain Foods', contact: 'Yaw Darko', email: 'yaw@coldchain.gh', phone: '+233 55 780 3310', city: 'Tema', since: '2022-01-19', notes: 'Reefer freight, temperature logs required.' },
    { id: 'cus-4', company: 'Mercado Retail', contact: 'Adwoa Boadi', email: 'adwoa@mercado.gh', phone: '+233 27 902 1177', city: 'Kumasi', since: '2023-05-30', notes: 'LTL consolidation to Accra stores.' },
    { id: 'cus-5', company: 'VoltEnergy', contact: 'Kofi Asante', email: 'kofi@voltenergy.gh', phone: '+233 24 660 4421', city: 'Accra', since: '2022-11-02', notes: 'Expedited deliveries for field teams.' },
    { id: 'cus-6', company: 'GreenHarvest', contact: 'Fatima Sule', email: 'fatima@greenharvest.gh', phone: '+233 50 118 7755', city: 'Tamale', since: '2024-02-14', notes: 'Seasonal harvest logistics.' },
    { id: 'cus-7', company: 'Coastal Chemicals', contact: 'Nana Yeboah', email: 'nana@coastalchem.gh', phone: '+233 24 771 2208', city: 'Takoradi', since: '2021-09-27', notes: 'Tanker movements, strict safety checks.' },
    { id: 'cus-8', company: 'Sunline Textiles', contact: 'Akosua Frimpong', email: 'akosua@sunline.gh', phone: '+233 26 330 8844', city: 'Koforidua', since: '2023-07-08', notes: 'Dry van, weekly Accra runs.' }
  ];

  const shipments = [
    {
      id: 'shp-1041', reference: `HW-${year}-1041`, customerId: 'cus-1', customer: 'AgroPlus Ltd',
      email: 'kojo@agroplus.gh', phone: '+233 24 111 2200', origin: 'Tema', destination: 'Kumasi',
      distanceKm: 240, service: 'ftl', weightTons: 12, pickupDate: dateOnly(-31), deliveryDate: dateOnly(-29),
      status: 'delivered', price: 4360, driver: 'Kwame Boateng', vehicle: 'HW-101',
      notes: 'Palletised produce, tail-lift required.', createdAt: at(-32),
      timeline: timeline('delivered', 31, 'Delivered to Kumasi depot, signed by K. Antwi')
    },
    {
      id: 'shp-1042', reference: `HW-${year}-1042`, customerId: 'cus-3', customer: 'ColdChain Foods',
      email: 'yaw@coldchain.gh', phone: '+233 55 780 3310', origin: 'Accra', destination: 'Takoradi',
      distanceKm: 220, service: 'reefer', weightTons: 8, pickupDate: dateOnly(-2), deliveryDate: dateOnly(1),
      status: 'in_transit', price: 5450, driver: 'Yaw Owusu', vehicle: 'HW-102',
      notes: 'Keep trailer at 2–4°C. Temperature log on delivery.', createdAt: at(-3),
      timeline: timeline('in_transit', 2)
    },
    {
      id: 'shp-1043', reference: `HW-${year}-1043`, customerId: 'cus-2', customer: 'BuildRight Construction',
      email: 'esi@buildright.gh', phone: '+233 20 445 9911', origin: 'Tema', destination: 'Tamale',
      distanceKm: 640, service: 'flatbed', weightTons: 18, pickupDate: dateOnly(2), deliveryDate: dateOnly(5),
      status: 'booked', price: 9800, driver: 'Ibrahim Musah', vehicle: 'HW-103',
      notes: 'Steel beams, 18m length. Permits attached.', createdAt: at(-1),
      timeline: timeline('booked', 1)
    },
    {
      id: 'shp-1044', reference: `HW-${year}-1044`, customerId: 'cus-4', customer: 'Mercado Retail',
      email: 'adwoa@mercado.gh', phone: '+233 27 902 1177', origin: 'Kumasi', destination: 'Accra',
      distanceKm: 250, service: 'ltl', weightTons: 6, pickupDate: dateOnly(-1), deliveryDate: dateOnly(0),
      status: 'out_for_delivery', price: 3120, driver: 'Mary Adjei', vehicle: 'HW-106',
      notes: 'Three pallets for the Osu store.', createdAt: at(-2),
      timeline: timeline('out_for_delivery', 2)
    },
    {
      id: 'shp-1045', reference: `HW-${year}-1045`, customerId: 'cus-7', customer: 'Coastal Chemicals',
      email: 'nana@coastalchem.gh', phone: '+233 24 771 2208', origin: 'Takoradi', destination: 'Tema',
      distanceKm: 230, service: 'ftl', weightTons: 20, pickupDate: dateOnly(0), deliveryDate: dateOnly(2),
      status: 'picked_up', price: 7480, driver: 'Nii Armah', vehicle: 'HW-104',
      notes: 'Hazmat paperwork verified at pickup.', createdAt: at(-1),
      timeline: timeline('picked_up', 1)
    },
    {
      id: 'shp-1046', reference: `HW-${year}-1046`, customerId: 'cus-5', customer: 'VoltEnergy',
      email: 'kofi@voltenergy.gh', phone: '+233 24 660 4421', origin: 'Accra', destination: 'Ho',
      distanceKm: 160, service: 'express', weightTons: 3, pickupDate: dateOnly(-12), deliveryDate: dateOnly(-11),
      status: 'delivered', price: 3560, driver: 'David Koomson', vehicle: 'HW-107',
      notes: 'Priority delivery for a field installation.', createdAt: at(-13),
      timeline: timeline('delivered', 12, 'Delivered to VoltEnergy Ho office')
    },
    {
      id: 'shp-1047', reference: `HW-${year}-1047`, customerId: 'cus-6', customer: 'GreenHarvest',
      email: 'fatima@greenharvest.gh', phone: '+233 50 118 7755', origin: 'Tema', destination: 'Wa',
      distanceKm: 780, service: 'flatbed', weightTons: 22, pickupDate: dateOnly(-1), deliveryDate: dateOnly(3),
      status: 'in_transit', price: 12800, driver: 'Abdul Rahman', vehicle: 'HW-108',
      notes: 'Irrigation equipment, two escort vehicles.', createdAt: at(-2),
      timeline: timeline('in_transit', 2)
    },
    {
      id: 'shp-1048', reference: `HW-${year}-1048`, customerId: 'cus-8', customer: 'Sunline Textiles',
      email: 'akosua@sunline.gh', phone: '+233 26 330 8844', origin: 'Kumasi', destination: 'Sunyani',
      distanceKm: 130, service: 'ftl', weightTons: 5, pickupDate: dateOnly(-19), deliveryDate: dateOnly(-18),
      status: 'delivered', price: 2460, driver: 'Kwame Boateng', vehicle: 'HW-101',
      notes: 'Fabric rolls, wrapped and strapped.', createdAt: at(-20),
      timeline: timeline('delivered', 19, 'Delivered to Sunyani warehouse')
    },
    {
      id: 'shp-1049', reference: `HW-${year}-1049`, customerId: 'cus-3', customer: 'ColdChain Foods',
      email: 'yaw@coldchain.gh', phone: '+233 55 780 3310', origin: 'Accra', destination: 'Cape Coast',
      distanceKm: 150, service: 'reefer', weightTons: 4, pickupDate: dateOnly(1), deliveryDate: dateOnly(3),
      status: 'booked', price: 3520, driver: 'Yaw Owusu', vehicle: 'HW-102',
      notes: 'Pharmaceutical consignment, 2–8°C.', createdAt: at(0),
      timeline: timeline('booked', 0)
    },
    {
      id: 'shp-1050', reference: `HW-${year}-1050`, customerId: 'cus-4', customer: 'Mercado Retail',
      email: 'adwoa@mercado.gh', phone: '+233 27 902 1177', origin: 'Tema', destination: 'Accra',
      distanceKm: 30, service: 'ltl', weightTons: 2, pickupDate: dateOnly(-42), deliveryDate: dateOnly(-42),
      status: 'delivered', price: 1180, driver: 'Mary Adjei', vehicle: 'HW-106',
      notes: 'Same-day store replenishment.', createdAt: at(-43),
      timeline: timeline('delivered', 42, 'Delivered to Mercado Accra store')
    },
    {
      id: 'shp-1051', reference: `HW-${year}-1051`, customerId: 'cus-6', customer: 'GreenHarvest',
      email: 'fatima@greenharvest.gh', phone: '+233 50 118 7755', origin: 'Bolgatanga', destination: 'Tamale',
      distanceKm: 160, service: 'ftl', weightTons: 7, pickupDate: dateOnly(-6), deliveryDate: dateOnly(-5),
      status: 'cancelled', price: 2680, driver: 'Unassigned', vehicle: '—',
      notes: 'Customer postponed the harvest run.', createdAt: at(-7),
      timeline: timeline('cancelled', 7, 'Cancelled by customer — harvest delayed')
    },
    {
      id: 'shp-1052', reference: `HW-${year}-1052`, customerId: 'cus-8', customer: 'Sunline Textiles',
      email: 'akosua@sunline.gh', phone: '+233 26 330 8844', origin: 'Accra', destination: 'Koforidua',
      distanceKm: 90, service: 'ftl', weightTons: 3, pickupDate: dateOnly(-58), deliveryDate: dateOnly(-57),
      status: 'delivered', price: 1980, driver: 'Kwame Boateng', vehicle: 'HW-101',
      notes: 'Sample stock for the new store.', createdAt: at(-59),
      timeline: timeline('delivered', 58, 'Delivered to Sunline Koforidua store')
    },
    {
      id: 'shp-1053', reference: `HW-${year}-1053`, customerId: 'cus-7', customer: 'Coastal Chemicals',
      email: 'nana@coastalchem.gh', phone: '+233 24 771 2208', origin: 'Tema', destination: 'Takoradi',
      distanceKm: 240, service: 'ftl', weightTons: 24, pickupDate: dateOnly(-1), deliveryDate: dateOnly(1),
      status: 'in_transit', price: 8640, driver: 'Nii Armah', vehicle: 'HW-104',
      notes: 'Tanker wash certificate attached.', createdAt: at(-2),
      timeline: timeline('in_transit', 2)
    },
    {
      id: 'shp-1054', reference: `HW-${year}-1054`, customerId: 'cus-1', customer: 'AgroPlus Ltd',
      email: 'kojo@agroplus.gh', phone: '+233 24 111 2200', origin: 'Kumasi', destination: 'Techiman',
      distanceKm: 120, service: 'ltl', weightTons: 2.5, pickupDate: dateOnly(-74), deliveryDate: dateOnly(-73),
      status: 'delivered', price: 1520, driver: 'Mary Adjei', vehicle: 'HW-106',
      notes: 'Seed stock for the Techiman depot.', createdAt: at(-75),
      timeline: timeline('delivered', 74, 'Delivered to Techiman depot')
    }
  ];

  const quoteRows = [
    { id: 'quo-318', name: 'Kofi Mensah', company: 'Mensah Traders', email: 'kofi@mensah.gh', phone: '+233 24 908 1122', origin: 'Accra', destination: 'Tamale', distanceKm: 640, service: 'ftl', weightTons: 16, pickupDate: dateOnly(4), notes: 'General goods, 12 pallets.', status: 'new', createdAt: at(-1) },
    { id: 'quo-319', name: 'Efua Arthur', company: 'Arthur Farms', email: 'efua@arthurfarms.gh', phone: '+233 55 221 8890', origin: 'Tema', destination: 'Kumasi', distanceKm: 240, service: 'reefer', weightTons: 6, pickupDate: dateOnly(3), notes: 'Fresh produce, 0–4°C.', status: 'new', createdAt: at(0) },
    { id: 'quo-320', name: 'Daniel Osei', company: 'Osei Builders', email: 'daniel@oseibuilders.gh', phone: '+233 20 774 5510', origin: 'Accra', destination: 'Takoradi', distanceKm: 220, service: 'flatbed', weightTons: 19, pickupDate: dateOnly(6), notes: 'Scaffolding and steel sections.', status: 'reviewed', createdAt: at(-3) },
    { id: 'quo-321', name: 'Adwoa Boadi', company: 'Mercado Retail', email: 'adwoa@mercado.gh', phone: '+233 27 902 1177', origin: 'Kumasi', destination: 'Accra', distanceKm: 250, service: 'ltl', weightTons: 6, pickupDate: dateOnly(-1), notes: 'Three pallets to the Osu store.', status: 'converted', createdAt: at(-5) },
    { id: 'quo-322', name: 'Samira Ahmed', company: 'Northern Foods', email: 'samira@northernfoods.gh', phone: '+233 50 667 2214', origin: 'Tamale', destination: 'Accra', distanceKm: 640, service: 'reefer', weightTons: 9, pickupDate: dateOnly(7), notes: 'Frozen goods, 48-hour window.', status: 'new', createdAt: at(-1) },
    { id: 'quo-323', name: 'Peter Amoah', company: 'Amoah Motors', email: 'peter@amoahmotors.gh', phone: '+233 24 330 9987', origin: 'Tema', destination: 'Ho', distanceKm: 180, service: 'flatbed', weightTons: 8, pickupDate: dateOnly(9), notes: 'Two vehicles on a flatbed.', status: 'declined', createdAt: at(-8) },
    { id: 'quo-324', name: 'Linda Tetteh', company: 'Tetteh Cosmetics', email: 'linda@tettehcosmetics.gh', phone: '+233 26 118 4470', origin: 'Accra', destination: 'Kumasi', distanceKm: 250, service: 'express', weightTons: 1.5, pickupDate: dateOnly(1), notes: 'Launch stock, must arrive before Friday.', status: 'reviewed', createdAt: at(-2) }
  ].map((quote) => {
    const estimate = calculateEstimate(quote);
    return { ...quote, estimate: estimate.total };
  });

  const fleet = [
    { id: 'veh-101', unit: 'HW-101', make: 'Volvo FH16', year: 2021, type: 'Dry Van', plate: 'GT 4821-24', capacityTons: 24, status: 'on_route', driver: 'Kwame Boateng', odometer: 184320, nextService: dateOnly(18) },
    { id: 'veh-102', unit: 'HW-102', make: 'Scania R500', year: 2022, type: 'Reefer', plate: 'GT 1190-23', capacityTons: 18, status: 'on_route', driver: 'Yaw Owusu', odometer: 141870, nextService: dateOnly(9) },
    { id: 'veh-103', unit: 'HW-103', make: 'MAN TGX', year: 2020, type: 'Flatbed', plate: 'GT 7734-22', capacityTons: 30, status: 'available', driver: 'Ibrahim Musah', odometer: 226540, nextService: dateOnly(32) },
    { id: 'veh-104', unit: 'HW-104', make: 'Mercedes Actros', year: 2023, type: 'Tanker', plate: 'GT 2265-24', capacityTons: 26, status: 'on_route', driver: 'Nii Armah', odometer: 98760, nextService: dateOnly(45) },
    { id: 'veh-105', unit: 'HW-105', make: 'Volvo FMX', year: 2019, type: 'Curtain-side', plate: 'GT 9087-21', capacityTons: 20, status: 'maintenance', driver: 'Selorm Agbeko', odometer: 268910, nextService: dateOnly(-2) },
    { id: 'veh-106', unit: 'HW-106', make: 'Isuzu FVR', year: 2024, type: 'Dry Van', plate: 'GT 3344-25', capacityTons: 10, status: 'available', driver: 'Mary Adjei', odometer: 42110, nextService: dateOnly(60) },
    { id: 'veh-107', unit: 'HW-107', make: 'Scania G410', year: 2022, type: 'Reefer', plate: 'GT 5521-23', capacityTons: 16, status: 'on_route', driver: 'David Koomson', odometer: 132480, nextService: dateOnly(21) },
    { id: 'veh-108', unit: 'HW-108', make: 'Sinotruk HOWO', year: 2018, type: 'Flatbed', plate: 'GT 6678-20', capacityTons: 35, status: 'available', driver: 'Abdul Rahman', odometer: 312600, nextService: dateOnly(12) }
  ];

  const messages = [
    { id: 'msg-1', name: 'Nana Ama Boateng', email: 'nanaama@freshmart.gh', subject: 'Weekly reefer runs', message: 'We move chilled produce from Tema to Accra every Tuesday. Can you send a monthly rate?', read: false, createdAt: at(-1) },
    { id: 'msg-2', name: 'Yusuf Idris', email: 'yusuf@buildsource.gh', subject: 'Heavy haul quote', message: 'We have a 22-tonne excavator moving from Takoradi to Kumasi next month. Do you handle permits?', read: false, createdAt: at(-2) },
    { id: 'msg-3', name: 'Gifty Mensah', email: 'gifty@pharmalink.gh', subject: 'Temperature logs', message: 'Do your reefer trailers provide downloadable temperature logs for pharma audits?', read: true, createdAt: at(-6) },
    { id: 'msg-4', name: 'Kojo Antwi', email: 'kojo@agroplus.gh', subject: 'Delivery window', message: 'The Kumasi run arrived early last week — thank you. Can we lock in the same window?', read: true, createdAt: at(-9) }
  ];

  return {
    version: 1,
    customers,
    shipments,
    quotes: quoteRows,
    fleet,
    messages,
    settings: {
      companyName: 'Haulway Logistics Ltd',
      email: 'hello@haulway.co',
      phone: '+233 30 000 0000',
      address: '12 Harbour Road, Tema, Ghana',
      fuelSurcharge: 8,
      notifyQuotes: true,
      defaultOrigin: 'Tema'
    },
    counters: { shipment: 1055, quote: 325 },
    seededAt: new Date().toISOString()
  };
}
