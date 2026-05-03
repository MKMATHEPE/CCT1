import type { NormalizedClaim } from "../types/domain.ts";

const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000;
const HIGH_VALUE_THRESHOLD = 10000;

function normalizeDate(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isHighRisk(claim: NormalizedClaim, existingClaims: NormalizedClaim[]): boolean {
  if (claim.claimAmount > HIGH_VALUE_THRESHOLD) {
    return true;
  }

  const claimDate = normalizeDate(claim.dateOfLoss);

  if (claimDate) {
    const recentClaims = existingClaims.filter((existingClaim) => {
      const existingDate = normalizeDate(existingClaim.dateOfLoss);

      if (!existingDate) {
        return false;
      }

      return Math.abs(claimDate.getTime() - existingDate.getTime()) <= THIRTY_DAYS_IN_MS;
    });

    if (recentClaims.length >= 1) {
      return true;
    }
  }

  const insurersForDevice = new Set(
    existingClaims
      .filter((existingClaim) => existingClaim.imei.trim() === claim.imei.trim())
      .map((existingClaim) => existingClaim.insurer.trim().toLowerCase())
      .filter(Boolean)
  );

  insurersForDevice.add(claim.insurer.trim().toLowerCase());

  return insurersForDevice.size > 1;
}
