import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

type Props = {
  onLogin?: (role: "analyst" | "manager") => void;
};

export default function LoggedOutPage({ onLogin }: Props) {
  const [role, setRole] = useState<"analyst" | "manager">(() => {
    return (
      (sessionStorage.getItem("cct:demo-role") as "analyst" | "manager") ??
      "analyst"
    );
  });
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    sessionStorage.setItem("cct:demo-role", role);
  }, [role]);

  function handleLogin() {
    if (onLogin) {
      onLogin(role);
      return;
    }
    login({
      id: `demo-${role}`,
      name: role === "manager" ? "Erin Parker" : "Sasha Harper",
      role,
    });
    navigate("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-6">
      <div className="w-full max-w-md bg-white border border-border rounded-3xl shadow-xl p-8 space-y-6">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">
            Claims Centre of Truth
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900">
            Secure access to device claim intelligence
          </h1>
        </div>
        <p className="text-sm text-gray-600">
          Your session has ended. Please log in to continue working in the Claims Centre of Truth.
        </p>
        <div className="space-y-3">
          <label className="text-xs font-semibold text-gray-500 tracking-wide">
            Sign in as
          </label>
          <div className="relative">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "analyst" | "manager")}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="analyst">Fraud Analyst</option>
              <option value="manager">Manager</option>
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogin}
          className="w-full px-4 py-3 rounded-xl text-black text-sm font-semibold border border-black shadow-lg hover:scale-[1.02] hover:shadow-xl transition-all duration-200 mt-4"
        >
          Log in
        </button>
      </div>
    </div>
  );
}
