export type ClaimDeviceEvent = {
  id: string;
  deviceId: string;
  serial: string;
  imei?: string;
  deviceCategory?: "Mobile" | "Laptop" | "Tablet";
  brand?: string;
  model?: string;
  deviceAge?: "< 6 months" | "6–12 months" | "> 12 months";
  insurer?: "Alpha Insurance" | "Beta Assurance" | "Gamma Cover";
  claimReference?: string;
  lossType?: "Theft" | "Accidental Damage" | "Loss" | "Fire" | "Water Damage";
  dateOfLoss?: string;
  claimAmount?: number;
  outcome?: "PAID_TOTAL_LOSS" | "PAID_PARTIAL" | "REJECTED";
  createdAtUtc: string;
};

const claimEvents: ClaimDeviceEvent[] = [];
const deviceBySerial = new Map<string, string>();

export function createClaimEvent(input: {
  deviceId: string;
  serial: string;
  imei?: string;
  deviceCategory?: "Mobile" | "Laptop" | "Tablet";
  brand?: string;
  model?: string;
  deviceAge?: "< 6 months" | "6–12 months" | "> 12 months";
  insurer?: "Alpha Insurance" | "Beta Assurance" | "Gamma Cover";
  claimReference?: string;
  lossType?: "Theft" | "Accidental Damage" | "Loss" | "Fire" | "Water Damage";
  dateOfLoss?: string;
  claimAmount?: number;
  outcome?: "PAID_TOTAL_LOSS" | "PAID_PARTIAL" | "REJECTED";
}): ClaimDeviceEvent {
  const event: ClaimDeviceEvent = {
    id: crypto.randomUUID(),
    deviceId: input.deviceId,
    serial: input.serial,
    imei: input.imei,
    deviceCategory: input.deviceCategory,
    brand: input.brand,
    model: input.model,
    deviceAge: input.deviceAge,
    insurer: input.insurer,
    claimReference: input.claimReference,
    lossType: input.lossType,
    dateOfLoss: input.dateOfLoss,
    claimAmount: input.claimAmount,
    outcome: input.outcome,
    createdAtUtc: new Date().toISOString(),
  };
  claimEvents.unshift(event);
  deviceBySerial.set(input.serial, input.deviceId);
  return event;
}

export function getClaimEvents(): ClaimDeviceEvent[] {
  return [...claimEvents];
}

export function getClaimEventsBySerial(serial: string): ClaimDeviceEvent[] {
  return claimEvents.filter((event) => event.serial === serial);
}

export function getClaimEventsGroupedBySerial(): Record<string, ClaimDeviceEvent[]> {
  return claimEvents.reduce<Record<string, ClaimDeviceEvent[]>>((acc, event) => {
    if (!acc[event.serial]) acc[event.serial] = [];
    acc[event.serial].push(event);
    return acc;
  }, {});
}

export function getDeviceIdBySerial(serial: string): string | null {
  return deviceBySerial.get(serial) ?? null;
}
