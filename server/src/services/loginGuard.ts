const FAILURE_WINDOW_MS = 60_000;
const MAX_FAILURES = 5;

type FailureEntry = {
  count: number;
  windowStartedAt: number;
};

const failures = new Map<string, FailureEntry>();

export type LoginGuardResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export function checkLoginAllowed(ip: string): LoginGuardResult {
  const now = Date.now();
  const entry = failures.get(ip);

  if (!entry || now - entry.windowStartedAt >= FAILURE_WINDOW_MS) {
    return { allowed: true };
  }

  if (entry.count >= MAX_FAILURES) {
    const retryAfterMs = FAILURE_WINDOW_MS - (now - entry.windowStartedAt);
    return { allowed: false, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
  }

  return { allowed: true };
}

export function recordLoginFailure(ip: string): void {
  const now = Date.now();
  const entry = failures.get(ip);

  if (!entry || now - entry.windowStartedAt >= FAILURE_WINDOW_MS) {
    failures.set(ip, { count: 1, windowStartedAt: now });
  } else {
    entry.count += 1;
  }
}

export function clearLoginFailures(ip: string): void {
  failures.delete(ip);
}
