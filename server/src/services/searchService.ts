import { env } from "../config/env.ts";
import {
  claimExists,
  getDeviceWithClaims,
  saveClaim,
  upsertFetchedDevice,
} from "../db/claimRepository.ts";
import { fetchAlpha, fetchBeta } from "../integrations/insurerClients.ts";
import { logger } from "../lib/logger.ts";
import { HttpError } from "../lib/http.ts";
import { makeClaimFingerprint, normalizeAlphaClaim, normalizeBetaClaim } from "./normalizationService.ts";
import { isHighRisk } from "./riskEngine.ts";
import type { ClaimRecord, NormalizedClaim, SearchMode, SearchResponse } from "../types/domain.ts";

function isFresh(lastFetchedAt: string | null) {
  if (!lastFetchedAt) return false;
  const lastFetched = new Date(lastFetchedAt).getTime();
  const ttlMs = env.cacheTtlHours * 60 * 60 * 1000;
  return Date.now() - lastFetched < ttlMs;
}

function mapClaims(claims: ClaimRecord[]): SearchResponse["claims"] {
  return claims
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((claim) => ({
      id: claim.id,
      date_of_loss: claim.dateOfLoss,
      claim_amount: claim.claimAmount,
      outcome: claim.outcome,
      reason: claim.reason,
      insurer: claim.insurer,
      source: claim.source,
    }));
}

function toNormalizedExistingClaim(
  claim: ClaimRecord,
  device: {
    imeiSerial: string;
    deviceName: string;
    brand: string | null;
    deviceType: string | null;
  }
): NormalizedClaim {
  return {
    externalId: claim.externalId,
    imei: device.imeiSerial,
    deviceName: device.deviceName,
    brand: device.brand,
    deviceType: device.deviceType,
    outcome: claim.outcome,
    claimAmount: claim.claimAmount,
    dateOfLoss: claim.dateOfLoss,
    reason: claim.reason,
    insurer: claim.insurer,
    source: claim.source,
  };
}

function sameDate(left: string | null, right: string | null) {
  if (!left || !right) {
    return false;
  }

  return left.slice(0, 10) === right.slice(0, 10);
}

function isNewClaimForDevice(claim: NormalizedClaim, existingClaims: NormalizedClaim[]): boolean {
  return !existingClaims.some(
    (existingClaim) =>
      existingClaim.imei.trim() === claim.imei.trim() && sameDate(existingClaim.dateOfLoss, claim.dateOfLoss)
  );
}

function mapNormalizedClaim(claim: NormalizedClaim): SearchResponse["claims"][number] {
  return {
    id: claim.externalId ?? makeClaimFingerprint(claim),
    date_of_loss: claim.dateOfLoss,
    claim_amount: claim.claimAmount,
    outcome: claim.outcome,
    reason: claim.reason,
    insurer: claim.insurer,
    source: claim.source,
  };
}

function toResponseDedupeKey(claim: {
  date_of_loss: string | null;
  claim_amount: number;
  outcome: SearchResponse["claims"][number]["outcome"];
  reason: string | null;
  insurer: string;
  source: string;
}) {
  return [
    claim.insurer.trim().toLowerCase(),
    claim.date_of_loss ?? "",
    claim.claim_amount.toFixed(2),
    claim.outcome,
    claim.reason?.trim().toLowerCase() ?? "",
    claim.source.trim().toLowerCase(),
  ].join("|");
}

function mergeClaimsForResponse(
  storedClaims: ClaimRecord[],
  externalClaims: NormalizedClaim[]
): SearchResponse["claims"] {
  const merged = new Map<string, SearchResponse["claims"][number]>();

  for (const claim of storedClaims) {
    const mappedClaim = {
      id: claim.id,
      date_of_loss: claim.dateOfLoss,
      claim_amount: claim.claimAmount,
      outcome: claim.outcome,
      reason: claim.reason,
      insurer: claim.insurer,
      source: claim.source,
    };

    merged.set(toResponseDedupeKey(mappedClaim), mappedClaim);
  }

  for (const claim of externalClaims) {
    const mappedClaim = mapNormalizedClaim(claim);
    const key = toResponseDedupeKey(mappedClaim);

    if (!merged.has(key)) {
      merged.set(key, mappedClaim);
    }
  }

  return Array.from(merged.values()).sort((left, right) =>
    (right.date_of_loss ?? "").localeCompare(left.date_of_loss ?? "")
  );
}

export async function searchClaims(mode: SearchMode, query: string): Promise<SearchResponse> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    throw new HttpError(400, "Missing query parameter");
  }

  if (!["imei", "serial"].includes(mode)) {
    throw new HttpError(400, "Unsupported search mode");
  }

  const cached = await getDeviceWithClaims(normalizedQuery);

  if (cached.device && isFresh(cached.device.lastFetchedAt)) {
    logger.info("search_cache_hit", {
      mode,
      query: normalizedQuery,
      claimCount: cached.claims.length,
      lastFetchedAt: cached.device.lastFetchedAt,
    });

    return {
      device: {
        imei: cached.device.imeiSerial,
        serial_number: cached.device.serialNumber,
        device_name: cached.device.deviceName,
      },
      claims: mapClaims(cached.claims),
    };
  }

  logger.info("search_cache_miss", { mode, query: normalizedQuery });
  logger.info("external_api_call_started", { query: normalizedQuery, providers: ["alpha-api", "beta-api"] });

  const [alphaRecords, betaRecords] = await Promise.all([
    fetchAlpha(normalizedQuery),
    fetchBeta(normalizedQuery),
  ]);

  const normalizedClaims = [
    ...alphaRecords.map(normalizeAlphaClaim),
    ...betaRecords.map(normalizeBetaClaim),
  ];

  if (normalizedClaims.length === 0) {
    logger.info("external_api_no_match", {
      mode,
      query: normalizedQuery,
    });

    if (cached.device) {
      logger.info("search_returning_cached_claims", {
        mode,
        query: normalizedQuery,
        claimCount: cached.claims.length,
        lastFetchedAt: cached.device.lastFetchedAt,
      });

      return {
        device: {
          imei: cached.device.imeiSerial,
          serial_number: cached.device.serialNumber,
          device_name: cached.device.deviceName,
        },
        claims: mapClaims(cached.claims),
      };
    }

    return {
      device: {
        imei: normalizedQuery,
        serial_number: mode === "serial" ? normalizedQuery : null,
        device_name: "Not Found",
      },
      claims: [],
    };
  }

  const deviceName =
    normalizedClaims.find((claim) => claim.deviceName.trim())?.deviceName ?? "Unknown Device";
  const brand = normalizedClaims.find((claim) => claim.brand)?.brand ?? null;
  const deviceType = normalizedClaims.find((claim) => claim.deviceType)?.deviceType ?? null;
  const lastFetchedAt = new Date().toISOString();

  const device = await upsertFetchedDevice({
    imeiSerial: normalizedQuery,
    deviceName,
    brand,
    deviceType,
    lastFetchedAt,
  });

  const existingNormalizedClaims = cached.claims.map((claim) =>
    toNormalizedExistingClaim(claim, {
      imeiSerial: device.imeiSerial,
      deviceName: device.deviceName,
      brand: device.brand,
      deviceType: device.deviceType,
    })
  );

  const persistedClaims: NormalizedClaim[] = [];
  let inserted = 0;

  for (const claim of normalizedClaims) {
    const exists = await claimExists(claim);

    if (exists) {
      console.log("Skipped duplicate:", claim);
      continue;
    }

    const comparableClaims = [...existingNormalizedClaims, ...persistedClaims];
    const highRisk = isHighRisk(claim, comparableClaims);

    if (highRisk) {
      console.log("High risk detected:", claim);
    }

    if (highRisk || isNewClaimForDevice(claim, comparableClaims)) {
      const stored = await saveClaim(claim);

      if (stored) {
        persistedClaims.push(claim);
        inserted += 1;
        console.log("New claim stored:", claim);
      } else {
        console.log("Skipped duplicate:", claim);
      }
    }
  }

  logger.info("external_api_call_completed", {
    query: normalizedQuery,
    fetchedClaims: normalizedClaims.length,
    insertedClaims: inserted,
  });

  const latest = await getDeviceWithClaims(normalizedQuery);

  return {
    device: {
      imei: device.imeiSerial,
      serial_number: device.serialNumber,
      device_name: device.deviceName,
    },
    claims: mergeClaimsForResponse(latest.claims, normalizedClaims),
  };
}
