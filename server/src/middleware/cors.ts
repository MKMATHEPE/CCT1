// server/src/middleware/cors.ts
// ---------------------------------------------------------------------------
// Production-safe CORS middleware for the vanilla Node.js HTTP server.
//
// • Allowlist-based: only origins you explicitly permit get reflected.
// • Credentials-aware: sends Vary: Origin so CDN caches don't mix responses.
// • Preflight-complete: handles OPTIONS with correct max-age and headers.
// • Falls back to env-injected ALLOWED_ORIGINS so you never hard-code domains.
// ---------------------------------------------------------------------------

import type { IncomingMessage, ServerResponse } from 'node:http';

/** Comma-separated allowlist — prefers CORS_ALLOWED_ORIGINS, falls back to ALLOWED_ORIGINS. */
const ALLOWED_ORIGINS: ReadonlySet<string> = new Set(
  (process.env.CORS_ALLOWED_ORIGINS ?? process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
);

const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization, X-Requested-With';
const MAX_AGE_SECONDS = '7200'; // 2 hours — browsers cache preflight result

/**
 * Returns `true` if the origin is on the allowlist.
 * In local dev (no ALLOWED_ORIGINS set) nothing is allowed — set the var.
 */
function isOriginAllowed(origin: string | undefined): origin is string {
  if (!origin) return false;
  return ALLOWED_ORIGINS.has(origin);
}

/**
 * Sets CORS headers on `res`.
 *
 * Call at the very top of your request handler, before routing.
 * If this returns `true`, the request was an OPTIONS preflight and
 * has already been answered — stop processing.
 *
 * Usage in router.ts:
 *
 *   import { applyCors } from '../middleware/cors.js';
 *
 *   export async function handleRequest(req, res) {
 *     if (applyCors(req, res)) return;   // preflight handled
 *     // … rest of routing
 *   }
 */
export function applyCors(
  req: IncomingMessage,
  res: ServerResponse,
): boolean {
  const origin = req.headers.origin;

  // Always send Vary so intermediaries don't cache a response with the wrong
  // Access-Control-Allow-Origin for a different origin.
  res.setHeader('Vary', 'Origin');

  if (isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
    res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
    res.setHeader('Access-Control-Max-Age', MAX_AGE_SECONDS);
  }
  // If origin is NOT allowed we simply omit the header — the browser
  // enforces the block on its side. No error, no leak.

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true; // signal: request fully handled
  }

  return false;
}
