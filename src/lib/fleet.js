const PHOTO_BY_TYPE = {
  '1-tonne truck': '/fleet/light-truck.svg',
  '2-tonne truck': '/fleet/light-truck.svg',
  '3-tonne truck': '/fleet/light-truck.svg',
  '4-tonne truck': '/fleet/light-truck.svg',
  '5-tonne truck': '/fleet/light-truck.svg',
  'Dry van': '/fleet/dry-van.svg',
  Reefer: '/fleet/reefer.svg',
  Flatbed: '/fleet/flatbed.svg',
  Tanker: '/fleet/tanker.svg',
  'Curtain-side': '/fleet/curtain-side.svg',
  Tipper: '/fleet/tipper.svg',
  'Low bed': '/fleet/low-bed.svg',
  'Bus / passenger': '/fleet/bus.svg'
};

const DEFAULT_PHOTO = '/fleet/dry-van.svg';

export function photoForVehicleType(vehicleType) {
  return PHOTO_BY_TYPE[vehicleType] || DEFAULT_PHOTO;
}

export function isDemoIllustration(photo) {
  return String(photo || '').startsWith('/fleet/');
}

export function publicFleetFields(member, existing = null) {
  const keepUploadedPhoto =
    existing?.photo && !isDemoIllustration(existing.photo) ? existing.photo : '';
  return {
    memberId: member.id,
    displayName: member.name || 'Union member',
    vehicleType: member.vehicleType || 'Dry van',
    region: member.region || '',
    city: member.city || '',
    tier: member.tier || 'independent',
    joinedAt: member.joinedAt || '',
    photo: keepUploadedPhoto || photoForVehicleType(member.vehicleType),
    active: member.status === 'active',
    updatedAt: existing?.updatedAt || member.createdAt || new Date().toISOString()
  };
}

export function buildDemoFleet(members = []) {
  return members
    .filter((member) => member.status === 'active')
    .map((member) => ({ id: member.id, ...publicFleetFields(member) }));
}

export function demoFleetEntry(member, existing = null) {
  return {
    id: member.id,
    ...publicFleetFields(member, existing),
    updatedAt: new Date().toISOString()
  };
}
