import { useMemo, useState } from "react";
import {
  getClaims,
  getClaimsByIMEI,
} from "../services/deviceDataService";
import type { Claim } from "../services/deviceDataService";
import {
  addCaseNote,
  assignInvestigator,
  changeCaseStatus,
  createCase,
  deleteCaseNote,
  getCase,
  linkClaimToCase,
  linkDeviceToCase,
  updateCaseNote,
  type CaseStatus,
} from "../services/caseService";
import { useAuth } from "../auth/useAuth";
import { writeAuditLog } from "../services/auditLogService";
import { getInvestigators } from "../services/investigatorService";
import { exportCaseReportToPDF } from "../services/caseExportService";

type Props = {
  imei: string | null;
  onClose: () => void;
  readOnly?: boolean;
  allowReopen?: boolean;
  allowReassign?: boolean;
  onOpenCase?: (imei: string) => void;
};

export default function ClaimDrawer({
  imei,
  onClose,
  readOnly = false,
  allowReopen = true,
  allowReassign = true,
  onOpenCase,
}: Props) {
  const claims: Claim[] = imei ? getClaimsByIMEI(imei) : [];
  const { user } = useAuth();
  const [noteText, setNoteText] = useState("");
  const [timelineOpen, setTimelineOpen] = useState(true);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [selectedInvestigator, setSelectedInvestigator] = useState("");
  const [selectedClaimId, setSelectedClaimId] = useState("");
  const [selectedDevice, setSelectedDevice] = useState("");
  const [, setCaseVersion] = useState(0);
  const caseRecord = useMemo(() => (imei ? getCase(imei) : null), [imei]);

  const investigators = useMemo(() => getInvestigators(), []);
  const allClaims = useMemo(() => getClaims(), []);
  const claimOptions = useMemo(
    () =>
      allClaims.map((claim) => ({
        id: claim.id,
        label: `#${claim.id} • ${claim.brand} ${claim.model} (${claim.imei})`,
      })),
    [allClaims]
  );
  const deviceOptions = useMemo(() => {
    const imeis = new Set(allClaims.map((claim) => claim.imei));
    return Array.from(imeis);
  }, [allClaims]);

  if (!imei) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside className="absolute top-0 right-0 h-full w-[460px] bg-white border-l border-border shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex justify-between items-start">
          <div>
            <div className="text-xs text-muted uppercase tracking-wide">
              Device IMEI
            </div>
            <div className="font-semibold">{imei}</div>
            {caseRecord && (
              <div className="mt-2 text-xs text-muted">
                Case status:{" "}
                <span className="font-semibold text-gray-700">
                  {caseRecord.status.toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-sm text-primary hover:underline"
          >
            Close
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setTimelineOpen((prev) => !prev)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-primary transition"
              aria-expanded={timelineOpen}
            >
              Case Timeline
              <span className="text-xs text-muted">
                {timelineOpen ? "Hide" : "Show"}
              </span>
            </button>
            {!caseRecord && (
              <button
                type="button"
                onClick={() => {
                  if (onOpenCase) {
                    onOpenCase(imei);
                  }
                }}
                className="px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-white hover:brightness-95 transition"
              >
                Open Case
              </button>
            )}
          </div>

          {caseRecord && timelineOpen && (
            <div className="space-y-2">
              {caseRecord.history.map((event, index) => (
                <div
                  key={`${event.timestampUtc}-${index}`}
                  className="text-xs text-gray-700 bg-white border border-border rounded-md px-3 py-2"
                >
                  <div className="font-semibold">{event.summary}</div>
                  <div className="text-muted">
                    {new Date(event.timestampUtc).toLocaleString()}
                  </div>
                </div>
              ))}
              {caseRecord.history.length === 0 && (
                <div className="text-xs text-muted">
                  No case events yet.
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            {claims.map((claim) => (
              <div
                key={claim.id}
                className="border border-border rounded-lg p-4 bg-gray-50"
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="font-medium">
                    {claim.brand} {claim.model}
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      claim.outcome === "rejected"
                        ? "bg-red-100 text-red-700"
                        : claim.outcome === "approved"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {claim.outcome.toUpperCase()}
                  </span>
                </div>

                <div className="text-sm text-muted mb-1">
                  Claim Amount: R {claim.amount.toLocaleString()}
                </div>

                <div className="text-xs text-muted">
                  Submitted {new Date(claim.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Case Notes
            </h3>
            {caseRecord ? (
              <>
                {!readOnly && (
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
                        if (!getCase(imei)) {
                          createCase(imei);
                        }
                        const updated = addCaseNote(imei, trimmed);
                        const actor = user?.id ?? "system";
                        const actorRole = user?.role ?? "unknown";
                        writeAuditLog({
                          actor,
                          actorRole,
                          action: "CASE_NOTE_ADDED",
                          target: imei,
                          outcome: "SUCCESS",
                          context: "Case note added",
                          details: { note: trimmed },
                        });
                        setNoteText("");
                        if (updated) {
                          setCaseVersion((v) => v + 1);
                        }
                      }}
                      className="px-3 py-2 rounded-md text-sm font-semibold bg-white border border-border text-gray-700 hover:border-primary hover:text-primary transition"
                    >
                      Add note
                    </button>
                  </div>
                )}

                <div className="mt-3 space-y-2">
                  {(caseRecord?.notes ?? []).map((note, index) => (
                    <div
                      key={`${index}-${note}`}
                      className="text-sm text-gray-700 bg-white border border-border rounded-md px-3 py-2"
                    >
                      {!readOnly && editingIndex === index ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={editingText}
                            onChange={(e) =>
                              setEditingText(e.target.value)
                            }
                            className="w-full border border-border rounded-md p-2 text-sm"
                            rows={3}
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const trimmed = editingText.trim();
                                if (!trimmed) return;
                                const updated = updateCaseNote(
                                  imei,
                                  index,
                                  trimmed
                                );
                                if (updated) {
                                  const actor = user?.id ?? "system";
                                  const actorRole =
                                    user?.role ?? "unknown";
                                  writeAuditLog({
                                    actor,
                                    actorRole,
                                    action: "CASE_NOTE_UPDATED",
                                    target: imei,
                                    outcome: "SUCCESS",
                                    context: "Case note updated",
                                    details: {
                                      note: trimmed,
                                      index,
                                    },
                                  });
                                  setCaseVersion((v) => v + 1);
                                  setEditingIndex(null);
                                  setEditingText("");
                                }
                              }}
                              className="px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-white hover:brightness-95 transition"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingIndex(null);
                                setEditingText("");
                              }}
                              className="px-3 py-1.5 rounded-md text-xs font-semibold border border-border text-gray-700 hover:border-primary hover:text-primary transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">{note}</div>
                          {!readOnly && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingIndex(index);
                                  setEditingText(note);
                                }}
                                className="text-xs text-primary hover:underline"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const ok = confirm(
                                    "Delete this note?"
                                  );
                                  if (!ok) return;
                                const updated = deleteCaseNote(
                                  imei,
                                  index
                                );
                                if (updated) {
                                    const actor = user?.id ?? "system";
                                    const actorRole =
                                      user?.role ?? "unknown";
                                    writeAuditLog({
                                      actor,
                                      actorRole,
                                      action: "CASE_NOTE_DELETED",
                                      target: imei,
                                      outcome: "SUCCESS",
                                    context: "Case note deleted",
                                    details: { index },
                                  });
                                  setCaseVersion((v) => v + 1);
                                }
                              }}
                                className="text-xs text-danger hover:underline"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {caseRecord?.notes.length === 0 && (
                    <div className="text-sm text-muted">
                      No notes yet.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-2 text-sm text-muted">
                Create a case to start tracking notes.
              </div>
            )}
          </div>

          {!readOnly && (
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Case Controls
              </h3>
              {caseRecord ? (
                <div className="mt-3 space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-muted">
                    Case status
                  </label>
                  <div className="flex gap-2">
                    <select
                      defaultValue={caseRecord.status}
                      onChange={(e) => {
                        const nextStatus = e.target
                          .value as CaseStatus;
                        try {
                          const updated = changeCaseStatus(
                            imei,
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
                              target: imei,
                              outcome: "SUCCESS",
                              context: `Case status changed to ${nextStatus}`,
                              details: {
                                from: caseRecord.status,
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
                      className="flex-1 px-3 py-2 border border-border rounded-md text-sm bg-white"
                      disabled={readOnly}
                    >
                      <option value="open">Open</option>
                      <option value="on_hold">On Hold</option>
                      <option value="in_review">In Review</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs text-muted">
                    Assign investigator
                  </label>
                  <div className="flex gap-2">
                    <input
                      list="investigator-options"
                      value={selectedInvestigator}
                      onChange={(e) =>
                        setSelectedInvestigator(e.target.value)
                      }
                      placeholder="Search investigator"
                      className="flex-1 px-3 py-2 border border-border rounded-md text-sm"
                      disabled={readOnly}
                    />
                    <datalist id="investigator-options">
                      {investigators.map((inv) => (
                        <option
                          key={inv.id}
                          value={inv.id}
                          label={`${inv.name} (${inv.id})`}
                        />
                      ))}
                    </datalist>
                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = selectedInvestigator.trim();
                          const updated = assignInvestigator(
                            imei,
                            trimmed || null
                          );
                        if (updated) {
                          const actor = user?.id ?? "system";
                          const actorRole = user?.role ?? "unknown";
                          writeAuditLog({
                            actor,
                            actorRole,
                            action: "CASE_ASSIGNED",
                            target: imei,
                            outcome: "SUCCESS",
                            context: trimmed
                              ? `Assigned to ${trimmed}`
                              : "Assignment cleared",
                            details: { assignedTo: trimmed || null },
                          });
                          setCaseVersion((v) => v + 1);
                          setSelectedInvestigator("");
                        }
                      }}
                      className="px-3 py-2 rounded-md text-sm font-semibold bg-white border border-border text-gray-700 hover:border-primary hover:text-primary transition disabled:opacity-50"
                      disabled={readOnly || !selectedInvestigator.trim()}
                    >
                      Apply
                    </button>
                  </div>
                  {caseRecord.assignedTo && (
                    <div className="text-xs text-muted">
                      Assigned to:{" "}
                      <span className="font-semibold text-gray-700">
                        {caseRecord.assignedTo}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs text-muted">
                    Link claim
                  </label>
                  <div className="flex gap-2">
                    <input
                      list="claim-options"
                      value={selectedClaimId}
                      onChange={(e) => setSelectedClaimId(e.target.value)}
                      placeholder="Search claim ID"
                      className="flex-1 px-3 py-2 border border-border rounded-md text-sm"
                      disabled={readOnly}
                    />
                    <datalist id="claim-options">
                      {claimOptions.map((claim) => (
                        <option
                          key={claim.id}
                          value={String(claim.id)}
                          label={claim.label}
                        />
                      ))}
                    </datalist>
                    <button
                      type="button"
                      onClick={() => {
                        const id = Number(selectedClaimId);
                        if (!Number.isFinite(id)) return;
                        const updated = linkClaimToCase(imei, id);
                        if (updated) {
                          const actor = user?.id ?? "system";
                          const actorRole = user?.role ?? "unknown";
                          writeAuditLog({
                            actor,
                            actorRole,
                            action: "CASE_LINKED_CLAIM",
                            target: imei,
                            outcome: "SUCCESS",
                            context: `Linked claim ${id}`,
                            details: { claimId: id },
                          });
                          setCaseVersion((v) => v + 1);
                          setSelectedClaimId("");
                        }
                      }}
                      className="px-3 py-2 rounded-md text-sm font-semibold bg-white border border-border text-gray-700 hover:border-primary hover:text-primary transition disabled:opacity-50"
                      disabled={readOnly || !selectedClaimId.trim()}
                    >
                      Link
                    </button>
                  </div>
                  {caseRecord.linkedClaims.length > 0 && (
                    <div className="text-xs text-muted">
                      Linked claims:{" "}
                      {caseRecord.linkedClaims.join(", ")}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs text-muted">
                    Link device
                  </label>
                  <div className="flex gap-2">
                    <input
                      list="device-options"
                      value={selectedDevice}
                      onChange={(e) => setSelectedDevice(e.target.value)}
                      placeholder="Search device IMEI"
                      className="flex-1 px-3 py-2 border border-border rounded-md text-sm"
                      disabled={readOnly}
                    />
                    <datalist id="device-options">
                      {deviceOptions.map((deviceImei) => (
                        <option key={deviceImei} value={deviceImei} />
                      ))}
                    </datalist>
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = selectedDevice.trim();
                        if (!trimmed) return;
                        const updated = linkDeviceToCase(imei, trimmed);
                        if (updated) {
                          const actor = user?.id ?? "system";
                          const actorRole = user?.role ?? "unknown";
                          writeAuditLog({
                            actor,
                            actorRole,
                            action: "CASE_LINKED_DEVICE",
                            target: imei,
                            outcome: "SUCCESS",
                            context: `Linked device ${trimmed}`,
                            details: { deviceImei: trimmed },
                          });
                          setCaseVersion((v) => v + 1);
                          setSelectedDevice("");
                        }
                      }}
                      className="px-3 py-2 rounded-md text-sm font-semibold bg-white border border-border text-gray-700 hover:border-primary hover:text-primary transition disabled:opacity-50"
                      disabled={readOnly || !selectedDevice.trim()}
                    >
                      Link
                    </button>
                  </div>
                  {caseRecord.linkedDevices.length > 0 && (
                    <div className="text-xs text-muted">
                      Linked devices:{" "}
                      {caseRecord.linkedDevices.join(", ")}
                    </div>
                  )}
                </div>
              </div>
              ) : (
                <div className="mt-2 text-sm text-muted">
                  Create a case to manage status, assignment, and links.
                </div>
              )}
            </div>
          )}

          {caseRecord && readOnly && (
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Case Actions
              </h3>
              <div className="mt-3 space-y-3">
                {(user?.role === "manager" || user?.role === "admin") && (
                  <button
                    type="button"
                    onClick={() => {
                      exportCaseReportToPDF(imei);
                      const actor = user?.id ?? "system";
                      const actorRole = user?.role ?? "unknown";
                      writeAuditLog({
                        actor,
                        actorRole,
                        action: "CASE_EXPORTED",
                        target: imei,
                        outcome: "SUCCESS",
                        context: "Case report exported",
                      });
                    }}
                    className="px-3 py-2 rounded-md text-sm font-semibold bg-white border border-border text-gray-700 hover:border-primary hover:text-primary transition"
                  >
                    Export Case Report
                  </button>
                )}

                {allowReassign &&
                  (user?.role === "manager" ||
                    user?.role === "admin") && (
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-muted">
                        Reassign case
                      </label>
                      <div className="flex gap-2">
                        <input
                          list="investigator-options"
                          value={selectedInvestigator}
                          onChange={(e) =>
                            setSelectedInvestigator(e.target.value)
                          }
                          placeholder="Search investigator"
                          className="flex-1 px-3 py-2 border border-border rounded-md text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = selectedInvestigator.trim();
                            if (!trimmed) return;
                            const updated = assignInvestigator(
                              imei,
                              trimmed
                            );
                            if (updated) {
                              const actor = user?.id ?? "system";
                              const actorRole = user?.role ?? "unknown";
                              writeAuditLog({
                                actor,
                                actorRole,
                                action: "CASE_ASSIGNED",
                                target: imei,
                                outcome: "SUCCESS",
                                context: `Assigned to ${trimmed}`,
                                details: { assignedTo: trimmed },
                              });
                              setCaseVersion((v) => v + 1);
                              setSelectedInvestigator("");
                            }
                          }}
                          className="px-3 py-2 rounded-md text-sm font-semibold bg-white border border-border text-gray-700 hover:border-primary hover:text-primary transition disabled:opacity-50"
                          disabled={!selectedInvestigator.trim()}
                        >
                          Reassign
                        </button>
                      </div>
                    </div>
                  )}

                {allowReopen &&
                  caseRecord.status === "closed" &&
                  (user?.role === "manager" || user?.role === "admin") && (
                    <button
                      type="button"
                      onClick={() => {
                        const reason = prompt(
                          "Reason for reopening this case?"
                        );
                        if (!reason) return;
                        try {
                          const updated = changeCaseStatus(
                            imei,
                            "in_review"
                          );
                          if (updated) {
                            const actor = user?.id ?? "system";
                            const actorRole =
                              user?.role ?? "unknown";
                            writeAuditLog({
                              actor,
                              actorRole,
                              action: "CASE_REOPENED",
                              target: imei,
                              outcome: "SUCCESS",
                              context: "Case reopened to In Review",
                              details: { reason },
                            });
                            setCaseVersion((v) => v + 1);
                          }
                        } catch (error) {
                          alert(
                            error instanceof Error
                              ? error.message
                              : "Unable to reopen case"
                          );
                        }
                      }}
                      className="px-3 py-2 rounded-md text-sm font-semibold bg-warning text-white hover:brightness-95 transition"
                    >
                      Reopen Case (In Review)
                    </button>
                  )}
              </div>
            </div>
          )}

        </div>
      </aside>
    </div>
  );
}
