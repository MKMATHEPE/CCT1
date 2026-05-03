import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getCasesAssignedTo, type Case } from "../services/caseDomainService";
import { useAuth } from "../auth/useAuth";

type Row = {
  caseId: string;
  primaryImei: string;
  riskLevel: Case["riskLevel"];
  lastActivity: string;
  lastActivityTs: number;
};

export default function InvestigationsAssignedToMePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const rows = useMemo(() => {
    if (!user?.id) return [];
    return getCasesAssignedTo(user.id)
      .filter((item) => item.status !== "CLOSED")
      .map((item) => toRow(item))
      .sort((a, b) => a.lastActivityTs - b.lastActivityTs);
  }, [user]);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Investigations / Assigned to Me
          </h2>
          <p className="mt-1 text-sm text-muted">
            Cases currently assigned to your queue.
          </p>
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
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      row.riskLevel === "HIGH"
                        ? "bg-red-100 text-red-800"
                        : row.riskLevel === "MEDIUM"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {row.riskLevel}
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
                  You have no cases assigned right now.
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
