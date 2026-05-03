import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserCircle } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../auth/useAuth";
import { useLocation } from "react-router-dom";

type Props = {
  onSearch: (query: string) => void;
  searchError?: string | null;
  onProfile?: () => void;
  onLogout?: () => void;
  onLogin?: () => void;
};

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/claim-device": "Claim Device",
  "/claim-device/new": "New Claim",
  "/claim-device/existing": "Existing Devices",
  "/risk-queue": "Risk Queue",
  "/investigations": "Investigations",
  "/reports": "Reports",
  "/settings": "Settings",
};

const TopBar = ({
  onSearch,
  searchError,
  onProfile,
  onLogout,
  onLogin,
}: Props) => {
  const { user } = useAuth();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isLoggedIn = Boolean(user);

  const activeTitle =
    pageTitles[
      Object.keys(pageTitles).find((path) =>
        location.pathname.startsWith(path)
      ) ?? "/"
    ] ?? "Dashboard";

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      onSearch(query);
    }
  }

  useEffect(() => {
    if (!menuOpen || !isLoggedIn) return;

    function handleClickOutside(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen, isLoggedIn]);

  return (
    <header className="min-h-[56px] bg-white flex items-center px-6 py-3 gap-6 shadow-sm">
      {/* Left - Page context */}
      <div className="flex-1">
        <div className="text-xs text-muted uppercase tracking-wide">
          Claims Centre of Truth
        </div>
        <div className="text-xl font-semibold text-gray-900">{activeTitle}</div>
      </div>

      {/* Center - Search */}
      <div className="flex-1 max-w-xl">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search IMEI, serial number, case ID, or claim reference"
          className={`w-full px-3 py-2 rounded-md text-sm focus:outline-none transition
            ${
              searchError
                ? "border border-red-400 focus:ring-2 focus:ring-red-400"
                : "border border-border focus:ring-2 focus:ring-primary"
            }`}
        />
        {searchError && (
          <div className="text-xs text-red-600 mt-1">
            {searchError}
          </div>
        )}
      </div>

      {/* Right - User */}
      {isLoggedIn ? (
        <div
          className="relative flex items-center gap-3 cursor-pointer"
          ref={menuRef}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <div className="rounded-full border border-border p-1 hover:border-primary transition">
            <FontAwesomeIcon icon={faUserCircle} className="w-7 h-7 text-gray-700" />
          </div>
          <div className="text-right text-sm">
            <div className="font-semibold text-gray-900">
              {user?.name ?? "ABC Insurance"}
            </div>
            <div className="text-muted text-xs">
              {user?.role === "analyst"
                ? "Fraud Analyst"
                : user?.role === "manager"
                  ? "Manager"
                  : "User"}
            </div>
          </div>

        {menuOpen && isLoggedIn && (
            <div
              role="menu"
              className="absolute right-0 top-12 w-40 rounded-lg border border-border bg-white shadow-lg py-2 text-sm"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onProfile?.();
                  setMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-bg transition"
              >
                Profile
              </button>
              <button
                type="button"
          role="menuitem"
          onClick={() => {
            setMenuOpen(false);
            onLogout?.();
          }}
                className="w-full text-left px-3 py-2 hover:bg-bg transition text-danger"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onLogin?.()}
          className="px-4 py-2 rounded-md text-sm font-semibold bg-primary text-white shadow-lg hover:brightness-110 transition"
        >
          Login
        </button>
      )}
    </header>
  );
}

export { TopBar };
