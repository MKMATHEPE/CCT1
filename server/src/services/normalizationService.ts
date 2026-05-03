import type { ClaimOutcome, NormalizedClaim } from "../types/domain.ts";

type AlphaResponse = Awaited<ReturnType<typeof import("../integrations/insurerClients.ts").fetchAlpha>>[number];
type BetaResponse = Awaited<ReturnType<typeof import("../integrations/insurerClients.ts").fetchBeta>>[number];

function normalizeOutcome(input: string | null | undefined): ClaimOutcome {
  const normalized = input?.trim().toUpperCase();

  switch (normalized) {
    case "APPROVED":
    case "ACCEPT":
    case "ACCEPTED":
      return "APPROVED";
    case "REJECTED":
    case "REJECT":
    case "DECLINED":
      return "REJECTED";
    default:
      return "PENDING";
  }
}

function normalizeAmount(input: number | string | null | undefined): number {
  if (typeof input === "number") {
    return Number.isFinite(input) ? input : 0;
  }

  if (!input) return 0;

  const normalized = input.replace(/[^\d.-]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeDate(input: string | null | undefined): string | null {
  if (!input) return null;
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function normalizeAlphaClaim(record: AlphaResponse): NormalizedClaim {
  return {
    externalId: record.meta.ref,
    imei: record.handset.imei,
    deviceName: record.handset.name || "Unknown Device",
    brand: record.handset.brand ?? null,
    deviceType: record.handset.category ?? null,
    outcome: normalizeOutcome(record.payout.status),
    claimAmount: normalizeAmount(record.payout.amount),
    dateOfLoss: normalizeDate(record.loss.happenedOn),
    reason: record.loss.note ?? null,
    insurer: record.meta.provider || "Alpha Insurance",
    source: "alpha-api",
  };
}

export function normalizeBetaClaim(record: BetaResponse): NormalizedClaim {
  const brand = record.manufacturer?.trim() || null;
  const model = record.modelName?.trim() || "Unknown Device";

  return {
    externalId: record.claimId,
    imei: record.deviceIdentifier,
    deviceName: [brand, model].filter(Boolean).join(" ") || model,
    brand,
    deviceType: record.type ?? null,
    outcome: normalizeOutcome(record.decision),
    claimAmount: normalizeAmount(record.settlement),
    dateOfLoss: normalizeDate(record.occurredAt),
    reason: record.description ?? null,
    insurer: record.insurerName || "Beta Assurance",
    source: "beta-api",
  };
}

export function makeClaimFingerprint(claim: Omit<NormalizedClaim, "deviceName" | "brand" | "deviceType">) {
  return [
    claim.imei.trim(),
    claim.outcome,
    claim.claimAmount.toFixed(2),
    claim.dateOfLoss ?? "",
    claim.reason?.trim().toLowerCase() ?? "",
    claim.insurer.trim().toLowerCase(),
    claim.source.trim().toLowerCase(),
  ].join("|");
}
