import { describe, expect, it } from 'vitest';
import {
  buildDeliveryRecord,
  deliveryOutcomeLabel,
  isValidLoadReference,
  normalizeEmail,
  validateDelivery,
  validateDeliveryConfirmation
} from './deliveries.js';

const NOW = new Date('2026-11-01T09:00:00.000Z');

describe('validateDelivery', () => {
  it('accepts a note and an optional photo', () => {
    expect(validateDelivery({ note: 'Delivered and signed for.', photo: '' })).toEqual({});
    expect(
      validateDelivery({ note: 'Delivered and signed for.', photo: 'data:image/jpeg;base64,abc' })
    ).toEqual({});
  });

  it('requires a meaningful note', () => {
    expect(validateDelivery({ note: 'ok' }).note).toMatch(/short note/i);
    expect(validateDelivery({ note: '   ' }).note).toMatch(/short note/i);
  });

  it('rejects an oversized or malformed photo', () => {
    expect(validateDelivery({ note: 'Delivered safely.', photo: 'not-a-data-url' }).photo).toBeTruthy();
    expect(
      validateDelivery({ note: 'Delivered safely.', photo: `data:image/png;base64,${'a'.repeat(900001)}` }).photo
    ).toMatch(/too large/i);
  });
});

describe('validateDeliveryConfirmation', () => {
  it('accepts a complete confirmation', () => {
    expect(
      validateDeliveryConfirmation({
        reference: 'LD-2026-1049',
        contactEmail: 'ops@shipper.com',
        outcome: 'delivered',
        note: 'Arrived on time.'
      })
    ).toEqual({});
  });

  it('rejects a missing reference, email, or outcome', () => {
    const errors = validateDeliveryConfirmation({
      reference: '1049',
      contactEmail: 'not-an-email',
      outcome: 'maybe'
    });
    expect(errors.reference).toBeTruthy();
    expect(errors.contactEmail).toBeTruthy();
    expect(errors.outcome).toBeTruthy();
  });
});

describe('load references and email normalisation', () => {
  it('accepts only load references', () => {
    expect(isValidLoadReference('LD-2026-1049')).toBe(true);
    expect(isValidLoadReference('ld-2026-1049')).toBe(true);
    expect(isValidLoadReference('LR-2026-1049')).toBe(false);
    expect(isValidLoadReference('LD-2026')).toBe(false);
  });

  it('normalises email addresses for comparison', () => {
    expect(normalizeEmail('  Dispatch@Shipper.GH ')).toBe('dispatch@shipper.gh');
    expect(normalizeEmail(null)).toBe('');
  });
});

describe('buildDeliveryRecord', () => {
  it('creates a submitted delivery with empty confirmation fields', () => {
    const record = buildDeliveryRecord(
      { id: 'load-1', reference: 'LD-2026-1049' },
      { id: 'mem-1', name: 'Kofi Mensah' },
      { note: 'Delivered and signed for.' },
      NOW
    );
    expect(record).toMatchObject({
      loadId: 'load-1',
      loadReference: 'LD-2026-1049',
      memberId: 'mem-1',
      memberName: 'Kofi Mensah',
      deliveredAt: NOW.toISOString(),
      note: 'Delivered and signed for.',
      photo: '',
      status: 'submitted',
      confirmedAt: ''
    });
  });

  it('labels confirmation outcomes', () => {
    expect(deliveryOutcomeLabel('delivered')).toBe('Confirmed delivery');
    expect(deliveryOutcomeLabel('problem')).toBe('Reported a problem');
  });
});
