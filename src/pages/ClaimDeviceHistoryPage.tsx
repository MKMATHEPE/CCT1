import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { getClaimEventsBySerial } from "../services/claimDeviceService";
import { getDeviceHistoryBySerial } from "../services/deviceRegistryService";

export default function ClaimDeviceHistoryPage() {
  const { serial } = useParams();

  const events = useMemo(
    () => (serial ? getClaimEventsBySerial(serial) : []),
    [serial]
  );
  const history = useMemo(
    () => (serial ? getDeviceHistoryBySerial(serial) : null),
    [serial]
  );
  const isDuplicate = events.length > 1;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">
          Claim Device / Device History
        </h2>
        <p className="mt-1 text-sm text-muted">
          Serial: <span className="font-semibold">{serial}</span>
        </p>
      </div>

      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Details</h3>
        <div className="mt-3 text-sm text-gray-700 space-y-1">
          <div>IMEI: {history?.imei ?? "—"}</div>
          <div>
            Claim Events:{" "}
            {history?.claims.length ?? events.length}
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

      {isDuplicate && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800">
          This device has multiple claims. Review duplicate device
          queue for further context.
        </div>
      )}

      <div className="flex items-center gap-3">
        {isDuplicate && (
          <Link
            to="/claim-device/duplicates"
            className="text-sm text-primary hover:underline"
          >
            View Duplicate Devices
          </Link>
        )}
      </div>

      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-6 py-3 text-left">Event</th>
              <th className="px-6 py-3 text-left">Insurer</th>
              <th className="px-6 py-3 text-left">Outcome</th>
              <th className="px-6 py-3 text-left">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-t border-border">
                <td className="px-6 py-4 font-medium text-gray-900">
                  Claim submitted
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {event.insurer ?? "Unknown"}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {event.outcome ?? "Unknown"}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {new Date(event.createdAtUtc).toLocaleString()}
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-8 text-center text-muted"
                >
                  No claim events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
