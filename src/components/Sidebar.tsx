import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faClipboardCheck,
  faGear,
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

  function navClass(active: boolean) {
    return `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition ${
      active
        ? theme === "dark"
          ? "bg-white text-slate-950 shadow-[0_14px_30px_rgba(15,23,42,0.28)]"
          : "bg-slate-900 text-white shadow-[0_14px_30px_rgba(148,163,184,0.18)]"
        : theme === "dark"
          ? "text-slate-300 hover:bg-white/6 hover:text-white"
          : "text-slate-600 hover:bg-slate-900/5 hover:text-slate-900"
    }`;
  }

  function subNavClass(active: boolean) {
    return `w-full text-left text-sm transition ${
      active
        ? theme === "dark"
          ? "text-red-400 font-semibold"
          : "text-red-500 font-semibold"
        : theme === "dark"
          ? "text-slate-400 hover:text-white"
          : "text-slate-500 hover:text-slate-900"
    }`;
  }

  return (
    <aside
      aria-hidden={!isOpen}
      className={`shrink-0 overflow-hidden border-b md:border-b-0 md:border-r transition-all duration-200 ${
        theme === "dark"
          ? "border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_35%),linear-gradient(180deg,#0f172a_0%,#020617_100%)]"
          : "border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)]"
      } ${
        isOpen
          ? "w-full opacity-100 md:w-72"
          : "pointer-events-none max-h-0 w-0 border-transparent opacity-0 md:max-h-none md:w-0 md:border-r-0"
      }`}
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
                    <span className={`text-[10px] ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>•</span>
                    Overview
                  </NavLink>
                  <NavLink
                    to="/dashboard/clients"
                    className={({ isActive }) =>
                      `flex items-center gap-2 ${subNavClass(isActive)}`
                    }
                  >
                    <span className={`text-[10px] ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>•</span>
                    Client Dashboards
                  </NavLink>
                  <NavLink
                    to="/dashboard/insights"
                    className={({ isActive }) =>
                      `flex items-center gap-2 ${subNavClass(isActive)}`
                    }
                  >
                    <span className={`text-[10px] ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>•</span>
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
                  <span className={`text-[10px] ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>•</span>
                  Search Device
                </NavLink>

                {!isClient && (
                  <NavLink
                    to="/claim-device/database"
                    className={({ isActive }) =>
                      `flex items-center gap-2 ${subNavClass(isActive)}`
                    }
                  >
                    <span className={`text-[10px] ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>•</span>
                    Device Database
                  </NavLink>
                )}
                <NavLink
                  to="/claim-device/new"
                  className={({ isActive }) =>
                    `flex items-center gap-2 ${subNavClass(isActive)}`
                  }
                >
                  <span className={`text-[10px] ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>•</span>
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
                  <span className={`text-[10px] ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>•</span>
                  Session
                </NavLink>
                {isAdmin && (
                  <NavLink
                    to="/settings/users"
                    className={({ isActive }) =>
                      `flex items-center gap-2 ${subNavClass(isActive)}`
                    }
                  >
                    <span className={`text-[10px] ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>•</span>
                    Create User
                  </NavLink>
                )}
                <NavLink
                  to="/settings/system"
                  className={({ isActive }) =>
                    `flex items-center gap-2 ${subNavClass(isActive)}`
                  }
                >
                  <span className={`text-[10px] ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>•</span>
                  System Info
                </NavLink>
              </div>
            </div>
          </nav>

          {/* Logout button intentionally removed per request */}
        </div>
      </div>
    </aside>
  );
}
