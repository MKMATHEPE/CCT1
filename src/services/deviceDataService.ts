import { useEffect, useSyncExternalStore } from "react";
import {
  getAuthenticatedApiHeaders,
  mapFetchError,
  parseJsonResponse,
  resolveApiBaseUrl,
} from "./apiClient";

export type ClaimOutcome = "approved" | "rejected" | "pending";

export type Claim = {
  id: string;
  imei: string;
  serial: string;
  brand: string;
  model: string;
  amount: number;
  outcome: ClaimOutcome;
  timestamp: string;
  insurer?: string;
  reason?: string;
  dateOfLoss?: string;
  source?: string;
};

export type PreventedClaimSearchMode =
  | "imei"
  | "serial"
  | "identifier"
  | "policy"
  | "claim";

export type PreventedClaimEvent = {
  id: number;
  query: string;
  mode: PreventedClaimSearchMode;
  timestamp: string;
  matchedClaims: number;
  estimatedAmount: number;
};

export type DeviceRow = {
  device: string;
  imei: string;
  claimsCount: number;
  status: "Clean" | "Duplicate" | "Pending";
  lastActivity: string;
};

export type AuditAction =
  | "SEARCH"
  | "VIEW_DEVICE"
  | "RECORD_CLAIM"
  | "AUTO_REJECT";

export type AuditLogEntry = {
  id: number;
  action: AuditAction;
  details: string;
  timestamp: string;
};

export type NewClaimInput = {
  deviceName: string;
  imei: string;
  serial: string;
  insurer: string;
  outcome?: ClaimOutcome;
  dateOfLoss: string;
  reason: string;
  amount: number;
};

export type BulkClaimSubmitResult = {
  processed: number;
  duplicates: number;
  skipped: number;
  processedRows: number[];
  errors: Array<{
    row: number;
    reason: string;
  }>;
};

type ApiClaimRow = {
  id: string;
  device_id: string;
  imei_serial: string;
  serial_number: string | null;
  device_name: string;
  brand: string | null;
  device_type: string | null;
  date_of_loss: string | null;
  claim_amount: number;
  outcome: "APPROVED" | "REJECTED" | "PENDING";
  reason: string | null;
  insurer: string;
  source: string;
  external_id: string | null;
  created_at: string;
  last_fetched_at: string | null;
};

type SearchApiResponse = {
  device: {
    imei: string;
    serial_number: string | null;
    device_name: string;
  };
  claims: Array<{
    id: string;
    date_of_loss: string | null;
    claim_amount: number;
    outcome: "APPROVED" | "REJECTED" | "PENDING";
    reason: string | null;
    insurer: string;
    source: string;
  }>;
};

type StoreState = {
  claims: Claim[];
  preventedClaimEvents: PreventedClaimEvent[];
  auditLog: AuditLogEntry[];
  isLoading: boolean;
  initialized: boolean;
  error: string | null;
};

const initialState: StoreState = {
  claims: [],
  preventedClaimEvents: [],
  auditLog: [],
  isLoading: false,
  initialized: false,
  error: null,
};

let state = initialState;
let loadClaimsPromise: Promise<Claim[]> | null = null;
const listeners = new Set<() => void>();
const SESSION_CLAIM_VALUE_KEY = "cct:session-claim-value-by-imei";

function loadSessionClaimValueByImei() {
  if (typeof window === "undefined") {
    return new Map<string, number>();
  }

  try {
    const raw = window.sessionStorage.getItem(SESSION_CLAIM_VALUE_KEY);
    if (!raw) {
      return new Map<string, number>();
    }

    return new Map<string, number>(
      Object.entries(JSON.parse(raw) as Record<string, number>)
    );
  } catch {
    return new Map<string, number>();
  }
}

const sessionClaimValueByImei = loadSessionClaimValueByImei();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setState(updater: (current: StoreState) => StoreState) {
  state = updater(state);
  emit();
}

function getState() {
  return state;
}

function persistSessionClaimValueByImei() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      SESSION_CLAIM_VALUE_KEY,
      JSON.stringify(Object.fromEntries(sessionClaimValueByImei.entries()))
    );
  } catch {
    // Ignore session storage failures and keep in-memory behavior.
  }
}

function outcomeFromApi(outcome: "APPROVED" | "REJECTED" | "PENDING"): ClaimOutcome {
  if (outcome === "APPROVED") return "approved";
  if (outcome === "REJECTED") return "rejected";
  return "pending";
}

function splitDeviceName(deviceName: string, fallbackBrand?: string | null) {
  const trimmed = deviceName.trim();
  if (!trimmed) {
    return {
      brand: fallbackBrand?.trim() || "Unknown",
      model: "Unknown",
    };
  }

  const [brandPart, ...modelParts] = trimmed.split(/\s+/);
  return {
    brand: fallbackBrand?.trim() || brandPart || "Unknown",
    model: modelParts.join(" ") || (fallbackBrand ? trimmed : "Unknown"),
  };
}

function mapApiClaim(row: ApiClaimRow): Claim {
  const nameParts = splitDeviceName(row.device_name, row.brand);
  return {
    id: row.id,
    imei: row.imei_serial,
    serial: row.serial_number ?? "",
    brand: row.brand ?? nameParts.brand,
    model: row.brand ? row.device_name.replace(new RegExp(`^${row.brand}\\s*`), "").trim() || nameParts.model : nameParts.model,
    amount: row.claim_amount,
    outcome: outcomeFromApi(row.outcome),
    timestamp: row.created_at,
    insurer: row.insurer,
    reason: row.reason ?? undefined,
    dateOfLoss: row.date_of_loss ?? undefined,
    source: row.source,
  };
}

function mergeClaims(incoming: Claim[]) {
  const merged = new Map(state.claims.map((claim) => [claim.id, claim]));
  incoming.forEach((claim) => {
    merged.set(claim.id, claim);
  });

  setState((current) => ({
    ...current,
    claims: Array.from(merged.values()).sort(
      (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
    ),
    initialized: true,
    error: null,
  }));
}

function logAudit(action: AuditAction, details: string) {
  setState((current) => ({
    ...current,
    auditLog: [
      {
        id: current.auditLog.length + 1,
        action,
        details,
        timestamp: new Date().toISOString(),
      },
      ...current.auditLog,
    ],
  }));
}

export async function loadClaims(force = false): Promise<Claim[]> {
  if (!force && loadClaimsPromise) {
    return loadClaimsPromise;
  }

  if (!force && state.initialized) {
    return state.claims;
  }

  setState((current) => ({
    ...current,
    isLoading: true,
    error: null,
  }));

  loadClaimsPromise = resolveApiBaseUrl()
    .then((baseUrl) =>
      fetch(`${baseUrl}/api/claims`, {
        headers: getAuthenticatedApiHeaders(),
      })
    )
    .then((response) => parseJsonResponse<{ claims: ApiClaimRow[] }>(response))
    .then((payload) => {
      const claims = payload.claims.map(mapApiClaim);
      setState((current) => ({
        ...current,
        claims,
        initialized: true,
        isLoading: false,
        error: null,
      }));
      return claims;
    })
    .catch((error: unknown) => {
      const mappedError = mapFetchError(error, "load claims");
      const message = mappedError.message;
      setState((current) => ({
        ...current,
        isLoading: false,
        initialized: true,
        error: message,
      }));
      throw mappedError;
    })
    .finally(() => {
      loadClaimsPromise = null;
    });

  return loadClaimsPromise;
}

export async function refreshClaims() {
  return loadClaims(true);
}

export async function ensureApiAvailable() {
  try {
    const baseUrl = await resolveApiBaseUrl();
    const response = await fetch(`${baseUrl}/health`);
    await parseJsonResponse<{ ok: boolean }>(response);
  } catch (error) {
    throw mapFetchError(error, "reach the import API");
  }
}

export function useDeviceData() {
  const snapshot = useSyncExternalStore(subscribe, getState, getState);

  useEffect(() => {
    if (!snapshot.initialized && !snapshot.isLoading) {
      void loadClaims().catch(() => undefined);
    }
  }, [snapshot.initialized, snapshot.isLoading]);

  return snapshot;
}

export function getAuditLogSnapshot(): AuditLogEntry[] {
  return [...state.auditLog];
}

export function getClaims(): Claim[] {
  return [...state.claims];
}

export function getPreventedClaimEvents(): PreventedClaimEvent[] {
  return [...state.preventedClaimEvents];
}

export function getClaimsGroupedByIMEI(): Record<string, Claim[]> {
  return state.claims.reduce<Record<string, Claim[]>>((groups, claim) => {
    if (!groups[claim.imei]) {
      groups[claim.imei] = [];
    }
    groups[claim.imei].push(claim);
    return groups;
  }, {});
}

export function getClaimsByIMEI(imei: string): Claim[] {
  logAudit("VIEW_DEVICE", `Viewed claims for IMEI ${imei}`);

  return state.claims
    .filter((claim) => claim.imei === imei)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function getDeviceRows(): DeviceRow[] {
  const groups = getClaimsGroupedByIMEI();

  return Object.entries(groups).map(([imei, imeiClaims]) => {
    const sorted = [...imeiClaims].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const latest = sorted[0];

    let status: DeviceRow["status"] = "Clean";
    if (imeiClaims.length > 1) {
      status = "Duplicate";
    } else if (latest.outcome === "pending") {
      status = "Pending";
    }

    return {
      device: `${latest.brand} ${latest.model}`.trim(),
      imei,
      claimsCount: imeiClaims.length,
      status,
      lastActivity: formatTimeAgo(latest.timestamp),
    };
  });
}

export function getStats() {
  const grouped = getClaimsGroupedByIMEI();
  const preventedSearchValue = state.preventedClaimEvents.reduce(
    (sum, event) => sum + event.estimatedAmount,
    0
  );

  const totalClaims = state.claims.length;
  const duplicateDevices = Object.values(grouped).filter((group) => group.length > 1).length;
  const rejectedClaims = state.claims.filter((claim) => claim.outcome === "rejected").length;
  const fraudPrevented = state.claims
    .filter((claim) => claim.outcome === "rejected")
    .reduce((sum, claim) => sum + claim.amount, 0);

  return {
    totalClaims,
    duplicateDevices,
    rejectedClaims,
    fraudPrevented: fraudPrevented + preventedSearchValue,
  };
}

export function findDeviceByQuery(query: string): string | null {
  const normalized = query.trim();
  if (!normalized) return null;

  logAudit("SEARCH", `Search performed: ${normalized}`);

  const imeiMatch = state.claims.find((claim) => claim.imei === normalized);
  if (imeiMatch) return imeiMatch.imei;

  const serialMatch = state.claims.find((claim) => claim.serial === normalized);
  if (serialMatch) return serialMatch.imei;

  return null;
}

export function recordPreventedClaimEvent(input: {
  query: string;
  mode: PreventedClaimSearchMode;
  matchedClaims: Claim[];
}): PreventedClaimEvent {
  const estimatedAmount = input.matchedClaims.reduce(
    (highest, claim) => Math.max(highest, claim.amount),
    0
  );

  const event: PreventedClaimEvent = {
    id: state.preventedClaimEvents.length + 1,
    query: input.query.trim(),
    mode: input.mode,
    timestamp: new Date().toISOString(),
    matchedClaims: input.matchedClaims.length,
    estimatedAmount,
  };

  setState((current) => ({
    ...current,
    preventedClaimEvents: [event, ...current.preventedClaimEvents],
  }));

  const highestAmountByImei = new Map<string, number>();
  input.matchedClaims.forEach((claim) => {
    const imei = claim.imei.trim();
    if (!imei) {
      return;
    }

    highestAmountByImei.set(
      imei,
      Math.max(highestAmountByImei.get(imei) ?? 0, claim.amount)
    );
  });

  highestAmountByImei.forEach((amount, imei) => {
    if (!sessionClaimValueByImei.has(imei)) {
      sessionClaimValueByImei.set(imei, amount);
    }
  });
  persistSessionClaimValueByImei();

  logAudit("AUTO_REJECT", `Prevented claim recorded for ${input.mode} search ${event.query}`);
  return event;
}

export function getSessionSavedClaimValueTotal() {
  return Array.from(sessionClaimValueByImei.values()).reduce(
    (sum, value) => sum + value,
    0
  );
}

export function getSessionRejectedClaimCount() {
  return sessionClaimValueByImei.size;
}

export async function searchDeviceClaims(
  mode: Exclude<PreventedClaimSearchMode, "policy" | "claim">,
  query: string
): Promise<Claim[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  logAudit("SEARCH", `Search performed: ${trimmed}`);

  const performSearch = async (searchMode: "imei" | "serial") => {
    const baseUrl = await resolveApiBaseUrl();
    let response: Response;
    try {
      response = await fetch(
        `${baseUrl}/api/search?mode=${encodeURIComponent(searchMode)}&query=${encodeURIComponent(trimmed)}`,
        {
          headers: getAuthenticatedApiHeaders(),
        }
      );
    } catch (error) {
      throw mapFetchError(error, "search claims");
    }
    const payload = await parseJsonResponse<SearchApiResponse>(response);
    const deviceParts = splitDeviceName(payload.device.device_name);
    const claims = payload.claims.map<Claim>((claim) => ({
      id: claim.id,
      imei: payload.device.imei,
      serial: payload.device.serial_number ?? "",
      brand: deviceParts.brand,
      model: deviceParts.model,
      amount: claim.claim_amount,
      outcome: outcomeFromApi(claim.outcome),
      timestamp: claim.date_of_loss ?? new Date().toISOString(),
      insurer: claim.insurer,
      reason: claim.reason ?? undefined,
      dateOfLoss: claim.date_of_loss ?? undefined,
      source: claim.source,
    }));
    mergeClaims(claims);
    return claims;
  };

  if (mode === "identifier") {
    const imeiResults = await performSearch("imei");
    if (imeiResults.length > 0) {
      return imeiResults;
    }
    return performSearch("serial");
  }

  return performSearch(mode);
}

export async function recordClaim(input: NewClaimInput): Promise<Claim> {
  const primaryIdentifier = input.imei.trim() || input.serial.trim();
  const normalizedOutcome =
    input.outcome ??
    (state.claims.some(
      (claim) =>
        (input.imei.trim() && claim.imei === input.imei.trim()) ||
        (input.serial.trim() && claim.serial === input.serial.trim())
    )
      ? "rejected"
      : "approved");

  let response: Response;
  try {
    const baseUrl = await resolveApiBaseUrl();
    response = await fetch(`${baseUrl}/api/claims`, {
      method: "POST",
      headers: {
        ...getAuthenticatedApiHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        insurer: input.insurer,
        deviceName: input.deviceName,
        imei: input.imei,
        serial: input.serial,
        dateOfLoss: input.dateOfLoss,
        reason: input.reason,
        amount: input.amount,
        outcome: normalizedOutcome,
      }),
    });
  } catch (error) {
    throw mapFetchError(error, "record a claim");
  }

  const payload = await parseJsonResponse<{ success: true; claim: ApiClaimRow }>(response);
  const claim = mapApiClaim(payload.claim);

  logAudit(
    "RECORD_CLAIM",
    `Claim recorded for identifier ${primaryIdentifier} (${claim.outcome})`
  );
  if (!input.outcome && claim.outcome === "rejected") {
    logAudit(
      "AUTO_REJECT",
      `Duplicate identifier detected: ${primaryIdentifier}`
    );
  }

  return claim;
}

export async function submitBulkClaims(
  inputs: NewClaimInput[]
): Promise<BulkClaimSubmitResult> {
  let response: Response;
  try {
    const baseUrl = await resolveApiBaseUrl();
    response = await fetch(`${baseUrl}/api/claims/bulk`, {
      method: "POST",
      headers: {
        ...getAuthenticatedApiHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        claims: inputs.map((input) => ({
          insurer: input.insurer,
          deviceName: input.deviceName,
          imei: input.imei,
          serial: input.serial,
          dateOfLoss: input.dateOfLoss,
          reason: input.reason,
          amount: input.amount,
          outcome: input.outcome ?? "pending",
        })),
      }),
    });
  } catch (error) {
    throw mapFetchError(error, "submit claims in bulk");
  }

  const payload = await parseJsonResponse<
    { success: true } & BulkClaimSubmitResult
  >(response);

  return {
    processed: payload.processed,
    duplicates: payload.duplicates,
    skipped: payload.skipped,
    processedRows: payload.processedRows,
    errors: payload.errors,
  };
}

export function useClaims() {
  return useDeviceData().claims;
}

function formatTimeAgo(timestamp: string): string {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} mins ago`;

  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours > 1 ? "s" : ""} ago`;
}
