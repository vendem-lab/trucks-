import { describe, expect, it } from 'vitest';
import { parseDemoMode } from './config.js';

describe('parseDemoMode', () => {
  it('treats the string "false" as off', () => {
    // The regression this guards: Vite exposes env values as strings, so a
    // bare truthiness check hid live-only features such as Google sign-in.
    expect(parseDemoMode('false')).toBe(false);
    expect(parseDemoMode('FALSE')).toBe(false);
    expect(parseDemoMode(' false ')).toBe(false);
  });

  it('turns demo mode on only for an explicit true', () => {
    expect(parseDemoMode('true')).toBe(true);
    expect(parseDemoMode('TRUE')).toBe(true);
  });

  it('defaults to off when the variable is absent', () => {
    expect(parseDemoMode(undefined)).toBe(false);
    expect(parseDemoMode(null)).toBe(false);
    expect(parseDemoMode('')).toBe(false);
    expect(parseDemoMode('0')).toBe(false);
  });
});
