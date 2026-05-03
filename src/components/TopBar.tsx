import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faMoon,
  faSun,
  faUserCircle,
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

  return (
    <header
      className={`min-h-[64px] flex items-center px-6 py-3 gap-6 ${
        theme === "dark"
          ? "border-b border-white/10 bg-[linear-gradient(180deg,#0f172a_0%,#020617_100%)] shadow-[0_18px_40px_rgba(2,6,23,0.32)]"
          : "border-b border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)] shadow-[0_18px_40px_rgba(148,163,184,0.18)]"
      }`}
    >
      {/* Left - Page context */}
      <div className="flex flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
            theme === "dark"
              ? "border-white/10 bg-slate-950/60 text-slate-300 hover:border-white/20 hover:text-white"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
          }`}
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
        >
          <FontAwesomeIcon icon={faBars} />
        </button>

        <div>
        <div
          className={`text-xs uppercase tracking-[0.22em] ${
            theme === "dark" ? "text-slate-400" : "text-slate-500"
          }`}
        >
          Claims Centre of Truth
        </div>
        <div
          className={`text-xl font-semibold ${
            theme === "dark" ? "text-white" : "text-slate-900"
          }`}
        >
          {activeTitle}
        </div>
        </div>
      </div>

      {/* Right - User */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleTheme}
          className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
            theme === "dark"
              ? "border-white/10 bg-slate-950/60 text-amber-300 hover:border-white/20 hover:text-amber-200"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
          }`}
          aria-label={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
          title={theme === "dark" ? "Light mode" : "Dark mode"}
        >
          <FontAwesomeIcon icon={theme === "dark" ? faSun : faMoon} />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            className="flex items-center gap-3 rounded-2xl px-2 py-1 text-left transition hover:bg-white/5"
            title="Account menu"
          >
            <div
              className={`rounded-full border p-1 ${
                theme === "dark"
                  ? "border-white/10 bg-slate-950/60 text-slate-300"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              <FontAwesomeIcon icon={faUserCircle} className="w-7 h-7" />
            </div>

            <div className="text-right text-sm">
              <div
                className={`font-semibold ${
                  theme === "dark" ? "text-white" : "text-slate-900"
                }`}
              >
                {user?.name ?? "Sasha Harper"}
              </div>
              <div
                className={`text-xs ${
                  theme === "dark" ? "text-slate-400" : "text-slate-500"
                }`}
              >
                {user?.role === "client" ? "Client" : "Admin"}
              </div>
            </div>
          </button>

          {menuOpen && (
            <div
              className={`absolute right-0 top-[calc(100%+0.5rem)] z-30 w-40 rounded-2xl py-2 text-sm backdrop-blur ${
                theme === "dark"
                  ? "border border-white/10 bg-slate-950/95 shadow-[0_24px_60px_rgba(2,6,23,0.48)]"
                  : "border border-slate-200 bg-white/95 shadow-[0_24px_60px_rgba(148,163,184,0.2)]"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onSettings?.();
                }}
                className={`w-full px-4 py-2 text-left transition ${
                  theme === "dark"
                    ? "text-slate-200 hover:bg-white/5"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                Settings
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onLogout?.();
                }}
                className={`w-full px-4 py-2 text-left transition ${
                  theme === "dark"
                    ? "text-rose-400 hover:bg-white/5"
                    : "text-rose-600 hover:bg-slate-100"
                }`}
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
