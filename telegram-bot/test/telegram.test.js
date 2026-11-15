import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { splitMessage } from '../src/telegram.js';

describe('splitMessage', () => {
  it('keeps short messages intact', () => {
    assert.deepEqual(splitMessage('hello'), ['hello']);
  });

  it('splits on line breaks', () => {
    const text = ['a'.repeat(10), 'b'.repeat(10), 'c'.repeat(10)].join('\n');
    const chunks = splitMessage(text, 15);
    assert.equal(chunks.length, 3);
    assert.equal(chunks.join('\n').replace(/\n/g, ''), text.replace(/\n/g, ''));
  });

  it('breaks a single long line', () => {
    const chunks = splitMessage('x'.repeat(25), 10);
    assert.deepEqual(chunks, ['x'.repeat(10), 'x'.repeat(10), 'x'.repeat(5)]);
  });

  it('never exceeds the limit', () => {
    const text = Array.from({ length: 40 }, (_, index) => `line ${index} ${'y'.repeat(80)}`).join('\n');
    for (const chunk of splitMessage(text, 200)) {
      assert.ok(chunk.length <= 200);
    }
  });
});
