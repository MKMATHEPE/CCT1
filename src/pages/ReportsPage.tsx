import { useTheme } from "../auth/themeContext";

type Props = {
  view: "case" | "monthly";
};

export default function ReportsPage({ view }: Props) {
  const theme = useTheme();
  const cardBg = theme === "light" ? "bg-[#f5f9fd]" : "bg-[#111827]";
  const heading = theme === "light" ? "text-[#1e293b]" : "text-white";
  const btnText = theme === "light" ? "text-[#5b6f84]" : "text-slate-300";
  return (
    <div className="space-y-4">
      <div className={`${cardBg} border border-border rounded-xl p-6 shadow-sm`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className={`text-xl font-semibold ${heading}`}>
              Exports &amp; Reports
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

      {view === "case" && (
        <div className={`${cardBg} border border-border rounded-xl p-6 shadow-sm`}>
          <h3 className={`text-lg font-semibold ${heading}`}>
            Case Report Export
          </h3>
          <p className="mt-2 text-sm text-muted">
            Generate case summaries for external distribution.
          </p>
          <button
            type="button"
            onClick={() => alert("Case report export is coming next.")}
            className={`mt-4 px-4 py-2 rounded-lg border border-border text-sm font-semibold ${btnText} hover:border-primary hover:text-primary transition`}
          >
            Export case report
          </button>
        </div>
      )}

      {view === "monthly" && (
        <div className={`${cardBg} border border-border rounded-xl p-6 shadow-sm`}>
          <h3 className={`text-lg font-semibold ${heading}`}>
            Monthly Fraud Summary
          </h3>
          <p className="mt-2 text-sm text-muted">
            Executive summary of fraud indicators and outcomes.
          </p>
          <button
            type="button"
            onClick={() => alert("Monthly fraud summary is coming next.")}
            className={`mt-4 px-4 py-2 rounded-lg border border-border text-sm font-semibold ${btnText} hover:border-primary hover:text-primary transition`}
          >
            Export monthly summary
          </button>
        </div>
      )}
    </div>
  );
}
