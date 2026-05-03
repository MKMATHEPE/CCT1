import { getStats } from "../services/deviceDataService";

export default function KPICards() {
  const stats = getStats();

  const kpis = [
    { label: "Total Claims", value: stats.totalClaims },
    { label: "Duplicate Devices", value: stats.duplicateDevices },
    { label: "Claims Rejected", value: stats.rejectedClaims },
    {
      label: "Estimated Fraud Prevented",
      value: `R ${stats.fraudPrevented.toLocaleString()}`,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="bg-card border border-border rounded-lg p-4"
        >
          <div className="text-sm text-muted mb-1">
            {kpi.label}
          </div>
          <div className="text-xl font-semibold">
            {kpi.value}
          </div>
        </div>
      ))}
    </div>
  );
}