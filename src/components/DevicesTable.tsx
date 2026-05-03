import { getDeviceRows } from "../services/deviceDataService";
import type { DeviceRow } from "../services/deviceDataService";

function StatusPill({ status }: { status: DeviceRow["status"] }) {
  const styles: Record<DeviceRow["status"], string> = {
    Clean: "bg-green-100 text-green-700",
    Duplicate: "bg-red-100 text-red-700",
    Pending: "bg-yellow-100 text-yellow-700",
  };

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}

export default function DevicesTable({
  onViewDevice,
}: {
  onViewDevice: (imei: string) => void;
}) {
  const devices: DeviceRow[] = getDeviceRows();

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-border font-semibold">
        Monitored Devices
      </div>

      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
          <tr>
            <th className="text-left px-6 py-3">Device</th>
            <th className="text-left px-6 py-3">IMEI</th>
            <th className="text-left px-6 py-3">Claims</th>
            <th className="text-left px-6 py-3">Status</th>
            <th className="text-left px-6 py-3">Last Activity</th>
            <th className="text-left px-6 py-3"></th>
          </tr>
        </thead>

        <tbody>
          {devices.map((row) => (
            <tr
              key={row.imei}
              className="border-t border-border hover:bg-gray-50 transition-colors"
            >
              <td className="px-6 py-4 font-medium">{row.device}</td>
              <td className="px-6 py-4 text-muted">{row.imei}</td>
              <td className="px-6 py-4">{row.claimsCount}</td>
              <td className="px-6 py-4">
                <StatusPill status={row.status} />
              </td>
              <td className="px-6 py-4 text-muted">{row.lastActivity}</td>
              <td className="px-6 py-4 text-right">
                <button
  onClick={() => onViewDevice(row.imei)}
  className="text-primary hover:underline text-sm"
>
  View
</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}