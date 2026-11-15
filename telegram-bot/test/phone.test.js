import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatPhone, normalizePhone, samePhone } from '../src/phone.js';

describe('normalizePhone', () => {
  it('converts local Ghanaian numbers', () => {
    assert.equal(normalizePhone('0557704299'), '233557704299');
    assert.equal(normalizePhone('055 770 4299'), '233557704299');
  });

  it('keeps international numbers and strips punctuation', () => {
    assert.equal(normalizePhone('+233 55 770 4299'), '233557704299');
    assert.equal(normalizePhone('00233557704299'), '233557704299');
  });

  it('rejects implausible input', () => {
    assert.equal(normalizePhone(''), '');
    assert.equal(normalizePhone('12345'), '');
    assert.equal(normalizePhone(null), '');
  });
});

describe('formatPhone', () => {
  it('groups Ghanaian numbers for display', () => {
    assert.equal(formatPhone('0557704299'), '+233 55 770 4299');
  });
});

describe('samePhone', () => {
  it('compares across formats', () => {
    assert.equal(samePhone('0557704299', '+233557704299'), true);
    assert.equal(samePhone('0557704299', '0557704298'), false);
  });
});
