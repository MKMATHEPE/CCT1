import { useEffect, useState } from "react";
import { TopBar } from "./components/TopBar";
import Sidebar from "./components/Sidebar";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import AdminOverviewDashboardPage from "./pages/AdminOverviewDashboardPage";
import AdminClientDashboardsPage from "./pages/AdminClientDashboardsPage";
import AdminDashboardInsightsPage from "./pages/AdminDashboardInsightsPage";
import AccessDenied from "./pages/AccessDenied";
import { useAuth } from "./auth/useAuth";
import InsightsPage from "./pages/InsightsPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import SearchPage from "./pages/SearchPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import ClaimDeviceNewClaimPage from "./pages/ClaimDeviceNewClaimPage";
import ClaimDeviceDatabasePage from "./pages/ClaimDeviceDatabasePage";
import AuditLogPage from "./pages/AuditLogPage";
import LoggedOutPage from "./pages/LoggedOutPage";
import { loginWithPassword } from "./services/authService";

type ThemeMode = "dark" | "light";

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem("cct:theme");
    return savedTheme === "light" ? "light" : "dark";
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, isLoading, login, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogin(username: string, password: string) {
    const session = await loginWithPassword(username, password);
    login(session);
    return true;
  }

  const isAdmin = user?.role === "admin";
  const themeClass = theme === "light" ? "cct-theme-light" : "cct-theme-dark";

  useEffect(() => {
    localStorage.setItem("cct:theme", theme);
  }, [theme]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0b1120" }}>
        <div
          className="flex items-center gap-3 rounded-xl px-5 py-3 text-sm"
          style={{
            background: "#111827",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            color: "#64748b",
          }}
        >
          <svg className="w-4 h-4 animate-spin text-orange-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Restoring secure session…
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoggedOutPage onLogin={handleLogin} />;
  }

  return (
    <div className={`cct-theme ${themeClass} h-screen flex flex-col`}>
      <TopBar
        theme={theme}
        onToggleSidebar={() => setSidebarOpen((current) => !current)}
        onToggleTheme={() =>
          setTheme((currentTheme) =>
            currentTheme === "dark" ? "light" : "dark"
          )
        }
        onSettings={() => navigate("/settings/session")}
        onLogout={logout}
      />

      <div className="flex-1 min-h-0 flex flex-col md:flex-row">
        <Sidebar theme={theme} isOpen={sidebarOpen} />

        <main className="flex-1 p-6 bg-bg space-y-6 overflow-y-auto">
          <Routes>
            <Route
              path="/"
              element={isAdmin ? <AdminOverviewDashboardPage /> : <DashboardPage />}
            />
            <Route
              path="/dashboard/clients"
              element={isAdmin ? <AdminClientDashboardsPage /> : <AccessDenied />}
            />
            <Route
              path="/dashboard/insights"
              element={isAdmin ? <AdminDashboardInsightsPage /> : <AccessDenied />}
            />
            <Route
              path="/register-devices"
              element={
                <PlaceholderPage
                  title="Register Device / Registered Devices"
                  description="View registered devices (structure only)."
                />
              }
            />
            <Route
              path="/register-devices/duplicates"
              element={
                <PlaceholderPage
                  title="Register Device / Duplicate Serials"
                  description="Devices flagged as duplicates (structure only)."
                />
              }
            />
            <Route
              path="/claim-device"
              element={
                <PlaceholderPage
                  title="Device Claims"
                  description="Search and Log Claims"
                  body="Search for existing devices and capture claim details efficiently."
                />
              }
            />
            <Route path="/claim-device/new" element={<ClaimDeviceNewClaimPage />} />
            <Route path="/claim-device/database" element={<ClaimDeviceDatabasePage />} />
            <Route path="/search/imei" element={<SearchPage mode="imei" />} />
            <Route path="/search/serial" element={<SearchPage mode="serial" />} />
            <Route path="/search/identifier" element={<SearchPage mode="identifier" />} />
            <Route path="/search/policy" element={<SearchPage mode="policy" />} />
            <Route path="/search/claim" element={<SearchPage mode="claim" />} />
            <Route path="/record-claim" element={<Navigate to="/claim-device/new" replace />} />
            <Route
              path="/insights/duplicate-rate"
              element={isAdmin ? <InsightsPage view="duplicate-rate" /> : <AccessDenied />}
            />
            <Route
              path="/insights/fraud-prevented"
              element={isAdmin ? <InsightsPage view="fraud-prevented" /> : <AccessDenied />}
            />
            <Route
              path="/insights/top-devices"
              element={isAdmin ? <InsightsPage view="top-devices" /> : <AccessDenied />}
            />
            <Route
              path="/reports/case"
              element={isAdmin ? <ReportsPage view="case" /> : <AccessDenied />}
            />
            <Route
              path="/reports/monthly"
              element={isAdmin ? <ReportsPage view="monthly" /> : <AccessDenied />}
            />
            <Route path="/settings/profile" element={<SettingsPage view="profile" />} />
            <Route
              path="/settings/access"
              element={
                user?.role === "admin" ? <SettingsPage view="access" /> : <AccessDenied />
              }
            />
            <Route
              path="/audit"
              element={isAdmin ? <AuditLogPage /> : <AccessDenied />}
            />
            <Route path="/settings/session" element={<SettingsPage view="session" />} />
            <Route
              path="/settings/users"
              element={isAdmin ? <SettingsPage view="users" /> : <AccessDenied />}
            />
            <Route path="/settings/system" element={<SettingsPage view="system" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
