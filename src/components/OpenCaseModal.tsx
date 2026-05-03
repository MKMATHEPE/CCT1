import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import {
  createCase,
  getCaseByIMEI,
  type CaseRiskLevel,
} from "../services/caseDomainService";
import { getClaims } from "../services/deviceDataService";
import { writeAuditLog } from "../services/auditLogService";
import type { DuplicateEvidenceContext } from "../services/duplicateEvidenceService";

type Props = {
  isOpen: boolean;
  defaultImei?: string | null;
  context?: DuplicateEvidenceContext | null;
  onClose: () => void;
};

export default function OpenCaseModal({
  isOpen,
  defaultImei,
  context,
  onClose,
}: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [reasonCategory, setReasonCategory] = useState(
    "Duplicate device detected"
  );
  const [justification, setJustification] = useState("");
  const [riskLevel, setRiskLevel] = useState<CaseRiskLevel>("HIGH");
  const [ackEvidence, setAckEvidence] = useState(false);
  const [ackCompliance, setAckCompliance] = useState(false);
  const [imeiInput, setImeiInput] = useState(defaultImei ?? "");
  const isAnalyst = user?.role === "analyst";

  const allClaims = useMemo(() => getClaims(), []);
  const imeiOptions = useMemo(() => {
    const set = new Set([
      ...allClaims.map((c) => c.imei),
      ...allClaims.map((c) => c.serial),
    ]);
    return Array.from(set);
  }, [allClaims]);

  const claimsForImei = useMemo(() => {
    if (!imeiInput) return [];
    return allClaims.filter(
      (c) => c.imei === imeiInput || c.serial === imeiInput
    );
  }, [allClaims, imeiInput]);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setReasonCategory(
      context ? "Duplicate device detected" : "Manual review"
    );
    setJustification("");
    setRiskLevel(context ? "HIGH" : "LOW");
    setAckEvidence(false);
    setAckCompliance(false);
    setImeiInput(defaultImei ?? "");
  }, [isOpen, defaultImei, context]);

  useEffect(() => {
    if (!isOpen || isAnalyst) return;
    const actor = user?.id ?? "system";
    const actorRole = user?.role ?? "unknown";
    writeAuditLog({
      actor,
      actorRole,
      action: "PERMISSION_DENIED",
      target: "open-case",
      outcome: "FAILURE",
      context: "Open case flow blocked for role",
    });
  }, [isOpen, isAnalyst, user]);

  if (!isOpen) return null;

  const evidenceClaims = context?.claims ?? [];
  const evidenceInsurers = context?.insurers ?? [];
  const evidenceOutcomes = context?.outcomes ?? [];
  const evidenceSource = context
    ? "Duplicate Device Detection"
    : "Manual Review";
  const evidenceClaimCount = context
    ? context.claimCount
    : claimsForImei.length;
  const evidenceCrossInsurer = context?.crossInsurer ?? false;

  const canContinue =
    context ? Boolean(ackEvidence) : Boolean(imeiInput.trim());
  const canSubmit =
    imeiInput.trim() &&
    justification.trim().length > 0 &&
    ackCompliance;

  return (
    <div className="fixed inset-0 z-[140]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl w-[620px] p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Open Case</h2>
            <p className="text-sm text-muted">
              Provide a reason and confirm the evidence.
            </p>
          </div>
          {!isAnalyst && (
            <div className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
              You do not have permission to open investigation cases.
            </div>
          )}

          {step === 1 && (
            <>
              <div className="space-y-2">
                <label className="text-xs text-muted">Serial or IMEI</label>
                <input
                  list="open-case-imei"
                  value={imeiInput}
                  onChange={(e) => setImeiInput(e.target.value)}
                  placeholder="Search serial or IMEI"
                  className="w-full border border-border px-3 py-2 rounded text-sm"
                  disabled={Boolean(context?.serial)}
                />
                <datalist id="open-case-imei">
                  {imeiOptions.map((imei) => (
                    <option key={imei} value={imei} />
                  ))}
                </datalist>
              </div>

              {context && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
                  <div>
                    <span className="text-muted">Device serial:</span>{" "}
                    {context.serial}
                  </div>
                  <div>
                    <span className="text-muted">IMEI:</span>{" "}
                    {context.imei ?? "—"}
                  </div>
                  <div>
                    <span className="text-muted">Device:</span>{" "}
                    {context.brand || context.model
                      ? `${context.brand ?? ""} ${
                          context.model ?? ""
                        }`.trim()
                      : "—"}
                  </div>
                  <div>
                    <span className="text-muted">Insurers:</span>{" "}
                    {context.insurers.join(", ")}
                  </div>
                </div>
              )}

              <div className="border border-border rounded-md p-3 bg-gray-50 space-y-2">
                <div className="text-xs text-muted uppercase tracking-wide">
                  Evidence Source: {evidenceSource}
                </div>
                {context && (
                  <div className="text-xs text-muted">
                    Evidence snapshot is read-only.
                  </div>
                )}
                {evidenceClaimCount === 0 ? (
                  <div className="text-sm text-muted">
                    No claims found for this device.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-sm text-gray-700">
                      {evidenceClaimCount} claim
                      {evidenceClaimCount === 1 ? "" : "s"} linked
                    </div>
                    {context && (
                      <div className="text-xs text-gray-600 space-y-1">
                        <div>
                          Claim outcomes:{" "}
                          {evidenceOutcomes.join(", ") || "Unknown"}
                        </div>
                        <div>
                          Cross-insurer:{" "}
                          {evidenceCrossInsurer ? "Yes" : "No"}
                        </div>
                      </div>
                    )}
                    <ul className="text-xs text-gray-600 space-y-1">
                      {context
                        ? evidenceClaims.map((claim) => (
                            <li key={claim.id}>
                              {claim.insurer} • {claim.outcome} •{" "}
                              {new Date(
                                claim.recordedAtUtc
                              ).toLocaleString()}
                            </li>
                          ))
                        : claimsForImei.map((claim) => (
                            <li key={claim.id}>
                              #{claim.id} • {claim.brand} {claim.model} •{" "}
                              {claim.outcome.toUpperCase()}
                            </li>
                          ))}
                    </ul>
                  </div>
                )}
              </div>

              {context && (
                <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={ackEvidence}
                    onChange={(e) => setAckEvidence(e.target.checked)}
                    className="mt-1"
                  />
                  I have reviewed the evidence for this case.
                </label>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <label className="text-xs text-muted">
                  Reason category
                </label>
                <select
                  value={reasonCategory}
                  onChange={(e) => setReasonCategory(e.target.value)}
                  className="w-full border border-border px-3 py-2 rounded text-sm bg-white"
                  disabled={Boolean(context)}
                >
                  <option value="Duplicate device detected">
                    Duplicate device detected
                  </option>
                  <option value="Manual review">Manual review</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted">
                  Investigator justification (required)
                </label>
                <textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Provide justification for opening this case"
                  className="w-full border border-border px-3 py-2 rounded text-sm"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs text-muted">
                    Initial risk level
                  </label>
                  <select
                    value={riskLevel}
                    onChange={(e) =>
                      setRiskLevel(e.target.value as CaseRiskLevel)
                    }
                    className="w-full border border-border px-3 py-2 rounded text-sm bg-white"
                    disabled={Boolean(context)}
                  >
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted">Case owner</label>
                  <input
                    value={user?.name ?? "Unassigned"}
                    readOnly
                    className="w-full border border-border px-3 py-2 rounded text-sm bg-gray-50"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={ackCompliance}
                  onChange={(e) => setAckCompliance(e.target.checked)}
                  className="mt-1"
                />
                I confirm this case is being opened for compliance review
                and audit purposes.
              </label>
            </>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-muted"
            >
              Cancel
            </button>
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm text-gray-700"
              >
                Back
              </button>
            )}
            {step === 1 && (
              <button
                type="button"
                onClick={() => {
                  if (!isAnalyst) return;
                  if (!canContinue) return;
                  setStep(2);
                }}
                disabled={!canContinue || !isAnalyst}
                className="px-4 py-2 rounded text-sm font-semibold bg-white border border-border text-gray-700 hover:border-primary hover:text-primary transition disabled:opacity-50"
              >
                Continue
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (!isAnalyst) return;
                if (step !== 2 || !canSubmit) return;
                const trimmedInput = imeiInput.trim();
                const matchedImei =
                  context?.imei ?? claimsForImei[0]?.imei;
                const existing = getCaseByIMEI(matchedImei ?? trimmedInput);
                const caseId = existing?.caseId;
                if (!existing) {
                  const linkedImeis =
                    context?.imei
                      ? [context.imei]
                      : claimsForImei.length > 0
                        ? Array.from(
                            new Set(claimsForImei.map((c) => c.imei))
                          )
                        : [matchedImei ?? trimmedInput];
                  const created = createCase({
                    status: "OPEN",
                    riskLevel,
                    assignedTo: user?.id,
                    linkedIMEIs: linkedImeis,
                    linkedClaimIds: claimsForImei.map((c) => c.id),
                    evidenceSnapshot: context ?? undefined,
                  });
                  const actor = user?.id ?? "system";
                  const actorRole = user?.role ?? "unknown";
                  if (context) {
                    writeAuditLog({
                      actor,
                      actorRole,
                      action: "CASE_INITIATED_FROM_DUPLICATE_DEVICE",
                      target: created.caseId,
                      outcome: "SUCCESS",
                      context: "Case initiated from duplicate device",
                      details: {
                        serial: context.serial,
                        claimCount: context.claimCount,
                      },
                    });
                  }
                  writeAuditLog({
                    actor,
                    actorRole,
                    action: "CASE_CREATED",
                    target: created.caseId,
                    outcome: "SUCCESS",
                    context: "Case opened via Open Case modal",
                    details: {
                      serial: context?.serial ?? trimmedInput,
                      riskLevel,
                      reasonCategory,
                      justification: justification.trim(),
                      claimCount:
                        context?.claimCount ?? claimsForImei.length,
                    },
                  });
                  if (user?.id) {
                    writeAuditLog({
                      actor,
                      actorRole,
                      action: "CASE_ASSIGNED",
                      target: created.caseId,
                      outcome: "SUCCESS",
                      context: `Assigned to ${user.id}`,
                      details: { assignedTo: user.id },
                    });
                  }
                  writeAuditLog({
                    actor,
                    actorRole,
                    action: "CASE_RISK_UPDATED",
                    target: created.caseId,
                    outcome: "SUCCESS",
                    context: "Initial risk level set",
                    details: { riskLevel },
                  });
                  navigate(`/investigations/cases/${created.caseId}`);
                } else if (caseId) {
                  const actor = user?.id ?? "system";
                  const actorRole = user?.role ?? "unknown";
                  writeAuditLog({
                    actor,
                    actorRole,
                    action: "CASE_VIEWED",
                    target: caseId,
                    outcome: "SUCCESS",
                    context: "Case opened from Open Case modal",
                  });
                  navigate(`/investigations/cases/${caseId}`);
                }
                setJustification("");
                onClose();
              }}
              disabled={!canSubmit || step !== 2 || !isAnalyst}
              className="px-4 py-2 rounded text-sm font-semibold border border-border bg-white text-gray-900 hover:border-primary hover:text-primary transition disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
