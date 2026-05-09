import { useMemo } from "react";
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
import { useDashboardData } from "../services/dashboardService";

type MetricCard = {
  label: string;
  value: string;
  note: string;
  accent: string;
  icon: typeof faChartLine;
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
  const theme = useTheme();
  const isLight = theme === "light";
  const cardBg = isLight ? "bg-[#f5f9fd]" : "bg-[#111827]";
  const border = isLight ? "border-[rgba(198,215,229,0.42)]" : "border-white/10";
  return (
    <section
      className={`min-w-0 rounded-2xl border ${border} ${cardBg} p-4 sm:p-5 shadow-[0_20px_45px_rgba(2,6,23,0.34)] ${className}`.trim()}
    >
      <div className="mb-3 sm:mb-4">
        <h3 className={`text-base font-semibold sm:text-lg ${isLight ? "text-[#1e293b]" : "text-white"}`}>{title}</h3>
        {subtitle && <p className={`mt-1 text-sm ${isLight ? "text-[#5b6f84]" : "text-slate-400"}`}>{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export default function DashboardPage() {
  const theme = useTheme();
  const { claims, searches, stats, insurerName, isLoading, error } = useDashboardData();

  const successfulSearches = useMemo(
    () => searches.filter((search) => search.resultFound).length,
    [searches]
  );

  const claimStatusData = useMemo(() => {
    const counts = new Map<string, number>();

    claims.forEach((claim) => {
      const key = claim.status.toUpperCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return Array.from(counts.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }, [claims]);

  const searchOutcomeData = useMemo(
    () => [
      { name: "Matches Found", value: successfulSearches },
      { name: "No Match", value: Math.max(searches.length - successfulSearches, 0) },
    ],
    [searches.length, successfulSearches]
  );

  const monthlyActivity = useMemo(() => {
    const activityMap = new Map<string, { month: string; claims: number; searches: number }>();

    claims.forEach((claim) => {
      const month = monthLabel(claim.createdAt);
      const current = activityMap.get(month) ?? { month, claims: 0, searches: 0 };
      current.claims += 1;
      activityMap.set(month, current);
    });

    searches.forEach((search) => {
      const month = monthLabel(search.searchedAt);
      const current = activityMap.get(month) ?? { month, claims: 0, searches: 0 };
      current.searches += 1;
      activityMap.set(month, current);
    });

    return Array.from(activityMap.values()).sort((left, right) =>
      new Date(`01 ${left.month}`).getTime() - new Date(`01 ${right.month}`).getTime()
    );
  }, [claims, searches]);

  const kpis = useMemo<MetricCard[]>(
    () => [
      {
        label: "Total Searches",
        value: formatNumber(stats?.totalSearches ?? 0),
        note: "Logged after completed global lookups",
        accent: "#3b82f6",
        icon: faMagnifyingGlass,
      },
      {
        label: "Rejected Claims",
        value: formatNumber(stats?.rejectedClaims ?? 0),
        note: "Dashboard-local status distribution",
        accent: "#ef4444",
        icon: faTriangleExclamation,
      },
      {
        label: "Claim Value",
        value: formatCurrency(stats?.claimValue ?? 0),
        note: "Estimated savings from rejected matched searches",
        accent: "#22c55e",
        icon: faShieldHalved,
      },
    ],
    [stats?.claimValue, stats?.rejectedClaims, stats?.totalSearches]
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
            <p className={`mt-1 truncate text-sm sm:mt-2 sm:text-base ${theme === "light" ? "text-[#5b6f84]" : "text-slate-300"}`}>
              {insurerName} Dashboard
            </p>
          </div>
          <div className={`grid grid-cols-2 gap-3 rounded-2xl border px-4 py-3 text-sm xl:block xl:space-y-1 ${theme === "light" ? "border-[rgba(198,215,229,0.42)] bg-[#eaf1f8] text-[#5b6f84]" : "border-white/10 bg-slate-950/55 text-slate-300"}`}>
            <div>
              <span className="block text-xs opacity-70">Claims</span>
              <span className="font-semibold">{formatNumber(stats?.totalClaims ?? 0)}</span>
            </div>
            <div>
              <span className="block text-xs opacity-70">Searches</span>
              <span className="font-semibold">{formatNumber(stats?.totalSearches ?? 0)}</span>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <section className="xl:col-span-12 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
          {error}
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
        <Panel title="Claims by Status" subtitle="Read from /dashboard/claims" className="h-full">
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
        <Panel title="Search Outcomes" subtitle="Read from /dashboard/searches" className="h-full">
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
        <Panel title="Recent Activity" subtitle="Read from /dashboard/stats" className="h-full">
          {isLoading ? (
            <div className="py-10 text-sm text-slate-400">Loading dashboard activity...</div>
          ) : stats?.recentActivity.length ? (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 sm:max-h-[360px]">
              {stats.recentActivity.map((item) => (
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
              No insurer-specific dashboard activity has been recorded yet.
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
