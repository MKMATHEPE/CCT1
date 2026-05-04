import { getStoredAuthToken } from "../auth/sessionUser";

const DEFAULT_API_PORT = 8787;
const API_PORT_SCAN_LIMIT = 20;

let resolvedApiBaseUrl: string | null = configuredApiBaseUrl();
let resolveApiBaseUrlPromise: Promise<string> | null = null;

function configuredApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!configured || configured.length === 0) return null;
  // Strip trailing slash and any accidental /health suffix so routes like
  // /auth/login are never prefixed with /health/auth/login.
  return configured.replace(/\/health$/, "").replace(/\/$/, "");
}

export function getAuthenticatedApiHeaders(headers?: Record<string, string>) {
  const token = getStoredAuthToken();
  return {
    ...(headers ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function resolveApiBaseUrl() {
  const configured = configuredApiBaseUrl();
  if (configured) {
    return configured;
  }

  if (resolvedApiBaseUrl) {
    return resolvedApiBaseUrl;
  }

  if (resolveApiBaseUrlPromise) {
    return resolveApiBaseUrlPromise;
  }

  resolveApiBaseUrlPromise = discoverApiBaseUrl()
    .then((url) => {
      resolvedApiBaseUrl = url;
      return url;
    })
    .finally(() => {
      resolveApiBaseUrlPromise = null;
    });

  return resolveApiBaseUrlPromise;
}

export function mapFetchError(error: unknown, action: string) {
  if (error instanceof TypeError) {
    return new Error(
      `Backend API unreachable while trying to ${action}. Start the API server or set VITE_API_BASE_URL correctly.`
    );
  }

  return error instanceof Error ? error : new Error(`Failed to ${action}`);
}

export async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function discoverApiBaseUrl() {
  for (let offset = 0; offset < API_PORT_SCAN_LIMIT; offset += 1) {
    const port = DEFAULT_API_PORT + offset;
    const baseUrl = `http://localhost:${port}`;

    try {
      const response = await fetch(`${baseUrl}/health`);
      const payload = await parseJsonResponse<{ status?: string }>(response);
      if (payload.status === "ok") {
        return baseUrl;
      }
    } catch {
      continue;
    }
  }

  throw new Error(
    `Backend API unreachable. Checked localhost ports ${DEFAULT_API_PORT}-${DEFAULT_API_PORT + API_PORT_SCAN_LIMIT - 1}. Start the API server or set VITE_API_BASE_URL explicitly.`
  );
}
