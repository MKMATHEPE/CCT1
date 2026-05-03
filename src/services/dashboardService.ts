import { useEffect, useState } from "react";
import type { User } from "../auth/authContext";
import { getStoredSessionUser } from "../auth/sessionUser";
import {
  getAuthenticatedApiHeaders,
  mapFetchError,
  parseJsonResponse,
  resolveApiBaseUrl,
} from "./apiClient";

export type DashboardClaim = {
  id: string;
  imei: string;
  claimAmount: number;
  status: string;
  createdAt: string;
  insurerId: string;
  userId: string;
};

export type DashboardSearch = {
  id: string;
  imei: string;
  searchedAt: string;
  resultFound: boolean;
  insurerId: string;
  userId: string;
};

export type DashboardActivity = {
  id: string;
  type: "claim" | "search";
  imei: string;
  deviceName?: string;
  timestamp: string;
  insurerId: string;
  userId: string;
  claimAmount?: number;
  status?: string;
  resultFound?: boolean;
};

export type DashboardStats = {
  totalClaims: number;
  totalSearches: number;
  rejectedClaims: number;
  claimValue: number;
  recentActivity: DashboardActivity[];
};

type DashboardState = {
  claims: DashboardClaim[];
  searches: DashboardSearch[];
  stats: DashboardStats | null;
  insurerName: string;
  isLoading: boolean;
  error: string | null;
};

export async function fetchDashboardDataForUser(
  user: Pick<User, "id" | "role" | "insurerId" | "insurerName"> | null | undefined,
  options?: { scoped?: boolean }
) {
  const baseUrl = await resolveApiBaseUrl();
  const headers = getAuthenticatedApiHeaders();
  const scopeParams = options?.scoped && user
    ? `?scopeUserId=${encodeURIComponent(user.id)}&scopeInsurerId=${encodeURIComponent(
        user.insurerId
      )}`
    : "";
  const [claimsResponse, searchesResponse, statsResponse] = await Promise.all([
    fetch(`${baseUrl}/dashboard/claims${scopeParams}`, { headers }),
    fetch(`${baseUrl}/dashboard/searches${scopeParams}`, { headers }),
    fetch(`${baseUrl}/dashboard/stats${scopeParams}`, { headers }),
  ]);

  const [claimsPayload, searchesPayload, statsPayload] = await Promise.all([
    parseJsonResponse<{
      claims: Array<{
        id: string;
        imei: string;
        claim_amount: number;
        status: string;
        created_at: string;
        insurer_id: string;
        user_id: string;
      }>;
    }>(claimsResponse),
    parseJsonResponse<{
      searches: Array<{
        id: string;
        imei: string;
        searched_at: string;
        result_found: boolean;
        insurer_id: string;
        user_id: string;
      }>;
    }>(searchesResponse),
    parseJsonResponse<{
      total_claims: number;
      total_searches: number;
      rejected_claims: number;
      claim_value: number;
      recent_activity: Array<{
        id: string;
        type: "claim" | "search";
        imei: string;
        device_name?: string;
        timestamp: string;
        insurer_id: string;
        user_id: string;
        claim_amount?: number;
        status?: string;
        result_found?: boolean;
      }>;
    }>(statsResponse),
  ]);

  return {
    claims: claimsPayload.claims.map(mapDashboardClaim),
    searches: searchesPayload.searches.map(mapDashboardSearch),
    stats: mapDashboardStats(statsPayload),
    insurerName: user?.insurerName ?? "Current insurer",
  };
}

function mapDashboardClaim(row: {
  id: string;
  imei: string;
  claim_amount: number;
  status: string;
  created_at: string;
  insurer_id: string;
  user_id: string;
}): DashboardClaim {
  return {
    id: row.id,
    imei: row.imei,
    claimAmount: row.claim_amount,
    status: row.status,
    createdAt: row.created_at,
    insurerId: row.insurer_id,
    userId: row.user_id,
  };
}

function mapDashboardSearch(row: {
  id: string;
  imei: string;
  searched_at: string;
  result_found: boolean;
  insurer_id: string;
  user_id: string;
}): DashboardSearch {
  return {
    id: row.id,
    imei: row.imei,
    searchedAt: row.searched_at,
    resultFound: row.result_found,
    insurerId: row.insurer_id,
    userId: row.user_id,
  };
}

function mapDashboardStats(payload: {
  total_claims: number;
  total_searches: number;
  rejected_claims: number;
  claim_value: number;
  recent_activity: Array<{
    id: string;
    type: "claim" | "search";
    imei: string;
    device_name?: string;
    timestamp: string;
    insurer_id: string;
    user_id: string;
    claim_amount?: number;
    status?: string;
    result_found?: boolean;
  }>;
}): DashboardStats {
  return {
    totalClaims: payload.total_claims,
    totalSearches: payload.total_searches,
    rejectedClaims: payload.rejected_claims,
    claimValue: payload.claim_value,
    recentActivity: payload.recent_activity.map((item) => ({
      id: item.id,
      type: item.type,
      imei: item.imei,
      deviceName: item.device_name,
      timestamp: item.timestamp,
      insurerId: item.insurer_id,
      userId: item.user_id,
      claimAmount: item.claim_amount,
      status: item.status,
      resultFound: item.result_found,
    })),
  };
}

export function useDashboardData(): DashboardState {
  const [state, setState] = useState<DashboardState>(() => ({
    claims: [],
    searches: [],
    stats: null,
    insurerName: getStoredSessionUser()?.insurerName ?? "Current insurer",
    isLoading: true,
    error: null,
  }));

  useEffect(() => {
    let isActive = true;
    // Read from sessionStorage inside the effect so the object reference
    // never becomes a dependency — getStoredSessionUser() returns a fresh
    // object on every call (JSON.parse), which would re-trigger the effect
    // on every render if used as a dep.
    const sessionUser = getStoredSessionUser();

    async function loadDashboardData() {
      try {
        const payload = await fetchDashboardDataForUser(sessionUser);

        if (!isActive) {
          return;
        }

        setState({
          claims: payload.claims,
          searches: payload.searches,
          stats: payload.stats,
          insurerName: payload.insurerName,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setState((current) => ({
          ...current,
          isLoading: false,
          error: mapFetchError(error, "load dashboard data").message,
        }));
      }
    }

    void loadDashboardData();

    return () => {
      isActive = false;
    };
  }, []); // intentionally empty — auth changes cause a full remount via the auth context

  return state;
}

export function useDashboardDataForUser(
  user: Pick<User, "id" | "role" | "insurerId" | "insurerName"> | null
): DashboardState {
  // Stable primitive deps so that a new object reference for the same user
  // (common when the caller derives the object from context/state) does not
  // re-trigger the effect and cause an infinite fetch loop.
  const userId = user?.id ?? null;
  const insurerId = user?.insurerId ?? null;

  const [state, setState] = useState<DashboardState>({
    claims: [],
    searches: [],
    stats: null,
    insurerName: user?.insurerName ?? "Current insurer",
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isActive = true;

    async function loadDashboardData() {
      if (!user) {
        setState({
          claims: [],
          searches: [],
          stats: null,
          insurerName: "Current insurer",
          isLoading: false,
          error: null,
        });
        return;
      }

      try {
        const payload = await fetchDashboardDataForUser(user, {
          scoped: true,
        });

        if (!isActive) {
          return;
        }

        setState({
          claims: payload.claims,
          searches: payload.searches,
          stats: payload.stats,
          insurerName: payload.insurerName,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setState((current) => ({
          ...current,
          isLoading: false,
          error: mapFetchError(error, "load dashboard data").message,
        }));
      }
    }

    void loadDashboardData();

    return () => {
      isActive = false;
    };
  }, [userId, insurerId]); // primitive deps — stable even when the caller recreates the object

  return state;
}
