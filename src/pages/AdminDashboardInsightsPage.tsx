import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../auth/themeContext";
import type { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowTrendUp,
  faChartLine,
  faCoins,
  faLayerGroup,
  faMagnifyingGlass,
  faShieldHalved,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchDashboardDataForUser } from "../services/dashboardService";
import { listClientUsers } from "../services/authService";

type ClientInsight = {
  userId: string;
  username: string;
  insurerName: string;
  totalSearches: number;
  totalClaims: number;
  rejectedClaims: number;
  claimValue: number;
};

type InsightsState = {
  clients: ClientInsight[];
  isLoading: boolean;
  error: string | null;
};

type MetricCard = {
  label: string;
  value: string;
  note: string;
  accent: string;
  icon: typeof faChartLine;
};

const palette = ["#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#a855f7"];

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-ZA").format(value);
}

function formatCurrency(value: number) {
  return `R ${new Intl.NumberFormat("en-ZA", {
    maximumFractionDigits: 0,
  }).format(value)}`;
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

function MetricPanel({ card }: { card: MetricCard }) {
  return (
    <div className={`rounded-2xl border border-white/10 ${useTheme() === "light" ? "bg-[#f5f9fd]" : "bg-slate-900/90"} p-5 shadow-[0_20px_45px_rgba(2,6,23,0.34)]`}>
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

export default function AdminDashboardInsightsPage() {
  const [state, setState] = useState<InsightsState>({
    clients: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isActive = true;

    async function loadInsights() {
      try {
        const availableClients = await listClientUsers();
        const payloads = await Promise.all(
          availableClients.map(async (client) => {
            const payload = await fetchDashboardDataForUser({
              id: client.id,
              role: client.role,
              insurerId: client.insurerId,
              insurerName: client.insurerName,
            }, {
              scoped: true,
            });
            return {
              userId: client.id,
              username: client.username,
              insurerName: client.insurerName,
              stats: payload.stats,
            };
          })
        );

        if (!isActive) {
          return;
        }

        const clients = payloads.map((entry) => ({
          userId: entry.userId,
          username: entry.username,
          insurerName: entry.insurerName,
          totalSearches: entry.stats?.totalSearches ?? 0,
          totalClaims: entry.stats?.totalClaims ?? 0,
          rejectedClaims: entry.stats?.rejectedClaims ?? 0,
          claimValue: entry.stats?.claimValue ?? 0,
        }));

        setState({
          clients,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setState({
          clients: [],
          isLoading: false,
          error: error instanceof Error ? error.message : "Failed to load dashboard insights.",
        });
      }
    }

    void loadInsights();

    return () => {
      isActive = false;
    };
  }, []);

  const totals = useMemo(() => {
    return state.clients.reduce(
      (summary, client) => ({
        searches: summary.searches + client.totalSearches,
        claims: summary.claims + client.totalClaims,
        rejected: summary.rejected + client.rejectedClaims,
        value: summary.value + client.claimValue,
      }),
      { searches: 0, claims: 0, rejected: 0, value: 0 }
    );
  }, [state.clients]);

  const topSearchClient = useMemo(
    () =>
      state.clients.reduce<ClientInsight | null>(
        (best, client) =>
          !best || client.totalSearches > best.totalSearches ? client : best,
        null
      ),
    [state.clients]
  );

  const topSavingsClient = useMemo(
    () =>
      state.clients.reduce<ClientInsight | null>(
        (best, client) =>
          !best || client.claimValue > best.claimValue ? client : best,
        null
      ),
    [state.clients]
  );

  const mostRejectedClient = useMemo(
    () =>
      state.clients.reduce<ClientInsight | null>(
        (best, client) =>
          !best || client.rejectedClaims > best.rejectedClaims ? client : best,
        null
      ),
    [state.clients]
  );

  const clientSearchData = useMemo(
    () =>
      state.clients
        .map((client) => ({
          name: client.insurerName,
          searches: client.totalSearches,
          claims: client.totalClaims,
        }))
        .sort((left, right) => right.searches - left.searches)
        .slice(0, 5),
    [state.clients]
  );

  const savingsShareData = useMemo(
    () =>
      state.clients
        .filter((client) => client.claimValue > 0)
        .map((client) => ({
          name: client.insurerName,
          value: client.claimValue,
        })),
    [state.clients]
  );

  const rankingRows = useMemo(
    () =>
      [...state.clients].sort((left, right) => {
        if (right.claimValue !== left.claimValue) {
          return right.claimValue - left.claimValue;
        }
        return right.totalSearches - left.totalSearches;
      }),
    [state.clients]
  );

  const kpis = useMemo<MetricCard[]>(
    () => [
      {
        label: "Client Dashboards",
        value: formatNumber(state.clients.length),
        note: "Total client views included in this insights layer",
        accent: "#3b82f6",
        icon: faLayerGroup,
      },
      {
        label: "Portfolio Searches",
        value: formatNumber(totals.searches),
        note: "Combined search volume across all clients",
        accent: "#22c55e",
        icon: faMagnifyingGlass,
      },
      {
        label: "Portfolio Claim Value",
        value: formatCurrency(totals.value),
        note: "Estimated prevented value across all client dashboards",
        accent: "#f59e0b",
        icon: faCoins,
      },
    ],
    [state.clients.length, totals.searches, totals.value]
  );

  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <section className={`xl:col-span-12 rounded-[28px] border border-white/10 p-6 shadow-[0_28px_60px_rgba(2,6,23,0.42)] ${useTheme() === "light" ? "bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.08),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.10),_transparent_30%),linear-gradient(180deg,#dde6f0_0%,#cdd8e5_100%)]" : "bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.12),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.16),_transparent_30%),linear-gradient(180deg,#0f172a_0%,#020617_100%)]"}`}>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white">
              Insights View
            </h1>
            <p className="mt-2 text-base text-slate-300">
              Cross-client comparisons, rankings, and performance views from the dashboard layer.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-slate-300">
            <div>Total Claims: {formatNumber(totals.claims)}</div>
            <div>Total Rejections: {formatNumber(totals.rejected)}</div>
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

      <div className="xl:col-span-4 space-y-4">
        <Panel title="Top Search Client" subtitle="Highest search volume">
          <div className="text-2xl font-semibold text-white">
            {topSearchClient?.insurerName ?? "No data"}
          </div>
          <div className="mt-2 text-sm text-slate-400">
            {topSearchClient
              ? `${formatNumber(topSearchClient.totalSearches)} searches`
              : "No client search activity yet."}
          </div>
        </Panel>

        <Panel title="Top Savings Client" subtitle="Highest estimated claim value">
          <div className="text-2xl font-semibold text-white">
            {topSavingsClient?.insurerName ?? "No data"}
          </div>
          <div className="mt-2 text-sm text-slate-400">
            {topSavingsClient
              ? `${formatCurrency(topSavingsClient.claimValue)} prevented value`
              : "No client savings yet."}
          </div>
        </Panel>

        <Panel title="Highest Rejection Rate" subtitle="Most rejected matches">
          <div className="text-2xl font-semibold text-white">
            {mostRejectedClient?.insurerName ?? "No data"}
          </div>
          <div className="mt-2 text-sm text-slate-400">
            {mostRejectedClient
              ? `${formatNumber(mostRejectedClient.rejectedClaims)} rejected claims`
              : "No rejections recorded yet."}
          </div>
        </Panel>
      </div>

      <div className="xl:col-span-8">
        <Panel title="Client Search Volume" subtitle="Top clients by searches" className="h-full">
          {state.isLoading ? (
            <div className="py-10 text-sm text-slate-400">Loading insight view...</div>
          ) : (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clientSearchData} barCategoryGap={20}>
                  <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      backgroundColor: "#020617",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 16,
                      color: "#fff",
                    }}
                  />
                  <Bar dataKey="searches" fill="#3b82f6" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      <div className="xl:col-span-5">
        <Panel title="Savings Share" subtitle="Claim value distribution by client" className="h-full">
          {state.isLoading ? (
            <div className="py-10 text-sm text-slate-400">Loading savings distribution...</div>
          ) : savingsShareData.length === 0 ? (
            <div className="py-10 text-sm text-slate-400">
              No client savings data has been recorded yet.
            </div>
          ) : (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={savingsShareData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={74}
                    outerRadius={118}
                    paddingAngle={3}
                  >
                    {savingsShareData.map((entry, index) => (
                      <Cell key={entry.name} fill={palette[index % palette.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    cursor={false}
                    formatter={(value) => formatCurrency(Number(value ?? 0))}
                    contentStyle={{
                      backgroundColor: "#020617",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 16,
                      color: "#fff",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      <div className="xl:col-span-7">
        <Panel title="Client Ranking" subtitle="Ordered by claim value, then search volume">
          {state.isLoading ? (
            <div className="py-10 text-sm text-slate-400">Loading rankings...</div>
          ) : rankingRows.length === 0 ? (
            <div className="py-10 text-sm text-slate-400">
              No client insight data has been recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {rankingRows.map((client, index) => (
                <div
                  key={client.userId}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-white/6 bg-slate-950/55 px-4 py-4"
                >
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Rank {index + 1}
                    </div>
                    <div className="mt-1 font-semibold text-white">
                      {client.insurerName}
                    </div>
                    <div className="mt-1 text-sm text-slate-400">
                      {client.username}
                    </div>
                  </div>
                  <div className="grid min-w-[260px] grid-cols-3 gap-3 text-right text-sm">
                    <div>
                      <div className="text-slate-500">Searches</div>
                      <div className="mt-1 font-semibold text-slate-100">
                        {formatNumber(client.totalSearches)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Rejected</div>
                      <div className="mt-1 font-semibold text-slate-100">
                        {formatNumber(client.rejectedClaims)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Value</div>
                      <div className="mt-1 font-semibold text-emerald-400">
                        {formatCurrency(client.claimValue)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="xl:col-span-5">
        <Panel title="Signals" subtitle="Quick portfolio-level readout">
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={faArrowTrendUp} className="h-4 w-4 text-blue-400" />
                <div>
                  <div className="font-semibold text-white">Most active portfolio</div>
                  <div className="text-sm text-slate-400">
                    {topSearchClient?.insurerName ?? "No client activity yet"}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={faShieldHalved} className="h-4 w-4 text-emerald-400" />
                <div>
                  <div className="font-semibold text-white">Highest prevented value</div>
                  <div className="text-sm text-slate-400">
                    {topSavingsClient
                      ? `${topSavingsClient.insurerName} at ${formatCurrency(topSavingsClient.claimValue)}`
                      : "No savings recorded yet"}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={faTriangleExclamation} className="h-4 w-4 text-red-400" />
                <div>
                  <div className="font-semibold text-white">Most rejected claims</div>
                  <div className="text-sm text-slate-400">
                    {mostRejectedClient
                      ? `${mostRejectedClient.insurerName} with ${formatNumber(mostRejectedClient.rejectedClaims)}`
                      : "No rejected claims recorded yet"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
