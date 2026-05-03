import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  assignCase,
  getOpenCases,
  type Case,
} from "../services/caseDomainService";
import { useAuth } from "../auth/useAuth";
import { writeAuditLog } from "../services/auditLogService";

type Row = {
  caseId: string;
  primaryImei: string;
  riskLevel: Case["riskLevel"];
  assignedTo?: string;
  lastActivity: string;
  lastActivityTs: number;
};

type Props = {
  onOpenCase?: () => void;
};

export default function InvestigationsOpenCasesPage({
  onOpenCase,
}: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManager = user?.role === "manager" || user?.role === "admin";
  const [version, setVersion] = useState(0);
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  const investigators = [
    { id: "1", name: "Fraud Analyst" },
    { id: "priya.nair", name: "Priya Nair" },
    { id: "mike.dlamini", name: "Mike Dlamini" },
  ];

  const rows = useMemo(() => {
    return getOpenCases()
      .map((item) => toRow(item))
      .sort((a, b) => a.lastActivityTs - b.lastActivityTs);
  }, [version]);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Investigations / Open Cases
            </h2>
            <p className="mt-1 text-sm text-muted">
              All active cases (status not closed), ordered by longest
              waiting first.
            </p>
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
              <th className="px-6 py-3 text-left">Assigned</th>
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
                  {row.assignedTo ?? "Unassigned"}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {row.lastActivity}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/investigations/cases/${row.caseId}`)
                      }
                      className="text-primary font-medium hover:underline"
                    >
                      View Case
                    </button>
                    {isManager && (
                      <div className="flex items-center gap-2">
                        <select
                          value={assignments[row.caseId] ?? ""}
                          onChange={(e) =>
                            setAssignments((prev) => ({
                              ...prev,
                              [row.caseId]: e.target.value,
                            }))
                          }
                          className="border border-border rounded text-xs px-2 py-1 bg-white"
                        >
                          <option value="">Assign</option>
                          {investigators.map((person) => (
                            <option key={person.id} value={person.id}>
                              {person.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            const selected = assignments[row.caseId];
                            if (!selected) return;
                            const updated = assignCase(
                              row.caseId,
                              selected
                            );
                            if (!updated) return;
                            const actor = user?.id ?? "system";
                            const actorRole = user?.role ?? "unknown";
                            writeAuditLog({
                              actor,
                              actorRole,
                              action: "CASE_ASSIGNED",
                              target: row.caseId,
                              outcome: "SUCCESS",
                              context: "Case assigned from Open Cases",
                              details: { assignedTo: selected },
                            });
                            setAssignments((prev) => ({
                              ...prev,
                              [row.caseId]: "",
                            }));
                            setVersion((v) => v + 1);
                          }}
                          className="text-xs text-gray-700 hover:text-primary hover:underline"
                        >
                          Assign
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-8 text-center text-muted"
                >
                  No open cases yet.
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
    assignedTo: item.assignedTo,
    lastActivity: new Date(item.createdAt).toLocaleString(),
    lastActivityTs,
  };
}
