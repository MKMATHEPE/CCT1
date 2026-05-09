import { useMemo, useState } from "react";
import { useClaims, type Claim } from "../services/deviceDataService";
import { useTheme } from "../auth/themeContext";

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
  const [searchQuery, setSearchQuery] = useState("");
  const claims = useClaims();
  const theme = useTheme();

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

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return rows;
    }

    return rows.filter((row) =>
      [
        row.imei,
        row.serial,
        row.deviceName,
        row.brand,
        row.model,
        row.insurer,
        row.outcome,
        row.outcomeLabel,
        row.dateOfLossLabel,
        row.amountLabel,
        row.reason,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [rows, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const pagedRows = filteredRows.slice(startIndex, startIndex + rowsPerPage);
  const hasSearch = searchQuery.trim().length > 0;

  const cardBg = theme === "light" ? "bg-[#f5f9fd]" : "bg-[#111827]";
  const heading = theme === "light" ? "text-[#1e293b]" : "text-white";
  const cell = theme === "light" ? "text-[#5b6f84]" : "text-slate-300";
  const cellMuted = theme === "light" ? "text-gray-500" : "text-slate-400";
  const tableHead = theme === "light" ? "bg-[#dde6f0]/60 text-gray-600" : "bg-slate-800/60 text-slate-400";
  const controlBg = theme === "light" ? "bg-[#eaf1f8] text-slate-600 border-border" : "bg-slate-950 text-white border-white/10";

  return (
    <div className="space-y-4">
      <div className={`${cardBg} border border-border rounded-xl p-6 shadow-sm`}>
        <h2 className={`text-xl font-semibold ${heading}`}>
          Device Database
        </h2>
        <p className="mt-1 text-sm text-muted">
          Claim-linked device records across the CCT registry.
        </p>
      </div>

      <div className={`${cardBg} border border-border rounded-xl p-4 shadow-sm flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between`}>
        <div className="min-w-0 flex-1">
          <label htmlFor="device-database-search" className={`sr-only`}>
            Search device database
          </label>
          <input
            id="device-database-search"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search IMEI, serial, device, insurer, outcome..."
            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-orange-400/60 focus:ring-2 focus:ring-orange-400/20 ${controlBg}`}
          />
          <div className={`mt-2 text-sm ${cell}`}>
            Showing {filteredRows.length === 0 ? 0 : startIndex + 1}-
            {Math.min(startIndex + rowsPerPage, filteredRows.length)} of {filteredRows.length}
            {hasSearch ? ` matching ${rows.length} total` : ""}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-start">
          <label htmlFor="rows-per-page" className={`text-sm ${cell}`}>
            Rows per page
          </label>
          <select
            id="rows-per-page"
            value={rowsPerPage}
            onChange={(event) => {
              setRowsPerPage(Number(event.target.value));
              setPage(1);
            }}
            className={`rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-orange-400/60 focus:ring-2 focus:ring-orange-400/20 ${controlBg}`}
          >
            {[10, 30, 50, 100].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {pagedRows.map((row, index) => (
          <article key={row.id} className={`${cardBg} border border-border rounded-xl p-4 shadow-sm`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${cellMuted}`}>
                  #{startIndex + index + 1}
                </p>
                <h3 className={`mt-1 truncate text-base font-semibold ${heading}`}>
                  {row.deviceName}
                </h3>
                <p className={`mt-1 break-all text-sm ${cell}`}>{row.imei}</p>
                <p className={`break-all text-xs ${cellMuted}`}>{row.serial}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                row.outcome === "approved"
                  ? "bg-emerald-500/10 text-emerald-500"
                  : row.outcome === "rejected"
                    ? "bg-rose-500/10 text-rose-500"
                    : "bg-amber-500/10 text-amber-500"
              }`}>
                {row.outcomeLabel}
              </span>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className={`text-xs ${cellMuted}`}>Insurer</dt>
                <dd className={`mt-0.5 ${cell}`}>{row.insurer ?? "Unknown"}</dd>
              </div>
              <div>
                <dt className={`text-xs ${cellMuted}`}>Date of loss</dt>
                <dd className={`mt-0.5 ${cell}`}>{row.dateOfLossLabel}</dd>
              </div>
              <div>
                <dt className={`text-xs ${cellMuted}`}>Amount</dt>
                <dd className={`mt-0.5 ${cell}`}>{row.amountLabel}</dd>
              </div>
              <div>
                <dt className={`text-xs ${cellMuted}`}>Reason</dt>
                <dd className={`mt-0.5 max-h-10 overflow-hidden ${cell}`}>{row.reason ?? "—"}</dd>
              </div>
            </dl>
          </article>
        ))}
        {filteredRows.length === 0 && (
          <div className={`${cardBg} border border-border rounded-xl p-8 text-center text-sm text-muted shadow-sm`}>
            {hasSearch ? "No devices match your search." : "No devices in the database yet."}
          </div>
        )}
      </div>

      <div className={`${cardBg} hidden border border-border rounded-xl shadow-sm overflow-x-auto md:block`}>
        <table className="w-full text-sm">
          <thead className={`${tableHead} text-xs uppercase tracking-wide`}>
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
                <td className={`px-6 py-4 ${cellMuted}`}>
                  {startIndex + index + 1}
                </td>
                <td className={`px-6 py-4 ${cell}`}>
                  <div>{row.imei}</div>
                  <div className={`text-xs ${cellMuted}`}>{row.serial}</div>
                </td>
                <td className={`px-6 py-4 ${cell}`}>{row.deviceName}</td>
                <td className={`px-6 py-4 ${cell}`}>{row.insurer ?? "Unknown"}</td>
                <td className={`px-6 py-4 ${cell}`}>{row.outcomeLabel}</td>
                <td className={`px-6 py-4 ${cell}`}>{row.dateOfLossLabel}</td>
                <td className={`px-6 py-4 ${cell}`}>{row.amountLabel}</td>
                <td className={`px-6 py-4 ${cell}`}>{row.reason ?? "—"}</td>
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-muted">
                  {hasSearch ? "No devices match your search." : "No devices in the database yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={`${cardBg} border border-border rounded-xl p-4 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
        <div className={`text-sm ${cell}`}>
          Page {currentPage} of {totalPages}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50 ${controlBg}`}
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50 ${controlBg}`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
