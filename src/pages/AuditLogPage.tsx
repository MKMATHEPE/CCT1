import { useEffect, useMemo, useState } from "react";
import type { AuditAction, AuditLogEntry } from "../services/auditLogService";
import { exportAuditLogToPDF } from "../services/auditExportService";
import { getAuthenticatedApiHeaders, resolveApiBaseUrl } from "../services/apiClient";
import { useTheme } from "../auth/themeContext";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(s: string) { return UUID_RE.test(s); }

// ── Types ─────────────────────────────────────────────────────────────────

type UserSummary = {
  userId: string;
  actorName: string;
  actorRole: string;
  insurerName: string;
  eventCount: number;
  lastSeenAt: string;
};

// ── Badge helpers ─────────────────────────────────────────────────────────

const ACTION_GROUPS: Record<string, AuditAction[]> = {
  Auth:    ["LOGIN", "LOGOUT", "ROLE_CONTEXT_LOADED", "PERMISSION_DENIED"],
  Search:  ["SEARCH"],
  Claims:  ["CLAIM_RECORDED", "CLAIM_APPROVED", "CLAIM_REJECTED", "CLAIM_SUBMITTED", "DUPLICATE_DETECTED"],
  Devices: ["DEVICE_REGISTERED", "DEVICE_CREATED", "DEVICE_VIEWED", "DUPLICATE_DEVICE_DETECTED", "DUPLICATE_DEVICE_VIEWED", "DEVICE_SERIAL_EXISTS"],
  Risk:    ["RISK_SIGNAL_VIEWED", "RISK_SIGNAL_ESCALATED"],
};

function actionGroup(action: AuditAction): string {
  for (const [group, actions] of Object.entries(ACTION_GROUPS)) {
    if ((actions as string[]).includes(action)) return group;
  }
  return "Other";
}

type BadgeVariant = "blue" | "orange" | "red" | "emerald" | "violet" | "slate" | "amber";

function groupVariant(group: string): BadgeVariant {
  switch (group) {
    case "Auth":    return "blue";
    case "Search":  return "slate";
    case "Claims":  return "orange";
    case "Devices": return "emerald";
    case "Cases":   return "violet";
    case "Risk":    return "red";
    case "Audit":   return "amber";
    default:        return "slate";
  }
}

function outcomeVariant(outcome: string): BadgeVariant {
  switch (outcome) {
    case "SUCCESS":     return "emerald";
    case "FAILURE":     return "red";
    case "AUTO_REJECT": return "red";
    case "RECORDED":    return "blue";
    default:            return "slate";
  }
}

const BADGE_STYLES: Record<BadgeVariant, { bg: string; color: string }> = {
  blue:    { bg: "rgba(59,130,246,0.12)",  color: "#60a5fa" },
  orange:  { bg: "rgba(249,115,22,0.12)",  color: "#fb923c" },
  red:     { bg: "rgba(239,68,68,0.12)",   color: "#f87171" },
  emerald: { bg: "rgba(34,197,94,0.12)",   color: "#4ade80" },
  violet:  { bg: "rgba(139,92,246,0.12)",  color: "#a78bfa" },
  slate:   { bg: "rgba(100,116,139,0.14)", color: "#94a3b8" },
  amber:   { bg: "rgba(245,158,11,0.12)",  color: "#fbbf24" },
};

function Badge({ label, variant }: { label: string; variant: BadgeVariant }) {
  const s = BADGE_STYLES[variant];
  return (
    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
      style={{ background: s.bg, color: s.color }}>
      {label}
    </span>
  );
}

function formatTs(ts: string) {
  return new Date(ts).toLocaleString("en-ZA", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function formatRelative(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}


// ── Data fetching ─────────────────────────────────────────────────────────

async function fetchAuditEntries(): Promise<AuditLogEntry[]> {
  const base = await resolveApiBaseUrl();
  const res = await fetch(`${base}/audit`, { headers: getAuthenticatedApiHeaders() });
  if (!res.ok) throw new Error(`Failed to load audit log (${res.status})`);
  const json = await res.json() as { entries: AuditLogEntry[] };
  return json.entries;
}

function useAuditEntries() {
  const [entries, setEntries]     = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    function load() {
      fetchAuditEntries()
        .then((data) => { if (active) { setEntries(data); setIsLoading(false); } })
        .catch((err) => { if (active) { setError(err instanceof Error ? err.message : "Failed to load"); setIsLoading(false); } });
    }

    load();
    const interval = setInterval(load, 15_000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  return { entries, isLoading, error };
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function AuditLogPage() {
  const { entries, isLoading, error } = useAuditEntries();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const userSummaries = useMemo<UserSummary[]>(() => {
    const map = new Map<string, UserSummary>();
    for (const e of entries) {
      const existing = map.get(e.actor);
      if (!existing) {
        map.set(e.actor, {
          userId:     e.actor,
          actorName:  e.actorName ?? e.actor,
          actorRole:  e.actorRole,
          insurerName: e.insurerName ?? "—",
          eventCount: 1,
          lastSeenAt: e.timestampUtc,
        });
      } else {
        existing.eventCount += 1;
        if (e.timestampUtc > existing.lastSeenAt) {
          existing.lastSeenAt  = e.timestampUtc;
          existing.actorName   = e.actorName ?? existing.actorName;
          existing.insurerName = e.insurerName ?? existing.insurerName;
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
  }, [entries]);

  const selectedUser = selectedUserId
    ? userSummaries.find((u) => u.userId === selectedUserId) ?? null
    : null;

  const userEntries = useMemo(
    () => selectedUserId ? entries.filter((e) => e.actor === selectedUserId) : [],
    [entries, selectedUserId]
  );

  if (isLoading) return <LoadingState />;
  if (error)     return <ErrorState message={error} />;

  if (selectedUser) {
    return (
      <UserLogView
        user={selectedUser}
        entries={userEntries}
        onBack={() => setSelectedUserId(null)}
      />
    );
  }

  return (
    <UserListView
      users={userSummaries}
      totalEvents={entries.length}
      onSelect={(id) => setSelectedUserId(id)}
    />
  );
}

// ── User list view ────────────────────────────────────────────────────────

function UserListView({
  users,
  totalEvents,
  onSelect,
}: {
  users: UserSummary[];
  totalEvents: number;
  onSelect: (userId: string) => void;
}) {
  const theme = useTheme();
  const cardBg = theme === "light" ? "#f5f9fd" : "#111827";
  const border = theme === "light" ? "1px solid rgba(198,215,229,0.42)" : "1px solid rgba(255,255,255,0.07)";
  const rowBorder = theme === "light" ? "1px solid rgba(198,215,229,0.3)" : "1px solid rgba(255,255,255,0.05)";
  const rowHover = theme === "light" ? "#eaf1f8" : "#141f35";
  const textMain = theme === "light" ? "#1e293b" : "#ffffff";
  const textSub = theme === "light" ? "#5b6f84" : "#475569";
  const textMuted = theme === "light" ? "#8296a8" : "#334155";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl p-5 flex items-center justify-between"
        style={{ background: cardBg, border }}>
        <div>
          <h1 className="text-xl font-semibold" style={{ color: textMain }}>Audit Log</h1>
          <p className="mt-0.5 text-sm" style={{ color: textSub }}>
            {users.length} user{users.length !== 1 ? "s" : ""} · {totalEvents} total events · auto-refreshes every 15 s
          </p>
        </div>
      </div>

      {/* User cards */}
      {users.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ background: cardBg, border }}>
          <p className="text-sm" style={{ color: textMuted }}>
            No audit events recorded yet. User activity will appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border }}>
          {users.map((u, i) => (
            <button
              key={u.userId}
              type="button"
              onClick={() => onSelect(u.userId)}
              className="w-full text-left flex items-center gap-4 px-5 py-4 transition-all"
              style={{
                background: cardBg,
                borderTop: i > 0 ? rowBorder : "none",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = rowHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = cardBg; }}
            >
              {/* Insurer + username */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: textMain }}>{u.insurerName}</p>
                {!isUuid(u.actorName) && (
                  <p className="text-xs mt-0.5 truncate" style={{ color: textSub }}>@{u.actorName}</p>
                )}
              </div>

              {/* Role */}
              <Badge label={u.actorRole} variant={u.actorRole === "admin" ? "orange" : "slate"} />

              {/* Events */}
              <div className="text-right hidden sm:block" style={{ minWidth: "60px" }}>
                <p className="text-xs" style={{ color: textMuted }}>Events</p>
                <p className="text-sm font-semibold" style={{ color: textMain }}>{u.eventCount}</p>
              </div>

              {/* Last seen */}
              <div className="text-right hidden md:block" style={{ minWidth: "90px" }}>
                <p className="text-xs" style={{ color: textMuted }}>Last seen</p>
                <p className="text-sm font-medium" style={{ color: textMain }}>{formatRelative(u.lastSeenAt)}</p>
              </div>

              {/* Date */}
              <div className="text-right hidden lg:block" style={{ minWidth: "100px" }}>
                <p className="text-xs" style={{ color: textMuted }}>Date</p>
                <p className="text-xs" style={{ color: textMain }}>
                  {new Date(u.lastSeenAt).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>

              {/* Chevron */}
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0" style={{ color: "#f97316" }}>
                <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L9.19 8 6.22 5.03a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── User log view (drill-down) ─────────────────────────────────────────────

const GROUP_OPTIONS = ["All", ...Object.keys(ACTION_GROUPS)];

function UserLogView({
  user,
  entries,
  onBack,
}: {
  user: UserSummary;
  entries: AuditLogEntry[];
  onBack: () => void;
}) {
  const theme = useTheme();
  const cardBg = theme === "light" ? "#f5f9fd" : "#111827";
  const border = theme === "light" ? "1px solid rgba(198,215,229,0.42)" : "1px solid rgba(255,255,255,0.07)";
  const inputBg = theme === "light" ? "#edf4fa" : "#0f172a";
  const inputBorder = theme === "light" ? "rgba(198,215,229,0.42)" : "rgba(255,255,255,0.08)";
  const inputColor = theme === "light" ? "#1e293b" : "#ffffff";
  const textSub = theme === "light" ? "#5b6f84" : "#475569";
  const textMain = theme === "light" ? "#1e293b" : "#ffffff";

  const [search, setSearch]     = useState("");
  const [group, setGroup]       = useState("All");
  const [outcome, setOutcome]   = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate]     = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q    = search.trim().toLowerCase();
    const from = fromDate ? new Date(fromDate).getTime() : null;
    const to   = toDate   ? new Date(toDate + "T23:59:59").getTime() : null;

    return entries.filter((e) => {
      if (group !== "All" && actionGroup(e.action) !== group) return false;
      if (outcome !== "All" && e.outcome !== outcome) return false;
      if (q && ![e.action, e.target, e.context, e.outcome]
        .some((f) => f.toLowerCase().includes(q))) return false;
      const ts = new Date(e.timestampUtc).getTime();
      if (from !== null && ts < from) return false;
      if (to   !== null && ts > to)   return false;
      return true;
    });
  }, [entries, search, group, outcome, fromDate, toDate]);

  const hasFilters = search || group !== "All" || outcome !== "All" || fromDate || toDate;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        style={{ background: cardBg, border }}>
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm mb-3 transition"
            style={{ color: textSub }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#f97316"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = textSub; }}
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L6.81 8l2.97 2.72a.75.75 0 1 1-1.04 1.06l-3.5-3.25a.75.75 0 0 1 0-1.06l3.5-3.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
            </svg>
            All users
          </button>

          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold" style={{ color: textMain }}>{user.insurerName}</h1>
                {!isUuid(user.actorName) && (
                  <span className="text-sm" style={{ color: textSub }}>@{user.actorName}</span>
                )}
                <Badge label={user.actorRole} variant={user.actorRole === "admin" ? "orange" : "slate"} />
              </div>
              <p className="text-sm mt-0.5" style={{ color: textSub }}>
                {filtered.length} of {user.eventCount} events
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => exportAuditLogToPDF(filtered)}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition self-start sm:self-auto"
          style={{ background: "linear-gradient(135deg,#f97316,#ef4444)", boxShadow: "0 4px 16px rgba(239,68,68,0.25)" }}
          onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.08)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; }}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M3 17a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm3.293-7.707a1 1 0 0 1 1.414 0L9 10.586V3a1 1 0 1 1 2 0v7.586l1.293-1.293a1 1 0 1 1 1.414 1.414l-3 3a1 1 0 0 1-1.414 0l-3-3a1 1 0 0 1 0-1.414Z" clipRule="evenodd" />
          </svg>
          Export PDF
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-xl p-4 flex flex-wrap gap-3"
        style={{ background: cardBg, border }}>
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <svg viewBox="0 0 20 20" fill="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: textSub }}>
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, target, context…"
            className="w-full rounded-lg pl-9 pr-3 py-2 text-sm outline-none"
            style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inputColor, caretColor: "#f97316" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(249,115,22,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(249,115,22,0.08)"; }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = inputBorder; e.currentTarget.style.boxShadow = "none"; }}
          />
        </div>

        {/* Category */}
        <select value={group} onChange={(e) => setGroup(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm outline-none"
          style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inputColor }}>
          {GROUP_OPTIONS.map((g) => <option key={g} value={g}>{g === "All" ? "All categories" : g}</option>)}
        </select>

        {/* Outcome */}
        <select value={outcome} onChange={(e) => setOutcome(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm outline-none"
          style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inputColor }}>
          {["All","SUCCESS","FAILURE","AUTO_REJECT","RECORDED"].map((o) => (
            <option key={o} value={o}>{o === "All" ? "All outcomes" : o}</option>
          ))}
        </select>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <label className="text-xs shrink-0" style={{ color: textSub }}>From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: fromDate ? inputColor : textSub, colorScheme: theme === "light" ? "light" : "dark" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(249,115,22,0.5)"; }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = inputBorder; }}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs shrink-0" style={{ color: textSub }}>To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: toDate ? inputColor : textSub, colorScheme: theme === "light" ? "light" : "dark" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(249,115,22,0.5)"; }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = inputBorder; }}
          />
        </div>

        {hasFilters && (
          <button type="button"
            onClick={() => { setSearch(""); setGroup("All"); setOutcome("All"); setFromDate(""); setToDate(""); }}
            className="rounded-lg px-3 py-2 text-xs font-medium"
            style={{ color: "#f97316", background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.15)" }}>
            Clear all
          </button>
        )}
      </div>

      {/* Entries */}
      {filtered.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ background: cardBg, border }}>
          <p className="text-sm" style={{ color: textSub }}>
            {entries.length === 0 ? "No events recorded for this user yet." : "No events match the current filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((entry) => (
            <AuditRow
              key={entry.id}
              entry={entry}
              isExpanded={expanded === entry.id}
              onToggle={() => setExpanded(expanded === entry.id ? null : entry.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Audit row ─────────────────────────────────────────────────────────────

function AuditRow({ entry, isExpanded, onToggle }: {
  entry: AuditLogEntry;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const theme = useTheme();
  const cardBg = theme === "light" ? "#f5f9fd" : "#111827";
  const borderColor = isExpanded ? "rgba(249,115,22,0.25)" : (theme === "light" ? "rgba(198,215,229,0.42)" : "rgba(255,255,255,0.06)");
  const dividerColor = theme === "light" ? "rgba(198,215,229,0.4)" : "rgba(255,255,255,0.05)";
  const tsColor = theme === "light" ? "#8296a8" : "#334155";
  const actionColor = theme === "light" ? "#5b6f84" : "#64748b";
  const preBg = theme === "light" ? "#edf4fa" : "#0f172a";
  const grp = actionGroup(entry.action);
  return (
    <div className="rounded-xl overflow-hidden transition-all"
      style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
      <button type="button" className="w-full text-left px-4 py-3 flex items-center gap-4" onClick={onToggle}>
        <span className="hidden lg:block shrink-0 text-xs tabular-nums font-mono"
          style={{ color: tsColor, minWidth: "160px" }}>
          {formatTs(entry.timestampUtc)}
        </span>
        <span className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          <Badge label={grp} variant={groupVariant(grp)} />
          <span className="text-xs font-mono" style={{ color: actionColor }}>{entry.action}</span>
        </span>
        <span className="shrink-0">
          <Badge label={entry.outcome} variant={outcomeVariant(entry.outcome)} />
        </span>
        <svg viewBox="0 0 20 20" fill="currentColor" className="shrink-0 w-4 h-4 transition-transform"
          style={{ color: tsColor, transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-xs"
          style={{ borderTop: `1px solid ${dividerColor}` }}>
          <Detail label="Timestamp" value={formatTs(entry.timestampUtc)} />
          <Detail label="Action"    value={entry.action} />
          <Detail label="Outcome"   value={entry.outcome} />
          {entry.target && <Detail label="Searched" value={entry.target} />}
          {entry.details && (
            <div className="col-span-2 md:col-span-3">
              <p className="mb-1 font-medium" style={{ color: actionColor }}>Details</p>
              <pre className="rounded-lg px-3 py-2 text-xs overflow-x-auto"
                style={{ background: preBg, color: actionColor, border: `1px solid ${dividerColor}` }}>
                {JSON.stringify(entry.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Shared ────────────────────────────────────────────────────────────────

function Detail({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  const theme = useTheme();
  const labelColor = theme === "light" ? "#8296a8" : "#334155";
  const valueColor = theme === "light" ? "#5b6f84" : "#64748b";
  return (
    <div className={className}>
      <p className="font-medium mb-0.5" style={{ color: labelColor }}>{label}</p>
      <p className="font-mono break-all" style={{ color: valueColor }}>{value}</p>
    </div>
  );
}

function LoadingState() {
  const theme = useTheme();
  const cardBg = theme === "light" ? "#f5f9fd" : "#111827";
  const border = theme === "light" ? "1px solid rgba(198,215,229,0.42)" : "1px solid rgba(255,255,255,0.07)";
  const textColor = theme === "light" ? "#8296a8" : "#334155";
  return (
    <div className="rounded-xl p-12 text-center" style={{ background: cardBg, border }}>
      <div className="flex items-center justify-center gap-2 text-sm" style={{ color: textColor }}>
        <svg className="w-4 h-4 animate-spin" style={{ color: "#f97316" }} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Loading audit log…
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  const theme = useTheme();
  const cardBg = theme === "light" ? "#f5f9fd" : "#111827";
  return (
    <div className="rounded-xl p-12 text-center"
      style={{ background: cardBg, border: "1px solid rgba(239,68,68,0.2)" }}>
      <p className="text-sm" style={{ color: "#f87171" }}>{message}</p>
    </div>
  );
}
