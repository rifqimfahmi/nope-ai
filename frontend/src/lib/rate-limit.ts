const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;

// In-memory sliding window - fine for a single long-lived prod container
// (see docker-compose.prod.yml, no Redis/multi-instance frontend). Would
// need a shared store (e.g. Redis) if the frontend ever scales horizontally.
const hits = new Map<string, number[]>();

// Periodically drop entries with no recent hits so the map doesn't grow
// unbounded over the process lifetime (e.g. from scanners hitting once).
setInterval(
  () => {
    const now = Date.now();
    for (const [key, timestamps] of hits) {
      if (!timestamps.some((t) => now - t < WINDOW_MS)) hits.delete(key);
    }
  },
  10 * 60_000,
).unref();

/** Returns true if `key` has exceeded MAX_REQUESTS within the trailing window. */
export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (timestamps.length >= MAX_REQUESTS) {
    hits.set(key, timestamps);
    return true;
  }

  timestamps.push(now);
  hits.set(key, timestamps);
  return false;
}
