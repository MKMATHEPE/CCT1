import { useMemo } from "react";
import {
  getClaims,
  getClaimsGroupedByIMEI,
  type Claim,
} from "../services/deviceDataService";

type RiskLevel = "high" | "medium" | "pending";

type Props = {
  level: RiskLevel;
  title: string;
  description: string;
  onViewCase: (imei: string) => void;
};

type RiskRow = {
  id: number;
  imei: string;
  device: string;
  outcome: Claim["outcome"];
  amount: number;
  risk: RiskLevel;
  lastActivity: string;
};

export default function RiskQueuePage({
  level,
  title,
  description,
  onViewCase,
}: Props) {
  const rows = useMemo(() => {
    const grouped = getClaimsGroupedByIMEI();
    return getClaims()
      .map((claim) =>
        buildRiskRow(claim, grouped[claim.imei] ?? [])
      )
      .filter((row) => row.risk === level);
  }, [level]);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {title}
            </h2>
            <p className="mt-1 text-sm text-muted">{description}</p>
          </div>
          <div className="text-sm text-muted">
            {rows.length} alert{rows.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-6 py-3 text-left">Claim</th>
              <th className="px-6 py-3 text-left">IMEI</th>
              <th className="px-6 py-3 text-left">Outcome</th>
              <th className="px-6 py-3 text-left">Amount</th>
              <th className="px-6 py-3 text-left">Risk</th>
              <th className="px-6 py-3 text-left">Last Activity</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-6 py-4 font-medium text-gray-900">
                  {row.device}
                </td>
                <td className="px-6 py-4 text-gray-600">{row.imei}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      row.outcome === "rejected"
                        ? "bg-red-100 text-red-800"
                        : row.outcome === "approved"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {row.outcome.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  R {row.amount.toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      row.risk === "high"
                        ? "bg-red-100 text-red-800"
                        : row.risk === "medium"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {row.risk.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {row.lastActivity}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => onViewCase(row.imei)}
                    className="text-primary font-medium hover:underline"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-8 text-center text-muted"
                >
                  No items in this queue.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function buildRiskRow(
  claim: Claim,
  imeiClaims: Claim[]
): RiskRow {
  const isDuplicate = imeiClaims.length > 1;
  let risk: RiskLevel = "pending";

  if (claim.outcome === "rejected" || isDuplicate) {
    risk = "high";
  } else if (claim.outcome === "pending") {
    risk = "medium";
  }

  return {
    id: claim.id,
    imei: claim.imei,
    device: `${claim.brand} ${claim.model}`,
    outcome: claim.outcome,
    amount: claim.amount,
    risk,
    lastActivity: formatTimeAgo(claim.timestamp),
  };
}

function formatTimeAgo(timestamp: string): string {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} mins ago`;

  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours > 1 ? "s" : ""} ago`;
}
