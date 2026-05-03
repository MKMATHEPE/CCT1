import { env } from "../config/env.ts";
import { logger } from "../lib/logger.ts";

type Entry = {
  count: number;
  windowStartedAt: number;
};

const hits = new Map<string, Entry>();

export function registerRequest(ip: string, path: string) {
  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now - entry.windowStartedAt >= env.rateLimitWindowMs) {
    hits.set(ip, {
      count: 1,
      windowStartedAt: now,
    });
    logger.info("rate_limit_window_started", { ip, path });
    return;
  }

  entry.count += 1;

  if (entry.count > env.rateLimitMaxRequests) {
    logger.warn("rate_limit_threshold_exceeded", {
      ip,
      path,
      count: entry.count,
      limit: env.rateLimitMaxRequests,
      windowMs: env.rateLimitWindowMs,
    });
  }
}
