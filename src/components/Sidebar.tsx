import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faClipboardCheck,
  faGear,
  faClockRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { useEffect } from "react";

type Props = {
  theme: "dark" | "light";
  isOpen: boolean;
  onClose: () => void;
};

export default function Sidebar({ theme, isOpen, onClose }: Props) {
  const { user } = useAuth();
  const isClient = user?.role === "client";
  const isAdmin = user?.role === "admin";
  const location = useLocation();
  const expanded = {
    dashboard:
      location.pathname === "/" ||
      location.pathname.startsWith("/dashboard/"),
    claimDevice:
      location.pathname.startsWith("/claim-device") ||
      location.pathname.startsWith("/search/"),
    settings: location.pathname.startsWith("/settings"),
  };

  const isDark = theme === "dark";

  // Close on navigation (mobile only)
  useEffect(() => {
    if (window.innerWidth < 768) {
      onClose();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  function navClass(active: boolean) {
    if (active) {
      return isDark
        ? "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition text-white"
        : "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition text-[#4a6073]";
    }
    return isDark
      ? "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition text-[#475569] hover:text-[#64748b]"
      : "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition text-slate-400 hover:text-[#7088a0]";
  }

  function subNavClass(active: boolean) {
    if (active) return "w-full text-left text-sm font-semibold transition text-[#f97316]";
    return isDark
      ? "w-full text-left text-sm transition text-[#334155] hover:text-[#64748b]"
      : "w-full text-left text-sm transition text-slate-400 hover:text-[#7088a0]";
  }

  const sidebarBg = isDark
    ? { background: "#0f172a", borderColor: "rgba(255,255,255,0.07)" }
    : { background: "#fafcfe", borderColor: "rgba(198,215,229,0.25)" };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        aria-hidden={!isOpen}
        className={`
          fixed inset-y-0 left-0 z-40 w-72 overflow-y-auto border-r
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:static md:inset-y-auto md:z-auto md:overflow-hidden md:border-r
          md:translate-x-0 md:transition-all md:duration-200
          ${isOpen ? "md:w-64 md:opacity-100" : "md:w-0 md:opacity-0 md:pointer-events-none md:border-transparent"}
        `}
        style={sidebarBg}
      >
        <div className="min-h-full p-6 flex flex-col gap-6">
          <div className="h-1 hidden md:block" />

          <div className="flex-1 flex flex-col gap-4">
            <nav className="flex-1 flex flex-col gap-3">
              <div>
                <NavLink to="/" className={() => navClass(expanded.dashboard)}>
                  <FontAwesomeIcon icon={faChartLine} className="w-4 h-4" />
                  <span>Dashboard</span>
                </NavLink>
                {isAdmin && expanded.dashboard && (
                  <div className="mt-2 ml-6 space-y-1.5">
                    <NavLink to="/" end className={({ isActive }) => `flex items-center gap-2 ${subNavClass(isActive)}`}>
                      <span className={`text-[10px] ${isDark ? "text-[#334155]" : "text-slate-300"}`}>•</span>
                      Overview
                    </NavLink>
                    <NavLink to="/dashboard/clients" className={({ isActive }) => `flex items-center gap-2 ${subNavClass(isActive)}`}>
                      <span className={`text-[10px] ${isDark ? "text-[#334155]" : "text-slate-300"}`}>•</span>
                      Client Dashboards
                    </NavLink>
                    <NavLink to="/dashboard/insights" className={({ isActive }) => `flex items-center gap-2 ${subNavClass(isActive)}`}>
                      <span className={`text-[10px] ${isDark ? "text-[#334155]" : "text-slate-300"}`}>•</span>
                      Insights View
                    </NavLink>
                  </div>
                )}
              </div>

              <div>
                <NavLink to="/search/identifier" className={() => navClass(expanded.claimDevice)}>
                  <FontAwesomeIcon icon={faClipboardCheck} className="w-4 h-4" />
                  <span>Device Claims</span>
                </NavLink>
                <div className={!expanded.claimDevice ? "hidden" : "mt-2 ml-6 space-y-1.5"}>
                  <NavLink to="/search/identifier" className={({ isActive }) => `flex items-center gap-2 ${subNavClass(isActive)}`}>
                    <span className={`text-[10px] ${isDark ? "text-[#334155]" : "text-slate-300"}`}>•</span>
                    Search Device
                  </NavLink>
                  {!isClient && (
                    <NavLink to="/claim-device/database" className={({ isActive }) => `flex items-center gap-2 ${subNavClass(isActive)}`}>
                      <span className={`text-[10px] ${isDark ? "text-[#334155]" : "text-slate-300"}`}>•</span>
                      Device Database
                    </NavLink>
                  )}
                  <NavLink to="/claim-device/new" className={({ isActive }) => `flex items-center gap-2 ${subNavClass(isActive)}`}>
                    <span className={`text-[10px] ${isDark ? "text-[#334155]" : "text-slate-300"}`}>•</span>
                    Log A Claim
                  </NavLink>
                </div>
              </div>

              <div>
                <NavLink to="/settings/session" className={() => navClass(expanded.settings)}>
                  <FontAwesomeIcon icon={faGear} className="w-4 h-4" />
                  <span>Settings</span>
                </NavLink>
                <div className={!expanded.settings ? "hidden" : "mt-2 ml-6 space-y-1.5"}>
                  <NavLink to="/settings/session" className={({ isActive }) => `flex items-center gap-2 ${subNavClass(isActive)}`}>
                    <span className={`text-[10px] ${isDark ? "text-[#334155]" : "text-slate-300"}`}>•</span>
                    Session
                  </NavLink>
                  {isAdmin && (
                    <NavLink to="/settings/users" className={({ isActive }) => `flex items-center gap-2 ${subNavClass(isActive)}`}>
                      <span className={`text-[10px] ${isDark ? "text-[#334155]" : "text-slate-300"}`}>•</span>
                      Create User
                    </NavLink>
                  )}
                  <NavLink to="/settings/system" className={({ isActive }) => `flex items-center gap-2 ${subNavClass(isActive)}`}>
                    <span className={`text-[10px] ${isDark ? "text-[#334155]" : "text-slate-300"}`}>•</span>
                    System Info
                  </NavLink>
                </div>
              </div>
            </nav>

            {isAdmin && (
              <div>
                <NavLink to="/audit" className={({ isActive }) => navClass(isActive)}>
                  <FontAwesomeIcon icon={faClockRotateLeft} className="w-4 h-4" />
                  <span>Audit Log</span>
                </NavLink>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
