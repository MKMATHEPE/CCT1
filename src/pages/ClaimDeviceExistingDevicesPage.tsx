import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { writeAuditLog } from "../services/auditLogService";
import { useAuth } from "../auth/useAuth";
import {
  getExistingDevices,
  type ExistingDeviceRow,
} from "../services/deviceRegistryService";

type Row = ExistingDeviceRow & {
  lastActivityTs: number;
};

export default function ClaimDeviceExistingDevicesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const rows = useMemo<Row[]>(() => {
    return getExistingDevices()
      .map((row) => ({
        ...row,
        lastActivityTs: row.lastActivityUtc
          ? new Date(row.lastActivityUtc).getTime()
          : 0,
      }))
      .sort((a, b) => b.lastActivityTs - a.lastActivityTs);
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">
          Claim Device / Existing Devices
        </h2>
        <p className="mt-1 text-sm text-muted">
          Devices registered from claims and registrations.
        </p>
      </div>

      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-6 py-3 text-left">Serial</th>
              <th className="px-6 py-3 text-left">IMEI</th>
              <th className="px-6 py-3 text-left">Device</th>
              <th className="px-6 py-3 text-left">Claim Count</th>
              <th className="px-6 py-3 text-left">Last Insurer</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
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
                <td className="px-6 py-4 text-gray-600">
                  {row.lastInsurer}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      row.status === "Duplicate"
                        ? "bg-red-100 text-red-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      const actor = user?.id ?? "system";
                      const actorRole = user?.role ?? "unknown";
                      writeAuditLog({
                        actor,
                        actorRole,
                        action: "DEVICE_VIEWED",
                        target: row.serial,
                        outcome: "SUCCESS",
                        context: "Existing device history opened",
                      });
                      navigate(
                        `/claim-device/existing/${row.serial}`
                      );
                    }}
                    className="text-primary font-medium hover:underline"
                  >
                    View History
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-8 text-center text-muted"
                >
                  No devices yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
