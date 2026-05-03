import { useMemo, useState } from "react";
import { useClaims, type Claim } from "../services/deviceDataService";

type Row = Claim & {
  deviceName: string;
  dateOfLossLabel: string;
  amountLabel: string;
  outcomeLabel: string;
};

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatAmount(value: number) {
  return value.toLocaleString("en-ZA", {
    style: "currency",
    currency: "ZAR",
  });
}

export default function ClaimDeviceDatabasePage() {
  const [rowsPerPage, setRowsPerPage] = useState(30);
  const [page, setPage] = useState(1);
  const claims = useClaims();
  const rows = useMemo<Row[]>(() => {
    return claims
      .map((claim) => ({
        ...claim,
        deviceName: [claim.brand, claim.model].filter(Boolean).join(" ") || "Unknown",
        dateOfLossLabel: formatDate(claim.dateOfLoss),
        amountLabel: formatAmount(claim.amount),
        outcomeLabel:
          claim.outcome === "approved"
            ? "Approved"
            : claim.outcome === "rejected"
              ? "Rejected"
              : "Pending",
      }))
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }, [claims]);
  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const pagedRows = rows.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">
          Device Database
        </h2>
        <p className="mt-1 text-sm text-muted">
          Claim-linked device records across the CCT registry.
        </p>
      </div>

      <div className="bg-white border border-border rounded-xl p-4 shadow-sm flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-gray-600">
          Showing {rows.length === 0 ? 0 : startIndex + 1}-
          {Math.min(startIndex + rowsPerPage, rows.length)} of {rows.length}
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="rows-per-page" className="text-sm text-gray-600">
            Rows per page
          </label>
          <select
            id="rows-per-page"
            value={rowsPerPage}
            onChange={(event) => {
              setRowsPerPage(Number(event.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            {[10, 30, 50, 100].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-6 py-3 text-left">No.</th>
              <th className="px-6 py-3 text-left">IMEI / Serial Number</th>
              <th className="px-6 py-3 text-left">Device Name / Model</th>
              <th className="px-6 py-3 text-left">Insurer</th>
              <th className="px-6 py-3 text-left">Claim Outcome</th>
              <th className="px-6 py-3 text-left">Date of Loss</th>
              <th className="px-6 py-3 text-left">Claim Amount</th>
              <th className="px-6 py-3 text-left">Reason</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row, index) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-6 py-4 text-gray-500">
                  {startIndex + index + 1}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  <div>{row.imei}</div>
                  <div className="text-xs text-gray-500">{row.serial}</div>
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {row.deviceName}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {row.insurer ?? "Unknown"}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {row.outcomeLabel}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {row.dateOfLossLabel}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {row.amountLabel}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {row.reason ?? "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-8 text-center text-muted"
                >
                  No devices in the database yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white border border-border rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
