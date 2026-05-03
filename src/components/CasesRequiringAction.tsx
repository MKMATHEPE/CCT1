import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import {
  getCasesAssignedTo,
  getHighRiskCases,
  getOpenCases,
} from "../services/caseDomainService";

const SECONDS_IN_DAY = 1000 * 60 * 60 * 24;

const actions = [
  {
    key: "high-risk",
    label: "High-Risk Unassigned",
    description: "High-risk cases without an owner",
    color: "text-red-700 bg-red-50",
    route: "/investigations/high-risk",
  },
  {
    key: "waiting",
    label: "> 24h Waiting",
    description: "Cases idle for more than a day",
    color: "text-orange-700 bg-orange-50",
    route: "/investigations/open",
  },
  {
    key: "assigned",
    label: "Assigned to Me",
    description: "Cases currently on your queue",
    color: "text-blue-700 bg-blue-50",
    route: "/investigations/assigned",
  },
];

export default function CasesRequiringAction() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAnalyst = user?.role === "analyst";
  const isManager = user?.role === "manager" || user?.role === "admin";

  const now = useMemo(() => Date.now(), []);
  const counts = useMemo(() => {
    const highRiskUnassigned = getHighRiskCases().filter(
      (c) => c.status !== "CLOSED" && !c.assignedTo
    ).length;
    const waiting = getOpenCases().filter(
      (c) => now - new Date(c.createdAt).getTime() > SECONDS_IN_DAY
    ).length;
    const assignedToMe = user?.id
      ? getCasesAssignedTo(user.id).filter((c) => c.status !== "CLOSED")
          .length
      : 0;

    return {
      highRiskUnassigned,
      waiting,
      assignedToMe,
    };
  }, [user?.id, now]);

  if (!isAnalyst && !isManager) {
    return null;
  }

  const rowMap: Record<string, number> = {
    highRisk: counts.highRiskUnassigned,
    waiting: counts.waiting,
    assigned: counts.assignedToMe,
  };

  return (
    <section className="bg-white border border-border rounded-xl shadow-sm p-6 space-y-4">
      <header>
        <h3 className="text-lg font-semibold text-gray-900">Cases Requiring Action</h3>
        <p className="text-sm text-muted">Immediate investigation pressure you can act on.</p>
      </header>
      <div className="space-y-3">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={() => navigate(action.route)}
            className={`w-full flex items-center justify-between rounded-lg border border-border px-4 py-3 text-left transition hover:border-primary hover:shadow-sm ${action.color}`}
          >
            <div>
              <p className="text-base font-semibold text-gray-900">{action.label}</p>
              <p className="text-sm text-muted">{action.description}</p>
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {rowMap[action.key] ?? 0}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
