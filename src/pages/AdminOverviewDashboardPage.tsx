import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../auth/themeContext";
import type { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faMagnifyingGlass,
  faShieldHalved,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer } from "../components/ChartContainer";
import type {
  DashboardActivity,
  DashboardClaim,
  DashboardSearch,
  DashboardStats,
} from "../services/dashboardService";
import { fetchDashboardDataForUser } from "../services/dashboardService";
import { listClientUsers } from "../services/authService";

type MetricCard = {
  label: string;
  value: string;
  note: string;
  accent: string;
  icon: typeof faChartLine;
};

type AggregateState = {
  claims: DashboardClaim[];
  searches: DashboardSearch[];
  stats: DashboardStats | null;
  clientCount: number;
  isLoading: boolean;
  error: string | null;
};

const activityColors = ["#ef4444", "#22c55e", "#3b82f6"];

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-ZA").format(value);
}

function formatCurrency(value: number) {
  return `R ${new Intl.NumberFormat("en-ZA", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function monthLabel(value: string) {
  return new Date(value).toLocaleDateString("en-ZA", {
    month: "short",
    year: "2-digit",
  });
}

function statusTone(status: string) {
  switch (status.toUpperCase()) {
    case "REJECTED":
      return "text-red-400";
    case "APPROVED":
      return "text-emerald-400";
    default:
      return "text-amber-400";
  }
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTooltipNumber(value: unknown) {
  return formatNumber(Number(value ?? 0));
}

function MetricPanel({ card }: { card: MetricCard }) {
  const theme = useTheme();
  const cardBg = theme === "light" ? "bg-[#f5f9fd]" : "bg-slate-900/90";
  return (
    <div className={`rounded-2xl border border-white/10 ${cardBg} p-5 shadow-[0_20px_45px_rgba(2,6,23,0.34)] transition hover:-translate-y-0.5 hover:border-white/20`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{card.label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {card.value}
          </p>
        </div>
        <div
          className="flex h-11 w-11 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${card.accent}1f`, color: card.accent }}
        >
          <FontAwesomeIcon icon={card.icon} className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-5 flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: card.accent }}
        />
        <span className="text-xs text-slate-400">{card.note}</span>
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`min-w-0 rounded-2xl border border-white/10 ${useTheme() === "light" ? "bg-[#f5f9fd]" : "bg-slate-900/90"} p-5 shadow-[0_20px_45px_rgba(2,6,23,0.34)] ${className}`.trim()}
    >
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export default function AdminOverviewDashboardPage() {
  const [state, setState] = useState<AggregateState>({
    claims: [],
    searches: [],
    stats: null,
    clientCount: 0,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isActive = true;

    async function loadAggregateDashboard() {
      try {
        const clients = await listClientUsers();
        const payloads = await Promise.all(
          clients.map((client) =>
            fetchDashboardDataForUser({
              id: client.id,
              role: client.role,
              insurerId: client.insurerId,
              insurerName: client.insurerName,
            }, {
              scoped: true,
            })
          )
        );

        if (!isActive) {
          return;
        }

        const claims = payloads.flatMap((payload) => payload.claims);
        const searches = payloads.flatMap((payload) => payload.searches);
        const recentActivity = payloads
          .flatMap((payload) => payload.stats?.recentActivity ?? [])
          .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
          .slice(0, 10);

        const uniqueRejectedImeis = new Set<string>();
        let claimValue = 0;

        payloads.forEach((payload) => {
          claimValue += payload.stats?.claimValue ?? 0;
          (payload.stats?.recentActivity ?? []).forEach((item) => {
            if (item.type === "search" && item.resultFound) {
              uniqueRejectedImeis.add(`${item.userId}:${item.imei}`);
            }
          });
        });

        setState({
          claims,
          searches,
          stats: {
            totalClaims: claims.length,
            totalSearches: searches.length,
            rejectedClaims: uniqueRejectedImeis.size,
            claimValue,
            recentActivity,
          },
          clientCount: clients.length,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setState((current) => ({
          ...current,
          isLoading: false,
          error: error instanceof Error ? error.message : "Failed to load aggregate dashboard.",
        }));
      }
    }

    void loadAggregateDashboard();

    return () => {
      isActive = false;
    };
  }, []);

  const successfulSearches = useMemo(
    () => state.searches.filter((search) => search.resultFound).length,
    [state.searches]
  );

  const claimStatusData = useMemo(() => {
    const counts = new Map<string, number>();

    state.claims.forEach((claim) => {
      const key = claim.status.toUpperCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return Array.from(counts.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }, [state.claims]);

  const searchOutcomeData = useMemo(
    () => [
      { name: "Matches Found", value: successfulSearches },
      { name: "No Match", value: Math.max(state.searches.length - successfulSearches, 0) },
    ],
    [state.searches.length, successfulSearches]
  );

  const monthlyActivity = useMemo(() => {
    const activityMap = new Map<string, { month: string; claims: number; searches: number }>();

    state.claims.forEach((claim) => {
      const month = monthLabel(claim.createdAt);
      const current = activityMap.get(month) ?? { month, claims: 0, searches: 0 };
      current.claims += 1;
      activityMap.set(month, current);
    });

    state.searches.forEach((search) => {
      const month = monthLabel(search.searchedAt);
      const current = activityMap.get(month) ?? { month, claims: 0, searches: 0 };
      current.searches += 1;
      activityMap.set(month, current);
    });

    return Array.from(activityMap.values()).sort((left, right) =>
      new Date(`01 ${left.month}`).getTime() - new Date(`01 ${right.month}`).getTime()
    );
  }, [state.claims, state.searches]);

  const kpis = useMemo<MetricCard[]>(
    () => [
      {
        label: "Total Searches",
        value: formatNumber(state.stats?.totalSearches ?? 0),
        note: "Combined searches across all clients",
        accent: "#3b82f6",
        icon: faMagnifyingGlass,
      },
      {
        label: "Rejected Claims",
        value: formatNumber(state.stats?.rejectedClaims ?? 0),
        note: "Combined matched claims across all clients",
        accent: "#ef4444",
        icon: faTriangleExclamation,
      },
      {
        label: "Claim Value",
        value: formatCurrency(state.stats?.claimValue ?? 0),
        note: "Estimated savings across all client dashboards",
        accent: "#22c55e",
        icon: faShieldHalved,
      },
    ],
    [state.stats?.claimValue, state.stats?.rejectedClaims, state.stats?.totalSearches]
  );

  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <section className={`xl:col-span-12 rounded-[28px] border border-white/10 p-6 shadow-[0_28px_60px_rgba(2,6,23,0.42)] ${useTheme() === "light" ? "bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_30%),linear-gradient(180deg,#dde6f0_0%,#cdd8e5_100%)]" : "bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_30%),linear-gradient(180deg,#0f172a_0%,#020617_100%)]"}`}>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white">
              Dashboard
            </h1>
            <p className="mt-2 text-base text-slate-300">
              Admin overview across all client dashboards
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-slate-300">
            <div>Clients tracked: {formatNumber(state.clientCount)}</div>
            <div>Claims logged: {formatNumber(state.stats?.totalClaims ?? 0)}</div>
            <div>Searches logged: {formatNumber(state.stats?.totalSearches ?? 0)}</div>
          </div>
        </div>
      </section>

      {state.error && (
        <section className="xl:col-span-12 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
          {state.error}
        </section>
      )}

      <div className="xl:col-span-12 grid gap-4 md:grid-cols-2 xl:grid-cols-12">
        {kpis.map((card) => (
          <div key={card.label} className="xl:col-span-4">
            <MetricPanel card={card} />
          </div>
        ))}
      </div>

      <div className="xl:col-span-4">
        <Panel title="Claims by Status" subtitle="Combined from all client dashboards" className="h-full">
          <ChartContainer className="h-[300px]">
            <PieChart>
              <Pie
                data={claimStatusData}
                dataKey="value"
                nameKey="name"
                innerRadius={78}
                outerRadius={118}
                paddingAngle={3}
              >
                {claimStatusData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={activityColors[index % activityColors.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                cursor={false}
                formatter={(value) => formatTooltipNumber(value)}
                contentStyle={{
                  backgroundColor: "#020617",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 16,
                  color: "#fff",
                }}
              />
              <Legend />
            </PieChart>
          </ChartContainer>
        </Panel>
      </div>

      <div className="xl:col-span-8">
        <Panel title="Search Outcomes" subtitle="Combined from all client dashboards" className="h-full">
          <ChartContainer className="h-[300px] xl:h-[320px]">
            <BarChart data={searchOutcomeData} barCategoryGap={28}>
              <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
              <Tooltip
                cursor={false}
                formatter={(value) => formatTooltipNumber(value)}
                contentStyle={{
                  backgroundColor: "#020617",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 16,
                  color: "#fff",
                }}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[12, 12, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </Panel>
      </div>

      <div className="xl:col-span-7">
        <Panel title="Monthly Activity" subtitle="Combined claims and searches" className="h-full">
          <ChartContainer className="h-[320px] xl:h-[360px]">
            <LineChart data={monthlyActivity}>
              <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
              <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(value) => formatTooltipNumber(value)}
                contentStyle={{
                  backgroundColor: "#020617",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 16,
                  color: "#fff",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="claims"
                stroke="#22c55e"
                strokeWidth={3}
                dot={{ r: 4, fill: "#22c55e" }}
              />
              <Line
                type="monotone"
                dataKey="searches"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 4, fill: "#3b82f6" }}
              />
            </LineChart>
          </ChartContainer>
        </Panel>
      </div>

      <div className="xl:col-span-5">
        <Panel title="Recent Activity" subtitle="Latest client activity across the platform" className="h-full">
          {state.isLoading ? (
            <div className="py-10 text-sm text-slate-400">Loading dashboard activity...</div>
          ) : state.stats?.recentActivity.length ? (
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {state.stats.recentActivity.map((item: DashboardActivity) => (
                <div
                  key={`${item.type}:${item.id}`}
                  className="rounded-2xl border border-white/6 bg-slate-950/55 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-white">
                        {item.type === "claim" ? "Claim submitted" : "Search completed"}
                      </div>
                      <div className="mt-1 text-sm text-slate-400">
                        {item.deviceName ?? item.imei}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {formatTimestamp(item.timestamp)}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      {item.type === "claim" ? (
                        <>
                          <div className={statusTone(item.status ?? "PENDING")}>
                            {item.status ?? "PENDING"}
                          </div>
                          <div className="mt-1 text-slate-400">
                            {formatCurrency(item.claimAmount ?? 0)}
                          </div>
                        </>
                      ) : (
                        <div className={item.resultFound ? "text-emerald-400" : "text-slate-400"}>
                          {item.resultFound ? "Match found" : "No match"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-sm text-slate-400">
              No client dashboard activity has been recorded yet.
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
