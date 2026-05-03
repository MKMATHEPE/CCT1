import type { User } from "../auth/authContext";
import {
  getStoredAuthToken,
  type StoredSession,
} from "../auth/sessionUser";
import {
  mapFetchError,
  parseJsonResponse,
  resolveApiBaseUrl,
} from "./apiClient";

export type ClientUserRecord = {
  id: string;
  name: string;
  username: string;
  role: "client";
  insurerId: string;
  insurerName: string;
  builtIn: boolean;
  createdAt: string;
  updatedAt: string;
};

function getAuthHeaders(headers?: Record<string, string>) {
  const token = getStoredAuthToken();
  return {
    ...(headers ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function loginWithPassword(username: string, password: string) {
  try {
    const baseUrl = await resolveApiBaseUrl();
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    return await parseJsonResponse<StoredSession>(response);
  } catch (error) {
    throw mapFetchError(error, "sign in");
  }
}

export async function fetchCurrentSession() {
  const token = getStoredAuthToken();
  if (!token) {
    return null;
  }

  try {
    const baseUrl = await resolveApiBaseUrl();
    const response = await fetch(`${baseUrl}/auth/session`, {
      headers: getAuthHeaders(),
    });
    const payload = await parseJsonResponse<{ user: User }>(response);
    return payload.user;
  } catch {
    return null;
  }
}

export async function logoutSession() {
  const token = getStoredAuthToken();
  if (!token) {
    return;
  }

  try {
    const baseUrl = await resolveApiBaseUrl();
    await fetch(`${baseUrl}/auth/logout`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
  } catch {
    // Best-effort logout. Local session is cleared regardless.
  }
}

export async function listClientUsers() {
  const baseUrl = await resolveApiBaseUrl();
  const response = await fetch(`${baseUrl}/auth/users`, {
    headers: getAuthHeaders(),
  });
  const payload = await parseJsonResponse<{ users: ClientUserRecord[] }>(response);
  return payload.users;
}

export async function createClientUser(input: {
  insurerName: string;
  username: string;
  password: string;
}) {
  const baseUrl = await resolveApiBaseUrl();
  const response = await fetch(`${baseUrl}/auth/users`, {
    method: "POST",
    headers: getAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(input),
  });
  const payload = await parseJsonResponse<{ user: ClientUserRecord }>(response);
  return payload.user;
}

export async function updateClientUser(
  userId: string,
  input: {
    insurerName: string;
    username: string;
    password: string;
  }
) {
  const baseUrl = await resolveApiBaseUrl();
  const response = await fetch(`${baseUrl}/auth/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: getAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(input),
  });
  const payload = await parseJsonResponse<{ user: ClientUserRecord }>(response);
  return payload.user;
}

export async function deleteClientUser(userId: string) {
  const baseUrl = await resolveApiBaseUrl();
  const response = await fetch(`${baseUrl}/auth/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  await parseJsonResponse<{ success: boolean }>(response);
}

export type AdminUserRecord = {
  id: string;
  name: string;
  role: "admin";
  insurerId: string;
  insurerName: string;
};

export async function createAdminUser(input: {
  insurerName: string;
  username: string;
  password: string;
}) {
  const baseUrl = await resolveApiBaseUrl();
  const response = await fetch(`${baseUrl}/auth/users`, {
    method: "POST",
    headers: getAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ ...input, role: "admin" }),
  });
  const payload = await parseJsonResponse<{ user: AdminUserRecord }>(response);
  return payload.user;
}
