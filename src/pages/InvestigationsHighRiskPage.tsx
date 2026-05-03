import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  getHighRiskCases,
  type Case,
} from "../services/caseDomainService";

type Row = {
  caseId: string;
  primaryImei: string;
  riskLevel: Case["riskLevel"];
  lastActivity: string;
  lastActivityTs: number;
};

type Props = {
  onOpenCase?: () => void;
};

export default function InvestigationsHighRiskPage({ onOpenCase }: Props) {
  const navigate = useNavigate();

  const rows = useMemo(() => {
    return getHighRiskCases()
      .filter((item) => item.status !== "CLOSED")
      .map((item) => toRow(item))
      .sort((a, b) => b.lastActivityTs - a.lastActivityTs);
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Investigations / High-Risk Cases
            </h2>
            <p className="mt-1 text-sm text-muted">
              Escalated cases requiring immediate attention.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/investigations/assigned")}
              className="px-3 py-2 rounded-md text-sm font-semibold bg-white border border-border text-gray-700 hover:border-primary hover:text-primary transition"
            >
              Assigned to Me
            </button>
            <button
              type="button"
              onClick={() => navigate("/investigations/high-risk")}
              className="px-3 py-2 rounded-md text-sm font-semibold bg-white border border-border text-gray-700 hover:border-primary hover:text-primary transition"
            >
              High-Risk
            </button>
            {onOpenCase && (
              <button
                type="button"
                onClick={onOpenCase}
                className="px-3 py-2 rounded-md text-sm font-semibold bg-primary text-white hover:brightness-95 transition"
              >
                Open Case
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-6 py-3 text-left">Case ID</th>
              <th className="px-6 py-3 text-left">Primary Device</th>
              <th className="px-6 py-3 text-left">Risk</th>
              <th className="px-6 py-3 text-left">Last Activity</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.caseId} className="border-t border-border">
                <td className="px-6 py-4 font-medium text-gray-900">
                  {row.caseId}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {row.primaryImei}
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                    HIGH
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {row.lastActivity}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/investigations/cases/${row.caseId}`)
                    }
                    className="text-primary font-medium hover:underline"
                  >
                    View Case
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-muted"
                >
                  No high-risk cases yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function toRow(item: Case): Row {
  const primaryImei = item.linkedIMEIs[0] ?? "Unknown";
  const lastActivityTs = new Date(item.createdAt).getTime();

  return {
    caseId: item.caseId,
    primaryImei,
    riskLevel: item.riskLevel,
    lastActivity: new Date(item.createdAt).toLocaleString(),
    lastActivityTs,
  };
}
