// server/src/middleware/securityHeaders.ts
// ---------------------------------------------------------------------------
// Sets production security headers on every response.
// Call once at the top of your request handler, right after CORS.
// ---------------------------------------------------------------------------

import type { ServerResponse } from 'node:http';

/**
 * Applies security headers to every response.
 *
 * Usage in router.ts:
 *
 *   import { applySecurityHeaders } from '../middleware/securityHeaders.js';
 *
 *   export async function handleRequest(req, res) {
 *     if (applyCors(req, res)) return;
 *     applySecurityHeaders(res);
 *     // … rest of routing
 *   }
 */
export function applySecurityHeaders(res: ServerResponse): void {
  // Prevent MIME-sniffing (stops browser from guessing content types)
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Block framing entirely — this is an API, not embeddable content
  res.setHeader('X-Frame-Options', 'DENY');

  // Disable XSS auditor (deprecated but some scanners still flag its absence)
  res.setHeader('X-XSS-Protection', '0');

  // Only send the origin as referrer, never the full URL path
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // HSTS — force HTTPS for 2 years, include subdomains
  // Only active over TLS, harmless over HTTP (browsers ignore it)
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload',
  );

  // Restrictive CSP for an API server (no scripts, no styles, no frames)
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'",
  );

  // Prevent the browser from caching sensitive API responses
  res.setHeader('Cache-Control', 'no-store');

  // Restrict what browser features this origin can access
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}
