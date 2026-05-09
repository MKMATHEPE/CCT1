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
  const isLight = theme === "light";
  const cardBg = isLight ? "bg-[#f5f9fd]" : "bg-[#111827]";
  const border = isLight ? "border-[rgba(198,215,229,0.42)]" : "border-white/10";
  const hoverBorder = isLight ? "hover:border-[rgba(198,215,229,0.7)]" : "hover:border-white/20";
  return (
    <div className={`rounded-2xl border ${border} ${cardBg} p-4 sm:p-5 shadow-[0_20px_45px_rgba(2,6,23,0.34)] transition hover:-translate-y-0.5 ${hoverBorder}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-xs font-medium sm:text-sm ${isLight ? "text-[#8296a8]" : "text-slate-400"}`}>{card.label}</p>
          <p className={`mt-2 truncate text-2xl font-semibold tracking-tight sm:mt-3 sm:text-3xl ${isLight ? "text-[#1e293b]" : "text-white"}`}>
            {card.value}
          </p>
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl sm:h-11 sm:w-11"
          style={{ backgroundColor: `${card.accent}1f`, color: card.accent }}
        >
          <FontAwesomeIcon icon={card.icon} className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4 flex items-start gap-2 sm:mt-5">
        <span
          className="mt-1 h-2 w-2 shrink-0 rounded-full sm:h-2.5 sm:w-2.5"
          style={{ backgroundColor: card.accent }}
        />
        <span className={`text-xs leading-snug ${isLight ? "text-[#8296a8]" : "text-slate-400"}`}>{card.note}</span>
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
  const isLight = useTheme() === "light";
  const border = isLight ? "border-[rgba(198,215,229,0.42)]" : "border-white/10";
  return (
    <section
      className={`min-w-0 rounded-2xl border ${border} ${isLight ? "bg-[#f5f9fd]" : "bg-[#111827]"} p-4 sm:p-5 shadow-[0_20px_45px_rgba(2,6,23,0.34)] ${className}`.trim()}
    >
      <div className="mb-3 sm:mb-4">
        <h3 className={`text-base font-semibold sm:text-lg ${isLight ? "text-[#1e293b]" : "text-white"}`}>{title}</h3>
        {subtitle && <p className={`mt-1 text-sm ${isLight ? "text-[#5b6f84]" : "text-slate-400"}`}>{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export default function AdminOverviewDashboardPage() {
  const theme = useTheme();
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
    <div className="grid gap-4 sm:gap-6 xl:grid-cols-12">
      <section className={`xl:col-span-12 rounded-2xl p-4 sm:rounded-[28px] sm:p-6 ${
        theme === "light"
          ? "bg-[#f5f9fd] border border-[rgba(198,215,229,0.42)] shadow-[0_2px_8px_rgba(130,168,200,0.10),_0_8px_24px_rgba(130,168,200,0.08)]"
          : "bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_30%),linear-gradient(180deg,#0f172a_0%,#020617_100%)] border border-white/10 shadow-[0_28px_60px_rgba(2,6,23,0.42)]"
      }`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <h1 className={`text-2xl font-semibold tracking-tight sm:text-4xl ${theme === "light" ? "text-[#1e293b]" : "text-white"}`}>
              Dashboard
            </h1>
            <p className={`mt-1 text-sm sm:mt-2 sm:text-base ${theme === "light" ? "text-[#5b6f84]" : "text-slate-300"}`}>
              Admin overview across all client dashboards
            </p>
          </div>
          <div className={`grid grid-cols-3 gap-3 rounded-2xl border px-4 py-3 text-sm xl:block xl:space-y-1 ${theme === "light" ? "border-[rgba(198,215,229,0.42)] bg-[#eaf1f8] text-[#5b6f84]" : "border-white/10 bg-slate-950/55 text-slate-300"}`}>
            <div>
              <span className="block text-xs opacity-70">Clients</span>
              <span className="font-semibold">{formatNumber(state.clientCount)}</span>
            </div>
            <div>
              <span className="block text-xs opacity-70">Claims</span>
              <span className="font-semibold">{formatNumber(state.stats?.totalClaims ?? 0)}</span>
            </div>
            <div>
              <span className="block text-xs opacity-70">Searches</span>
              <span className="font-semibold">{formatNumber(state.stats?.totalSearches ?? 0)}</span>
            </div>
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
          <ChartContainer className="h-[220px] sm:h-[300px]">
            <PieChart>
              <Pie
                data={claimStatusData}
                dataKey="value"
                nameKey="name"
                innerRadius="48%"
                outerRadius="72%"
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
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ChartContainer>
        </Panel>
      </div>

      <div className="xl:col-span-8">
        <Panel title="Search Outcomes" subtitle="Combined from all client dashboards" className="h-full">
          <ChartContainer className="h-[230px] sm:h-[300px] xl:h-[320px]">
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
          <ChartContainer className="h-[250px] sm:h-[320px] xl:h-[360px]">
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
              <Legend wrapperStyle={{ fontSize: 12 }} />
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
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 sm:max-h-[360px]">
              {state.stats.recentActivity.map((item: DashboardActivity) => (
                <div
                  key={`${item.type}:${item.id}`}
                  className={`rounded-2xl border px-4 py-4 ${theme === "light" ? "border-[rgba(198,215,229,0.42)] bg-[#eaf1f8]" : "border-white/6 bg-slate-950/55"}`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <div className={`text-sm font-medium ${theme === "light" ? "text-[#1e293b]" : "text-white"}`}>
                        {item.type === "claim" ? "Claim submitted" : "Search completed"}
                      </div>
                      <div className={`mt-1 break-all text-sm ${theme === "light" ? "text-[#5b6f84]" : "text-slate-400"}`}>
                        {item.deviceName ?? item.imei}
                      </div>
                      <div className={`mt-1 text-xs ${theme === "light" ? "text-gray-500" : "text-slate-500"}`}>
                        {formatTimestamp(item.timestamp)}
                      </div>
                    </div>
                    <div className="text-left text-sm sm:text-right">
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
