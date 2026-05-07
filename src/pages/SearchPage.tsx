import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../auth/themeContext";
import {
  recordPreventedClaimEvent,
  searchDeviceClaims,
  useDeviceData,
  type Claim,
} from "../services/deviceDataService";
import { useAuth } from "../auth/useAuth";
import { writeAuditLog } from "../services/auditLogService";

type SearchMode = "imei" | "serial" | "identifier" | "policy" | "claim";

type Props = {
  mode: SearchMode;
};

type ResultRow = {
  id: string;
  imei: string;
  device: string;
  outcome: Claim["outcome"];
  timestamp: string;
  insurer: string;
  amount: number;
};

type ClaimPrefillState = {
  prefillIdentifier: string;
  prefillMode: "imei" | "serial" | "identifier";
};

const MODE_LABEL: Record<SearchMode, string> = {
  imei: "IMEI",
  serial: "Serial Number",
  identifier: "IMEI or Serial Number",
  policy: "Policy Number",
  claim: "Claim ID",
};

export default function SearchPage({ mode }: Props) {
  const navigate = useNavigate();
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [results, setResults] = useState<ResultRow[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { user } = useAuth();
  const { claims, preventedClaimEvents } = useDeviceData();

  const cardBg = theme === "light" ? "bg-[#f5f9fd]" : "bg-slate-900/90";
  const heading = theme === "light" ? "text-gray-900" : "text-white";
  const body = theme === "light" ? "text-gray-600" : "text-slate-300";
  const muted = theme === "light" ? "text-gray-500" : "text-slate-400";
  const divider = theme === "light" ? "border-gray-200" : "border-white/10";
  const claimCard = theme === "light" ? "border border-gray-200 rounded-lg p-4 bg-gray-50" : "border border-white/10 rounded-lg p-4 bg-slate-800/50";
  const inputCls = theme === "light"
    ? "flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/40"
    : "flex-1 px-3 py-2 border border-white/10 rounded-lg text-sm text-white bg-slate-950 focus:outline-none focus:ring-2 focus:ring-orange-500/30";

  async function handleSearch() {
    const trimmed = query.trim();
    if (!trimmed || mode === "policy") {
      setSubmitted(trimmed);
      setResults([]);
      return;
    }

    const actor = user?.id ?? "system";
    const actorRole = user?.role ?? "unknown";
    setIsSearching(true);

    try {
      const matchedClaims =
        mode === "claim"
          ? getMatchingClaims(mode, trimmed, claims)
          : mode === "imei" || mode === "serial" || mode === "identifier"
            ? await searchDeviceClaims(mode, trimmed)
            : [];
      const outcome = matchedClaims.length > 0 ? "SUCCESS" : "FAILURE";

      setSubmitted(trimmed);
      setResults(matchedClaims.map(toResultRow));

      writeAuditLog({
        actor,
        actorRole,
        action: "SEARCH",
        target: trimmed,
        outcome,
        context: `Search by ${MODE_LABEL[mode]}`,
      });

      if (matchedClaims.length > 0) {
        recordPreventedClaimEvent({
          query: trimmed,
          mode,
          matchedClaims,
        });
      }
    } finally {
      setIsSearching(false);
    }
  }

  const emptyState =
    submitted.trim().length > 0 && results.length === 0;

  function handleLogClaimFromSearch() {
    if (!submitted.trim()) {
      return;
    }

    navigate("/claim-device/new", {
      state: {
        prefillIdentifier: submitted.trim(),
        prefillMode:
          mode === "serial" ? "serial" : mode === "imei" ? "imei" : "identifier",
      } satisfies ClaimPrefillState,
    });
  }

  return (
    <div className="space-y-4">
      <div className={`${cardBg} border border-border rounded-xl p-6 shadow-sm`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className={`text-xl font-semibold ${heading}`}>
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
              className={inputCls}
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={isSearching}
              className="px-4 py-2 rounded-lg bg-primary text-black text-sm font-semibold shadow-sm transition transform duration-200 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/30"
            >
              {isSearching ? "Searching..." : "Search"}
            </button>
          </div>
        )}
      </div>

      {results.length > 0 && submitted.trim() && (
        <div className={`${cardBg} border border-border rounded-xl p-6 shadow-sm space-y-6`}>
          {/* Main Recommendation Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-lg font-semibold ${heading} mb-2`}>
                Claim Decision
              </h3>
              {(() => {
                return (
                  <div className="space-y-3">
                    <p className={`text-sm ${body}`}>
                      <strong>Decision:</strong> Reject Claim
                    </p>
                    <p className={`text-sm ${body}`}>
                      <strong>Reason:</strong> This device has already been claimed with another insurer.
                    </p>
                  </div>
                );
              })()}
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${heading}`}>
                {results.length}
              </div>
              <div className={`text-sm ${muted}`}>
                Total Claims Found
              </div>
            </div>
          </div>

          {/* Detailed Statistics */}
          {(() => {
            const recommendation = getInsuranceRecommendation(
              results[0].imei,
              submitted,
              claims,
              preventedClaimEvents
            );
            const details = recommendation.details;
            return (
              <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t ${divider}`}>
                <div className="text-center">
                  <div className="text-lg font-semibold text-green-600">{details.approvedClaims}</div>
                  <div className={`text-xs ${muted}`}>Approved</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-red-600">{details.rejectedClaims}</div>
                  <div className={`text-xs ${muted}`}>Rejected</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-yellow-600">{details.searches}</div>
                  <div className={`text-xs ${muted}`}>Searches</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-blue-600">{details.uniqueInsurers}</div>
                  <div className={`text-xs ${muted}`}>Insurers</div>
                </div>
              </div>
            );
          })()}

          {/* Claim History Timeline */}
          {(() => {
            const recommendation = getInsuranceRecommendation(
              results[0].imei,
              submitted,
              claims,
              preventedClaimEvents
            );
            const details = recommendation.details;
            if (details.claimHistory.length === 0) return null;

            return (
              <div className={`pt-4 border-t ${divider}`}>
                <h4 className={`text-sm font-semibold ${heading} mb-3`}>Claim History</h4>
                <div className="space-y-3">
                  {details.claimHistory.slice(0, 5).map((claim, index) => (
                    <div key={index} className={claimCard}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={`space-y-2 text-sm ${body}`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${
                              claim.outcome === "APPROVED" ? "bg-green-500" :
                              claim.outcome === "REJECTED" ? "bg-red-500" : "bg-yellow-500"
                            }`} />
                            <span className={`text-sm font-semibold ${
                              claim.outcome === "APPROVED" ? "text-green-600" :
                              claim.outcome === "REJECTED" ? "text-red-600" : "text-yellow-600"
                            }`}>
                              {claim.outcome}
                            </span>
                          </div>
                          <div><strong>Device:</strong> {claim.device}</div>
                          <div><strong>IMEI:</strong> {claim.imei}</div>
                          <div><strong>Serial:</strong> {claim.serial}</div>
                          <div><strong>Insurer:</strong> {claim.insurer}</div>
                        </div>
                        <div className={`space-y-2 text-sm ${body}`}>
                          <div><strong>Claim Date:</strong> {claim.date}</div>
                          <div><strong>Date of Loss:</strong> {claim.dateOfLoss}</div>
                          <div><strong>Amount:</strong> {claim.amount.toLocaleString(undefined, { style: "currency", currency: "ZAR" })}</div>
                          <div><strong>Reason:</strong> {claim.reason}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {details.claimHistory.length > 5 && (
                    <div className={`text-xs ${muted} text-center py-2`}>
                      And {details.claimHistory.length - 5} more claims...
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {emptyState && (
        <div className={`${cardBg} border border-border rounded-xl p-6 shadow-sm space-y-3`}>
          <div className="text-sm font-semibold text-green-700">
            Device Status: Clear — No results found for "{submitted}".
          </div>
          <div className={`text-sm ${body}`}>
            No prior claims were located for this IMEI or Serial Number.
          </div>
          <div className={`text-sm ${body}`}>
            This device has no recorded claims in the CCT registry and is eligible for insurance coverage.
          </div>
          <div className="pt-3 flex justify-end">
            <button
              type="button"
              onClick={handleLogClaimFromSearch}
              className="px-4 py-2 rounded-lg bg-primary text-black text-sm font-semibold shadow-sm transition transform duration-200 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 hover:bg-primary/90"
            >
              Log Claim
            </button>
          </div>
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
    insurer: claim.insurer ?? "Unknown",
    amount: claim.amount,
  };
}

function getMatchingClaims(mode: SearchMode, query: string, claims: Claim[]): Claim[] {
  const trimmed = query.trim();
  if (!trimmed || mode === "policy") {
    return [];
  }
  if (mode === "imei") {
    return claims.filter((claim) => claim.imei === trimmed);
  }
  if (mode === "serial") {
    return claims.filter((claim) => claim.serial === trimmed);
  }
  if (mode === "identifier") {
    return claims.filter(
      (claim) => claim.imei === trimmed || claim.serial === trimmed
    );
  }
  if (mode === "claim") {
    return claims.filter((claim) => claim.id === trimmed);
  }
  return [];
}

function getInsuranceRecommendation(
  imei: string,
  searchQuery: string,
  claims: Claim[],
  preventedClaimEvents: Array<{ query: string }>
): {
  recommendation: "ACCEPT" | "REJECT" | "REVIEW";
  reason: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  details: {
    totalClaims: number;
    approvedClaims: number;
    rejectedClaims: number;
    pendingClaims: number;
    searches: number;
    uniqueInsurers: number;
    crossInsurer: boolean;
    recentClaims: number;
    highValueClaims: number;
    averageClaimAmount: number;
    lastClaimDate: string;
    riskFactors: string[];
    claimHistory: Array<{
      id: string;
      imei: string;
      serial: string;
      device: string;
      date: string;
      dateOfLoss: string;
      outcome: string;
      amount: number;
      insurer: string;
      reason: string;
    }>;
  };
} {
  const allClaims = claims.filter((claim) => claim.imei === imei);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const searches = preventedClaimEvents.filter(
    (event) => event.query.trim().toLowerCase() === normalizedSearchQuery
  ).length;
  const claimCount = allClaims.length;
  const approvedClaims = allClaims.filter((c) => c.outcome === "approved").length;
  const rejectedClaims = allClaims.filter((c) => c.outcome === "rejected").length;
  const pendingClaims = allClaims.filter((c) => c.outcome === "pending").length;
  const insurers = [...new Set(allClaims.map((c) => c.insurer ?? "Unknown"))];
  const uniqueInsurers = insurers.length;
  const crossInsurer = uniqueInsurers > 1;

  const recentClaims = allClaims.filter((c) => {
    const claimDate = new Date(c.timestamp);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return claimDate > thirtyDaysAgo;
  }).length;

  const highValueClaims = allClaims.filter((c) => c.amount > 10000).length;

  const averageClaimAmount = claimCount > 0
    ? allClaims.reduce((sum, c) => sum + c.amount, 0) / claimCount
    : 0;

  const lastClaimDate = claimCount > 0
    ? new Date(Math.max(...allClaims.map((c) => new Date(c.timestamp).getTime()))).toLocaleDateString()
    : "N/A";

  let riskScore = 0;
  const riskFactors: string[] = [];

  if (claimCount > 1) {
    riskScore += 30;
    riskFactors.push(`${claimCount} claims filed for this device`);
  }

  if (claimCount > 0 && rejectedClaims / claimCount > 0.5) {
    riskScore += 40;
    riskFactors.push(`High rejection rate (${Math.round((rejectedClaims / claimCount) * 100)}%)`);
  }

  if (crossInsurer) {
    riskScore += 25;
    riskFactors.push(`Claims with ${uniqueInsurers} different insurers`);
  }

  if (recentClaims > 0) {
    riskScore += 20;
    riskFactors.push(`${recentClaims} claims within the last 30 days`);
  }

  if (highValueClaims > 0) {
    riskScore += 15;
    riskFactors.push(`${highValueClaims} high-value claims (>R10,000)`);
  }

  let riskLevel: "LOW" | "MEDIUM" | "HIGH";
  let recommendation: "ACCEPT" | "REJECT" | "REVIEW";

  if (riskScore >= 60) {
    riskLevel = "HIGH";
    recommendation = "REJECT";
  } else if (riskScore >= 30) {
    riskLevel = "MEDIUM";
    recommendation = "REVIEW";
  } else {
    riskLevel = "LOW";
    recommendation = "ACCEPT";
  }

  const reasonText = riskFactors.length > 0 ? riskFactors.join(", ") : "Clean record with no significant risk factors";

  const claimHistory = allClaims
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .map((claim) => ({
      id: claim.id,
      imei: claim.imei,
      serial: claim.serial,
      device: `${claim.brand} ${claim.model}`,
      date: new Date(claim.timestamp).toLocaleDateString(),
      dateOfLoss: claim.dateOfLoss ? new Date(claim.dateOfLoss).toLocaleDateString() : "N/A",
      outcome: claim.outcome.toUpperCase(),
      amount: claim.amount,
      insurer: claim.insurer ?? "Unknown",
      reason: claim.reason ?? "Not specified",
    }));

  return {
    recommendation,
    reason: reasonText,
    riskLevel,
    details: {
      totalClaims: claimCount,
      approvedClaims,
      rejectedClaims,
      pendingClaims,
      searches,
      uniqueInsurers,
      crossInsurer,
      recentClaims,
      highValueClaims,
      averageClaimAmount,
      lastClaimDate,
      riskFactors,
      claimHistory,
    },
  };
}
