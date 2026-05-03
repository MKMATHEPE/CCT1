import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { writeAuditLog } from "../services/auditLogService";
import { getCaseByIMEI } from "../services/caseDomainService";
import {
  getDuplicateEvidenceContext,
  type DuplicateEvidenceContext,
} from "../services/duplicateEvidenceService";
import {
  generateRiskSignals,
  type RiskSignal,
} from "../services/riskSignalService";

type Props = {
  onOpenCase?: (context: DuplicateEvidenceContext) => void;
};

export default function RiskQueueUnifiedPage({ onOpenCase }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAnalyst = user?.role === "analyst";
  const [signals, setSignals] = useState<RiskSignal[]>([]);
  const [selectedSignal, setSelectedSignal] =
    useState<RiskSignal | null>(null);

  useEffect(() => {
    const generated = generateRiskSignals();
    setSignals(generated);
    setSelectedSignal((prev) => {
      if (!prev) return null;
      return generated.find((signal) => signal.id === prev.id) ?? null;
    });
  }, []);

  const evidenceMap = useMemo(() => {
    const map = new Map<string, DuplicateEvidenceContext>();
    signals.forEach((signal) => {
      if (signal.linkedEntity.type !== "DEVICE") return;
      const evidence = getDuplicateEvidenceContext(signal.linkedEntity.id);
      if (evidence) map.set(signal.id, evidence);
    });
    return map;
  }, [signals]);

  useEffect(() => {
    if (!selectedSignal) return;
    const actor = user?.id ?? "system";
    const actorRole = user?.role ?? "unknown";
    writeAuditLog({
      actor,
      actorRole,
      action: "RISK_SIGNAL_VIEWED",
      target: selectedSignal.linkedEntity.id,
      outcome: "SUCCESS",
      context: `Risk signal viewed (${selectedSignal.type})`,
      details: {
        signalId: selectedSignal.id,
        severity: selectedSignal.severity,
        source: selectedSignal.source,
      },
    });
  }, [selectedSignal, user]);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Risk Queue
            </h2>
            <p className="mt-1 text-sm text-muted">
              Unified triage of risk signals across the system.
            </p>
          </div>
          <div className="text-sm text-muted">
            {signals.length} signal{signals.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-6 py-3 text-left">Signal</th>
              <th className="px-6 py-3 text-left">Severity</th>
              <th className="px-6 py-3 text-left">Linked Entity</th>
              <th className="px-6 py-3 text-left">Source</th>
              <th className="px-6 py-3 text-left">Timestamp</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((signal) => (
              <tr
                key={signal.id}
                className={`border-t border-border ${
                  selectedSignal?.id === signal.id ? "bg-blue-50/40" : ""
                }`}
              >
                <td className="px-6 py-4 text-gray-700">
                  {humanizeSignalType(signal.type)}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      signal.severity === "HIGH"
                        ? "bg-red-100 text-red-800"
                        : "bg-orange-100 text-orange-800"
                    }`}
                  >
                    {signal.severity}
                  </span>
                </td>
                <td className="px-6 py-4 font-medium text-gray-900">
                  {signal.linkedEntity.id}
                </td>
                <td className="px-6 py-4 text-gray-600">{signal.source}</td>
                <td className="px-6 py-4 text-gray-600">
                  {new Date(signal.createdAt).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => setSelectedSignal(signal)}
                    className="text-primary font-medium hover:underline"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
            {signals.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-muted">
                  No risk signals available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Signal Detail</h3>
        {!selectedSignal ? (
          <div className="mt-2 text-sm text-muted">
            Select a signal to view details.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="text-sm text-gray-700 space-y-1">
              <div>
                <span className="text-muted">Signal:</span>{" "}
                {humanizeSignalType(selectedSignal.type)}
              </div>
              <div>
                <span className="text-muted">Severity:</span>{" "}
                {selectedSignal.severity}
              </div>
              <div>
                <span className="text-muted">Origin:</span>{" "}
                {selectedSignal.source}
              </div>
              <div>
                <span className="text-muted">Linked entity:</span>{" "}
                {selectedSignal.linkedEntity.id}
              </div>
              <div>
                <span className="text-muted">Summary:</span>{" "}
                {selectedSignal.summary}
              </div>
            </div>

            <div className="border border-border rounded-md p-4 text-sm text-gray-700 space-y-2 bg-gray-50">
              <div className="text-xs uppercase tracking-wide text-muted">
                Linked evidence
              </div>
              {evidenceMap.get(selectedSignal.id) ? (
                <>
                  <div>
                    Device serial:{" "}
                    {evidenceMap.get(selectedSignal.id)!.serial}
                  </div>
                  <div>
                    IMEI: {evidenceMap.get(selectedSignal.id)!.imei ?? "—"}
                  </div>
                  <div>
                    Device:{" "}
                    {evidenceMap.get(selectedSignal.id)!.brand ||
                    evidenceMap.get(selectedSignal.id)!.model
                      ? `${evidenceMap.get(selectedSignal.id)!.brand ?? ""} ${
                          evidenceMap.get(selectedSignal.id)!.model ?? ""
                        }`.trim()
                      : "—"}
                  </div>
                  <div>
                    Claims: {evidenceMap.get(selectedSignal.id)!.claimCount}
                  </div>
                  <div>
                    Insurers:{" "}
                    {evidenceMap
                      .get(selectedSignal.id)!
                      .insurers.join(", ")}
                  </div>
                  <div>
                    Outcomes:{" "}
                    {evidenceMap
                      .get(selectedSignal.id)!
                      .outcomes.join(", ")}
                  </div>
                </>
              ) : (
                <div className="text-muted">
                  No related claim summary available.
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/claim-device/existing/${selectedSignal.linkedEntity.id}`
                  )
                }
                className="text-sm text-primary hover:underline"
              >
                View Device
              </button>
              {evidenceMap.get(selectedSignal.id)?.imei &&
              getCaseByIMEI(evidenceMap.get(selectedSignal.id)!.imei!) ? (
                <button
                  type="button"
                  onClick={() => {
                    const existingCase = getCaseByIMEI(
                      evidenceMap.get(selectedSignal.id)!.imei!
                    );
                    if (!existingCase) return;
                    navigate(`/investigations/cases/${existingCase.caseId}`);
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  View Case
                </button>
              ) : (
                onOpenCase &&
                isAnalyst && (
                  <button
                    type="button"
                    onClick={() => {
                      const evidence = evidenceMap.get(selectedSignal.id);
                      if (!evidence) return;
                      const actor = user?.id ?? "system";
                      const actorRole = user?.role ?? "unknown";
                      writeAuditLog({
                        actor,
                        actorRole,
                        action: "RISK_SIGNAL_ESCALATED",
                        target: selectedSignal.linkedEntity.id,
                        outcome: "SUCCESS",
                        context: "Risk signal escalated to investigation",
                        details: {
                          signalId: selectedSignal.id,
                          type: selectedSignal.type,
                        },
                      });
                      onOpenCase(evidence);
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    Open Investigation Case
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function humanizeSignalType(type: RiskSignal["type"]) {
  if (type === "DUPLICATE_DEVICE") return "Duplicate device detected";
  if (type === "MULTI_INSURER") return "Cross-insurer overlap";
  return "High-velocity claims";
}
