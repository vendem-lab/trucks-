import { describe, expect, it } from 'vitest';
import {
  buildLoadFromRequest,
  checkLoadRequestRate,
  emptyLoadRequest,
  validateLoadRequest
} from './loadRequests.js';

const NOW = new Date(2026, 10, 1, 9, 0, 0);

function validForm(overrides = {}) {
  return {
    title: 'Bagged cement to Sunyani',
    shipper: 'Ashanti Build Supplies',
    contactName: 'Kwabena Osei',
    contactPhone: '+233 24 555 0134',
    contactEmail: 'dispatch@ashantibuild.gh',
    origin: 'Tema',
    destination: 'Sunyani',
    vehicleType: 'Tipper',
    weightTons: '24',
    rate: '8200',
    pickupDate: '2026-11-05',
    deliveryDate: '2026-11-06',
    requirements: 'Tipper with a working tarpaulin.',
    consent: true,
    website: '',
    ...overrides
  };
}

describe('validateLoadRequest', () => {
  it('accepts a complete request', () => {
    expect(validateLoadRequest(validForm(), { now: NOW })).toEqual({});
  });

  it('requires the core contact and route fields', () => {
    const errors = validateLoadRequest(
      {
        title: '',
        shipper: '',
        contactName: '',
        contactPhone: '12',
        contactEmail: 'not-an-email',
        origin: '',
        destination: '',
        vehicleType: 'Bicycle',
        weightTons: '0',
        rate: '0',
        pickupDate: '',
        consent: false
      },
      { now: NOW }
    );

    expect(errors.title).toBeTruthy();
    expect(errors.shipper).toBeTruthy();
    expect(errors.contactName).toBeTruthy();
    expect(errors.contactPhone).toBeTruthy();
    expect(errors.contactEmail).toBeTruthy();
    expect(errors.origin).toBeTruthy();
    expect(errors.destination).toBeTruthy();
    expect(errors.vehicleType).toBeTruthy();
    expect(errors.weightTons).toBeTruthy();
    expect(errors.rate).toBeTruthy();
    expect(errors.pickupDate).toBeTruthy();
    expect(errors.consent).toBeTruthy();
  });

  it('rejects a past pickup date and delivery before pickup', () => {
    const errors = validateLoadRequest(
      validForm({ pickupDate: '2026-10-30', deliveryDate: '2026-10-29' }),
      { now: NOW }
    );
    expect(errors.pickupDate).toMatch(/past/i);
    expect(errors.deliveryDate).toMatch(/on or after/i);
  });

  it('bounds weight and rate', () => {
    const errors = validateLoadRequest(
      validForm({ weightTons: '120', rate: '2000000' }),
      { now: NOW }
    );
    expect(errors.weightTons).toBeTruthy();
    expect(errors.rate).toBeTruthy();
  });
});

describe('emptyLoadRequest', () => {
  it('defaults pickup to tomorrow', () => {
    expect(emptyLoadRequest(NOW).pickupDate).toBe('2026-11-02');
  });
});

describe('checkLoadRequestRate', () => {
  const now = 1_000_000;

  it('allows three submissions in the window and blocks the fourth', () => {
    const two = [now - 5000, now - 1000];
    expect(checkLoadRequestRate(two, now).allowed).toBe(true);

    const three = [now - 5000, now - 1000, now - 500];
    const blocked = checkLoadRequestRate(three, now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it('ignores timestamps outside the window', () => {
    const old = [now - 20 * 60 * 1000, now - 15 * 60 * 1000];
    expect(checkLoadRequestRate(old, now).allowed).toBe(true);
  });
});

describe('buildLoadFromRequest', () => {
  it('maps a request into a publishable load', () => {
    const load = buildLoadFromRequest(validForm(), { distanceKm: 412, rate: 8400 });
    expect(load).toMatchObject({
      title: 'Bagged cement to Sunyani',
      shipper: 'Ashanti Build Supplies',
      origin: 'Tema',
      destination: 'Sunyani',
      trailerType: 'Tipper',
      weightTons: 24,
      rate: 8400,
      distanceKm: 412,
      status: 'open'
    });
    expect(load.contactPhone).toBeUndefined();
    expect(load.filledBy).toBe('');
  });
});
