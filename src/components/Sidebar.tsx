import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faClipboardCheck,
  faDownload,
  faGear,
  faMagnifyingGlass,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

type Props = {
  onLogout?: () => void;
  onRecordClaim?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenCase?: () => void;
  onRegisterDevice?: () => void;
  onDownloadAudit?: () => void;
};

export default function Sidebar({
  collapsed = false,
  onToggleCollapse,
  onDownloadAudit,
}: Props) {
  const { user } = useAuth();
  const isManager = user?.role === "manager" || user?.role === "admin";
  const isAnalyst = user?.role === "analyst";
  const [expanded, setExpanded] = useState({
    investigations: true,
    claimDevice: true,
    settings: true,
  });

  function navClass(active: boolean, compact: boolean) {
    return `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition ${
      active
        ? "bg-white text-gray-900 shadow-sm"
        : "text-gray-800 hover:bg-white/80"
    } ${compact ? "md:justify-center md:px-0" : ""}`;
  }

  function subNavClass(active: boolean) {
    return `w-full text-left text-sm transition ${
      active ? "text-primary font-semibold" : "text-gray-600 hover:text-gray-900"
    }`;
  }

  return (
    <aside
      className={`w-full shrink-0 border-b md:border-b-0 md:border-r border-border bg-[radial-gradient(120%_120%_at_0%_0%,#FFFFFF_0%,#F3F6FB_55%,#EEF2F8_100%)] transition-[width] duration-200 ${
        collapsed ? "md:w-20" : "md:w-72"
      }`}
    >
      <div
        className={`h-full p-4 md:p-6 flex md:flex-col gap-4 md:gap-6 items-center md:items-stretch ${
          collapsed ? "md:items-center" : ""
        }`}
      >
        <div className="hidden md:block h-1" />

        <div className="flex-1 w-full flex md:flex-col gap-3 md:gap-4">
          <nav className="flex-1 w-full flex md:flex-col gap-3">
            <div>
              <NavLink
                to="/"
                className={({ isActive }) =>
                  navClass(isActive, collapsed)
                }
              >
                <FontAwesomeIcon icon={faChartLine} className="w-4 h-4" />
                <span className={collapsed ? "md:hidden" : ""}>
                  Dashboard
                </span>
              </NavLink>
            </div>

            <div>
              <NavLink
                to="/claim-device"
                onClick={() =>
                  setExpanded((prev) => ({
                    ...prev,
                    claimDevice: !prev.claimDevice,
                  }))
                }
                className={({ isActive }) =>
                  navClass(isActive, collapsed)
                }
                aria-expanded={expanded.claimDevice}
              >
                <FontAwesomeIcon
                  icon={faClipboardCheck}
                  className="w-4 h-4"
                />
                <span className={collapsed ? "md:hidden" : ""}>
                  Claim Device
                </span>
              </NavLink>
              <div
                className={
                  collapsed || !expanded.claimDevice
                    ? "hidden"
                    : "mt-2 ml-6 space-y-1.5"
                }
              >
                {isAnalyst && (
                  <NavLink
                    to="/claim-device/new"
                    className={({ isActive }) =>
                      `flex items-center gap-2 ${subNavClass(isActive)}`
                    }
                  >
                    <span className="text-[10px] text-muted">•</span>
                    New Claim
                  </NavLink>
                )}
                <NavLink
                  to="/claim-device/existing"
                  className={({ isActive }) =>
                    `flex items-center gap-2 ${subNavClass(isActive)}`
                  }
                >
                  <span className="text-[10px] text-muted">•</span>
                  Existing Devices
                </NavLink>
                <NavLink
                  to="/claim-device/duplicates"
                  className={({ isActive }) =>
                    `flex items-center gap-2 ${subNavClass(isActive)}`
                  }
                >
                  <span className="text-[10px] text-muted">•</span>
                  Duplicate Devices
                </NavLink>
              </div>
            </div>

            <div>
              <NavLink
                to="/risk-queue"
                className={({ isActive }) =>
                  navClass(isActive, collapsed)
                }
              >
                <FontAwesomeIcon
                  icon={faTriangleExclamation}
                  className="w-4 h-4"
                />
                <span className={collapsed ? "md:hidden" : ""}>
                  Risk Queue
                </span>
              </NavLink>
            </div>

            <div>
              <NavLink
                to="/investigations/open"
                onClick={() =>
                  setExpanded((prev) => ({
                    ...prev,
                    investigations: !prev.investigations,
                  }))
                }
                className={({ isActive }) =>
                  navClass(isActive, collapsed)
                }
                aria-expanded={expanded.investigations}
              >
                <FontAwesomeIcon
                  icon={faMagnifyingGlass}
                  className="w-4 h-4"
                />
                <span className={collapsed ? "md:hidden" : ""}>
                  Investigations
                </span>
              </NavLink>
              <div
                className={
                  collapsed || !expanded.investigations
                    ? "hidden"
                    : "mt-2 ml-6 space-y-1.5"
                }
              >
                {isAnalyst && (
                  <NavLink
                    to="/investigations/assigned"
                    className={({ isActive }) =>
                      `flex items-center gap-2 ${subNavClass(isActive)}`
                    }
                  >
                    <span className="text-[10px] text-muted">•</span>
                    Assigned to Me
                  </NavLink>
                )}
                <NavLink
                  to="/investigations/open"
                  className={({ isActive }) =>
                    `flex items-center gap-2 ${subNavClass(isActive)}`
                  }
                >
                  <span className="text-[10px] text-muted">•</span>
                  Open Cases
                </NavLink>
                <NavLink
                  to="/investigations/high-risk"
                  className={({ isActive }) =>
                    `flex items-center gap-2 ${subNavClass(isActive)}`
                  }
                >
                  <span className="text-[10px] text-muted">•</span>
                  High-Risk
                </NavLink>
                <NavLink
                  to="/investigations/closed"
                  className={({ isActive }) =>
                    `flex items-center gap-2 ${subNavClass(isActive)}`
                  }
                >
                  <span className="text-[10px] text-muted">•</span>
                  Closed Cases
                </NavLink>
              </div>
            </div>

            {isManager && (
              <div>
                <NavLink
                  to="/insights/duplicate-rate"
                  className={({ isActive }) =>
                    navClass(isActive, collapsed)
                  }
                >
                  <FontAwesomeIcon
                    icon={faChartLine}
                    className="w-4 h-4"
                  />
                  <span className={collapsed ? "md:hidden" : ""}>
                    Insights
                  </span>
                </NavLink>
                <div
                  className={
                    collapsed ? "hidden" : "mt-2 ml-6 space-y-1.5"
                  }
                >
                  <NavLink
                    to="/insights/duplicate-rate"
                    className={({ isActive }) =>
                      `flex items-center gap-2 ${subNavClass(isActive)}`
                    }
                  >
                    <span className="text-[10px] text-muted">•</span>
                    Fraud Trends
                  </NavLink>
                  <NavLink
                    to="/insights/fraud-prevented"
                    className={({ isActive }) =>
                      `flex items-center gap-2 ${subNavClass(isActive)}`
                    }
                  >
                    <span className="text-[10px] text-muted">•</span>
                    Fraud Prevented
                  </NavLink>
                </div>
              </div>
            )}

            <div>
              <NavLink
                to="/settings/profile"
                onClick={() =>
                  setExpanded((prev) => ({
                    ...prev,
                    settings: !prev.settings,
                  }))
                }
                className={({ isActive }) =>
                  navClass(isActive, collapsed)
                }
                aria-expanded={expanded.settings}
              >
                <FontAwesomeIcon icon={faGear} className="w-4 h-4" />
                <span className={collapsed ? "md:hidden" : ""}>
                  Settings
                </span>
              </NavLink>
              <div
                className={
                  collapsed || !expanded.settings
                    ? "hidden"
                    : "mt-2 ml-6 space-y-1.5"
                }
              >
                <NavLink
                  to="/settings/profile"
                  className={({ isActive }) =>
                    `flex items-center gap-2 ${subNavClass(isActive)}`
                  }
                >
                  <span className="text-[10px] text-muted">•</span>
                  Profile
                </NavLink>
                {isManager && (
                  <NavLink
                    to="/settings/access"
                    className={({ isActive }) =>
                      `flex items-center gap-2 ${subNavClass(isActive)}`
                    }
                  >
                    <span className="text-[10px] text-muted">•</span>
                    Access & Role
                  </NavLink>
                )}
                <NavLink
                  to="/settings/session"
                  className={({ isActive }) =>
                    `flex items-center gap-2 ${subNavClass(isActive)}`
                  }
                >
                  <span className="text-[10px] text-muted">•</span>
                  Session
                </NavLink>
                <NavLink
                  to="/settings/system"
                  className={({ isActive }) =>
                    `flex items-center gap-2 ${subNavClass(isActive)}`
                  }
                >
                  <span className="text-[10px] text-muted">•</span>
                  System Info
                </NavLink>
              </div>
            </div>
          </nav>

          <button
            type="button"
            onClick={onDownloadAudit}
            disabled={!isManager || !onDownloadAudit}
            title={
              isManager
                ? "Download the compliance-grade audit log"
                : "Only managers can download the audit log"
            }
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 bg-white border border-border transition ${
              collapsed ? "md:w-12 md:h-12 md:px-0" : ""
            } ${
              isManager
                ? "hover:border-primary hover:text-primary"
                : "opacity-60 cursor-not-allowed"
            }`}
          >
            <span className="inline-flex items-center gap-2 justify-center">
              <FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
              <span className={collapsed ? "md:hidden" : ""}>
                Download Audit Log
              </span>
            </span>
          </button>

          {/* Logout button intentionally removed per request */}
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden md:flex items-center justify-center w-10 h-10 rounded-full border border-border bg-white text-gray-700 hover:border-primary hover:text-primary transition"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? ">" : "<"}
        </button>
      </div>
    </aside>
  );
}
