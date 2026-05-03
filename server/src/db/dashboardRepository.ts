import { randomUUID } from "node:crypto";
import type {
  DashboardActivityItem,
  DashboardClaimRecord,
  DashboardSearchRecord,
  DashboardStats,
} from "../types/domain.ts";
import {
  mutateDashboardDatabase,
  readDashboardDatabase,
} from "./dashboardFileStore.ts";
import { getDeviceWithClaims } from "./claimRepository.ts";

const SEARCH_DEDUP_WINDOW_MS = 4 * 60 * 1000;

function now() {
  return new Date().toISOString();
}

function toDashboardActivityItem(
  record: DashboardClaimRecord | DashboardSearchRecord
): DashboardActivityItem {
  if ("claimAmount" in record) {
    return {
      id: record.id,
      type: "claim",
      imei: record.imei,
      timestamp: record.createdAt,
      insurer_id: record.insurerId,
      user_id: record.userId,
      claim_amount: record.claimAmount,
      status: record.status,
    };
  }

  return {
    id: record.id,
    type: "search",
    imei: record.imei,
    timestamp: record.searchedAt,
    insurer_id: record.insurerId,
    user_id: record.userId,
    result_found: record.resultFound,
  };
}

function shouldRecordSearchByTimestamp(lastSearchedAt: string | null | undefined) {
  if (!lastSearchedAt) {
    return true;
  }

  const lastSearchTime = new Date(lastSearchedAt).getTime();
  if (!Number.isFinite(lastSearchTime)) {
    return true;
  }

  return Date.now() - lastSearchTime >= SEARCH_DEDUP_WINDOW_MS;
}

export async function createDashboardClaim(input: {
  imei: string;
  claimAmount: number;
  status: string;
  insurerId: string;
  userId: string;
}) {
  const normalizedImei = input.imei.trim();
  const createdAt = now();

  return mutateDashboardDatabase(
    { insurerId: input.insurerId, userId: input.userId },
    (db) => {
      const record: DashboardClaimRecord = {
        id: randomUUID(),
        imei: normalizedImei,
        claimAmount: input.claimAmount,
        status: input.status,
        createdAt,
        insurerId: input.insurerId,
        userId: input.userId,
      };

      db.claims.push(record);
      return record;
    }
  );
}

export async function createDashboardSearch(input: {
  imei: string;
  resultFound: boolean;
  insurerId: string;
  userId: string;
}) {
  const normalizedImei = input.imei.trim();
  const searchedAt = now();

  return mutateDashboardDatabase(
    { insurerId: input.insurerId, userId: input.userId },
    (db) => {
      const lastSearch = db.searches
        .filter((search) => search.imei === normalizedImei)
        .sort((left, right) => right.searchedAt.localeCompare(left.searchedAt))[0];

      if (!shouldRecordSearchByTimestamp(lastSearch?.searchedAt)) {
        return null;
      }

      const record: DashboardSearchRecord = {
        id: randomUUID(),
        imei: normalizedImei,
        searchedAt,
        resultFound: input.resultFound,
        insurerId: input.insurerId,
        userId: input.userId,
      };

      db.searches.push(record);
      return record;
    }
  );
}

export async function listDashboardClaims(insurerId: string, userId: string) {
  const db = await readDashboardDatabase({ insurerId, userId });
  return db.claims
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function listDashboardSearches(insurerId: string, userId: string) {
  const db = await readDashboardDatabase({ insurerId, userId });
  return db.searches
    .slice()
    .sort((left, right) => right.searchedAt.localeCompare(left.searchedAt));
}

export async function getDashboardStats(
  insurerId: string,
  userId: string
): Promise<DashboardStats> {
  const [claims, searches] = await Promise.all([
    listDashboardClaims(insurerId, userId),
    listDashboardSearches(insurerId, userId),
  ]);

  const recentActivity = [...claims, ...searches]
    .map(toDashboardActivityItem)
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, 10);

  const imeis = Array.from(
    new Set(recentActivity.map((item) => item.imei.trim()).filter(Boolean))
  );
  const deviceNameByImei = new Map<string, string>();
  const matchedAmountByImei = new Map<string, number>();

  await Promise.all(
    imeis.map(async (imei) => {
      try {
        const result = await getDeviceWithClaims(imei);
        const deviceName = result.device?.deviceName?.trim();
        const estimatedMatchedAmount = result.claims.reduce(
          (highest, claim) => Math.max(highest, claim.claimAmount),
          0
        );

        if (deviceName) {
          deviceNameByImei.set(imei, deviceName);
        }

        if (estimatedMatchedAmount > 0) {
          matchedAmountByImei.set(imei, estimatedMatchedAmount);
        }
      } catch {
        // Ignore enrichment failures and preserve the base activity response.
      }
    })
  );

  const enrichedRecentActivity = recentActivity.map((item) => ({
    ...item,
    device_name: deviceNameByImei.get(item.imei) ?? item.imei,
    claim_amount:
      item.type === "search" && item.result_found
        ? Number(matchedAmountByImei.get(item.imei) ?? item.claim_amount ?? 0)
        : item.claim_amount,
  }));

  const uniqueMatchedImeis = new Set(
    searches
      .filter((search) => search.resultFound)
      .map((search) => search.imei.trim())
      .filter(Boolean)
  );

  const claimValue = Array.from(uniqueMatchedImeis).reduce(
    (sum, imei) => sum + (matchedAmountByImei.get(imei) ?? 0),
    0
  );

  return {
    total_claims: claims.length,
    total_searches: searches.length,
    rejected_claims: uniqueMatchedImeis.size,
    claim_value: claimValue,
    recent_activity: enrichedRecentActivity,
  };
}
