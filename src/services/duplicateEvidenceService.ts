import { getClaimEvents } from "./claimDeviceService";
import { getClaims } from "./deviceDataService";

export type DuplicateEvidenceClaim = {
  id: string;
  insurer: string;
  outcome: string;
  recordedAtUtc: string;
  imei?: string;
  brand?: string;
  model?: string;
};

export type DuplicateEvidenceContext = {
  source: "DUPLICATE_DEVICE_DETECTION";
  serial: string;
  imei?: string;
  brand?: string;
  model?: string;
  claimCount: number;
  insurers: string[];
  outcomes: string[];
  crossInsurer: boolean;
  claims: DuplicateEvidenceClaim[];
};

export function getDuplicateEvidenceContext(
  serial: string
): DuplicateEvidenceContext | null {
  const trimmed = serial.trim();
  if (!trimmed) return null;

  const legacyClaims = getClaims()
    .filter((claim) => claim.serial === trimmed)
    .map((claim) => ({
      id: `claim-${claim.id}`,
      insurer: "Unknown",
      outcome: mapLegacyOutcome(claim.outcome),
      recordedAtUtc: claim.timestamp,
      imei: claim.imei,
      brand: claim.brand,
      model: claim.model,
    }));

  const eventClaims = getClaimEvents()
    .filter((event) => event.serial === trimmed)
    .map((event) => ({
      id: event.id,
      insurer: event.insurer ?? "Unknown",
      outcome: event.outcome ?? "Unknown",
      recordedAtUtc: event.createdAtUtc,
      imei: event.imei,
      brand: event.brand,
      model: event.model,
    }));

  const claims = [...legacyClaims, ...eventClaims].sort(
    (a, b) =>
      new Date(b.recordedAtUtc).getTime() -
      new Date(a.recordedAtUtc).getTime()
  );

  if (claims.length === 0) return null;

  const insurers = Array.from(
    new Set(claims.map((claim) => claim.insurer))
  );
  const outcomes = Array.from(
    new Set(claims.map((claim) => claim.outcome))
  );

  const primary = claims[0];

  return {
    source: "DUPLICATE_DEVICE_DETECTION",
    serial: trimmed,
    imei: primary.imei,
    brand: primary.brand,
    model: primary.model,
    claimCount: claims.length,
    insurers,
    outcomes,
    crossInsurer: insurers.length > 1,
    claims,
  };
}

function mapLegacyOutcome(
  outcome: "approved" | "rejected" | "pending"
): string {
  if (outcome === "rejected") return "REJECTED";
  if (outcome === "approved") return "PAID_PARTIAL";
  return "PAID_PARTIAL";
}
