import { describe, expect, it } from 'vitest';
import {
  addDays,
  classNames,
  formatCurrency,
  formatDate,
  initials,
  isValidEmail,
  isValidPhone
} from './format.js';

describe('formatCurrency', () => {
  it('formats whole cedi amounts', () => {
    expect(formatCurrency(1234.56)).toBe('GH₵1,235');
  });

  it('supports decimals and invalid values', () => {
    expect(formatCurrency(1234.56, { decimals: true })).toBe('GH₵1,234.56');
    expect(formatCurrency('not a number')).toBe('GH₵0');
  });
});

describe('formatDate', () => {
  it('formats ISO dates for display', () => {
    expect(formatDate('2026-03-04T12:00:00Z')).toBe('04 Mar 2026');
  });

  it('returns a dash for empty or invalid dates', () => {
    expect(formatDate('')).toBe('—');
    expect(formatDate('nope')).toBe('—');
  });
});

describe('validation', () => {
  it('accepts sensible emails and rejects malformed ones', () => {
    expect(isValidEmail('dispatch@haulway.co')).toBe(true);
    expect(isValidEmail('dispatch@haulway')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  it('accepts local and international phone formats', () => {
    expect(isValidPhone('+233 24 111 2200')).toBe(true);
    expect(isValidPhone('0241112200')).toBe(true);
    expect(isValidPhone('12')).toBe(false);
  });
});

describe('small helpers', () => {
  it('builds initials from a name', () => {
    expect(initials('Ama Mensah')).toBe('AM');
    expect(initials('Haulway')).toBe('H');
  });

  it('adds days without mutating the input', () => {
    const start = new Date(2026, 0, 30, 12);
    const next = addDays(start, 3);
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(1);
    expect(next.getDate()).toBe(2);
    expect(start.getDate()).toBe(30);
  });

  it('joins truthy class names', () => {
    expect(classNames('a', false, null, 'b')).toBe('a b');
  });
});
