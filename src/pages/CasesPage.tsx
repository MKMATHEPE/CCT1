import { useMemo, useState } from "react";
import {
  getClaimsGroupedByIMEI,
  type Claim,
} from "../services/deviceDataService";
import {
  addCaseNote,
  assignInvestigator,
  changeCaseStatus,
  createCase,
  getCase,
  setCaseRiskLevel,
  type CaseStatus,
} from "../services/caseService";
import { useAuth } from "../auth/useAuth";
import { writeAuditLog } from "../services/auditLogService";
import { exportCaseReportToPDF } from "../services/caseExportService";

type CaseFilter =
  | "open"
  | "closed"
  | "assigned"
  | "high-risk";

type Props = {
  filter: CaseFilter;
  title: string;
  description: string;
  onViewCase: (imei: string) => void;
};

type CaseRow = {
  imei: string;
  device: string;
  claimsCount: number;
  status: "Open" | "Closed" | "On Hold" | "In Review";
  risk: "High" | "Medium" | "Low";
  lastActivity: string;
  lastActivityTs: number;
  assignedToMe: boolean;
  assignedTo: string | null;
};

export default function CasesPage({
  filter,
  title,
  description,
  onViewCase,
}: Props) {
  const { user } = useAuth();
  const [caseVersion, setCaseVersion] = useState(0);
  const { rows, counts } = useMemo(() => {
    const grouped = getClaimsGroupedByIMEI();
    const items: CaseRow[] = Object.entries(grouped).map(
      ([imei, claims]) => buildCaseRow(imei, claims, user?.id ?? null)
    );

    const filtered = items.filter((row) => {
      if (filter === "open") return row.status !== "Closed";
      if (filter === "closed") return row.status === "Closed";
      if (filter === "assigned")
        return row.assignedToMe && row.status !== "Closed";
      if (filter === "high-risk")
        return row.risk === "High" && row.status !== "Closed";
      return true;
    });

    const counts = {
      open: items.filter((row) => row.status !== "Closed").length,
      closed: items.filter((row) => row.status === "Closed").length,
      assigned: items.filter((row) => row.assignedToMe).length,
      highRisk: items.filter((row) => row.risk === "High").length,
    };

    const sorted =
      filter === "open"
        ? [...filtered].sort(
            (a, b) => a.lastActivityTs - b.lastActivityTs
          )
        : filter === "closed"
          ? [...filtered].sort((a, b) => {
              const closedA = getCase(a.imei)?.closedAtUtc;
              const closedB = getCase(b.imei)?.closedAtUtc;
              const timeA = closedA
                ? new Date(closedA).getTime()
                : a.lastActivityTs;
              const timeB = closedB
                ? new Date(closedB).getTime()
                : b.lastActivityTs;
              return timeB - timeA;
            })
          : filter === "high-risk"
            ? [...filtered].sort((a, b) => {
                const escalatedA = getCase(a.imei)?.escalatedAtUtc;
                const escalatedB = getCase(b.imei)?.escalatedAtUtc;
                const timeA = escalatedA
                  ? new Date(escalatedA).getTime()
                  : a.lastActivityTs;
                const timeB = escalatedB
                  ? new Date(escalatedB).getTime()
                  : b.lastActivityTs;
                return timeB - timeA;
              })
            : filter === "assigned"
              ? [...filtered].sort((a, b) => {
                  const riskRank = (risk: CaseRow["risk"]) =>
                    risk === "High" ? 3 : risk === "Medium" ? 2 : 1;
                  const riskDiff = riskRank(b.risk) - riskRank(a.risk);
                  if (riskDiff !== 0) return riskDiff;
                  return a.lastActivityTs - b.lastActivityTs;
                })
              : filtered;

    return { rows: sorted, counts };
  }, [filter, caseVersion]);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {title}
            </h2>
            <p className="mt-1 text-sm text-muted">{description}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {filter === "closed" ? (
                <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                  Closed {counts.closed}
                </span>
              ) : (
                <>
                  <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                    Open {counts.open}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                    Closed {counts.closed}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    Assigned {counts.assigned}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                    High-risk {counts.highRisk}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="text-sm text-muted">
            {rows.length} case{rows.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-6 py-3 text-left">Case</th>
              <th className="px-6 py-3 text-left">IMEI</th>
              <th className="px-6 py-3 text-left">Claims</th>
              <th className="px-6 py-3 text-left">Status</th>
              {filter !== "closed" && (
                <th className="px-6 py-3 text-left">Assigned</th>
              )}
              {filter !== "closed" && (
                <th className="px-6 py-3 text-left">Risk</th>
              )}
              <th className="px-6 py-3 text-left">Last Activity</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.imei} className="border-t border-border">
                <td className="px-6 py-4 font-medium text-gray-900">
                  {row.device}
                </td>
                <td className="px-6 py-4 text-gray-600">{row.imei}</td>
                <td className="px-6 py-4">{row.claimsCount}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      row.status === "Open"
                        ? "bg-yellow-100 text-yellow-800"
                        : row.status === "Closed"
                          ? "bg-green-100 text-green-800"
                          : row.status === "In Review"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
                {filter !== "closed" && (
                  <td className="px-6 py-4 text-gray-600">
                    {row.assignedTo ?? "Unassigned"}
                  </td>
                )}
                {filter !== "closed" && (
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        row.risk === "High"
                          ? "bg-red-100 text-red-800"
                          : row.risk === "Medium"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {row.risk}
                    </span>
                  </td>
                )}
                <td className="px-6 py-4 text-gray-600">
                  {row.lastActivity}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {filter !== "open" && filter !== "closed" && (
                      <>
                        <select
                          value={
                            row.status === "On Hold"
                              ? "on_hold"
                              : row.status === "In Review"
                                ? "in_review"
                                : row.status.toLowerCase()
                          }
                          onChange={(e) => {
                            const nextStatus = e.target
                              .value as CaseStatus;
                            const record =
                              getCase(row.imei) ?? createCase(row.imei);
                            const previousStatus = record.status;
                            try {
                              const updated = changeCaseStatus(
                                row.imei,
                                nextStatus
                              );
                              if (updated) {
                                const actor = user?.id ?? "system";
                                const actorRole =
                                  user?.role ?? "unknown";
                                writeAuditLog({
                                  actor,
                                  actorRole,
                                  action: "CASE_STATUS_CHANGED",
                                  target: row.imei,
                                  outcome: "SUCCESS",
                                  context: `Case status changed to ${nextStatus}`,
                                  details: {
                                    from: previousStatus,
                                    to: nextStatus,
                                  },
                                });
                                setCaseVersion((v) => v + 1);
                              }
                            } catch (error) {
                              alert(
                                error instanceof Error
                                  ? error.message
                                  : "Invalid status change"
                              );
                            }
                          }}
                          className="px-2 py-1 border border-border rounded-md text-xs bg-white"
                        >
                          <option value="open">Open</option>
                          <option value="on_hold">On Hold</option>
                          <option value="in_review">In Review</option>
                          <option value="closed">Closed</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            const actor = user?.id ?? "system";
                            const actorRole = user?.role ?? "unknown";
                            if (!getCase(row.imei)) {
                              createCase(row.imei);
                            }
                            const updated = assignInvestigator(
                              row.imei,
                              actor
                            );
                            if (updated) {
                              writeAuditLog({
                                actor,
                                actorRole,
                                action: "CASE_ASSIGNED",
                                target: row.imei,
                                outcome: "SUCCESS",
                                context: `Assigned to ${actor}`,
                                details: { assignedTo: actor },
                              });
                              setCaseVersion((v) => v + 1);
                            }
                          }}
                          className="px-2 py-1 rounded-md text-xs border border-border text-gray-700 hover:border-primary hover:text-primary transition"
                        >
                          Assign to me
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const actor = user?.id ?? "system";
                            const actorRole = user?.role ?? "unknown";
                            const targetId = prompt(
                              "Assign investigator ID:",
                              row.assignedTo ?? ""
                            );
                            if (targetId === null) return;
                            const trimmed = targetId.trim();
                            if (!getCase(row.imei)) {
                              createCase(row.imei);
                            }
                            const updated = assignInvestigator(
                              row.imei,
                              trimmed || null
                            );
                            if (updated) {
                              writeAuditLog({
                                actor,
                                actorRole,
                                action: "CASE_ASSIGNED",
                                target: row.imei,
                                outcome: "SUCCESS",
                                context: trimmed
                                  ? `Assigned to ${trimmed}`
                                  : "Assignment cleared",
                                details: { assignedTo: trimmed || null },
                              });
                              setCaseVersion((v) => v + 1);
                            }
                          }}
                          className="px-2 py-1 rounded-md text-xs border border-border text-gray-700 hover:border-primary hover:text-primary transition"
                        >
                          Assign ID
                        </button>
                        {row.assignedTo && (
                          <button
                            type="button"
                            onClick={() => {
                              const actor = user?.id ?? "system";
                              const actorRole = user?.role ?? "unknown";
                              const updated = assignInvestigator(
                                row.imei,
                                null
                              );
                              if (updated) {
                                writeAuditLog({
                                  actor,
                                  actorRole,
                                  action: "CASE_ASSIGNED",
                                  target: row.imei,
                                  outcome: "SUCCESS",
                                  context: "Assignment cleared",
                                  details: { assignedTo: null },
                                });
                                setCaseVersion((v) => v + 1);
                              }
                            }}
                            className="px-2 py-1 rounded-md text-xs border border-border text-gray-700 hover:border-danger hover:text-danger transition"
                          >
                            Unassign
                          </button>
                        )}
                      </>
                    )}
                    {filter === "assigned" && null}
                    {filter === "open" &&
                      (user?.role === "manager" ||
                        user?.role === "admin") && (
                        <button
                          type="button"
                          onClick={() => {
                            const actor = user?.id ?? "system";
                            const actorRole = user?.role ?? "unknown";
                            if (!getCase(row.imei)) {
                              createCase(row.imei);
                            }
                            const updated = assignInvestigator(
                              row.imei,
                              actor
                            );
                            if (updated) {
                              writeAuditLog({
                                actor,
                                actorRole,
                                action: "CASE_ASSIGNED",
                                target: row.imei,
                                outcome: "SUCCESS",
                                context: `Assigned to ${actor}`,
                                details: { assignedTo: actor },
                              });
                              setCaseVersion((v) => v + 1);
                            }
                          }}
                          className="px-2 py-1 rounded-md text-xs border border-border text-gray-700 hover:border-primary hover:text-primary transition"
                        >
                          Assign Case
                        </button>
                    )}
                    {filter === "closed" &&
                      (user?.role === "manager" ||
                        user?.role === "admin") && (
                        <button
                          type="button"
                          onClick={() => {
                            exportCaseReportToPDF(row.imei);
                            const actor = user?.id ?? "system";
                            const actorRole = user?.role ?? "unknown";
                            writeAuditLog({
                              actor,
                              actorRole,
                              action: "CASE_EXPORTED",
                              target: row.imei,
                              outcome: "SUCCESS",
                              context: "Case report exported from Closed view",
                            });
                          }}
                          className="px-2 py-1 rounded-md text-xs border border-border text-gray-700 hover:border-primary hover:text-primary transition"
                        >
                          Export Case Report
                        </button>
                    )}
                    {filter === "open" ? null : filter === "assigned" ? (
                      <button
                        type="button"
                        onClick={() => onViewCase(row.imei)}
                        className="text-primary font-medium hover:underline"
                      >
                        Open Case
                      </button>
                    ) : filter === "high-risk" ? (
                      <button
                        type="button"
                        onClick={() => onViewCase(row.imei)}
                        className="text-primary font-medium hover:underline"
                      >
                        Open Case
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onViewCase(row.imei)}
                        className="text-primary font-medium hover:underline"
                      >
                        View
                      </button>
                    )}
                    {filter === "open" && (
                      <>
                        {(user?.role === "manager" ||
                          user?.role === "admin") && (
                          <button
                            type="button"
                            onClick={() => {
                              const actor = user?.id ?? "system";
                              const actorRole = user?.role ?? "unknown";
                              if (!getCase(row.imei)) {
                                createCase(row.imei);
                              }
                              const updated = assignInvestigator(
                                row.imei,
                                actor
                              );
                              if (updated) {
                                writeAuditLog({
                                  actor,
                                  actorRole,
                                  action: "CASE_ASSIGNED",
                                  target: row.imei,
                                  outcome: "SUCCESS",
                                  context: `Assigned to ${actor}`,
                                  details: { assignedTo: actor },
                                });
                                setCaseVersion((v) => v + 1);
                              }
                            }}
                            className="text-xs text-gray-600 hover:text-primary hover:underline"
                          >
                            Assign Case
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onViewCase(row.imei)}
                          className="text-xs text-gray-600 hover:text-primary hover:underline"
                        >
                          Open Case details
                        </button>
                      </>
                    )}
                    {filter === "high-risk" && (
                      <>
                        {(user?.role === "manager" ||
                          user?.role === "admin") && (
                          <button
                            type="button"
                            onClick={() => {
                              const actor = user?.id ?? "system";
                              const actorRole = user?.role ?? "unknown";
                              const targetId = prompt(
                                "Reassign investigator ID:",
                                row.assignedTo ?? ""
                              );
                              if (targetId === null) return;
                              const trimmed = targetId.trim();
                              if (!trimmed) return;
                              if (!getCase(row.imei)) {
                                createCase(row.imei);
                              }
                              const updated = assignInvestigator(
                                row.imei,
                                trimmed
                              );
                              if (updated) {
                                writeAuditLog({
                                  actor,
                                  actorRole,
                                  action: "CASE_ASSIGNED",
                                  target: row.imei,
                                  outcome: "SUCCESS",
                                  context: `Assigned to ${trimmed}`,
                                  details: { assignedTo: trimmed },
                                });
                                setCaseVersion((v) => v + 1);
                              }
                            }}
                            className="text-xs text-gray-600 hover:text-primary hover:underline"
                          >
                            Reassign Case
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const justification = prompt(
                              "Justification for escalation:"
                            );
                            if (!justification || !justification.trim())
                              return;
                            if (!getCase(row.imei)) {
                              createCase(row.imei);
                            }
                            const updated = setCaseRiskLevel(
                              row.imei,
                              "High",
                              justification.trim()
                            );
                            if (updated) {
                              const actor = user?.id ?? "system";
                              const actorRole = user?.role ?? "unknown";
                              writeAuditLog({
                                actor,
                                actorRole,
                                action: "CASE_RISK_UPDATED",
                                target: row.imei,
                                outcome: "SUCCESS",
                                context: "Case escalated to High risk",
                                details: {
                                  riskLevel: "High",
                                  justification: justification.trim(),
                                },
                              });
                              setCaseVersion((v) => v + 1);
                            }
                          }}
                          className="text-xs text-gray-600 hover:text-warning hover:underline"
                        >
                          Escalate
                        </button>
                        {(user?.role === "manager" ||
                          user?.role === "admin") && (
                          <button
                            type="button"
                            onClick={() => {
                              exportCaseReportToPDF(row.imei);
                              const actor = user?.id ?? "system";
                              const actorRole = user?.role ?? "unknown";
                              writeAuditLog({
                                actor,
                                actorRole,
                                action: "CASE_EXPORTED",
                                target: row.imei,
                                outcome: "SUCCESS",
                                context:
                                  "Case report exported from High-risk view",
                              });
                              setCaseVersion((v) => v + 1);
                            }}
                            className="text-xs text-gray-600 hover:text-primary hover:underline"
                          >
                            Export Case
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={filter === "closed" ? 6 : 8}
                  className="px-6 py-8 text-center text-muted"
                >
                  No cases match this view yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function buildCaseRow(
  imei: string,
  claims: Claim[],
  currentUserId: string | null
): CaseRow {
  const sorted = [...claims].sort(
    (a, b) =>
      new Date(b.timestamp).getTime() -
      new Date(a.timestamp).getTime()
  );
  const latest = sorted[0];
  const hasPending = claims.some((c) => c.outcome === "pending");
  const hasRejected = claims.some((c) => c.outcome === "rejected");
  const isDuplicate = claims.length > 1;
  const record = getCase(imei);

  let risk: CaseRow["risk"] = "Low";
  if (record?.riskLevel) {
    risk = record.riskLevel as CaseRow["risk"];
  } else if (hasRejected || isDuplicate) {
    risk = "High";
  } else if (hasPending) {
    risk = "Medium";
  }

  let status: CaseRow["status"] = hasPending ? "Open" : "Closed";
  if (record?.status === "on_hold") status = "On Hold";
  if (record?.status === "in_review") status = "In Review";
  if (record?.status === "open") status = "Open";
  if (record?.status === "closed") status = "Closed";

  return {
    imei,
    device: `${latest.brand} ${latest.model}`,
    claimsCount: claims.length,
    status,
    risk,
    lastActivity: formatTimeAgo(latest.timestamp),
    lastActivityTs: new Date(latest.timestamp).getTime(),
    assignedToMe: currentUserId
      ? record?.assignedTo === currentUserId
      : false,
    assignedTo: record?.assignedTo ?? null,
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
