// server/src/middleware/rateLimiter.ts
// ---------------------------------------------------------------------------
// IP-based rate limiter for auth endpoints (login, signup).
// No external dependencies — uses a Map with automatic TTL cleanup.
//
// Protects against brute-force password attacks by blocking an IP after
// MAX_ATTEMPTS failed requests within WINDOW_MS.
// ---------------------------------------------------------------------------

import type { IncomingMessage, ServerResponse } from 'node:http';

interface AttemptRecord {
  count: number;
  firstAttempt: number;
}

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000; // 1 minute
const CLEANUP_INTERVAL_MS = 300_000; // Purge stale entries every 5 min

const attempts = new Map<string, AttemptRecord>();

// Background cleanup so the Map doesn't grow unbounded
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of attempts) {
    if (now - record.firstAttempt > WINDOW_MS) {
      attempts.delete(ip);
    }
  }
}, CLEANUP_INTERVAL_MS).unref(); // .unref() so it doesn't block shutdown

/**
 * Extracts the client IP, respecting X-Forwarded-For behind a reverse proxy.
 * Railway / Render both set this header.
 */
function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress ?? 'unknown';
}

/**
 * Returns `true` if the request is rate-limited (too many attempts).
 * When limited, it writes a 429 response and the caller should stop.
 *
 * Usage in router.ts:
 *
 *   import { isRateLimited, clearRateLimit } from '../middleware/rateLimiter.js';
 *
 *   // Before processing POST /auth/login:
 *   if (isRateLimited(req, res)) return;
 *
 *   // After a SUCCESSFUL login:
 *   clearRateLimit(req);
 */
export function isRateLimited(
  req: IncomingMessage,
  res: ServerResponse,
): boolean {
  const ip = getClientIp(req);
  const now = Date.now();
  const record = attempts.get(ip);

  if (record) {
    // Window expired — reset
    if (now - record.firstAttempt > WINDOW_MS) {
      attempts.set(ip, { count: 1, firstAttempt: now });
      return false;
    }

    record.count += 1;

    if (record.count > MAX_ATTEMPTS) {
      const retryAfter = Math.ceil(
        (WINDOW_MS - (now - record.firstAttempt)) / 1000,
      );
      res.setHeader('Retry-After', String(retryAfter));
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'Too many login attempts. Please try again later.',
          retryAfterSeconds: retryAfter,
        }),
      );
      return true;
    }

    return false;
  }

  // First attempt from this IP
  attempts.set(ip, { count: 1, firstAttempt: now });
  return false;
}

/**
 * Clear the rate-limit counter for this IP after a successful login.
 */
export function clearRateLimit(req: IncomingMessage): void {
  const ip = getClientIp(req);
  attempts.delete(ip);
}
