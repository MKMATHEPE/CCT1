import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { writeAuditLog } from "../services/auditLogService";
import { useAuth } from "../auth/useAuth";
import { getExistingDevices } from "../services/deviceRegistryService";
import {
  getDuplicateEvidenceContext,
  type DuplicateEvidenceContext,
} from "../services/duplicateEvidenceService";

type Row = {
  serial: string;
  imei?: string;
  brand?: string;
  model?: string;
  claimCount: number;
  insurers: string[];
  lastOutcome: string;
  lastActivityTs: number;
  multiInsurer: boolean;
};

type Props = {
  onOpenCase?: (context: DuplicateEvidenceContext) => void;
};

export default function ClaimDeviceDuplicateDevicesPage({
  onOpenCase,
}: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAnalyst = user?.role === "analyst";
  const existingDevices = useMemo(() => getExistingDevices(), []);

  const rows = useMemo(() => {
    return existingDevices
      .map((device) => {
        const evidence = getDuplicateEvidenceContext(device.serial);
        if (!evidence || evidence.claimCount <= 1) return null;
        const latest = evidence.claims[0];
        return {
          serial: device.serial,
          imei: evidence.imei ?? device.imei,
          brand: evidence.brand ?? device.brand,
          model: evidence.model ?? device.model,
          claimCount: evidence.claimCount,
          insurers: evidence.insurers,
          lastOutcome: latest?.outcome ?? "Unknown",
          lastActivityTs: latest
            ? new Date(latest.recordedAtUtc).getTime()
            : 0,
          multiInsurer: evidence.crossInsurer,
        };
      })
      .filter((row): row is Row => Boolean(row));
  }, [existingDevices]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (b.claimCount !== a.claimCount) {
        return b.claimCount - a.claimCount;
      }
      return b.lastActivityTs - a.lastActivityTs;
    });
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">
          Claim Device / Duplicate Devices
        </h2>
        <p className="mt-1 text-sm text-muted">
          Devices with multiple claims.
        </p>
      </div>

      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-6 py-3 text-left">Serial</th>
              <th className="px-6 py-3 text-left">IMEI</th>
              <th className="px-6 py-3 text-left">Device</th>
              <th className="px-6 py-3 text-left">Claims</th>
              <th className="px-6 py-3 text-left">Insurers</th>
              <th className="px-6 py-3 text-left">Last Outcome</th>
              <th className="px-6 py-3 text-left">Risk</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row.serial} className="border-t border-border">
                <td className="px-6 py-4 font-medium text-gray-900">
                  {row.serial}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {row.imei ?? "—"}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {row.brand || row.model
                    ? `${row.brand ?? ""} ${row.model ?? ""}`.trim()
                    : "—"}
                </td>
                <td className="px-6 py-4">{row.claimCount}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      row.multiInsurer
                        ? "bg-red-100 text-red-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {row.insurers.join(", ")}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {row.lastOutcome}
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                    High
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/claim-device/duplicates/${row.serial}`)
                      }
                      className="text-primary font-medium hover:underline"
                    >
                      View Evidence
                    </button>
                    {onOpenCase && isAnalyst && (
                      <button
                        type="button"
                        onClick={() => {
                          const actor = user?.id ?? "system";
                          const actorRole = user?.role ?? "unknown";
                          writeAuditLog({
                            actor,
                            actorRole,
                            action:
                              "INVESTIGATION_INITIATED_FROM_DUPLICATE",
                            target: row.serial,
                            outcome: "SUCCESS",
                            context:
                              "Manual investigation initiation from duplicate list",
                            details: {
                              claimCount: row.claimCount,
                            },
                          });
                          const evidence = getDuplicateEvidenceContext(
                            row.serial
                          );
                          if (evidence) {
                            onOpenCase(evidence);
                          }
                        }}
                        className="text-xs text-gray-600 hover:text-primary hover:underline"
                      >
                        Open Investigation Case
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {sortedRows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-8 text-center text-muted"
                >
                  No duplicate devices yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
