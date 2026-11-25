import { describe, expect, it } from 'vitest';
import { validateImageSignature } from './image.js';

describe('validateImageSignature', () => {
  it('accepts JPEG, PNG and WebP signatures', () => {
    expect(validateImageSignature([0xff, 0xd8, 0xff, 0xe0], 'image/jpeg')).toBe(true);
    expect(validateImageSignature([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'image/png')).toBe(true);
    expect(validateImageSignature([
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50
    ], 'image/webp')).toBe(true);
  });

  it('rejects mismatched MIME types and altered signatures', () => {
    expect(validateImageSignature([0x3c, 0x68, 0x74, 0x6d, 0x6c], 'image/jpeg')).toBe(false);
    expect(validateImageSignature([0xff, 0xd8, 0xff, 0xe0], 'text/html')).toBe(false);
    expect(validateImageSignature([0xff, 0xd8, 0xff, 0xe0], 'image/svg+xml')).toBe(false);
  });
});
