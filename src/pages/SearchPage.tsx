import { useEffect, useMemo, useState } from "react";
import { getClaims, type Claim } from "../services/deviceDataService";
import { useAuth } from "../auth/useAuth";
import { writeAuditLog } from "../services/auditLogService";

type SearchMode = "imei" | "serial" | "policy" | "claim";

type Props = {
  mode: SearchMode;
  onViewCase: (imei: string) => void;
};

type ResultRow = {
  id: number;
  imei: string;
  device: string;
  outcome: Claim["outcome"];
  timestamp: string;
};

const MODE_LABEL: Record<SearchMode, string> = {
  imei: "IMEI",
  serial: "Serial Number",
  policy: "Policy Number",
  claim: "Claim ID",
};

export default function SearchPage({ mode, onViewCase }: Props) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const { user } = useAuth();

  const results = useMemo(() => {
    const trimmed = submitted.trim();
    if (!trimmed) return [];
    if (mode === "policy") return [];

    const claims = getClaims();
    if (mode === "imei") {
      return claims
        .filter((c) => c.imei === trimmed)
        .map(toResultRow);
    }
    if (mode === "serial") {
      return claims
        .filter((c) => c.serial === trimmed)
        .map(toResultRow);
    }
    if (mode === "claim") {
      const id = Number(trimmed);
      if (!Number.isFinite(id)) return [];
      return claims
        .filter((c) => c.id === id)
        .map(toResultRow);
    }
    return [];
  }, [mode, submitted]);

  useEffect(() => {
    const trimmed = submitted.trim();
    if (!trimmed) return;

    const actor = user?.id ?? "system";
    const actorRole = user?.role ?? "unknown";
    const outcome = results.length > 0 ? "SUCCESS" : "FAILURE";

    writeAuditLog({
      actor,
      actorRole,
      action: "SEARCH",
      target: trimmed,
      outcome,
      context: `Search by ${MODE_LABEL[mode]}`,
    });
  }, [submitted, results.length, mode, user]);

  const emptyState =
    submitted.trim().length > 0 && results.length === 0;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Search by {MODE_LABEL[mode]}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Find claims and cases using {MODE_LABEL[mode]}.
            </p>
          </div>
        </div>
        {mode === "policy" ? (
          <div className="mt-4 text-sm text-muted">
            Policy number search will be enabled once policy data
            is linked to claims.
          </div>
        ) : (
          <div className="mt-4 flex flex-col md:flex-row gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Enter ${MODE_LABEL[mode]}...`}
              className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => setSubmitted(query)}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:brightness-95 transition"
            >
              Search
            </button>
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-6 py-3 text-left">Device</th>
                <th className="px-6 py-3 text-left">IMEI</th>
                <th className="px-6 py-3 text-left">Outcome</th>
                <th className="px-6 py-3 text-left">Timestamp</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <tr
                  key={`${row.id}-${row.imei}`}
                  className="border-t border-border"
                >
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {row.device}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{row.imei}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {row.outcome.toUpperCase()}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {new Date(row.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => onViewCase(row.imei)}
                      className="text-primary font-medium hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {emptyState && (
        <div className="bg-white border border-border rounded-xl p-6 shadow-sm text-sm text-muted">
          No results found for "{submitted}".
        </div>
      )}
    </div>
  );
}

function toResultRow(claim: Claim): ResultRow {
  return {
    id: claim.id,
    imei: claim.imei,
    device: `${claim.brand} ${claim.model}`,
    outcome: claim.outcome,
    timestamp: claim.timestamp,
  };
}
