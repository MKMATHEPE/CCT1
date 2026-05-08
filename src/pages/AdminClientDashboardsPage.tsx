import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../auth/themeContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faMagnifyingGlass,
  faShieldHalved,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { useDashboardDataForUser } from "../services/dashboardService";
import {
  listClientUsers,
  type ClientUserRecord,
} from "../services/authService";

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

type MetricCard = {
  label: string;
  value: string;
  note: string;
  accent: string;
  icon: typeof faChartLine;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-ZA").format(value);
}

function formatCurrency(value: number) {
  return `R ${new Intl.NumberFormat("en-ZA", {
    maximumFractionDigits: 0,
  }).format(value)}`;
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

function MetricPanel({ card }: { card: MetricCard }) {
  const isLight = useTheme() === "light";
  const border = isLight ? "border-[rgba(198,215,229,0.42)]" : "border-white/10";
  return (
    <div className={`rounded-2xl border ${border} ${isLight ? "bg-[#f5f9fd]" : "bg-[#111827]"} p-5 shadow-[0_20px_45px_rgba(2,6,23,0.34)]`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-sm font-medium ${isLight ? "text-[#8296a8]" : "text-slate-400"}`}>{card.label}</p>
          <p className={`mt-3 text-3xl font-semibold tracking-tight ${isLight ? "text-[#1e293b]" : "text-white"}`}>
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
        <span className={`text-xs ${isLight ? "text-[#8296a8]" : "text-slate-400"}`}>{card.note}</span>
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
  children: React.ReactNode;
  className?: string;
}) {
  const isLight = useTheme() === "light";
  const border = isLight ? "border-[rgba(198,215,229,0.42)]" : "border-white/10";
  return (
    <section
      className={`min-w-0 rounded-2xl border ${border} ${isLight ? "bg-[#f5f9fd]" : "bg-[#111827]"} p-5 shadow-[0_20px_45px_rgba(2,6,23,0.34)] ${className}`.trim()}
    >
      <div className="mb-4">
        <h3 className={`text-lg font-semibold ${isLight ? "text-[#1e293b]" : "text-white"}`}>{title}</h3>
        {subtitle && <p className={`mt-1 text-sm ${isLight ? "text-[#5b6f84]" : "text-slate-400"}`}>{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export default function AdminClientDashboardsPage() {
  const theme = useTheme();
  const [feedback] = useState<FeedbackState>(null);
  const [clients, setClients] = useState<ClientUserRecord[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const selectedClientId =
    selectedUserId && clients.some((entry) => entry.id === selectedUserId)
      ? selectedUserId
      : clients[0]?.id ?? null;
  const selectedClient =
    clients.find((entry) => entry.id === selectedClientId) ?? null;
  const dashboard = useDashboardDataForUser(
    selectedClient
      ? {
          id: selectedClient.id,
          role: selectedClient.role,
          insurerId: selectedClient.insurerId,
          insurerName: selectedClient.insurerName,
        }
      : null
  );

  useEffect(() => {
    let isActive = true;

    async function loadClients() {
      const nextClients = await listClientUsers();
      if (!isActive) {
        return;
      }
      setClients(nextClients);
    }

    void loadClients();

    return () => {
      isActive = false;
    };
  }, []);

  const kpis = useMemo<MetricCard[]>(
    () => [
      {
        label: "Total Searches",
        value: formatNumber(dashboard.stats?.totalSearches ?? 0),
        note: "Client-scoped dashboard searches",
        accent: "#3b82f6",
        icon: faMagnifyingGlass,
      },
      {
        label: "Rejected Claims",
        value: formatNumber(dashboard.stats?.rejectedClaims ?? 0),
        note: "Matched claim rejections on this dashboard",
        accent: "#ef4444",
        icon: faTriangleExclamation,
      },
      {
        label: "Claim Value",
        value: formatCurrency(dashboard.stats?.claimValue ?? 0),
        note: "Estimated savings for this client",
        accent: "#22c55e",
        icon: faShieldHalved,
      },
    ],
    [dashboard.stats?.claimValue, dashboard.stats?.rejectedClaims, dashboard.stats?.totalSearches]
  );

  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <section className={`xl:col-span-12 rounded-[28px] p-6 ${
        theme === "light"
          ? "bg-[#f5f9fd] border border-[rgba(198,215,229,0.42)] shadow-[0_2px_8px_rgba(130,168,200,0.10),_0_8px_24px_rgba(130,168,200,0.08)]"
          : "bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_30%),linear-gradient(180deg,#0f172a_0%,#020617_100%)] border border-white/10 shadow-[0_28px_60px_rgba(2,6,23,0.42)]"
      }`}>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className={`text-4xl font-semibold tracking-tight ${theme === "light" ? "text-[#1e293b]" : "text-white"}`}>
              Client Dashboards
            </h1>
            <p className={`mt-2 text-base ${theme === "light" ? "text-[#5b6f84]" : "text-slate-300"}`}>
              Inspect client-specific dashboard data and manage client accounts from one view.
            </p>
          </div>
          <div className={`rounded-2xl border px-4 py-3 text-sm ${theme === "light" ? "border-[rgba(198,215,229,0.42)] bg-[#eaf1f8] text-[#5b6f84]" : "border-white/10 bg-slate-950/55 text-slate-300"}`}>
            <div>Available clients: {formatNumber(clients.length)}</div>
            <div>Selected: {selectedClient?.username ?? "None"}</div>
          </div>
        </div>
      </section>

      {feedback && (
        <section
          className={`xl:col-span-12 rounded-2xl p-4 text-sm ${
            feedback.type === "success"
              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
              : "border border-red-500/30 bg-red-500/10 text-red-100"
          }`}
        >
          {feedback.message}
        </section>
      )}

      <div className="xl:col-span-4">
        <Panel
          title="Clients"
          subtitle="Select a client to inspect their dashboard"
          className="h-full"
        >
          <div className="space-y-3">
            {clients.length === 0 ? (
              <div className={`rounded-2xl border px-4 py-6 text-sm ${theme === "light" ? "border-[rgba(198,215,229,0.42)] bg-[#eaf1f8] text-[#8296a8]" : "border-white/10 bg-slate-950/40 text-slate-400"}`}>
                No client users are available yet.
              </div>
            ) : (
              clients.map((entry) => {
                const active = entry.id === selectedClient?.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => {
                      setSelectedUserId(entry.id);
                    }}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                      active
                        ? "border-blue-400/40 bg-blue-500/10"
                        : theme === "light"
                          ? "border-[rgba(198,215,229,0.42)] bg-[#eaf1f8] hover:bg-[#e0ecf6]"
                          : "border-white/10 bg-slate-950/40 hover:border-white/20 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className={`font-semibold ${theme === "light" ? "text-[#1e293b]" : "text-slate-100"}`}>
                          {entry.insurerName}
                        </div>
                        <div className={`mt-1 text-sm ${theme === "light" ? "text-[#5b6f84]" : "text-slate-400"}`}>
                          {entry.username}
                        </div>
                      </div>
                      <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                        Client
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Panel>
      </div>

      <div className="xl:col-span-8 space-y-6">
        <Panel
          title={selectedClient ? `${dashboard.insurerName} Dashboard` : "Client Dashboard"}
          subtitle={
            selectedClient
              ? `Viewing dashboard data for ${selectedClient.username}`
              : "Select a client to view their dashboard"
          }
        >
          {selectedClient ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                {kpis.map((card) => (
                  <MetricPanel key={card.label} card={card} />
                ))}
              </div>

              <div className="grid gap-4">
                <div className={`rounded-2xl border p-4 ${theme === "light" ? "border-[rgba(198,215,229,0.42)] bg-[#eaf1f8]" : "border-white/10 bg-slate-950/40"}`}>
                  <div className={`text-sm font-semibold ${theme === "light" ? "text-[#1e293b]" : "text-white"}`}>Activity Summary</div>
                  <div className={`mt-4 space-y-2 text-sm ${theme === "light" ? "text-[#5b6f84]" : "text-slate-300"}`}>
                    <div>Claims logged: {formatNumber(dashboard.stats?.totalClaims ?? 0)}</div>
                    <div>Searches logged: {formatNumber(dashboard.stats?.totalSearches ?? 0)}</div>
                    <div>Recent items: {formatNumber(dashboard.stats?.recentActivity.length ?? 0)}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-sm text-slate-400">
              No client selected.
            </div>
          )}
        </Panel>

        <Panel title="Recent Activity" subtitle="Client-scoped dashboard activity">
          {!selectedClient ? (
            <div className="py-8 text-sm text-slate-400">
              Select a client to view dashboard activity.
            </div>
          ) : dashboard.isLoading ? (
            <div className="py-8 text-sm text-slate-400">
              Loading client dashboard activity...
            </div>
          ) : dashboard.error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              {dashboard.error}
            </div>
          ) : dashboard.stats?.recentActivity.length ? (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {dashboard.stats.recentActivity.map((item) => (
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
            <div className="py-8 text-sm text-slate-400">
              No dashboard activity has been recorded for this client yet.
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
