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
import { ThemeContext } from "./auth/themeContext";

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
      {/* Fixed world-map watermark — same projection as login page, lower opacity */}
      {(() => {
        const f = theme === "light" ? "#2d3748" : "white";
        const o = (d: number) => theme === "light" ? d * 4.5 : d;
        const grid = theme === "light" ? "rgba(45,55,72,0.05)" : "rgba(255,255,255,0.008)";
        const eq   = theme === "light" ? "rgba(45,55,72,0.09)"  : "rgba(255,255,255,0.015)";
        const trp  = theme === "light" ? "rgba(234,88,12,0.05)" : "rgba(249,115,22,0.018)";
        return (
          <svg
            viewBox="0 0 960 540"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
            className="fixed inset-0 w-full h-full pointer-events-none select-none"
            style={{ zIndex: 0 }}
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* North America */}
            <path d="M 32,42 L 52,34 L 70,32 L 88,34 L 104,40 L 116,50 L 110,62 L 97,68 L 88,78 L 96,88 L 108,96 L 122,96 L 138,92 L 152,88 L 164,88 L 174,92 L 182,100 L 188,112 L 192,126 L 198,138 L 208,148 L 220,154 L 234,156 L 248,157 L 262,156 L 274,157 L 284,164 L 292,174 L 298,185 L 296,198 L 286,208 L 272,216 L 258,222 L 248,232 L 238,242 L 226,250 L 214,258 L 203,256 L 195,244 L 192,232 L 186,222 L 176,215 L 164,212 L 152,217 L 142,226 L 130,232 L 116,226 L 102,212 L 90,196 L 78,180 L 66,163 L 56,146 L 48,130 L 41,114 L 36,98 L 30,82 L 28,66 L 30,52 Z" fill={f} opacity={o(0.012)}/>
            <path d="M 290,18 L 308,12 L 326,10 L 342,12 L 354,20 L 358,32 L 352,44 L 340,52 L 324,56 L 308,52 L 296,44 L 288,34 Z" fill={f} opacity={o(0.01)}/>
            {/* South America */}
            <path d="M 270,222 L 284,218 L 298,216 L 312,218 L 324,224 L 334,232 L 342,244 L 348,258 L 352,274 L 356,292 L 360,312 L 363,334 L 364,357 L 362,380 L 356,404 L 347,426 L 334,446 L 318,463 L 300,474 L 282,478 L 264,474 L 248,463 L 236,449 L 228,432 L 223,414 L 221,395 L 224,375 L 228,355 L 228,334 L 225,312 L 218,291 L 212,272 L 211,254 L 217,239 L 228,228 L 242,222 L 256,220 Z" fill={f} opacity={o(0.012)}/>
            {/* Europe */}
            <path d="M 456,152 L 462,147 L 470,145 L 480,145 L 488,148 L 496,145 L 507,143 L 516,142 L 524,144 L 532,140 L 542,135 L 554,131 L 564,128 L 572,130 L 582,126 L 592,128 L 600,132 L 610,130 L 618,128 L 624,135 L 622,143 L 615,148 L 616,156 L 620,165 L 616,174 L 608,182 L 598,188 L 586,191 L 574,188 L 562,186 L 556,192 L 548,198 L 536,202 L 524,196 L 519,186 L 524,177 L 528,169 L 524,162 L 514,159 L 503,163 L 496,170 L 490,178 L 484,172 L 478,163 L 482,155 L 484,148 L 476,146 L 466,149 L 459,157 L 455,163 L 450,157 Z" fill={f} opacity={o(0.014)}/>
            <path d="M 524,76 L 532,68 L 540,62 L 550,58 L 558,56 L 566,58 L 572,64 L 570,74 L 564,82 L 558,88 L 553,96 L 558,104 L 564,112 L 568,122 L 562,130 L 554,134 L 546,132 L 537,128 L 530,120 L 526,112 L 522,104 L 520,96 L 518,87 L 520,80 Z" fill={f} opacity={o(0.012)}/>
            <path d="M 468,101 L 476,96 L 484,94 L 492,98 L 496,106 L 492,114 L 484,120 L 476,124 L 468,120 L 464,112 Z" fill={f} opacity={o(0.012)}/>
            {/* Africa — brightest, primary market */}
            <path d="M 467,160 L 480,153 L 492,151 L 504,151 L 512,153 L 520,156 L 530,155 L 540,158 L 550,160 L 558,164 L 563,172 L 557,174 L 569,177 L 571,181 L 564,188 L 568,198 L 576,212 L 583,226 L 588,240 L 596,250 L 616,256 L 608,268 L 600,283 L 592,298 L 587,315 L 582,335 L 575,358 L 567,382 L 556,408 L 545,424 L 534,432 L 528,436 L 516,430 L 504,416 L 491,400 L 478,383 L 464,364 L 451,343 L 440,322 L 432,304 L 424,288 L 416,278 L 407,273 L 400,270 L 394,264 L 392,255 L 396,247 L 405,243 L 412,238 L 417,230 L 418,221 L 415,212 L 409,203 L 402,194 L 396,184 L 392,175 L 396,167 L 405,162 L 416,159 L 427,157 L 436,156 L 444,157 L 450,159 L 458,160 Z" fill={f} opacity={o(0.022)}/>
            <path d="M 601,302 L 610,294 L 618,298 L 623,313 L 625,330 L 624,348 L 620,366 L 613,381 L 604,388 L 595,382 L 590,366 L 588,348 L 589,330 L 592,314 Z" fill={f} opacity={o(0.018)}/>
            {/* Asia */}
            <path d="M 574,130 L 586,124 L 600,118 L 614,115 L 628,115 L 642,118 L 654,124 L 664,132 L 672,142 L 676,154 L 674,164 L 666,170 L 656,174 L 643,172 L 632,168 L 622,162 L 612,156 L 600,152 L 588,148 L 578,143 Z" fill={f} opacity={o(0.012)}/>
            <path d="M 628,182 L 638,176 L 648,172 L 656,176 L 660,186 L 658,198 L 652,210 L 644,220 L 636,226 L 628,222 L 622,212 L 618,200 L 620,190 Z" fill={f} opacity={o(0.014)}/>
            <path d="M 668,168 L 678,162 L 690,158 L 702,158 L 714,162 L 722,170 L 726,182 L 724,196 L 718,210 L 708,222 L 696,230 L 684,224 L 675,214 L 669,202 L 665,190 Z" fill={f} opacity={o(0.014)}/>
            {/* Australia */}
            <path d="M 784,338 L 800,330 L 816,326 L 832,327 L 844,333 L 852,342 L 854,354 L 848,364 L 836,368 L 826,362 L 822,352 L 820,344 L 828,342 L 830,350 L 832,358 L 840,364 L 852,366 L 860,374 L 864,386 L 866,400 L 864,414 L 860,428 L 852,440 L 840,450 L 826,456 L 810,458 L 794,456 L 778,450 L 764,440 L 752,426 L 743,410 L 738,393 L 738,376 L 744,361 L 754,350 L 766,343 L 776,340 Z" fill={f} opacity={o(0.012)}/>
            {/* Graticule */}
            <g stroke={grid} strokeWidth="0.5" fill="none">
              {[15,30,45,60,-15,-30,-45].map((lat) => (
                <line key={lat} x1="0" y1={(75-lat)/135*540} x2="960" y2={(75-lat)/135*540}/>
              ))}
              {[-150,-120,-90,-60,-30,0,30,60,90,120,150].map((lon) => (
                <line key={lon} x1={(lon+180)/360*960} y1="0" x2={(lon+180)/360*960} y2="540"/>
              ))}
            </g>
            {/* Equator */}
            <line x1="0" y1={75/135*540} x2="960" y2={75/135*540} stroke={eq} strokeWidth="0.75"/>
            {/* Tropics */}
            <line x1="0" y1={(75-23.5)/135*540} x2="960" y2={(75-23.5)/135*540} stroke={trp} strokeWidth="0.75" strokeDasharray="4 6"/>
            <line x1="0" y1={(75+23.5)/135*540} x2="960" y2={(75+23.5)/135*540} stroke={trp} strokeWidth="0.75" strokeDasharray="4 6"/>
          </svg>
        );
      })()}
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
          <ThemeContext.Provider value={theme}>
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
          </ThemeContext.Provider>
        </main>
      </div>
    </div>
  );
}
