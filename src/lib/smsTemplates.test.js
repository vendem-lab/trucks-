import { describe, expect, it } from 'vitest';
import {
  SMS_MAX_LENGTH,
  SMS_TEMPLATES,
  buildStatusMessage,
  normalizePhone,
  renderTemplate,
  smsSegments,
  statusLabel
} from './smsTemplates.js';

describe('normalizePhone', () => {
  it('converts Ghanaian local numbers to the 233 country code', () => {
    expect(normalizePhone('0241112200')).toBe('233241112200');
    expect(normalizePhone('024 111 2200')).toBe('233241112200');
  });

  it('keeps already international numbers and strips punctuation', () => {
    expect(normalizePhone('+233 24 111 2200')).toBe('233241112200');
    expect(normalizePhone('233241112200')).toBe('233241112200');
    expect(normalizePhone('00233241112200')).toBe('233241112200');
    expect(normalizePhone('+1 (555) 010-9999')).toBe('15550109999');
  });

  it('rejects empty and implausibly short numbers', () => {
    expect(normalizePhone('')).toBe('');
    expect(normalizePhone('   ')).toBe('');
    expect(normalizePhone('12')).toBe('');
    expect(normalizePhone(null)).toBe('');
  });
});

describe('renderTemplate', () => {
  const vars = { firstName: 'Kofi', amount: '120', count: 2, empty: '' };

  it('replaces known placeholders', () => {
    expect(renderTemplate('Hello {{firstName}}, GHS {{amount}}', vars)).toBe(
      'Hello Kofi, GHS 120'
    );
  });

  it('tolerates whitespace inside the braces and coerces values', () => {
    expect(renderTemplate('{{ firstName }} owes {{ count }}', vars)).toBe('Kofi owes 2');
  });

  it('renders empty values as an empty string', () => {
    expect(renderTemplate('A{{empty}}B', vars)).toBe('AB');
  });

  it('leaves unknown placeholders untouched', () => {
    expect(renderTemplate('Hi {{missing}}', vars)).toBe('Hi {{missing}}');
  });
});

describe('smsSegments', () => {
  it('reports zero segments for an empty message', () => {
    expect(smsSegments('')).toEqual({ length: 0, encoding: 'GSM-7', segments: 0 });
  });

  it('counts GSM-7 single and multi-part messages', () => {
    expect(smsSegments('a'.repeat(160)).segments).toBe(1);
    expect(smsSegments('a'.repeat(161)).segments).toBe(2);
    expect(smsSegments('a'.repeat(306)).segments).toBe(2);
    expect(smsSegments('a'.repeat(307)).segments).toBe(3);
    expect(smsSegments('a'.repeat(161)).encoding).toBe('GSM-7');
  });

  it('switches to UCS-2 for characters outside the GSM set', () => {
    const message = `GHS ${'₵'}100`;
    expect(smsSegments(message).encoding).toBe('UCS-2');
    expect(smsSegments('₵'.repeat(70)).segments).toBe(1);
    expect(smsSegments('₵'.repeat(71)).segments).toBe(2);
    expect(smsSegments('😀'.repeat(36)).encoding).toBe('UCS-2');
    expect(smsSegments('😀'.repeat(36)).segments).toBe(2);
  });
});

describe('status messages', () => {
  it('labels known and unknown statuses', () => {
    expect(statusLabel('active')).toBe('active');
    expect(statusLabel('suspended')).toBe('suspended');
    expect(statusLabel('on_hold')).toBe('on hold');
    expect(statusLabel('')).toBe('');
  });

  it('uses the active template only for active members', () => {
    expect(buildStatusMessage('active')).toContain('membership is active');
    expect(buildStatusMessage('suspended')).toContain('{{status}}');
    expect(buildStatusMessage('suspended')).toBe(SMS_TEMPLATES.status.message);
  });
});

describe('template catalogue', () => {
  it('exposes a message and audience for every use case', () => {
    for (const key of ['announcement', 'dues', 'status', 'loadAlert']) {
      expect(SMS_TEMPLATES[key].message.length).toBeGreaterThan(0);
      expect(SMS_TEMPLATES[key].audience).toBeTruthy();
      expect(SMS_TEMPLATES[key].kind).toBeTruthy();
    }
    expect(SMS_MAX_LENGTH).toBeGreaterThanOrEqual(160);
  });
});
