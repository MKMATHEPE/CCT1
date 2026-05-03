import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { generateRiskSignals } from "../services/riskSignalService";

export default function RiskQueueSnapshot() {
  const navigate = useNavigate();
  const { highCount, mediumCount } = useMemo(() => {
    const signals = generateRiskSignals();
    return {
      highCount: signals.filter((signal) => signal.severity === "HIGH")
        .length,
      mediumCount: signals.filter((signal) => signal.severity === "MEDIUM")
        .length,
      total: signals.length,
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => navigate("/risk-queue")}
      className="w-full bg-white border border-border rounded-xl shadow-sm p-5 text-left space-y-2 hover:border-primary transition"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Risk Queue</h3>
          <p className="text-sm text-muted">Triage signals ready for review.</p>
        </div>
        <span className="text-sm font-semibold text-gray-500">
          {highCount + mediumCount} signals
        </span>
      </div>
      <div className="flex gap-6 text-sm font-semibold">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
          <span>High: {highCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
          <span>Medium: {mediumCount}</span>
        </div>
      </div>
    </button>
  );
}
