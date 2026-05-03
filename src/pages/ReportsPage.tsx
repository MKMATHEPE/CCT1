type Props = {
  view: "audit" | "case" | "monthly";
  onExportAudit?: () => void;
};

export default function ReportsPage({ view, onExportAudit }: Props) {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Exports & Reports
            </h2>
            <p className="mt-1 text-sm text-muted">
              Compliance-grade outputs for audits and management.
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-bg text-muted border border-border">
            Manager
          </span>
        </div>
      </div>

      {view === "audit" && (
        <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">
            Audit Log Export
          </h3>
          <p className="mt-2 text-sm text-muted">
            Export immutable audit events for compliance review.
          </p>
          <button
            type="button"
            onClick={onExportAudit}
            className="mt-4 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:brightness-95 transition"
          >
            Export audit log
          </button>
        </div>
      )}

      {view === "case" && (
        <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">
            Case Report Export
          </h3>
          <p className="mt-2 text-sm text-muted">
            Generate case summaries for external distribution.
          </p>
          <button
            type="button"
            onClick={() =>
              alert("Case report export is coming next.")
            }
            className="mt-4 px-4 py-2 rounded-lg border border-border text-sm font-semibold text-gray-700 hover:border-primary hover:text-primary transition"
          >
            Export case report
          </button>
        </div>
      )}

      {view === "monthly" && (
        <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">
            Monthly Fraud Summary
          </h3>
          <p className="mt-2 text-sm text-muted">
            Executive summary of fraud indicators and outcomes.
          </p>
          <button
            type="button"
            onClick={() =>
              alert("Monthly fraud summary is coming next.")
            }
            className="mt-4 px-4 py-2 rounded-lg border border-border text-sm font-semibold text-gray-700 hover:border-primary hover:text-primary transition"
          >
            Export monthly summary
          </button>
        </div>
      )}
    </div>
  );
}
