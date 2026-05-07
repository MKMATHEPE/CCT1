import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faMoon,
  faSun,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../auth/useAuth";
import { useLocation } from "react-router-dom";

type Props = {
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onToggleSidebar?: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
};

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/claim-device": "Claim Device",
  "/claim-device/new": "Log A Claim",
  "/record-claim": "Log A Claim",
  "/claim-device/database": "Device Database",
  "/reports": "Reports",
  "/settings": "Settings",
};

const TopBar = ({
  theme,
  onToggleTheme,
  onToggleSidebar,
  onSettings,
  onLogout,
}: Props) => {
  const { user } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const activeTitle =
    pageTitles[
      Object.keys(pageTitles).find((path) =>
        location.pathname.startsWith(path)
      ) ?? "/"
    ] ?? "Dashboard";

  useEffect(() => {
    if (!menuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const isDark = theme === "dark";

  return (
    <header
      className="min-h-[60px] flex items-center px-6 py-3 gap-6"
      style={isDark ? {
        background: "#111827",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.03)",
      } : {
        background: "#ffffff",
        borderBottom: "1px solid rgba(0,0,0,0.08)",
        boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
      }}
    >
      {/* Left */}
      <div className="flex flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition"
          style={isDark ? {
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#94a3b8",
          } : {
            background: "#f8fafc",
            border: "1px solid rgba(0,0,0,0.1)",
            color: "#64748b",
          }}
          aria-label="Toggle sidebar"
        >
          <FontAwesomeIcon icon={faBars} className="w-3.5 h-3.5" />
        </button>

        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] font-medium" style={{ color: isDark ? "#475569" : "#94a3b8" }}>
            Claims Centre of Truth
          </div>
          <div className="text-base font-semibold" style={{ color: isDark ? "#f8fafc" : "#0f172a" }}>
            {activeTitle}
          </div>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleTheme}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition"
          style={isDark ? {
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#94a3b8",
          } : {
            background: "#f8fafc",
            border: "1px solid rgba(0,0,0,0.1)",
            color: "#64748b",
          }}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="w-3.5 h-3.5" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition"
            style={isDark ? { color: "#94a3b8" } : { color: "#64748b" }}
          >
            <div
              className="flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-semibold"
              style={{ background: "linear-gradient(135deg,#f97316,#ef4444)" }}
            >
              {(user?.name ?? "U")[0].toUpperCase()}
            </div>
            <div className="text-left text-sm hidden sm:block">
              <div className="font-semibold leading-tight" style={{ color: isDark ? "#f8fafc" : "#0f172a" }}>
                {user?.name ?? "User"}
              </div>
              <div className="text-xs leading-tight" style={{ color: isDark ? "#475569" : "#94a3b8" }}>
                {user?.role === "client" ? "Client" : "Admin"}
              </div>
            </div>
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-[calc(100%+6px)] z-30 w-40 rounded-xl py-1.5 text-sm"
              style={isDark ? {
                background: "#111827",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
              } : {
                background: "#ffffff",
                border: "1px solid rgba(0,0,0,0.08)",
                boxShadow: "0 16px 40px rgba(0,0,0,0.12)",
              }}
            >
              <button
                type="button"
                onClick={() => { setMenuOpen(false); onSettings?.(); }}
                className="w-full px-4 py-2 text-left transition rounded-lg mx-auto"
                style={{ color: isDark ? "#94a3b8" : "#64748b" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "#f8fafc"; e.currentTarget.style.color = isDark ? "#f8fafc" : "#0f172a"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = isDark ? "#94a3b8" : "#64748b"; }}
              >
                Settings
              </button>
              <button
                type="button"
                onClick={() => { setMenuOpen(false); onLogout?.(); }}
                className="w-full px-4 py-2 text-left transition"
                style={{ color: "#f97316" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "#f8fafc"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export { TopBar };
