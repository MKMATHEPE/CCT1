import type { User } from "./authContext";

const AUTH_TOKEN_STORAGE_KEY = "cct:auth-token";
const SESSION_USER_STORAGE_KEY = "cct:session-user";
const LAST_LOGIN_STORAGE_KEY = "cct:last-login";

export type StoredSession = {
  token: string;
  user: User;
  lastLoginAt: string;
};

export function storeSession(session: StoredSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, session.token);
  window.sessionStorage.setItem(
    SESSION_USER_STORAGE_KEY,
    JSON.stringify(session.user)
  );
  window.sessionStorage.setItem(LAST_LOGIN_STORAGE_KEY, session.lastLoginAt);
  window.sessionStorage.setItem("cct:logged-out", "false");
}

export function clearStoredSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem("cct:logged-out", "true");
  window.sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  window.sessionStorage.removeItem(SESSION_USER_STORAGE_KEY);
}

export function getStoredAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function getStoredSessionUser(): User | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (window.sessionStorage.getItem("cct:logged-out") === "true") {
    return null;
  }

  const raw = window.sessionStorage.getItem(SESSION_USER_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function getStoredLastLoginAt() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage.getItem(LAST_LOGIN_STORAGE_KEY);
}
