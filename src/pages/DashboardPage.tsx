import { useMemo, useState } from "react";
import KPICards from "../components/KPICards";
import CasesRequiringAction from "../components/CasesRequiringAction";
import RiskQueueSnapshot from "../components/RiskQueueSnapshot";
import { getClosedCases } from "../services/caseDomainService";
import { getClaimEvents } from "../services/claimDeviceService";
import {
  generateRiskSignals,
  summarizeSignalsByMonth,
} from "../services/riskSignalService";
import { getDuplicateEvidenceContext } from "../services/duplicateEvidenceService";
import { getExistingDevices } from "../services/deviceRegistryService";

type TabKey = "overview" | "risk" | "insights";

const tabs: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "risk", label: "Risk & Fraud" },
  { key: "insights", label: "Insights" },
];

const lossTypes = [
  "Theft",
  "Accidental Damage",
  "Loss",
  "Fire",
  "Other",
] as const;

const deviceAges = ["< 6 months", "6–12 months", "> 12 months"] as const;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const riskSignals = useMemo(() => generateRiskSignals(), []);
  const fraudOutcomes = ["Duplicate Claim Prevented", "Fraud Confirmed"];
  const closedCases = useMemo(() => getClosedCases(), []);
  const fraudPreventedAmount = useMemo(() => {
    const multiplier = 5500;
    return closedCases.reduce((total, record, index) => {
      if (!record.closeOutcome) return total;
      if (!fraudOutcomes.includes(record.closeOutcome)) return total;
      return total + (record.linkedClaimIds.length || 1) * multiplier * (index + 1);
    }, 0);
  }, [closedCases]);
  const duplicateTrend = useMemo(() => {
    const segments = summarizeSignalsByMonth(riskSignals);
    if (segments.length === 0) {
      const fallback = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
      return fallback.map((label, index) => ({
        label,
        value: index % 3 === 0 ? 4 + index : 2 + index,
      }));
    }
    return segments;
  }, [riskSignals]);
  const claimEvents = useMemo(() => getClaimEvents(), []);
  const lossByType = useMemo(() => {
    const counts: Record<string, number> = {};
    lossTypes.forEach((type) => {
      counts[type] = 0;
    });
    claimEvents.forEach((event) => {
      const hasLossType = !!event.lossType;
      const isKnownLoss =
        hasLossType &&
        lossTypes.includes(
          event.lossType as typeof lossTypes[number]
        );
      const key = isKnownLoss
        ? (event.lossType as typeof lossTypes[number])
        : "Other";
      counts[key] = (counts[key] ?? 0) + 1;
    });
    if (Object.values(counts).every((value) => value === 0)) {
      return [
        { name: "Theft", value: 34 },
        { name: "Accidental Damage", value: 21 },
        { name: "Loss", value: 15 },
        { name: "Fire", value: 9 },
        { name: "Other", value: 4 },
      ];
    }
    return lossTypes.map((type) => ({
      name: type,
      value: counts[type],
    }));
  }, [claimEvents]);
  const ageBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    deviceAges.forEach((age) => {
      counts[age] = 0;
    });
    claimEvents.forEach((event) => {
      const hasAge = !!event.deviceAge;
      const isKnownAge =
        hasAge &&
        deviceAges.includes(
          event.deviceAge as typeof deviceAges[number]
        );
      const key = isKnownAge
        ? (event.deviceAge as typeof deviceAges[number])
        : "> 12 months";
      counts[key] = (counts[key] ?? 0) + 1;
    });
    if (Object.values(counts).every((value) => value === 0)) {
      return [
        { name: "< 6 months", value: 40 },
        { name: "6–12 months", value: 28 },
        { name: "> 12 months", value: 12 },
      ];
    }
    return deviceAges.map((label) => ({
      name: label,
      value: counts[label],
    }));
  }, [claimEvents]);
  const duplicateDevices = useMemo(() => {
    const devices = getExistingDevices();
    const rows = devices
      .map((device) => {
        const evidence = getDuplicateEvidenceContext(device.serial);
        if (!evidence || evidence.claimCount <= 1) return null;
        return {
          serial: device.serial,
          claims: evidence.claimCount,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.claims - a!.claims)
      .slice(0, 5)
      .map((item) => item!);
    if (rows.length === 0) {
      return [
        { serial: "356789XXXXXX", claims: 3 },
        { serial: "358111XXXXXX", claims: 2 },
        { serial: "352099XXXXXX", claims: 2 },
      ];
    }
    return rows;
  }, []);

  const renderOverview = () => (
    <div className="space-y-5">
      <KPICards />
      <CasesRequiringAction />
      <RiskQueueSnapshot />
    </div>
  );

  const renderRiskTab = () => (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-sm text-muted">Duplicate devices trend</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {duplicateTrend.map((point) => (
              <div key={point.label} className="text-xs text-gray-600">
                <div className="font-semibold text-gray-900">{point.value}</div>
                <div>{point.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-sm text-muted">Fraud prevented over time</p>
          <p className="mt-2 text-2xl font-semibold text-green-700">
            {formatCurrency(fraudPreventedAmount)}
          </p>
          <p className="text-xs text-muted">cumulative</p>
        </div>
        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-sm text-muted">High-risk signals</p>
          <p className="mt-2 text-2xl font-semibold text-red-700">
            {riskSignals.filter((signal) => signal.severity === "HIGH").length}
          </p>
          <p className="text-xs text-muted">
            of {riskSignals.length} active signals
          </p>
        </div>
      </div>
    </div>
  );

  const renderInsightsTab = () => (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-sm text-muted">Claims by loss type</p>
          <div className="mt-3 space-y-2 text-sm">
            {lossByType.map((item) => (
              <div key={item.name} className="flex justify-between">
                <span>{item.name}</span>
                <span className="font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-sm text-muted">Claims by device age</p>
          <div className="mt-3 space-y-2 text-sm">
            {ageBreakdown.map((item) => (
              <div key={item.name} className="flex justify-between">
                <span>{item.name}</span>
                <span className="font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-white border border-border rounded-xl p-4">
        <p className="text-sm text-muted">Top repeated devices</p>
        <div className="mt-3 space-y-2 text-sm">
          {duplicateDevices.map((device) => (
            <div key={device.serial} className="flex justify-between">
              <span>{device.serial}</span>
              <span className="font-semibold">{device.claims} claims</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (activeTab === "risk") return renderRiskTab();
    if (activeTab === "insights") return renderInsightsTab();
    return renderOverview();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <div className="flex rounded-full border border-border bg-slate-50">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`px-4 py-2 text-sm font-semibold transition ${
                  tab.key === activeTab
                    ? "text-white bg-primary rounded-full"
                    : "text-gray-700 hover:text-primary"
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 text-xs font-semibold text-muted">
          {tabs.map((tab, index) => (
            <span key={tab.key} className="inline-flex items-center">
              <span
                className={
                  tab.key === activeTab ? "text-gray-900" : "text-gray-400"
                }
              >
                {tab.label}
              </span>
              {index < tabs.length - 1 && (
                <span className="mx-2 text-gray-300">|</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {renderContent()}
    </div>
  );
}
