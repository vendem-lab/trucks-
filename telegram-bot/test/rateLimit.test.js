import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter } from '../src/rateLimit.js';

describe('createRateLimiter', () => {
  it('allows up to the limit inside the window', () => {
    let clock = 0;
    const limiter = createRateLimiter({ max: 2, windowMs: 1000, now: () => clock });

    assert.equal(limiter.check('a').allowed, true);
    assert.equal(limiter.check('a').allowed, true);
    assert.equal(limiter.check('a').allowed, false);
  });

  it('reports how long to wait', () => {
    let clock = 0;
    const limiter = createRateLimiter({ max: 1, windowMs: 60_000, now: () => clock });
    limiter.check('a');
    clock = 15_000;
    assert.equal(limiter.check('a').retryInMs, 45_000);
  });

  it('frees the slot once the window passes', () => {
    let clock = 0;
    const limiter = createRateLimiter({ max: 1, windowMs: 1000, now: () => clock });
    limiter.check('a');
    clock = 1001;
    assert.equal(limiter.check('a').allowed, true);
  });

  it('tracks keys independently', () => {
    let clock = 0;
    const limiter = createRateLimiter({ max: 1, windowMs: 1000, now: () => clock });
    assert.equal(limiter.check('a').allowed, true);
    assert.equal(limiter.check('b').allowed, true);
  });
});
