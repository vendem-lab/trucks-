/**
 * In-memory sliding-window limiter. Good enough for a single bot process;
 * restarting the process resets the counters.
 */
export function createRateLimiter({ max, windowMs, now = () => Date.now() }) {
  const hits = new Map();

  function prune(list, cutoff) {
    while (list.length && list[0] <= cutoff) list.shift();
  }

  return {
    check(key) {
      const cutoff = now() - windowMs;
      const list = hits.get(key) || [];
      prune(list, cutoff);

      if (list.length >= max) {
        const retryAt = list[0] + windowMs;
        return { allowed: false, retryInMs: Math.max(0, retryAt - now()) };
      }

      list.push(now());
      hits.set(key, list);
      return { allowed: true, retryInMs: 0 };
    },
    reset(key) {
      hits.delete(key);
    },
    size() {
      return hits.size;
    }
  };
}
