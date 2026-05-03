import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  addCaseNote,
  assignCase,
  closeCase,
  getCaseById,
} from "../services/caseDomainService";
import { getClaims } from "../services/deviceDataService";
import { useAuth } from "../auth/useAuth";
import { writeAuditLog } from "../services/auditLogService";

export default function InvestigationCaseViewPage() {
  const { caseId } = useParams();
  const [version, setVersion] = useState(0);
  const [noteText, setNoteText] = useState("");
  const [showCloseFlow, setShowCloseFlow] = useState(false);
  const [closeStep, setCloseStep] = useState<1 | 2>(1);
  const [closeOutcome, setCloseOutcome] = useState("Fraud Confirmed");
  const [closeReason, setCloseReason] = useState("");
  const [ackReview, setAckReview] = useState(false);
  const [ackCompliance, setAckCompliance] = useState(false);
  const { user } = useAuth();
  const isAnalyst = user?.role === "analyst";
  const isManager = user?.role === "manager" || user?.role === "admin";
  const loggedViewRef = useRef<string | null>(null);
  const [assignTo, setAssignTo] = useState("");

  const record = useMemo(
    () => (caseId ? getCaseById(caseId) : null),
    [caseId, version]
  );
  const claims = useMemo(() => getClaims(), []);
  const linkedClaims = useMemo(() => {
    if (!record) return [];
    return claims.filter((c) => record.linkedClaimIds.includes(c.id));
  }, [claims, record]);
  const evidenceClaims = useMemo(() => {
    if (!record?.evidenceSnapshot) return [];
    return [...record.evidenceSnapshot.claims].sort(
      (a, b) =>
        new Date(a.recordedAtUtc).getTime() -
        new Date(b.recordedAtUtc).getTime()
    );
  }, [record]);

  useEffect(() => {
    if (record?.status !== "CLOSED") return;
    setShowCloseFlow(false);
    setCloseStep(1);
  }, [record?.status]);

  if (!record) {
    return (
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">
          Case Not Found
        </h2>
        <p className="mt-1 text-sm text-muted">
          Unable to locate this case.
        </p>
      </div>
    );
  }

  useEffect(() => {
    if (!record) return;
    if (loggedViewRef.current === record.caseId) return;
    loggedViewRef.current = record.caseId;
    const actor = user?.id ?? "system";
    const actorRole = user?.role ?? "unknown";
    writeAuditLog({
      actor,
      actorRole,
      action: "CASE_VIEWED",
      target: record.caseId,
      outcome: "SUCCESS",
      context: "Case view opened",
    });
  }, [record, user]);

  function handleCloseCase() {
    const reason = closeReason.trim();
    if (!reason || !ackCompliance) return;
    const actor = user?.id ?? "system";
    const actorRole = user?.role ?? "unknown";
    closeCase({
      caseId: record.caseId,
      reason,
      outcome: closeOutcome,
      closedBy: actor,
    });
    writeAuditLog({
      actor,
      actorRole,
      action: "CASE_CLOSED",
      target: record.caseId,
      outcome: "SUCCESS",
      context: "Case closed",
      details: {
        reason,
        closeOutcome,
      },
    });
    setCloseReason("");
    setAckCompliance(false);
    setAckReview(false);
    setShowCloseFlow(false);
    setCloseStep(1);
    setVersion((v) => v + 1);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Investigations / Case {record.caseId}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Created {new Date(record.createdAt).toLocaleString()}
            </p>
            {record.status === "CLOSED" && record.closeOutcome && (
              <p className="mt-1 text-sm text-muted">
                Closure outcome:{" "}
                <span className="font-semibold text-gray-900">
                  {record.closeOutcome}
                </span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                record.status === "CLOSED"
                  ? "bg-green-100 text-green-800"
                  : record.status === "IN_REVIEW"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {record.status}
            </span>
            {record.status === "CLOSED" && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                Closed
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-muted">
            Risk Level
          </div>
          <div className="mt-2 text-lg font-semibold text-gray-900">
            {record.riskLevel}
          </div>
        </div>
        <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-muted">
            Assigned To
          </div>
          <div className="mt-2 text-lg font-semibold text-gray-900">
            {record.assignedTo ?? "Unassigned"}
          </div>
          {isManager && record.status !== "CLOSED" && (
            <div className="mt-3 flex items-center gap-2">
              <select
                value={assignTo}
                onChange={(e) => setAssignTo(e.target.value)}
                className="border border-border rounded text-xs px-2 py-1 bg-white"
              >
                <option value="">Assign</option>
                <option value="1">Fraud Analyst</option>
                <option value="priya.nair">Priya Nair</option>
                <option value="mike.dlamini">Mike Dlamini</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  if (!assignTo) return;
                  const updated = assignCase(record.caseId, assignTo);
                  if (!updated) return;
                  const actor = user?.id ?? "system";
                  const actorRole = user?.role ?? "unknown";
                  writeAuditLog({
                    actor,
                    actorRole,
                    action: "CASE_ASSIGNED",
                    target: record.caseId,
                    outcome: "SUCCESS",
                    context: "Case assigned from Case Detail",
                    details: { assignedTo: assignTo },
                  });
                  setAssignTo("");
                  setVersion((v) => v + 1);
                }}
                className="text-xs text-gray-700 hover:text-primary hover:underline"
              >
                Assign
              </button>
            </div>
          )}
        </div>
        <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-muted">
            Closed At
          </div>
          <div className="mt-2 text-lg font-semibold text-gray-900">
            {record.closedAt
              ? new Date(record.closedAt).toLocaleString()
              : "—"}
          </div>
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">
          Case Context
        </h3>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
          <div>
            <span className="text-muted">Primary device:</span>{" "}
            {record.evidenceSnapshot?.serial ??
              record.linkedIMEIs[0] ??
              "Unknown"}
          </div>
          <div>
            <span className="text-muted">IMEI:</span>{" "}
            {record.evidenceSnapshot?.imei ??
              record.linkedIMEIs[0] ??
              "—"}
          </div>
          <div>
            <span className="text-muted">Device make/model:</span>{" "}
            {record.evidenceSnapshot?.brand ||
            record.evidenceSnapshot?.model
              ? `${record.evidenceSnapshot?.brand ?? ""} ${
                  record.evidenceSnapshot?.model ?? ""
                }`.trim()
              : "—"}
          </div>
          <div>
            <span className="text-muted">Evidence source:</span>{" "}
            {record.evidenceSnapshot
              ? "Duplicate Device Detection"
              : "Manual Review"}
          </div>
          <div>
            <span className="text-muted">Insurers involved:</span>{" "}
            {record.evidenceSnapshot?.insurers?.length
              ? record.evidenceSnapshot.insurers.join(", ")
              : "Unknown"}
          </div>
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Frozen Evidence Snapshot
          </h3>
          <span className="text-xs text-muted">Read-only</span>
        </div>
        {record.evidenceSnapshot ? (
          <div className="mt-4 border border-border rounded-md overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 text-xs uppercase tracking-wide text-muted">
              Evidence Timeline
            </div>
            <table className="w-full text-sm">
              <thead className="bg-white text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-2 text-left">Insurer</th>
                  <th className="px-4 py-2 text-left">Outcome</th>
                  <th className="px-4 py-2 text-left">Loss Type</th>
                  <th className="px-4 py-2 text-left">Date Recorded</th>
                </tr>
              </thead>
              <tbody>
                {evidenceClaims.map((claim) => (
                  <tr key={claim.id} className="border-t border-border">
                    <td className="px-4 py-2">{claim.insurer}</td>
                    <td className="px-4 py-2">{claim.outcome}</td>
                    <td className="px-4 py-2">—</td>
                    <td className="px-4 py-2 text-gray-600">
                      {new Date(claim.recordedAtUtc).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-2 text-sm text-muted">
            No frozen evidence snapshot available.
          </div>
        )}
      </div>

      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">
          Investigator Notes
        </h3>
        {isAnalyst && record.status !== "CLOSED" && (
          <div className="mt-3 flex gap-2">
            <input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note to this case..."
              className="flex-1 px-3 py-2 border border-border rounded-md text-sm"
            />
            <button
              type="button"
              onClick={() => {
                const trimmed = noteText.trim();
                if (!trimmed) return;
                const author = user?.name ?? user?.id ?? "Unknown";
                addCaseNote(record.caseId, {
                  author,
                  content: trimmed,
                });
                const actor = user?.id ?? "system";
                const actorRole = user?.role ?? "unknown";
                writeAuditLog({
                  actor,
                  actorRole,
                  action: "CASE_NOTE_ADDED",
                  target: record.caseId,
                  outcome: "SUCCESS",
                  context: "Case note added",
                  details: { note: trimmed },
                });
                setNoteText("");
                setVersion((v) => v + 1);
              }}
              className="px-3 py-2 rounded-md text-sm font-semibold bg-white border border-border text-gray-700 hover:border-primary hover:text-primary transition"
            >
              Add Note
            </button>
          </div>
        )}
        <div className="mt-3 space-y-3 text-sm">
          {record.notes.length > 0 ? (
            record.notes.map((note, index) => (
              <div
                key={`${note.id}-${index}`}
                className="border border-border rounded-md px-3 py-2 bg-gray-50"
              >
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>{note.author}</span>
                  <span>
                    {new Date(note.createdAtUtc).toLocaleString()}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-800">
                  {note.content}
                </div>
              </div>
            ))
          ) : (
            <div className="text-muted">No notes yet.</div>
          )}
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">
          Case Actions
        </h3>
        {record.status === "CLOSED" ? (
          <div className="mt-2 text-sm text-muted">
            No actions available for closed cases.
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            {!showCloseFlow && isAnalyst ? (
              <button
                type="button"
                onClick={() => setShowCloseFlow(true)}
                className="px-3 py-2 rounded-md text-sm font-semibold border border-border bg-white text-gray-900 hover:border-primary hover:text-primary transition"
              >
                Close Case
              </button>
            ) : isAnalyst ? (
              <div className="relative z-10">
                <div className="fixed inset-0 bg-black/40" />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-semibold text-gray-900">
                        Close Case
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCloseFlow(false);
                          setCloseStep(1);
                          setAckReview(false);
                          setAckCompliance(false);
                          setCloseReason("");
                        }}
                        className="text-sm text-muted"
                      >
                        Cancel
                      </button>
                    </div>

                    {closeStep === 1 && (
                      <div className="space-y-4">
                        <div className="text-sm text-muted">
                          This case will be permanently closed.
                        </div>
                        <div className="border border-border rounded-lg p-4 text-sm text-gray-700 space-y-2">
                          <div>
                            <span className="text-muted">Case ID:</span>{" "}
                            {record.caseId}
                          </div>
                          <div>
                            <span className="text-muted">
                              Primary device:
                            </span>{" "}
                            {record.evidenceSnapshot?.serial ??
                              record.linkedIMEIs[0] ??
                              "Unknown"}
                          </div>
                          <div>
                            <span className="text-muted">IMEI:</span>{" "}
                            {record.evidenceSnapshot?.imei ?? "—"}
                          </div>
                          <div>
                            <span className="text-muted">
                              Evidence source:
                            </span>{" "}
                            {record.evidenceSnapshot
                              ? "Duplicate Device Detection"
                              : "Manual Review"}
                          </div>
                          <div>
                            <span className="text-muted">
                              Linked claims:
                            </span>{" "}
                            {record.evidenceSnapshot?.claimCount ??
                              record.linkedClaimIds.length}
                          </div>
                          <div>
                            <span className="text-muted">
                              Insurers involved:
                            </span>{" "}
                            {record.evidenceSnapshot?.insurers?.length
                              ? record.evidenceSnapshot.insurers.join(", ")
                              : "Unknown"}
                          </div>
                          <div>
                            <span className="text-muted">Risk level:</span>{" "}
                            {record.riskLevel}
                          </div>
                          <div>
                            <span className="text-muted">
                              Investigation notes:
                            </span>
                            <div className="mt-2 space-y-2">
                              {record.notes.length > 0 ? (
                                record.notes.map((note) => (
                                  <div
                                    key={note.id}
                                    className="rounded-md border border-border bg-gray-50 px-3 py-2"
                                  >
                                    <div className="text-xs text-muted flex items-center justify-between">
                                      <span>{note.author}</span>
                                      <span>
                                        {new Date(
                                          note.createdAtUtc
                                        ).toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="mt-1 text-sm text-gray-800">
                                      {note.content}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-muted">
                                  No notes recorded.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <label className="flex items-start gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={ackReview}
                            onChange={(e) =>
                              setAckReview(e.target.checked)
                            }
                            className="mt-1"
                          />
                          I have reviewed the case evidence and notes.
                        </label>

                        <div className="flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setShowCloseFlow(false);
                              setCloseStep(1);
                              setAckReview(false);
                              setAckCompliance(false);
                              setCloseReason("");
                            }}
                            className="text-sm text-muted"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!ackReview) return;
                              setCloseStep(2);
                              const actor = user?.id ?? "system";
                              const actorRole =
                                user?.role ?? "unknown";
                              writeAuditLog({
                                actor,
                                actorRole,
                                action: "CASE_CLOSE_INITIATED",
                                target: record.caseId,
                                outcome: "SUCCESS",
                                context:
                                  "Close case review completed",
                                details: { closeOutcome },
                              });
                            }}
                            disabled={!ackReview}
                            className="px-4 py-2 rounded text-sm font-semibold bg-white border border-border text-gray-700 hover:border-primary hover:text-primary transition disabled:opacity-50"
                          >
                            Continue
                          </button>
                        </div>
                      </div>
                    )}

                    {closeStep === 2 && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs text-muted">
                            Closure Outcome
                          </label>
                          <select
                            value={closeOutcome}
                            onChange={(e) =>
                              setCloseOutcome(e.target.value)
                            }
                            className="w-full border border-border px-3 py-2 rounded text-sm bg-white"
                          >
                            <option value="Fraud Confirmed">
                              Fraud Confirmed
                            </option>
                            <option value="Duplicate Claim Prevented">
                              Duplicate Claim Prevented
                            </option>
                            <option value="False Positive">
                              False Positive
                            </option>
                            <option value="Insufficient Evidence">
                              Insufficient Evidence
                            </option>
                            <option value="Withdrawn / No Further Action">
                              Withdrawn / No Further Action
                            </option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs text-muted">
                            Closure justification (audited)
                          </label>
                          <textarea
                            value={closeReason}
                            onChange={(e) =>
                              setCloseReason(e.target.value)
                            }
                            placeholder="Explain why this case is being closed"
                            className="w-full border border-border rounded-md p-2 text-sm"
                            rows={3}
                          />
                        </div>

                        <label className="flex items-start gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={ackCompliance}
                            onChange={(e) =>
                              setAckCompliance(e.target.checked)
                            }
                            className="mt-1"
                          />
                          I confirm this case closure decision is accurate
                          and complete.
                        </label>

                        <div className="flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setCloseStep(1)}
                            className="text-sm text-muted"
                          >
                            Back
                          </button>
                          <button
                            type="button"
                            onClick={handleCloseCase}
                            disabled={
                              !ackCompliance || closeReason.trim().length === 0
                            }
                            className="px-4 py-2 rounded text-sm font-semibold border border-border bg-white text-gray-900 hover:border-primary hover:text-primary transition disabled:opacity-50"
                          >
                            Close Case
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted">
                You do not have permission to close cases.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
