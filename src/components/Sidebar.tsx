import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faClipboardCheck,
  faGear,
  faClockRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

type Props = {
  theme: "dark" | "light";
  isOpen: boolean;
};

export default function Sidebar({ theme, isOpen }: Props) {
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

  function navClass(active: boolean) {
    if (active) {
      return isDark
        ? "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition text-white"
        : "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition text-slate-900";
    }
    return isDark
      ? "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition text-[#475569] hover:text-[#64748b]"
      : "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition text-slate-400 hover:text-slate-700";
  }

  function subNavClass(active: boolean) {
    if (active) return "w-full text-left text-sm font-semibold transition text-[#f97316]";
    return isDark
      ? "w-full text-left text-sm transition text-[#334155] hover:text-[#64748b]"
      : "w-full text-left text-sm transition text-slate-400 hover:text-slate-700";
  }

  return (
    <aside
      aria-hidden={!isOpen}
      className={`shrink-0 overflow-hidden border-b md:border-b-0 md:border-r transition-all duration-200 ${
        isOpen
          ? "w-full opacity-100 md:w-64"
          : "pointer-events-none max-h-0 w-0 border-transparent opacity-0 md:max-h-none md:w-0 md:border-r-0"
      }`}
      style={isDark
        ? { background: "#0f172a", borderColor: "rgba(255,255,255,0.07)" }
        : { background: "#f8fafc", borderColor: "rgba(0,0,0,0.08)" }
      }
    >

      <div className="h-full p-4 md:p-6 flex md:flex-col gap-4 md:gap-6 items-center md:items-stretch">
        <div className="hidden md:block h-1" />

        <div className="flex-1 w-full flex md:flex-col gap-3 md:gap-4">
          <nav className="flex-1 w-full flex md:flex-col gap-3">
            <div>
              <NavLink
                to="/"
                className={({ isActive }) => navClass(isActive)}
              >
                <FontAwesomeIcon icon={faChartLine} className="w-4 h-4" />
                <span>Dashboard</span>
              </NavLink>
              {isAdmin && expanded.dashboard && (
                <div className="mt-2 ml-6 space-y-1.5">
                  <NavLink
                    to="/"
                    end
                    className={({ isActive }) =>
                      `flex items-center gap-2 ${subNavClass(isActive)}`
                    }
                  >
                    <span className={`text-[10px] ${isDark ? "text-[#334155]" : "text-slate-300"}`}>•</span>
                    Overview
                  </NavLink>
                  <NavLink
                    to="/dashboard/clients"
                    className={({ isActive }) =>
                      `flex items-center gap-2 ${subNavClass(isActive)}`
                    }
                  >
                    <span className={`text-[10px] ${isDark ? "text-[#334155]" : "text-slate-300"}`}>•</span>
                    Client Dashboards
                  </NavLink>
                  <NavLink
                    to="/dashboard/insights"
                    className={({ isActive }) =>
                      `flex items-center gap-2 ${subNavClass(isActive)}`
                    }
                  >
                    <span className={`text-[10px] ${isDark ? "text-[#334155]" : "text-slate-300"}`}>•</span>
                    Insights View
                  </NavLink>
                </div>
              )}
            </div>

            <div>
              <NavLink
                to="/claim-device"
                className={({ isActive }) => navClass(isActive)}
              >
                <FontAwesomeIcon
                  icon={faClipboardCheck}
                  className="w-4 h-4"
                />
                <span>Device Claims</span>
              </NavLink>
              <div
                className={
                  !expanded.claimDevice
                    ? "hidden"
                    : "mt-2 ml-6 space-y-1.5"
                }
              >
                <NavLink
                  to="/search/identifier"
                  className={({ isActive }) =>
                    `flex items-center gap-2 ${subNavClass(isActive)}`
                  }
                >
                  <span className={`text-[10px] ${isDark ? "text-[#334155]" : "text-slate-300"}`}>•</span>
                  Search Device
                </NavLink>

                {!isClient && (
                  <NavLink
                    to="/claim-device/database"
                    className={({ isActive }) =>
                      `flex items-center gap-2 ${subNavClass(isActive)}`
                    }
                  >
                    <span className={`text-[10px] ${isDark ? "text-[#334155]" : "text-slate-300"}`}>•</span>
                    Device Database
                  </NavLink>
                )}
                <NavLink
                  to="/claim-device/new"
                  className={({ isActive }) =>
                    `flex items-center gap-2 ${subNavClass(isActive)}`
                  }
                >
                  <span className={`text-[10px] ${isDark ? "text-[#334155]" : "text-slate-300"}`}>•</span>
                  Log A Claim
                </NavLink>
              </div>
            </div>

            <div>
              <NavLink
                to="/settings/session"
                className={({ isActive }) => navClass(isActive)}
              >
                <FontAwesomeIcon icon={faGear} className="w-4 h-4" />
                <span>Settings</span>
              </NavLink>
              <div
                className={
                  !expanded.settings
                    ? "hidden"
                    : "mt-2 ml-6 space-y-1.5"
                }
              >
                <NavLink
                  to="/settings/session"
                  className={({ isActive }) =>
                    `flex items-center gap-2 ${subNavClass(isActive)}`
                  }
                >
                  <span className={`text-[10px] ${isDark ? "text-[#334155]" : "text-slate-300"}`}>•</span>
                  Session
                </NavLink>
                {isAdmin && (
                  <NavLink
                    to="/settings/users"
                    className={({ isActive }) =>
                      `flex items-center gap-2 ${subNavClass(isActive)}`
                    }
                  >
                    <span className={`text-[10px] ${isDark ? "text-[#334155]" : "text-slate-300"}`}>•</span>
                    Create User
                  </NavLink>
                )}
                <NavLink
                  to="/settings/system"
                  className={({ isActive }) =>
                    `flex items-center gap-2 ${subNavClass(isActive)}`
                  }
                >
                  <span className={`text-[10px] ${isDark ? "text-[#334155]" : "text-slate-300"}`}>•</span>
                  System Info
                </NavLink>
              </div>
            </div>
          </nav>

            {isAdmin && (
              <div>
                <NavLink
                  to="/audit"
                  className={({ isActive }) => navClass(isActive)}
                >
                  <FontAwesomeIcon icon={faClockRotateLeft} className="w-4 h-4" />
                  <span>Audit Log</span>
                </NavLink>
              </div>
            )}

          {/* Logout button intentionally removed per request */}
        </div>
      </div>
    </aside>
  );
}
