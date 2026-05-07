import { Link } from "react-router-dom";
import { useTheme } from "../auth/themeContext";

export default function AccessDenied() {
  const theme = useTheme();
  const cardBg = theme === "light" ? "bg-[#f5f9fd]" : "bg-slate-900/90";
  const heading = theme === "light" ? "text-gray-900" : "text-white";
  const linkText = theme === "light" ? "text-gray-700" : "text-slate-300";
  return (
    <div className={`${cardBg} border border-border rounded-xl p-6 shadow-sm`}>
      <h2 className={`text-xl font-semibold ${heading}`}>
        Access denied
      </h2>
      <p className="mt-2 text-sm text-muted">
        Your current role does not have permission to view this section.
      </p>
      <Link
        to="/"
        className={`mt-4 inline-flex rounded-lg border border-border px-4 py-2 text-sm font-semibold ${linkText} transition hover:border-primary hover:text-primary`}
      >
        Return to dashboard
      </Link>
    </div>
  );
}
