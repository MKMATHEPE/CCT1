import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { writeAuditLog } from "../services/auditLogService";
import {
  getDuplicateEvidenceContext,
  type DuplicateEvidenceContext,
} from "../services/duplicateEvidenceService";

type Props = {
  onOpenCase?: (context: DuplicateEvidenceContext) => void;
};

export default function ClaimDeviceDuplicateDetailPage({
  onOpenCase,
}: Props) {
  const { serial } = useParams();
  const { user } = useAuth();
  const isAnalyst = user?.role === "analyst";

  const evidence = useMemo(
    () => (serial ? getDuplicateEvidenceContext(serial) : null),
    [serial]
  );

  const isDuplicate = (evidence?.claimCount ?? 0) > 1;

  if (!serial) {
    return null;
  }

  useEffect(() => {
    if (!serial || !evidence) return;
    const actor = user?.id ?? "system";
    const actorRole = user?.role ?? "unknown";
    writeAuditLog({
      actor,
      actorRole,
      action: "DUPLICATE_DEVICE_VIEWED",
      target: serial,
      outcome: "SUCCESS",
      context: "Duplicate device evidence opened",
    });
  }, [evidence, serial, user?.id, user?.role]);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Duplicate Device Evidence
            </h2>
            <p className="mt-1 text-sm text-muted">
              Serial: <span className="font-semibold">{serial}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/claim-device/duplicates"
              className="text-sm text-muted hover:text-gray-900"
            >
              Back to duplicates
            </Link>
            {onOpenCase && isAnalyst && (
              <button
                type="button"
                onClick={() => {
                  if (!evidence) return;
                  const actor = user?.id ?? "system";
                  const actorRole = user?.role ?? "unknown";
                  writeAuditLog({
                    actor,
                    actorRole,
                    action: "INVESTIGATION_INITIATED_FROM_DUPLICATE",
                    target: serial,
                    outcome: "SUCCESS",
                    context: "Manual investigation initiation",
                    details: {
                      claimCount: evidence.claimCount,
                    },
                  });
                  onOpenCase(evidence);
                }}
                className="bg-primary text-white px-4 py-2 rounded text-sm font-semibold hover:brightness-95 transition"
              >
                Open Investigation Case
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">
          Device Identifiers
        </h3>
        <div className="mt-3 text-sm text-gray-700 space-y-1">
          <div>Serial: {serial}</div>
          <div>IMEI: {evidence?.imei ?? "—"}</div>
          <div>
            Device:{" "}
            {evidence?.brand || evidence?.model
              ? `${evidence?.brand ?? ""} ${
                  evidence?.model ?? ""
                }`.trim()
              : "—"}
          </div>
          <div>
            Status:{" "}
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                isDuplicate
                  ? "bg-red-100 text-red-800"
                  : "bg-green-100 text-green-800"
              }`}
            >
              {isDuplicate ? "Duplicate" : "Clean"}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-6 py-3 text-left">Insurer</th>
              <th className="px-6 py-3 text-left">Outcome</th>
              <th className="px-6 py-3 text-left">Date Recorded</th>
            </tr>
          </thead>
          <tbody>
            {(evidence?.claims ?? []).map((event) => (
              <tr key={event.id} className="border-t border-border">
                <td className="px-6 py-4 text-gray-700">
                  {event.insurer}
                </td>
                <td className="px-6 py-4 text-gray-700">
                  {event.outcome}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {new Date(event.recordedAtUtc).toLocaleString()}
                </td>
              </tr>
            ))}
            {(evidence?.claims ?? []).length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-8 text-center text-muted"
                >
                  No claim history available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
