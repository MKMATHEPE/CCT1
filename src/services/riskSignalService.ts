import { getExistingDevices } from "./deviceRegistryService";
import { getDuplicateEvidenceContext } from "./duplicateEvidenceService";

export type RiskSignal = {
  id: string;
  type: "DUPLICATE_DEVICE" | "VELOCITY" | "MULTI_INSURER";
  severity: "HIGH" | "MEDIUM";
  source: "CLAIM_DEVICE" | "DUPLICATE_DEVICES";
  linkedEntity: {
    type: "DEVICE" | "CASE";
    id: string;
  };
  summary: string;
  createdAt: string;
};

export function generateRiskSignals(): RiskSignal[] {
  const devices = getExistingDevices();
  const signals = devices
    .map((device) => {
      const evidence = getDuplicateEvidenceContext(device.serial);
      if (!evidence || evidence.claimCount <= 1) return null;
      const severity = evidence.crossInsurer ? "HIGH" : "MEDIUM";
      return {
        id: `signal-${device.serial}-${crypto.randomUUID()}`,
        type: "DUPLICATE_DEVICE" as const,
        severity,
        source: "DUPLICATE_DEVICES" as const,
        linkedEntity: {
          type: "DEVICE" as const,
          id: device.serial,
        },
        summary: evidence.crossInsurer
          ? "Cross-insurer duplicate device detected"
          : "Duplicate device detected",
        createdAt:
          evidence.claims[0]?.recordedAtUtc ?? new Date().toISOString(),
      };
    })
    .filter((signal): signal is RiskSignal => Boolean(signal));

  return signals.sort((a, b) => {
    const severityRank = (level: RiskSignal["severity"]) =>
      level === "HIGH" ? 2 : 1;
    const severityDiff = severityRank(b.severity) - severityRank(a.severity);
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function summarizeSignalsByMonth(signals: RiskSignal[]) {
  const map = new Map<string, number>();
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  });
  signals.forEach((signal) => {
    const label = formatter.format(new Date(signal.createdAt));
    map.set(label, (map.get(label) ?? 0) + 1);
  });
  return Array.from(map.entries()).map(([label, value]) => ({
    label,
    value,
  }));
}
