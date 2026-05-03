import { getClaims } from "./deviceDataService";
import { getClaimEvents } from "./claimDeviceService";
import { writeAuditLog } from "./auditLogService";

export type DeviceStatus = "Clean" | "Duplicate";

export type RegisteredDevice = {
  id: string;
  serial: string;
  imei?: string;
  category?: "Mobile" | "Laptop" | "Tablet";
  brand?: string;
  model?: string;
  age?: "< 6 months" | "6–12 months" | "> 12 months";
  status: "Registered" | "Existing";
  registeredAtUtc: string;
};

export type ExistingDeviceRow = {
  serial: string;
  imei?: string;
  brand?: string;
  model?: string;
  category?: "Mobile" | "Laptop" | "Tablet";
  age?: "< 6 months" | "6–12 months" | "> 12 months";
  claimCount: number;
  lastInsurer: string;
  status: DeviceStatus;
  lastActivityUtc?: string;
};

const registeredDevices = new Map<string, RegisteredDevice>();

const deviceHistory = new Map<
  string,
  {
    serial: string;
    imei?: string;
    claims: {
      claimId: string;
      insurer?: string;
      createdAtUtc: string;
    }[];
  }
>();

export function registerDeviceBySerial(input: {
  serial: string;
  brand?: string;
  model?: string;
  actor: string;
  actorRole: string;
}): { status: "created" | "existing"; device: RegisteredDevice } {
  const serial = input.serial.trim();

  if (!serial) {
    throw new Error("Serial number is required.");
  }

  const claims = getClaims();
  const matchingClaim = claims.find((claim) => claim.serial === serial);
  const existing = registeredDevices.get(serial);

  if (existing || matchingClaim) {
    const device: RegisteredDevice =
      existing ??
      {
        id: `device-${serial}`,
        serial,
        imei: matchingClaim?.imei,
        brand: matchingClaim?.brand,
        model: matchingClaim?.model,
        status: "Existing",
        registeredAtUtc: matchingClaim?.timestamp ?? new Date().toISOString(),
      };

    writeAuditLog({
      actor: input.actor,
      actorRole: input.actorRole,
      action: "DEVICE_SERIAL_EXISTS",
      target: serial,
      outcome: "SUCCESS",
      context: `Existing device detected (${device.id})`,
    });

    return { status: "existing", device };
  }

  const device: RegisteredDevice = {
    id: `device-${serial}`,
    serial,
    brand: input.brand?.trim() || undefined,
    model: input.model?.trim() || undefined,
    status: "Registered",
    registeredAtUtc: new Date().toISOString(),
  };

  registeredDevices.set(serial, device);

  writeAuditLog({
    actor: input.actor,
    actorRole: input.actorRole,
    action: "DEVICE_REGISTERED",
    target: serial,
    outcome: "SUCCESS",
    context: `Device registered (${device.id})`,
  });

  return { status: "created", device };
}

export function getRegisteredDeviceBySerial(
  serial: string
): RegisteredDevice | null {
  const key = serial.trim();
  if (!key) return null;
  return registeredDevices.get(key) ?? null;
}

export function createDeviceRecord(input: {
  serial: string;
  brand?: string;
  model?: string;
  imei?: string;
  category?: "Mobile" | "Laptop" | "Tablet";
  age?: "< 6 months" | "6–12 months" | "> 12 months";
}): RegisteredDevice {
  const serial = input.serial.trim();

  if (!serial) {
    throw new Error("Serial number is required.");
  }

  if (registeredDevices.has(serial)) {
    throw new Error("Device already exists.");
  }

  const device: RegisteredDevice = {
    id: `device-${serial}`,
    serial,
    imei: input.imei?.trim() || undefined,
    category: input.category,
    brand: input.brand?.trim() || undefined,
    model: input.model?.trim() || undefined,
    age: input.age,
    status: "Registered",
    registeredAtUtc: new Date().toISOString(),
  };

  registeredDevices.set(serial, device);
  return device;
}

export function recordClaimForDevice(input: {
  serial: string;
  imei?: string;
  insurer?: string;
}) {
  const key = input.serial.trim();
  if (!key) return;

  const record =
    deviceHistory.get(key) ?? {
      serial: key,
      imei: input.imei,
      claims: [],
    };

  record.imei = input.imei || record.imei;
  record.claims.unshift({
    claimId: crypto.randomUUID(),
    insurer: input.insurer,
    createdAtUtc: new Date().toISOString(),
  });
  deviceHistory.set(key, record);
}

export function getExistingDevices(): ExistingDeviceRow[] {
  const claims = getClaims();
  const claimEvents = getClaimEvents();
  const serialMap = new Map<
    string,
    {
      serial: string;
      imei?: string;
      category?: "Mobile" | "Laptop" | "Tablet";
      brand?: string;
      model?: string;
      age?: "< 6 months" | "6–12 months" | "> 12 months";
      count: number;
      lastInsurer?: string;
      lastActivityUtc?: string;
    }
  >();

  claims.forEach((claim) => {
    const serial = claim.serial;
    const entry =
      serialMap.get(serial) ?? {
        serial,
        imei: claim.imei,
        category: undefined,
        brand: claim.brand,
        model: claim.model,
        age: undefined,
        count: 0,
        lastInsurer: undefined,
        lastActivityUtc: undefined,
      };

    entry.count += 1;
    entry.imei = claim.imei || entry.imei;
    entry.category = entry.category;
    entry.brand = claim.brand || entry.brand;
    entry.model = claim.model || entry.model;
    entry.age = entry.age;
    entry.lastActivityUtc = claim.timestamp ?? entry.lastActivityUtc;
    serialMap.set(serial, entry);
  });

  claimEvents.forEach((event) => {
    const serial = event.serial;
    const entry =
      serialMap.get(serial) ?? {
        serial,
        imei: event.imei,
        category: event.deviceCategory,
        brand: event.brand,
        model: event.model,
        age: event.deviceAge,
        count: 0,
        lastInsurer: undefined,
        lastActivityUtc: undefined,
      };

    entry.count += 1;
    entry.imei = event.imei || entry.imei;
    entry.category = event.deviceCategory ?? entry.category;
    entry.brand = event.brand || entry.brand;
    entry.model = event.model || entry.model;
    entry.age = event.deviceAge ?? entry.age;
    entry.lastInsurer = event.insurer ?? entry.lastInsurer;
    entry.lastActivityUtc =
      event.createdAtUtc ?? entry.lastActivityUtc;
    serialMap.set(serial, entry);
  });

  const fromClaims = Array.from(serialMap.values()).map((entry) => ({
    serial: entry.serial,
    imei: entry.imei,
    category: entry.category,
    brand: entry.brand,
    model: entry.model,
    age: entry.age,
    claimCount: entry.count,
    lastInsurer: entry.lastInsurer ?? "Unknown",
    status: entry.count > 1 ? "Duplicate" : "Clean",
    lastActivityUtc: entry.lastActivityUtc,
  }));

  const fromRegistry = Array.from(deviceHistory.values()).map((entry) => ({
    serial: entry.serial,
    imei: entry.imei,
    category: undefined,
    brand: undefined,
    model: undefined,
    age: undefined,
    claimCount: entry.claims.length,
    lastInsurer:
      entry.claims[0]?.insurer?.toString() ?? "Unknown",
    status: entry.claims.length > 1 ? "Duplicate" : "Clean",
    lastActivityUtc: entry.claims[0]?.createdAtUtc,
  }));

  const fromRegistered = Array.from(registeredDevices.values()).map(
    (entry) => ({
      serial: entry.serial,
      imei: entry.imei,
      category: entry.category,
      brand: entry.brand,
      model: entry.model,
      age: entry.age,
      claimCount: 0,
      lastInsurer: "Unknown",
      status: "Clean",
      lastActivityUtc: entry.registeredAtUtc,
    })
  );

  return [...fromClaims, ...fromRegistry, ...fromRegistered].filter(
    (item, index, arr) =>
      arr.findIndex((x) => x.serial === item.serial) === index
  );
}

export function getDeviceHistoryBySerial(serial: string) {
  return deviceHistory.get(serial) ?? null;
}
