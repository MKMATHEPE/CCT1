import { useTheme } from "../auth/themeContext";
import {
  getClaimsGroupedByIMEI,
  getStats,
  useDeviceData,
} from "../services/deviceDataService";

type Props = {
  view: "duplicate-rate" | "fraud-prevented" | "top-devices";
};

export default function InsightsPage({ view }: Props) {
  useDeviceData();
  const theme = useTheme();
  const stats = getStats();
  const grouped = getClaimsGroupedByIMEI();
  const totalDevices = Object.keys(grouped).length;
  const duplicateRate =
    totalDevices === 0
      ? 0
      : Math.round((stats.duplicateDevices / totalDevices) * 100);

  const topDevices = Object.entries(grouped)
    .map(([imei, claims]) => ({
      imei,
      device: `${claims[0].brand} ${claims[0].model}`,
      count: claims.length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const cardBg = theme === "light" ? "bg-[#f5f9fd]" : "bg-slate-900/90";
  const heading = theme === "light" ? "text-gray-900" : "text-white";
  const body = theme === "light" ? "text-gray-700" : "text-slate-300";
  const tableHead = theme === "light" ? "bg-[#dde6f0]/60 text-gray-600" : "bg-slate-800/60 text-slate-400";
  const tableCell = theme === "light" ? "text-gray-600" : "text-slate-300";

  return (
    <div className="space-y-4">
      <div className={`${cardBg} border border-border rounded-xl p-6 shadow-sm`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className={`text-xl font-semibold ${heading}`}>
              Insights / Trends
            </h2>
            <p className="mt-1 text-sm text-muted">
              Pattern-level intelligence across all claims.
            </p>
          </div>
          <div className="text-sm text-muted">Read-only</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`${cardBg} border border-border rounded-xl p-5 shadow-sm`}>
          <div className="text-xs uppercase tracking-wide text-muted">
            Duplicate Rate
          </div>
          <div className={`mt-2 text-2xl font-semibold ${heading}`}>
            {duplicateRate}%
          </div>
          <div className="text-xs text-muted mt-1">
            Devices with multiple claims
          </div>
        </div>
        <div className={`${cardBg} border border-border rounded-xl p-5 shadow-sm`}>
          <div className="text-xs uppercase tracking-wide text-muted">
            Fraud Prevented
          </div>
          <div className={`mt-2 text-2xl font-semibold ${heading}`}>
            R {stats.fraudPrevented.toLocaleString()}
          </div>
          <div className="text-xs text-muted mt-1">
            Rejected claim value
          </div>
        </div>
        <div className={`${cardBg} border border-border rounded-xl p-5 shadow-sm`}>
          <div className="text-xs uppercase tracking-wide text-muted">
            Duplicate Devices
          </div>
          <div className={`mt-2 text-2xl font-semibold ${heading}`}>
            {stats.duplicateDevices}
          </div>
          <div className="text-xs text-muted mt-1">
            Out of {totalDevices} devices
          </div>
        </div>
      </div>

      {view === "duplicate-rate" && (
        <div className={`${cardBg} border border-border rounded-xl p-6 shadow-sm`}>
          <h3 className={`text-lg font-semibold ${heading}`}>
            Duplicate Rate Over Time
          </h3>
          <p className={`mt-2 text-sm ${body}`}>
            Trend visualization placeholder. Plug in time-series data
            for weekly duplicate rate.
          </p>
        </div>
      )}

      {view === "fraud-prevented" && (
        <div className={`${cardBg} border border-border rounded-xl p-6 shadow-sm`}>
          <h3 className={`text-lg font-semibold ${heading}`}>
            Fraud Prevented Trend
          </h3>
          <p className={`mt-2 text-sm ${body}`}>
            Trend visualization placeholder. Summarize rejected claim
            value by week or month.
          </p>
        </div>
      )}

      {view === "top-devices" && (
        <div className={`${cardBg} border border-border rounded-xl shadow-sm overflow-hidden`}>
          <table className="w-full text-sm">
            <thead className={`${tableHead} text-xs uppercase tracking-wide`}>
              <tr>
                <th className="px-6 py-3 text-left">Device</th>
                <th className="px-6 py-3 text-left">IMEI</th>
                <th className="px-6 py-3 text-left">Claims</th>
              </tr>
            </thead>
            <tbody>
              {topDevices.map((row) => (
                <tr key={row.imei} className="border-t border-border">
                  <td className={`px-6 py-4 font-medium ${heading}`}>
                    {row.device}
                  </td>
                  <td className={`px-6 py-4 ${tableCell}`}>{row.imei}</td>
                  <td className={`px-6 py-4 ${tableCell}`}>{row.count}</td>
                </tr>
              ))}
              {topDevices.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-muted">
                    No duplicate devices yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
