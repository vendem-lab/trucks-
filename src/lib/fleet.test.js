import { describe, expect, it } from 'vitest';
import { buildDemoFleet } from './fleet.js';

describe('buildDemoFleet', () => {
  it('omits members who disable their public profile and inactive members', () => {
    const fleet = buildDemoFleet([
      { id: 'visible', status: 'active', name: 'Visible Member', vehicleType: 'Dry van' },
      { id: 'hidden', status: 'active', publicProfile: false, name: 'Hidden Member' },
      { id: 'pending', status: 'pending', name: 'Pending Member' }
    ]);

    expect(fleet.map((vehicle) => vehicle.id)).toEqual(['visible']);
  });

  it('keeps existing active members visible by default', () => {
    const fleet = buildDemoFleet([
      { id: 'legacy', status: 'active', name: 'Legacy Member', vehicleType: 'Reefer' }
    ]);

    expect(fleet).toHaveLength(1);
    expect(fleet[0]).toMatchObject({
      id: 'legacy',
      displayName: 'Legacy Member',
      vehicleType: 'Reefer'
    });
  });
});
