import { TIER_BY_ID } from '../config.js';

function at(daysOffset, hour = 9, minute = 0) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString();
}

function dateOnly(daysOffset) {
  return at(daysOffset).slice(0, 10);
}

function monthStart(monthsAgo) {
  const date = new Date();
  date.setDate(1);
  date.setHours(9, 0, 0, 0);
  date.setMonth(date.getMonth() - monthsAgo);
  return date;
}

function periodOf(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function buildSeed() {
  const year = new Date().getFullYear();

  const members = [
    {
      id: 'mem-1',
      memberNumber: `HU-${year}-0001`,
      name: 'Kofi Mensah',
      email: 'member@haulwayunion.org',
      phone: '+233 24 908 1122',
      password: 'driver123',
      tier: 'owner_operator',
      status: 'active',
      region: 'Greater Accra',
      city: 'Accra',
      vehicleType: 'Dry van',
      vehiclePlate: 'GT 4821-24',
      licenseNumber: 'DL-448201',
      joinedAt: '2021-04-12',
      notes: 'Runs Accra–Kumasi and Accra–Tamale. Interested in fuel partner rebates.',
      emergencyName: 'Efua Mensah',
      emergencyPhone: '+233 24 908 1123',
      createdAt: at(-1980)
    },
    {
      id: 'mem-2',
      memberNumber: `HU-${year}-0002`,
      name: 'Mary Adjei',
      email: 'mary.adjei@example.com',
      phone: '+233 27 902 1177',
      password: 'driver123',
      tier: 'independent',
      status: 'active',
      region: 'Ashanti',
      city: 'Kumasi',
      vehicleType: 'Reefer',
      vehiclePlate: 'AS 3312-23',
      licenseNumber: 'DL-512874',
      joinedAt: '2022-08-03',
      notes: 'Cold chain work. Available for weekend runs.',
      emergencyName: 'Grace Adjei',
      emergencyPhone: '+233 27 902 1178',
      createdAt: at(-1520)
    },
    {
      id: 'mem-3',
      memberNumber: `HU-${year}-0003`,
      name: 'Ibrahim Musah',
      email: 'ibrahim.musah@example.com',
      phone: '+233 20 445 9911',
      password: 'driver123',
      tier: 'owner_operator',
      status: 'active',
      region: 'Northern',
      city: 'Tamale',
      vehicleType: 'Flatbed',
      vehiclePlate: 'NR 1180-22',
      licenseNumber: 'DL-330118',
      joinedAt: '2020-11-19',
      notes: 'Deputy Secretary. Heavy haul and cross-border permits.',
      emergencyName: 'Rahma Musah',
      emergencyPhone: '+233 20 445 9912',
      createdAt: at(-2100)
    },
    {
      id: 'mem-4',
      memberNumber: `HU-${year}-0004`,
      name: 'Yaw Owusu',
      email: 'yaw.owusu@example.com',
      phone: '+233 55 780 3310',
      password: 'driver123',
      tier: 'independent',
      status: 'active',
      region: 'Western',
      city: 'Takoradi',
      vehicleType: 'Reefer',
      vehiclePlate: 'WR 5521-23',
      licenseNumber: 'DL-667420',
      joinedAt: '2023-02-06',
      notes: 'Pharmaceutical and food-grade reefer loads.',
      emergencyName: 'Akua Owusu',
      emergencyPhone: '+233 55 780 3311',
      createdAt: at(-1320)
    },
    {
      id: 'mem-5',
      memberNumber: `HU-${year}-0005`,
      name: 'Akosua Frimpong',
      email: 'akosua.frimpong@example.com',
      phone: '+233 26 330 8844',
      password: 'driver123',
      tier: 'independent',
      status: 'active',
      region: 'Eastern',
      city: 'Koforidua',
      vehicleType: 'Dry van',
      vehiclePlate: 'ER 7742-24',
      licenseNumber: 'DL-784311',
      joinedAt: '2024-07-08',
      notes: 'Weekly Accra–Koforidua runs.',
      emergencyName: 'Yaa Frimpong',
      emergencyPhone: '+233 26 330 8845',
      createdAt: at(-840)
    },
    {
      id: 'mem-6',
      memberNumber: `HU-${year}-0006`,
      name: 'Nii Armah',
      email: 'nii.armah@example.com',
      phone: '+233 24 771 2208',
      password: 'driver123',
      tier: 'owner_operator',
      status: 'active',
      region: 'Greater Accra',
      city: 'Tema',
      vehicleType: 'Tanker',
      vehiclePlate: 'GT 2265-24',
      licenseNumber: 'DL-209774',
      joinedAt: '2021-09-27',
      notes: 'Training Coordinator. Hazmat certified.',
      emergencyName: 'Naa Armah',
      emergencyPhone: '+233 24 771 2209',
      createdAt: at(-1860)
    },
    {
      id: 'mem-7',
      memberNumber: `HU-${year}-0007`,
      name: 'Selorm Agbeko',
      email: 'selorm.agbeko@example.com',
      phone: '+233 50 118 7755',
      password: 'driver123',
      tier: 'independent',
      status: 'pending',
      region: 'Volta',
      city: 'Ho',
      vehicleType: 'Curtain-side',
      vehiclePlate: 'VR 9087-21',
      licenseNumber: 'DL-901442',
      joinedAt: dateOnly(-3),
      notes: 'Application submitted online. Awaiting licence verification.',
      emergencyName: 'Esi Agbeko',
      emergencyPhone: '+233 50 118 7756',
      createdAt: at(-3)
    },
    {
      id: 'mem-8',
      memberNumber: `HU-${year}-0008`,
      name: 'Fatima Sule',
      email: 'fatima.sule@example.com',
      phone: '+233 24 660 4421',
      password: 'driver123',
      tier: 'independent',
      status: 'pending',
      region: 'Northern',
      city: 'Tamale',
      vehicleType: 'Dry van',
      vehiclePlate: 'NR 4420-25',
      licenseNumber: 'DL-118903',
      joinedAt: dateOnly(-1),
      notes: 'Referred by Ibrahim Musah.',
      emergencyName: 'Sule Alhassan',
      emergencyPhone: '+233 24 660 4422',
      createdAt: at(-1)
    },
    {
      id: 'mem-9',
      memberNumber: `HU-${year}-0009`,
      name: 'Kwame Boateng',
      email: 'kwame.boateng@example.com',
      phone: '+233 24 111 2200',
      password: 'driver123',
      tier: 'independent',
      status: 'active',
      region: 'Ashanti',
      city: 'Kumasi',
      vehicleType: 'Flatbed',
      vehiclePlate: 'AS 1190-22',
      licenseNumber: 'DL-552301',
      joinedAt: '2022-01-14',
      notes: 'Steel and machinery movements.',
      emergencyName: 'Abena Boateng',
      emergencyPhone: '+233 24 111 2201',
      createdAt: at(-1740)
    },
    {
      id: 'mem-10',
      memberNumber: `HU-${year}-0010`,
      name: 'Adwoa Boadi',
      email: 'adwoa.boadi@example.com',
      phone: '+233 27 118 4470',
      password: 'driver123',
      tier: 'independent',
      status: 'suspended',
      region: 'Central',
      city: 'Cape Coast',
      vehicleType: 'Dry van',
      vehiclePlate: 'CR 3344-23',
      licenseNumber: 'DL-447129',
      joinedAt: '2023-05-30',
      notes: 'Suspended for unpaid dues. Payment plan discussed with welfare officer.',
      emergencyName: 'Kojo Boadi',
      emergencyPhone: '+233 27 118 4471',
      createdAt: at(-1240)
    },
    {
      id: 'mem-11',
      memberNumber: `HU-${year}-0011`,
      name: 'David Koomson',
      email: 'david.koomson@example.com',
      phone: '+233 24 330 9987',
      password: 'driver123',
      tier: 'independent',
      status: 'active',
      region: 'Greater Accra',
      city: 'Accra',
      vehicleType: 'Curtain-side',
      vehiclePlate: 'GT 6678-20',
      licenseNumber: 'DL-889002',
      joinedAt: '2024-10-02',
      notes: 'Available for same-day Accra runs.',
      emergencyName: 'Joana Koomson',
      emergencyPhone: '+233 24 330 9988',
      createdAt: at(-750)
    },
    {
      id: 'mem-12',
      memberNumber: `HU-${year}-0012`,
      name: 'Abdul Rahman',
      email: 'abdul.rahman@example.com',
      phone: '+233 20 774 5510',
      password: 'driver123',
      tier: 'owner_operator',
      status: 'active',
      region: 'Upper East',
      city: 'Bolgatanga',
      vehicleType: 'Tipper',
      vehiclePlate: 'UE 8801-21',
      licenseNumber: 'DL-220558',
      joinedAt: '2021-12-08',
      notes: 'Construction aggregate and irrigation equipment.',
      emergencyName: 'Amina Rahman',
      emergencyPhone: '+233 20 774 5511',
      createdAt: at(-1810)
    },
    {
      id: 'mem-13',
      memberNumber: `HU-${year}-0013`,
      name: 'Esi Owusu',
      email: 'esi.owusu@example.com',
      phone: '+233 55 221 8890',
      password: 'driver123',
      tier: 'independent',
      status: 'expired',
      region: 'Western',
      city: 'Takoradi',
      vehicleType: 'Reefer',
      vehiclePlate: 'WR 2204-19',
      licenseNumber: 'DL-334801',
      joinedAt: '2022-06-21',
      notes: 'Membership lapsed. Renewal reminder sent.',
      emergencyName: 'Kweku Owusu',
      emergencyPhone: '+233 55 221 8891',
      createdAt: at(-1580)
    },
    {
      id: 'mem-14',
      memberNumber: `HU-${year}-0014`,
      name: 'Kojo Antwi',
      email: 'kojo.antwi@example.com',
      phone: '+233 50 667 2214',
      password: 'driver123',
      tier: 'fleet',
      status: 'active',
      region: 'Bono East',
      city: 'Techiman',
      vehicleType: 'Dry van',
      vehiclePlate: 'BE 5510-22',
      licenseNumber: 'DL-776120',
      joinedAt: '2023-11-16',
      notes: 'Fleet of six trucks covering the middle belt.',
      emergencyName: 'Ama Antwi',
      emergencyPhone: '+233 50 667 2215',
      createdAt: at(-1080)
    }
  ];

  const dues = [];
  let duesCounter = 1;

  members.forEach((member, index) => {
    if (member.status === 'pending') return;
    const tier = TIER_BY_ID[member.tier] || TIER_BY_ID.independent;
    const months = member.status === 'expired' ? [2, 1] : [2, 1, 0];

    months.forEach((monthsAgo, monthIndex) => {
      const date = monthStart(monthsAgo);
      const period = periodOf(date);
      const dueDate = new Date(date.getFullYear(), date.getMonth(), 28).toISOString().slice(0, 10);
      let status = 'paid';
      let paidAt = at(-(monthsAgo * 30 + 24), 10, 30);
      let method = index % 3 === 0 ? 'momo' : index % 3 === 1 ? 'bank' : 'cash';

      if (member.id === 'mem-10') {
        status = 'overdue';
        paidAt = '';
      } else if (member.id === 'mem-13') {
        status = monthsAgo === 1 ? 'overdue' : 'paid';
        paidAt = monthsAgo === 1 ? '' : at(-(monthsAgo * 30 + 20), 9, 15);
      } else if (monthIndex === 2) {
        const dueNow = ['mem-2', 'mem-6', 'mem-12'].includes(member.id);
        status = dueNow ? 'due' : 'paid';
        if (dueNow) paidAt = '';
      }

      dues.push({
        id: `due-${duesCounter}`,
        reference: `DUE-${year}-${String(duesCounter).padStart(4, '0')}`,
        memberId: member.id,
        memberName: member.name,
        period,
        amount: tier.price,
        dueDate,
        status,
        paidAt,
        method: status === 'paid' ? method : '',
        note:
          status === 'overdue'
            ? 'Two reminders sent. Welfare officer has been in touch.'
            : status === 'due'
              ? 'Invoice issued at the start of the month.'
              : ''
      });
      duesCounter += 1;
    });
  });

  const loads = [
    {
      id: 'load-1042',
      reference: `LD-${year}-1042`,
      title: 'Palletted building materials',
      shipper: 'BuildRight Construction',
      origin: 'Tema',
      destination: 'Kumasi',
      distanceKm: 240,
      trailerType: 'Flatbed',
      weightTons: 18,
      rate: 6200,
      pickupDate: dateOnly(2),
      deliveryDate: dateOnly(3),
      status: 'open',
      postedAt: at(-1, 8, 15),
      requirements: 'Straps and tarpaulin required. Loading crew on site from 06:00.',
      contactName: 'Esi Owusu',
      contactPhone: '+233 20 445 9911',
      contactEmail: 'esi@buildright.gh',
      notes: 'Steel sections, longest piece 9m.',
      filledBy: '',
      filledById: '',
      filledAt: ''
    },
    {
      id: 'load-1043',
      reference: `LD-${year}-1043`,
      title: 'Chilled produce to the coast',
      shipper: 'ColdChain Foods',
      origin: 'Accra',
      destination: 'Takoradi',
      distanceKm: 220,
      trailerType: 'Reefer',
      weightTons: 8,
      rate: 5400,
      pickupDate: dateOnly(1),
      deliveryDate: dateOnly(2),
      status: 'open',
      postedAt: at(0, 7, 40),
      requirements: 'Reefer pre-cooled to 2–4°C. Temperature log required on delivery.',
      contactName: 'Yaw Darko',
      contactPhone: '+233 55 780 3310',
      contactEmail: 'yaw@coldchain.gh',
      notes: 'Two drops in Takoradi, both with tail-lift access.',
      filledBy: '',
      filledById: '',
      filledAt: ''
    },
    {
      id: 'load-1044',
      reference: `LD-${year}-1044`,
      title: 'Northern corridor general goods',
      shipper: 'Mercado Retail',
      origin: 'Tema',
      destination: 'Tamale',
      distanceKm: 640,
      trailerType: 'Dry van',
      weightTons: 14,
      rate: 11800,
      pickupDate: dateOnly(4),
      deliveryDate: dateOnly(6),
      status: 'open',
      postedAt: at(-2, 16, 20),
      requirements: 'Sealed trailer. Overnight parking must be at approved sites only.',
      contactName: 'Adwoa Boadi',
      contactPhone: '+233 27 902 1177',
      contactEmail: 'adwoa@mercado.gh',
      notes: 'Return load available from Tamale on the same week.',
      filledBy: '',
      filledById: '',
      filledAt: ''
    },
    {
      id: 'load-1045',
      reference: `LD-${year}-1045`,
      title: 'Pharmaceutical consignment',
      shipper: 'PharmaLink',
      origin: 'Accra',
      destination: 'Cape Coast',
      distanceKm: 150,
      trailerType: 'Reefer',
      weightTons: 4,
      rate: 3800,
      pickupDate: dateOnly(3),
      deliveryDate: dateOnly(3),
      status: 'open',
      postedAt: at(-1, 11, 5),
      requirements: '2–8°C throughout. Driver must present a valid medical fitness certificate.',
      contactName: 'Gifty Mensah',
      contactPhone: '+233 24 330 8844',
      contactEmail: 'gifty@pharmalink.gh',
      notes: 'Delivery window 09:00–12:00.',
      filledBy: '',
      filledById: '',
      filledAt: ''
    },
    {
      id: 'load-1046',
      reference: `LD-${year}-1046`,
      title: 'Irrigation equipment to Bolgatanga',
      shipper: 'GreenHarvest',
      origin: 'Tema',
      destination: 'Bolgatanga',
      distanceKm: 820,
      trailerType: 'Low bed',
      weightTons: 22,
      rate: 16400,
      pickupDate: dateOnly(7),
      deliveryDate: dateOnly(10),
      status: 'open',
      postedAt: at(-3, 9, 45),
      requirements: 'Escort required for the last 40km. Permits arranged by shipper.',
      contactName: 'Fatima Sule',
      contactPhone: '+233 50 118 7755',
      contactEmail: 'fatima@greenharvest.gh',
      notes: 'Two machines, each 3.1m wide.',
      filledBy: '',
      filledById: '',
      filledAt: ''
    },
    {
      id: 'load-1047',
      reference: `LD-${year}-1047`,
      title: 'Fuel tanker rotation',
      shipper: 'Coastal Energy',
      origin: 'Tema',
      destination: 'Kumasi',
      distanceKm: 250,
      trailerType: 'Tanker',
      weightTons: 24,
      rate: 8900,
      pickupDate: dateOnly(1),
      deliveryDate: dateOnly(2),
      status: 'open',
      postedAt: at(0, 6, 30),
      requirements: 'Hazmat endorsement and tanker wash certificate. No overnight stops.',
      contactName: 'Nana Yeboah',
      contactPhone: '+233 24 771 2208',
      contactEmail: 'nana@coastalenergy.gh',
      notes: 'Recurring weekly rotation for the right driver.',
      filledBy: '',
      filledById: '',
      filledAt: ''
    },
    {
      id: 'load-1048',
      reference: `LD-${year}-1048`,
      title: 'Textile rolls to Koforidua',
      shipper: 'Sunline Textiles',
      origin: 'Accra',
      destination: 'Koforidua',
      distanceKm: 90,
      trailerType: 'Curtain-side',
      weightTons: 5,
      rate: 2400,
      pickupDate: dateOnly(2),
      deliveryDate: dateOnly(2),
      status: 'open',
      postedAt: at(-1, 14, 10),
      requirements: 'Clean, dry trailer. No backloads with liquids.',
      contactName: 'Akosua Frimpong',
      contactPhone: '+233 26 330 8844',
      contactEmail: 'akosua@sunline.gh',
      notes: 'Same-day unloading at the Koforidua store.',
      filledBy: '',
      filledById: '',
      filledAt: ''
    },
    {
      id: 'load-1039',
      reference: `LD-${year}-1039`,
      title: 'Cement bags to Techiman',
      shipper: 'BuildRight Construction',
      origin: 'Tema',
      destination: 'Techiman',
      distanceKm: 420,
      trailerType: 'Tipper',
      weightTons: 26,
      rate: 7600,
      pickupDate: dateOnly(-2),
      deliveryDate: dateOnly(-1),
      status: 'filled',
      postedAt: at(-5, 8, 0),
      requirements: 'Tipper with a working tarpaulin.',
      contactName: 'Esi Owusu',
      contactPhone: '+233 20 445 9911',
      contactEmail: 'esi@buildright.gh',
      notes: '',
      filledBy: 'Kwame Boateng',
      filledById: 'mem-9',
      filledAt: at(-4, 12, 30)
    },
    {
      id: 'load-1040',
      reference: `LD-${year}-1040`,
      title: 'Supermarket replenishment',
      shipper: 'Mercado Retail',
      origin: 'Kumasi',
      destination: 'Accra',
      distanceKm: 250,
      trailerType: 'Dry van',
      weightTons: 6,
      rate: 4300,
      pickupDate: dateOnly(-4),
      deliveryDate: dateOnly(-3),
      status: 'filled',
      postedAt: at(-7, 10, 20),
      requirements: 'Two-person unloading crew at destination.',
      contactName: 'Adwoa Boadi',
      contactPhone: '+233 27 902 1177',
      contactEmail: 'adwoa@mercado.gh',
      notes: '',
      filledBy: 'Mary Adjei',
      filledById: 'mem-2',
      filledAt: at(-6, 9, 0)
    },
    {
      id: 'load-1038',
      reference: `LD-${year}-1038`,
      title: 'Return pallets to Tema',
      shipper: 'AgroPlus Ltd',
      origin: 'Kumasi',
      destination: 'Tema',
      distanceKm: 240,
      trailerType: 'Dry van',
      weightTons: 3,
      rate: 2100,
      pickupDate: dateOnly(-9),
      deliveryDate: dateOnly(-8),
      status: 'closed',
      postedAt: at(-12, 15, 0),
      requirements: 'Pallets must be counted and signed for.',
      contactName: 'Kojo Antwi',
      contactPhone: '+233 24 111 2200',
      contactEmail: 'kojo@agroplus.gh',
      notes: 'Closed after the shipper consolidated the load.',
      filledBy: '',
      filledById: '',
      filledAt: ''
    }
  ];

  const news = [
    {
      id: 'news-1',
      title: 'Dues calendar confirmed for the rest of 2026',
      category: 'announcement',
      excerpt:
        'Monthly dues stay unchanged. Mobile money receipts are now issued automatically, and the 14-day grace period is written into the member handbook.',
      body: [
        'The National Executive Council has confirmed that membership dues will stay at GH₵60 for independent drivers, GH₵120 for owner-operators and GH₵450 for fleet members through December 2026.',
        'From this month every mobile money payment generates an automatic receipt by SMS and in the member portal. Members who pay at the union office will still receive a printed receipt.',
        'The 14-day grace period is now part of the member handbook. Legal cover pauses after day 14, but load board access is restored as soon as the outstanding balance is cleared.',
        'Members with questions about their statement can call the member line or visit the dues desk at Union House on weekdays between 09:00 and 16:00.'
      ],
      author: 'Ama Mensah',
      publishedAt: at(-2, 10, 0),
      featured: true,
      readMins: 3
    },
    {
      id: 'news-2',
      title: 'New axle-load rules: what drivers need to know',
      category: 'industry',
      excerpt:
        'Enforcement starts next month on the Accra–Kumasi corridor. Here is the union’s plain-language guide to the limits, the paperwork and your right to appeal.',
      body: [
        'The Driver and Vehicle Licensing Authority has confirmed that axle-load enforcement will be stepped up on the Accra–Kumasi corridor from next month. We have asked for a 30-day education period before penalties begin.',
        'The key change is not the limit itself but how it is measured. Portable weigh pads will be used at three points, and drivers will be given a printed slip showing each axle reading.',
        'If you believe a reading is wrong, do not argue at the roadside. Ask for the slip, photograph the pad position and call the member line. The union will follow up with the authority on your behalf.',
        'We have published a one-page summary in English, Twi and Dagbani. Copies are available at Union House and from regional representatives.'
      ],
      author: 'Ibrahim Musah',
      publishedAt: at(-5, 9, 30),
      featured: false,
      readMins: 4
    },
    {
      id: 'news-3',
      title: 'Free defensive driving course opens in Kumasi',
      category: 'safety',
      excerpt:
        'Two hundred places are available for active members. The course covers braking on wet roads, fatigue management and post-incident reporting.',
      body: [
        'The next defensive driving course runs over two Saturdays in Kumasi, with 200 places reserved for active members. Attendance is free; transport support is available for members travelling from outside Ashanti.',
        'The course is run with the National Road Safety Authority and covers hazard perception, braking distance on wet and unsealed roads, fatigue management and what to record after an incident.',
        'Drivers who complete both sessions receive a certificate recognised by several insurers, which can reduce comprehensive premiums on request.',
        'Register from the events page or call the training desk. Places are allocated in order of registration, with priority for members who have not attended in the last two years.'
      ],
      author: 'Nii Armah',
      publishedAt: at(-8, 14, 0),
      featured: false,
      readMins: 2
    },
    {
      id: 'news-4',
      title: 'Union wins fuel rebate at six partner stations',
      category: 'member',
      excerpt:
        'Owner-operators can now claim GH₵0.35 off every litre at partner stations in Accra, Tema, Kumasi and Takoradi. Bring your union card.',
      body: [
        'After four months of negotiation, six fuel stations have agreed a member rebate of GH₵0.35 per litre for owner-operators and fleet members.',
        'The rebate applies to diesel only and is capped at 400 litres per vehicle per week. Show your union card or quote your member number at the pump; the attendant records the sale against the station’s union account.',
        'Stations in Accra, Tema, Kumasi and Takoradi are live now. We are negotiating two more sites on the Tamale corridor and will announce them when contracts are signed.',
        'The union does not take a commission on the rebate. Any station that refuses the discount should be reported to the member line with the time, pump number and attendant name.'
      ],
      author: 'Ama Mensah',
      publishedAt: at(-12, 11, 15),
      featured: false,
      readMins: 2
    },
    {
      id: 'news-5',
      title: 'Annual General Meeting set for 5 December',
      category: 'announcement',
      excerpt:
        'The AGM returns to Accra with a full report on dues, welfare payments and the 2027 bargaining agenda. Proxy forms are available now.',
      body: [
        'The Annual General Meeting will take place on Saturday 5 December at the Trade Fair Centre in Accra, starting at 09:00.',
        'The agenda includes the audited welfare fund report, the 2026 dues collection summary, the 2027 bargaining priorities and elections for two regional representative seats.',
        'Members in good standing can vote in person or by proxy. Proxy forms are available at Union House and from regional representatives, and must be returned 48 hours before the meeting.',
        'Lunch and transport support will be provided for members travelling from outside Greater Accra. Registration closes on 28 November.'
      ],
      author: 'Ama Mensah',
      publishedAt: at(-18, 8, 45),
      featured: false,
      readMins: 3
    }
  ];

  const events = [
    {
      id: 'event-1',
      title: 'Dues and benefits clinic',
      type: 'workshop',
      description:
        'Drop in with your member number and leave with a clear statement. We will explain the grace period, welfare eligibility and how to switch to mobile money.',
      location: 'Union House, Accra',
      region: 'Greater Accra',
      startDate: at(4, 10, 0),
      endDate: at(4, 14, 0),
      capacity: 80,
      registered: 41,
      fee: 0,
      memberOnly: false,
      trainer: 'Welfare desk'
    },
    {
      id: 'event-2',
      title: 'Defensive driving refresher — Kumasi',
      type: 'training',
      description:
        'A practical two-session course on hazard perception, wet-road braking, fatigue and incident reporting. Certificate on completion.',
      location: 'Kumasi Regional Office',
      region: 'Ashanti',
      startDate: at(12, 8, 30),
      endDate: at(19, 15, 0),
      capacity: 200,
      registered: 148,
      fee: 0,
      memberOnly: true,
      trainer: 'Nii Armah'
    },
    {
      id: 'event-3',
      title: 'Greater Accra members’ meeting',
      type: 'meeting',
      description:
        'Quarterly meeting for Greater Accra members. Agenda: port delays, fuel rebate rollout and the 2027 bargaining survey.',
      location: 'Tema Community Centre',
      region: 'Greater Accra',
      startDate: at(19, 17, 30),
      endDate: at(19, 20, 0),
      capacity: 150,
      registered: 96,
      fee: 0,
      memberOnly: true,
      trainer: 'Regional committee'
    },
    {
      id: 'event-4',
      title: 'Load securing and tarpaulin workshop',
      type: 'workshop',
      description:
        'Hands-on session with straps, chains and tarpaulins. Bring your gloves; we provide the practice trailer and the load.',
      location: 'Tema Harbour Training Yard',
      region: 'Greater Accra',
      startDate: at(26, 9, 0),
      endDate: at(26, 13, 0),
      capacity: 60,
      registered: 22,
      fee: 40,
      memberOnly: true,
      trainer: 'Ibrahim Musah'
    },
    {
      id: 'event-5',
      title: 'Annual General Meeting 2026',
      type: 'conference',
      description:
        'The union’s full annual report, welfare fund audit, 2027 bargaining agenda and elections for two regional seats.',
      location: 'Trade Fair Centre, Accra',
      region: 'Greater Accra',
      startDate: at(40, 9, 0),
      endDate: at(40, 16, 0),
      capacity: 600,
      registered: 287,
      fee: 0,
      memberOnly: true,
      trainer: 'National Executive Council'
    },
    {
      id: 'event-6',
      title: 'Northern corridor safety outreach',
      type: 'outreach',
      description:
        'Roadside safety checks, reflector fittings and a short briefing on the new axle-load rules for drivers on the Tamale route.',
      location: 'Tamale Lorry Park',
      region: 'Northern',
      startDate: at(-6, 8, 0),
      endDate: at(-6, 14, 0),
      capacity: 120,
      registered: 104,
      fee: 0,
      memberOnly: false,
      trainer: 'Ibrahim Musah'
    }
  ];

  const alerts = [
    {
      id: 'alert-1',
      memberId: 'mem-1',
      name: 'Kofi Mensah',
      email: 'member@haulwayunion.org',
      phone: '+233 24 908 1122',
      origin: 'Accra',
      destination: 'Kumasi',
      trailerType: 'Dry van',
      minRate: 4500,
      frequency: 'instant',
      active: true,
      createdAt: at(-20, 9, 0)
    },
    {
      id: 'alert-2',
      memberId: 'mem-1',
      name: 'Kofi Mensah',
      email: 'member@haulwayunion.org',
      phone: '+233 24 908 1122',
      origin: 'Tema',
      destination: 'Tamale',
      trailerType: 'Dry van',
      minRate: 9000,
      frequency: 'daily',
      active: true,
      createdAt: at(-12, 15, 30)
    },
    {
      id: 'alert-3',
      memberId: 'mem-2',
      name: 'Mary Adjei',
      email: 'mary.adjei@example.com',
      phone: '+233 27 902 1177',
      origin: 'Accra',
      destination: 'Takoradi',
      trailerType: 'Reefer',
      minRate: 4800,
      frequency: 'instant',
      active: true,
      createdAt: at(-7, 10, 15)
    }
  ];

  const messages = [
    {
      id: 'msg-1',
      name: 'Selorm Agbeko',
      email: 'selorm.agbeko@example.com',
      phone: '+233 50 118 7755',
      type: 'membership',
      subject: 'Licence verification for my application',
      message:
        'I submitted my application three days ago and uploaded my licence. Is there anything else you need from me before it is approved?',
      read: false,
      createdAt: at(-1, 9, 20)
    },
    {
      id: 'msg-2',
      name: 'Adwoa Boadi',
      email: 'adwoa.boadi@example.com',
      phone: '+233 27 118 4470',
      type: 'dues',
      subject: 'Payment plan for outstanding dues',
      message:
        'I would like to settle the outstanding balance in two payments this month. Can the welfare officer confirm whether my membership will be restored once the first payment is made?',
      read: false,
      createdAt: at(-2, 14, 5)
    },
    {
      id: 'msg-3',
      name: 'Esi Owusu',
      email: 'esi@buildright.gh',
      phone: '+233 20 445 9911',
      type: 'loads',
      subject: 'Recurring flatbed loads to Kumasi',
      message:
        'We have two flatbed loads a week from Tema to Kumasi for the next three months. Can the union recommend members who are insured for steel sections?',
      read: true,
      createdAt: at(-4, 11, 45)
    },
    {
      id: 'msg-4',
      name: 'Nana Ama Boateng',
      email: 'nanaama@freshmart.gh',
      phone: '+233 24 660 4421',
      type: 'general',
      subject: 'Training partnership for our drivers',
      message:
        'We employ twelve drivers and would like to put them through the defensive driving course. Do you offer a group rate, and can it run at our depot?',
      read: true,
      createdAt: at(-6, 16, 10)
    },
    {
      id: 'msg-5',
      name: 'Yusuf Idris',
      email: 'yusuf@buildsource.gh',
      phone: '+233 50 667 2214',
      type: 'general',
      subject: 'Union stand at the transport expo',
      message:
        'We are organising the West Africa transport expo in November and would like to offer the union a free stand. Who should I speak to about logistics?',
      read: true,
      createdAt: at(-9, 10, 0)
    }
  ];

  const registrations = [
    {
      id: 'reg-1',
      eventId: 'event-2',
      eventTitle: 'Defensive driving refresher — Kumasi',
      memberId: 'mem-2',
      name: 'Mary Adjei',
      email: 'mary.adjei@example.com',
      phone: '+233 27 902 1177',
      createdAt: at(-9, 12, 0)
    },
    {
      id: 'reg-2',
      eventId: 'event-3',
      eventTitle: 'Greater Accra members’ meeting',
      memberId: 'mem-1',
      name: 'Kofi Mensah',
      email: 'member@haulwayunion.org',
      phone: '+233 24 908 1122',
      createdAt: at(-5, 9, 30)
    },
    {
      id: 'reg-3',
      eventId: 'event-1',
      eventTitle: 'Dues and benefits clinic',
      memberId: 'mem-6',
      name: 'Nii Armah',
      email: 'nii.armah@example.com',
      phone: '+233 24 771 2208',
      createdAt: at(-3, 15, 45)
    }
  ];

  return {
    version: 2,
    members,
    loads,
    dues,
    news,
    events,
    alerts,
    messages,
    registrations,
    settings: {
      unionName: "Haulway Drivers' Union",
      email: 'members@haulwayunion.org',
      phone: '+233 30 274 1180',
      memberLine: '+233 24 900 1180',
      address: 'Union House, 14 Kojo Thompson Road, Accra',
      hours: 'Mon–Fri · 08:00–17:00',
      notifyEnquiries: true,
      duesGraceDays: 14,
      duesReminder: true
    },
    counters: {
      member: 15,
      load: 1049,
      dues: duesCounter,
      news: 6,
      event: 7
    },
    seededAt: new Date().toISOString()
  };
}
