import { randomUUID } from "node:crypto";
import { env } from "../config/env.ts";
import { supabase } from "../lib/supabase.ts";
import type {
  ClaimListItem,
  ClaimOutcome,
  ClaimRecord,
  DeviceRecord,
  NormalizedClaim,
} from "../types/domain.ts";
import { mutateDatabase, readDatabase } from "./fileStore.ts";
import { makeClaimFingerprint } from "../services/normalizationService.ts";

type DeviceRow = {
  id: string;
  imei_serial: string;
  serial_number?: string | null;
  device_name: string;
  brand: string | null;
  device_type: string | null;
  last_fetched_at: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ClaimRow = {
  id: string;
  device_id: string;
  external_id: string | null;
  date_of_loss: string | null;
  claim_amount: number;
  outcome: ClaimOutcome;
  reason: string | null;
  insurer: string;
  source: string;
  created_at: string;
  devices?: {
    id: string;
    imei_serial: string;
    serial_number?: string | null;
    device_name: string;
    brand: string | null;
    device_type: string | null;
    last_fetched_at: string | null;
  } | null;
};

type DeviceSelectResult = {
  data: DeviceRow | null;
  error: { message?: string } | null;
};

type DeviceSelectQuery = {
  maybeSingle(): PromiseLike<DeviceSelectResult>;
  single(): PromiseLike<DeviceSelectResult>;
};

const CLAIM_AMOUNT_TOLERANCE = 1;
let supportsSerialNumberColumn: boolean | null = null;

function now() {
  return new Date().toISOString();
}

function normalizeIdentifier(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function normalizeDateKey(value: string | null | undefined) {
  return value ? value.slice(0, 10) : null;
}

function isCloseAmount(left: number, right: number, tolerance = CLAIM_AMOUNT_TOLERANCE) {
  return Math.abs(left - right) <= tolerance;
}

function isDuplicateClaimMatch(left: Pick<NormalizedClaim, "dateOfLoss" | "claimAmount" | "insurer">, right: Pick<NormalizedClaim, "dateOfLoss" | "claimAmount" | "insurer">) {
  const leftDate = normalizeDateKey(left.dateOfLoss);
  const rightDate = normalizeDateKey(right.dateOfLoss);

  if (!leftDate || !rightDate) {
    return false;
  }

  return (
    left.insurer.trim().toLowerCase() === right.insurer.trim().toLowerCase() &&
    leftDate === rightDate &&
    isCloseAmount(left.claimAmount, right.claimAmount)
  );
}

function mapDeviceRow(row: DeviceRow): DeviceRecord {
  const fallbackTimestamp = row.last_fetched_at ?? now();

  return {
    id: row.id,
    imeiSerial: row.imei_serial,
    serialNumber: row.serial_number ?? row.imei_serial,
    deviceName: row.device_name,
    brand: row.brand,
    deviceType: row.device_type,
    lastFetchedAt: row.last_fetched_at,
    createdAt: row.created_at ?? fallbackTimestamp,
    updatedAt: row.updated_at ?? fallbackTimestamp,
  };
}

function isMissingSerialNumberColumnError(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return message.includes("serial_number") && message.includes("does not exist");
}

function getDeviceSelectColumns(includeSerial = supportsSerialNumberColumn !== false) {
  return includeSerial
    ? `
  id,
  imei_serial,
  serial_number,
  device_name,
  brand,
  device_type,
  last_fetched_at
`
    : `
  id,
  imei_serial,
  device_name,
  brand,
  device_type,
  last_fetched_at
`;
}

function mapClaimRow(row: ClaimRow): ClaimRecord {
  return {
    id: row.id,
    deviceId: row.device_id,
    externalId: row.external_id,
    dateOfLoss: row.date_of_loss,
    claimAmount: Number(row.claim_amount),
    outcome: row.outcome,
    reason: row.reason,
    insurer: row.insurer,
    source: row.source,
    createdAt: row.created_at,
  };
}

function toClaimListItemFromRecords(
  claim: ClaimRecord,
  device: Pick<
    DeviceRecord,
    "id" | "imeiSerial" | "serialNumber" | "deviceName" | "brand" | "deviceType" | "lastFetchedAt"
  >
): ClaimListItem {
  return {
    id: claim.id,
    device_id: claim.deviceId,
    imei_serial: device.imeiSerial,
    serial_number: device.serialNumber ?? null,
    device_name: device.deviceName,
    brand: device.brand,
    device_type: device.deviceType,
    date_of_loss: claim.dateOfLoss,
    claim_amount: Number(claim.claimAmount),
    outcome: claim.outcome,
    reason: claim.reason,
    insurer: claim.insurer,
    source: claim.source,
    external_id: claim.externalId,
    created_at: claim.createdAt,
    last_fetched_at: device.lastFetchedAt,
  };
}

function toClaimListItem(row: ClaimRow): ClaimListItem {
  if (!row.devices) {
    throw new Error(`Claim ${row.id} is missing joined device data`);
  }

  return {
    id: row.id,
    device_id: row.device_id,
    imei_serial: row.devices.imei_serial,
    serial_number: row.devices.serial_number ?? null,
    device_name: row.devices.device_name,
    brand: row.devices.brand,
    device_type: row.devices.device_type,
    date_of_loss: row.date_of_loss,
    claim_amount: Number(row.claim_amount),
    outcome: row.outcome,
    reason: row.reason,
    insurer: row.insurer,
    source: row.source,
    external_id: row.external_id,
    created_at: row.created_at,
    last_fetched_at: row.devices.last_fetched_at,
  };
}

function getClaimsWithDevicesSelect(includeSerial = supportsSerialNumberColumn !== false) {
  const deviceFields = includeSerial
    ? `
        id,
        imei_serial,
        serial_number,
        device_name,
        brand,
        device_type,
        last_fetched_at
`
    : `
        id,
        imei_serial,
        device_name,
        brand,
        device_type,
        last_fetched_at
`;

  return `
      id,
      device_id,
      external_id,
      date_of_loss,
      claim_amount,
      outcome,
      reason,
      insurer,
      source,
      created_at,
      devices (
${deviceFields}
      )
    `;
}

function requireData<T>(data: T | null, error: { message?: string } | null, fallbackMessage: string): T {
  if (error) {
    throw new Error(error.message || fallbackMessage);
  }

  if (!data) {
    throw new Error(fallbackMessage);
  }

  return data;
}

function shouldUseFileStore() {
  if (env.dbProvider === "file") {
    return true;
  }

  if (env.dbProvider === "supabase") {
    return false;
  }

  return (
    !env.supabaseUrl.trim() ||
    !(env.supabaseServiceRoleKey || env.supabaseAnonKey).trim()
  );
}

function findFileDeviceByIdentifier(devices: DeviceRecord[], identifier: string) {
  const normalized = normalizeIdentifier(identifier);

  if (!normalized) {
    return null;
  }

  return (
    devices.find(
      (device) =>
        device.imeiSerial.trim() === normalized ||
        device.serialNumber?.trim() === normalized
    ) ?? null
  );
}

function listFileClaimsByDeviceId(claims: ClaimRecord[], deviceId: string) {
  return claims.filter((claim) => claim.deviceId === deviceId);
}

function createFileDeviceRecord(input: {
  imeiSerial: string;
  serialNumber?: string | null;
  deviceName: string;
  brand: string | null;
  deviceType: string | null;
  lastFetchedAt?: string | null;
}) {
  const timestamp = now();
  return {
    id: randomUUID(),
    imeiSerial: input.imeiSerial,
    serialNumber: input.serialNumber?.trim() || null,
    deviceName: input.deviceName.trim() || "Unknown Device",
    brand: input.brand ?? null,
    deviceType: input.deviceType ?? null,
    lastFetchedAt: input.lastFetchedAt ?? timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  } satisfies DeviceRecord;
}

function createFileClaimRecord(input: {
  deviceId: string;
  externalId?: string | null;
  dateOfLoss?: string | null;
  claimAmount: number;
  outcome: ClaimOutcome;
  reason?: string | null;
  insurer: string;
  source: string;
}) {
  return {
    id: randomUUID(),
    deviceId: input.deviceId,
    externalId: input.externalId ?? null,
    dateOfLoss: input.dateOfLoss ?? null,
    claimAmount: input.claimAmount,
    outcome: input.outcome,
    reason: input.reason ?? null,
    insurer: input.insurer,
    source: input.source,
    createdAt: now(),
  } satisfies ClaimRecord;
}

function upsertFileDeviceRecord(
  devices: DeviceRecord[],
  input: {
    imeiSerial: string;
    serialNumber?: string | null;
    deviceName: string;
    brand: string | null;
    deviceType: string | null;
    lastFetchedAt?: string | null;
  }
) {
  const identifier = normalizeIdentifier(input.imeiSerial);
  const serialNumber = input.serialNumber?.trim() || null;
  const existing = findFileDeviceByIdentifier(devices, identifier);
  const timestamp = now();

  if (existing) {
    existing.imeiSerial = identifier;
    existing.serialNumber = serialNumber ?? existing.serialNumber ?? null;
    existing.deviceName = input.deviceName.trim() || existing.deviceName;
    existing.brand = input.brand ?? existing.brand;
    existing.deviceType = input.deviceType ?? existing.deviceType;
    existing.lastFetchedAt = input.lastFetchedAt ?? existing.lastFetchedAt ?? timestamp;
    existing.updatedAt = timestamp;
    return existing;
  }

  const device = createFileDeviceRecord({
    imeiSerial: identifier,
    serialNumber,
    deviceName: input.deviceName,
    brand: input.brand,
    deviceType: input.deviceType,
    lastFetchedAt: input.lastFetchedAt,
  });
  devices.push(device);
  return device;
}

async function claimExistsInFileStore(claim: NormalizedClaim): Promise<boolean> {
  const db = await readDatabase();
  const device = findFileDeviceByIdentifier(db.devices, claim.imei);

  if (!device) {
    return false;
  }

  const existingClaims = listFileClaimsByDeviceId(db.claims, device.id);
  return existingClaims.some((existingClaim) =>
    isDuplicateClaimMatch(claim, {
      insurer: existingClaim.insurer,
      dateOfLoss: existingClaim.dateOfLoss,
      claimAmount: existingClaim.claimAmount,
    })
  );
}

async function saveClaimInFileStore(claim: NormalizedClaim): Promise<boolean> {
  return mutateDatabase((db) => {
    const device = upsertFileDeviceRecord(db.devices, {
      imeiSerial: normalizeIdentifier(claim.imei),
      deviceName: claim.deviceName,
      brand: claim.brand,
      deviceType: claim.deviceType,
      lastFetchedAt: now(),
    });

    const duplicate = listFileClaimsByDeviceId(db.claims, device.id).some(
      (existingClaim) =>
        isDuplicateClaimMatch(claim, {
          insurer: existingClaim.insurer,
          dateOfLoss: existingClaim.dateOfLoss,
          claimAmount: existingClaim.claimAmount,
        })
    );

    if (duplicate) {
      return false;
    }

    db.claims.push(
      createFileClaimRecord({
        deviceId: device.id,
        externalId: claim.externalId,
        dateOfLoss: claim.dateOfLoss,
        claimAmount: claim.claimAmount,
        outcome: claim.outcome,
        reason: claim.reason,
        insurer: claim.insurer,
        source: claim.source,
      })
    );

    return true;
  });
}

async function getDeviceWithClaimsFromFileStore(identifier: string) {
  const db = await readDatabase();
  const device = findFileDeviceByIdentifier(db.devices, identifier);

  if (!device) {
    return {
      device: null,
      claims: [],
    };
  }

  return {
    device,
    claims: listFileClaimsByDeviceId(db.claims, device.id).sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    ),
  };
}

async function listClaimsWithDevicesFromFileStore(): Promise<ClaimListItem[]> {
  const db = await readDatabase();
  const deviceById = new Map(db.devices.map((device) => [device.id, device]));

  return db.claims
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .flatMap((claim) => {
      const device = deviceById.get(claim.deviceId);
      return device ? [toClaimListItemFromRecords(claim, device)] : [];
    });
}

function devicePayload(input: {
  imeiSerial: string;
  serialNumber?: string | null;
  deviceName?: string;
  brand?: string | null;
  deviceType?: string | null;
  lastFetchedAt?: string | null;
}) {
  const timestamp = now();

  const payload = {
    imei_serial: input.imeiSerial,
    device_name: input.deviceName?.trim() || "Unknown Device",
    brand: input.brand ?? null,
    device_type: input.deviceType ?? null,
    last_fetched_at: input.lastFetchedAt ?? timestamp,
  };

  if (supportsSerialNumberColumn !== false && input.serialNumber !== undefined) {
    return {
      ...payload,
      serial_number: input.serialNumber?.trim() || null,
    };
  }

  return payload;
}

async function maybeSelectSingleDevice(buildQuery: (selectColumns: string) => DeviceSelectQuery) {
  const tryWithSerial = supportsSerialNumberColumn !== false;
  const primaryColumns = getDeviceSelectColumns(tryWithSerial);
  const primaryResult = await buildQuery(primaryColumns).maybeSingle();

  if (primaryResult.error && isMissingSerialNumberColumnError(primaryResult.error)) {
    supportsSerialNumberColumn = false;
    const fallbackResult = await buildQuery(getDeviceSelectColumns(false)).maybeSingle();
    if (fallbackResult.error) {
      throw new Error(fallbackResult.error.message);
    }
    return fallbackResult.data;
  }

  if (primaryResult.error) {
    throw new Error(primaryResult.error.message);
  }

  if (tryWithSerial) {
    supportsSerialNumberColumn = true;
  }

  return primaryResult.data;
}

async function selectSingleDeviceAfterMutation(
  buildQuery: (selectColumns: string) => DeviceSelectQuery
) {
  const tryWithSerial = supportsSerialNumberColumn !== false;
  const primaryColumns = getDeviceSelectColumns(tryWithSerial);
  const primaryResult = await buildQuery(primaryColumns).single();

  if (primaryResult.error && isMissingSerialNumberColumnError(primaryResult.error)) {
    supportsSerialNumberColumn = false;
    const fallbackResult = await buildQuery(getDeviceSelectColumns(false)).single();
    return requireData(
      fallbackResult.data,
      fallbackResult.error,
      "Failed to create or update device"
    );
  }

  if (tryWithSerial) {
    supportsSerialNumberColumn = true;
  }

  return requireData(
    primaryResult.data,
    primaryResult.error,
    "Failed to create or update device"
  );
}

async function upsertDevice(input: {
  imeiSerial: string;
  serialNumber?: string | null;
  deviceName?: string;
  brand?: string | null;
  deviceType?: string | null;
  lastFetchedAt?: string | null;
}) {
  const payload = devicePayload(input);
  const upsertArgs = {
    onConflict: "imei_serial",
  };

  const tryWithSerial = supportsSerialNumberColumn !== false;
  const firstAttempt = await supabase
    .from("devices")
    .upsert(payload, upsertArgs)
    .select(getDeviceSelectColumns(tryWithSerial))
    .single<DeviceRow>();

  if (firstAttempt.error && isMissingSerialNumberColumnError(firstAttempt.error)) {
    supportsSerialNumberColumn = false;
    const fallbackPayload = devicePayload({
      ...input,
      serialNumber: undefined,
    });
    const fallback = await supabase
      .from("devices")
      .upsert(fallbackPayload, upsertArgs)
      .select(getDeviceSelectColumns(false))
      .single<DeviceRow>();

    return requireData(fallback.data, fallback.error, "Failed to create or update device");
  }

  if (tryWithSerial) {
    supportsSerialNumberColumn = true;
  }

  return requireData(
    firstAttempt.data,
    firstAttempt.error,
    "Failed to create or update device"
  );
}

async function findDeviceByIdentifier(identifier: string) {
  const normalized = normalizeIdentifier(identifier);

  if (!normalized) {
    return null;
  }

  const imeiMatch = await maybeSelectSingleDevice((selectColumns) =>
    supabase
      .from("devices")
      .select(selectColumns)
      .eq("imei_serial", normalized)
  );

  if (imeiMatch) {
    return imeiMatch;
  }

  if (supportsSerialNumberColumn === false) {
    return null;
  }

  return maybeSelectSingleDevice((selectColumns) =>
    supabase
      .from("devices")
      .select(selectColumns)
      .eq("serial_number", normalized)
  );
}

async function listClaimsByDeviceId(deviceId: string) {
  const { data, error } = await supabase.from("claims").select("*").eq("device_id", deviceId);

  if (error) {
    throw new Error(error.message);
  }

  return (data as ClaimRow[] | null)?.map(mapClaimRow) ?? [];
}

export async function getOrCreateDevice(imei: string) {
  const normalizedImei = imei.trim();

  if (shouldUseFileStore()) {
    return mutateDatabase((db) =>
      upsertFileDeviceRecord(db.devices, {
        imeiSerial: normalizedImei,
        deviceName: "Unknown Device",
        brand: null,
        deviceType: null,
        lastFetchedAt: now(),
      })
    );
  }

  const existing = await maybeSelectSingleDevice((selectColumns) =>
    supabase
      .from("devices")
      .select(selectColumns)
      .eq("imei_serial", normalizedImei)
  );

  if (existing) {
    return existing;
  }

  return selectSingleDeviceAfterMutation((selectColumns) =>
    supabase
      .from("devices")
      .insert(devicePayload({ imeiSerial: normalizedImei }))
      .select(selectColumns)
  );
}

export async function upsertFetchedDevice(input: {
  imeiSerial: string;
  serialNumber?: string | null;
  deviceName: string;
  brand: string | null;
  deviceType: string | null;
  lastFetchedAt: string;
}) {
  if (shouldUseFileStore()) {
    return mutateDatabase((db) =>
      upsertFileDeviceRecord(db.devices, {
        imeiSerial: input.imeiSerial,
        serialNumber: input.serialNumber,
        deviceName: input.deviceName,
        brand: input.brand,
        deviceType: input.deviceType,
        lastFetchedAt: input.lastFetchedAt,
      })
    );
  }

  const deviceData = await upsertDevice({
    imeiSerial: input.imeiSerial,
    serialNumber: input.serialNumber,
    deviceName: input.deviceName,
    brand: input.brand,
    deviceType: input.deviceType,
    lastFetchedAt: input.lastFetchedAt,
  });

  return mapDeviceRow(deviceData);
}

export async function insertClaim(claim: {
  device_id: string;
  external_id?: string | null;
  date_of_loss?: string | null;
  claim_amount: number;
  outcome: ClaimOutcome;
  reason?: string | null;
  insurer: string;
  source: string;
}) {
  const { data, error } = await supabase
    .from("claims")
    .insert({
      ...claim,
      external_id: claim.external_id ?? null,
      date_of_loss: claim.date_of_loss ?? null,
      reason: claim.reason ?? null,
    })
    .select("*")
    .single<ClaimRow>();

  return requireData(data, error, "Failed to insert claim");
}

export async function claimExists(claim: NormalizedClaim): Promise<boolean> {
  if (shouldUseFileStore()) {
    return claimExistsInFileStore(claim);
  }

  if (claim.externalId) {
    const { data: externalIdMatch, error: externalIdError } = await supabase
      .from("claims")
      .select("id")
      .eq("external_id", claim.externalId)
      .maybeSingle<{ id: string }>();

    if (externalIdError) {
      throw new Error(externalIdError.message);
    }

    if (externalIdMatch) {
      return true;
    }
  }

  const device = await findDeviceByIdentifier(claim.imei);

  if (!device) {
    return false;
  }

  const existingClaims = await listClaimsByDeviceId(device.id);

  return existingClaims.some((existingClaim) =>
    isDuplicateClaimMatch(claim, {
      insurer: existingClaim.insurer,
      dateOfLoss: existingClaim.dateOfLoss,
      claimAmount: existingClaim.claimAmount,
    })
  );
}

export async function saveClaim(claim: NormalizedClaim) {
  if (shouldUseFileStore()) {
    return saveClaimInFileStore(claim);
  }

  const device = await upsertFetchedDevice({
    imeiSerial: normalizeIdentifier(claim.imei),
    deviceName: claim.deviceName,
    brand: claim.brand,
    deviceType: claim.deviceType,
    lastFetchedAt: now(),
  });

  try {
    await insertClaim({
      device_id: device.id,
      external_id: claim.externalId,
      date_of_loss: claim.dateOfLoss,
      claim_amount: claim.claimAmount,
      outcome: claim.outcome,
      reason: claim.reason,
      insurer: claim.insurer,
      source: claim.source,
    });

    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("claims_external_id_unique") ||
        error.message.includes("claims_dedupe_fingerprint") ||
        error.message.toLowerCase().includes("duplicate key"))
    ) {
      return false;
    }

    throw error;
  }
}

export async function getAllClaims() {
  const tryWithSerial = supportsSerialNumberColumn !== false;
  const primaryResult = await supabase
    .from("claims")
    .select(getClaimsWithDevicesSelect(tryWithSerial))
    .order("created_at", { ascending: false });

  if (primaryResult.error && isMissingSerialNumberColumnError(primaryResult.error)) {
    supportsSerialNumberColumn = false;
    const fallbackResult = await supabase
      .from("claims")
      .select(getClaimsWithDevicesSelect(false))
      .order("created_at", { ascending: false });

    return requireData(
      fallbackResult.data as ClaimRow[] | null,
      fallbackResult.error,
      "Failed to fetch claims"
    );
  }

  if (tryWithSerial) {
    supportsSerialNumberColumn = true;
  }

  return requireData(
    primaryResult.data as ClaimRow[] | null,
    primaryResult.error,
    "Failed to fetch claims"
  );
}

export async function getDeviceWithClaims(imeiSerial: string) {
  if (shouldUseFileStore()) {
    return getDeviceWithClaimsFromFileStore(imeiSerial);
  }

  const deviceData = await findDeviceByIdentifier(imeiSerial);

  if (!deviceData) {
    return {
      device: null,
      claims: [],
    };
  }

  const device = mapDeviceRow(deviceData);
  const { data: claimRows, error: claimError } = await supabase
    .from("claims")
    .select("*")
    .eq("device_id", device.id)
    .order("created_at", { ascending: false });

  if (claimError) {
    throw new Error(claimError.message);
  }

  return {
    device,
    claims: (claimRows as ClaimRow[] | null)?.map(mapClaimRow) ?? [],
  };
}

export async function saveFetchedClaims(input: {
  imeiSerial: string;
  deviceName: string;
  brand: string | null;
  deviceType: string | null;
  lastFetchedAt: string;
  claims: NormalizedClaim[];
}) {
  const device = await upsertFetchedDevice({
    imeiSerial: input.imeiSerial,
    deviceName: input.deviceName,
    brand: input.brand,
    deviceType: input.deviceType,
    lastFetchedAt: input.lastFetchedAt,
  });

  const existingClaims = await listClaimsByDeviceId(device.id);
  const existingExternalIds = new Set(
    existingClaims.map((claim) => claim.externalId).filter((value): value is string => Boolean(value))
  );
  const existingFingerprints = new Set(
    existingClaims.map((claim) =>
      makeClaimFingerprint({
        imei: device.imeiSerial,
        externalId: claim.externalId,
        outcome: claim.outcome,
        claimAmount: claim.claimAmount,
        dateOfLoss: claim.dateOfLoss,
        reason: claim.reason,
        insurer: claim.insurer,
        source: claim.source,
      })
    )
  );

  const newClaims = input.claims.filter((claim) => {
    const hasExternalIdMatch = claim.externalId ? existingExternalIds.has(claim.externalId) : false;
    const fingerprint = makeClaimFingerprint(claim);
    const hasFingerprintMatch = existingFingerprints.has(fingerprint);

    if (hasExternalIdMatch || hasFingerprintMatch) {
      return false;
    }

    if (claim.externalId) {
      existingExternalIds.add(claim.externalId);
    }
    existingFingerprints.add(fingerprint);
    return true;
  });

  if (newClaims.length > 0) {
    const insertPayload = newClaims.map((claim) => ({
      id: randomUUID(),
      device_id: device.id,
      external_id: claim.externalId,
      date_of_loss: claim.dateOfLoss,
      claim_amount: claim.claimAmount,
      outcome: claim.outcome,
      reason: claim.reason,
      insurer: claim.insurer,
      source: claim.source,
      created_at: now(),
    }));

    const { error: insertError } = await supabase.from("claims").insert(insertPayload);
    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  return {
    device,
    inserted: newClaims.length,
  };
}

export async function createManualClaim(input: {
  imei: string;
  serial: string;
  deviceName: string;
  insurer: string;
  outcome: "APPROVED" | "REJECTED" | "PENDING";
  dateOfLoss: string | null;
  reason: string | null;
  amount: number;
}) {
  const normalizedImei = input.imei.trim();
  const normalizedSerial = input.serial.trim();
  const primaryIdentifier = normalizedImei || normalizedSerial;

  if (!primaryIdentifier) {
    throw new Error("Either IMEI or serial number is required.");
  }

  const [brandPart] = input.deviceName.trim().split(/\s+/);
  const normalizedClaim: NormalizedClaim = {
    externalId: null,
    imei: primaryIdentifier,
    deviceName: input.deviceName.trim() || "Unknown Device",
    brand: brandPart || "Unknown",
    deviceType: null,
    outcome: input.outcome,
    claimAmount: input.amount,
    dateOfLoss: input.dateOfLoss,
    reason: input.reason,
    insurer: input.insurer,
    source: "manual",
  };

  if (shouldUseFileStore()) {
    return mutateDatabase((db) => {
      const device = upsertFileDeviceRecord(db.devices, {
        imeiSerial: primaryIdentifier,
        serialNumber: normalizedSerial || null,
        deviceName: normalizedClaim.deviceName,
        brand: normalizedClaim.brand,
        deviceType: null,
        lastFetchedAt: now(),
      });

      const duplicate = listFileClaimsByDeviceId(db.claims, device.id).some(
        (existingClaim) =>
          isDuplicateClaimMatch(normalizedClaim, {
            insurer: existingClaim.insurer,
            dateOfLoss: existingClaim.dateOfLoss,
            claimAmount: existingClaim.claimAmount,
          })
      );

      if (duplicate) {
        return null;
      }

      const claim = createFileClaimRecord({
        deviceId: device.id,
        dateOfLoss: input.dateOfLoss,
        claimAmount: input.amount,
        outcome: input.outcome,
        reason: input.reason,
        insurer: input.insurer,
        source: "manual",
      });

      db.claims.push(claim);
      console.log("[ManualClaim] New claim saved:", normalizedClaim);
      return toClaimListItemFromRecords(claim, device);
    });
  }

  if (await claimExists(normalizedClaim)) {
    return null;
  }

  const device = await upsertDevice({
    imeiSerial: primaryIdentifier,
    serialNumber: normalizedSerial || null,
    deviceName: normalizedClaim.deviceName,
    brand: normalizedClaim.brand,
    deviceType: null,
    lastFetchedAt: now(),
  });

  const insertedClaim = await insertClaim({
    device_id: device.id,
    external_id: null,
    date_of_loss: input.dateOfLoss,
    claim_amount: input.amount,
    outcome: input.outcome,
    reason: input.reason,
    insurer: input.insurer,
    source: "manual",
  });

  const claimItem = toClaimListItem({
    ...insertedClaim,
    devices: {
      id: device.id,
      imei_serial: device.imei_serial,
      serial_number: device.serial_number ?? null,
      device_name: device.device_name,
      brand: device.brand,
      device_type: device.device_type,
      last_fetched_at: device.last_fetched_at,
    },
  });

  console.log("[ManualClaim] New claim saved:", normalizedClaim);
  return claimItem;
}

export async function createManualClaimsBulk(
  inputs: Array<{
    imei: string;
    serial: string;
    deviceName: string;
    insurer: string;
    outcome: "APPROVED" | "REJECTED" | "PENDING";
    dateOfLoss: string | null;
    reason: string | null;
    amount: number;
  }>
) {
  const claims: ClaimListItem[] = [];
  const errors: Array<{ row: number; reason: string }> = [];
  const processedRows: number[] = [];
  let duplicates = 0;

  for (const [index, input] of inputs.entries()) {
    try {
      const claim = await createManualClaim(input);
      if (!claim) {
        duplicates += 1;
        continue;
      }
      claims.push(claim);
      processedRows.push(index + 2);
    } catch (error) {
      errors.push({
        row: index + 2,
        reason: error instanceof Error ? error.message : "Unexpected import error",
      });
    }
  }

  return {
    processed: claims.length,
    duplicates,
    skipped: errors.length,
    errors,
    claims,
    processedRows,
  };
}

export async function listClaimsWithDevices(): Promise<ClaimListItem[]> {
  if (shouldUseFileStore()) {
    return listClaimsWithDevicesFromFileStore();
  }

  const claims = await getAllClaims();
  return claims.map(toClaimListItem);
}
